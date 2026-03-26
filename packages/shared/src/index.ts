// API
export { initializeApiClient, getApiClient, setUnauthorizedHandler, setDeviceMismatchHandler, BASE_URL } from './api/client';
export type { AppType } from './api/client';
export { sendOtp, verifyOtp, completeRegistration, logout, getMe, updateClientProfile, createMasterProfile, createService, updateMasterProfile, deleteAccount } from './api/auth';
export type { VerifyOtpResponse, RegisterResponse, UserProfile, ClientProfileUpdate, MasterProfileCreate, ServiceData, MasterProfileUpdate } from './api/auth';

// Social Auth API
export { postVKAuth, postGoogleAuth, postAppleAuth, postYandexAuth } from './api/socialAuth';
export type { SocialAuthResult } from './api/socialAuth';

// Storage
export { tokenStorage } from './storage/tokenStorage';

// Auth
export { AuthProvider, useAuth } from './auth/authStore';
export type { AuthStatus } from './auth/authStore';

// Social Auth hooks
export { useVKAuth, useGoogleAuth, useAppleAuth, useYandexAuth } from './auth/socialAuth';

// Masters
export { getMasterDetail, getMasterServices, getMasterReviews, toggleFavorite, removeFavorite, getFavorites, isMasterFavorited } from './api/masters';
export type { MasterDetail, MasterService, MasterReview } from './api/masters';

// Services CRUD
export { getServices, addService, updateService, deleteService } from './api/services';
export type { Service, ServiceCreateData, ServiceUpdateData } from './api/services';

// Components
export { default as MasterPreviewCard } from './components/MasterPreviewCard';
export { ProtectedRoute } from './components/ProtectedRoute';
export { SocialAuthButtons } from './components/SocialAuthButtons';
