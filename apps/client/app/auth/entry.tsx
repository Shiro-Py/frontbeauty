import { View, Text, Pressable, StyleSheet, Image, Linking, Platform } from 'react-native';
import { router } from 'expo-router';
import { useVKAuth, useGoogleAuth, useAppleAuth } from '@beautygo/shared';

// ─── Social button ─────────────────────────────────────────────────────────────

function SocialBtn({
  onPress, disabled, icon, label,
}: { onPress: () => void; disabled: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Pressable
      style={({ pressed }) => [S.socialBtn, disabled && S.socialBtnDisabled, pressed && !disabled && S.socialBtnPressed]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={S.socialIcon}>{icon}</View>
      <Text style={S.socialLabel}>{label}</Text>
    </Pressable>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function EntryScreen() {
  const vk     = useVKAuth();
  const google = useGoogleAuth();
  const apple  = useAppleAuth();
  const anyLoading = vk.loading || google.loading || apple.loading;

  const error = vk.error || google.error || apple.error;

  return (
    <View style={S.container}>

      {/* Логотип */}
      <View style={S.logoWrap}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={S.logo}
          resizeMode="contain"
        />
      </View>

      {/* Заголовок */}
      <View style={S.titleWrap}>
        <Text style={S.title}>Добро пожаловать!</Text>
        <Text style={S.subtitle}>Создайте новый аккаунт или войдите{'\n'}в уже существующий</Text>
      </View>

      {/* Кнопки */}
      <View style={S.footer}>

        <Pressable
          style={S.btnOutline}
          onPress={() => router.push({ pathname: '/auth/phone', params: { mode: 'login' } })}
        >
          <Text style={S.btnOutlineText}>Авторизация</Text>
        </Pressable>

        <Pressable
          style={S.btnFill}
          onPress={() => router.push({ pathname: '/auth/phone', params: { mode: 'register' } })}
        >
          <Text style={S.btnFillText}>Регистрация</Text>
        </Pressable>

        <Text style={S.or}>ИЛИ</Text>

        {/* Google */}
        <SocialBtn
          label="Войти с Google"
          disabled={!google.ready || anyLoading}
          onPress={google.signInWithGoogle}
          icon={
            <Text style={S.googleIcon}>
              <Text style={{ color: '#4285F4' }}>G</Text>
              <Text style={{ color: '#EA4335' }}>o</Text>
              <Text style={{ color: '#FBBC05' }}>o</Text>
              <Text style={{ color: '#4285F4' }}>g</Text>
              <Text style={{ color: '#34A853' }}>l</Text>
              <Text style={{ color: '#EA4335' }}>e</Text>
            </Text>
          }
        />

        {/* Apple — только iOS */}
        {Platform.OS === 'ios' && (
          <SocialBtn
            label="Войти с Apple"
            disabled={!apple.available || anyLoading}
            onPress={apple.signInWithApple}
            icon={<Text style={S.appleIcon}></Text>}
          />
        )}

        {/* VK */}
        <SocialBtn
          label="Войти с VKID"
          disabled={!vk.ready || anyLoading}
          onPress={vk.signInWithVK}
          icon={<Text style={S.vkIcon}>VK</Text>}
        />

        {error && <Text style={S.error}>{error}</Text>}

        <Text style={S.terms}>
          Использование приложения означает ваше{' '}
          <Text style={S.termsLink} onPress={() => Linking.openURL('https://gobeauty.site/terms')}>
            Согласие с условиями
          </Text>
          , регулирующими порядок предоставления услуг и обработку персональной информации.
        </Text>

      </View>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  logoWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 120, height: 120 },

  titleWrap: { alignItems: 'center', paddingHorizontal: 32, marginBottom: 32 },
  title: { fontSize: 26, fontWeight: '700', color: '#1A1A1A', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },

  footer: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },

  btnOutline: {
    height: 52, borderRadius: 999, borderWidth: 1, borderColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
  },
  btnOutlineText: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },

  btnFill: {
    height: 52, borderRadius: 999, backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
  },
  btnFillText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  or: { textAlign: 'center', fontSize: 14, color: '#6B7280', marginVertical: 2 },

  socialBtn: {
    height: 52, borderRadius: 999, borderWidth: 1, borderColor: '#E5E5E5',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12,
  },
  socialBtnDisabled: { opacity: 0.45 },
  socialBtnPressed: { backgroundColor: '#F5F5F5' },
  socialIcon: { width: 24, alignItems: 'center' },
  socialLabel: { flex: 1, fontSize: 15, color: '#1A1A1A', fontWeight: '500' },

  googleIcon: { fontSize: 15, fontWeight: '700' },
  appleIcon: { fontSize: 18, color: '#1A1A1A' },
  vkIcon: { fontSize: 13, fontWeight: '800', color: '#0077FF' },

  error: { fontSize: 13, color: '#E53935', textAlign: 'center' },

  terms: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16, marginTop: 4 },
  termsLink: { color: '#6B7280', textDecorationLine: 'underline' },
});
