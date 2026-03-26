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
  data: {
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
  };
}

export interface RegisterResponse {
  data: {
    id: string;
    phone: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

/**
 * Отправить OTP.
 * DEV: пропускаем реальный запрос, код всегда 123456
 */
export const sendOtp = async (phone: string): Promise<void> => {
  if (IS_MOCK) {
    console.log(`[DEV MOCK] Код для ${phone}: ${MOCK_CODE}`);
    return;
  }
  const api = getApiClient();
  await api.post('/auth/send-code/', { phone, purpose: 'login' });
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
    await api.patch('/clients/me/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  } else {
    await api.patch('/clients/me/', data);
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
      data: {
        id: 'mock_user_id',
        phone: '',
        first_name: firstName,
        last_name: lastName,
        role: 'client',
      },
    };
  }
  const api = getApiClient();
  const { data } = await api.post<RegisterResponse>('/auth/register/', {
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
  address?: string;
  lat?: number;
  lng?: number;
}

/**
 * Обновить профиль мастера (онбординг шаг 2).
 */
export const updateMasterProfile = async (data: MasterProfileUpdate): Promise<void> => {
  if (IS_MOCK) return;
  const api = getApiClient();
  await api.patch('/auth/masters/profile/', data);
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
  const { data } = await api.get<UserProfile>('/auth/profile/me/');
  return data;
};
