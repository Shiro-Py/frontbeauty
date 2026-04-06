import { getApiClient } from './client';
import { IS_MOCK } from './mock';

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  duration_minutes: number;
  buffer_after_minutes?: number;
  category: string;
  is_active: boolean;
  sort_order: number;
  photo?: string | null;
}

export interface ServiceCreateData {
  name: string;
  description?: string;
  price: number;
  duration_minutes: number;
  buffer_after_minutes?: number;
  category: string;
  photo?: { uri: string; name: string; type: string };
}

export interface ServiceUpdateData {
  name?: string;
  description?: string;
  price?: number;
  duration_minutes?: number;
  buffer_after_minutes?: number;
  category?: string;
  is_active?: boolean;
  sort_order?: number;
  photo?: { uri: string; name: string; type: string };
}

let _mockIdCounter = 10;
const _mockServices: Service[] = [
  { id: '1', name: 'Стрижка женская', price: 1500, duration_minutes: 60, category: 'hair', is_active: true, sort_order: 10 },
  { id: '2', name: 'Укладка', price: 800, duration_minutes: 45, category: 'hair', is_active: true, sort_order: 20 },
  { id: '3', name: 'Маникюр классический', price: 1200, duration_minutes: 60, category: 'nails', is_active: true, sort_order: 30 },
  { id: '4', name: 'Педикюр', price: 1400, duration_minutes: 75, category: 'nails', is_active: false, sort_order: 40 },
];

export const getServices = async (): Promise<Service[]> => {
  if (IS_MOCK) return [..._mockServices].sort((a, b) => a.sort_order - b.sort_order);
  const api = getApiClient();
  const { data } = await api.get<Service[]>('/services/');
  return data;
};

export const addService = async (payload: ServiceCreateData): Promise<Service> => {
  if (IS_MOCK) {
    const svc: Service = {
      id: String(++_mockIdCounter),
      name: payload.name,
      price: payload.price,
      duration_minutes: payload.duration_minutes,
      category: payload.category,
      is_active: true,
      sort_order: (_mockServices.length + 1) * 10,
    };
    _mockServices.push(svc);
    return svc;
  }
  const api = getApiClient();
  if (payload.photo) {
    const form = new FormData();
    form.append('name', payload.name);
    form.append('price', String(payload.price));
    form.append('duration_minutes', String(payload.duration_minutes));
    form.append('category', payload.category);
    if (payload.description) form.append('description', payload.description);
    if (payload.buffer_after_minutes !== undefined) form.append('buffer_after_minutes', String(payload.buffer_after_minutes));
    form.append('image', payload.photo as any);
    const { data } = await api.post<Service>('/services/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }
  const { data } = await api.post<Service>('/services/', payload);
  return data;
};

export const updateService = async (id: string, payload: ServiceUpdateData): Promise<Service> => {
  if (IS_MOCK) {
    const idx = _mockServices.findIndex(s => s.id === id);
    if (idx !== -1) Object.assign(_mockServices[idx], payload);
    return _mockServices[idx] ?? _mockServices[0];
  }
  const api = getApiClient();
  if (payload.photo) {
    const form = new FormData();
    if (payload.name !== undefined) form.append('name', payload.name);
    if (payload.description !== undefined) form.append('description', payload.description);
    if (payload.price !== undefined) form.append('price', String(payload.price));
    if (payload.duration_minutes !== undefined) form.append('duration_minutes', String(payload.duration_minutes));
    if (payload.buffer_after_minutes !== undefined) form.append('buffer_after_minutes', String(payload.buffer_after_minutes));
    if (payload.category !== undefined) form.append('category', payload.category);
    if (payload.is_active !== undefined) form.append('is_active', String(payload.is_active));
    form.append('image', payload.photo as any);
    const { data } = await api.patch<Service>(`/services/${id}/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }
  const { data } = await api.patch<Service>(`/services/${id}/`, payload);
  return data;
};

export const deleteService = async (id: string): Promise<void> => {
  if (IS_MOCK) {
    const idx = _mockServices.findIndex(s => s.id === id);
    if (idx !== -1) _mockServices.splice(idx, 1);
    return;
  }
  const api = getApiClient();
  await api.delete(`/services/${id}/`);
};
