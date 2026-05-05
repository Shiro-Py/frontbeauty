import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, FlatList,
  Dimensions, Image, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import {
  getPortfolio, uploadPortfolioPhoto, deletePortfolioPhoto, PortfolioPhoto,
} from '@ayla/shared';

const SCREEN_W = Dimensions.get('window').width;
const CELL_SIZE = (SCREEN_W - 32 - 8) / 3;
const MAX_PHOTOS = 30;
const MAX_BATCH = 10;

// ─── Upload progress item ─────────────────────────────────────────────────────

interface UploadItem {
  uri: string;
  progress: number;
  done: boolean;
  error: boolean;
}

// ─── Fullscreen viewer ────────────────────────────────────────────────────────

function FullscreenViewer({
  photos, initialIndex, visible, onClose, onDelete,
}: {
  photos: PortfolioPhoto[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const [current, setCurrent] = useState(initialIndex);

  useEffect(() => { setCurrent(initialIndex); }, [initialIndex, visible]);

  const photo = photos[current];

  const confirmDelete = () => {
    Alert.alert('Удалить фото?', 'Это действие нельзя отменить', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive',
        onPress: () => { onDelete(photo.id); onClose(); },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent transparent>
      <View style={V.overlay}>
        {/* Close */}
        <Pressable style={V.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>

        {/* Counter */}
        <Text style={V.counter}>{current + 1} / {photos.length}</Text>

        {/* Swipeable list */}
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
          onMomentumScrollEnd={e => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
            setCurrent(idx);
          }}
          renderItem={({ item }) => (
            <View style={{ width: SCREEN_W, alignItems: 'center', justifyContent: 'center' }}>
              {item.photo_url ? (
                <Image
                  source={{ uri: item.photo_url }}
                  style={V.fullImg}
                  resizeMode="contain"
                />
              ) : (
                <View style={V.fullPlaceholder}>
                  <Ionicons name="image-outline" size={64} color="#555" />
                </View>
              )}
            </View>
          )}
          keyExtractor={p => p.id}
        />

        {/* Delete */}
        <Pressable style={V.deleteBtn} onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={V.deleteBtnText}>Удалить</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const V = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000' },
  closeBtn: {
    position: 'absolute', top: 52, left: 16, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  counter: {
    position: 'absolute', top: 58, alignSelf: 'center', zIndex: 10,
    color: '#fff', fontSize: 15, fontWeight: '600',
  },
  fullImg: { width: SCREEN_W, height: SCREEN_W * 1.2 },
  fullPlaceholder: {
    width: SCREEN_W, height: SCREEN_W * 1.2,
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtn: {
    position: 'absolute', bottom: 44, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(220,38,38,0.85)', borderRadius: 24,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  deleteBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ─── Progress bar ─────────────────────────────────────────────────────────────

function UploadRow({ item }: { item: UploadItem }) {
  return (
    <View style={S.uploadRow}>
      <View style={S.uploadThumb}>
        <Image source={{ uri: item.uri }} style={{ width: 44, height: 44, borderRadius: 8 }} />
      </View>
      <View style={S.uploadInfo}>
        <View style={S.progressTrack}>
          <View style={[S.progressFill, { width: `${item.progress}%` as any }]} />
        </View>
        {item.error ? (
          <Text style={S.uploadError}>Ошибка загрузки</Text>
        ) : item.done ? (
          <Text style={S.uploadDone}>Загружено</Text>
        ) : (
          <Text style={S.uploadPct}>{item.progress}%</Text>
        )}
      </View>
      {item.done && <Ionicons name="checkmark-circle" size={20} color="#16A34A" />}
      {item.error && <Ionicons name="alert-circle" size={20} color="#DC2626" />}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PortfolioScreen() {
  const [photos, setPhotos] = useState<PortfolioPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const p = await getPortfolio();
      setPhotos(p);
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить портфолио');
    } finally {
      setLoading(false);
    }
  }

  function openPhoto(index: number) {
    setViewerIndex(index);
    setViewerVisible(true);
  }

  async function handleDelete(id: string) {
    try {
      await deletePortfolioPhoto(id);
      setPhotos(prev => prev.filter(p => p.id !== id));
    } catch {
      Alert.alert('Ошибка', 'Не удалось удалить фото');
    }
  }

  function showAddSheet() {
    const remaining = MAX_PHOTOS - photos.length - uploads.filter(u => !u.done && !u.error).length;
    if (remaining <= 0) {
      Alert.alert('Лимит', `Максимум ${MAX_PHOTOS} фото в портфолио`);
      return;
    }
    Alert.alert('Добавить фото', 'Выберите источник', [
      { text: 'Камера', onPress: pickCamera },
      { text: 'Галерея', onPress: () => pickGallery(remaining) },
      { text: 'Отмена', style: 'cancel' },
    ]);
  }

  async function pickCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Нет доступа к камере'); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled) await uploadFiles([result.assets[0].uri]);
  }

  async function pickGallery(maxBatch: number) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Нет доступа к галерее'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: Math.min(maxBatch, MAX_BATCH),
    });
    if (!result.canceled) await uploadFiles(result.assets.map(a => a.uri));
  }

  async function uploadFiles(uris: string[]) {
    const items: UploadItem[] = uris.map(uri => ({ uri, progress: 0, done: false, error: false }));
    setUploads(prev => [...prev, ...items]);
    const startIdx = uploads.length;

    await Promise.all(
      uris.map((uri, i) =>
        uploadPortfolioPhoto(uri, (pct) => {
          setUploads(prev => {
            const next = [...prev];
            const idx = startIdx + i;
            if (next[idx]) next[idx] = { ...next[idx], progress: pct };
            return next;
          });
        })
          .then(photo => {
            setPhotos(prev => [...prev, photo]);
            setUploads(prev => {
              const next = [...prev];
              const idx = startIdx + i;
              if (next[idx]) next[idx] = { ...next[idx], done: true, progress: 100 };
              return next;
            });
          })
          .catch(() => {
            setUploads(prev => {
              const next = [...prev];
              const idx = startIdx + i;
              if (next[idx]) next[idx] = { ...next[idx], error: true };
              return next;
            });
          })
      )
    );

    // Clear done/error items after a short delay
    setTimeout(() => {
      setUploads(prev => prev.filter(u => !u.done && !u.error));
    }, 2000);
  }

  const canAdd = photos.length < MAX_PHOTOS;

  if (loading) {
    return (
      <View style={S.center}>
        <ActivityIndicator size="large" color="#4A3DB0" />
      </View>
    );
  }

  return (
    <View style={S.root}>
      {/* Header */}
      <View style={S.header}>
        <Pressable style={S.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A1628" />
        </Pressable>
        <Text style={S.title}>Моё портфолио</Text>
        <Pressable style={[S.addHeaderBtn, !canAdd && S.addHeaderBtnDisabled]} onPress={showAddSheet} disabled={!canAdd}>
          <Ionicons name="add" size={22} color={canAdd ? '#4A3DB0' : '#B0A8B9'} />
          <Text style={[S.addHeaderText, !canAdd && { color: '#B0A8B9' }]}>Добавить</Text>
        </Pressable>
      </View>

      {/* Upload queue */}
      {uploads.length > 0 && (
        <View style={S.uploadSection}>
          {uploads.map((u, i) => <UploadRow key={i} item={u} />)}
        </View>
      )}

      {photos.length === 0 && uploads.length === 0 ? (
        /* Empty state */
        <View style={S.empty}>
          <Text style={S.emptyEmoji}>📸</Text>
          <Text style={S.emptyTitle}>Добавьте фото работ</Text>
          <Text style={S.emptyDesc}>Мастера с портфолио получают в 3× больше записей</Text>
          <Pressable style={S.emptyBtn} onPress={showAddSheet}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={S.emptyBtnText}>Добавить первое фото</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={S.countLabel}>{photos.length} / {MAX_PHOTOS} фото · Клиенты видят ваши работы в профиле</Text>
          <FlatList
            data={photos}
            numColumns={3}
            keyExtractor={p => p.id}
            contentContainerStyle={S.grid}
            columnWrapperStyle={S.row}
            renderItem={({ item, index }) => (
              <Pressable style={S.cell} onPress={() => openPhoto(index)}>
                {item.photo_url ? (
                  <Image source={{ uri: item.photo_url }} style={S.cellImg} />
                ) : (
                  <View style={[S.cellImg, S.cellPlaceholder]}>
                    <Ionicons name="image-outline" size={28} color="#C8C2E8" />
                  </View>
                )}
              </Pressable>
            )}
            ListFooterComponent={
              canAdd ? (
                <Pressable style={[S.cell, S.addCell]} onPress={showAddSheet}>
                  <Ionicons name="add" size={32} color="#4A3DB0" />
                </Pressable>
              ) : null
            }
          />
        </>
      )}

      <FullscreenViewer
        photos={photos}
        initialIndex={viewerIndex}
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        onDelete={handleDelete}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F7FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F7FF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    backgroundColor: '#F8F7FF',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#EDE8FF', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1628' },
  addHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  addHeaderBtnDisabled: { opacity: 0.5 },
  addHeaderText: { fontSize: 14, fontWeight: '600', color: '#4A3DB0' },

  countLabel: {
    fontSize: 12, color: '#7A7286',
    paddingHorizontal: 16, paddingBottom: 12,
  },

  grid: { paddingHorizontal: 16, paddingBottom: 40 },
  row: { gap: 4, marginBottom: 4 },
  cell: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 10, overflow: 'hidden' },
  cellImg: { width: CELL_SIZE, height: CELL_SIZE },
  cellPlaceholder: { backgroundColor: '#EDE8FF', alignItems: 'center', justifyContent: 'center' },
  addCell: { backgroundColor: '#EDE8FF', alignItems: 'center', justifyContent: 'center' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A1628', marginBottom: 10 },
  emptyDesc: { fontSize: 14, color: '#7A7286', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#4A3DB0', borderRadius: 16,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  uploadSection: { paddingHorizontal: 16, paddingBottom: 8 },
  uploadRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 6,
    borderWidth: 1, borderColor: '#E2DCF0',
  },
  uploadThumb: {},
  uploadInfo: { flex: 1 },
  progressTrack: {
    height: 4, backgroundColor: '#E2DCF0', borderRadius: 2, overflow: 'hidden', marginBottom: 4,
  },
  progressFill: { height: 4, backgroundColor: '#4A3DB0', borderRadius: 2 },
  uploadPct: { fontSize: 12, color: '#7A7286' },
  uploadDone: { fontSize: 12, color: '#16A34A' },
  uploadError: { fontSize: 12, color: '#DC2626' },
});
