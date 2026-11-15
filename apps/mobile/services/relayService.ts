import { Linking, NativeModules, PermissionsAndroid, Platform } from 'react-native';
import RNBluetoothClassic, { BluetoothDevice, BluetoothEventSubscription } from 'react-native-bluetooth-classic';
import uuid from 'react-native-uuid';
import type { QueuedSOSReport } from '@resqnet/shared-types';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { kvStorage } from './kvStorage';
import { getUnsyncedReports, markAsSynced } from './offlineQueue';
import { getSupabaseClient } from './supabase';

const DEVICE_ID_KEY = 'resqnet_device_id';
const RELAY_MAGIC = 'RESQNET1';
const RELAY_DELIMITER = '\n';
const RELAY_SERVICE_NAME = 'ResQNet Relay';
const RELAY_MESH_CHANNEL = 'resqnet_relay_mesh';

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
let activeMeshChannel: RealtimeChannel | null = null;
let beaconHeartbeatTimer: ReturnType<typeof setInterval> | null = null;

export async function getDeviceId(): Promise<string> {
  const existing = await kvStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const fresh = uuid.v4() as string;
  await kvStorage.setItem(DEVICE_ID_KEY, fresh);
  return fresh;
}

export async function getRelayName(): Promise<string> {
  const devId = await getDeviceId();
  return `RESQNET-${devId.slice(0, 4).toUpperCase()}`;
}

export function isNativeBluetoothSupported(): boolean {
  try {
    return Boolean(
      NativeModules &&
      NativeModules.RNBluetoothClassic &&
      typeof RNBluetoothClassic?.isBluetoothAvailable === 'function'
    );
  } catch {
    return false;
  }
}

export async function checkBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (!isNativeBluetoothSupported()) return true;

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
  if (!isNativeBluetoothSupported()) return true;

  try {
    const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
    const androidPerms = PermissionsAndroid.PERMISSIONS as Record<string, string | undefined>;

    if (apiLevel >= 31) {
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
  if (!isNativeBluetoothSupported()) {
    return true;
  }

  try {
    const permsGranted = await requestBluetoothPermissions();
    if (!permsGranted) {
      return false;
    }

    const available = await RNBluetoothClassic.isBluetoothAvailable();
    if (!available) return false;

    const enabled = await RNBluetoothClassic.isBluetoothEnabled();
    if (!enabled) {
      const requested = await RNBluetoothClassic.requestBluetoothEnabled();
      if (!requested) return false;
    }

    return true;
  } catch (err) {
    console.warn('ensureBluetoothEnabled error:', err);
    return true;
  }
}

export async function isBluetoothEnabled(): Promise<boolean> {
  if (isNativeBluetoothSupported()) {
    try {
      const hasPerms = await checkBluetoothPermissions();
      if (hasPerms) {
        return await RNBluetoothClassic.isBluetoothEnabled();
      }
    } catch {
      // fallback to true
    }
  }
  return true;
}

export async function openBluetoothSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
      return;
    } catch (err) {
      console.warn('sendIntent BLUETOOTH_SETTINGS failed:', err);
    }
  }

  try {
    if (isNativeBluetoothSupported()) {
      RNBluetoothClassic.openBluetoothSettings();
      return;
    }
  } catch {
    // fallback
  }

  try {
    await Linking.openSettings();
  } catch (err) {
    console.warn('openSettings failed:', err);
  }
}

export async function getPairedDevices(): Promise<BluetoothDevice[]> {
  if (!isNativeBluetoothSupported()) return [];
  try {
    const hasPerms = await checkBluetoothPermissions();
    if (!hasPerms) return [];
    return await RNBluetoothClassic.getBondedDevices();
  } catch (err) {
    console.warn('getPairedDevices error:', err);
    return [];
  }
}

function createMeshDevice(name: string, id: string, address?: string): BluetoothDevice {
  return {
    id,
    address: address || `MESH:${id}`,
    name,
    bonded: false,
    extra: { mesh: true },
    connect: async () => true,
    disconnect: async () => true,
    isConnected: async () => true,
    write: async () => true,
    onDataReceived: () => ({ remove: () => {} }),
  } as unknown as BluetoothDevice;
}

export async function discoverRelayDevices(): Promise<BluetoothDevice[]> {
  const discovered: BluetoothDevice[] = [];
  const myDeviceId = await getDeviceId();
  const myRelayName = await getRelayName();

  // 1. Hardware Bluetooth Discovery (if native driver present)
  if (isNativeBluetoothSupported()) {
    try {
      const hasPerms = await checkBluetoothPermissions();
      if (hasPerms) {
        const btDevices = await RNBluetoothClassic.startDiscovery();
        discovered.push(...btDevices);
      }
    } catch (err) {
      console.warn('Native BT discovery warning:', err);
    }
  }

  // 2. Discover live peer relays via Supabase Realtime channel
  try {
    const client = await getSupabaseClient();
    if (client) {
      const meshPeers = await queryMeshPeers(client, myRelayName);
      discovered.push(...meshPeers);
    }
  } catch (err) {
    console.warn('Mesh peer query warning:', err);
  }

  return discovered;
}

async function queryMeshPeers(client: SupabaseClient, myRelayName: string): Promise<BluetoothDevice[]> {
  return new Promise((resolve) => {
    const peers = new Map<string, BluetoothDevice>();
    const tempChannel = client.channel(`scan_${Date.now()}`);

    const cleanup = () => {
      try {
        client.removeChannel(tempChannel);
      } catch {
        // ignore
      }
      resolve(Array.from(peers.values()));
    };

    const timer = setTimeout(cleanup, 2500);

    tempChannel.on('broadcast', { event: 'relay_beacon' }, (msg) => {
      const payload = msg.payload as { name?: string; id?: string; address?: string };
      if (!payload || !payload.name) return;
      if (payload.name === myRelayName) return; // Don't show self

      const peerId = payload.id || payload.name;
      if (!peers.has(peerId)) {
        peers.set(peerId, createMeshDevice(payload.name, peerId, payload.address));
      }
    });

    tempChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Broadcast inquiry so any active listener responds
        await tempChannel.send({
          type: 'broadcast',
          event: 'scan_query',
          payload: { from: myRelayName },
        });
      }
    });
  });
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
          source_device: 'mobile_app_relay',
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
  const myDeviceId = await getDeviceId();
  const adapterName = await getRelayName();

  if (listening) {
    return adapterName;
  }

  listening = true;
  onStatus?.('listening');

  // 1. Hardware Bluetooth Listener (if available)
  if (isNativeBluetoothSupported()) {
    try {
      await RNBluetoothClassic.setBluetoothAdapterName(adapterName);
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
                from: myDeviceId,
                to: message.from,
              };
              await listenerDevice.write(JSON.stringify(reply) + RELAY_DELIMITER);
            })();
          });
          onStatus?.('connected');
        })
        .catch((err) => {
          console.warn('Native accept warning:', err);
        });
    } catch (err) {
      console.warn('Native BT listener setup warning:', err);
    }
  }

  // 2. Mesh Channel Listener (Realtime Broadcast)
  try {
    const client = await getSupabaseClient();
    if (client) {
      if (activeMeshChannel) {
        client.removeChannel(activeMeshChannel);
        activeMeshChannel = null;
      }

      const channel = client.channel(RELAY_MESH_CHANNEL);
      activeMeshChannel = channel;

      // Respond to scan requests from peers
      channel.on('broadcast', { event: 'scan_query' }, async () => {
        if (!listening) return;
        await channel.send({
          type: 'broadcast',
          event: 'relay_beacon',
          payload: { name: adapterName, id: myDeviceId, address: `MESH:${adapterName}` },
        });
      });

      // Receive incoming SOS reports forwarded through this relay
      channel.on('broadcast', { event: 'sos_payload' }, async (msg) => {
        if (!listening) return;
        const payload = msg.payload as { to?: string; from?: string; report?: QueuedSOSReport };
        if (!payload || !payload.report) return;

        // Check if targeted to this relay or broadcast
        if (payload.to && payload.to !== adapterName && payload.to !== myDeviceId) {
          return;
        }

        onStatus?.('connected');
        const ok = await forwardReportToSupabase(payload.report);
        if (ok) {
          // Send ACK back to the sender
          await channel.send({
            type: 'broadcast',
            event: 'sos_ack',
            payload: { reportId: payload.report.id, from: adapterName, to: payload.from },
          });
        }

        setTimeout(() => {
          if (listening) onStatus?.('listening');
        }, 2000);
      });

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Announce beacon immediately
          await channel.send({
            type: 'broadcast',
            event: 'relay_beacon',
            payload: { name: adapterName, id: myDeviceId, address: `MESH:${adapterName}` },
          });
        }
      });

      // Periodic beacon heartbeat every 3 seconds while active
      if (beaconHeartbeatTimer) clearInterval(beaconHeartbeatTimer);
      beaconHeartbeatTimer = setInterval(async () => {
        if (!listening || !activeMeshChannel) {
          if (beaconHeartbeatTimer) clearInterval(beaconHeartbeatTimer);
          return;
        }
        await activeMeshChannel.send({
          type: 'broadcast',
          event: 'relay_beacon',
          payload: { name: adapterName, id: myDeviceId, address: `MESH:${adapterName}` },
        });
      }, 3000);
    }
  } catch (err) {
    console.warn('Mesh channel listener error:', err);
  }

  return adapterName;
}

export async function stopRelayListener(): Promise<void> {
  listening = false;

  if (beaconHeartbeatTimer) {
    clearInterval(beaconHeartbeatTimer);
    beaconHeartbeatTimer = null;
  }

  if (activeMeshChannel) {
    try {
      const client = await getSupabaseClient();
      if (client) client.removeChannel(activeMeshChannel);
    } catch {
      // ignore
    }
    activeMeshChannel = null;
  }

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

  if (isNativeBluetoothSupported()) {
    try {
      await RNBluetoothClassic.cancelAccept();
    } catch {
      // ignore
    }
  }
}

export async function sendPendingToDevice(device: BluetoothDevice): Promise<{ sent: number; acked: number }> {
  const pending = await getUnsyncedReports();
  if (pending.length === 0) {
    return { sent: 0, acked: 0 };
  }

  const myRelayName = await getRelayName();
  const isMeshPeer = (device.address && device.address.startsWith('MESH:')) || !isNativeBluetoothSupported();

  // 1. If native Bluetooth hardware device:
  if (!isMeshPeer && isNativeBluetoothSupported()) {
    try {
      const connectOptions = {
        connectionType: 'delimited' as const,
        delimiter: RELAY_DELIMITER,
        charset: 'utf-8',
        serviceName: RELAY_SERVICE_NAME,
      };

      let connected = false;
      try {
        connected = await device.connect(connectOptions);
      } catch {
        connected = await device.connect({ ...connectOptions, secureSocket: false });
      }

      if (connected) {
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
              from: myRelayName,
              report,
            };
            const ok = await device.write(JSON.stringify(payload) + RELAY_DELIMITER);
            if (!ok) continue;
            sent++;

            const didAck = await new Promise<boolean>((resolve) => {
              const timer = setTimeout(() => {
                ackWaiters.delete(report.id);
                resolve(false);
              }, 7000);
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
          await device.disconnect();
        }

        if (sent > 0 && acked > 0) {
          return { sent, acked };
        }
      }
    } catch (err) {
      console.warn('Native BT send attempt failed, trying mesh channel...', err);
    }
  }

  // 2. Transmit through Mesh Channel to the selected relay
  const client = await getSupabaseClient();
  if (!client) {
    throw new Error('Supabase configuration missing.');
  }

  const txChannel = client.channel(`tx_${Date.now()}`);
  const ackWaiters = new Map<string, (acked: boolean) => void>();

  txChannel.on('broadcast', { event: 'sos_ack' }, (msg) => {
    const payload = msg.payload as { reportId?: string };
    if (!payload || !payload.reportId) return;
    const resolve = ackWaiters.get(payload.reportId);
    if (resolve) {
      resolve(true);
      ackWaiters.delete(payload.reportId);
    }
  });

  await new Promise<void>((resolve) => {
    txChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve();
    });
    setTimeout(resolve, 1500); // safety timeout
  });

  let sent = 0;
  let acked = 0;

  try {
    for (const report of pending) {
      sent++;
      await txChannel.send({
        type: 'broadcast',
        event: 'sos_payload',
        payload: {
          to: device.name || device.id,
          from: myRelayName,
          report,
        },
      });

      const didAck = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(async () => {
          ackWaiters.delete(report.id);
          // If direct cloud connection is active, forward directly as resilience
          const ok = await forwardReportToSupabase(report);
          resolve(ok);
        }, 5000);

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
    try {
      client.removeChannel(txChannel);
    } catch {
      // ignore
    }
  }

  return { sent, acked };
}
