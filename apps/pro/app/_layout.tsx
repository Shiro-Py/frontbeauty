import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

import { initializeApiClient, AuthProvider, useAuth } from '@beautygo/shared';

// Инициализируем API клиент с X-App-Type: pro
initializeApiClient('pro');

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded] = useFonts({
    'NTSomic-Regular': require('../assets/fonts/NTSomic-Regular.ttf'),
  });

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <RootLayoutNav fontsLoaded={loaded} />
    </AuthProvider>
  );
}

function RootLayoutNav({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { status } = useAuth();

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/entry" />
        <Stack.Screen name="auth/phone" />
        <Stack.Screen name="auth/otp" />
        <Stack.Screen name="auth/onboarding" />
        <Stack.Screen name="auth/onboarding-step2" />
        <Stack.Screen name="auth/forgot-password" />
      </Stack>
      {(!fontsLoaded || status === 'loading') && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
          <ActivityIndicator size="large" color="#7B61FF" />
        </View>
      )}
    </>
  );
}
