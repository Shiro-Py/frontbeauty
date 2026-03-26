import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Alert,
  ActivityIndicator, Modal, ScrollView, FlatList, Image, Switch,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getServices, addService, updateService, deleteService } from '@beautygo/shared';
import type { Service } from '@beautygo/shared';

// ─── Константы ────────────────────────────────────────────────────────────────

const CATEGORIES: { id: string; label: string; color: string }[] = [
  { id: 'hair',        label: 'Волосы',          color: '#A78BFA' },
  { id: 'nails',       label: 'Маникюр',         color: '#F472B6' },
  { id: 'brows',       label: 'Брови / ресницы', color: '#34D399' },
  { id: 'makeup',      label: 'Макияж',           color: '#FB923C' },
  { id: 'massage',     label: 'Массаж',           color: '#60A5FA' },
  { id: 'cosmetology', label: 'Косметология',     color: '#F87171' },
  { id: 'waxing',      label: 'Депиляция',        color: '#FBBF24' },
  { id: 'other',       label: 'Другое',           color: '#94A3B8' },
];

const VALID_DURATIONS = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240];

function getCat(id: string) {
  return CATEGORIES.find(c => c.id === id) ?? { label: 'Другое', color: '#94A3B8' };
}

function durationLabel(min: number) {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}ч ${m}м` : `${h} ч`;
}

// ─── Форма ────────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  price: string;
  duration: string;
  category: string;
  photoUri: string | null;
}

const emptyForm = (): FormState => ({
  name: '', price: '', duration: '60', category: 'hair', photoUri: null,
});

function validateForm(f: FormState): string | null {
  if (f.name.trim().length < 3) return 'Название: минимум 3 символа';
  const price = parseInt(f.price, 10);
  if (isNaN(price) || price <= 0) return 'Цена должна быть больше 0';
  if (!VALID_DURATIONS.includes(parseInt(f.duration, 10))) return 'Выберите длительность';
  if (!f.category) return 'Выберите категорию';
  return null;
}

// ─── Модалка ──────────────────────────────────────────────────────────────────

interface ServiceModalProps {
  visible: boolean;
  initial: Service | null;
  onClose: () => void;
  onSave: (form: FormState) => Promise<void>;
}

function ServiceModal({ visible, initial, onClose, onSave }: ServiceModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      setForm(initial
        ? { name: initial.name, price: String(initial.price), duration: String(initial.duration_minutes), category: initial.category, photoUri: initial.photo ?? null }
        : emptyForm()
      );
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible, initial]);

  const patch = (k: keyof FormState, v: string | null) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Нет доступа к галерее'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.8,
    });
    if (!res.canceled) patch('photoUri', res.assets[0].uri);
  };

  const handleSave = async () => {
    const err = validateForm(form);
    if (err) { Alert.alert('Проверьте данные', err); return; }
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{initial ? 'Редактировать' : 'Новая услуга'}</Text>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Категория */}
            <Text style={styles.formLabel}>Категория</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {CATEGORIES.map(cat => (
                <Pressable
                  key={cat.id}
                  style={[styles.chip, form.category === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]}
                  onPress={() => patch('category', cat.id)}
                >
                  <Text style={[styles.chipText, form.category === cat.id && { color: '#fff' }]}>{cat.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Название */}
            <Text style={styles.formLabel}>Название <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={[styles.formInput, form.name.length >= 3 && styles.inputValid]}
              value={form.name}
              onChangeText={v => patch('name', v)}
              placeholder="Например: Стрижка женская"
              placeholderTextColor="#8A80C0"
            />
            {form.name.length > 0 && form.name.length < 3 && (
              <Text style={styles.errorText}>Минимум 3 символа</Text>
            )}

            {/* Цена */}
            <Text style={styles.formLabel}>Цена (₽) <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={styles.formInput}
              value={form.price}
              onChangeText={v => patch('price', v.replace(/\D/g, ''))}
              placeholder="1500"
              placeholderTextColor="#8A80C0"
              keyboardType="numeric"
            />

            {/* Длительность */}
            <Text style={styles.formLabel}>Длительность <Text style={styles.req}>*</Text></Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {VALID_DURATIONS.map(d => (
                <Pressable
                  key={d}
                  style={[styles.durationChip, form.duration === String(d) && styles.durationChipActive]}
                  onPress={() => patch('duration', String(d))}
                >
                  <Text style={[styles.durationChipText, form.duration === String(d) && { color: '#fff' }]}>
                    {durationLabel(d)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Фото */}
            <Text style={styles.formLabel}>Фото (опционально)</Text>
            <Pressable style={styles.photoPickerBtn} onPress={pickPhoto}>
              {form.photoUri
                ? <Image source={{ uri: form.photoUri }} style={styles.photoPreview} />
                : <Text style={styles.photoPickerText}>📷 Выбрать из галереи</Text>
              }
            </Pressable>

            {/* Кнопки */}
            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Отмена</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveBtnText}>Сохранить</Text>
                }
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Карточка услуги ──────────────────────────────────────────────────────────

interface CardProps {
  service: Service;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ServiceCard({ service, isFirst, isLast, onMoveUp, onMoveDown, onToggleActive, onEdit, onDelete }: CardProps) {
  const cat = getCat(service.category);
  return (
    <View style={[styles.card, !service.is_active && styles.cardInactive]}>
      {/* Сортировка */}
      <View style={styles.sortButtons}>
        <Pressable onPress={onMoveUp} disabled={isFirst} hitSlop={6} style={styles.sortBtn}>
          <Text style={[styles.sortIcon, isFirst && styles.sortIconDisabled]}>▲</Text>
        </Pressable>
        <Pressable onPress={onMoveDown} disabled={isLast} hitSlop={6} style={styles.sortBtn}>
          <Text style={[styles.sortIcon, isLast && styles.sortIconDisabled]}>▼</Text>
        </Pressable>
      </View>

      {/* Фото / плейсхолдер */}
      {service.photo
        ? <Image source={{ uri: service.photo }} style={styles.cardPhoto} />
        : (
          <View style={[styles.cardPhotoPlaceholder, { backgroundColor: cat.color + '33' }]}>
            <Text style={[styles.cardPhotoInitial, { color: cat.color }]}>{service.name[0]?.toUpperCase()}</Text>
          </View>
        )
      }

      {/* Контент */}
      <View style={styles.cardContent}>
        <Text style={[styles.cardName, !service.is_active && styles.cardNameInactive]} numberOfLines={1}>
          {service.name}
        </Text>
        <View style={styles.cardMeta}>
          <View style={[styles.catBadge, { backgroundColor: cat.color + '22' }]}>
            <Text style={[styles.catBadgeText, { color: cat.color }]}>{cat.label}</Text>
          </View>
          <Text style={styles.cardMetaText}>{service.price} ₽ · {durationLabel(service.duration_minutes)}</Text>
        </View>
      </View>

      {/* Действия */}
      <View style={styles.cardActions}>
        <Switch
          value={service.is_active}
          onValueChange={onToggleActive}
          trackColor={{ false: '#E2DCF0', true: '#4A3DB0' }}
          thumbColor="#fff"
          style={styles.cardSwitch}
        />
        <Pressable onPress={onEdit} hitSlop={6}><Text style={styles.actionIcon}>✏️</Text></Pressable>
        <Pressable onPress={onDelete} hitSlop={6}><Text style={styles.actionIcon}>🗑</Text></Pressable>
      </View>
    </View>
  );
}

// ─── Главный экран ────────────────────────────────────────────────────────────

export default function ServicesScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await getServices();
      setServices(data.sort((a, b) => a.sort_order - b.sort_order));
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить услуги');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => { setEditingService(null); setModalVisible(true); };
  const openEdit = (s: Service) => { setEditingService(s); setModalVisible(true); };

  const handleSave = async (form: FormState) => {
    const payload = {
      name: form.name.trim(),
      price: parseInt(form.price, 10),
      duration_minutes: parseInt(form.duration, 10),
      category: form.category,
      ...(form.photoUri ? { photo: { uri: form.photoUri, name: 'photo.jpg', type: 'image/jpeg' } } : {}),
    };
    if (editingService) {
      const updated = await updateService(editingService.id, payload);
      setServices(prev => prev.map(s => s.id === updated.id ? updated : s));
    } else {
      const maxOrder = services.reduce((m, s) => Math.max(m, s.sort_order), 0);
      const created = await addService({ ...payload, sort_order: maxOrder + 10 } as any);
      setServices(prev => [...prev, created]);
    }
    setModalVisible(false);
  };

  const handleToggleActive = async (service: Service) => {
    const updated = await updateService(service.id, { is_active: !service.is_active });
    setServices(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const handleDelete = (service: Service) => {
    Alert.alert('Удалить услугу?', `«${service.name}» будет удалена.`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive',
        onPress: async () => {
          try {
            await deleteService(service.id);
            setServices(prev => prev.filter(s => s.id !== service.id));
          } catch (err: any) {
            const code = err?.response?.data?.error?.code;
            Alert.alert('Ошибка', code === 'HAS_ACTIVE_BOOKINGS'
              ? 'Нельзя удалить услугу с активными записями'
              : 'Не удалось удалить услугу'
            );
          }
        },
      },
    ]);
  };

  const moveService = async (index: number, direction: 'up' | 'down') => {
    const newList = [...services];
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    [newList[index], newList[swapWith]] = [newList[swapWith], newList[index]];
    const reordered = newList.map((s, i) => ({ ...s, sort_order: (i + 1) * 10 }));
    setServices(reordered);
    updateService(reordered[index].id, { sort_order: reordered[index].sort_order }).catch(() => {});
    updateService(reordered[swapWith].id, { sort_order: reordered[swapWith].sort_order }).catch(() => {});
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#4A3DB0" size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      {services.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✂️</Text>
          <Text style={styles.emptyTitle}>Нет услуг</Text>
          <Text style={styles.emptySubtitle}>Добавьте первую услугу, чтобы клиенты могли записываться</Text>
          <Pressable style={styles.addBtnPrimary} onPress={openAdd}>
            <Text style={styles.addBtnPrimaryText}>+ Добавить услугу</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <FlatList
            data={services}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => (
              <ServiceCard
                service={item}
                isFirst={index === 0}
                isLast={index === services.length - 1}
                onMoveUp={() => moveService(index, 'up')}
                onMoveDown={() => moveService(index, 'down')}
                onToggleActive={() => handleToggleActive(item)}
                onEdit={() => openEdit(item)}
                onDelete={() => handleDelete(item)}
              />
            )}
          />
          <Pressable style={styles.fab} onPress={openAdd}>
            <Text style={styles.fabText}>+</Text>
          </Pressable>
        </>
      )}

      <ServiceModal
        visible={modalVisible}
        initial={editingService}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
      />
    </View>
  );
}

// ─── Стили ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F7FF' },
  listContent: { padding: 16, paddingBottom: 100 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#E8E4F8',
    elevation: 2,
  },
  cardInactive: { opacity: 0.6 },

  sortButtons: { alignItems: 'center', gap: 2, marginRight: 8 },
  sortBtn: { padding: 2 },
  sortIcon: { fontSize: 12, color: '#4A3DB0' },
  sortIconDisabled: { color: '#D1C8F0' },

  cardPhoto: { width: 48, height: 48, borderRadius: 10, marginRight: 10 },
  cardPhotoPlaceholder: {
    width: 48, height: 48, borderRadius: 10, marginRight: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  cardPhotoInitial: { fontSize: 20, fontWeight: '700' },

  cardContent: { flex: 1, gap: 4 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#1A1628' },
  cardNameInactive: { color: '#B0A8B9' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  catBadgeText: { fontSize: 11, fontWeight: '600' },
  cardMetaText: { fontSize: 12, color: '#7A7286' },

  cardActions: { alignItems: 'center', gap: 6 },
  cardSwitch: { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] },
  actionIcon: { fontSize: 16 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A1628', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#7A7286', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  addBtnPrimary: {
    height: 52, backgroundColor: '#4A3DB0', borderRadius: 14,
    paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center',
  },
  addBtnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#4A3DB0', alignItems: 'center', justifyContent: 'center',
    elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40, maxHeight: '92%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2DCF0', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1A1628', marginBottom: 20 },

  formLabel: { fontSize: 13, fontWeight: '600', color: '#1A1628', marginBottom: 8 },
  req: { color: '#FF6B6B' },
  formInput: {
    height: 50, borderWidth: 1.5, borderColor: '#C8C2E8', borderRadius: 12,
    paddingHorizontal: 14, fontSize: 15, color: '#1A1628', backgroundColor: '#FAFAFA', marginBottom: 16,
  },
  inputValid: { borderColor: '#4A3DB0' },
  errorText: { fontSize: 12, color: '#FF6B6B', marginBottom: 8, marginLeft: 4 },

  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#C8C2E8', marginRight: 8, backgroundColor: '#fff',
  },
  chipText: { fontSize: 13, color: '#7A7286', fontWeight: '500' },

  durationChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#C8C2E8', marginRight: 6, backgroundColor: '#fff',
  },
  durationChipActive: { backgroundColor: '#4A3DB0', borderColor: '#4A3DB0' },
  durationChipText: { fontSize: 12, color: '#7A7286', fontWeight: '500' },

  photoPickerBtn: {
    height: 80, borderWidth: 1.5, borderColor: '#C8C2E8', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA',
    marginBottom: 20, overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%' },
  photoPickerText: { color: '#4A3DB0', fontSize: 14, fontWeight: '500' },

  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, height: 50, borderRadius: 12, borderWidth: 1.5,
    borderColor: '#C8C2E8', alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { color: '#7A7286', fontWeight: '600' },
  saveBtn: { flex: 1, height: 50, borderRadius: 12, backgroundColor: '#4A3DB0', alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled: { backgroundColor: '#9B92D0' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
