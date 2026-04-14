/**
 * Home Assistant connect screen. User enters their HA URL + long-lived
 * access token. We ping /api/ to verify, then advance to discovery.
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSettings } from '../../src/hooks/useSettings';
import * as ha from '../../src/lib/ha-client';

export default function HAConnectScreen() {
  const router = useRouter();
  const settings = useSettings();

  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setError(null);
    if (!url.trim() || !token.trim()) {
      setError('Enter a Home Assistant URL and long-lived access token.');
      return;
    }
    setLoading(true);
    try {
      const config: ha.HAConfig = { baseURL: url.trim(), token: token.trim() };
      const ok = await ha.ping(config);
      if (!ok) throw new Error('Home Assistant rejected the token.');
      await settings.saveHaConfig(url.trim(), token.trim());
      router.push('/onboarding/discovery');
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect Home Assistant</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Home Assistant URL</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="e.g. http://homeassistant.local:8123"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Long-lived access token</Text>
        <TextInput
          style={[styles.input, styles.tokenInput]}
          value={token}
          onChangeText={setToken}
          placeholder="Paste token from HA profile"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.hint}>
          In Home Assistant: profile → Long-Lived Access Tokens → Create.
        </Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable onPress={handleConnect} style={styles.button} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Connect</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  tokenInput: { fontFamily: 'monospace' },
  hint: { fontSize: 12, color: '#8E8E93' },
  error: { color: '#FF3B30', fontSize: 14 },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
