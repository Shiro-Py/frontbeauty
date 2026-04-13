import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MasterPreviewCard } from '@beautygo/shared';

const mockOnPress = jest.fn();
const mockOnFavorite = jest.fn();

const defaultProps = {
  id: '1',
  name: 'Мария Иванова',
  service: 'Маникюр',
  rating: 4.8,
  onPress: mockOnPress,
  onFavorite: mockOnFavorite,
  isFavorite: false,
};

describe('MasterPreviewCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('отображает имя мастера', () => {
    const { getByText } = render(<MasterPreviewCard {...defaultProps} />);
    expect(getByText('Мария Иванова')).toBeTruthy();
  });

  it('отображает рейтинг', () => {
    const { getByTestId } = render(<MasterPreviewCard {...defaultProps} />);
    expect(getByTestId('master-rating').props.children).toBe('4.8');
  });

  it('отображает услугу', () => {
    const { getByText } = render(<MasterPreviewCard {...defaultProps} />);
    expect(getByText('Маникюр')).toBeTruthy();
  });

  it('вызывает onPress при нажатии на карточку', () => {
    const { getByTestId } = render(<MasterPreviewCard {...defaultProps} />);
    fireEvent.press(getByTestId('master-card-1'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('вызывает onFavorite при нажатии на кнопку избранного', () => {
    const { getByTestId } = render(<MasterPreviewCard {...defaultProps} />);
    fireEvent.press(getByTestId('favorite-toggle-btn'));
    expect(mockOnFavorite).toHaveBeenCalledTimes(1);
  });

  it('отображает цену и длительность если переданы', () => {
    const { getByText } = render(
      <MasterPreviewCard {...defaultProps} price={1500} duration_minutes={60} />
    );
    expect(getByText('1\u00a0500 ₽')).toBeTruthy();
    expect(getByText('1 ч')).toBeTruthy();
  });
});
