import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// jest.mock is hoisted — define mocks inline, not via outer variables
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

jest.mock('@ayla/shared', () => ({
  useVKAuth: jest.fn(() => ({ ready: true, loading: false, error: null, signInWithVK: jest.fn() })),
  useGoogleAuth: jest.fn(() => ({ ready: true, loading: false, error: null, signInWithGoogle: jest.fn() })),
  useAppleAuth: jest.fn(() => ({ available: false, loading: false, error: null, signInWithApple: jest.fn() })),
  tokenStorage: { getAnonymous: jest.fn().mockResolvedValue(null) },
}));

import EntryScreen from '../../app/auth/entry';
import { router } from 'expo-router';

const push = router.push as jest.Mock;

describe('EntryScreen', () => {
  beforeEach(() => push.mockClear());

  it('рендерит заголовок "Добро пожаловать!"', async () => {
    const { findByText } = render(<EntryScreen />);
    expect(await findByText('Добро пожаловать!')).toBeTruthy();
  });

  it('рендерит кнопки "Авторизация" и "Регистрация"', async () => {
    const { findByText } = render(<EntryScreen />);
    expect(await findByText('Авторизация')).toBeTruthy();
    expect(await findByText('Регистрация')).toBeTruthy();
  });

  it('кнопка "Авторизация" навигирует с mode=login', async () => {
    const { findByText } = render(<EntryScreen />);
    fireEvent.press(await findByText('Авторизация'));
    expect(push).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ mode: 'login' }) }),
    );
  });

  it('кнопка "Регистрация" навигирует с mode=register', async () => {
    const { findByText } = render(<EntryScreen />);
    fireEvent.press(await findByText('Регистрация'));
    expect(push).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ mode: 'register' }) }),
    );
  });

  it('рендерит кнопку "Войти с Google"', async () => {
    const { findByText } = render(<EntryScreen />);
    expect(await findByText('Войти с Google')).toBeTruthy();
  });

  it('рендерит кнопку "Войти с VKID"', async () => {
    const { findByText } = render(<EntryScreen />);
    expect(await findByText('Войти с VKID')).toBeTruthy();
  });

  it('кнопка Google вызывает signInWithGoogle', async () => {
    const mockSignIn = jest.fn();
    const { useGoogleAuth } = require('@ayla/shared');
    useGoogleAuth.mockReturnValue({ ready: true, loading: false, error: null, signInWithGoogle: mockSignIn });
    const { findByText } = render(<EntryScreen />);
    fireEvent.press(await findByText('Войти с Google'));
    expect(mockSignIn).toHaveBeenCalled();
  });

  it('кнопка Google disabled когда ready=false', async () => {
    const { useGoogleAuth } = require('@ayla/shared');
    useGoogleAuth.mockReturnValue({ ready: false, loading: false, error: null, signInWithGoogle: jest.fn() });
    const { findByText } = render(<EntryScreen />);
    const btn = (await findByText('Войти с Google')).parent?.parent;
    expect(btn?.props.accessibilityState?.disabled).toBeTruthy();
  });
});
