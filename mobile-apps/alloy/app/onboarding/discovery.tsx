/**
 * Discovery screen. Queries HA for media_player entities that look
 * like AV receivers and streams results into a list. The user can
 * tap through to the target picker once results are available.
 */

import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { AvrRow } from '../../src/components/AvrRow';
import { useDiscovery } from '../../src/hooks/useDiscovery';
import { useSettings } from '../../src/hooks/useSettings';
import type { HAConfig } from '../../src/lib/ha-client';

export default function DiscoveryScreen() {
  const router = useRouter();
  const settings = useSettings();
  const { results, loading, error, discover } = useDiscovery();

  useEffect(() => {
    (async () => {
      const baseURL = await settings.getHaBaseURL();
      const token = await settings.getHaToken();
      if (baseURL && token) {
        const config: HAConfig = { baseURL, token };
        await discover(config);
      }
    })();
    // Only run discovery once on mount. `discover` and `settings`
    // are stable references from custom hooks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Looking for receivers…</Text>
      <Text style={styles.subtitle}>
        Found on your Home Assistant instance:
      </Text>

      {loading && <ActivityIndicator size="large" style={{ marginVertical: 24 }} />}

      {error && <Text style={styles.error}>{error}</Text>}

      {!loading && results.length === 0 && !error && (
        <Text style={styles.empty}>
          No AV receivers found. Make sure your receiver is set up in
          Home Assistant as a media_player entity.
        </Text>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AvrRow
            avr={item}
            onPress={() =>
              router.push({
                pathname: '/onboarding/test-connection',
                params: {
                  entityId: item.entityId,
                  friendlyName: item.friendlyName,
                },
              })
            }
          />
        )}
        style={{ flex: 1 }}
      />

      {results.length > 0 && (
        <Pressable
          onPress={() => router.push('/onboarding/target-picker')}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Pick from these</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#8E8E93' },
  empty: { fontSize: 14, color: '#8E8E93', marginTop: 20 },
  error: { color: '#FF3B30', fontSize: 14 },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
