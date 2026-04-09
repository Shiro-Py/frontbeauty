import React from 'react';
import { render } from '@testing-library/react-native';
import ProfileScreen from '../../app/(tabs)/profile';

jest.mock('@beautygo/shared', () => ({
  useAuth: () => ({ signOut: jest.fn() }),
  getMe: jest.fn().mockResolvedValue({
    first_name: 'Анна',
    last_name: 'Иванова',
    phone: '+79001234567',
    city: 'Москва',
    avatar_url: null,
  }),
  updateClientProfile: jest.fn(),
  deleteAccount: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

describe('ProfileScreen', () => {
  it('отображает имя пользователя после загрузки', async () => {
    const { findByText } = render(<ProfileScreen />);
    expect(await findByText('Анна Иванова')).toBeTruthy();
  });

  it('отображает номер телефона', async () => {
    const { findByText } = render(<ProfileScreen />);
    expect(await findByText('+7 (900) 123-45-67')).toBeTruthy();
  });

  it('показывает кнопку редактирования', async () => {
    const { findByTestId } = render(<ProfileScreen />);
    expect(await findByTestId('edit-profile-btn')).toBeTruthy();
  });
});
