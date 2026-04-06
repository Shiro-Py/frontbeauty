import { getApiClient } from './client';
import { IS_MOCK, MOCK_CODE, mockVerifyResponse, mockProfile } from './mock';

export interface UserProfile {
  id: string;
  phone: string;
  role: string;
  is_verified?: boolean;
  first_name?: string;
  last_name?: string;
  city?: string;
  avatar_url?: string;
}

export interface VerifyOtpResponse {
  access: string;
  refresh: string;
  is_new_user: boolean;
  user?: {
    id: string;
    phone: string;
    role: string;
    is_verified: boolean;
    first_name?: string;
    last_name?: string;
  };
}

export interface RegisterResponse {
  id: string;
  phone: string;
  first_name: string;
  last_name: string;
  role: string;
}

export interface RequestOtpResponse {
  expires_in: number;    // 300 секунд
  retry_after: number;   // 60 секунд
  is_new_user: boolean;  // true — регистрация, false — вход
}

/**
 * Отправить OTP.
 * DEV: пропускаем реальный запрос, код всегда 123456
 */
export const sendOtp = async (phone: string): Promise<RequestOtpResponse> => {
  if (IS_MOCK) {
    console.log(`[DEV MOCK] Код для ${phone}: ${MOCK_CODE}`);
    return { expires_in: 300, retry_after: 60, is_new_user: false };
  }
  const api = getApiClient();
  const { data } = await api.post<RequestOtpResponse>('/auth/request-otp', { phone });
  return data;
};

/**
 * Проверить OTP → получить JWT.
 * DEV: код 123456 всегда проходит
 */
export const verifyOtp = async (
  phone: string,
  code: string,
  deviceId: string,
): Promise<VerifyOtpResponse> => {
  if (IS_MOCK) {
    if (code !== MOCK_CODE) {
      throw { response: { data: { error: { code: 'INVALID_OTP' } } } };
    }
    return mockVerifyResponse(phone);
  }
  const api = getApiClient();
  const { data } = await api.post<VerifyOtpResponse>('/auth/verify-otp/', {
    phone,
    code,
    device_id: deviceId,
  });
  return data;
};

export interface ClientProfileUpdate {
  first_name?: string;
  last_name?: string;
  city?: string;
  avatar?: { uri: string; name: string; type: string };
}

/**
 * Обновить профиль клиента (онбординг и профиль).
 */
export const updateClientProfile = async (data: ClientProfileUpdate): Promise<void> => {
  if (IS_MOCK) return;
  const api = getApiClient();
  if (data.avatar) {
    const formData = new FormData();
    if (data.first_name) formData.append('first_name', data.first_name);
    if (data.last_name) formData.append('last_name', data.last_name);
    if (data.city) formData.append('city', data.city);
    formData.append('avatar', data.avatar as any);
    await api.patch('/auth/clients/me/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  } else {
    await api.patch('/auth/clients/me/', data);
  }
};

/**
 * Завершить регистрацию (только для новых пользователей).
 */
export const completeRegistration = async (
  firstName: string,
  lastName: string,
): Promise<RegisterResponse> => {
  if (IS_MOCK) {
    return {
      id: 'mock_user_id',
      phone: '',
      first_name: firstName,
      last_name: lastName,
      role: 'client',
    };
  }
  const api = getApiClient();
  const { data } = await api.post<RegisterResponse>('/auth/complete-profile/', {
    first_name: firstName,
    last_name: lastName,
  });
  return data;
};

export interface MasterProfileCreate {
  first_name: string;
  last_name: string;
  bio?: string;
  avatar: { uri: string; name: string; type: string };
}

/**
 * Создать профиль мастера (онбординг шаг 1).
 */
export const createMasterProfile = async (data: MasterProfileCreate): Promise<void> => {
  if (IS_MOCK) return;
  const api = getApiClient();
  const formData = new FormData();
  formData.append('first_name', data.first_name);
  formData.append('last_name', data.last_name);
  if (data.bio) formData.append('bio', data.bio);
  formData.append('avatar', data.avatar as any);
  await api.post('/masters/profile/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export interface ServiceData {
  name: string;
  price: number;
  duration_minutes: number;
  category: string;
}

/**
 * Создать услугу мастера.
 */
export const createService = async (data: ServiceData): Promise<void> => {
  if (IS_MOCK) return;
  const api = getApiClient();
  await api.post('/services/', data);
};

export interface MasterProfileUpdate {
  first_name?: string;
  last_name?: string;
  bio?: string;
  address?: string;
  lat?: number;
  lng?: number;
  avatar?: { uri: string; name: string; type: string };
}

/**
 * Обновить профиль мастера.
 */
export const updateMasterProfile = async (data: MasterProfileUpdate): Promise<void> => {
  if (IS_MOCK) return;
  const api = getApiClient();
  if (data.avatar) {
    const formData = new FormData();
    if (data.first_name) formData.append('first_name', data.first_name);
    if (data.last_name) formData.append('last_name', data.last_name);
    if (data.bio !== undefined) formData.append('bio', data.bio);
    if (data.address) formData.append('address', data.address);
    if (data.lat != null) formData.append('lat', String(data.lat));
    if (data.lng != null) formData.append('lng', String(data.lng));
    formData.append('avatar', data.avatar as any);
    await api.patch('/masters/profile/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  } else {
    await api.patch('/masters/profile/', data);
  }
};

export interface MasterMyProfile {
  id: string;
  first_name: string;
  last_name: string;
  bio?: string;
  avatar_url?: string;
  phone?: string;
  address?: string;
  rating?: number;
  reviews_count?: number;
  verification_level: 0 | 1 | 2 | 3 | 4;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  phone_verified: boolean;
}

const mockMasterProfile: MasterMyProfile = {
  id: 'mock_master_id',
  first_name: 'Mock',
  last_name: 'Master',
  bio: 'Профессиональный мастер с опытом работы.',
  phone: '+79000000000',
  address: 'ул. Садовая, 15, Москва',
  rating: 4.8,
  reviews_count: 12,
  verification_level: 1,
  status: 'pending',
  phone_verified: true,
};

/**
 * Профиль текущего мастера.
 */
export const getMasterMe = async (): Promise<MasterMyProfile> => {
  if (IS_MOCK) return { ...mockMasterProfile };
  const api = getApiClient();
  const { data } = await api.get<MasterMyProfile>('/masters/me/');
  return data;
};

/**
 * Выйти — добавить refresh в blacklist.
 */
export const logout = async (refreshToken: string): Promise<void> => {
  if (IS_MOCK) return;
  const api = getApiClient();
  await api.post('/auth/logout/', { refresh: refreshToken });
};

/**
 * Удалить аккаунт (деактивация, 30 дней на восстановление).
 */
export const deleteAccount = async (): Promise<void> => {
  if (IS_MOCK) return;
  const api = getApiClient();
  await api.delete('/users/me/', { data: { confirmation: 'DELETE' } });
};

/**
 * Профиль текущего пользователя.
 * DEV: возвращает mock-данные
 */
export const getMe = async (): Promise<UserProfile> => {
  if (IS_MOCK) return mockProfile;
  const api = getApiClient();
  const { data } = await api.get<UserProfile>('/auth/clients/me/');
  return data;
};
