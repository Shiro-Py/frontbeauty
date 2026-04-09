import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';

import { initializeApiClient, AuthProvider, useAuth, initAnonymousSession, setGateHandler } from '@beautygo/shared';
import GateBottomSheet, { GateTrigger } from '../components/GateBottomSheet';

// Инициализируем API клиент с X-App-Type: client
initializeApiClient('client');

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    initAnonymousSession().catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { status } = useAuth();

  const [gateVisible, setGateVisible] = useState(false);
  const [gateTrigger, setGateTrigger] = useState<GateTrigger>('booking');

  const handleGateRequired = useCallback((trigger: GateTrigger) => {
    setGateTrigger(trigger);
    setGateVisible(true);
  }, []);

  useEffect(() => {
    setGateHandler(handleGateRequired);
    return () => setGateHandler(null);
  }, [handleGateRequired]);

  return (
    <>
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
      </Stack>
      {status === 'loading' && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
          <ActivityIndicator size="large" color="#7B61FF" />
        </View>
      )}
      <GateBottomSheet
        visible={gateVisible}
        trigger={gateTrigger}
        onClose={() => setGateVisible(false)}
      />
    </>
  );
}
