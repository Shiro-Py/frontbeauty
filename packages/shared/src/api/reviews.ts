import { getApiClient } from './client';
import { IS_MOCK } from './mock';

export interface ReviewSubmit {
  specialist_id: string;
  appointment_id?: string;
  rating: number;
  text?: string;
  is_anonymous: boolean;
}

export const submitReview = async (data: ReviewSubmit): Promise<void> => {
  if (IS_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return;
  }
  const api = getApiClient();
  await api.post('/reviews/', data);
};
