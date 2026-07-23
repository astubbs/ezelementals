import { StyleSheet, Text, View } from 'react-native';
import type { ConnectionState } from '../types';

interface Props {
  state: ConnectionState;
}

const colors: Record<ConnectionState['status'], string> = {
  connected: '#34C759',
  connecting: '#FFCC00',
  disconnected: '#8E8E93',
  error: '#FF3B30',
};

const labels: Record<ConnectionState['status'], string> = {
  connected: 'Connected',
  connecting: 'Connecting\u2026',
  disconnected: 'Disconnected',
  error: 'Error',
};

export function ConnectionBadge({ state }: Props) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: colors[state.status] }]} />
      <Text style={styles.label}>
        {state.status === 'error' ? state.message : labels[state.status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 12, color: '#8E8E93' },
});
