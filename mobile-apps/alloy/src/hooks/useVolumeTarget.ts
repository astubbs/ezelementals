/**
 * React hook wrapping VolumeTarget lifecycle.
 *
 * Implements the canonical UX principles from the spec:
 * - Optimistic intent/confirmed decoupling
 * - Throttled sends (~100ms) with trailing-edge flush on drag end
 * - Push-driven confirmed updates (never polling)
 *
 * See mobile-apps/specs/volume-control.md.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConnectionState, VolumeRange, VolumeTargetDescriptor } from '../types';
import { createTarget, HomeAssistantTarget, type VolumeTarget } from '../lib/volume-target';
import { Throttle } from '../lib/throttle';
import { storage } from '../lib/storage';

export interface VolumeState {
  intent: number;
  confirmed: number;
  connection: ConnectionState;
  range: VolumeRange;
  isDragging: boolean;
  onDragStart: () => void;
  onDragChange: (value: number) => void;
  onDragEnd: () => void;
}

export function useVolumeTarget(
  descriptor: VolumeTargetDescriptor,
  token: string | null,
): VolumeState {
  const [intent, setIntent] = useState(0);
  const [confirmed, setConfirmed] = useState(0);
  const [connection, setConnection] = useState<ConnectionState>({ status: 'disconnected' });
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const targetRef = useRef<VolumeTarget | null>(null);
  const throttleRef = useRef<Throttle | null>(null);

  // Build and connect the target.
  useEffect(() => {
    if (!token) return;

    const target = createTarget(descriptor);
    if (target instanceof HomeAssistantTarget) {
      target.setToken(token);
    }
    targetRef.current = target;

    target.onConfirmed((value) => {
      setConfirmed(value);
      if (!isDraggingRef.current) setIntent(value);
      storage.setLastConfirmedVolume(value);
    });
    target.onConnectionChange(setConnection);

    const throttle = new Throttle((v) => target.setVolume(v));
    throttleRef.current = throttle;

    target.connect();

    return () => {
      target.disconnect();
      throttle.dispose();
      targetRef.current = null;
      throttleRef.current = null;
    };
  }, [descriptor.entityId, descriptor.haBaseURL, token]);

  const onDragStart = useCallback(() => {
    isDraggingRef.current = true;
    setIsDragging(true);
  }, []);

  const onDragChange = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(value, targetRef.current?.range.max ?? 100));
    setIntent(clamped);
    throttleRef.current?.push(clamped);
  }, []);

  const onDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
    throttleRef.current?.flush();
  }, []);

  return {
    intent,
    confirmed,
    connection,
    range: targetRef.current?.range ?? { min: 0, max: 100 },
    isDragging,
    onDragStart,
    onDragChange,
    onDragEnd,
  };
}
