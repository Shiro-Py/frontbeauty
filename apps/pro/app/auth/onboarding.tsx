import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { completeRegistration, useAuth, tokenStorage } from '@beautygo/shared';

export default function OnboardingScreen() {
  const { signIn } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = firstName.trim().length >= 2 && lastName.trim().length >= 2 && !loading;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await completeRegistration(firstName.trim(), lastName.trim());
      const access = await tokenStorage.getAccess();
      const refresh = await tokenStorage.getRefresh();
      if (access && refresh) await signIn(access, refresh, false);
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      if (code === 'ALREADY_REGISTERED') {
        const access = await tokenStorage.getAccess();
        const refresh = await tokenStorage.getRefresh();
        if (access && refresh) await signIn(access, refresh, false);
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
      <View style={styles.inner}>
        <Text style={styles.title}>Как вас зовут?</Text>
        <Text style={styles.subtitle}>Это имя будет отображаться в вашем профиле мастера</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Имя"
          placeholderTextColor="#8A80C0"
          autoFocus
          autoCapitalize="words"
          editable={!loading}
          returnKeyType="next"
        />
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Фамилия"
          placeholderTextColor="#8A80C0"
          autoCapitalize="words"
          editable={!loading}
          returnKeyType="done"
          onSubmitEditing={canSubmit ? handleSubmit : undefined}
        />
        <Pressable
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Продолжить</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FF' },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 80 },
  title: { fontSize: 26, fontWeight: '700', color: '#1A1628', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#7A7286', marginBottom: 40 },
  input: {
    height: 56, borderWidth: 1.5, borderColor: '#C8C2E8', borderRadius: 14,
    paddingHorizontal: 16, fontSize: 16, color: '#1A1628', backgroundColor: '#fff', marginBottom: 16,
  },
  button: {
    height: 56, backgroundColor: '#4A3DB0', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  buttonDisabled: { backgroundColor: '#9B92D0' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
