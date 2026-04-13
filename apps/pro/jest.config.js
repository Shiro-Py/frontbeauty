module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@beautygo/.*)',
  ],
  moduleNameMapper: {
    '^@beautygo/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@beautygo/shared/(.*)': '<rootDir>/../../packages/shared/src/$1',
  },
  globals: {
    __DEV__: false,
  },
  moduleDirectories: ['node_modules', '../../node_modules'],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'require', 'default'],
  },
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
};
