import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';
import { router } from 'expo-router';

import { logout as apiLogout } from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import { tokenStorage } from '../storage/tokenStorage';

export type AuthStatus = 'loading' | 'authorized' | 'unauthorized';

interface AuthState {
  status: AuthStatus;
  isNewUser: boolean;
}

type AuthAction =
  | { type: 'SET_AUTHORIZED' }
  | { type: 'SET_UNAUTHORIZED' }
  | { type: 'SET_NEW_USER'; payload: boolean };

interface AuthContextValue {
  status: AuthStatus;
  isNewUser: boolean;
  signIn: (access: string, refresh: string, isNewUser: boolean) => Promise<void>;
  signOut: () => Promise<void>;
}

const initialState: AuthState = { status: 'loading', isNewUser: false };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_AUTHORIZED':
      return { ...state, status: 'authorized' };
    case 'SET_UNAUTHORIZED':
      return { ...state, status: 'unauthorized', isNewUser: false };
    case 'SET_NEW_USER':
      return { ...state, isNewUser: action.payload };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const handleUnauthorized = useCallback(() => {
    dispatch({ type: 'SET_UNAUTHORIZED' });
    router.replace('/auth/phone');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized);
    (async () => {
      const access = await tokenStorage.getAccess();
      if (access) {
        dispatch({ type: 'SET_AUTHORIZED' });
      } else {
        dispatch({ type: 'SET_UNAUTHORIZED' });
      }
    })();
  }, [handleUnauthorized]);

  useEffect(() => {
    if (state.status === 'loading') return;
    if (state.status === 'authorized') {
      router.replace(state.isNewUser ? '/auth/onboarding' : '/(tabs)/masters');
    } else {
      router.replace('/auth/phone');
    }
  }, [state.status, state.isNewUser]);

  const signIn = useCallback(
    async (access: string, refresh: string, isNewUser: boolean) => {
      await tokenStorage.save(access, refresh);
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
    <AuthContext.Provider value={{ status: state.status, isNewUser: state.isNewUser, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
