import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { initializeApiClient, AuthProvider, useAuth } from '@beautygo/shared';

// Инициализируем API клиент с X-App-Type: client
initializeApiClient('client');

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({});

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { status } = useAuth();

  if (status === 'loading') return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth/phone" />
      <Stack.Screen name="auth/otp" />
      <Stack.Screen name="auth/onboarding" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
