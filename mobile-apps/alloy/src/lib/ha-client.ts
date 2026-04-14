/**
 * Home Assistant REST client. Uses fetch() which is identical on
 * React Native and browsers — no platform-specific code.
 *
 * See mobile-apps/specs/home-assistant-api.md.
 */

import type { HAState } from '../types';

export interface HAConfig {
  baseURL: string; // e.g. "http://homeassistant.local:8123"
  token: string;   // long-lived access token
}

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/** GET /api/ — trivial token test. */
export async function ping(config: HAConfig): Promise<boolean> {
  const url = `${config.baseURL.replace(/\/$/, '')}/api/`;
  const res = await fetch(url, { headers: headers(config.token) });
  return res.ok;
}

/** GET /api/states — all entity states. */
export async function fetchStates(config: HAConfig): Promise<HAState[]> {
  const url = `${config.baseURL.replace(/\/$/, '')}/api/states`;
  const res = await fetch(url, { headers: headers(config.token) });
  if (!res.ok) throw new Error(`HA states request failed: ${res.status}`);
  return res.json();
}

/** POST /api/services/media_player/volume_set */
export async function setVolumeLevel(
  config: HAConfig,
  entityId: string,
  level: number, // 0.0–1.0
): Promise<void> {
  const url = `${config.baseURL.replace(/\/$/, '')}/api/services/media_player/volume_set`;
  const res = await fetch(url, {
    method: 'POST',
    headers: headers(config.token),
    body: JSON.stringify({ entity_id: entityId, volume_level: level }),
  });
  if (!res.ok) throw new Error(`HA volume_set failed: ${res.status}`);
}

/** Build the WebSocket URL from an HTTP base URL. */
export function wsURL(config: HAConfig): string {
  const base = config.baseURL.replace(/\/$/, '');
  if (base.startsWith('https://')) {
    return `wss://${base.slice('https://'.length)}/api/websocket`;
  }
  return `ws://${base.slice('http://'.length)}/api/websocket`;
}

/**
 * Filter /api/states for media_player entities that look like AV
 * receivers. Same heuristic as the native apps.
 */
export function filterAvrEntities(states: HAState[]): HAState[] {
  const vendors = ['denon', 'marantz', 'yamaha', 'onkyo', 'pioneer', 'anthem'];
  return states.filter((s) => {
    if (!s.entity_id.startsWith('media_player.')) return false;
    if (s.attributes?.device_class === 'receiver') return true;
    const haystack = `${s.entity_id} ${s.attributes?.friendly_name ?? ''}`.toLowerCase();
    return vendors.some((v) => haystack.includes(v));
  });
}
