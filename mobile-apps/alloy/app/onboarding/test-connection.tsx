/**
 * Test connection screen. Opens the selected target, queries current
 * volume, shows a live preview. On success the user taps "Start using
 * Alloy" to bind and proceed to the volume control.
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSettings } from '../../src/hooks/useSettings';
import * as ha from '../../src/lib/ha-client';
import type { VolumeTargetDescriptor } from '../../src/types';

export default function TestConnectionScreen() {
  const { entityId, friendlyName } = useLocalSearchParams<{
    entityId: string;
    friendlyName: string;
  }>();
  const router = useRouter();
  const settings = useSettings();

  const [volume, setVolume] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const baseURL = await settings.getHaBaseURL();
        const token = await settings.getHaToken();
        if (!baseURL || !token || !entityId) {
          setError('Missing HA configuration.');
          return;
        }
        const config: ha.HAConfig = { baseURL, token };
        const states = await ha.fetchStates(config);
        const match = states.find((s) => s.entity_id === entityId);
        if (match?.attributes?.volume_level != null) {
          setVolume(Math.round(match.attributes.volume_level * 100));
        } else {
          setError('Could not read volume from this target.');
        }
      } catch (e) {
        setError(String(e));
      }
    })();
    // `settings` is a stable reference from a custom hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  const handleConfirm = async () => {
    const baseURL = await settings.getHaBaseURL();
    if (!baseURL || !entityId) return;
    const descriptor: VolumeTargetDescriptor = {
      type: 'homeAssistant',
      haBaseURL: baseURL,
      entityId,
    };
    await settings.bind(descriptor);
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>{friendlyName ?? entityId}</Text>
        <Text style={styles.subtitle}>via Home Assistant</Text>
      </View>

      {volume != null ? (
        <View style={styles.center}>
          <Text style={styles.volumeText}>{volume}</Text>
          <Text style={styles.hint}>Current volume reported by the target.</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.hint}>Testing…</Text>
        </View>
      )}

      <View style={{ flex: 1 }} />

      <Pressable
        onPress={handleConfirm}
        style={[styles.button, volume == null && styles.buttonDisabled]}
        disabled={volume == null}
      >
        <Text style={styles.buttonText}>Start using Alloy</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 24 },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#8E8E93' },
  center: { alignItems: 'center', gap: 12, marginTop: 32 },
  volumeText: { fontSize: 72, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
  hint: { fontSize: 12, color: '#8E8E93' },
  error: { color: '#FF3B30', fontSize: 14, textAlign: 'center' },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
