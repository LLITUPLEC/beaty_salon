import { getInitData } from './telegram';

const API_BASE = '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Базовый fetch с авторизацией Telegram
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const initData = getInitData();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Добавляем Telegram initData для авторизации
  if (initData) {
    (headers as Record<string, string>)['x-telegram-init-data'] = initData;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Network error occurred',
      },
    };
  }
}

// ============ Auth ============

export async function authenticateUser() {
  return apiFetch<{
    id: number;
    telegramId: string;
    firstName: string;
    lastName: string | null;
    username: string | null;
    role: string;
  }>('/auth/telegram', { method: 'POST' });
}

// ============ Services ============

export interface ServiceData {
  id: number;
  name: string;
  category: string;
  categoryId: number;
  price: number;
  duration: number;
  masters?: Array<{
    id: number;
    name: string;
    rating?: number;
    bookings?: number;
  }>;
}

export async function getServices(params?: { categoryId?: number; masterId?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.categoryId) searchParams.set('categoryId', String(params.categoryId));
  if (params?.masterId) searchParams.set('masterId', String(params.masterId));
  const query = searchParams.toString();
  return apiFetch<ServiceData[]>(`/services${query ? `?${query}` : ''}`);
}

export async function getServiceMasters(serviceId: number) {
  return apiFetch<MasterData[]>(`/services/${serviceId}/masters`);
}

export async function createService(data: {
  name: string;
  categoryId: number;
  price: number;
  duration: number;
}) {
  return apiFetch<ServiceData>('/services', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateService(id: number, data: Partial<ServiceData>) {
  return apiFetch<ServiceData>(`/services/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteService(id: number) {
  return apiFetch<{ message: string }>(`/services/${id}`, {
    method: 'DELETE',
  });
}

// ============ Categories ============

export interface CategoryData {
  id: number;
  name: string;
  icon?: string;
  servicesCount?: number;
}

export async function getCategories() {
  return apiFetch<CategoryData[]>('/categories');
}

export async function createCategory(data: { name: string; icon?: string }) {
  return apiFetch<CategoryData>('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCategory(data: { id: number; name?: string; icon?: string }) {
  return apiFetch<CategoryData>('/categories', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id: number) {
  return apiFetch<{ message: string }>(`/categories?id=${id}`, {
    method: 'DELETE',
  });
}

// ============ Master Services ============

export async function getMasterServices(masterId: number) {
  return apiFetch<ServiceData[]>(`/masters/${masterId}/services`);
}

export async function assignServiceToMaster(data: { masterId: number; serviceId: number }) {
  return apiFetch<{ message: string }>('/masters/services', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function removeServiceFromMaster(data: { masterId: number; serviceId: number }) {
  return apiFetch<{ message: string }>(`/masters/services?masterId=${data.masterId}&serviceId=${data.serviceId}`, {
    method: 'DELETE',
  });
}

// ============ Masters ============

export interface MasterData {
  id: number;
  name: string;
  fullName?: string;
  nickname?: string | null;
  telegram: string | null;
  telegramId: string;
  specialization: string;
  rating: number;
  avatar?: string;
  bookings: number;
  canCreateServices?: boolean;
  hasAvailability?: boolean;
}

export async function getMasters() {
  return apiFetch<MasterData[]>('/masters');
}

export async function createMaster(data: {
  telegramId: string;
  nickname?: string;
  specialization?: string;
  canCreateServices?: boolean;
}) {
  return apiFetch<MasterData>('/masters', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMaster(data: {
  id: number;
  nickname?: string;
  specialization?: string;
  canCreateServices?: boolean;
}) {
  return apiFetch<MasterData>('/masters', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteMaster(id: number) {
  return apiFetch<{ message: string }>(`/masters?id=${id}`, {
    method: 'DELETE',
  });
}

export interface AvailabilityData {
  date: string;
  availableSlots: string[];
  message?: string;
}

export async function getMasterAvailability(
  masterId: number,
  date: string,
  serviceId?: number
) {
  const params = new URLSearchParams({ date });
  if (serviceId) params.set('serviceId', String(serviceId));
  
  return apiFetch<AvailabilityData>(
    `/masters/${masterId}/availability?${params.toString()}`
  );
}

// ============ Bookings ============

export interface BookingData {
  id: number;
  client: string;
  clientId: number;
  master: string;
  masterId: number;
  service: string;
  serviceId: number;
  date: string;
  time: string;
  status: string;
  price: number;
  duration: number;
}

export async function getBookings(params?: { 
  status?: string; 
  showCompleted?: boolean;
  fromDate?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.showCompleted) searchParams.set('showCompleted', 'true');
  if (params?.fromDate) searchParams.set('fromDate', params.fromDate);
  const query = searchParams.toString();
  return apiFetch<BookingData[]>(`/bookings${query ? `?${query}` : ''}`);
}

export async function createBooking(data: {
  masterId?: number;
  serviceId: number;
  date: string;
  time: string;
  anyMaster?: boolean;
}) {
  return apiFetch<{ id: number; status: string; masterName?: string; message: string }>('/bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBookingStatus(id: number, status: string) {
  return apiFetch<{ id: number; status: string; message: string }>(
    `/bookings/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }
  );
}

export async function cancelBooking(id: number) {
  return apiFetch<{ message: string }>(`/bookings/${id}`, {
    method: 'DELETE',
  });
}

// ============ Admin ============

export async function getAdminBookings(filters?: {
  masterId?: number;
  status?: string;
  date?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.masterId) params.set('masterId', String(filters.masterId));
  if (filters?.status) params.set('status', filters.status);
  if (filters?.date) params.set('date', filters.date);
  
  const query = params.toString();
  return apiFetch<BookingData[]>(`/admin/bookings${query ? `?${query}` : ''}`);
}

export interface ScheduleData {
  id: number;
  master: string;
  masterId: number;
  date: string;
  startTime: string;
  endTime: string;
}

export async function getSchedules(filters?: {
  masterId?: number;
  startDate?: string;
  endDate?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.masterId) params.set('masterId', String(filters.masterId));
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  
  const query = params.toString();
  return apiFetch<ScheduleData[]>(`/admin/schedule${query ? `?${query}` : ''}`);
}

export async function createSchedule(data: {
  masterId?: number;
  masterIds?: number[];
  date?: string;
  dates?: string[];
  startTime: string;
  endTime: string;
}) {
  return apiFetch<{ created: number; updated: number; message: string }>('/admin/schedule', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSchedule(data: {
  id: number;
  startTime?: string;
  endTime?: string;
}) {
  return apiFetch<ScheduleData>('/admin/schedule', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSchedule(id: number) {
  return apiFetch<{ message: string }>(`/admin/schedule?id=${id}`, {
    method: 'DELETE',
  });
}

export async function copySchedules(data: {
  scheduleIds: number[];
  targetDates: string[];
}) {
  // Для копирования сначала получим данные смен, потом создадим новые
  return apiFetch<{ created: number; updated: number; message: string }>('/admin/schedule', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface ReportsData {
  serviceReports: Array<{
    category: string;
    count: number;
    revenue: number;
  }>;
  masterReports: Array<{
    masterId: number;
    name: string;
    bookings: number;
    revenue: number;
    rating: number;
  }>;
  stats: {
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    totalRevenue: number;
    averageCheck: number;
    newClients: number;
    repeatClients: number;
    repeatRate: number;
  };
}

export async function getReports(filters?: {
  startDate?: string;
  endDate?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  
  const query = params.toString();
  return apiFetch<ReportsData>(`/admin/reports${query ? `?${query}` : ''}`);
}

