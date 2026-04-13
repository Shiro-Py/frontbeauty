import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// useFocusEffect must behave like useEffect (async, after render) to prevent infinite loops
jest.mock('expo-router', () => {
  const RealReact = require('react');
  return {
    useFocusEffect: (cb: () => any) => RealReact.useEffect(cb, []),
    useRouter: jest.fn(() => ({ push: jest.fn() })),
  };
});

jest.mock('@beautygo/shared', () => ({
  getSpecialists: jest.fn(),
  getMe: jest.fn(),
  toggleFavorite: jest.fn().mockResolvedValue(undefined),
  removeFavorite: jest.fn().mockResolvedValue(undefined),
  isMasterFavorited: jest.fn(() => false),
}));

import HomeFeedScreen from '../../app/(tabs)/masters';
import { useRouter } from 'expo-router';
import { getSpecialists, getMe } from '@beautygo/shared';

const mockGetSpecialists = getSpecialists as jest.Mock;
const mockGetMe = getMe as jest.Mock;

const mockSpecialists = [
  {
    id: '1',
    first_name: 'Мария',
    last_name: 'Иванова',
    rating: 4.8,
    reviews_count: 10,
    top_service: { name: 'Маникюр', price: 1800, duration_minutes: 60 },
  },
  {
    id: '2',
    first_name: 'Ольга',
    last_name: 'Смирнова',
    rating: 3.2,
    reviews_count: 5,
    top_service: { name: 'Массаж', price: 2500, duration_minutes: 90 },
  },
];

describe('HomeFeedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMe.mockResolvedValue({ first_name: 'Тест', last_name: 'Юзер', phone: '+79001234567' });
    mockGetSpecialists.mockResolvedValue({ results: mockSpecialists, count: 2, next: null });
  });

  it('показывает список мастеров после загрузки', async () => {
    const { findByText } = render(<HomeFeedScreen />);
    expect(await findByText('Мария Иванова')).toBeTruthy();
    expect(await findByText('Ольга Смирнова')).toBeTruthy();
  });

  it('показывает имя пользователя в хедере', async () => {
    const { findByText } = render(<HomeFeedScreen />);
    expect(await findByText('Тест Ю.')).toBeTruthy();
  });

  it('показывает услугу и цену на карточке', async () => {
    const { findByText } = render(<HomeFeedScreen />);
    expect(await findByText('Маникюр')).toBeTruthy();
    expect(await findByText(/1.*800/)).toBeTruthy();
  });

  it('показывает empty state когда нет мастеров', async () => {
    mockGetSpecialists.mockResolvedValue({ results: [], count: 0, next: null });
    const { findByText } = render(<HomeFeedScreen />);
    expect(await findByText('Мастеров пока нет')).toBeTruthy();
  });

  it('навигирует на профиль при нажатии на карточку', async () => {
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    const { findByText } = render(<HomeFeedScreen />);
    const card = await findByText('Мария Иванова');
    await act(async () => {
      fireEvent.press(card);
    });
    expect(mockPush).toHaveBeenCalledWith('/profile/1');
  });

  it('поиск фильтрует список по имени', async () => {
    const { findByPlaceholderText, findByText, queryByText } = render(<HomeFeedScreen />);
    const searchInput = await findByPlaceholderText('Поиск');
    await act(async () => {
      fireEvent.changeText(searchInput, 'Мария');
    });
    expect(await findByText('Мария Иванова')).toBeTruthy();
    await waitFor(() => {
      expect(queryByText('Ольга Смирнова')).toBeNull();
    });
  });

  it('поиск показывает "Ничего не найдено" при пустых результатах', async () => {
    const { findByPlaceholderText, findByText } = render(<HomeFeedScreen />);
    const searchInput = await findByPlaceholderText('Поиск');
    await act(async () => {
      fireEvent.changeText(searchInput, 'zzznobody');
    });
    expect(await findByText('Ничего не найдено')).toBeTruthy();
  });

  it('вызывает getSpecialists при фокусе', async () => {
    render(<HomeFeedScreen />);
    await waitFor(() => {
      expect(mockGetSpecialists).toHaveBeenCalledWith(1, 10);
    });
  });
});
