import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DiscoveredAvr } from '../types';

interface Props {
  avr: DiscoveredAvr;
  onPress: () => void;
}

export function AvrRow({ avr, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Text style={styles.name}>{avr.friendlyName}</Text>
      <View style={styles.meta}>
        <Text style={styles.source}>via Home Assistant</Text>
        {avr.modelName && <Text style={styles.dot}> · </Text>}
        {avr.modelName && <Text style={styles.source}>{avr.modelName}</Text>}
        <Text style={styles.dot}> · </Text>
        <Text style={styles.source}>{avr.entityId}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e0e0e0' },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { flexDirection: 'row', marginTop: 4 },
  source: { fontSize: 12, color: '#8E8E93' },
  dot: { fontSize: 12, color: '#8E8E93' },
});
