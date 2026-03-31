import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({ mode: 'login' })),
  router: { push: jest.fn(), back: jest.fn() },
}));

jest.mock('@beautygo/shared', () => ({
  sendOtp: jest.fn().mockResolvedValue(undefined),
}));

import PhoneScreen from '../../app/auth/phone';
import { router } from 'expo-router';
import { sendOtp } from '@beautygo/shared';

const push = router.push as jest.Mock;
const mockSendOtp = sendOtp as jest.Mock;

describe('PhoneScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendOtp.mockResolvedValue(undefined);
  });

  it('рендерится с заголовком и полем ввода', () => {
    const { getByText, getByPlaceholderText } = render(<PhoneScreen />);
    expect(getByText('Введите номер телефона')).toBeTruthy();
    expect(getByPlaceholderText('Номер телефона')).toBeTruthy();
  });

  it('кнопка "Продолжить" disabled без ввода', () => {
    const { getByText } = render(<PhoneScreen />);
    const btn = getByText('Продолжить');
    expect(btn.props.accessibilityState?.disabled ?? true).toBeTruthy();
  });

  it('кнопка активна при вводе 10 цифр', async () => {
    const { getByPlaceholderText, getByText } = render(<PhoneScreen />);
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Номер телефона'), '9001234567');
    });
    const btn = getByText('Продолжить');
    expect(btn.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('показывает ошибку при вводе неполного номера', async () => {
    const { getByPlaceholderText, findByText } = render(<PhoneScreen />);
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Номер телефона'), '900');
    });
    expect(await findByText('Некорректный номер телефона')).toBeTruthy();
  });

  it('вызывает sendOtp с правильным номером', async () => {
    const { getByPlaceholderText, getByText } = render(<PhoneScreen />);
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Номер телефона'), '9001234567');
    });
    await act(async () => {
      fireEvent.press(getByText('Продолжить'));
    });
    await waitFor(() => {
      expect(mockSendOtp).toHaveBeenCalledWith('+79001234567');
    });
  });

  it('навигирует на /auth/otp после отправки', async () => {
    const { getByPlaceholderText, getByText } = render(<PhoneScreen />);
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Номер телефона'), '9001234567');
    });
    await act(async () => {
      fireEvent.press(getByText('Продолжить'));
    });
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: '/auth/otp' }),
      );
    });
  });

  it('показывает ошибку RATE_LIMITED', async () => {
    mockSendOtp.mockRejectedValue({
      response: { data: { error: { code: 'RATE_LIMITED' } } },
    });
    const { getByPlaceholderText, getByText, findByText } = render(<PhoneScreen />);
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Номер телефона'), '9001234567');
    });
    await act(async () => {
      fireEvent.press(getByText('Продолжить'));
    });
    expect(await findByText(/Слишком много запросов/)).toBeTruthy();
  });
});
