import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';
import { router } from 'expo-router';

import { logout as apiLogout, getMe } from '../api/auth';
import type { UserProfile } from '../api/auth';
import { setUnauthorizedHandler, setDeviceMismatchHandler } from '../api/client';
import { tokenStorage } from '../storage/tokenStorage';

export type AuthStatus = 'loading' | 'authorized' | 'unauthorized';

interface AuthState {
  status: AuthStatus;
  isNewUser: boolean;
  user: UserProfile | null;
}

type AuthAction =
  | { type: 'SET_AUTHORIZED' }
  | { type: 'SET_UNAUTHORIZED' }
  | { type: 'SET_NEW_USER'; payload: boolean }
  | { type: 'SET_USER'; payload: UserProfile | null };

interface AuthContextValue {
  status: AuthStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  isNewUser: boolean;
  user: UserProfile | null;
  signIn: (access: string, refresh: string, isNewUser: boolean, user?: UserProfile | null) => Promise<void>;
  signOut: () => Promise<void>;
}

const initialState: AuthState = { status: 'loading', isNewUser: false, user: null };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_AUTHORIZED':
      return { ...state, status: 'authorized' };
    case 'SET_UNAUTHORIZED':
      return { ...state, status: 'unauthorized', isNewUser: false, user: null };
    case 'SET_NEW_USER':
      return { ...state, isNewUser: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const handleUnauthorized = useCallback(() => {
    dispatch({ type: 'SET_UNAUTHORIZED' });
    router.replace('/auth/entry' as any);
  }, []);

  const handleDeviceMismatch = useCallback(() => {
    dispatch({ type: 'SET_UNAUTHORIZED' });
    router.replace('/auth/entry' as any);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized);
    setDeviceMismatchHandler(handleDeviceMismatch);

    (async () => {
      // Минимальное время показа splash-экрана
      await new Promise<void>(r => setTimeout(r, 1500));

      const access = await tokenStorage.getAccess();
      if (!access) {
        dispatch({ type: 'SET_UNAUTHORIZED' });
        return;
      }

      try {
        // Валидируем токен вызовом getMe — interceptor сам обновит его при 401
        const user = await getMe();
        dispatch({ type: 'SET_USER', payload: user });
        dispatch({ type: 'SET_AUTHORIZED' });
      } catch (error: any) {
        if (!error.response || error.response.status !== 401) {
          // Нет сети или сервер недоступен (5xx) — считаем токен валидным
          dispatch({ type: 'SET_AUTHORIZED' });
        }
        // 401: interceptor уже вызвал handleUnauthorized / handleDeviceMismatch
      }
    })();
  }, [handleUnauthorized, handleDeviceMismatch]);

  useEffect(() => {
    if (state.status === 'loading') return;
    if (state.status === 'authorized') {
      router.replace(state.isNewUser ? '/auth/onboarding' : '/(tabs)/masters');
    } else {
      router.replace('/auth/entry' as any);
    }
  }, [state.status, state.isNewUser]);

  const signIn = useCallback(
    async (access: string, refresh: string, isNewUser: boolean, user?: UserProfile | null) => {
      await tokenStorage.save(access, refresh);
      if (user) dispatch({ type: 'SET_USER', payload: user });
      dispatch({ type: 'SET_NEW_USER', payload: isNewUser });
      dispatch({ type: 'SET_AUTHORIZED' });
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      const refresh = await tokenStorage.getRefresh();
      if (refresh) await apiLogout(refresh);
    } catch {
      // игнорируем сетевые ошибки
    } finally {
      await tokenStorage.clear();
      dispatch({ type: 'SET_UNAUTHORIZED' });
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        status: state.status,
        isAuthenticated: state.status === 'authorized',
        isLoading: state.status === 'loading',
        isNewUser: state.isNewUser,
        user: state.user,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
