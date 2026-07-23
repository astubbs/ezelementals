import { HomeAssistantTarget } from '../lib/volume-target';
import type { ConnectionState, VolumeTargetDescriptor } from '../types';

/** Minimal WebSocket stub we can drive from tests. */
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState = MockWebSocket.OPEN;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({} as CloseEvent);
  }

  // Test helpers
  fireOpen() {
    this.onopen?.({} as Event);
  }

  fireMessage(data: unknown) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    this.onmessage?.({ data: payload } as MessageEvent);
  }
}

function makeDescriptor(): VolumeTargetDescriptor {
  return {
    type: 'homeAssistant',
    haBaseURL: 'http://ha.local:8123',
    entityId: 'media_player.denon',
  };
}

describe('HomeAssistantTarget', () => {
  const originalWebSocket = globalThis.WebSocket;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    MockWebSocket.instances = [];
    // @ts-expect-error test shim
    globalThis.WebSocket = MockWebSocket;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    } as Response);
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
    globalThis.fetch = originalFetch;
  });

  it('uses a 0..100 volume range by default', () => {
    const t = new HomeAssistantTarget(makeDescriptor());
    expect(t.range).toEqual({ min: 0, max: 100 });
  });

  describe('setVolume', () => {
    it('posts volume_level = intent/100 to the HA service endpoint', async () => {
      const t = new HomeAssistantTarget(makeDescriptor());
      t.setToken('fake-token');
      t.setVolume(42);

      // Let the async fetch resolve.
      await new Promise((r) => setImmediate(r));

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('http://ha.local:8123/api/services/media_player/volume_set');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toEqual({
        entity_id: 'media_player.denon',
        volume_level: 0.42,
      });
      expect(init.headers.Authorization).toBe('Bearer fake-token');
    });

    it('sends volume_level above 1.0 when intent exceeds range max', async () => {
      const t = new HomeAssistantTarget(makeDescriptor());
      t.setToken('tok');

      // The target does NOT clamp (the hook does). Verify that an
      // out-of-range intent produces an out-of-range volume_level
      // so the caller knows clamping must happen upstream.
      t.setVolume(150);
      await new Promise((r) => setImmediate(r));
      const body = JSON.parse(((globalThis.fetch as jest.Mock).mock.calls[0][1]).body);
      expect(body.volume_level).toBe(1.5);
    });
  });

  describe('WebSocket handshake + events', () => {
    it('sends the auth message on socket open', () => {
      const t = new HomeAssistantTarget(makeDescriptor());
      t.setToken('my-token');
      t.connect();

      const ws = MockWebSocket.instances[0];
      expect(ws.url).toBe('ws://ha.local:8123/api/websocket');

      ws.fireOpen();
      expect(ws.sent).toHaveLength(1);
      expect(JSON.parse(ws.sent[0])).toEqual({
        type: 'auth',
        access_token: 'my-token',
      });
    });

    it('subscribes to state_changed after auth_ok', () => {
      const t = new HomeAssistantTarget(makeDescriptor());
      t.setToken('tok');
      t.connect();

      const ws = MockWebSocket.instances[0];
      ws.fireOpen();
      ws.fireMessage({ type: 'auth_ok' });

      expect(ws.sent).toHaveLength(2);
      expect(JSON.parse(ws.sent[1])).toMatchObject({
        type: 'subscribe_events',
        event_type: 'state_changed',
      });
    });

    it('reports an error on auth_invalid', () => {
      const states: ConnectionState[] = [];
      const t = new HomeAssistantTarget(makeDescriptor());
      t.onConnectionChange((s) => states.push(s));
      t.setToken('bad');
      t.connect();

      const ws = MockWebSocket.instances[0];
      ws.fireOpen();
      ws.fireMessage({ type: 'auth_invalid', message: 'Invalid password' });

      expect(states.some((s) => s.status === 'error')).toBe(true);
    });

    it('fires confirmed for state_changed on the bound entity', () => {
      const confirmed: number[] = [];
      const t = new HomeAssistantTarget(makeDescriptor());
      t.onConfirmed((v) => confirmed.push(v));
      t.setToken('tok');
      t.connect();

      const ws = MockWebSocket.instances[0];
      ws.fireOpen();
      ws.fireMessage({ type: 'auth_ok' });
      ws.fireMessage({
        type: 'event',
        event: {
          event_type: 'state_changed',
          data: {
            entity_id: 'media_player.denon',
            new_state: { attributes: { volume_level: 0.37 } },
          },
        },
      });

      expect(confirmed).toEqual([37]);
    });

    it('ignores state_changed for a different entity', () => {
      const confirmed: number[] = [];
      const t = new HomeAssistantTarget(makeDescriptor());
      t.onConfirmed((v) => confirmed.push(v));
      t.setToken('tok');
      t.connect();

      const ws = MockWebSocket.instances[0];
      ws.fireOpen();
      ws.fireMessage({ type: 'auth_ok' });
      ws.fireMessage({
        type: 'event',
        event: {
          event_type: 'state_changed',
          data: {
            entity_id: 'media_player.kitchen',
            new_state: { attributes: { volume_level: 0.9 } },
          },
        },
      });

      expect(confirmed).toEqual([]);
    });

    it('does not crash on malformed JSON', () => {
      const t = new HomeAssistantTarget(makeDescriptor());
      t.setToken('tok');
      t.connect();

      const ws = MockWebSocket.instances[0];
      ws.fireOpen();
      // Passes a non-JSON string through onmessage.
      expect(() => ws.fireMessage('not json at all')).not.toThrow();
    });
  });
});
