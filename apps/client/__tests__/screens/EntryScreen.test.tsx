import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// jest.mock is hoisted — define mocks inline, not via outer variables
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

jest.mock('@beautygo/shared', () => ({
  useVKAuth: jest.fn(() => ({ ready: true, loading: false, error: null, signInWithVK: jest.fn() })),
  useGoogleAuth: jest.fn(() => ({ ready: true, loading: false, error: null, signInWithGoogle: jest.fn() })),
  useAppleAuth: jest.fn(() => ({ available: false, loading: false, error: null, signInWithApple: jest.fn() })),
}));

import EntryScreen from '../../app/auth/entry';
import { router } from 'expo-router';

const push = router.push as jest.Mock;

describe('EntryScreen', () => {
  beforeEach(() => push.mockClear());

  it('рендерит заголовок "Добро пожаловать!"', () => {
    const { getByText } = render(<EntryScreen />);
    expect(getByText('Добро пожаловать!')).toBeTruthy();
  });

  it('рендерит кнопки "Авторизация" и "Регистрация"', () => {
    const { getByText } = render(<EntryScreen />);
    expect(getByText('Авторизация')).toBeTruthy();
    expect(getByText('Регистрация')).toBeTruthy();
  });

  it('кнопка "Авторизация" навигирует с mode=login', () => {
    const { getByText } = render(<EntryScreen />);
    fireEvent.press(getByText('Авторизация'));
    expect(push).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ mode: 'login' }) }),
    );
  });

  it('кнопка "Регистрация" навигирует с mode=register', () => {
    const { getByText } = render(<EntryScreen />);
    fireEvent.press(getByText('Регистрация'));
    expect(push).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ mode: 'register' }) }),
    );
  });

  it('рендерит кнопку "Войти с Google"', () => {
    const { getByText } = render(<EntryScreen />);
    expect(getByText('Войти с Google')).toBeTruthy();
  });

  it('рендерит кнопку "Войти с VKID"', () => {
    const { getByText } = render(<EntryScreen />);
    expect(getByText('Войти с VKID')).toBeTruthy();
  });

  it('кнопка Google вызывает signInWithGoogle', () => {
    const mockSignIn = jest.fn();
    const { useGoogleAuth } = require('@beautygo/shared');
    useGoogleAuth.mockReturnValue({ ready: true, loading: false, error: null, signInWithGoogle: mockSignIn });
    const { getByText } = render(<EntryScreen />);
    fireEvent.press(getByText('Войти с Google'));
    expect(mockSignIn).toHaveBeenCalled();
  });

  it('кнопка Google disabled когда ready=false', () => {
    const { useGoogleAuth } = require('@beautygo/shared');
    useGoogleAuth.mockReturnValue({ ready: false, loading: false, error: null, signInWithGoogle: jest.fn() });
    const { getByText } = render(<EntryScreen />);
    const btn = getByText('Войти с Google').parent?.parent;
    expect(btn?.props.accessibilityState?.disabled).toBeTruthy();
  });
});
