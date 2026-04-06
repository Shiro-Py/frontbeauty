import { getApiClient } from './client';
import { IS_MOCK } from './mock';

export interface SocialAuthResult {
  access: string;
  refresh: string;
  is_new_user: boolean;
  phone_required: boolean;
  user: {
    id: string;
    phone: string | null;
    role: string;
    is_verified: boolean;
  };
}

const mockResult = (): SocialAuthResult => ({
  access: 'mock_access_token',
  refresh: 'mock_refresh_token',
  is_new_user: true,
  phone_required: false,
  user: { id: 'mock_social_user', phone: null, role: 'client', is_verified: false },
});

export const postVKAuth = async (accessToken: string): Promise<SocialAuthResult> => {
  if (IS_MOCK) return mockResult();
  const { data } = await getApiClient().post<SocialAuthResult>('/auth/social/vk/', {
    token: accessToken,
  });
  return data;
};

export const postGoogleAuth = async (idToken: string): Promise<SocialAuthResult> => {
  if (IS_MOCK) return mockResult();
  const { data } = await getApiClient().post<SocialAuthResult>('/auth/social/google/', {
    token: idToken,
  });
  return data;
};

export const postAppleAuth = async (identityToken: string): Promise<SocialAuthResult> => {
  if (IS_MOCK) return mockResult();
  const { data } = await getApiClient().post<SocialAuthResult>('/auth/social/apple/', {
    token: identityToken,
  });
  return data;
};

export const postYandexAuth = async (token: string): Promise<SocialAuthResult> => {
  if (IS_MOCK) return mockResult();
  const { data } = await getApiClient().post<SocialAuthResult>('/auth/social/yandex/', { token });
  return data;
};
