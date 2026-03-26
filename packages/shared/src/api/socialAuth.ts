import { getApiClient } from './client';
import { IS_MOCK } from './mock';

export interface SocialAuthResult {
  access: string;
  refresh: string;
  has_profile: boolean;
}

const mockResult = (): SocialAuthResult => ({
  access: 'mock_access_token',
  refresh: 'mock_refresh_token',
  has_profile: false, // false → пойдёт на онбординг
});

export const postVKAuth = async (accessToken: string): Promise<SocialAuthResult> => {
  if (IS_MOCK) return mockResult();
  const { data } = await getApiClient().post<SocialAuthResult>('/auth/social/vk/', {
    access_token: accessToken,
  });
  return data;
};

export const postGoogleAuth = async (idToken: string): Promise<SocialAuthResult> => {
  if (IS_MOCK) return mockResult();
  const { data } = await getApiClient().post<SocialAuthResult>('/auth/social/google/', {
    id_token: idToken,
  });
  return data;
};

export const postAppleAuth = async (identityToken: string): Promise<SocialAuthResult> => {
  if (IS_MOCK) return mockResult();
  const { data } = await getApiClient().post<SocialAuthResult>('/auth/social/apple/', {
    identity_token: identityToken,
  });
  return data;
};

export const postYandexAuth = async (code: string): Promise<SocialAuthResult> => {
  if (IS_MOCK) return mockResult();
  const { data } = await getApiClient().post<SocialAuthResult>('/auth/social/yandex/', { code });
  return data;
};
