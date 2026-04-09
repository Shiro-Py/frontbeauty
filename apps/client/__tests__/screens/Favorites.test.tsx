import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import FavoritesScreen from '../../app/(tabs)/favorites';

const mockGetFavorites = jest.fn();
const mockRemoveFavorite = jest.fn();
const mockPush = jest.fn();

jest.mock('@beautygo/shared', () => ({
  MasterPreviewCard: require('../../../packages/shared/src/components/MasterPreviewCard').default,
  getFavorites: (...args: any[]) => mockGetFavorites(...args),
  removeFavorite: (...args: any[]) => mockRemoveFavorite(...args),
  toggleFavorite: jest.fn(),
  MasterDetail: {},
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (cb: () => void) => { cb(); },
}));

const mockMaster = {
  id: '1',
  first_name: 'Мария',
  last_name: 'Иванова',
  rating: 4.8,
  portfolio: [],
};

describe('FavoritesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFavorites.mockResolvedValue([mockMaster]);
    mockRemoveFavorite.mockResolvedValue(undefined);
  });

  it('отображает список избранных мастеров', async () => {
    const { findByTestId } = render(<FavoritesScreen />);
    expect(await findByTestId('favorites-list')).toBeTruthy();
  });

  it('отображает имя мастера', async () => {
    const { findByText } = render(<FavoritesScreen />);
    expect(await findByText('Мария Иванова')).toBeTruthy();
  });

  it('показывает заглушку при пустом списке', async () => {
    mockGetFavorites.mockResolvedValueOnce([]);
    const { findByTestId } = render(<FavoritesScreen />);
    expect(await findByTestId('favorites-empty')).toBeTruthy();
  });

  it('убирает мастера из списка при нажатии на избранное', async () => {
    const { findByTestId, queryByText } = render(<FavoritesScreen />);
    const btn = await findByTestId('favorite-toggle-btn');
    fireEvent.press(btn);
    await waitFor(() => {
      expect(queryByText('Мария Иванова')).toBeNull();
    });
    expect(mockRemoveFavorite).toHaveBeenCalledWith('1');
  });
});
