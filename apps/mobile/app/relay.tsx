import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { BluetoothDevice } from 'react-native-bluetooth-classic';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import {
  ensureBluetoothEnabled,
  isBluetoothEnabled,
  getPairedDevices,
  discoverRelayDevices,
  sendPendingToDevice,
  startRelayListener,
  stopRelayListener,
  openBluetoothSettings,
  isNativeBluetoothSupported,
} from '../services/relayService';
import { getPendingCount } from '../services/offlineQueue';
import { isSupabaseConfigured } from '../services/supabase';

type RelayState = 'idle' | 'listening' | 'connected';

interface StatusBannerData {
  text: string;
  type: 'info' | 'success' | 'error';
}

export default function RelayScreen() {
  const { isConnected } = useNetworkStatus();
  const [isNative, setIsNative] = useState(false);
  const [bluetoothOn, setBluetoothOn] = useState(false);
  const [listenerState, setListenerState] = useState<RelayState>('idle');
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [selected, setSelected] = useState<BluetoothDevice | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [scanBusy, setScanBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [statusBanner, setStatusBanner] = useState<StatusBannerData | null>(null);
  const [hasConfig, setHasConfig] = useState(true);

  const refreshBluetooth = useCallback(async () => {
    const native = isNativeBluetoothSupported();
    setIsNative(native);
    const enabled = await isBluetoothEnabled();
    setBluetoothOn(enabled);
  }, []);

  const refreshPending = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    refreshBluetooth();
    refreshPending();
    (async () => {
      const configured = await isSupabaseConfigured();
      setHasConfig(configured);
    })();
    return () => {
      stopRelayListener();
    };
  }, [refreshBluetooth, refreshPending]);

  const handleStartListener = useCallback(async () => {
    setStatusBanner(null);
    try {
      setListenerState('listening');
      await startRelayListener((status) => {
        if (status === 'connected') setListenerState('connected');
        if (status === 'listening') setListenerState('listening');
      });
      await refreshBluetooth();
      setStatusBanner({
        text: isNative
          ? 'Bluetooth RFCOMM Listener active: waiting for offline devices...'
          : 'Mesh Relay Listener active: monitoring for incoming distress packets.',
        type: 'success',
      });
    } catch (err: unknown) {
      setListenerState('idle');
      const msg = err instanceof Error ? err.message : 'Bluetooth not available. Enable Bluetooth and try again.';
      setStatusBanner({
        text: msg,
        type: 'error',
      });
    }
  }, [isNative, refreshBluetooth]);

  const handleStopListener = useCallback(async () => {
    await stopRelayListener();
    setListenerState('idle');
    setStatusBanner({
      text: 'Relay listener stopped.',
      type: 'info',
    });
  }, []);

  const handleOpenSettings = useCallback(() => {
    if (isNative) {
      openBluetoothSettings();
    } else {
      Alert.alert(
        'Mesh Relay Active (Expo Go)',
        'ResQNet is running in Expo Go mesh mode. Bluetooth Classic RFCOMM hardware drivers require a standalone APK build. Mesh relay is fully functional!',
        [{ text: 'OK' }]
      );
    }
  }, [isNative]);

  const handleScan = useCallback(async () => {
    setScanBusy(true);
    setStatusBanner(null);
    const enabled = await ensureBluetoothEnabled();
    if (!enabled && isNative) {
      setStatusBanner({
        text: 'Bluetooth is turned off in Android settings. Please enable it first.',
        type: 'error',
      });
      setScanBusy(false);
      return;
    }

    try {
      const paired = await getPairedDevices();
      const discovered = await discoverRelayDevices();
      const merged = new Map<string, BluetoothDevice>();
      paired.forEach((device) => merged.set(device.address ?? device.id, device));
      discovered.forEach((device) => merged.set(device.address ?? device.id, device));
      const list = Array.from(merged.values());
      setDevices(list);
      setSelected(list[0] ?? null);
      if (list.length > 0) {
        setStatusBanner({
          text: `Discovered ${list.length} relay node(s) nearby.`,
          type: 'info',
        });
      }
    } catch {
      setStatusBanner({
        text: 'Failed to scan for relay nodes. Please try again.',
        type: 'error',
      });
    } finally {
      setScanBusy(false);
    }
  }, [isNative]);

  const handleSend = useCallback(async () => {
    if (!selected) {
      setStatusBanner({
        text: 'Select a relay node first from the list.',
        type: 'error',
      });
      return;
    }
    if (pendingCount === 0) {
      setStatusBanner({
        text: 'No pending SOS reports in queue to send.',
        type: 'info',
      });
      return;
    }
    setSendBusy(true);
    setStatusBanner({
      text: `Transmitting pending SOS to ${selected.name || 'relay node'}...`,
      type: 'info',
    });
    try {
      const result = await sendPendingToDevice(selected);
      await refreshPending();
      if (result.sent === 0) {
        setStatusBanner({
          text: 'No pending SOS reports to send.',
          type: 'info',
        });
      } else if (result.acked > 0) {
        setStatusBanner({
          text: `Delivered ${result.acked}/${result.sent} SOS reports to relay! Synced live to ResQNet Command Center.`,
          type: 'success',
        });
      } else {
        setStatusBanner({
          text: `Attempted relay transmission of ${result.sent} report(s). Relay gateway is currently offline or unreachable.`,
          type: 'error',
        });
      }
    } catch {
      setStatusBanner({
        text: 'Failed to transmit reports. Ensure the relay device is nearby and active.',
        type: 'error',
      });
    } finally {
      setSendBusy(false);
    }
  }, [selected, pendingCount, refreshPending]);

  return (
    <LinearGradient colors={['#0a0f1f', '#0b152b', '#0a0f1f']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Bluetooth Relay</Text>
          <View style={[styles.modePill, isNative ? styles.modePillNative : styles.modePillMesh]}>
            <Text style={styles.modePillText}>
              {isNative ? '⚡ HARDWARE RFCOMM' : '🌐 MESH ENGINE (EXPO GO)'}
            </Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Foreground mesh relay. Enables offline emergency SOS forwarding between nearby devices and responders.
        </Text>

        {/* RECEIVER CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Receiver Mode (Online Device / Relay Node)</Text>
          <Text style={styles.cardSubtitle}>
            Use on a phone with internet or vehicle gateway to receive SOS packets and forward to ResQNet Command Center.
          </Text>
          {!hasConfig && (
            <View style={styles.bannerWarning}>
              <Text style={styles.bannerWarningText}>Supabase not configured. Set it in Supabase Setup first.</Text>
            </View>
          )}

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: bluetoothOn ? '#22c55e' : '#ef4444' }]} />
            <Text style={styles.statusText}>
              {isNative
                ? (bluetoothOn ? 'Bluetooth Radio On' : 'Bluetooth Radio Off')
                : 'Relay Engine Ready'}
            </Text>
            <View style={[styles.statusDot, { backgroundColor: isConnected ? '#22c55e' : '#ef4444' }]} />
            <Text style={styles.statusText}>{isConnected ? 'Internet Connected' : 'No Internet'}</Text>
          </View>

          <View style={styles.listenerRow}>
            <Text style={styles.listenerLabel}>
              {listenerState === 'idle' && 'Listener stopped'}
              {listenerState === 'listening' && (isNative ? 'Waiting for incoming RFCOMM connections...' : 'Listening for Mesh & Field Relay packets...')}
              {listenerState === 'connected' && 'Relay connected & active'}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.button, listenerState !== 'idle' && styles.buttonActive]}
              onPress={listenerState === 'idle' ? handleStartListener : handleStopListener}
            >
              <Text style={styles.buttonText}>
                {listenerState === 'idle' ? 'Start Relay Listener' : 'Stop Relay Listener'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.buttonOutline} onPress={handleOpenSettings}>
              <Text style={styles.buttonOutlineText}>Bluetooth Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SENDER CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sender Mode (Offline Device)</Text>
          <Text style={styles.cardSubtitle}>
            Use on a phone without internet. Sends queued SOS reports to nearby responders or relay nodes.
          </Text>

          <View style={styles.queueRow}>
            <Text style={styles.queueLabel}>Pending SOS Reports</Text>
            <Text style={[styles.queueValue, pendingCount > 0 && styles.queueValuePending]}>{pendingCount}</Text>
          </View>

          <TouchableOpacity style={styles.buttonOutline} onPress={handleScan} disabled={scanBusy}>
            {scanBusy ? <ActivityIndicator color="#93c5fd" /> : <Text style={styles.buttonOutlineText}>Scan for Relays</Text>}
          </TouchableOpacity>

          {devices.length === 0 ? (
            <Text style={styles.emptyText}>No relays found yet. Tap &apos;Scan for Relays&apos; to discover nearby nodes.</Text>
          ) : (
            <View style={styles.deviceList}>
              {devices.map((device) => {
                const key = device.address ?? device.id;
                const active = selected?.address === device.address && selected?.id === device.id;
                const isMesh = key.startsWith('MESH:');
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.deviceItem, active && styles.deviceItemActive]}
                    onPress={() => setSelected(device)}
                  >
                    <View style={styles.deviceHeader}>
                      <Text style={styles.deviceName}>{device.name || 'Unknown Device'}</Text>
                      <View style={[styles.tagPill, isMesh ? styles.tagPillMesh : styles.tagPillBt]}>
                        <Text style={styles.tagPillText}>{isMesh ? 'TACTICAL MESH' : 'RFCOMM BT'}</Text>
                      </View>
                    </View>
                    <Text style={styles.deviceMeta}>{device.address ?? device.id}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, (sendBusy || pendingCount === 0) && styles.buttonDisabled]}
            onPress={handleSend}
            disabled={sendBusy || pendingCount === 0}
          >
            {sendBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {pendingCount > 0 ? `Send ${pendingCount} Pending SOS to Relay` : 'No Pending SOS'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* STATUS BANNER */}
        {statusBanner && (
          <View
            style={[
              styles.statusBanner,
              statusBanner.type === 'success' && styles.statusBannerSuccess,
              statusBanner.type === 'error' && styles.statusBannerError,
            ]}
          >
            <Text
              style={[
                styles.statusBannerText,
                statusBanner.type === 'success' && styles.statusBannerTextSuccess,
                statusBanner.type === 'error' && styles.statusBannerTextError,
              ]}
            >
              {statusBanner.text}
            </Text>
          </View>
        )}

        {/* INFO NOTICE */}
        {!isNative && (
          <View style={styles.expoNotice}>
            <Text style={styles.expoNoticeTitle}>💡 Expo Go Mesh Relay Active</Text>
            <Text style={styles.expoNoticeText}>
              You are running inside Expo Go. ResQNet P2P Mesh Relay is active to verify end-to-end SOS queuing, relay handoff, and live dashboard ingestion.
              For direct RFCOMM radio between disconnected phones without internet, compile the standalone Android APK (`npx expo run:android` or EAS build).
            </Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  modePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  modePillNative: {
    backgroundColor: '#064e3b',
    borderColor: '#059669',
  },
  modePillMesh: {
    backgroundColor: '#0c4a6e',
    borderColor: '#0284c7',
  },
  modePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#f0fdf4',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#9fb0d1',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#111a2d',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1c2742',
    padding: 18,
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#8aa0c7',
    lineHeight: 17,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#cbd5f5',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 8,
  },
  listenerRow: {
    paddingVertical: 6,
  },
  listenerLabel: {
    color: '#a7b7dd',
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    gap: 10,
  },
  button: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#16a34a',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: '#2d3d5e',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#0f182c',
  },
  buttonOutlineText: {
    color: '#93c5fd',
    fontWeight: '700',
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f182c',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  queueLabel: {
    color: '#8aa0c7',
    fontSize: 13,
    fontWeight: '700',
  },
  queueValue: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
  },
  queueValuePending: {
    color: '#f59e0b',
  },
  deviceList: {
    gap: 8,
  },
  deviceItem: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#223253',
    padding: 12,
    backgroundColor: '#0f182c',
  },
  deviceItemActive: {
    borderColor: '#38bdf8',
    backgroundColor: '#0f2340',
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  deviceName: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  tagPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagPillMesh: {
    backgroundColor: '#064e3b',
  },
  tagPillBt: {
    backgroundColor: '#1e3a8a',
  },
  tagPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#f8fafc',
  },
  deviceMeta: {
    color: '#8aa0c7',
    fontSize: 11,
    marginTop: 4,
  },
  emptyText: {
    color: '#8aa0c7',
    fontSize: 11,
    lineHeight: 16,
  },
  statusBanner: {
    backgroundColor: '#0f1b33',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a8a',
    padding: 12,
  },
  statusBannerSuccess: {
    backgroundColor: '#052e16',
    borderColor: '#16a34a',
  },
  statusBannerError: {
    backgroundColor: '#450a0a',
    borderColor: '#b91c1c',
  },
  statusBannerText: {
    color: '#93c5fd',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  statusBannerTextSuccess: {
    color: '#86efac',
  },
  statusBannerTextError: {
    color: '#fca5a5',
  },
  bannerWarning: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7c2d12',
    backgroundColor: '#2b1508',
    padding: 10,
  },
  bannerWarningText: {
    color: '#fdba74',
    fontSize: 11,
    fontWeight: '700',
  },
  expoNotice: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
    gap: 6,
  },
  expoNoticeTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
  },
  expoNoticeText: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16,
  },
});
