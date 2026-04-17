import { filterAvrEntities, wsURL } from '../lib/ha-client';
import type { HAState } from '../types';

function haEntity(
  entity_id: string,
  attributes: HAState['attributes'] = {},
): HAState {
  return { entity_id, state: 'on', attributes };
}

describe('filterAvrEntities', () => {
  it('keeps media_player entities with device_class=receiver', () => {
    const states = [
      haEntity('media_player.random', { device_class: 'receiver' }),
      haEntity('light.random', { device_class: 'receiver' }),
    ];
    const got = filterAvrEntities(states);
    expect(got.map((s) => s.entity_id)).toEqual(['media_player.random']);
  });

  it('keeps media_player entities with a known vendor in the name', () => {
    const states = [
      haEntity('media_player.denon_avr_x3700h', { friendly_name: 'Denon AVR' }),
      haEntity('media_player.marantz_living', { friendly_name: 'Living Room' }),
      haEntity('media_player.yamaha_aventage'),
      haEntity('media_player.onkyo_receiver'),
      haEntity('media_player.pioneer_vsx'),
      haEntity('media_player.anthem_mrx'),
    ];
    const got = filterAvrEntities(states);
    expect(got).toHaveLength(6);
  });

  it('drops non-media_player entities even if they mention receiver', () => {
    const states = [
      haEntity('switch.denon_power'),
      haEntity('sensor.receiver_temp', { device_class: 'receiver' }),
    ];
    expect(filterAvrEntities(states)).toEqual([]);
  });

  it('drops unrelated media_player entities', () => {
    const states = [
      haEntity('media_player.chromecast_living_room'),
      haEntity('media_player.apple_tv_bedroom'),
      haEntity('media_player.spotify_alice'),
    ];
    expect(filterAvrEntities(states)).toEqual([]);
  });

  it('is case-insensitive when matching vendor names', () => {
    const states = [
      haEntity('media_player.DENON_main', { friendly_name: 'DENON Main' }),
    ];
    expect(filterAvrEntities(states)).toHaveLength(1);
  });
});

describe('wsURL', () => {
  it('converts http to ws', () => {
    const url = wsURL({ baseURL: 'http://homeassistant.local:8123', token: 't' });
    expect(url).toBe('ws://homeassistant.local:8123/api/websocket');
  });

  it('converts https to wss', () => {
    const url = wsURL({ baseURL: 'https://ha.example.com', token: 't' });
    expect(url).toBe('wss://ha.example.com/api/websocket');
  });

  it('handles a trailing slash on the base URL', () => {
    const url = wsURL({ baseURL: 'http://ha.local:8123/', token: 't' });
    expect(url).toBe('ws://ha.local:8123/api/websocket');
  });
});
