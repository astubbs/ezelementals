/**
 * Persisted app settings: bound target, HA config. Reads from
 * storage on mount, exposes typed setters that persist immediately.
 */

import { useCallback, useEffect, useState } from 'react';
import { storage } from '../lib/storage';
import type { VolumeTargetDescriptor } from '../types';

export interface Settings {
  /** The currently bound volume target, or null if onboarding needed. */
  boundTarget: VolumeTargetDescriptor | null;
  /** Whether settings have been loaded from storage yet. */
  loaded: boolean;
  /** Bind a target (saves to storage). */
  bind(descriptor: VolumeTargetDescriptor): Promise<void>;
  /** Clear the bound target (returns to onboarding). */
  clear(): Promise<void>;
  /** Save HA connection info. */
  saveHaConfig(baseURL: string, token: string): Promise<void>;
  /** Load saved HA token. */
  getHaToken(): Promise<string | null>;
  /** Load saved HA base URL. */
  getHaBaseURL(): Promise<string | null>;
}

export function useSettings(): Settings {
  const [boundTarget, setBoundTarget] = useState<VolumeTargetDescriptor | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    storage.getBoundTarget().then((t) => {
      setBoundTarget(t);
      setLoaded(true);
    });
  }, []);

  const bind = useCallback(async (descriptor: VolumeTargetDescriptor) => {
    await storage.setBoundTarget(descriptor);
    setBoundTarget(descriptor);
  }, []);

  const clear = useCallback(async () => {
    await storage.clearBoundTarget();
    setBoundTarget(null);
  }, []);

  const saveHaConfig = useCallback(async (baseURL: string, token: string) => {
    await storage.setHaBaseURL(baseURL);
    await storage.setHaToken(token);
  }, []);

  return {
    boundTarget,
    loaded,
    bind,
    clear,
    saveHaConfig,
    getHaToken: storage.getHaToken,
    getHaBaseURL: storage.getHaBaseURL,
  };
}
