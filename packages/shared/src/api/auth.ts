import { getApiClient } from './client';
import { IS_MOCK, MOCK_CODE, mockVerifyResponse, mockProfile } from './mock';

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
  try {
    await api.post('/auth/register/', { phone });
  } catch (err: any) {
    const code = err?.response?.data?.error?.code;
    if (code === 'PHONE_ALREADY_REGISTERED') {
      await api.post('/auth/login/', { phone });
    } else {
      throw err;
    }
  }
};

/**
 * Проверить OTP → получить JWT.
 * DEV: код 123456 всегда проходит
 */
export const verifyOtp = async (
  phone: string,
  code: string,
): Promise<VerifyOtpResponse> => {
  if (IS_MOCK) {
    if (code !== MOCK_CODE) {
      throw { response: { data: { error: { code: 'INVALID_CODE' } } } };
    }
    return mockVerifyResponse(phone);
  }
  const api = getApiClient();
  const { data } = await api.post<VerifyOtpResponse>('/auth/verify-otp/', { phone, code });
  return data;
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

/**
 * Выйти — добавить refresh в blacklist.
 */
export const logout = async (refreshToken: string): Promise<void> => {
  if (IS_MOCK) return;
  const api = getApiClient();
  await api.post('/auth/logout/', { refresh: refreshToken });
};

/**
 * Профиль текущего пользователя.
 * DEV: возвращает mock-данные
 */
export const getMe = async () => {
  if (IS_MOCK) return mockProfile;
  const api = getApiClient();
  const { data } = await api.get('/auth/profile/me/');
  return data;
};
