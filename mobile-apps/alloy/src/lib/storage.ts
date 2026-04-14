/**
 * Platform-adaptive storage. Uses expo-secure-store on native
 * (Keychain / EncryptedSharedPreferences) and localStorage on web.
 *
 * For M1 this is fine. The HA token is the only sensitive value
 * stored. On web, localStorage is not truly "secure" but it's
 * same-origin-sandboxed, which is acceptable for a local-network
 * app.
 */

import { Platform } from 'react-native';
import type { VolumeTargetDescriptor } from '../types';

const KEYS = {
  haToken: 'alloy.haToken',
  haBaseURL: 'alloy.haBaseURL',
  boundTarget: 'alloy.boundTarget',
  lastConfirmedVolume: 'alloy.lastConfirmedVolume',
} as const;

// Lazy-load expo-secure-store only on native to avoid web crashes.
let SecureStore: typeof import('expo-secure-store') | null = null;
if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

async function setItem(key: string, value: string): Promise<void> {
  if (SecureStore) {
    await SecureStore.setItemAsync(key, value);
  } else {
    localStorage.setItem(key, value);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (SecureStore) {
    return SecureStore.getItemAsync(key);
  }
  return localStorage.getItem(key);
}

async function removeItem(key: string): Promise<void> {
  if (SecureStore) {
    await SecureStore.deleteItemAsync(key);
  } else {
    localStorage.removeItem(key);
  }
}

// ----------------------------------------------------------------
// Typed accessors
// ----------------------------------------------------------------

export const storage = {
  async getHaToken(): Promise<string | null> {
    return getItem(KEYS.haToken);
  },
  async setHaToken(token: string): Promise<void> {
    await setItem(KEYS.haToken, token);
  },

  async getHaBaseURL(): Promise<string | null> {
    return getItem(KEYS.haBaseURL);
  },
  async setHaBaseURL(url: string): Promise<void> {
    await setItem(KEYS.haBaseURL, url);
  },

  async getBoundTarget(): Promise<VolumeTargetDescriptor | null> {
    const raw = await getItem(KEYS.boundTarget);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
  async setBoundTarget(descriptor: VolumeTargetDescriptor): Promise<void> {
    await setItem(KEYS.boundTarget, JSON.stringify(descriptor));
  },
  async clearBoundTarget(): Promise<void> {
    await removeItem(KEYS.boundTarget);
  },

  async getLastConfirmedVolume(): Promise<number> {
    const raw = await getItem(KEYS.lastConfirmedVolume);
    return raw ? parseInt(raw, 10) || 0 : 0;
  },
  async setLastConfirmedVolume(value: number): Promise<void> {
    await setItem(KEYS.lastConfirmedVolume, String(value));
  },
};
