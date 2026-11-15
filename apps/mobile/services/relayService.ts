import { Linking, PermissionsAndroid, Platform } from 'react-native';
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

async function getDeviceId(): Promise<string> {
  const existing = await kvStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const fresh = uuid.v4() as string;
  await kvStorage.setItem(DEVICE_ID_KEY, fresh);
  return fresh;
}

export async function ensureBluetoothEnabled(): Promise<boolean> {
  try {
    // Request permissions FIRST so Android 12+ doesn't throw SecurityException
    const permsOk = await requestBluetoothPermissions();
    if (!permsOk) return false;

    const available = await RNBluetoothClassic.isBluetoothAvailable();
    if (!available) return false;
    const enabled = await RNBluetoothClassic.isBluetoothEnabled();
    if (!enabled) {
      const requested = await RNBluetoothClassic.requestBluetoothEnabled();
      if (!requested) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
  const androidPerms = PermissionsAndroid.PERMISSIONS as Record<string, string | undefined>;
  const perms: string[] = [];

  if (apiLevel >= 31) {
    // Android 12+: only Bluetooth runtime permissions (no location needed)
    if (androidPerms.BLUETOOTH_SCAN) perms.push(androidPerms.BLUETOOTH_SCAN);
    if (androidPerms.BLUETOOTH_CONNECT) perms.push(androidPerms.BLUETOOTH_CONNECT);
    if (androidPerms.BLUETOOTH_ADVERTISE) perms.push(androidPerms.BLUETOOTH_ADVERTISE);
  } else {
    // Android 11 and below: location permission required for BT discovery
    if (androidPerms.ACCESS_FINE_LOCATION) perms.push(androidPerms.ACCESS_FINE_LOCATION);
    if (androidPerms.ACCESS_COARSE_LOCATION) perms.push(androidPerms.ACCESS_COARSE_LOCATION);
  }

  if (perms.length === 0) return true;

  const results = await PermissionsAndroid.requestMultiple(perms);
  return perms.every((perm) => results[perm] === PermissionsAndroid.RESULTS.GRANTED);
}

export async function isBluetoothEnabled(): Promise<boolean> {
  try {
    return await RNBluetoothClassic.isBluetoothEnabled();
  } catch {
    return false;
  }
}

export async function openBluetoothSettings(): Promise<void> {
  // Use Android Intent directly — works even when native BT module has issues
  if (Platform.OS === 'android') {
    try {
      await Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
      return;
    } catch {
      // fallback below
    }
  }

  try {
    RNBluetoothClassic.openBluetoothSettings();
  } catch {
    try {
      await Linking.openSettings();
    } catch {
      // ignore
    }
  }
}

export async function getPairedDevices(): Promise<BluetoothDevice[]> {
  try {
    return await RNBluetoothClassic.getBondedDevices();
  } catch {
    return [];
  }
}

export async function discoverRelayDevices(): Promise<BluetoothDevice[]> {
  try {
    return await RNBluetoothClassic.startDiscovery();
  } catch {
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

async function forwardReportToSupabase(report: QueuedSOSReport): Promise<boolean> {
  try {
    const client = await getSupabaseClient();
    if (!client) {
      console.error('Supabase config missing.');
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

export async function startRelayListener(onStatus?: (status: 'listening' | 'connected') => void): Promise<void> {
  if (listening) return;

  const enabled = await ensureBluetoothEnabled();
  if (!enabled) {
    throw new Error('Bluetooth unavailable');
  }

  listening = true;
  onStatus?.('listening');

  try {
    const deviceId = await getDeviceId();
    await RNBluetoothClassic.setBluetoothAdapterName(`RESQNET-${deviceId.slice(0, 4).toUpperCase()}`);
  } catch {
    // ignore rename errors
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
      console.error('Relay listener failed', error);
    });
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
    return { sent: 0, acked: 0 };
  }

  const pending = await getUnsyncedReports();
  if (pending.length === 0) {
    return { sent: 0, acked: 0 };
  }

  const deviceId = await getDeviceId();
  const connectOptions = {
    connectionType: 'delimited',
    delimiter: RELAY_DELIMITER,
    charset: 'utf-8',
    serviceName: RELAY_SERVICE_NAME,
  };

  let connected = await device.connect(connectOptions);
  if (!connected) {
    connected = await device.connect({ ...connectOptions, secureSocket: false });
  }

  if (!connected) {
    return { sent: 0, acked: 0 };
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
      }, 6000);
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

  subscription.remove();
  await device.disconnect();

  return { sent, acked };
}
