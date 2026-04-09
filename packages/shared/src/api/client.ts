import axios from 'axios';
import { tokenStorage } from '../storage/tokenStorage';

export const BASE_URL = 'https://dev.gobeauty.site/api/v1';

export type AppType = 'client' | 'pro';

let _apiClient: ReturnType<typeof axios.create> | null = null;
let _appType: AppType = 'client';
let _onUnauthorized: (() => void) | null = null;
let _onDeviceMismatch: (() => void) | null = null;

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((p) => (token ? p.resolve(token) : p.reject(error)));
  failedQueue = [];
};

export function initializeApiClient(appType: AppType): void {
  _appType = appType;

  _apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      'X-App-Type': appType,
    },
  });

  // Request interceptor — добавляет access token и X-Device-Id
  // Приоритет: полноценный JWT > anonymous JWT
  _apiClient.interceptors.request.use(async (config) => {
    const [accessToken, anonymousToken, deviceId] = await Promise.all([
      tokenStorage.getAccess(),
      tokenStorage.getAnonymous(),
      tokenStorage.getDeviceId(),
    ]);
    const token = accessToken || anonymousToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    config.headers['X-Device-Id'] = deviceId;
    return config;
  });

  // Response interceptor — при 401 рефрешит токен и ретраит запрос
  _apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401) {
        const errorCode = error.response?.data?.error?.code;
        if (errorCode === 'DEVICE_MISMATCH') {
          await tokenStorage.clear();
          _onDeviceMismatch?.();
          return Promise.reject(error);
        }
      }

      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.url?.includes('/auth/token/refresh/') &&
        !originalRequest.url?.includes('/auth/logout/')
      ) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return _apiClient!(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = await tokenStorage.getRefresh();
          if (!refreshToken) throw new Error('No refresh token');

          const { data } = await axios.post(
            `${BASE_URL}/auth/token/refresh/`,
            { refresh: refreshToken },
            { headers: { 'Content-Type': 'application/json', 'X-App-Type': _appType } },
          );

          const newAccess: string = data.access ?? data.data?.access;
          const newRefresh: string = data.refresh ?? data.data?.refresh ?? refreshToken;

          await tokenStorage.save(newAccess, newRefresh);
          processQueue(null, newAccess);

          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return _apiClient!(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          await tokenStorage.clear();
          _onUnauthorized?.();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    },
  );
}

export function getApiClient() {
  if (!_apiClient) {
    throw new Error('API client not initialized. Call initializeApiClient(appType) first.');
  }
  return _apiClient;
}

export function setUnauthorizedHandler(handler: () => void) {
  _onUnauthorized = handler;
}

export function setDeviceMismatchHandler(handler: () => void) {
  _onDeviceMismatch = handler;
}
