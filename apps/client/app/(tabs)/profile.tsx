import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator,
  Alert, ScrollView, TextInput, Image, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getMe, updateClientProfile, deleteAccount, useAuth, getPaymentHistory } from '@ayla/shared';
import type { UserProfile, PaymentHistoryItem } from '@ayla/shared';

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^7/, '').replace(/^8/, '');
  let r = '+7';
  if (digits.length > 0) r += ' (' + digits.slice(0, 3);
  if (digits.length >= 3) r += ') ' + digits.slice(3, 6);
  if (digits.length >= 6) r += '-' + digits.slice(6, 8);
  if (digits.length >= 8) r += '-' + digits.slice(8, 10);
  return r;
}

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // edit state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getMe();
        setProfile(data);
        setFirstName(data.first_name ?? '');
        setLastName(data.last_name ?? '');
        setCity(data.city ?? '');
      } catch {
        // профиль не загружен
      } finally {
        setLoading(false);
      }
      getPaymentHistory().then(setPaymentHistory).catch(() => {});
    })();
  }, []);

  const startEdit = () => setEditing(true);

  const cancelEdit = () => {
    setFirstName(profile?.first_name ?? '');
    setLastName(profile?.last_name ?? '');
    setCity(profile?.city ?? '');
    setAvatarUri(null);
    setEditing(false);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const payload: Parameters<typeof updateClientProfile>[0] = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        city: city.trim(),
      };
      if (avatarUri) {
        const name = avatarUri.split('/').pop() ?? 'avatar.jpg';
        const ext = name.split('.').pop() ?? 'jpg';
        payload.avatar = { uri: avatarUri, name, type: `image/${ext}` };
      }
      await updateClientProfile(payload);
      setProfile(prev => prev ? {
        ...prev,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        city: city.trim(),
        avatar_url: avatarUri ?? prev.avatar_url,
      } : prev);
      setEditing(false);
    } catch {
      Alert.alert('Ошибка', 'Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = async () => {
    if (!editing) return;
    Alert.alert('Фото профиля', 'Выберите источник', [
      {
        text: 'Камера',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Нет доступа', 'Разрешите доступ к камере в настройках');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled) setAvatarUri(result.assets[0].uri);
        },
      },
      {
        text: 'Галерея',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled) setAvatarUri(result.assets[0].uri);
        },
      },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'УДАЛИТЬ') return;
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      if (code === 'HAS_ACTIVE_BOOKINGS') {
        setDeleting(false);
        setDeleteModalVisible(false);
        Alert.alert(
          'Невозможно удалить',
          'У вас есть активные записи. Дождитесь их завершения или отмените.',
        );
        return;
      }
      // Сетевая ошибка — всё равно очищаем токены
    } finally {
      setDeleting(false);
      setDeleteModalVisible(false);
    }
    await signOut();
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#7B61FF" /></View>;
  }

  const displayAvatar = avatarUri ?? profile?.avatar_url ?? null;
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
  const initial = fullName ? fullName[0].toUpperCase() : '?';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Аватар */}
      <Pressable style={styles.avatarWrapper} onPress={pickAvatar}>
        {displayAvatar ? (
          <Image source={{ uri: displayAvatar }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        )}
        {editing && (
          <View style={styles.avatarBadge}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        )}
      </Pressable>

      {/* Имя */}
      {!editing ? (
        <View style={styles.infoBlock}>
          <Text style={styles.name}>{fullName || 'Имя не указано'}</Text>
          <Text style={styles.phone}>{formatPhone(profile?.phone ?? '')}</Text>
          {profile?.city ? (
            <View style={styles.cityRow}>
              <Ionicons name="location-outline" size={15} color="#7A7286" />
              <Text style={styles.cityText}>{profile.city}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.form}>
          <View style={styles.row}>
            <View style={[styles.inputWrap, { flex: 1 }]}>
              <Text style={styles.label}>Имя</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Имя"
                placeholderTextColor="#B0A8B9"
              />
            </View>
            <View style={[styles.inputWrap, { flex: 1 }]}>
              <Text style={styles.label}>Фамилия</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Фамилия"
                placeholderTextColor="#B0A8B9"
              />
            </View>
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Город</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="Город"
              placeholderTextColor="#B0A8B9"
            />
          </View>
        </View>
      )}

      {/* Кнопки действий */}
      {!editing ? (
        <Pressable testID="edit-profile-btn" style={styles.editButton} onPress={startEdit}>
          <Ionicons name="create-outline" size={18} color="#7B61FF" />
          <Text style={styles.editButtonText}>Редактировать</Text>
        </Pressable>
      ) : (
        <View style={styles.editActions}>
          <Pressable style={styles.cancelButton} onPress={cancelEdit}>
            <Text style={styles.cancelButtonText}>Отмена</Text>
          </Pressable>
          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={saveEdit}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.saveButtonText}>Сохранить</Text>
            }
          </Pressable>
        </View>
      )}

      {/* История платежей */}
      {paymentHistory.length > 0 && (
        <View style={styles.historySection}>
          <Pressable style={styles.historyHeader} onPress={() => setHistoryExpanded(e => !e)}>
            <View style={styles.historyTitleRow}>
              <Ionicons name="card-outline" size={18} color="#7B61FF" />
              <Text style={styles.historyTitle}>История платежей</Text>
            </View>
            <Ionicons
              name={historyExpanded ? 'chevron-up' : 'chevron-down'}
              size={18} color="#9CA3AF"
            />
          </Pressable>
          {historyExpanded && (
            <View style={styles.historyList}>
              {paymentHistory.map((item, i) => (
                <View key={item.id}>
                  <View style={styles.historyItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyService} numberOfLines={1}>{item.service_name}</Text>
                      <Text style={styles.historyMaster} numberOfLines={1}>{item.specialist_name}</Text>
                      <Text style={styles.historyDate}>
                        {new Date(item.created_at).toLocaleDateString('ru-RU')}
                      </Text>
                    </View>
                    <View style={styles.historyRight}>
                      <Text style={styles.historyAmount}>
                        {item.amount.toLocaleString('ru-RU')} ₽
                      </Text>
                      <View style={[
                        styles.historyBadge,
                        item.status === 'succeeded' && styles.historyBadgeSuccess,
                        item.status === 'canceled'  && styles.historyBadgeCanceled,
                        item.status === 'refunded'  && styles.historyBadgeRefunded,
                      ]}>
                        <Text style={[
                          styles.historyBadgeText,
                          item.status === 'succeeded' && styles.historyBadgeTextSuccess,
                          item.status === 'canceled'  && styles.historyBadgeTextCanceled,
                          item.status === 'refunded'  && styles.historyBadgeTextRefunded,
                        ]}>
                          {item.status === 'succeeded' ? 'Оплачено'
                            : item.status === 'refunded' ? 'Возврат'
                            : 'Отменён'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {i < paymentHistory.length - 1 && <View style={styles.historyDivider} />}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.divider} />

      {/* Выйти */}
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#FF5C7A" />
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </Pressable>

      {/* Удалить аккаунт */}
      <Pressable style={styles.deleteButton} onPress={() => {
        setDeleteConfirmText('');
        setDeleteModalVisible(true);
      }}>
        <Ionicons name="trash-outline" size={18} color="#FF3B30" />
        <Text style={styles.deleteButtonText}>Удалить аккаунт</Text>
      </Pressable>

      {/* Модалка подтверждения удаления */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Удалить аккаунт?</Text>
            <Text style={styles.modalWarning}>
              Аккаунт будет деактивирован. У вас будет{' '}
              <Text style={{ fontWeight: '700' }}>30 дней</Text> для восстановления.
            </Text>
            <Text style={styles.modalLabel}>
              Введите <Text style={{ color: '#FF3B30', fontWeight: '700' }}>УДАЛИТЬ</Text> для подтверждения
            </Text>
            <TextInput
              style={styles.modalInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="УДАЛИТЬ"
              placeholderTextColor="#C0B8C8"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Отмена</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalDeleteButton,
                  (deleteConfirmText !== 'УДАЛИТЬ' || deleting) && styles.modalDeleteButtonDisabled,
                ]}
                onPress={handleDeleteAccount}
                disabled={deleteConfirmText !== 'УДАЛИТЬ' || deleting}
              >
                {deleting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalDeleteText}>Удалить</Text>
                }
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },

  avatarWrapper: { alignItems: 'center', marginBottom: 20, position: 'relative', alignSelf: 'center' },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatar: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#EDE8FF',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 36, fontWeight: '700', color: '#7B61FF' },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },

  infoBlock: { alignItems: 'center', marginBottom: 28 },
  name: { fontSize: 22, fontWeight: '700', color: '#1A1628', marginBottom: 6 },
  phone: { fontSize: 15, color: '#7A7286', marginBottom: 8 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cityText: { fontSize: 14, color: '#7A7286' },

  form: { gap: 12, marginBottom: 24 },
  row: { flexDirection: 'row', gap: 12 },
  inputWrap: { gap: 6 },
  label: { fontSize: 12, color: '#7A7286', fontWeight: '500' },
  input: {
    height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5DFF5',
    paddingHorizontal: 14, fontSize: 15, color: '#1A1628', backgroundColor: '#FAFAFA',
  },

  editButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5DFF5',
    marginBottom: 24,
  },
  editButtonText: { fontSize: 15, color: '#7B61FF', fontWeight: '600' },

  editActions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  cancelButton: {
    flex: 1, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5DFF5',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelButtonText: { fontSize: 15, color: '#7A7286', fontWeight: '500' },
  saveButton: {
    flex: 2, height: 48, borderRadius: 14, backgroundColor: '#7B61FF',
    alignItems: 'center', justifyContent: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 15, color: '#fff', fontWeight: '600' },

  divider: { height: 1, backgroundColor: '#F0EBF8', marginBottom: 20 },

  historySection: { marginBottom: 20 },
  historyHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: '#F8F7FF', borderRadius: 14,
  },
  historyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyTitle: { fontSize: 15, fontWeight: '600', color: '#1A1628' },
  historyList: { marginTop: 8, backgroundColor: '#F8F7FF', borderRadius: 14, overflow: 'hidden' },
  historyItem: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  historyService: { fontSize: 14, fontWeight: '600', color: '#1A1628', marginBottom: 2 },
  historyMaster: { fontSize: 12, color: '#7A7286', marginBottom: 2 },
  historyDate: { fontSize: 12, color: '#B0A8B9' },
  historyRight: { alignItems: 'flex-end', gap: 6 },
  historyAmount: { fontSize: 14, fontWeight: '700', color: '#1A1628' },
  historyBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: '#F0EBF8',
  },
  historyBadgeSuccess: { backgroundColor: '#DCFCE7' },
  historyBadgeCanceled: { backgroundColor: '#FEE2E2' },
  historyBadgeRefunded: { backgroundColor: '#FEF3C7' },
  historyBadgeText: { fontSize: 11, fontWeight: '600', color: '#7A7286' },
  historyBadgeTextSuccess: { color: '#16A34A' },
  historyBadgeTextCanceled: { color: '#DC2626' },
  historyBadgeTextRefunded: { color: '#D97706' },
  historyDivider: { height: 1, backgroundColor: '#EDE8FF', marginHorizontal: 16 },

  logoutButton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 16, paddingHorizontal: 20, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#FFE0E6', backgroundColor: '#FFF5F7',
  },
  logoutText: { fontSize: 16, color: '#FF5C7A', fontWeight: '600' },

  deleteButton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14,
    marginTop: 10,
  },
  deleteButtonText: { fontSize: 14, color: '#FF3B30' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    width: '100%', backgroundColor: '#fff', borderRadius: 20,
    padding: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1A1628', marginBottom: 12 },
  modalWarning: {
    fontSize: 14, color: '#7A7286', lineHeight: 20, marginBottom: 20,
    backgroundColor: '#FFF5F0', borderRadius: 10, padding: 12,
  },
  modalLabel: { fontSize: 13, color: '#7A7286', marginBottom: 8 },
  modalInput: {
    height: 48, borderWidth: 1.5, borderColor: '#E5DFF5', borderRadius: 12,
    paddingHorizontal: 14, fontSize: 15, color: '#1A1628',
    backgroundColor: '#FAFAFA', marginBottom: 20,
    letterSpacing: 1,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancelButton: {
    flex: 1, height: 48, borderRadius: 12, borderWidth: 1.5,
    borderColor: '#E5DFF5', alignItems: 'center', justifyContent: 'center',
  },
  modalCancelText: { fontSize: 15, color: '#7A7286', fontWeight: '500' },
  modalDeleteButton: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center',
  },
  modalDeleteButtonDisabled: { backgroundColor: '#FFADA8' },
  modalDeleteText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});
