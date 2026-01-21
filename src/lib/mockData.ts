import { Service, Booking, Master, Schedule, ServiceReport, MasterReport, StatsReport } from '@/types';

// Mock Services
export const mockServices: Service[] = [
  { id: 1, name: 'Женская стрижка', category: 'Стрижки', price: 2500, duration: 60 },
  { id: 2, name: 'Мужская стрижка', category: 'Стрижки', price: 1500, duration: 45 },
  { id: 3, name: 'Окрашивание волос', category: 'Окрашивание', price: 4500, duration: 120 },
  { id: 4, name: 'Маникюр классический', category: 'Маникюр', price: 1800, duration: 60 },
  { id: 5, name: 'Маникюр с покрытием', category: 'Маникюр', price: 2200, duration: 90 },
];

// Mock Masters
export const mockMasters: Master[] = [
  {
    id: 1,
    name: 'Анна Петрова',
    telegram: '@anna_p',
    telegram_id: 111111111,
    specialization: 'Стилист-парикмахер',
    bookings: 45,
    rating: 4.9,
    active: true
  },
  {
    id: 2,
    name: 'Мария Иванова',
    telegram: '@maria_i',
    telegram_id: 222222222,
    specialization: 'Колорист',
    bookings: 38,
    rating: 4.8,
    active: true
  },
  {
    id: 3,
    name: 'Елена Сидорова',
    telegram: '@elena_s',
    telegram_id: 333333333,
    specialization: 'Мастер маникюра',
    bookings: 52,
    rating: 5.0,
    active: true
  }
];

// Mock Bookings for Client
export const mockClientBookings: Booking[] = [
  {
    id: 1,
    client: 'Ирина Смирнова',
    clientId: 123456789,
    master: 'Анна Петрова',
    masterId: 1,
    service: 'Женская стрижка',
    serviceId: 1,
    date: '2026-01-23',
    time: '14:00',
    status: 'confirmed',
    price: 2500,
    duration: 60
  },
  {
    id: 2,
    client: 'Ирина Смирнова',
    clientId: 123456789,
    master: 'Мария Иванова',
    masterId: 2,
    service: 'Окрашивание волос',
    serviceId: 3,
    date: '2026-01-10',
    time: '11:00',
    status: 'completed',
    price: 4500,
    duration: 120
  },
  {
    id: 3,
    client: 'Ирина Смирнова',
    clientId: 123456789,
    master: 'Елена Сидорова',
    masterId: 3,
    service: 'Маникюр с покрытием',
    serviceId: 5,
    date: '2026-01-05',
    time: '16:00',
    status: 'completed',
    price: 2200,
    duration: 90
  }
];

// Mock Bookings for Master
export const mockMasterBookings: Booking[] = [
  {
    id: 1,
    client: 'Ирина Смирнова',
    clientId: 123456789,
    master: 'Анна Петрова',
    masterId: 1,
    service: 'Женская стрижка',
    serviceId: 1,
    date: '2026-01-23',
    time: '14:00',
    status: 'confirmed',
    price: 2500,
    duration: 60
  },
  {
    id: 2,
    client: 'Анна Кузнецова',
    clientId: 234567890,
    master: 'Анна Петрова',
    masterId: 1,
    service: 'Окрашивание волос',
    serviceId: 3,
    date: '2026-01-23',
    time: '16:00',
    status: 'pending',
    price: 4500,
    duration: 120
  },
  {
    id: 3,
    client: 'Мария Попова',
    clientId: 345678901,
    master: 'Анна Петрова',
    masterId: 1,
    service: 'Женская стрижка',
    serviceId: 1,
    date: '2026-01-24',
    time: '11:00',
    status: 'confirmed',
    price: 2500,
    duration: 60
  }
];

// Mock All Bookings for Admin
export const mockAllBookings: Booking[] = [
  ...mockMasterBookings,
  {
    id: 4,
    client: 'Елена Волкова',
    clientId: 456789012,
    master: 'Елена Сидорова',
    masterId: 3,
    service: 'Маникюр',
    serviceId: 4,
    date: '2026-01-23',
    time: '15:00',
    status: 'confirmed',
    price: 1800,
    duration: 60
  },
  {
    id: 5,
    client: 'Анна Кузнецова',
    clientId: 234567890,
    master: 'Мария Иванова',
    masterId: 2,
    service: 'Окрашивание волос',
    serviceId: 3,
    date: '2026-01-23',
    time: '16:00',
    status: 'pending',
    price: 4500,
    duration: 120
  }
];

// Mock Schedules
export const mockSchedules: Schedule[] = [
  {
    id: 1,
    master: 'Анна Петрова',
    masterId: 1,
    date: '2026-01-23',
    startTime: '10:00',
    endTime: '19:00'
  },
  {
    id: 2,
    master: 'Мария Иванова',
    masterId: 2,
    date: '2026-01-23',
    startTime: '11:00',
    endTime: '20:00'
  },
  {
    id: 3,
    master: 'Елена Сидорова',
    masterId: 3,
    date: '2026-01-23',
    startTime: '09:00',
    endTime: '18:00'
  }
];

// Mock Reports
export const mockServiceReports: ServiceReport[] = [
  { category: 'Стрижки', count: 58, revenue: 145000 },
  { category: 'Окрашивание', count: 42, revenue: 189000 },
  { category: 'Маникюр', count: 56, revenue: 123200 }
];

export const mockMasterReports: MasterReport[] = [
  { masterId: 3, name: 'Елена Сидорова', bookings: 52, revenue: 130000, rating: 5.0 },
  { masterId: 1, name: 'Анна Петрова', bookings: 45, revenue: 112500, rating: 4.9 },
  { masterId: 2, name: 'Мария Иванова', bookings: 38, revenue: 95000, rating: 4.8 }
];

export const mockStats: StatsReport = {
  totalBookings: 156,
  completedBookings: 140,
  cancelledBookings: 10,
  totalRevenue: 432000,
  averageCheck: 2770,
  newClients: 23,
  repeatClients: 117,
  repeatRate: 78
};

// Available time slots
export const mockAvailableSlots = [
  '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

// Categories
export const serviceCategories = ['Стрижки', 'Окрашивание', 'Маникюр', 'Педикюр', 'Косметология'];

