import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Image, ScrollView, Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { updateClientProfile, useAuth, tokenStorage } from '@beautygo/shared';

const TOTAL_STEPS = 4; // 1: профиль, 2: аватар, 3: геолокация, 4: успех

export default function OnboardingScreen() {
  const { signIn } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Шаг 1 — профиль
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);

  // Шаг 2 — аватар
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Шаг 3 — геолокация
  const [locationDenied, setLocationDenied] = useState(false);
  const [city, setCity] = useState('');

  const firstNameValid = firstName.trim().length >= 2;
  const lastNameValid = lastName.trim().length >= 2;
  const emailValid = email.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const step1Valid = firstNameValid && lastNameValid && agreed;

  const initials = [firstName.trim()[0], lastName.trim()[0]].filter(Boolean).join('').toUpperCase();

  const pickImage = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Нет доступа', fromCamera ? 'Разрешите доступ к камере' : 'Разрешите доступ к галерее');
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const handleRequestLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        await handleFinish({ locationGranted: true });
      } else {
        setLocationDenied(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async ({ locationGranted = false } = {}) => {
    setLoading(true);
    try {
      await updateClientProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        ...(email.trim() && { email: email.trim() }),
        ...(city.trim() && { city: city.trim() }),
        ...(avatarUri && { avatar: { uri: avatarUri, name: 'avatar.jpg', type: 'image/jpeg' } }),
      });
    } catch {
      // Профиль обновим позже — не блокируем
    }
    setLoading(false);
    setStep(4); // → экран успеха
  };

  const handleSuccess = async () => {
    try {
      const access = await tokenStorage.getAccess();
      const refresh = await tokenStorage.getRefresh();
      if (access && refresh) await signIn(access, refresh, false);
    } catch {
      Alert.alert('Ошибка', 'Не удалось завершить регистрацию. Попробуйте ещё раз.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Прогресс — не показываем на экране успеха */}
        {step < 4 && (
          <View style={styles.progressRow}>
            {Array.from({ length: TOTAL_STEPS - 1 }, (_, i) => (
              <View key={i} style={[styles.progressSegment, i < step && styles.progressSegmentActive]} />
            ))}
          </View>
        )}

        {/* ── Шаг 1: Профиль ── */}
        {step === 1 && (
          <View style={styles.content}>
            <Text style={styles.title}>Расскажите о себе</Text>
            <Text style={styles.subtitle}>Мастера будут видеть ваше имя при записи</Text>

            <TextInput
              style={[styles.input, firstName.length > 0 && (firstNameValid ? styles.inputValid : styles.inputError)]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Имя"
              placeholderTextColor="#B0A8B9"
              autoFocus
              autoCapitalize="words"
            />
            {firstName.length > 0 && !firstNameValid && (
              <Text style={styles.errorText}>Минимум 2 символа</Text>
            )}

            <TextInput
              style={[styles.input, lastName.length > 0 && (lastNameValid ? styles.inputValid : styles.inputError)]}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Фамилия"
              placeholderTextColor="#B0A8B9"
              autoCapitalize="words"
            />
            {lastName.length > 0 && !lastNameValid && (
              <Text style={styles.errorText}>Минимум 2 символа</Text>
            )}

            <TextInput
              style={[styles.input, email.length > 0 && (emailValid ? styles.inputValid : styles.inputError)]}
              value={email}
              onChangeText={setEmail}
              placeholder="Email (необязательно)"
              placeholderTextColor="#B0A8B9"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            {email.length > 0 && !emailValid && (
              <Text style={styles.errorText}>Введите корректный email</Text>
            )}

            {/* Чекбокс соглашения */}
            <Pressable style={styles.checkRow} onPress={() => setAgreed(v => !v)}>
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.checkLabel}>
                Соглашаюсь с{' '}
                <Text
                  style={styles.checkLink}
                  onPress={() => Linking.openURL('https://gobeauty.site/terms')}
                >
                  правилами сервиса
                </Text>
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, !step1Valid && styles.buttonDisabled]}
              onPress={() => setStep(2)}
              disabled={!step1Valid}
            >
              <Text style={styles.buttonText}>Продолжить</Text>
            </Pressable>
          </View>
        )}

        {/* ── Шаг 2: Аватар ── */}
        {step === 2 && (
          <View style={styles.content}>
            <Text style={styles.title}>Добавьте фото</Text>
            <Text style={styles.subtitle}>Помогите мастерам узнать вас</Text>

            <View style={styles.avatarWrapper}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{initials || '?'}</Text>
                </View>
              )}
            </View>

            <Pressable style={styles.outlineButton} onPress={() => pickImage(false)}>
              <Text style={styles.outlineButtonText}>Выбрать из галереи</Text>
            </Pressable>
            <Pressable style={[styles.outlineButton, { marginTop: 12 }]} onPress={() => pickImage(true)}>
              <Text style={styles.outlineButtonText}>Сделать фото</Text>
            </Pressable>

            <Pressable style={[styles.button, { marginTop: 24 }]} onPress={() => setStep(3)}>
              <Text style={styles.buttonText}>{avatarUri ? 'Продолжить' : 'Пропустить'}</Text>
            </Pressable>
          </View>
        )}

        {/* ── Шаг 3: Геолокация ── */}
        {step === 3 && (
          <View style={styles.content}>
            <Text style={styles.title}>Где вы находитесь?</Text>
            <Text style={styles.subtitle}>
              Используем геолокацию чтобы показывать ближайших мастеров
            </Text>

            {!locationDenied ? (
              <Pressable
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRequestLocation}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.buttonText}>Разрешить геолокацию</Text>
                }
              </Pressable>
            ) : (
              <>
                <Text style={styles.deniedHint}>Введите город вручную</Text>
                <TextInput
                  style={[styles.input, city.trim().length >= 2 && styles.inputValid]}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Например: Москва"
                  placeholderTextColor="#B0A8B9"
                  autoFocus
                  autoCapitalize="words"
                />
                <Pressable
                  style={[styles.button, (city.trim().length < 2 || loading) && styles.buttonDisabled]}
                  onPress={() => handleFinish()}
                  disabled={city.trim().length < 2 || loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.buttonText}>Завершить регистрацию</Text>
                  }
                </Pressable>
              </>
            )}

            <Pressable style={styles.skipButton} onPress={() => handleFinish()} disabled={loading}>
              <Text style={styles.skipText}>Пропустить</Text>
            </Pressable>
          </View>
        )}

        {/* ── Шаг 4: Успех ── */}
        {step === 4 && (
          <View style={styles.successContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={52} color="#fff" />
            </View>
            <Text style={styles.successTitle}>Регистрация завершена!</Text>
            <Text style={styles.successSubtitle}>
              Добро пожаловать в BeautyGO,{'\n'}
              <Text style={{ fontWeight: '700' }}>{firstName}</Text>
            </Text>
            <Pressable style={[styles.button, { marginTop: 40 }]} onPress={handleSuccess}>
              <Text style={styles.buttonText}>Понятно</Text>
            </Pressable>
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },

  progressRow: { flexDirection: 'row', gap: 6, marginBottom: 40 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#E2DCF0' },
  progressSegmentActive: { backgroundColor: '#7B61FF' },

  content: { flex: 1 },
  title: { fontSize: 26, fontWeight: '700', color: '#1A1628', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#7A7286', marginBottom: 32, lineHeight: 22 },

  input: {
    height: 56, borderWidth: 1.5, borderColor: '#E2DCF0', borderRadius: 14,
    paddingHorizontal: 16, fontSize: 16, color: '#1A1628',
    backgroundColor: '#FAFAFA', marginBottom: 8,
  },
  inputValid: { borderColor: '#7B61FF' },
  inputError: { borderColor: '#FF6B6B' },
  errorText: { fontSize: 12, color: '#FF6B6B', marginBottom: 8, marginLeft: 4 },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 24 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    borderColor: '#C8C2E8', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: { backgroundColor: '#7B61FF', borderColor: '#7B61FF' },
  checkLabel: { flex: 1, fontSize: 14, color: '#4A4358', lineHeight: 20 },
  checkLink: { color: '#7B61FF', textDecorationLine: 'underline' },

  button: {
    height: 56, backgroundColor: '#7B61FF', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: '#C4B8FF' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  outlineButton: {
    height: 56, borderWidth: 1.5, borderColor: '#7B61FF', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  outlineButtonText: { color: '#7B61FF', fontSize: 16, fontWeight: '600' },

  avatarWrapper: { alignItems: 'center', marginBottom: 32 },
  avatarImage: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#EDE9FF', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 40, fontWeight: '700', color: '#7B61FF' },

  deniedHint: { fontSize: 15, color: '#7A7286', marginBottom: 16 },
  skipButton: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  skipText: { fontSize: 14, color: '#B0A8B9' },

  // Успех
  successContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  successIcon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#22C55E', shadowOpacity: 0.35, shadowRadius: 20, elevation: 8,
  },
  successTitle: { fontSize: 26, fontWeight: '700', color: '#1A1628', marginBottom: 12 },
  successSubtitle: { fontSize: 16, color: '#7A7286', textAlign: 'center', lineHeight: 24 },
});
