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
          Записывайтесь к мастерам красоты{'\n'}рядом с вами
        </Text>
      </View>

      {/* Логотип по центру */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Нижний блок: кнопки + условия */}
      <View style={styles.footer}>
        <Pressable
          style={styles.registerButton}
          onPress={() => router.push({ pathname: '/auth/phone', params: { mode: 'register' } })}
        >
          <Text style={styles.registerButtonText}>Регистрация</Text>
        </Pressable>

        <Pressable
          style={styles.authButton}
          onPress={() => router.push({ pathname: '/auth/phone', params: { mode: 'login' } })}
        >
          <Text style={styles.authButtonText}>Войти по номеру телефона</Text>
        </Pressable>

        <SocialAuthButtons accentColor="#7B61FF" />

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
    color: '#1A1628',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
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
    width: 168,
    height: 168,
  },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
  authButton: {
    height: 56,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#7B61FF',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7B61FF',
  },
  registerButton: {
    height: 56,
    borderRadius: 30,
    backgroundColor: '#7B61FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  terms: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  termsLink: {
    color: '#7B61FF',
    textDecorationLine: 'underline',
  },
});
