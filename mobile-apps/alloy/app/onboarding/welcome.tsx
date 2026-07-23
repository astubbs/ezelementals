import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.spacer} />
      <Text style={styles.title}>Alloy</Text>
      <Text style={styles.subtitle}>Let&apos;s find your AV receiver.</Text>
      <View style={styles.spacer} />
      <Pressable
        onPress={() => router.push('/onboarding/ha-connect')}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Get started</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  spacer: { flex: 1 },
  title: { fontSize: 56, fontWeight: 'bold' },
  subtitle: { fontSize: 18, color: '#8E8E93', marginTop: 12 },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    marginBottom: 32,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
