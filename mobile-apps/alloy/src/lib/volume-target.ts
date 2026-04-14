/**
 * VolumeTarget interface + HA implementation.
 *
 * The hook `useVolumeTarget` consumes this interface — it does not
 * know whether it is talking to Home Assistant, a future Denon
 * proxy, or a mock. See mobile-apps/specs/volume-target.md.
 */

import type { ConnectionState, VolumeRange, VolumeTargetDescriptor } from '../types';
import * as ha from './ha-client';

export interface VolumeTarget {
  readonly range: VolumeRange;
  connect(): void;
  disconnect(): void;
  setVolume(intent: number): void;
  onConfirmed(cb: (value: number) => void): void;
  onConnectionChange(cb: (state: ConnectionState) => void): void;
}

// ----------------------------------------------------------------
// Home Assistant implementation
// ----------------------------------------------------------------

export class HomeAssistantTarget implements VolumeTarget {
  readonly range: VolumeRange = { min: 0, max: 100 };

  private config: ha.HAConfig;
  private entityId: string;
  private ws: WebSocket | null = null;
  private confirmedCb: ((v: number) => void) | null = null;
  private connectionCb: ((s: ConnectionState) => void) | null = null;

  constructor(descriptor: VolumeTargetDescriptor) {
    this.config = { baseURL: descriptor.haBaseURL, token: '' };
    this.entityId = descriptor.entityId;
  }

  /** Must be called with the token before connect(). */
  setToken(token: string) {
    this.config = { ...this.config, token };
  }

  connect() {
    this.connectionCb?.({ status: 'connecting' });
    this.connectWebSocket();
    this.fetchInitialVolume();
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
    this.connectionCb?.({ status: 'disconnected' });
  }

  setVolume(intent: number) {
    const level = intent / this.range.max;
    ha.setVolumeLevel(this.config, this.entityId, level).catch((e) => {
      this.connectionCb?.({ status: 'error', message: String(e) });
    });
  }

  onConfirmed(cb: (value: number) => void) { this.confirmedCb = cb; }
  onConnectionChange(cb: (state: ConnectionState) => void) { this.connectionCb = cb; }

  // -- private --

  private async fetchInitialVolume() {
    try {
      const states = await ha.fetchStates(this.config);
      const match = states.find((s) => s.entity_id === this.entityId);
      if (match?.attributes?.volume_level != null) {
        this.confirmedCb?.(this.levelToIntent(match.attributes.volume_level));
      }
      this.connectionCb?.({ status: 'connected' });
    } catch (e) {
      this.connectionCb?.({ status: 'error', message: String(e) });
    }
  }

  private connectWebSocket() {
    const url = ha.wsURL(this.config);
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', access_token: this.config.token }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'auth_ok') {
          ws.send(JSON.stringify({
            id: 1,
            type: 'subscribe_events',
            event_type: 'state_changed',
          }));
          return;
        }
        if (msg.type === 'auth_invalid') {
          this.connectionCb?.({ status: 'error', message: 'HA rejected the token.' });
          return;
        }
        // state_changed event for our entity
        if (
          msg.type === 'event' &&
          msg.event?.event_type === 'state_changed' &&
          msg.event?.data?.entity_id === this.entityId
        ) {
          const level = msg.event.data.new_state?.attributes?.volume_level;
          if (level != null) {
            this.confirmedCb?.(this.levelToIntent(level));
          }
        }
      } catch { /* ignore parse errors */ }
    };

    ws.onerror = () => {
      this.connectionCb?.({ status: 'error', message: 'WebSocket error' });
    };

    ws.onclose = () => {
      this.connectionCb?.({ status: 'disconnected' });
      // Reconnect after a delay.
      setTimeout(() => {
        if (this.ws === ws) this.connectWebSocket();
      }, 3000);
    };
  }

  private levelToIntent(level: number): number {
    return Math.round(level * this.range.max);
  }
}

// ----------------------------------------------------------------
// Factory
// ----------------------------------------------------------------

export function createTarget(descriptor: VolumeTargetDescriptor): VolumeTarget {
  return new HomeAssistantTarget(descriptor);
}
