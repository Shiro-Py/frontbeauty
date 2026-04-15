import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({
    id: 'specialist-1',
    master_name: 'Мария Иванова',
  })),
  router: { back: jest.fn(), push: jest.fn() },
}));

jest.mock('@ayla/shared', () => ({
  submitReview: jest.fn(),
}));

import ReviewScreen from '../../app/review/[id]';
import { router } from 'expo-router';
import { submitReview } from '@ayla/shared';

const mockSubmit = submitReview as jest.Mock;
const mockBack = router.back as jest.Mock;

describe('ReviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmit.mockResolvedValue(undefined);
  });

  it('рендерит заголовок "Отзыв о мастере"', () => {
    const { getByText } = render(<ReviewScreen />);
    expect(getByText('Отзыв о мастере')).toBeTruthy();
  });

  it('показывает имя мастера из params', () => {
    const { getByText } = render(<ReviewScreen />);
    expect(getByText('Мария Иванова')).toBeTruthy();
  });

  it('рендерит 5 кнопок рейтинга', () => {
    const { getByText } = render(<ReviewScreen />);
    expect(getByText('1')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
  });

  it('кнопка "Отправить" disabled без рейтинга', () => {
    const { getByText } = render(<ReviewScreen />);
    const btn = getByText('Отправить');
    expect(btn.props.accessibilityState?.disabled ?? true).toBeTruthy();
  });

  it('кнопка активна после выбора рейтинга', async () => {
    const { getByText } = render(<ReviewScreen />);
    await act(async () => {
      fireEvent.press(getByText('5'));
    });
    const btn = getByText('Отправить');
    expect(btn.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('показывает подпись "Отлично" при рейтинге 5', async () => {
    const { getByText } = render(<ReviewScreen />);
    await act(async () => {
      fireEvent.press(getByText('5'));
    });
    expect(getByText('Отлично')).toBeTruthy();
  });

  it('показывает подпись "Плохо" при рейтинге 2', async () => {
    const { getByText } = render(<ReviewScreen />);
    await act(async () => {
      fireEvent.press(getByText('2'));
    });
    expect(getByText('Плохо')).toBeTruthy();
  });

  it('вызывает submitReview с правильными данными', async () => {
    const { getByText, getByPlaceholderText } = render(<ReviewScreen />);
    await act(async () => {
      fireEvent.press(getByText('5'));
      fireEvent.changeText(
        getByPlaceholderText('Поделитесь впечатлениями о мастере…'),
        'Отличный мастер!',
      );
    });
    await act(async () => {
      fireEvent.press(getByText('Отправить'));
    });
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          specialist_id: 'specialist-1',
          rating: 5,
          text: 'Отличный мастер!',
          is_anonymous: false,
        }),
      );
    });
  });

  it('показывает экран успеха после отправки', async () => {
    const { getByText, findByText } = render(<ReviewScreen />);
    await act(async () => { fireEvent.press(getByText('5')); });
    await act(async () => { fireEvent.press(getByText('Отправить')); });
    expect(await findByText('Отзыв опубликован!')).toBeTruthy();
  });

  it('кнопка "Понятно" вызывает router.back', async () => {
    const { getByText } = render(<ReviewScreen />);
    await act(async () => { fireEvent.press(getByText('5')); });
    await act(async () => { fireEvent.press(getByText('Отправить')); });
    await waitFor(() => expect(getByText('Понятно')).toBeTruthy());
    await act(async () => { fireEvent.press(getByText('Понятно')); });
    expect(mockBack).toHaveBeenCalled();
  });

  it('показывает ошибку при сбое API', async () => {
    mockSubmit.mockRejectedValue(new Error('network error'));
    const { getByText, findByText } = render(<ReviewScreen />);
    await act(async () => { fireEvent.press(getByText('4')); });
    await act(async () => { fireEvent.press(getByText('Отправить')); });
    expect(await findByText(/Не удалось отправить отзыв/)).toBeTruthy();
  });

  it('чекбокс "Анонимный отзыв" переключается', async () => {
    const { getByText } = render(<ReviewScreen />);
    await act(async () => {
      fireEvent.press(getByText('Анонимный отзыв'));
    });
    await act(async () => {
      fireEvent.press(getByText('5'));
    });
    await act(async () => {
      fireEvent.press(getByText('Отправить'));
    });
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ is_anonymous: true }),
      );
    });
  });

  it('счётчик символов обновляется', async () => {
    const { getByPlaceholderText, getByText } = render(<ReviewScreen />);
    await act(async () => {
      fireEvent.changeText(
        getByPlaceholderText('Поделитесь впечатлениями о мастере…'),
        'Привет',
      );
    });
    expect(getByText('6/500')).toBeTruthy();
  });
});
