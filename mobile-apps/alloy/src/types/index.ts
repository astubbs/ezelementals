/** Source channel that discovered an AVR. */
export type AvrSource = 'homeAssistant';
// 'denonDirect' is deferred — browser can't do raw TCP.

/** A receiver discovered during onboarding. */
export interface DiscoveredAvr {
  id: string;
  friendlyName: string;
  modelName?: string;
  entityId: string; // HA entity_id, e.g. "media_player.denon"
  source: AvrSource;
}

/** Connection lifecycle. */
export type ConnectionState =
  | { status: 'disconnected' }
  | { status: 'connecting' }
  | { status: 'connected' }
  | { status: 'error'; message: string };

/** Valid range of integer volume values for a target. */
export interface VolumeRange {
  min: number;
  max: number;
}

/** Serializable description of a bound volume target. */
export interface VolumeTargetDescriptor {
  type: 'homeAssistant';
  haBaseURL: string;
  entityId: string;
}

/** HA entity state from /api/states. */
export interface HAState {
  entity_id: string;
  state: string;
  attributes?: {
    friendly_name?: string;
    device_class?: string;
    volume_level?: number;
    [key: string]: unknown;
  };
}

/** HA WebSocket message (simplified — we only parse what we need). */
export interface HAWebSocketMessage {
  type: string;
  event?: {
    event_type: string;
    data?: {
      entity_id?: string;
      new_state?: {
        attributes?: {
          volume_level?: number;
          [key: string]: unknown;
        };
      };
    };
  };
  // auth responses
  ha_version?: string;
  message?: string;
}
