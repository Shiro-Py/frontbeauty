import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import { createService, updateMasterProfile, useAuth, tokenStorage, createServiceFromTemplate, TemplateServiceCreate } from '@ayla/shared';
import TemplatePickerSheet from '../../components/TemplatePickerSheet';

const SERVICE_CATEGORIES = [
  { id: 'hair', label: 'Волосы' },
  { id: 'nails', label: 'Маникюр' },
  { id: 'brows', label: 'Брови / ресницы' },
  { id: 'makeup', label: 'Макияж' },
  { id: 'massage', label: 'Массаж' },
  { id: 'cosmetology', label: 'Косметология' },
  { id: 'waxing', label: 'Депиляция' },
  { id: 'other', label: 'Другое' },
];

const MAX_SERVICES = 20;
const YANDEX_KEY = process.env.EXPO_PUBLIC_YANDEX_MAPS_KEY ?? '';

interface ServiceItem {
  localId: string;
  name: string;
  price: string;
  duration: string;
  category: string;
}

interface GeoResult {
  text: string;
  lat: number;
  lng: number;
}

async function geocodeAddress(address: string): Promise<GeoResult | null> {
  if (!YANDEX_KEY) return null;
  try {
    const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${YANDEX_KEY}&geocode=${encodeURIComponent(address)}&format=json&results=1&lang=ru_RU`;
    const res = await fetch(url);
    const json = await res.json();
    const obj = json?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    if (!obj) return null;
    const [lngStr, latStr] = obj.Point.pos.split(' ');
    return {
      text: obj.metaDataProperty.GeocoderMetaData.text,
      lat: parseFloat(latStr),
      lng: parseFloat(lngStr),
    };
  } catch {
    return null;
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!YANDEX_KEY) return null;
  try {
    const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${YANDEX_KEY}&geocode=${lng},${lat}&format=json&results=1&lang=ru_RU`;
    const res = await fetch(url);
    const json = await res.json();
    const obj = json?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    return obj?.metaDataProperty?.GeocoderMetaData?.text ?? null;
  } catch {
    return null;
  }
}

export default function OnboardingStep2Screen() {
  const { firstName, lastName } = useLocalSearchParams<{ firstName: string; lastName: string }>();
  const { signIn } = useAuth();

  // Услуги
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [newCategory, setNewCategory] = useState('');

  // Адрес
  const [addressInput, setAddressInput] = useState('');
  const [foundAddress, setFoundAddress] = useState<GeoResult | null>(null);
  const [searchingAddress, setSearchingAddress] = useState(false);

  const [templateSheetVisible, setTemplateSheetVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Услуги ---

  const saveService = () => {
    const name = newName.trim();
    const price = parseInt(newPrice, 10);
    const duration = parseInt(newDuration, 10);

    if (!name || isNaN(price) || price <= 0 || isNaN(duration) || duration <= 0 || !newCategory) {
      Alert.alert('Заполните все поля', 'Укажите категорию, название, цену и длительность');
      return;
    }
    setServices(prev => [...prev, {
      localId: Date.now().toString(),
      name, price: newPrice, duration: newDuration, category: newCategory,
    }]);
    setNewName(''); setNewPrice(''); setNewDuration(''); setNewCategory('');
    setShowAddForm(false);
  };

  const removeService = (localId: string) => {
    setServices(prev => prev.filter(s => s.localId !== localId));
  };

  const handleTemplatesSave = async (items: TemplateServiceCreate[]) => {
    const newItems: ServiceItem[] = items.map(it => ({
      localId: `${Date.now()}_${Math.random()}`,
      name: it.name,
      price: String(it.price_min),
      duration: String(it.duration_minutes),
      category: it.category,
    }));
    setServices(prev => [...prev, ...newItems]);
    setTemplateSheetVisible(false);
  };

  // --- Адрес ---

  const handleAddressSearch = async () => {
    const text = addressInput.trim();
    if (!text) return;
    setSearchingAddress(true);
    try {
      const result = await geocodeAddress(text);
      if (result) {
        setFoundAddress(result);
      } else {
        // Нет API-ключа — принимаем адрес без координат
        setFoundAddress({ text, lat: 0, lng: 0 });
        if (!YANDEX_KEY) {
          Alert.alert('Подсказка', 'Для геокодирования задайте EXPO_PUBLIC_YANDEX_MAPS_KEY');
        }
      }
    } catch {
      Alert.alert('Ошибка', 'Не удалось найти адрес');
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleGpsLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Нет доступа', 'Разрешите доступ к геолокации в настройках');
      return;
    }
    setSearchingAddress(true);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = loc.coords;
      const address = await reverseGeocode(lat, lng);
      const text = address ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setFoundAddress({ text, lat, lng });
      setAddressInput(text);
    } catch {
      Alert.alert('Ошибка', 'Не удалось определить местоположение');
    } finally {
      setSearchingAddress(false);
    }
  };

  // --- Финиш ---

  const canSubmit = services.length > 0 && foundAddress !== null;

  const handleFinish = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      for (const svc of services) {
        await createService({
          name: svc.name,
          price: parseInt(svc.price, 10),
          duration_minutes: parseInt(svc.duration, 10),
          category: svc.category,
        });
      }
      await updateMasterProfile({
        first_name: firstName,
        last_name: lastName,
        address: foundAddress!.text,
        lat: foundAddress!.lat,
        lng: foundAddress!.lng,
      });
    } catch {
      Alert.alert('Ошибка', 'Не удалось сохранить данные. Попробуйте ещё раз.');
      setLoading(false);
      return;
    }
    try {
      const access = await tokenStorage.getAccess();
      const refresh = await tokenStorage.getRefresh();
      if (access && refresh) await signIn(access, refresh, false);
    } catch {
      Alert.alert('Ошибка', 'Не удалось завершить регистрацию');
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      {/* Прогресс */}
      <View style={styles.progressRow}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '100%' }]} />
        </View>
        <Text style={styles.progressText}>Шаг 2 из 2</Text>
      </View>

      {/* ===== УСЛУГИ ===== */}
      <Text style={styles.sectionTitle}>Добавьте услуги 💅</Text>
      <Text style={styles.sectionSubtitle}>Выберите из популярных или добавьте свои (макс. {MAX_SERVICES})</Text>

      {/* Шаблоны */}
      <Pressable style={styles.templateBtn} onPress={() => setTemplateSheetVisible(true)}>
        <Text style={styles.templateBtnEmoji}>📋</Text>
        <View style={styles.templateBtnInfo}>
          <Text style={styles.templateBtnTitle}>Выбрать из шаблонов</Text>
          <Text style={styles.templateBtnDesc}>Популярные услуги с ценами региона</Text>
        </View>
        <Text style={styles.templateBtnArrow}>›</Text>
      </Pressable>

      {/* Список добавленных услуг */}
      {services.map(svc => (
        <View key={svc.localId} style={styles.serviceItem}>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{svc.name}</Text>
            <Text style={styles.serviceMeta}>
              {svc.price} ₽ · {svc.duration} мин · {SERVICE_CATEGORIES.find(c => c.id === svc.category)?.label}
            </Text>
          </View>
          <Pressable onPress={() => removeService(svc.localId)} hitSlop={8}>
            <Text style={styles.removeText}>✕</Text>
          </Pressable>
        </View>
      ))}

      {/* Форма добавления */}
      {showAddForm ? (
        <View style={styles.addForm}>
          <Text style={styles.formLabel}>Категория</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {SERVICE_CATEGORIES.map(cat => (
              <Pressable
                key={cat.id}
                style={[styles.chip, newCategory === cat.id && styles.chipActive]}
                onPress={() => setNewCategory(cat.id)}
              >
                <Text style={[styles.chipText, newCategory === cat.id && styles.chipTextActive]}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.formLabel}>Название услуги</Text>
          <TextInput
            style={styles.formInput}
            value={newName}
            onChangeText={setNewName}
            placeholder="Например: Стрижка женская"
            placeholderTextColor="#8A80C0"
            autoFocus
          />

          <View style={styles.formRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.formLabel}>Цена (₽)</Text>
              <TextInput
                style={styles.formInput}
                value={newPrice}
                onChangeText={setNewPrice}
                placeholder="1500"
                placeholderTextColor="#8A80C0"
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.formLabel}>Длительность (мин)</Text>
              <TextInput
                style={styles.formInput}
                value={newDuration}
                onChangeText={setNewDuration}
                placeholder="60"
                placeholderTextColor="#8A80C0"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.formButtons}>
            <Pressable style={styles.cancelButton} onPress={() => setShowAddForm(false)}>
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={saveService}>
              <Text style={styles.saveButtonText}>Сохранить</Text>
            </Pressable>
          </View>
        </View>
      ) : services.length < MAX_SERVICES ? (
        <Pressable style={styles.addServiceButton} onPress={() => setShowAddForm(true)}>
          <Text style={styles.addServiceText}>+ Добавить услугу</Text>
        </Pressable>
      ) : null}

      {/* ===== АДРЕС ===== */}
      <Text style={[styles.sectionTitle, { marginTop: 36 }]}>Рабочий адрес</Text>
      <Text style={styles.sectionSubtitle}>Где вы принимаете клиентов</Text>

      <View style={styles.addressRow}>
        <TextInput
          style={styles.addressInput}
          value={addressInput}
          onChangeText={setAddressInput}
          placeholder="Введите адрес"
          placeholderTextColor="#8A80C0"
          returnKeyType="search"
          onSubmitEditing={handleAddressSearch}
        />
        <Pressable style={styles.searchButton} onPress={handleAddressSearch} disabled={searchingAddress}>
          {searchingAddress
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.searchButtonText}>Найти</Text>
          }
        </Pressable>
      </View>

      <Pressable style={styles.gpsButton} onPress={handleGpsLocation} disabled={searchingAddress}>
        <Text style={styles.gpsButtonText}>📍 Использовать текущее местоположение</Text>
      </Pressable>

      {foundAddress && (
        <View style={styles.foundAddress}>
          <Text style={styles.foundAddressLabel}>Адрес подтверждён</Text>
          <Text style={styles.foundAddressText}>{foundAddress.text}</Text>
          {foundAddress.lat !== 0 && (
            <Text style={styles.coordsText}>{foundAddress.lat.toFixed(5)}, {foundAddress.lng.toFixed(5)}</Text>
          )}
        </View>
      )}

      {/* ===== КНОПКА ГОТОВО ===== */}
      <Pressable
        style={[styles.finishButton, (!canSubmit || loading) && styles.finishButtonDisabled]}
        onPress={handleFinish}
        disabled={!canSubmit || loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.finishButtonText}>Готово</Text>
        }
      </Pressable>

      {!canSubmit && (
        <Text style={styles.hintText}>
          {services.length === 0 ? 'Добавьте хотя бы одну услугу' : 'Укажите рабочий адрес'}
        </Text>
      )}
    </ScrollView>

    <TemplatePickerSheet
      visible={templateSheetVisible}
      onClose={() => setTemplateSheetVisible(false)}
      onSave={handleTemplatesSave}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FF' },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 60 },

  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 40, gap: 12 },
  progressBar: { flex: 1, height: 4, backgroundColor: '#C8C2E8', borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: '#4A3DB0', borderRadius: 2 },
  progressText: { fontSize: 13, color: '#7A7286', fontWeight: '600' },

  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1A1628', marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: '#7A7286', marginBottom: 16 },

  serviceItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#E2DCF0',
  },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 15, fontWeight: '600', color: '#1A1628' },
  serviceMeta: { fontSize: 13, color: '#7A7286', marginTop: 2 },
  removeText: { fontSize: 16, color: '#B0A8B9', paddingHorizontal: 4 },

  addServiceButton: {
    height: 50, borderWidth: 1.5, borderColor: '#4A3DB0', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', marginTop: 4,
  },
  addServiceText: { color: '#4A3DB0', fontSize: 15, fontWeight: '600' },

  addForm: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#E2DCF0', marginTop: 8,
  },
  formLabel: { fontSize: 13, color: '#7A7286', marginBottom: 6, fontWeight: '500' },
  formInput: {
    height: 48, borderWidth: 1.5, borderColor: '#C8C2E8', borderRadius: 10,
    paddingHorizontal: 12, fontSize: 15, color: '#1A1628',
    backgroundColor: '#FAFAFA', marginBottom: 12,
  },
  formRow: { flexDirection: 'row' },
  formButtons: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelButton: {
    flex: 1, height: 44, borderRadius: 10, borderWidth: 1.5,
    borderColor: '#C8C2E8', alignItems: 'center', justifyContent: 'center',
  },
  cancelButtonText: { color: '#7A7286', fontWeight: '600' },
  saveButton: {
    flex: 1, height: 44, borderRadius: 10,
    backgroundColor: '#4A3DB0', alignItems: 'center', justifyContent: 'center',
  },
  saveButtonText: { color: '#fff', fontWeight: '600' },

  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#C8C2E8', marginRight: 8, backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#4A3DB0', borderColor: '#4A3DB0' },
  chipText: { fontSize: 13, color: '#7A7286', fontWeight: '500' },
  chipTextActive: { color: '#fff' },

  addressRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  addressInput: {
    flex: 1, height: 50, borderWidth: 1.5, borderColor: '#C8C2E8', borderRadius: 12,
    paddingHorizontal: 14, fontSize: 15, color: '#1A1628', backgroundColor: '#fff',
  },
  searchButton: {
    width: 72, height: 50, backgroundColor: '#4A3DB0', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  searchButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  gpsButton: {
    height: 50, borderWidth: 1.5, borderColor: '#C8C2E8', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  gpsButtonText: { color: '#4A3DB0', fontWeight: '500', fontSize: 14 },

  foundAddress: {
    backgroundColor: '#EEEAFF', borderRadius: 12, padding: 14, marginTop: 12,
  },
  foundAddressLabel: { fontSize: 12, color: '#7A7286', marginBottom: 4 },
  foundAddressText: { fontSize: 14, color: '#1A1628', fontWeight: '500' },
  coordsText: { fontSize: 11, color: '#9B92D0', marginTop: 4 },

  finishButton: {
    height: 56, backgroundColor: '#4A3DB0', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 36,
  },
  finishButtonDisabled: { backgroundColor: '#9B92D0' },
  finishButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hintText: { textAlign: 'center', color: '#B0A8B9', fontSize: 13, marginTop: 10 },

  templateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#EDE8FF', borderRadius: 14, padding: 14, marginBottom: 16,
  },
  templateBtnEmoji: { fontSize: 24 },
  templateBtnInfo: { flex: 1 },
  templateBtnTitle: { fontSize: 15, fontWeight: '700', color: '#4A3DB0' },
  templateBtnDesc: { fontSize: 12, color: '#7A7286', marginTop: 2 },
  templateBtnArrow: { fontSize: 22, color: '#4A3DB0', fontWeight: '300' },
});
