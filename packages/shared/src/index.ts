// API
export { initializeApiClient, getApiClient, setUnauthorizedHandler, setDeviceMismatchHandler, BASE_URL } from './api/client';
export type { AppType } from './api/client';
export { sendOtp, verifyOtp, completeRegistration, logout, getMe, updateClientProfile, createMasterProfile, createService, updateMasterProfile, getMasterMe, deleteAccount } from './api/auth';
export type { RequestOtpResponse, VerifyOtpResponse, RegisterResponse, UserProfile, ClientProfileUpdate, MasterProfileCreate, ServiceData, MasterProfileUpdate, MasterMyProfile } from './api/auth';

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
export { getMasterDetail, getMasterServices, getMasterReviews, toggleFavorite, removeFavorite, getFavorites, getSpecialists, isMasterFavorited } from './api/masters';
export type { MasterDetail, MasterService, MasterReview, SpecialistListItem, SpecialistsPage } from './api/masters';

// Services CRUD
export { getServices, addService, updateService, deleteService } from './api/services';
export type { Service, ServiceCreateData, ServiceUpdateData } from './api/services';

// Reviews
export { submitReview } from './api/reviews';
export type { ReviewSubmit } from './api/reviews';

// Bookings
export { getSlots, createBooking, getBookings, getBookingById, cancelBooking, getPastAppointments, getUpcomingAppointments } from './api/bookings';
export type { SlotsResponse, BookingCreate, Booking, BookingStatus, AppointmentsPage } from './api/bookings';

// Components
export { default as MasterPreviewCard } from './components/MasterPreviewCard';
export { ProtectedRoute } from './components/ProtectedRoute';
export { SocialAuthButtons } from './components/SocialAuthButtons';
