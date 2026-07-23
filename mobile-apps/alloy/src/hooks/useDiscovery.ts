/**
 * Hook for discovering AVR-like media_player entities via HA REST.
 *
 * Queries /api/states and filters for entities that look like AV
 * receivers. Returns the list and a loading state.
 */

import { useCallback, useState } from 'react';
import type { DiscoveredAvr } from '../types';
import * as ha from '../lib/ha-client';

export function useDiscovery() {
  const [results, setResults] = useState<DiscoveredAvr[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discover = useCallback(async (config: ha.HAConfig) => {
    setLoading(true);
    setError(null);
    try {
      const states = await ha.fetchStates(config);
      const avrs = ha.filterAvrEntities(states);
      setResults(
        avrs.map((s) => ({
          id: `ha:${s.entity_id}`,
          friendlyName: s.attributes?.friendly_name ?? s.entity_id,
          modelName: s.attributes?.device_class ?? undefined,
          entityId: s.entity_id,
          source: 'homeAssistant' as const,
        })),
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, discover };
}
