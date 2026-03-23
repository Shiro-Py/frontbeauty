import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMe, useAuth } from '@beautygo/shared';

interface UserProfile {
  id: string;
  phone: string;
  first_name?: string;
  last_name?: string;
  role: string;
}

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getMe();
        setProfile(data);
      } catch {
        // профиль не загружен
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLogout = () => {
    Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: signOut },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#7B61FF" /></View>;
  }

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarWrapper}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{fullName ? fullName[0].toUpperCase() : '?'}</Text>
        </View>
        {fullName
          ? <Text style={styles.name}>{fullName}</Text>
          : <Text style={styles.namePlaceholder}>Имя не указано</Text>
        }
        <Text style={styles.phone}>{profile?.phone}</Text>
      </View>
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#FF5C7A" />
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  avatarWrapper: { alignItems: 'center', marginBottom: 40 },
  avatar: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#EDE8FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#7B61FF' },
  name: { fontSize: 20, fontWeight: '700', color: '#1A1628', marginBottom: 4 },
  namePlaceholder: { fontSize: 16, color: '#B0A8B9', marginBottom: 4 },
  phone: { fontSize: 15, color: '#7A7286' },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 16, paddingHorizontal: 20, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#FFE0E6', backgroundColor: '#FFF5F7',
  },
  logoutText: { fontSize: 16, color: '#FF5C7A', fontWeight: '600' },
});
