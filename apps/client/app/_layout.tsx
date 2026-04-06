import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

import { initializeApiClient, AuthProvider, useAuth } from '@beautygo/shared';

// Инициализируем API клиент с X-App-Type: client
initializeApiClient('client');

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#7B61FF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth/entry" />
      <Stack.Screen name="auth/phone" />
      <Stack.Screen name="auth/otp" />
      <Stack.Screen name="auth/onboarding" />
      <Stack.Screen name="profile/[id]" />
      <Stack.Screen name="review/[id]" />
      <Stack.Screen name="booking/slots" />
      <Stack.Screen name="booking/summary" />
      <Stack.Screen name="booking/confirmation" />
      <Stack.Screen name="booking/[id]" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
