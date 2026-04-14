// Мок активен только в dev-сборке (__DEV__ = true в Expo Go / Metro)
// В production-билде автоматически выключается
// Переопределяется через EXPO_PUBLIC_USE_MOCK=false в apps/client/.env
const _envMock = process.env.EXPO_PUBLIC_USE_MOCK;
export const IS_MOCK = _envMock !== undefined ? _envMock !== 'false' : __DEV__;

export const MOCK_CODE = '123456';

export const mockVerifyResponse = (phone: string, isNewUser = false) => ({
  access_token: 'mock_access_token',
  refresh_token: 'mock_refresh_token',
  is_new_user: isNewUser,
  user: {
    id: 'mock_user_id',
    phone,
    role: 'client',
    is_verified: true,
    first_name: 'Mock',
    last_name: 'User',
  },
});

export const mockProfile = {
  id: 'mock_user_id',
  phone: '+79000000000',
  first_name: 'Mock',
  last_name: 'User',
  role: 'client',
  city: 'Москва',
  avatar_url: undefined,
};
