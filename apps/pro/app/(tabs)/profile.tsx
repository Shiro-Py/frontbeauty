import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Alert,
  ScrollView, TextInput, Image, RefreshControl, Switch, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  getMasterMe, updateMasterProfile, useAuth,
  getServices, addService, updateService, deleteService,
  MasterMyProfile, Service,
} from '@beautygo/shared';

// ─── Verification badge ───────────────────────────────────────────────────────

const VERIFICATION_LEVELS: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: 'Новичок',       color: '#7A7286', bg: '#F0EDF8' },
  1: { label: 'Телефон ✓',    color: '#2563EB', bg: '#DBEAFE' },
  2: { label: 'Профиль ✓',    color: '#4A3DB0', bg: '#EDE8FF' },
  3: { label: 'Верифицирован', color: '#16A34A', bg: '#DCFCE7' },
  4: { label: '⭐ Топ мастер', color: '#B45309', bg: '#FEF3C7' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:    { label: 'Черновик',       color: '#7A7286' },
  pending:  { label: 'На модерации',   color: '#D97706' },
  approved: { label: 'Активен',        color: '#16A34A' },
  rejected: { label: 'Отклонён',       color: '#DC2626' },
};

function VerificationBadge({ level }: { level: number }) {
  const cfg = VERIFICATION_LEVELS[level] ?? VERIFICATION_LEVELS[0];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Duration helpers ─────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h}ч ${m}м`;
}

// ─── Service modal ────────────────────────────────────────────────────────────

interface ServiceFormState {
  name: string;
  price: string;
  duration: string;
}

interface ServiceRowProps {
  service: Service;
  editing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSave: (data: ServiceFormState) => void;
  onCancel: () => void;
}

function ServiceRow({ service, editing, onEdit, onDelete, onSave, onCancel }: ServiceRowProps) {
  const [form, setForm] = useState<ServiceFormState>({
    name: service.name,
    price: String(service.price),
    duration: String(service.duration_minutes),
  });

  useEffect(() => {
    if (editing) setForm({ name: service.name, price: String(service.price), duration: String(service.duration_minutes) });
  }, [editing]);

  if (editing) {
    return (
      <View style={styles.serviceEditCard}>
        <TextInput
          style={styles.serviceInput}
          value={form.name}
          onChangeText={v => setForm(f => ({ ...f, name: v }))}
          placeholder="Название"
          placeholderTextColor="#8A80C0"
        />
        <View style={styles.serviceRow2}>
          <TextInput
            style={[styles.serviceInput, { flex: 1, marginRight: 8 }]}
            value={form.price}
            onChangeText={v => setForm(f => ({ ...f, price: v }))}
            placeholder="Цена ₽"
            placeholderTextColor="#8A80C0"
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.serviceInput, { flex: 1 }]}
            value={form.duration}
            onChangeText={v => setForm(f => ({ ...f, duration: v }))}
            placeholder="Мин"
            placeholderTextColor="#8A80C0"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.serviceEditBtns}>
          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>Отмена</Text>
          </Pressable>
          <Pressable
            style={styles.saveBtn}
            onPress={() => onSave(form)}
          >
            <Text style={styles.saveBtnText}>Сохранить</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.serviceCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.serviceName}>{service.name}</Text>
        <Text style={styles.serviceMeta}>
          {service.price.toLocaleString('ru-RU')} ₽ · {formatDuration(service.duration_minutes)}
        </Text>
      </View>
      <Pressable onPress={onEdit} hitSlop={8} style={styles.iconBtn}>
        <Ionicons name="pencil-outline" size={18} color="#7A7286" />
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={8} style={styles.iconBtn}>
        <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
      </Pressable>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { signOut } = useAuth();

  const [profile, setProfile] = useState<MasterMyProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editAvatarUri, setEditAvatarUri] = useState<string | null>(null);

  // Services
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [showAddService, setShowAddService] = useState(false);
  const [newService, setNewService] = useState<ServiceFormState>({ name: '', price: '', duration: '' });

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [p, s] = await Promise.all([getMasterMe(), getServices()]);
      setProfile(p);
      setServices(s);
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить профиль');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEditing = () => {
    if (!profile) return;
    setEditFirstName(profile.first_name);
    setEditLastName(profile.last_name);
    setEditBio(profile.bio ?? '');
    setEditAddress(profile.address ?? '');
    setEditAvatarUri(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditingServiceId(null);
    setShowAddService(false);
  };

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await updateMasterProfile({
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        bio: editBio.trim(),
        address: editAddress.trim(),
        ...(editAvatarUri ? { avatar: { uri: editAvatarUri, name: 'avatar.jpg', type: 'image/jpeg' } } : {}),
      });
      setProfile(prev => prev ? {
        ...prev,
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        bio: editBio.trim(),
        address: editAddress.trim(),
        ...(editAvatarUri ? { avatar_url: editAvatarUri } : {}),
      } : prev);
      setEditing(false);
    } catch {
      Alert.alert('Ошибка', 'Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Нет доступа', 'Разрешите доступ к галерее'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) setEditAvatarUri(result.assets[0].uri);
  };

  const pickAvatarCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Нет доступа', 'Разрешите доступ к камере'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) setEditAvatarUri(result.assets[0].uri);
  };

  const handleAvatarPress = () => {
    if (!editing) return;
    Alert.alert('Фото профиля', 'Выберите источник', [
      { text: 'Камера', onPress: pickAvatarCamera },
      { text: 'Галерея', onPress: pickAvatar },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  // ── Services ──

  const handleSaveService = async (serviceId: string, form: ServiceFormState) => {
    const price = parseInt(form.price, 10);
    const duration = parseInt(form.duration, 10);
    if (!form.name.trim() || isNaN(price) || isNaN(duration)) {
      Alert.alert('Ошибка', 'Заполните все поля корректно'); return;
    }
    try {
      await updateService(serviceId, { name: form.name.trim(), price, duration_minutes: duration });
      setServices(prev => prev.map(s => s.id === serviceId
        ? { ...s, name: form.name.trim(), price, duration_minutes: duration }
        : s,
      ));
      setEditingServiceId(null);
    } catch { Alert.alert('Ошибка', 'Не удалось обновить услугу'); }
  };

  const handleDeleteService = (serviceId: string) => {
    Alert.alert('Удалить услугу', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive', onPress: async () => {
          try {
            await deleteService(serviceId);
            setServices(prev => prev.filter(s => s.id !== serviceId));
          } catch { Alert.alert('Ошибка', 'Не удалось удалить услугу'); }
        },
      },
    ]);
  };

  const handleAddService = async () => {
    const price = parseInt(newService.price, 10);
    const duration = parseInt(newService.duration, 10);
    if (!newService.name.trim() || isNaN(price) || isNaN(duration)) {
      Alert.alert('Ошибка', 'Заполните все поля'); return;
    }
    try {
      await addService({ name: newService.name.trim(), price, duration_minutes: duration, category: 'other', sort_order: services.length });
      setNewService({ name: '', price: '', duration: '' });
      setShowAddService(false);
      load();
    } catch { Alert.alert('Ошибка', 'Не удалось добавить услугу'); }
  };

  const handleLogout = () => {
    Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: signOut },
    ]);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4A3DB0" /></View>;
  }

  if (!profile) return null;

  const avatarUri = editAvatarUri ?? profile.avatar_url;
  const fullName = `${profile.first_name} ${profile.last_name}`.trim();
  const initials = [profile.first_name[0], profile.last_name[0]].join('').toUpperCase();
  const statusCfg = STATUS_LABELS[profile.status] ?? STATUS_LABELS.draft;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#4A3DB0" colors={['#4A3DB0']} />
      }
    >
      {/* ── Баннер верификации ── */}
      {profile.verification_level < 2 && (
        <View style={styles.banner}>
          <Ionicons name="information-circle-outline" size={18} color="#D97706" />
          <Text style={styles.bannerText}>
            {profile.verification_level === 0
              ? 'Завершите профиль, чтобы начать принимать записи'
              : 'Дополните профиль для повышения доверия клиентов'}
          </Text>
        </View>
      )}

      {/* ── Шапка ── */}
      <View style={styles.header}>
        <Pressable onPress={handleAvatarPress} style={styles.avatarWrap}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          {editing && (
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          )}
        </Pressable>

        {editing ? (
          <View style={styles.nameEditRow}>
            <TextInput
              style={[styles.nameInput, { marginRight: 8 }]}
              value={editFirstName}
              onChangeText={setEditFirstName}
              placeholder="Имя"
              placeholderTextColor="#8A80C0"
            />
            <TextInput
              style={styles.nameInput}
              value={editLastName}
              onChangeText={setEditLastName}
              placeholder="Фамилия"
              placeholderTextColor="#8A80C0"
            />
          </View>
        ) : (
          <Text style={styles.name}>{fullName || 'Имя не указано'}</Text>
        )}

        <View style={styles.badgeRow}>
          <VerificationBadge level={profile.verification_level} />
          <View style={[styles.statusDot, { backgroundColor: statusCfg.color }]} />
          <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>

        {profile.rating != null && (
          <Text style={styles.rating}>★ {profile.rating.toFixed(1)} · {profile.reviews_count ?? 0} отзывов</Text>
        )}
      </View>

      {/* ── Кнопки редактирования ── */}
      {editing ? (
        <View style={styles.editActions}>
          <Pressable style={styles.cancelBtn} onPress={cancelEditing}>
            <Text style={styles.cancelBtnText}>Отмена</Text>
          </Pressable>
          <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={saveProfile} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Сохранить</Text>}
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.editBtn} onPress={startEditing}>
          <Ionicons name="pencil-outline" size={16} color="#4A3DB0" />
          <Text style={styles.editBtnText}>Редактировать</Text>
        </Pressable>
      )}

      {/* ── Bio ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>О себе</Text>
        {editing ? (
          <TextInput
            style={styles.bioInput}
            value={editBio}
            onChangeText={setEditBio}
            placeholder="Расскажите о своём опыте..."
            placeholderTextColor="#8A80C0"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={300}
          />
        ) : (
          <Text style={styles.bioText}>{profile.bio || '—'}</Text>
        )}
      </View>

      {/* ── Адрес ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Адрес приёма</Text>
        {editing ? (
          <TextInput
            style={styles.fieldInput}
            value={editAddress}
            onChangeText={setEditAddress}
            placeholder="Введите адрес"
            placeholderTextColor="#8A80C0"
          />
        ) : (
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={15} color="#7A7286" />
            <Text style={styles.addressText}>{profile.address || '—'}</Text>
          </View>
        )}
      </View>

      {/* ── Услуги ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Услуги</Text>
          <Text style={styles.serviceCount}>{services.length}</Text>
        </View>

        {services.map(svc => (
          <ServiceRow
            key={svc.id}
            service={svc}
            editing={editingServiceId === svc.id}
            onEdit={() => setEditingServiceId(svc.id)}
            onDelete={() => handleDeleteService(svc.id)}
            onSave={form => handleSaveService(svc.id, form)}
            onCancel={() => setEditingServiceId(null)}
          />
        ))}

        {/* Форма добавления */}
        {showAddService ? (
          <View style={styles.serviceEditCard}>
            <TextInput
              style={styles.serviceInput}
              value={newService.name}
              onChangeText={v => setNewService(f => ({ ...f, name: v }))}
              placeholder="Название услуги"
              placeholderTextColor="#8A80C0"
              autoFocus
            />
            <View style={styles.serviceRow2}>
              <TextInput
                style={[styles.serviceInput, { flex: 1, marginRight: 8 }]}
                value={newService.price}
                onChangeText={v => setNewService(f => ({ ...f, price: v }))}
                placeholder="Цена ₽"
                placeholderTextColor="#8A80C0"
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.serviceInput, { flex: 1 }]}
                value={newService.duration}
                onChangeText={v => setNewService(f => ({ ...f, duration: v }))}
                placeholder="Мин"
                placeholderTextColor="#8A80C0"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.serviceEditBtns}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowAddService(false)}>
                <Text style={styles.cancelBtnText}>Отмена</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleAddService}>
                <Text style={styles.saveBtnText}>Добавить</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.addServiceBtn} onPress={() => setShowAddService(true)}>
            <Ionicons name="add" size={18} color="#4A3DB0" />
            <Text style={styles.addServiceText}>Добавить услугу</Text>
          </Pressable>
        )}
      </View>

      {/* ── Выход ── */}
      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#FF5C7A" />
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FF' },
  content: { paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F7FF' },

  // Баннер
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, padding: 12, borderRadius: 12,
    backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A',
  },
  bannerText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },

  // Шапка
  header: { alignItems: 'center', paddingTop: 24, paddingBottom: 16, paddingHorizontal: 24 },
  avatarWrap: { marginBottom: 14, position: 'relative' },
  avatarImg: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: '#fff' },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#DDDAFF', borderWidth: 3, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 34, fontWeight: '700', color: '#4A3DB0' },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#4A3DB0', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#F8F7FF',
  },

  nameEditRow: { flexDirection: 'row', width: '100%', marginBottom: 10 },
  nameInput: {
    flex: 1, height: 46, borderWidth: 1.5, borderColor: '#C8C2E8',
    borderRadius: 12, paddingHorizontal: 14, fontSize: 16,
    color: '#1A1628', backgroundColor: '#fff',
  },
  name: { fontSize: 22, fontWeight: '700', color: '#1A1628', marginBottom: 8 },

  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '500' },
  rating: { fontSize: 14, color: '#7A7286' },

  // Кнопки редактирования
  editActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 8 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 20,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#4A3DB0',
    marginBottom: 16,
  },
  editBtnText: { color: '#4A3DB0', fontSize: 14, fontWeight: '600' },
  cancelBtn: {
    flex: 1, height: 44, borderRadius: 10, borderWidth: 1.5,
    borderColor: '#C8C2E8', alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { color: '#7A7286', fontWeight: '600' },
  saveBtn: {
    flex: 1, height: 44, borderRadius: 10,
    backgroundColor: '#4A3DB0', alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '600' },

  // Секции
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1628', marginBottom: 10 },
  serviceCount: {
    fontSize: 12, fontWeight: '600', color: '#4A3DB0',
    backgroundColor: '#EDE8FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },

  bioInput: {
    minHeight: 90, borderWidth: 1.5, borderColor: '#C8C2E8', borderRadius: 12,
    paddingHorizontal: 14, paddingTop: 12, fontSize: 15, color: '#1A1628',
    backgroundColor: '#fff', lineHeight: 22,
  },
  bioText: { fontSize: 15, color: '#4A4358', lineHeight: 22 },

  fieldInput: {
    height: 48, borderWidth: 1.5, borderColor: '#C8C2E8', borderRadius: 12,
    paddingHorizontal: 14, fontSize: 15, color: '#1A1628', backgroundColor: '#fff',
  },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addressText: { fontSize: 15, color: '#4A4358' },

  // Services
  serviceCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#E2DCF0',
  },
  serviceName: { fontSize: 15, fontWeight: '600', color: '#1A1628' },
  serviceMeta: { fontSize: 13, color: '#7A7286', marginTop: 2 },
  serviceEditCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1.5, borderColor: '#4A3DB0',
  },
  serviceInput: {
    height: 44, borderWidth: 1, borderColor: '#C8C2E8', borderRadius: 10,
    paddingHorizontal: 12, fontSize: 14, color: '#1A1628',
    backgroundColor: '#FAFAFA', marginBottom: 10,
  },
  serviceRow2: { flexDirection: 'row' },
  serviceEditBtns: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 6 },

  addServiceBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 48, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: '#4A3DB0', borderRadius: 12,
    justifyContent: 'center', marginTop: 4,
  },
  addServiceText: { color: '#4A3DB0', fontSize: 14, fontWeight: '600' },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 16, marginTop: 28, paddingVertical: 16, paddingHorizontal: 20,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#FFE0E6', backgroundColor: '#FFF5F7',
  },
  logoutText: { fontSize: 16, color: '#FF5C7A', fontWeight: '600' },
});
