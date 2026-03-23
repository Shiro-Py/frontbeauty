import { getApiClient } from './client';

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
 * Новый пользователь → POST /auth/register/
 * Существующий → POST /auth/login/ (если PHONE_ALREADY_REGISTERED)
 */
export const sendOtp = async (phone: string): Promise<void> => {
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
 * is_new_user: true → онбординг, false → главный экран
 */
export const verifyOtp = async (
  phone: string,
  code: string,
): Promise<VerifyOtpResponse> => {
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
  const api = getApiClient();
  await api.post('/auth/logout/', { refresh: refreshToken });
};

/**
 * Профиль текущего пользователя.
 */
export const getMe = async () => {
  const api = getApiClient();
  const { data } = await api.get('/auth/profile/me/');
  return data;
};
