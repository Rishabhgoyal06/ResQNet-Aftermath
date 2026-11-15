import { PermissionsAndroid, Platform } from 'react-native';
import RNBluetoothClassic, { BluetoothDevice, BluetoothEventSubscription } from 'react-native-bluetooth-classic';
import uuid from 'react-native-uuid';
import type { QueuedSOSReport } from '@resqnet/shared-types';
import { kvStorage } from './kvStorage';
import { getUnsyncedReports, markAsSynced } from './offlineQueue';
import { getSupabaseClient } from './supabase';

const DEVICE_ID_KEY = 'resqnet_device_id';
const RELAY_MAGIC = 'RESQNET1';
const RELAY_DELIMITER = '\n';
const RELAY_SERVICE_NAME = 'ResQNet Relay';

type RelayMessage =
  | {
      magic: string;
      type: 'report';
      from: string;
      report: QueuedSOSReport;
    }
  | {
      magic: string;
      type: 'ack';
      from: string;
      reportId: string;
      to?: string;
    };

let listenerDevice: BluetoothDevice | null = null;
let listenerSubscription: BluetoothEventSubscription | null = null;
let listening = false;

export async function getDeviceId(): Promise<string> {
  const existing = await kvStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const fresh = uuid.v4() as string;
  await kvStorage.setItem(DEVICE_ID_KEY, fresh);
  return fresh;
}

export async function checkBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
    const androidPerms = PermissionsAndroid.PERMISSIONS as Record<string, string | undefined>;
    if (apiLevel >= 31) {
      if (!androidPerms.BLUETOOTH_CONNECT || !androidPerms.BLUETOOTH_SCAN) return true;
      const connect = await PermissionsAndroid.check(androidPerms.BLUETOOTH_CONNECT);
      const scan = await PermissionsAndroid.check(androidPerms.BLUETOOTH_SCAN);
      return connect && scan;
    } else {
      if (!androidPerms.ACCESS_FINE_LOCATION) return true;
      return await PermissionsAndroid.check(androidPerms.ACCESS_FINE_LOCATION);
    }
  } catch {
    return false;
  }
}

export async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
    const androidPerms = PermissionsAndroid.PERMISSIONS as Record<string, string | undefined>;

    if (apiLevel >= 31) {
      // Android 12+ (API 31+)
      const toRequest: string[] = [];
      if (androidPerms.BLUETOOTH_SCAN) toRequest.push(androidPerms.BLUETOOTH_SCAN);
      if (androidPerms.BLUETOOTH_CONNECT) toRequest.push(androidPerms.BLUETOOTH_CONNECT);
      if (androidPerms.BLUETOOTH_ADVERTISE) toRequest.push(androidPerms.BLUETOOTH_ADVERTISE);

      if (toRequest.length === 0) return true;

      const results = await PermissionsAndroid.requestMultiple(toRequest);
      const scanGranted = !androidPerms.BLUETOOTH_SCAN || results[androidPerms.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;
      const connectGranted = !androidPerms.BLUETOOTH_CONNECT || results[androidPerms.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;

      return scanGranted && connectGranted;
    } else {
      // Android 11 or lower (API < 31)
      if (!androidPerms.ACCESS_FINE_LOCATION) return true;
      const result = await PermissionsAndroid.request(androidPerms.ACCESS_FINE_LOCATION, {
        title: 'Bluetooth Scan Permission',
        message: 'ResQNet requires location permission to discover nearby emergency relay devices via Bluetooth.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      });
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (err) {
    console.warn('requestBluetoothPermissions error:', err);
    return false;
  }
}

export async function ensureBluetoothEnabled(): Promise<boolean> {
  try {
    // 1. Request permissions FIRST so Android 12 does not throw SecurityException
    const permsGranted = await requestBluetoothPermissions();
    if (!permsGranted) {
      return false;
    }

    // 2. Check if hardware is available
    const available = await RNBluetoothClassic.isBluetoothAvailable();
    if (!available) return false;

    // 3. Check if enabled, and request system turn-on if disabled
    const enabled = await RNBluetoothClassic.isBluetoothEnabled();
    if (!enabled) {
      const requested = await RNBluetoothClassic.requestBluetoothEnabled();
      if (!requested) return false;
    }

    return true;
  } catch (err) {
    console.error('ensureBluetoothEnabled error:', err);
    return false;
  }
}

export async function isBluetoothEnabled(): Promise<boolean> {
  try {
    const hasPerms = await checkBluetoothPermissions();
    if (!hasPerms) {
      const granted = await requestBluetoothPermissions();
      if (!granted) return false;
    }
    return await RNBluetoothClassic.isBluetoothEnabled();
  } catch (err) {
    console.warn('isBluetoothEnabled check failed:', err);
    return false;
  }
}

export function openBluetoothSettings(): void {
  try {
    RNBluetoothClassic.openBluetoothSettings();
  } catch {
    // ignore
  }
}

export async function getPairedDevices(): Promise<BluetoothDevice[]> {
  try {
    const hasPerms = await checkBluetoothPermissions();
    if (!hasPerms) {
      const granted = await requestBluetoothPermissions();
      if (!granted) return [];
    }
    return await RNBluetoothClassic.getBondedDevices();
  } catch (err) {
    console.warn('getPairedDevices error:', err);
    return [];
  }
}

export async function discoverRelayDevices(): Promise<BluetoothDevice[]> {
  try {
    const hasPerms = await checkBluetoothPermissions();
    if (!hasPerms) {
      const granted = await requestBluetoothPermissions();
      if (!granted) return [];
    }
    return await RNBluetoothClassic.startDiscovery();
  } catch (err) {
    console.warn('discoverRelayDevices error:', err);
    return [];
  }
}

function safeParseMessage(data: string): RelayMessage | null {
  if (!data) return null;
  const trimmed = data.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed) as RelayMessage;
    if (parsed.magic !== RELAY_MAGIC) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function forwardReportToSupabase(report: QueuedSOSReport): Promise<boolean> {
  try {
    const client = await getSupabaseClient();
    if (!client) {
      console.warn('Supabase config missing for relay forward.');
      return false;
    }
    const { error } = await client
      .from('sos_reports')
      .upsert(
        {
          id: report.id,
          name: report.name,
          phone: report.phone,
          latitude: report.latitude,
          longitude: report.longitude,
          district: report.district || null,
          category: report.category,
          severity: report.severity,
          message: report.message,
          created_at: report.created_at,
          source_device: report.source_device,
          synced_at: new Date().toISOString(),
          status: 'pending',
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );
    return !error;
  } catch {
    return false;
  }
}

export async function startRelayListener(onStatus?: (status: 'listening' | 'connected') => void): Promise<string> {
  const enabled = await ensureBluetoothEnabled();
  if (!enabled) {
    throw new Error('Bluetooth unavailable. Please grant permissions and ensure Bluetooth is turned on.');
  }

  const deviceId = await getDeviceId();
  const adapterName = `RESQNET-${deviceId.slice(0, 4).toUpperCase()}`;

  if (listening) {
    return adapterName;
  }

  listening = true;
  onStatus?.('listening');

  try {
    await RNBluetoothClassic.setBluetoothAdapterName(adapterName);
    console.log('Bluetooth adapter renamed to', adapterName);
  } catch (err) {
    console.warn('Bluetooth adapter rename warning:', err);
  }

  void RNBluetoothClassic.accept({
    connectionType: 'delimited',
    delimiter: RELAY_DELIMITER,
    serviceName: RELAY_SERVICE_NAME,
  })
    .then((device) => {
      if (!listening) {
        device.disconnect();
        return;
      }
      listenerDevice = device;
      listenerSubscription?.remove();
      listenerSubscription = device.onDataReceived((event) => {
        const message = safeParseMessage(event.data);
        if (!message || message.type !== 'report') return;
        void (async () => {
          const forwarded = await forwardReportToSupabase(message.report);
          if (!forwarded || !listenerDevice) return;
          const reply: RelayMessage = {
            magic: RELAY_MAGIC,
            type: 'ack',
            reportId: message.report.id,
            from: await getDeviceId(),
            to: message.from,
          };
          await listenerDevice.write(JSON.stringify(reply) + RELAY_DELIMITER);
        })();
      });
      onStatus?.('connected');
    })
    .catch((error) => {
      console.error('Relay listener accept error:', error);
      listening = false;
      onStatus?.('listening');
    });

  return adapterName;
}

export async function stopRelayListener(): Promise<void> {
  listening = false;
  listenerSubscription?.remove();
  listenerSubscription = null;

  if (listenerDevice) {
    try {
      await listenerDevice.disconnect();
    } catch {
      // ignore
    }
  }
  listenerDevice = null;

  try {
    await RNBluetoothClassic.cancelAccept();
  } catch {
    // ignore
  }
}

export async function sendPendingToDevice(device: BluetoothDevice): Promise<{ sent: number; acked: number }> {
  const enabled = await ensureBluetoothEnabled();
  if (!enabled) {
    throw new Error('Bluetooth is disabled or permissions not granted.');
  }

  const pending = await getUnsyncedReports();
  if (pending.length === 0) {
    return { sent: 0, acked: 0 };
  }

  const deviceId = await getDeviceId();
  const connectOptions = {
    connectionType: 'delimited' as const,
    delimiter: RELAY_DELIMITER,
    charset: 'utf-8',
    serviceName: RELAY_SERVICE_NAME,
  };

  let connected = false;
  try {
    connected = await device.connect(connectOptions);
  } catch (e) {
    console.warn('Initial connect failed, trying insecure socket...', e);
  }

  if (!connected) {
    try {
      connected = await device.connect({ ...connectOptions, secureSocket: false });
    } catch (e2) {
      console.warn('Insecure connect failed:', e2);
    }
  }

  if (!connected) {
    throw new Error(`Failed to connect to ${device.name || device.address}. Make sure 'Start Relay Listener' is active on that device and it is nearby.`);
  }

  const ackWaiters = new Map<string, (acked: boolean) => void>();
  const subscription = device.onDataReceived((event) => {
    const message = safeParseMessage(event.data);
    if (!message || message.type !== 'ack') return;
    const resolve = ackWaiters.get(message.reportId);
    if (resolve) {
      resolve(true);
      ackWaiters.delete(message.reportId);
    }
  });

  let sent = 0;
  let acked = 0;

  try {
    for (const report of pending) {
      const payload: RelayMessage = {
        magic: RELAY_MAGIC,
        type: 'report',
        from: deviceId,
        report,
      };
      const ok = await device.write(JSON.stringify(payload) + RELAY_DELIMITER);
      if (!ok) continue;
      sent++;

      const didAck = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => {
          ackWaiters.delete(report.id);
          resolve(false);
        }, 8000);
        ackWaiters.set(report.id, () => {
          clearTimeout(timer);
          resolve(true);
        });
      });

      if (didAck) {
        await markAsSynced(report.id);
        acked++;
      }
    }
  } finally {
    subscription.remove();
    try {
      await device.disconnect();
    } catch {
      // ignore
    }
  }

  return { sent, acked };
}
