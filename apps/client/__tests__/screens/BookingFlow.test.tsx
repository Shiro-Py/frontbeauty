import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SlotsScreen from '../../app/booking/slots';
import SummaryScreen from '../../app/booking/summary';

const mockGetSlots = jest.fn();
const mockCreateBooking = jest.fn();

jest.mock('@beautygo/shared', () => ({
  getSlots: (...args: any[]) => mockGetSlots(...args),
  createBooking: (...args: any[]) => mockCreateBooking(...args),
}));

// Определяем функции внутри фабрики — они не подвержены hoisting-проблеме
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({
    specialist_id: 'master-1',
    specialist_name: 'Мария Иванова',
    service_id: 'srv-1',
    service_name: 'Маникюр',
    service_price: '1500',
    service_duration: '60',
    date: '2026-04-15',
    time: '10:00',
  }),
}));

import { router } from 'expo-router';
const mockPush = router.push as jest.Mock;
const mockReplace = router.replace as jest.Mock;
const mockBack = router.back as jest.Mock;

describe('SlotsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSlots.mockResolvedValue(['10:00', '11:00', '14:00']);
  });

  it('отображает экран выбора слотов', async () => {
    const { findByTestId } = render(<SlotsScreen />);
    expect(await findByTestId('slots-screen')).toBeTruthy();
  });

  it('отображает доступные слоты', async () => {
    const { findByTestId } = render(<SlotsScreen />);
    expect(await findByTestId('slot-item-0')).toBeTruthy();
    expect(await findByTestId('slot-item-1')).toBeTruthy();
  });

  it('выбирает слот и показывает кнопку продолжить', async () => {
    const { findByTestId } = render(<SlotsScreen />);
    const slot = await findByTestId('slot-item-0');
    fireEvent.press(slot);
    const nextBtn = await findByTestId('slots-next-btn');
    expect(nextBtn).toBeTruthy();
  });

  it('вызывает навигацию при нажатии «Продолжить»', async () => {
    const { findByTestId } = render(<SlotsScreen />);
    fireEvent.press(await findByTestId('slot-item-0'));
    fireEvent.press(await findByTestId('slots-next-btn'));
    expect(mockPush).toHaveBeenCalled();
  });
});

describe('SummaryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateBooking.mockResolvedValue({ id: 'b1', status: 'pending' });
  });

  it('отображает кнопку подтверждения', async () => {
    const { findByTestId } = render(<SummaryScreen />);
    expect(await findByTestId('confirm-btn')).toBeTruthy();
  });

  it('создаёт бронирование при нажатии', async () => {
    const { findByTestId } = render(<SummaryScreen />);
    fireEvent.press(await findByTestId('confirm-btn'));
    await waitFor(() => {
      expect(mockCreateBooking).toHaveBeenCalled();
    });
  });

  it('отображает данные записи', async () => {
    const { findByText } = render(<SummaryScreen />);
    expect(await findByText('Мария Иванова')).toBeTruthy();
    expect(await findByText('Маникюр')).toBeTruthy();
  });
});
