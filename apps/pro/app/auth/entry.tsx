import { View, Text, Pressable, StyleSheet, Image, Linking } from 'react-native';
import { router } from 'expo-router';
import { SocialAuthButtons } from '@beautygo/shared';
export default function EntryScreen() {
  return (
    <View style={styles.container}>

      {/* Верхний блок: заголовок */}
      <View style={styles.header}>
        <Text style={styles.title}>Добро пожаловать!</Text>
        <Text style={styles.subtitle}>
          Создайте новый аккаунт или войдите{'\n'}в уже существующий
        </Text>
      </View>

      {/* Логотип по центру */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Нижний блок: кнопки + условия */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.authButton, pressed && styles.authButtonPressed]}
          onPress={() => router.push('/auth/phone')}
        >
          <Text style={styles.authButtonText}>Авторизация</Text>
        </Pressable>

        <Pressable
          style={styles.registerButton}
          onPress={() => router.push('/auth/phone')}
        >
          <Text style={styles.registerButtonText}>Регистрация</Text>
        </Pressable>

        <SocialAuthButtons />

        <Text style={styles.terms}>
          Использование приложения означает ваше{' '}
          <Text
            style={styles.termsLink}
            onPress={() => Linking.openURL('https://gobeauty.site/terms')}
          >
            Согласие с условиями
          </Text>
          , регулирующими порядок предоставления услуг и обработку персональной информации.
        </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  header: {
    paddingTop: 88,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'NTSomic-Regular',
    color: '#1A1A1E',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'NTSomic-Regular',
    color: '#7A7286',
    textAlign: 'center',
    lineHeight: 22,
  },

  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
  authButton: {
    height: 56,
    borderRadius: 30,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authButtonPressed: {
    backgroundColor: '#F3F4F6',
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'NTSomic-Regular',
    color: '#1A1A1E',
  },
  registerButton: {
    height: 56,
    borderRadius: 30,
    backgroundColor: '#2D2D2D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'NTSomic-Regular',
    color: '#fff',
  },
  terms: {
    fontSize: 12,
    fontFamily: 'NTSomic-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  termsLink: {
    fontFamily: 'NTSomic-Regular',
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
});
