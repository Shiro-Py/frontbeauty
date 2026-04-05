import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import OtpScreen from '../../app/auth/otp';

const mockVerifyOtp = jest.fn();
const mockSendOtp = jest.fn();
const mockSignIn = jest.fn();

jest.mock('@beautygo/shared', () => ({
  verifyOtp: (...args: any[]) => mockVerifyOtp(...args),
  sendOtp: (...args: any[]) => mockSendOtp(...args),
  useAuth: () => ({ signIn: mockSignIn }),
  tokenStorage: { getDeviceId: jest.fn().mockResolvedValue('device-id') },
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({ phone: '+79001234567', mode: 'login' })),
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

describe('OTPScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyOtp.mockResolvedValue({
      access: 'access-token', refresh: 'refresh-token', is_new_user: false,
    });
    mockSendOtp.mockResolvedValue(undefined);
  });

  it('рендерится и показывает поле ввода кода', () => {
    const { getByPlaceholderText } = render(<OtpScreen />);
    expect(getByPlaceholderText('Введите код из SMS')).toBeTruthy();
  });

  it('показывает таймер "Запросить через" при первом рендере', () => {
    const { getByText } = render(<OtpScreen />);
    expect(getByText(/Запросить через/)).toBeTruthy();
  });

  it('вызывает verifyOtp при вводе 6 цифр', async () => {
    const { getByPlaceholderText } = render(<OtpScreen />);
    const input = getByPlaceholderText('Введите код из SMS');
    await act(async () => {
      fireEvent.changeText(input, '123456');
    });
    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith('+79001234567', '123456', 'device-id');
    });
  });

  it('НЕ вызывает verifyOtp при вводе менее 6 цифр', async () => {
    const { getByPlaceholderText } = render(<OtpScreen />);
    const input = getByPlaceholderText('Введите код из SMS');
    await act(async () => {
      fireEvent.changeText(input, '1234');
    });
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it('показывает ошибку "Неверный код" при INVALID_OTP', async () => {
    mockVerifyOtp.mockRejectedValue({
      response: { data: { error: { code: 'INVALID_OTP' } } },
    });
    const { getByPlaceholderText, findByText } = render(<OtpScreen />);
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Введите код из SMS'), '999999');
    });
    expect(await findByText('Неверный код')).toBeTruthy();
  });

  it('показывает ошибку при OTP_EXPIRED', async () => {
    mockVerifyOtp.mockRejectedValue({
      response: { data: { error: { code: 'OTP_EXPIRED' } } },
    });
    const { getByPlaceholderText, findByText } = render(<OtpScreen />);
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Введите код из SMS'), '999999');
    });
    expect(await findByText('Код истёк. Запросите новый')).toBeTruthy();
  });

  it('очищает поле после ошибки', async () => {
    mockVerifyOtp.mockRejectedValue({
      response: { data: { error: { code: 'INVALID_OTP' } } },
    });
    const { getByPlaceholderText } = render(<OtpScreen />);
    const input = getByPlaceholderText('Введите код из SMS');
    await act(async () => {
      fireEvent.changeText(input, '999999');
    });
    await waitFor(() => {
      expect(input.props.value).toBe('');
    });
  });

  it('вызывает signIn после успешной верификации', async () => {
    const { getByPlaceholderText } = render(<OtpScreen />);
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Введите код из SMS'), '123456');
    });
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('access-token', 'refresh-token', false);
    });
  });

  it('показывает заголовок "Подтверждение регистрации" в режиме register', () => {
    const { useLocalSearchParams } = require('expo-router');
    useLocalSearchParams.mockReturnValue({ phone: '+79001234567', mode: 'register' });
    const { getByText } = render(<OtpScreen />);
    expect(getByText('Подтверждение регистрации')).toBeTruthy();
  });
});
