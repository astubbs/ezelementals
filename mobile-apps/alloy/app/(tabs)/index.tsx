/**
 * Volume control screen — the canonical implementation of the Alloy
 * UX principles. Dual numeric readout (intent vs confirmed), custom
 * slider at 60fps, connection indicator.
 *
 * See mobile-apps/specs/volume-control.md.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { DualReadout } from '../../src/components/DualReadout';
import { VolumeSlider } from '../../src/components/VolumeSlider';
import { ConnectionBadge } from '../../src/components/ConnectionBadge';
import { useVolumeTarget } from '../../src/hooks/useVolumeTarget';
import { useSettings } from '../../src/hooks/useSettings';
import { storage } from '../../src/lib/storage';

export default function VolumeScreen() {
  const settings = useSettings();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    storage.getHaToken().then(setToken);
  }, []);

  // If no bound target, redirect to onboarding.
  useEffect(() => {
    if (settings.loaded && !settings.boundTarget) {
      router.replace('/onboarding/welcome');
    }
  }, [settings.loaded, settings.boundTarget]);

  if (!settings.boundTarget || !token) {
    return (
      <View style={styles.container}>
        <Text style={styles.subtitle}>Loading...</Text>
      </View>
    );
  }

  return <VolumeScreenInner descriptor={settings.boundTarget} token={token} />;
}

// Separate component so hooks are only called when we have a target.
function VolumeScreenInner({
  descriptor,
  token,
}: {
  descriptor: NonNullable<ReturnType<typeof useSettings>['boundTarget']>;
  token: string;
}) {
  const vol = useVolumeTarget(descriptor, token);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Volume</Text>
        <Text style={styles.subtitle}>{descriptor.entityId}</Text>
      </View>

      <DualReadout intent={vol.intent} confirmed={vol.confirmed} />

      <VolumeSlider
        value={vol.intent}
        min={vol.range.min}
        max={vol.range.max}
        onDragStart={vol.onDragStart}
        onDragChange={vol.onDragChange}
        onDragEnd={vol.onDragEnd}
      />

      <ConnectionBadge state={vol.connection} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 32 },
  header: { gap: 4 },
  title: { fontSize: 34, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#8E8E93' },
});
