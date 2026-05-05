// API
export { initializeApiClient, getApiClient, setUnauthorizedHandler, setDeviceMismatchHandler, setGateHandler, BASE_URL } from './api/client';
export type { AppType } from './api/client';
export { sendOtp, verifyOtp, completeRegistration, logout, getMe, updateClientProfile, createMasterProfile, createService, updateMasterProfile, getMasterMe, deleteAccount } from './api/auth';
export type { RequestOtpResponse, VerifyOtpResponse, RegisterResponse, UserProfile, ClientProfileUpdate, MasterProfileCreate, ServiceData, MasterProfileUpdate, MasterMyProfile } from './api/auth';

// Anonymous Auth
export { initAnonymousSession } from './api/anonymousAuth';

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
export { getMasterDetail, getMasterServices, getMasterReviews, toggleFavorite, removeFavorite, getFavorites, getSpecialists, getCategories, isMasterFavorited } from './api/masters';
export type { MasterDetail, MasterService, MasterReview, SpecialistListItem, SpecialistsPage, ReviewsResponse, ServicePreview, Category, SpecialistsFilters } from './api/masters';

// Services CRUD
export { getServices, addService, updateService, deleteService } from './api/services';
export type { Service, ServiceCreateData, ServiceUpdateData } from './api/services';

// AI Chat
export { sendChatMessage } from './api/ai';
export type { ChatMessage, ActionData, AIChatSpecialist, SlotDate } from './api/ai';

// Payments
export { createPayment, getPaymentStatus, getSavedCards, deleteSavedCard, getPaymentHistory } from './api/payments';
export type { SavedCard, PaymentStatus, PaymentResult, PaymentHistoryItem } from './api/payments';

// Reviews
export { submitReview } from './api/reviews';
export type { ReviewSubmit } from './api/reviews';

// Schedule
export { getSchedule, patchScheduleDay, validateWorkingDay, timeToMinutes, getTimeOffs, createTimeOff, deleteTimeOff, validateTimeOff } from './api/schedule';
export type { WorkingDay, Schedule, PatchDayPayload, DayOfWeek, TimeOff, TimeOffCreate } from './api/schedule';

// Bookings
export { getSlots, createBooking, getBookings, getBookingById, cancelBooking, getPastAppointments, getUpcomingAppointments, getProAppointments, getProAppointmentById, completeAppointment, cancelAppointmentWithReason, mockProStore } from './api/bookings';

// Notifications
export { requestNotificationPermissions, getNotificationsDeclinedAt, registerDevicePushToken, addPushTokenRefreshListener, configureForegroundHandler, addNotificationTapListener, getDeepLinkFromNotification } from './notifications';
export type { PermissionResult, NotificationAppType, NotificationType, NotificationPayload } from './notifications';
export type { SlotsResponse, BookingCreate, Booking, BookingStatus, AppointmentsPage, AppointmentWithDetails, ProAppointment, ProAppointmentsPage, ProAppointmentFilter } from './api/bookings';

// Nutrition
export { getDiary, scanFood, logFood, deleteLog, getInsights, getWater, logWater } from './api/nutrition';
export type { NutrientData, FoodScanResult, DiaryEntry, DiarySummary, VitaminInsight, WeeklyInsights, WaterData } from './api/nutrition';

// Avatar
export { getAvatarData, createAvatar } from './api/avatar';

// Portfolio (Pro)
export { getPortfolio, uploadPortfolioPhoto, deletePortfolioPhoto } from './api/portfolio';
export type { PortfolioPhoto } from './api/portfolio';
export type { AvatarSnapshot, WeeklyStats, AvatarRecommendation, AvatarData, AvatarAnalysis } from './api/avatar';

// Components
export { default as MasterPreviewCard } from './components/MasterPreviewCard';
export { ProtectedRoute } from './components/ProtectedRoute';
export { SocialAuthButtons } from './components/SocialAuthButtons';
