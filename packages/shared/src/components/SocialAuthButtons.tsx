import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useVKAuth, useGoogleAuth, useAppleAuth, useYandexAuth } from '../auth/socialAuth';

interface Props {
  /** Цвет акцента (обводка кнопок и текст иконки). По умолчанию #1C1C1E */
  accentColor?: string;
}

export function SocialAuthButtons({ accentColor = '#1C1C1E' }: Props) {
  const vk = useVKAuth();
  const google = useGoogleAuth();
  const apple = useAppleAuth();
  const yandex = useYandexAuth();

  const anyError = vk.error || google.error || apple.error || yandex.error;
  const anyLoading = vk.loading || google.loading || apple.loading || yandex.loading;

  return (
    <View style={styles.container}>

      {/* Разделитель */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={[styles.dividerText, { color: '#9CA3AF' }]}>или войти через</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Кнопки */}
      <View style={styles.row}>

        <SocialButton
          label="VK"
          icon="ВК"
          color="#0077FF"
          onPress={vk.signInWithVK}
          loading={vk.loading}
          disabled={!vk.ready || anyLoading}
        />

        <SocialButton
          label="Google"
          icon="G"
          color="#EA4335"
          onPress={google.signInWithGoogle}
          loading={google.loading}
          disabled={!google.ready || anyLoading}
        />

        {/* Apple — только iOS */}
        {Platform.OS === 'ios' && (
          <SocialButton
            label="Apple"
            icon=""
            color="#000"
            onPress={apple.signInWithApple}
            loading={apple.loading}
            disabled={!apple.available || anyLoading}
          />
        )}

        <SocialButton
          label="Яндекс"
          icon="Я"
          color="#FC3F1D"
          onPress={yandex.signInWithYandex}
          loading={yandex.loading}
          disabled={!yandex.ready || anyLoading}
        />

      </View>

      {anyError ? (
        <Text style={styles.errorText}>{anyError}</Text>
      ) : null}

    </View>
  );
}

interface SocialButtonProps {
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
  loading: boolean;
  disabled: boolean;
}

function SocialButton({ label, icon, color, onPress, loading, disabled }: SocialButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        { borderColor: color, opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Text style={[styles.btnIcon, { color }]}>{icon}</Text>
      )}
      <Text style={[styles.btnLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E5EA' },
  dividerText: { fontSize: 13 },

  row: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#fff',
  },
  btnIcon: {
    fontSize: 16,
    fontWeight: '700',
    width: 20,
    textAlign: 'center',
  },
  btnLabel: {
    fontSize: 13,
    fontWeight: '600',
  },

  errorText: {
    marginTop: 10,
    fontSize: 13,
    color: '#FF3B30',
    textAlign: 'center',
  },
});
