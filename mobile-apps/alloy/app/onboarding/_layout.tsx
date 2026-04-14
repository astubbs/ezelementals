import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="ha-connect" />
      <Stack.Screen name="discovery" />
      <Stack.Screen name="target-picker" />
      <Stack.Screen name="test-connection" />
    </Stack>
  );
}
