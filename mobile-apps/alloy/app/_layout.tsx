import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';

import { useSettings } from '../src/hooks/useSettings';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const settings = useSettings();

  useEffect(() => {
    if (settings.loaded) {
      SplashScreen.hideAsync();
    }
  }, [settings.loaded]);

  if (!settings.loaded) return null;

  // If no target is bound, show the onboarding wizard.
  // Otherwise, show the main tabs (volume + settings).
  const initialRoute = settings.boundTarget ? '(tabs)' : 'onboarding';

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}
