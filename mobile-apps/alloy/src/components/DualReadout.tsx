import { StyleSheet, Text, View } from 'react-native';

interface Props {
  intent: number;
  confirmed: number;
}

export function DualReadout({ intent, confirmed }: Props) {
  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.label}>Intent</Text>
        <Text style={styles.intentValue}>{intent}</Text>
      </View>
      <View>
        <Text style={styles.label}>Confirmed</Text>
        <Text style={styles.confirmedValue}>{confirmed}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 32,
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  intentValue: {
    fontSize: 56,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  confirmedValue: {
    fontSize: 56,
    fontVariant: ['tabular-nums'],
    color: '#888',
  },
});
