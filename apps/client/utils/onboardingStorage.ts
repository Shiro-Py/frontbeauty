import AsyncStorage from '@react-native-async-storage/async-storage';

export type OnboardingStatus =
  | 'not_started'
  | 'otp_verified'
  | 'name_done'
  | 'geo_done'
  | 'completed';

const KEY = 'onboarding_status';

export const onboardingStorage = {
  async get(): Promise<OnboardingStatus> {
    const val = await AsyncStorage.getItem(KEY);
    return (val as OnboardingStatus) ?? 'not_started';
  },

  async set(status: OnboardingStatus): Promise<void> {
    await AsyncStorage.setItem(KEY, status);
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEY);
  },
};
