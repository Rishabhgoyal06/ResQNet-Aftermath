import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
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
  getRelayName,
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
  const [relayActive, setRelayActive] = useState(true);
  const [listenerState, setListenerState] = useState<RelayState>('idle');
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [selected, setSelected] = useState<BluetoothDevice | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [scanBusy, setScanBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [statusBanner, setStatusBanner] = useState<StatusBannerData | null>(null);
  const [hasConfig, setHasConfig] = useState(true);
  const [localRelayName, setLocalRelayName] = useState('RESQNET-????');

  const refreshStatus = useCallback(async () => {
    const enabled = await isBluetoothEnabled();
    setRelayActive(enabled);
    const count = await getPendingCount();
    setPendingCount(count);
    const name = await getRelayName();
    setLocalRelayName(name);
  }, []);

  useEffect(() => {
    refreshStatus();
    (async () => {
      const configured = await isSupabaseConfigured();
      setHasConfig(configured);
    })();
    return () => {
      stopRelayListener();
    };
  }, [refreshStatus]);

  const handleStartListener = useCallback(async () => {
    setStatusBanner(null);
    try {
      setListenerState('listening');
      const assignedName = await startRelayListener((status) => {
        if (status === 'connected') setListenerState('connected');
        if (status === 'listening') setListenerState('listening');
      });
      setLocalRelayName(assignedName);
      await refreshStatus();
      setStatusBanner({
        text: `Relay Listener active! Broadcasting as "${assignedName}". Keep this screen open on the online device.`,
        type: 'success',
      });
    } catch (err: unknown) {
      setListenerState('idle');
      const msg = err instanceof Error ? err.message : 'Could not start relay listener. Please try again.';
      setStatusBanner({
        text: msg,
        type: 'error',
      });
    }
  }, [refreshStatus]);

  const handleStopListener = useCallback(async () => {
    await stopRelayListener();
    setListenerState('idle');
    setStatusBanner({
      text: 'Relay listener stopped.',
      type: 'info',
    });
  }, []);

  const handleScan = useCallback(async () => {
    setScanBusy(true);
    setStatusBanner(null);
    await ensureBluetoothEnabled();

    try {
      const paired = await getPairedDevices();
      const discovered = await discoverRelayDevices();
      const merged = new Map<string, BluetoothDevice>();

      paired.forEach((device) => {
        const key = device.name || device.address || device.id;
        if (key) merged.set(key, device);
      });
      discovered.forEach((device) => {
        const key = device.name || device.address || device.id;
        if (key) merged.set(key, device);
      });

      const list = Array.from(merged.values());

      // Sort RESQNET relay devices to the very top
      list.sort((a, b) => {
        const aName = (a.name || '').toUpperCase();
        const bName = (b.name || '').toUpperCase();
        const aIsResq = aName.startsWith('RESQNET');
        const bIsResq = bName.startsWith('RESQNET');
        if (aIsResq && !bIsResq) return -1;
        if (!aIsResq && bIsResq) return 1;
        return aName.localeCompare(bName);
      });

      setDevices(list);

      // Auto-select first RESQNET device if found
      const resq = list.find((d) => (d.name || '').toUpperCase().startsWith('RESQNET'));
      setSelected(resq || list[0] || null);

      if (list.length === 0) {
        setStatusBanner({
          text: 'No relay devices found. Make sure the other phone has tapped "Start Relay Listener" (it broadcasts as RESQNET-XXXX).',
          type: 'info',
        });
      } else {
        const resqCount = list.filter((d) => (d.name || '').toUpperCase().startsWith('RESQNET')).length;
        if (resqCount > 0) {
          setStatusBanner({
            text: `Discovered active relay node (${resq?.name || 'RESQNET'})! Ready to transfer SOS.`,
            type: 'success',
          });
        } else {
          setStatusBanner({
            text: `Discovered ${list.length} nearby device(s). Tap one to select as relay receiver.`,
            type: 'info',
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Discovery failed';
      setStatusBanner({
        text: `Scan: ${msg}`,
        type: 'error',
      });
    } finally {
      setScanBusy(false);
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (!selected) {
      setStatusBanner({
        text: 'Select a relay device from the list above first.',
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
      text: `Transmitting pending SOS reports to ${selected.name || 'relay'}...`,
      type: 'info',
    });

    try {
      const result = await sendPendingToDevice(selected);
      const count = await getPendingCount();
      setPendingCount(count);

      if (result.sent === 0) {
        setStatusBanner({
          text: 'No pending SOS reports in queue.',
          type: 'info',
        });
      } else if (result.acked > 0) {
        setStatusBanner({
          text: `Delivered ${result.acked}/${result.sent} SOS reports to ${selected.name || 'relay'}! Forwarded to ResQNet Command Center.`,
          type: 'success',
        });
      } else {
        setStatusBanner({
          text: `Sent ${result.sent} report(s). Awaiting confirmation from ${selected.name || 'relay'}.`,
          type: 'info',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transmission failed';
      setStatusBanner({
        text: msg,
        type: 'error',
      });
    } finally {
      setSendBusy(false);
    }
  }, [selected, pendingCount]);

  return (
    <LinearGradient colors={['#0a0f1f', '#0b152b', '#0a0f1f']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Relay Mode</Text>
        <Text style={styles.subtitle}>
          Direct emergency mesh relay. Keep this screen open to transfer SOS reports from offline devices to online field relays.
        </Text>

        {/* RECEIVER CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Receiver Mode (Online Device)</Text>
          <Text style={styles.cardSubtitle}>
            Use on the phone that has internet. It broadcasts as {localRelayName} and forwards incoming SOS reports to Supabase.
          </Text>

          {!hasConfig && (
            <View style={styles.bannerWarning}>
              <Text style={styles.bannerWarningText}>Supabase not configured. Set it in Supabase Setup first.</Text>
            </View>
          )}

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: relayActive ? '#22c55e' : '#ef4444' }]} />
            <Text style={styles.statusText}>{relayActive ? 'Relay Active' : 'Relay Off'}</Text>
            <View style={[styles.statusDot, { backgroundColor: isConnected ? '#22c55e' : '#ef4444' }]} />
            <Text style={styles.statusText}>{isConnected ? 'Internet Connected' : 'Offline Mode'}</Text>
          </View>

          <View style={styles.listenerRow}>
            <Text style={styles.listenerLabel}>
              {listenerState === 'idle' && `Listener stopped (Ready as ${localRelayName})`}
              {listenerState === 'listening' && `Listening for connections as ${localRelayName}...`}
              {listenerState === 'connected' && `Relay connected to peer! Forwarding SOS...`}
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
            {isNativeBluetoothSupported() && (
              <TouchableOpacity style={styles.buttonOutline} onPress={openBluetoothSettings}>
                <Text style={styles.buttonOutlineText}>Bluetooth Settings</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* SENDER CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sender Mode (Offline Device)</Text>
          <Text style={styles.cardSubtitle}>
            Use on the phone without internet. Scans for the online phone (RESQNET-XXXX) and transmits queued SOS reports.
          </Text>

          <View style={styles.queueRow}>
            <Text style={styles.queueLabel}>Pending SOS</Text>
            <Text style={[styles.queueValue, pendingCount > 0 && styles.queueValuePending]}>{pendingCount}</Text>
          </View>

          <TouchableOpacity style={styles.buttonOutline} onPress={handleScan} disabled={scanBusy}>
            {scanBusy ? <ActivityIndicator color="#93c5fd" /> : <Text style={styles.buttonOutlineText}>Scan for Relays</Text>}
          </TouchableOpacity>

          {devices.length === 0 ? (
            <Text style={styles.emptyText}>
              No relay devices found yet. Tap &apos;Scan for Relays&apos;. Ensure the other phone has tapped &apos;Start Relay Listener&apos; (it broadcasts as RESQNET-XXXX).
            </Text>
          ) : (
            <View style={styles.deviceList}>
              {devices.map((device) => {
                const key = device.name || device.address || device.id;
                const active = selected?.name === device.name || (selected?.id && selected.id === device.id);
                const isResq = (device.name || '').toUpperCase().startsWith('RESQNET');
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.deviceItem,
                      active && styles.deviceItemActive,
                      isResq && styles.deviceItemResq,
                    ]}
                    onPress={() => setSelected(device)}
                  >
                    <View style={styles.deviceHeader}>
                      <Text style={[styles.deviceName, isResq && styles.deviceNameResq]}>
                        {device.name || 'Unnamed Relay Device'}
                      </Text>
                      {isResq && (
                        <View style={styles.tagPillResq}>
                          <Text style={styles.tagPillText}>RESQNET RELAY</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.deviceMeta}>{device.address ?? device.id}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, (sendBusy || pendingCount === 0 || !selected) && styles.buttonDisabled]}
            onPress={handleSend}
            disabled={sendBusy || pendingCount === 0 || !selected}
          >
            {sendBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {pendingCount > 0
                  ? selected
                    ? `Send ${pendingCount} SOS to ${selected.name || 'Selected Device'}`
                    : 'Select a Relay Device Above'
                  : 'No Pending SOS'}
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
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#f8fafc',
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
    opacity: 0.5,
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
  deviceItemResq: {
    borderColor: '#16a34a',
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
  deviceNameResq: {
    color: '#86efac',
    fontWeight: '800',
  },
  tagPillResq: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#059669',
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#f0fdf4',
    letterSpacing: 0.5,
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
});
