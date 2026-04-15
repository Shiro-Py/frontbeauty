import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { createMasterProfile } from '@ayla/shared';

const BIO_MAX = 300;

export default function OnboardingScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  const firstNameValid = firstName.trim().length >= 2;
  const lastNameValid = lastName.trim().length >= 2;
  const canContinue = firstNameValid && lastNameValid && avatarUri !== null && !loading;

  const initials = [firstName.trim()[0], lastName.trim()[0]].filter(Boolean).join('').toUpperCase();

  const pickImage = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      Alert.alert(
        'Нет доступа',
        fromCamera ? 'Разрешите доступ к камере в настройках' : 'Разрешите доступ к галерее в настройках',
      );
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleContinue = async () => {
    if (!canContinue || !avatarUri) return;
    setLoading(true);
    try {
      await createMasterProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        bio: bio.trim() || undefined,
        avatar: { uri: avatarUri, name: 'avatar.jpg', type: 'image/jpeg' },
      });
      router.push({
        pathname: '/auth/onboarding-step2' as any,
        params: { firstName: firstName.trim(), lastName: lastName.trim() },
      });
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      if (code === 'PROFILE_ALREADY_EXISTS') {
        // Профиль уже создан — переходим к шагу 2
        router.push({
          pathname: '/auth/onboarding-step2' as any,
          params: { firstName: firstName.trim(), lastName: lastName.trim() },
        });
      } else {
        Alert.alert('Ошибка', 'Не удалось сохранить профиль. Попробуйте ещё раз.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Прогресс */}
        <View style={styles.progressRow}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '50%' }]} />
          </View>
          <Text style={styles.progressText}>Шаг 1 из 2</Text>
        </View>

        <Text style={styles.title}>Профиль мастера</Text>
        <Text style={styles.subtitle}>Клиенты увидят эту информацию при выборе мастера</Text>

        {/* Фото профиля */}
        <Text style={styles.fieldLabel}>
          Фото профиля <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.avatarSection}>
          <Pressable onPress={() => pickImage(false)} style={styles.avatarTap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                {initials ? (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                ) : (
                  <Text style={styles.avatarIcon}>📷</Text>
                )}
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarBadgeText}>✏️</Text>
            </View>
          </Pressable>

          <View style={styles.avatarButtons}>
            <Pressable style={styles.photoButton} onPress={() => pickImage(false)}>
              <Text style={styles.photoButtonText}>Из галереи</Text>
            </Pressable>
            <Pressable style={styles.photoButton} onPress={() => pickImage(true)}>
              <Text style={styles.photoButtonText}>Сделать фото</Text>
            </Pressable>
          </View>
        </View>
        {!avatarUri && (
          <Text style={styles.requiredHint}>Фото профиля обязательно</Text>
        )}

        {/* Имя */}
        <Text style={styles.fieldLabel}>
          Имя <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, firstName.length > 0 && (firstNameValid ? styles.inputValid : styles.inputError)]}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Имя"
          placeholderTextColor="#8A80C0"
          autoCapitalize="words"
          returnKeyType="next"
        />
        {firstName.length > 0 && !firstNameValid && (
          <Text style={styles.errorText}>Минимум 2 символа</Text>
        )}

        {/* Фамилия */}
        <Text style={styles.fieldLabel}>
          Фамилия <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, lastName.length > 0 && (lastNameValid ? styles.inputValid : styles.inputError)]}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Фамилия"
          placeholderTextColor="#8A80C0"
          autoCapitalize="words"
          returnKeyType="next"
        />
        {lastName.length > 0 && !lastNameValid && (
          <Text style={styles.errorText}>Минимум 2 символа</Text>
        )}

        {/* Bio */}
        <View style={styles.bioHeader}>
          <Text style={styles.fieldLabel}>О себе</Text>
          <Text style={[styles.bioCounter, bio.length > BIO_MAX && styles.bioCounterOver]}>
            {bio.length}/{BIO_MAX}
          </Text>
        </View>
        <TextInput
          style={[styles.bioInput, bio.length > BIO_MAX && styles.inputError]}
          value={bio}
          onChangeText={(t) => setBio(t.slice(0, BIO_MAX))}
          placeholder="Расскажите о своём опыте, специализации..."
          placeholderTextColor="#8A80C0"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Кнопка Далее */}
        <Pressable
          style={[styles.button, !canContinue && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Далее</Text>
          }
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FF' },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },

  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 36, gap: 12 },
  progressBar: { flex: 1, height: 4, backgroundColor: '#C8C2E8', borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: '#4A3DB0', borderRadius: 2 },
  progressText: { fontSize: 13, color: '#7A7286', fontWeight: '600' },

  title: { fontSize: 26, fontWeight: '700', color: '#1A1628', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#7A7286', marginBottom: 28, lineHeight: 22 },

  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#1A1628', marginBottom: 8 },
  required: { color: '#FF6B6B' },
  requiredHint: { fontSize: 12, color: '#FF6B6B', marginBottom: 16, marginLeft: 2 },

  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 8 },
  avatarTap: { position: 'relative' },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#DDDAEE', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 30, fontWeight: '700', color: '#4A3DB0' },
  avatarIcon: { fontSize: 28 },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#4A3DB0', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#F8F7FF',
  },
  avatarBadgeText: { fontSize: 12 },

  avatarButtons: { flex: 1, gap: 8 },
  photoButton: {
    height: 40, borderWidth: 1.5, borderColor: '#4A3DB0', borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  photoButtonText: { color: '#4A3DB0', fontSize: 14, fontWeight: '500' },

  input: {
    height: 56, borderWidth: 1.5, borderColor: '#C8C2E8', borderRadius: 14,
    paddingHorizontal: 16, fontSize: 16, color: '#1A1628', backgroundColor: '#fff', marginBottom: 8,
  },
  inputValid: { borderColor: '#4A3DB0' },
  inputError: { borderColor: '#FF6B6B' },
  errorText: { fontSize: 12, color: '#FF6B6B', marginBottom: 12, marginLeft: 4 },

  bioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bioCounter: { fontSize: 12, color: '#B0A8B9' },
  bioCounterOver: { color: '#FF6B6B' },
  bioInput: {
    minHeight: 100, borderWidth: 1.5, borderColor: '#C8C2E8', borderRadius: 14,
    paddingHorizontal: 16, paddingTop: 14, fontSize: 15, color: '#1A1628',
    backgroundColor: '#fff', marginBottom: 24, lineHeight: 22,
  },

  button: {
    height: 56, backgroundColor: '#4A3DB0', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: '#9B92D0' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
