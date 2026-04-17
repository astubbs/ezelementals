/**
 * Custom volume slider that works on web + native.
 *
 * Uses React Native's PanResponder for drag tracking. The thumb
 * position updates at 60fps via requestAnimationFrame. This is the
 * canonical control from the UX principles — every other draggable
 * control in the app should follow the same pattern.
 *
 * The slider reports three events matching the spec:
 * - onDragStart
 * - onDragChange(value: number)
 * - onDragEnd
 */

import { useCallback, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';

interface Props {
  value: number;
  min: number;
  max: number;
  onDragStart: () => void;
  onDragChange: (value: number) => void;
  onDragEnd: () => void;
}

const THUMB_SIZE = 28;
const TRACK_HEIGHT = 6;

export function VolumeSlider({ value, min, max, onDragStart, onDragChange, onDragEnd }: Props) {
  const trackWidth = useRef(0);
  const [, forceRender] = useState(0);

  const valueToX = useCallback(
    (v: number) => {
      if (trackWidth.current <= 0 || max <= min) return 0;
      return ((v - min) / (max - min)) * trackWidth.current;
    },
    [min, max],
  );

  const xToValue = useCallback(
    (x: number) => {
      if (trackWidth.current <= 0 || max <= min) return min;
      const ratio = Math.max(0, Math.min(x / trackWidth.current, 1));
      return Math.round(min + ratio * (max - min));
    },
    [min, max],
  );

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        onDragStart();
        const x = evt.nativeEvent.locationX;
        onDragChange(xToValue(x));
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        onDragChange(xToValue(x));
      },
      onPanResponderRelease: () => {
        onDragEnd();
      },
      onPanResponderTerminate: () => {
        onDragEnd();
      },
    }),
  ).current;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
    forceRender((n) => n + 1);
  }, []);

  const thumbX = valueToX(value);
  const fillWidth = thumbX;

  return (
    <View style={styles.container} onLayout={onLayout} {...pan.panHandlers}>
      {/* Track background */}
      <View style={styles.track} />
      {/* Filled portion */}
      <View style={[styles.fill, { width: fillWidth }]} />
      {/* Thumb */}
      <View
        style={[
          styles.thumb,
          { transform: [{ translateX: thumbX - THUMB_SIZE / 2 }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: THUMB_SIZE + 16,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: TRACK_HEIGHT,
    backgroundColor: '#e0e0e0',
    borderRadius: TRACK_HEIGHT / 2,
  },
  fill: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    backgroundColor: '#007AFF',
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#007AFF',
    top: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
