import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettings } from '../../src/hooks/useSettings';

export default function SettingsScreen() {
  const settings = useSettings();
  const router = useRouter();

  const handleChangeTarget = async () => {
    if (Platform.OS === 'web') {
      if (confirm('Switch volume target? This will return to the setup wizard.')) {
        await settings.clear();
        router.replace('/onboarding/welcome');
      }
    } else {
      Alert.alert(
        'Change volume target',
        'This will return to the setup wizard.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Change',
            style: 'destructive',
            onPress: async () => {
              await settings.clear();
              router.replace('/onboarding/welcome');
            },
          },
        ],
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {settings.boundTarget && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Volume target</Text>
          <Text style={styles.value}>{settings.boundTarget.entityId}</Text>
          <Text style={styles.subtitle}>via Home Assistant</Text>
        </View>
      )}

      <Pressable onPress={handleChangeTarget} style={styles.button}>
        <Text style={styles.buttonText}>Change volume target</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 24 },
  title: { fontSize: 34, fontWeight: 'bold' },
  section: { gap: 4 },
  sectionTitle: { fontSize: 12, color: '#8E8E93', textTransform: 'uppercase' },
  value: { fontSize: 16 },
  subtitle: { fontSize: 12, color: '#8E8E93' },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  buttonText: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
});
