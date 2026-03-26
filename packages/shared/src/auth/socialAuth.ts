import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { useAuth } from './authStore';
import { tokenStorage } from '../storage/tokenStorage';
import {
  postVKAuth,
  postGoogleAuth,
  postAppleAuth,
  postYandexAuth,
} from '../api/socialAuth';
import type { SocialAuthResult } from '../api/socialAuth';

// Необходимо для корректного закрытия браузера после OAuth на Android
WebBrowser.maybeCompleteAuthSession();

// ─── Discovery endpoints ──────────────────────────────────────────────────────

const VK_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://oauth.vk.com/authorize',
};

const YANDEX_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://oauth.yandex.ru/authorize',
  tokenEndpoint: 'https://oauth.yandex.ru/token',
};

// ─── Общий обработчик результата ─────────────────────────────────────────────

function useSocialHandler() {
  const { signIn } = useAuth();

  const handleResult = useCallback(
    async (result: SocialAuthResult) => {
      await tokenStorage.save(result.access, result.refresh);
      // has_profile: false → новый пользователь → онбординг
      await signIn(result.access, result.refresh, !result.has_profile);
    },
    [signIn],
  );

  return { handleResult };
}

function parseSocialError(e: unknown): string {
  const code = (e as any)?.response?.data?.error?.code;
  if (code === 'EMAIL_ALREADY_EXISTS')
    return 'Этот email уже связан с другим аккаунтом';
  if (code === 'SOCIAL_AUTH_FAILED')
    return 'Ошибка авторизации через соцсеть. Попробуйте ещё раз';
  return 'Не удалось войти. Попробуйте ещё раз';
}

// ─── VK ──────────────────────────────────────────────────────────────────────

export function useVKAuth() {
  const { handleResult } = useSocialHandler();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = AuthSession.makeRedirectUri();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_VK_CLIENT_ID ?? '',
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
      scopes: ['email'],
    },
    VK_DISCOVERY,
  );

  useEffect(() => {
    if (response?.type !== 'success') return;
    const token = response.params.access_token;
    if (!token) return;
    setLoading(true);
    setError(null);
    postVKAuth(token)
      .then(handleResult)
      .catch((e) => setError(parseSocialError(e)))
      .finally(() => setLoading(false));
  }, [response]);

  return {
    signInWithVK: () => { setError(null); promptAsync(); },
    loading,
    error,
    ready: !!request,
  };
}

// ─── Google ───────────────────────────────────────────────────────────────────

export function useGoogleAuth() {
  const { handleResult } = useSocialHandler();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Если ключи не заданы в .env — передаём заглушку чтобы хук не падал при монтировании.
  // Кнопка будет задизаблена через `configured`.
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? 'not-configured',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? 'not-configured',
  });

  const configured =
    !!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
    !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.authentication?.idToken;
    if (!idToken) return;
    setLoading(true);
    setError(null);
    postGoogleAuth(idToken)
      .then(handleResult)
      .catch((e) => setError(parseSocialError(e)))
      .finally(() => setLoading(false));
  }, [response]);

  return {
    signInWithGoogle: () => { setError(null); promptAsync(); },
    loading,
    error,
    ready: !!request && configured,
  };
}

// ─── Apple (iOS only) ─────────────────────────────────────────────────────────

export function useAppleAuth() {
  const { handleResult } = useSocialHandler();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = Platform.OS === 'ios';

  const signInWithApple = async () => {
    if (!available) return;
    setError(null);
    setLoading(true);
    try {
      // Динамический импорт: модуль не существует на Android
      const AppleAuth =
        require('expo-apple-authentication') as typeof import('expo-apple-authentication');

      const credential = await AppleAuth.signInAsync({
        requestedScopes: [
          AppleAuth.AppleAuthenticationScope.FULL_NAME,
          AppleAuth.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) throw new Error('No identity token');

      const result = await postAppleAuth(credential.identityToken);
      await handleResult(result);
    } catch (e: any) {
      // ERR_CANCELED — пользователь закрыл окно, не показываем ошибку
      if (e?.code !== 'ERR_CANCELED') {
        setError(parseSocialError(e));
      }
    } finally {
      setLoading(false);
    }
  };

  return { signInWithApple, loading, error, available };
}

// ─── Yandex ───────────────────────────────────────────────────────────────────

export function useYandexAuth() {
  const { handleResult } = useSocialHandler();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = AuthSession.makeRedirectUri();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_YANDEX_CLIENT_ID ?? '',
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: false,
    },
    YANDEX_DISCOVERY,
  );

  useEffect(() => {
    if (response?.type !== 'success') return;
    const code = response.params.code;
    if (!code) return;
    setLoading(true);
    setError(null);
    postYandexAuth(code)
      .then(handleResult)
      .catch((e) => setError(parseSocialError(e)))
      .finally(() => setLoading(false));
  }, [response]);

  return {
    signInWithYandex: () => { setError(null); promptAsync(); },
    loading,
    error,
    ready: !!request,
  };
}
