/**
 * Target picker — the user taps an AVR from the discovered list to
 * test and bind it.
 */

import { useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AvrRow } from '../../src/components/AvrRow';
import { useDiscovery } from '../../src/hooks/useDiscovery';
import { useSettings } from '../../src/hooks/useSettings';
import type { HAConfig } from '../../src/lib/ha-client';

export default function TargetPickerScreen() {
  const router = useRouter();
  const settings = useSettings();
  const { results, discover } = useDiscovery();

  useEffect(() => {
    (async () => {
      const baseURL = await settings.getHaBaseURL();
      const token = await settings.getHaToken();
      if (baseURL && token) {
        const config: HAConfig = { baseURL, token };
        await discover(config);
      }
    })();
    // Only run discovery once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pick your volume target</Text>
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: 'bold' },
});
