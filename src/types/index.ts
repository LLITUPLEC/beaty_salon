// User types
export type UserRole = 'client' | 'master' | 'admin';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export interface User {
  id: number;
  telegram_id: number;
  name: string;
  role: UserRole;
  token?: string;
}

// Service types
export interface Service {
  id: number;
  name: string;
  category: string;
  price: number;
  duration: number;
  masterId?: number;
  active?: boolean;
}

// Booking types
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Booking {
  id: number;
  client: string;
  clientId: number;
  master: string;
  masterId: number;
  service: string;
  serviceId: number;
  date: string;
  time: string;
  status: BookingStatus;
  price: number;
  duration?: number;
}

// Master types
export interface Master {
  id: number;
  name: string;
  telegram: string;
  telegram_id: number;
  specialization: string;
  bookings: number;
  rating: number;
  avatar?: string;
  active: boolean;
}

// Schedule types
export interface Schedule {
  id: number;
  master: string;
  masterId: number;
  date: string;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
}

// Report types
export interface ServiceReport {
  category: string;
  count: number;
  revenue: number;
}

export interface MasterReport {
  masterId: number;
  name: string;
  bookings: number;
  revenue: number;
  rating: number;
}

export interface StatsReport {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageCheck: number;
  newClients: number;
  repeatClients: number;
  repeatRate: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Form types
export interface BookingFormData {
  serviceId: number;
  masterId: number;
  date: string;
  time: string;
}

export interface ServiceFormData {
  name: string;
  category: string;
  price: number;
  duration: number;
}

export interface MasterFormData {
  telegram: string;
  telegram_id?: number;
  name: string;
  specialization: string;
}

export interface ScheduleFormData {
  masterId: number;
  date: string;
  startTime: string;
  endTime: string;
}

// Available time slots
export interface AvailableSlots {
  date: string;
  slots: string[];
}

