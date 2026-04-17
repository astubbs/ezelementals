/**
 * Canned mock data matching the api.ts type definitions.
 * Used by smoke tests to provide realistic API responses.
 */

import type {
  LibraryRoot,
  LibraryFileEntry,
  LibraryDirEntry,
  FxEntry,
  TimelineFrameRecord,
  DeviceConfig,
  Settings,
} from '../../lib/api'

export const mockFileEntry: LibraryFileEntry = {
  type: 'file',
  name: 'fury-road.mkv',
  path: '/media/fury-road.mkv',
  bundle_path: '/media/fury-road.bundle',
  fx_path: '/media/fury-road.3fx',
  timeline_path: '/media/fury-road.bundle/timeline.jsonl',
  status: 'bundled',
  flagged_count: 0,
  title: 'Mad Max: Fury Road',
  year: 2015,
  imdb_id: 'tt1392190',
}

export const mockFlaggedFileEntry: LibraryFileEntry = {
  ...mockFileEntry,
  name: 'dunkirk.mkv',
  path: '/media/dunkirk.mkv',
  bundle_path: '/media/dunkirk.bundle',
  fx_path: '/media/dunkirk.3fx',
  timeline_path: '/media/dunkirk.bundle/timeline.jsonl',
  status: 'bundled_flagged',
  flagged_count: 5,
  title: 'Dunkirk',
  year: 2017,
  imdb_id: 'tt5013056',
}

export const mockLibraryRoots: { roots: LibraryRoot[] } = {
  roots: [{
    root: '/media',
    entries: [
      mockFileEntry,
      mockFlaggedFileEntry,
      { type: 'file', name: 'new-movie.mkv', path: '/media/new-movie.mkv', bundle_path: null, fx_path: null, timeline_path: null, status: 'not_encoded', flagged_count: 0, title: '', year: 0, imdb_id: '' },
    ],
  }],
}

export const mockFxEntries: FxEntry[] = [
  { t: 0, wind: 0, water: 0, heat_ambient: 0, heat_radiant: 0 },
  { t: 10, wind: 2, water: 0, heat_ambient: 1, heat_radiant: 0 },
  { t: 20, wind: 3, water: 1, heat_ambient: 0, heat_radiant: 3, flagged: true },
  { t: 30, wind: 1, water: 0, heat_ambient: 0, heat_radiant: 0 },
]

export const mockTimelineFrames: TimelineFrameRecord[] = [
  { t: 0, frame_idx: 0, description: 'Desert landscape, clear sky', audio: 'Wind gusts, low rumble', scene_type: 'exterior_desert', motion: 'low', wind: 1, wind_direction: 'frontal', water: 0, water_type: 'none', heat_ambient: 2, heat_radiant: 0, confidence: 0.92 },
  { t: 10, frame_idx: 5, description: 'Sandstorm approaches, vehicles speeding', audio: 'Engine roar, sand hitting metal', scene_type: 'exterior_desert', motion: 'high', wind: 3, wind_direction: 'frontal', water: 0, water_type: 'none', heat_ambient: 2, heat_radiant: 0, confidence: 0.88 },
  { t: 20, frame_idx: 10, description: 'Explosion near vehicles', audio: 'Explosion, debris', scene_type: 'exterior_desert', motion: 'high', wind: 3, wind_direction: 'surround', water: 0, water_type: 'none', heat_ambient: 1, heat_radiant: 3, confidence: 0.55, flagged_for_review: true },
]

export const mockDevices: DeviceConfig[] = [
  { id: 'fan-front', type: 'fan', label: 'Front Fan', position: 'front-left', channel: 'wind', ha_entity: 'fan.living_room', latency_ms: 0, intensity_range: [0, 3] },
  { id: 'mister-1', type: 'mister', label: 'Ceiling Mister', position: 'ceiling', channel: 'water', ha_entity: 'switch.mister', latency_ms: 2500, intensity_range: [0, 3] },
  { id: 'heater-radiant', type: 'radiant_heater', label: 'Front Radiant', position: 'front-left', channel: 'heat_radiant', ha_entity: 'switch.radiant', latency_ms: 1500, intensity_range: [0, 3] },
]

export const mockSettings: Settings = {
  media_roots: ['/media'],
  ollama_instances: [{ url: 'http://localhost:11434', model: 'qwen2.5-vl:7b', role: 'any' }],
  ha: { base_url: 'http://homeassistant.local:8123', token: 'test-token', media_player_entity: 'media_player.living_room' },
  encoding_defaults: { fps: 0.5, confidence_threshold: 0.7, two_pass: false, stub_llm: false },
  ui: { theme: 'dark', notify_on_complete: true },
}

export const mockDirEntry: LibraryDirEntry = {
  type: 'dir',
  name: 'Action',
  path: '/media/Action',
  children: [mockFileEntry, mockFlaggedFileEntry],
}

export const mockLibraryRootsWithDir: { roots: LibraryRoot[] } = {
  roots: [{
    root: '/media',
    entries: [
      mockDirEntry,
      { type: 'file', name: 'new-movie.mkv', path: '/media/new-movie.mkv', bundle_path: null, fx_path: null, timeline_path: null, status: 'not_encoded', flagged_count: 0, title: '', year: 0, imdb_id: '' },
    ],
  }],
}

export const mockMultiFlaggedFxEntries: FxEntry[] = [
  { t: 0, wind: 0, water: 0, heat_ambient: 0, heat_radiant: 0 },
  { t: 10, wind: 2, water: 0, heat_ambient: 1, heat_radiant: 0, flagged: true },
  { t: 20, wind: 3, water: 1, heat_ambient: 0, heat_radiant: 3, flagged: true },
  { t: 30, wind: 1, water: 0, heat_ambient: 0, heat_radiant: 0 },
]

export const mockEmptySettings: Settings = {
  media_roots: [],
  ollama_instances: [],
  ha: { base_url: '', token: '', media_player_entity: '' },
  encoding_defaults: { fps: 0.5, confidence_threshold: 0.7, two_pass: false, stub_llm: false },
  ui: { theme: 'dark', notify_on_complete: false },
}
