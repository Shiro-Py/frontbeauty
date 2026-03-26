import { getApiClient } from './client';
import { IS_MOCK } from './mock';

// In-memory store для mock-режима — общий на всё приложение
const mockFavoritesStore = new Set<string>();

export interface MasterDetail {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  bio?: string;
  rating: number;
  reviews_count: number;
  distance_km?: number;
  address?: string;
  portfolio: Array<{ id: string; photo_url: string }>;
  is_favorited?: boolean;
}

export interface MasterService {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  category: string;
}

export interface MasterReview {
  id: string;
  author_name: string;
  author_avatar?: string;
  rating: number;
  text: string;
  created_at: string;
}

// — MOCK DATA —
const mockMaster: MasterDetail = {
  id: '1',
  first_name: 'Мария',
  last_name: 'Иванова',
  bio: 'Профессиональный мастер маникюра с 7-летним опытом. Специализируюсь на современных техниках: гель-лак, акрил, наращивание. Слежу за тенденциями и регулярно повышаю квалификацию на курсах.',
  rating: 4.8,
  reviews_count: 134,
  distance_km: 1.2,
  address: 'ул. Садовая, 15',
  portfolio: [
    { id: 'p1', photo_url: '' },
    { id: 'p2', photo_url: '' },
    { id: 'p3', photo_url: '' },
    { id: 'p4', photo_url: '' },
  ],
};

const mockServices: MasterService[] = [
  { id: 's1', name: 'Маникюр классический', price: 1200, duration_minutes: 60, category: 'nails' },
  { id: 's2', name: 'Маникюр с гель-лаком', price: 1800, duration_minutes: 90, category: 'nails' },
  { id: 's3', name: 'Педикюр', price: 1500, duration_minutes: 75, category: 'nails' },
  { id: 's4', name: 'Наращивание ногтей', price: 3000, duration_minutes: 120, category: 'nails' },
];

const mockReviews: MasterReview[] = [
  {
    id: 'r1',
    author_name: 'Анна К.',
    rating: 5,
    text: 'Мария — настоящий профессионал! Работа аккуратная, результат держится долго.',
    created_at: '2026-03-10T10:00:00Z',
  },
  {
    id: 'r2',
    author_name: 'Елена М.',
    rating: 5,
    text: 'Очень довольна результатом, буду возвращаться снова.',
    created_at: '2026-03-05T14:30:00Z',
  },
  {
    id: 'r3',
    author_name: 'Ольга П.',
    rating: 4,
    text: 'Хорошая работа, чисто и аккуратно. Рекомендую.',
    created_at: '2026-02-28T09:00:00Z',
  },
];

export const getMasterDetail = async (id: string): Promise<MasterDetail> => {
  if (IS_MOCK) return { ...mockMaster, id };
  const api = getApiClient();
  const { data } = await api.get<MasterDetail>(`/specialists/${id}/`);
  return data;
};

export const getMasterServices = async (specialistId: string): Promise<MasterService[]> => {
  if (IS_MOCK) return mockServices;
  const api = getApiClient();
  const { data } = await api.get<MasterService[]>(`/services/?specialist=${specialistId}`);
  return data;
};

export const getMasterReviews = async (specialistId: string): Promise<MasterReview[]> => {
  if (IS_MOCK) return mockReviews;
  const api = getApiClient();
  const { data } = await api.get<MasterReview[]>(`/reviews/?specialist=${specialistId}`);
  return data;
};

export const toggleFavorite = async (specialistId: string): Promise<void> => {
  if (IS_MOCK) { mockFavoritesStore.add(specialistId); return; }
  const api = getApiClient();
  await api.post(`/specialists/${specialistId}/favorite/`);
};

export const removeFavorite = async (specialistId: string): Promise<void> => {
  if (IS_MOCK) { mockFavoritesStore.delete(specialistId); return; }
  const api = getApiClient();
  await api.delete(`/specialists/${specialistId}/favorite/`);
};

export const getFavorites = async (): Promise<MasterDetail[]> => {
  if (IS_MOCK) {
    const allMasters: MasterDetail[] = [
      { ...mockMaster, id: '1', first_name: 'Мария', last_name: 'Иванова' },
      { ...mockMaster, id: '2', first_name: 'Ольга', last_name: 'Смирнова', rating: 4.9, reviews_count: 87 },
      { ...mockMaster, id: '3', first_name: 'Анна', last_name: 'Петрова', rating: 4.7, reviews_count: 52 },
      { ...mockMaster, id: '4', first_name: 'Елена', last_name: 'Козлова', rating: 5.0, reviews_count: 210 },
    ];
    return allMasters.filter(m => mockFavoritesStore.has(m.id));
  }
  const api = getApiClient();
  const { data } = await api.get<MasterDetail[]>('/specialists/favorites/');
  return data;
};

export const isMasterFavorited = (specialistId: string): boolean =>
  IS_MOCK ? mockFavoritesStore.has(specialistId) : false;
