import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import OnboardingScreen from '../../app/auth/onboarding';

const mockUpdateClientProfile = jest.fn();
const mockSignIn = jest.fn();
const mockGetAccess = jest.fn().mockResolvedValue('access-token');
const mockGetRefresh = jest.fn().mockResolvedValue('refresh-token');

jest.mock('@beautygo/shared', () => ({
  updateClientProfile: (...args: any[]) => mockUpdateClientProfile(...args),
  useAuth: () => ({ signIn: mockSignIn }),
  tokenStorage: {
    getAccess: () => mockGetAccess(),
    getRefresh: () => mockGetRefresh(),
  },
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn() },
}));

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateClientProfile.mockResolvedValue(undefined);
  });

  it('рендерит заголовок и поля', () => {
    const { getByText, getByPlaceholderText } = render(<OnboardingScreen />);
    expect(getByText('Укажите свои данные')).toBeTruthy();
    expect(getByPlaceholderText('Ваше имя')).toBeTruthy();
    expect(getByPlaceholderText('E-mail')).toBeTruthy();
  });

  it('кнопка "Завершить регистрацию" disabled без имени и чекбокса', () => {
    const { getByText } = render(<OnboardingScreen />);
    const btn = getByText('Завершить регистрацию');
    expect(btn.props.accessibilityState?.disabled ?? true).toBeTruthy();
  });

  it('кнопка disabled если только имя (без чекбокса)', async () => {
    const { getByPlaceholderText, getByText } = render(<OnboardingScreen />);
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Ваше имя'), 'Иван');
    });
    const btn = getByText('Завершить регистрацию');
    expect(btn.props.accessibilityState?.disabled ?? true).toBeTruthy();
  });

  it('кнопка активна с именем и чекбоксом', async () => {
    const { getByPlaceholderText, getByText } = render(<OnboardingScreen />);
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Ваше имя'), 'Иван');
      fireEvent.press(getByText('Соглашаюсь с правилами сервиса'));
    });
    const btn = getByText('Завершить регистрацию');
    expect(btn.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('вызывает updateClientProfile при отправке', async () => {
    const { getByPlaceholderText, getByText } = render(<OnboardingScreen />);
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Ваше имя'), 'Иван');
      fireEvent.press(getByText('Соглашаюсь с правилами сервиса'));
    });
    await act(async () => {
      fireEvent.press(getByText('Завершить регистрацию'));
    });
    await waitFor(() => {
      expect(mockUpdateClientProfile).toHaveBeenCalledWith(
        expect.objectContaining({ first_name: 'Иван' }),
      );
    });
  });

  it('показывает экран успеха после отправки', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<OnboardingScreen />);
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Ваше имя'), 'Иван');
      fireEvent.press(getByText('Соглашаюсь с правилами сервиса'));
    });
    await act(async () => {
      fireEvent.press(getByText('Завершить регистрацию'));
    });
    expect(await findByText('Регистрация завершена!')).toBeTruthy();
  });

  it('кнопка "Понятно" вызывает signIn', async () => {
    const { getByPlaceholderText, getByText } = render(<OnboardingScreen />);
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Ваше имя'), 'Иван');
      fireEvent.press(getByText('Соглашаюсь с правилами сервиса'));
    });
    await act(async () => {
      fireEvent.press(getByText('Завершить регистрацию'));
    });
    await waitFor(() => expect(getByText('Понятно')).toBeTruthy());
    await act(async () => {
      fireEvent.press(getByText('Понятно'));
    });
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('access-token', 'refresh-token', false);
    });
  });
});
