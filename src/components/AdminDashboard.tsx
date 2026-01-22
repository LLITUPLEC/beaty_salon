'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Users,
  Scissors,
  TrendingUp,
  Plus,
  Loader2,
  Trash2,
  Edit,
  FolderPlus,
  Check,
  X,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  CalendarDays
} from 'lucide-react';
import { Header } from './ui/Header';
import { Tabs, TabContent } from './ui/Tabs';
import { Card, CardContent, StatCard } from './ui/Card';
import { StatusBadge } from './ui/Badge';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import { Booking, Master, Schedule, ScheduleFormData } from '@/types';
import { formatPrice, formatDate } from '@/lib/utils';
import { hapticFeedback, showAlert, showConfirm } from '@/lib/telegram';
import {
  getAdminBookings,
  getMasters,
  getSchedules,
  getReports,
  getCategories,
  getServices,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  createMaster,
  deleteMaster,
  updateMaster,
  createCategory,
  updateCategory,
  deleteCategory,
  createService,
  updateService,
  deleteService,
  assignServiceToMaster,
  removeServiceFromMaster,
  updateBookingStatus,
  BookingData,
  MasterData,
  ScheduleData,
  ReportsData,
  CategoryData,
  ServiceData
} from '@/lib/api-client';

interface MasterWithDetails extends Master {
  nickname?: string | null;
  fullName?: string;
  canCreateServices?: boolean;
}

interface CategoryWithCount extends CategoryData {
  servicesCount?: number;
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [masters, setMasters] = useState<MasterWithDetails[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [selectedMasterFilter, setSelectedMasterFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [newMasterTelegram, setNewMasterTelegram] = useState('');
  const [newMasterNickname, setNewMasterNickname] = useState('');
  const [newMasterSpecialization, setNewMasterSpecialization] = useState('');
  const [newMasterCanCreate, setNewMasterCanCreate] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingMaster, setEditingMaster] = useState<MasterWithDetails | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormData>({
    masterId: 0,
    date: '',
    startTime: '09:00',
    endTime: '18:00'
  });
  
  // Services management
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedMasterForService, setSelectedMasterForService] = useState<string>('');
  
  // Service form
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState<number | null>(null);
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('60');
  const [editingService, setEditingService] = useState<ServiceData | null>(null);
  
  // Booking filters
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCompletedBookings, setShowCompletedBookings] = useState(false);
  
  // Schedule calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleModalMode, setScheduleModalMode] = useState<'view' | 'create' | 'copy'>('view');
  const [selectedMastersForSchedule, setSelectedMastersForSchedule] = useState<number[]>([]);
  const [selectedDatesForSchedule, setSelectedDatesForSchedule] = useState<string[]>([]);
  const [copySourceSchedules, setCopySourceSchedules] = useState<Schedule[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bookingsRes, mastersRes, schedulesRes, reportsRes, categoriesRes, servicesRes] = await Promise.all([
        getAdminBookings(),
        getMasters(),
        getSchedules(),
        getReports(),
        getCategories(),
        getServices()
      ]);

      if (bookingsRes.success && bookingsRes.data) {
        setBookings(bookingsRes.data.map(mapBookingData));
      }

      if (mastersRes.success && mastersRes.data) {
        setMasters(mastersRes.data.map(mapMasterData));
      }

      if (schedulesRes.success && schedulesRes.data) {
        setSchedules(schedulesRes.data.map(mapScheduleData));
      }

      if (reportsRes.success && reportsRes.data) {
        setReports(reportsRes.data);
      }

      if (categoriesRes.success && categoriesRes.data) {
        setCategories(categoriesRes.data);
      }

      if (servicesRes.success && servicesRes.data) {
        setServices(servicesRes.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const mapBookingData = (data: BookingData): Booking => ({
    id: data.id,
    client: data.client,
    clientId: data.clientId,
    master: data.master,
    masterId: data.masterId,
    service: data.service,
    serviceId: data.serviceId,
    date: data.date,
    time: data.time,
    status: data.status as Booking['status'],
    price: data.price,
    duration: data.duration,
  });

  const mapMasterData = (data: MasterData): MasterWithDetails => ({
    id: data.id,
    name: data.name,
    fullName: data.fullName || data.name,
    nickname: data.nickname || null,
    telegram: data.telegram || '',
    telegram_id: parseInt(data.telegramId) || 0,
    specialization: data.specialization,
    rating: data.rating || 5.0,
    bookings: data.bookings || 0,
    active: true,
    canCreateServices: data.canCreateServices || false,
  });

  const mapScheduleData = (data: ScheduleData): Schedule => ({
    id: data.id,
    master: data.master,
    masterId: data.masterId,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
  });

  const stats = reports?.stats || {
    totalBookings: bookings.length,
    completedBookings: bookings.filter(b => b.status === 'completed').length,
    cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
    totalRevenue: 0,
    averageCheck: 0,
    newClients: 0,
    repeatClients: 0,
    repeatRate: 0,
  };

  const serviceReports = reports?.serviceReports || [];
  const masterReports = reports?.masterReports || [];

  // Filter bookings
  const filteredBookings = bookings.filter((b) => {
    // Master filter
    if (selectedMasterFilter !== 'all' && b.masterId !== Number(selectedMasterFilter)) {
      return false;
    }
    
    // Date filter
    if (fromDate && b.date < fromDate) {
      return false;
    }
    
    // Completed filter
    const isCompleted = b.status === 'completed' || b.status === 'cancelled';
    if (showCompletedBookings && !isCompleted) {
      return false;
    }
    if (!showCompletedBookings && isCompleted) {
      return false;
    }
    
    return true;
  });

  const handleAddMaster = async () => {
    if (!newMasterTelegram.trim()) {
      await showAlert('Введите Telegram ID');
      return;
    }

    const result = await createMaster({
      telegramId: newMasterTelegram.replace('@', ''),
      nickname: newMasterNickname.trim() || undefined,
      specialization: newMasterSpecialization.trim() || undefined,
      canCreateServices: newMasterCanCreate,
    });

    if (result.success) {
      hapticFeedback('success');
      await loadData();
      setNewMasterTelegram('');
      setNewMasterNickname('');
      setNewMasterSpecialization('');
      setNewMasterCanCreate(false);
      await showAlert('Мастер добавлен!');
    } else {
      await showAlert(result.error?.message || 'Ошибка при добавлении мастера');
    }
  };

  const handleDeleteMaster = async (master: MasterWithDetails) => {
    const confirmed = await showConfirm(
      `Удалить мастера ${master.name}? Роль изменится на "Клиент".`
    );
    
    if (!confirmed) return;

    const result = await deleteMaster(master.id);

    if (result.success) {
      hapticFeedback('success');
      await loadData();
      await showAlert('Мастер удалён');
    } else {
      await showAlert(result.error?.message || 'Ошибка при удалении');
    }
  };

  const handleUpdateMaster = async () => {
    if (!editingMaster) return;

    const result = await updateMaster({
      id: editingMaster.id,
      nickname: editingMaster.nickname || undefined,
      specialization: editingMaster.specialization || undefined,
      canCreateServices: editingMaster.canCreateServices,
    });

    if (result.success) {
      hapticFeedback('success');
      setEditingMaster(null);
      await loadData();
      await showAlert('Данные мастера обновлены');
    } else {
      await showAlert(result.error?.message || 'Ошибка при обновлении');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      await showAlert('Введите название категории');
      return;
    }

    const result = await createCategory({
      name: newCategoryName.trim(),
    });

    if (result.success) {
      hapticFeedback('success');
      await loadData();
      setNewCategoryName('');
      await showAlert('Категория добавлена!');
    } else {
      await showAlert(result.error?.message || 'Ошибка при добавлении категории');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    const result = await updateCategory({
      id: editingCategory.id,
      name: editingCategory.name,
    });

    if (result.success) {
      hapticFeedback('success');
      setEditingCategory(null);
      await loadData();
      await showAlert('Категория обновлена');
    } else {
      await showAlert(result.error?.message || 'Ошибка при обновлении');
    }
  };

  const handleDeleteCategory = async (category: CategoryWithCount) => {
    if (category.servicesCount && category.servicesCount > 0) {
      await showAlert(`Невозможно удалить категорию с ${category.servicesCount} услугами`);
      return;
    }

    const confirmed = await showConfirm(`Удалить категорию "${category.name}"?`);
    if (!confirmed) return;

    const result = await deleteCategory(category.id);

    if (result.success) {
      hapticFeedback('success');
      await loadData();
      await showAlert('Категория удалена');
    } else {
      await showAlert(result.error?.message || 'Ошибка при удалении');
    }
  };

  const handleAssignService = async () => {
    if (!selectedServiceId || !selectedMasterForService) {
      await showAlert('Выберите услугу и мастера');
      return;
    }

    const result = await assignServiceToMaster({
      serviceId: selectedServiceId,
      masterId: parseInt(selectedMasterForService),
    });

    if (result.success) {
      hapticFeedback('success');
      await loadData();
      setSelectedServiceId(null);
      setSelectedMasterForService('');
      await showAlert('Услуга назначена мастеру');
    } else {
      await showAlert(result.error?.message || 'Ошибка при назначении');
    }
  };

  const handleRemoveServiceFromMaster = async (serviceId: number, masterId: number) => {
    const confirmed = await showConfirm('Убрать услугу у мастера?');
    if (!confirmed) return;

    const result = await removeServiceFromMaster({ serviceId, masterId });

    if (result.success) {
      hapticFeedback('success');
      await loadData();
    } else {
      await showAlert(result.error?.message || 'Ошибка');
    }
  };

  const handleAddService = async () => {
    if (!newServiceName.trim() || !newServiceCategory || !newServicePrice) {
      await showAlert('Заполните все обязательные поля');
      return;
    }

    const result = await createService({
      name: newServiceName.trim(),
      categoryId: newServiceCategory,
      price: parseInt(newServicePrice),
      duration: parseInt(newServiceDuration) || 60,
    });

    if (result.success) {
      hapticFeedback('success');
      await loadData();
      setNewServiceName('');
      setNewServiceCategory(null);
      setNewServicePrice('');
      setNewServiceDuration('60');
      await showAlert('Услуга добавлена!');
    } else {
      await showAlert(result.error?.message || 'Ошибка при добавлении услуги');
    }
  };

  const handleUpdateService = async () => {
    if (!editingService) return;

    const result = await updateService(editingService.id, {
      name: editingService.name,
      categoryId: editingService.categoryId,
      price: editingService.price,
      duration: editingService.duration,
    });

    if (result.success) {
      hapticFeedback('success');
      setEditingService(null);
      await loadData();
      await showAlert('Услуга обновлена');
    } else {
      await showAlert(result.error?.message || 'Ошибка при обновлении');
    }
  };

  const handleDeleteService = async (service: ServiceData) => {
    const confirmed = await showConfirm(`Удалить услугу "${service.name}"?`);
    if (!confirmed) return;

    const result = await deleteService(service.id);

    if (result.success) {
      hapticFeedback('success');
      await loadData();
      await showAlert('Услуга удалена');
    } else {
      await showAlert(result.error?.message || 'Ошибка при удалении');
    }
  };

  const handleConfirmBooking = async (bookingId: number) => {
    const result = await updateBookingStatus(bookingId, 'confirmed');
    if (result.success) {
      hapticFeedback('success');
      setBookings(
        bookings.map((b) =>
          b.id === bookingId ? { ...b, status: 'confirmed' as const } : b
        )
      );
      await showAlert('Запись подтверждена!');
    } else {
      await showAlert(result.error?.message || 'Ошибка');
    }
  };

  const handleRejectBooking = async (bookingId: number) => {
    const confirmed = await showConfirm('Отклонить эту запись?');
    if (!confirmed) return;

    const result = await updateBookingStatus(bookingId, 'cancelled');
    if (result.success) {
      hapticFeedback('warning');
      setBookings(
        bookings.map((b) =>
          b.id === bookingId ? { ...b, status: 'cancelled' as const } : b
        )
      );
      await showAlert('Запись отклонена');
    } else {
      await showAlert(result.error?.message || 'Ошибка');
    }
  };

  const handleCompleteBooking = async (bookingId: number) => {
    const confirmed = await showConfirm('Отметить запись как завершённую?');
    if (!confirmed) return;

    const result = await updateBookingStatus(bookingId, 'completed');
    if (result.success) {
      hapticFeedback('success');
      setBookings(
        bookings.map((b) =>
          b.id === bookingId ? { ...b, status: 'completed' as const } : b
        )
      );
      await showAlert('Запись завершена');
    } else {
      await showAlert(result.error?.message || 'Ошибка');
    }
  };

  const handleCreateSchedule = async () => {
    if (!scheduleForm.masterId || !scheduleForm.date) return;

    const result = await createSchedule({
      masterId: scheduleForm.masterId,
      date: scheduleForm.date,
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime,
    });

    if (result.success) {
      hapticFeedback('success');
      await loadData();
      setScheduleForm({
        masterId: 0,
        date: '',
        startTime: '09:00',
        endTime: '18:00'
      });
      await showAlert('Смена создана!');
    } else {
      await showAlert(result.error?.message || 'Ошибка при создании смены');
    }
  };

  const handleMassCreateSchedules = async () => {
    if (selectedMastersForSchedule.length === 0 || selectedDatesForSchedule.length === 0) {
      await showAlert('Выберите мастеров и даты');
      return;
    }

    const result = await createSchedule({
      masterIds: selectedMastersForSchedule,
      dates: selectedDatesForSchedule,
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime,
    });

    if (result.success) {
      hapticFeedback('success');
      await loadData();
      setScheduleModalMode('view');
      setSelectedMastersForSchedule([]);
      setSelectedDatesForSchedule([]);
      await showAlert(result.data?.message || 'Смены созданы!');
    } else {
      await showAlert(result.error?.message || 'Ошибка при создании смен');
    }
  };

  const handleCopySchedules = async () => {
    if (copySourceSchedules.length === 0 || selectedDatesForSchedule.length === 0) {
      await showAlert('Выберите смены и целевые даты');
      return;
    }

    // Для каждой смены создаём копии на выбранные даты
    const masterIds = [...new Set(copySourceSchedules.map(s => s.masterId))];
    
    // Группируем смены по времени
    let created = 0;
    let updated = 0;
    
    for (const schedule of copySourceSchedules) {
      const result = await createSchedule({
        masterId: schedule.masterId,
        dates: selectedDatesForSchedule,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      });
      
      if (result.success && result.data) {
        created += result.data.created;
        updated += result.data.updated;
      }
    }

    hapticFeedback('success');
    await loadData();
    setScheduleModalMode('view');
    setCopySourceSchedules([]);
    setSelectedDatesForSchedule([]);
    await showAlert(`Создано: ${created}, обновлено: ${updated}`);
  };

  const handleUpdateSchedule = async () => {
    if (!editingSchedule) return;

    const result = await updateSchedule({
      id: editingSchedule.id,
      startTime: editingSchedule.startTime,
      endTime: editingSchedule.endTime,
    });

    if (result.success) {
      hapticFeedback('success');
      setEditingSchedule(null);
      await loadData();
      await showAlert('Смена обновлена');
    } else {
      await showAlert(result.error?.message || 'Ошибка при обновлении');
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    const confirmed = await showConfirm('Удалить эту смену?');
    if (!confirmed) return;

    const result = await deleteSchedule(scheduleId);

    if (result.success) {
      hapticFeedback('success');
      await loadData();
      await showAlert('Смена удалена');
    } else {
      await showAlert(result.error?.message || 'Ошибка при удалении');
    }
  };

  const tabs = [
    { id: 'bookings', label: 'Записи' },
    { id: 'masters', label: 'Мастера' },
    { id: 'services', label: 'Услуги' },
    { id: 'categories', label: 'Категории' },
    { id: 'schedule', label: 'Расписание' },
    { id: 'reports', label: 'Отчёты' }
  ];

  const masterOptions = [
    { value: 'all', label: 'Все мастера' },
    ...masters.map((m) => ({ value: String(m.id), label: m.name }))
  ];

  const timeOptions = [
    { value: '09:00', label: '09:00' },
    { value: '09:30', label: '09:30' },
    { value: '10:00', label: '10:00' },
    { value: '10:30', label: '10:30' },
    { value: '11:00', label: '11:00' },
    { value: '11:30', label: '11:30' },
    { value: '12:00', label: '12:00' },
    { value: '12:30', label: '12:30' },
    { value: '13:00', label: '13:00' },
    { value: '13:30', label: '13:30' },
    { value: '14:00', label: '14:00' },
    { value: '14:30', label: '14:30' },
    { value: '15:00', label: '15:00' },
    { value: '15:30', label: '15:30' },
    { value: '16:00', label: '16:00' },
    { value: '16:30', label: '16:30' },
    { value: '17:00', label: '17:00' },
    { value: '17:30', label: '17:30' },
    { value: '18:00', label: '18:00' },
    { value: '18:30', label: '18:30' },
    { value: '19:00', label: '19:00' },
    { value: '19:30', label: '19:30' },
    { value: '20:00', label: '20:00' },
    { value: '20:30', label: '20:30' },
    { value: '21:00', label: '21:00' }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto mb-2" />
          <p className="text-gray-500">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header section */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Панель администратора
          </h1>
          <p className="text-gray-500">Управление салоном</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="Записи сегодня"
            value={bookings.filter(b => b.date === new Date().toISOString().split('T')[0]).length}
            icon={<Calendar className="h-5 w-5" />}
          />
          <StatCard
            label="Мастеров"
            value={masters.length}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            label="Услуг оказано"
            value={stats.completedBookings}
            icon={<Scissors className="h-5 w-5" />}
          />
          <StatCard
            label="Выручка"
            value={`₽${(stats.totalRevenue / 1000).toFixed(0)}K`}
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </div>

        {/* Tabs */}
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="mb-6"
        />

        {/* Bookings tab */}
        {activeTab === 'bookings' && (
          <TabContent>
            <div className="mb-4 space-y-3">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Мастер:</span>
                  <Select
                    options={masterOptions}
                    value={selectedMasterFilter}
                    onChange={(e) => setSelectedMasterFilter(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">С даты:</span>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              </div>
              {/* Стилизованный toggle-фильтр */}
              <button
                onClick={() => setShowCompletedBookings(!showCompletedBookings)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  showCompletedBookings
                    ? 'gold-gradient text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300'
                }`}
              >
                <Clock className="h-4 w-4" />
                Только завершённые/отменённые
              </button>
            </div>

            <div className="space-y-3">
              {filteredBookings.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Нет записей</p>
                </div>
              ) : (
                filteredBookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardContent>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {booking.service}
                          </h3>
                          <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                            <User className="h-4 w-4" />
                            <span>{booking.client}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                            <span>Мастер: {booking.master}</span>
                          </div>
                        </div>
                        <StatusBadge status={booking.status} />
                      </div>
                      <div className="flex items-center gap-4 text-gray-500 text-sm mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(booking.date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{booking.time}</span>
                        </div>
                      </div>
                      
                      {/* Кнопки управления записью */}
                      {booking.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleConfirmBooking(booking.id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Подтвердить
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectBooking(booking.id)}
                            className="text-red-500 border-red-200 hover:bg-red-50"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Отклонить
                          </Button>
                        </div>
                      )}
                      {booking.status === 'confirmed' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleCompleteBooking(booking.id)}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Завершить
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectBooking(booking.id)}
                            className="text-red-500 border-red-200 hover:bg-red-50"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Отменить
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabContent>
        )}

        {/* Masters tab */}
        {activeTab === 'masters' && (
          <TabContent>
            <Card className="mb-6">
              <CardContent>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Добавить мастера
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Введите Telegram ID пользователя (он должен сначала открыть приложение)
                </p>
                <div className="space-y-3">
                  <Input
                    placeholder="Telegram ID (число)"
                    value={newMasterTelegram}
                    onChange={(e) => setNewMasterTelegram(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Псевдоним (опционально)"
                      value={newMasterNickname}
                      onChange={(e) => setNewMasterNickname(e.target.value)}
                    />
                    <Input
                      placeholder="Специализация"
                      value={newMasterSpecialization}
                      onChange={(e) => setNewMasterSpecialization(e.target.value)}
                    />
                  </div>
                  {/* Стилизованный switch для разрешения создавать услуги */}
                  <button
                    type="button"
                    onClick={() => setNewMasterCanCreate(!newMasterCanCreate)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      newMasterCanCreate
                        ? 'gold-gradient text-white shadow-sm'
                        : 'bg-gray-100 border border-gray-200 text-gray-600 hover:border-amber-300'
                    }`}
                  >
                    <Scissors className="h-4 w-4" />
                    Разрешить создавать услуги
                  </button>
                  <Button onClick={handleAddMaster} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить мастера
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {masters.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Нет мастеров</p>
                </div>
              ) : (
                masters.map((master) => (
                  <div key={master.id}>
                    <Card>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">
                                {master.name}
                              </h3>
                              {master.nickname && (
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                                  псевдоним
                                </span>
                              )}
                            </div>
                            {master.fullName && master.nickname && (
                              <p className="text-xs text-gray-400">
                                Реальное имя: {master.fullName}
                              </p>
                            )}
                            <p className="text-sm text-gray-500">
                              {master.specialization}
                            </p>
                            <p className="text-sm text-amber-600">
                              ID: {master.telegram_id}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right mr-4">
                              <p className="text-2xl font-bold text-gray-900">
                                {master.bookings}
                              </p>
                              <p className="text-sm text-gray-500">записей</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingMaster(editingMaster?.id === master.id ? null : master)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMaster(master)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    {/* Inline редактирование мастера */}
                    {editingMaster?.id === master.id && (
                      <Card className="mt-2 border-amber-500 border-2 bg-amber-50/30">
                        <CardContent>
                          <div className="space-y-3">
                            <Input
                              label="Псевдоним"
                              placeholder="Имя для клиентов"
                              value={editingMaster.nickname || ''}
                              onChange={(e) => setEditingMaster({
                                ...editingMaster,
                                nickname: e.target.value
                              })}
                            />
                            <Input
                              label="Специализация"
                              placeholder="Например: Стилист"
                              value={editingMaster.specialization || ''}
                              onChange={(e) => setEditingMaster({
                                ...editingMaster,
                                specialization: e.target.value
                              })}
                            />
                            <button
                              type="button"
                              onClick={() => setEditingMaster({
                                ...editingMaster,
                                canCreateServices: !editingMaster.canCreateServices
                              })}
                              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                editingMaster.canCreateServices
                                  ? 'gold-gradient text-white shadow-sm'
                                  : 'bg-gray-100 border border-gray-200 text-gray-600 hover:border-amber-300'
                              }`}
                            >
                              <Scissors className="h-4 w-4" />
                              Разрешить создавать услуги
                            </button>
                            <div className="flex gap-3">
                              <Button onClick={handleUpdateMaster} className="flex-1">
                                Сохранить
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={() => setEditingMaster(null)}
                              >
                                Отмена
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabContent>
        )}

        {/* Services tab */}
        {activeTab === 'services' && (
          <TabContent>
            {/* Форма добавления услуги */}
            <Card className="mb-6">
              <CardContent>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  <Plus className="h-5 w-5 inline mr-2" />
                  Добавить услугу
                </h3>
                <div className="space-y-3">
                  <Input
                    label="Название услуги"
                    placeholder="Например: Стрижка мужская"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                  />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Select
                      label="Категория"
                      options={categories.map(c => ({ value: c.id, label: c.name }))}
                      value={newServiceCategory || ''}
                      onChange={(e) => setNewServiceCategory(Number(e.target.value) || null)}
                      placeholder="Выберите"
                    />
                    <Input
                      label="Цена (₽)"
                      type="number"
                      placeholder="1500"
                      value={newServicePrice}
                      onChange={(e) => setNewServicePrice(e.target.value)}
                    />
                    <Input
                      label="Длительность (мин)"
                      type="number"
                      placeholder="60"
                      value={newServiceDuration}
                      onChange={(e) => setNewServiceDuration(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleAddService} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить услугу
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Назначение услуги мастеру */}
            <Card className="mb-6">
              <CardContent>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  <Scissors className="h-5 w-5 inline mr-2" />
                  Назначить услугу мастеру
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Выберите услугу и мастера для назначения
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Select
                    label="Услуга"
                    options={services.map(s => ({ value: s.id, label: `${s.name} (${s.category})` }))}
                    value={selectedServiceId || ''}
                    onChange={(e) => setSelectedServiceId(Number(e.target.value) || null)}
                    placeholder="Выберите услугу"
                  />
                  <Select
                    label="Мастер"
                    options={masters.map(m => ({ value: m.id, label: m.name }))}
                    value={selectedMasterForService}
                    onChange={(e) => setSelectedMasterForService(e.target.value)}
                    placeholder="Выберите мастера"
                  />
                  <div className="flex items-end">
                    <Button onClick={handleAssignService} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Назначить
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Все услуги ({services.length})
              </h3>
              {services.length === 0 ? (
                <div className="text-center py-12">
                  <Scissors className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Нет услуг</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Добавьте услугу с помощью формы выше
                  </p>
                </div>
              ) : (
                services.map((service) => (
                  <div key={service.id}>
                    <Card>
                      <CardContent>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">
                              {service.category}
                            </p>
                            <h3 className="font-semibold text-gray-900">
                              {service.name}
                            </h3>
                            <p className="text-sm text-amber-600">
                              {service.price} ₽ • {service.duration} мин
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingService(editingService?.id === service.id ? null : service)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteService(service)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3">
                          <p className="text-sm text-gray-500 mb-2">
                            Мастера ({service.masters?.length || 0}):
                          </p>
                          {service.masters && service.masters.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {service.masters.map((master) => (
                                <span
                                  key={master.id}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-sm"
                                >
                                  <User className="h-3 w-3" />
                                  {master.name}
                                  <button
                                    onClick={() => handleRemoveServiceFromMaster(service.id, master.id)}
                                    className="ml-1 text-amber-500 hover:text-red-500"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 italic">
                              Не назначены мастера
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    {/* Inline редактирование услуги */}
                    {editingService?.id === service.id && (
                      <Card className="mt-2 border-amber-500 border-2 bg-amber-50/30">
                        <CardContent>
                          <div className="space-y-3">
                            <Input
                              label="Название"
                              value={editingService.name}
                              onChange={(e) => setEditingService({
                                ...editingService,
                                name: e.target.value
                              })}
                            />
                            <div className="grid grid-cols-3 gap-3">
                              <Select
                                label="Категория"
                                options={categories.map(c => ({ value: c.id, label: c.name }))}
                                value={editingService.categoryId}
                                onChange={(e) => setEditingService({
                                  ...editingService,
                                  categoryId: Number(e.target.value)
                                })}
                              />
                              <Input
                                label="Цена (₽)"
                                type="number"
                                value={editingService.price}
                                onChange={(e) => setEditingService({
                                  ...editingService,
                                  price: Number(e.target.value)
                                })}
                              />
                              <Input
                                label="Длительность (мин)"
                                type="number"
                                value={editingService.duration}
                                onChange={(e) => setEditingService({
                                  ...editingService,
                                  duration: Number(e.target.value)
                                })}
                              />
                            </div>
                            <div className="flex gap-3">
                              <Button onClick={handleUpdateService} className="flex-1">
                                Сохранить
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={() => setEditingService(null)}
                              >
                                Отмена
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabContent>
        )}

        {/* Categories tab */}
        {activeTab === 'categories' && (
          <TabContent>
            <Card className="mb-6">
              <CardContent>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  <FolderPlus className="h-5 w-5 inline mr-2" />
                  Добавить категорию
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Категории нужны для группировки услуг
                </p>
                <div className="flex gap-3">
                  <Input
                    placeholder="Название категории (например: Стрижки)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleAddCategory}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {categories.length === 0 ? (
                <div className="text-center py-12">
                  <FolderPlus className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Нет категорий</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Добавьте категории, чтобы мастера могли создавать услуги
                  </p>
                </div>
              ) : (
                categories.map((category) => (
                  <div key={category.id}>
                    <Card>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                              <Scissors className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {category.name}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {category.servicesCount || 0} услуг
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingCategory(editingCategory?.id === category.id ? null : category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCategory(category)}
                              className="text-red-500 hover:text-red-700"
                              disabled={(category.servicesCount || 0) > 0}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    {/* Inline редактирование категории */}
                    {editingCategory?.id === category.id && (
                      <Card className="mt-2 border-amber-500 border-2 bg-amber-50/30">
                        <CardContent>
                          <div className="space-y-3">
                            <Input
                              label="Название"
                              placeholder="Название категории"
                              value={editingCategory.name}
                              onChange={(e) => setEditingCategory({
                                ...editingCategory,
                                name: e.target.value
                              })}
                            />
                            <div className="flex gap-3">
                              <Button onClick={handleUpdateCategory} className="flex-1">
                                Сохранить
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={() => setEditingCategory(null)}
                              >
                                Отмена
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabContent>
        )}

        {/* Schedule tab */}
        {activeTab === 'schedule' && (
          <TabContent>
            {/* Календарь смен */}
            <Card className="mb-6">
              <CardContent>
                {/* Навигация по месяцам */}
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCalendarMonth(prev => {
                      const d = new Date(prev);
                      d.setMonth(d.getMonth() - 1);
                      return d;
                    })}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {calendarMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCalendarMonth(prev => {
                      const d = new Date(prev);
                      d.setMonth(d.getMonth() + 1);
                      return d;
                    })}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Дни недели */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Дни месяца */}
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
                    const lastDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
                    const startWeekDay = (firstDay.getDay() + 6) % 7; // Понедельник = 0
                    const days: React.ReactElement[] = [];
                    const today = new Date().toISOString().split('T')[0];
                    
                    // Пустые ячейки до первого дня месяца
                    for (let i = 0; i < startWeekDay; i++) {
                      days.push(<div key={`empty-${i}`} className="h-16" />);
                    }
                    
                    // Дни месяца
                    for (let d = 1; d <= lastDay.getDate(); d++) {
                      const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      const daySchedules = schedules.filter(s => s.date === dateStr);
                      const isToday = dateStr === today;
                      const isPast = dateStr < today;
                      const isSelected = selectedDate === dateStr;
                      const isInSelectedDates = selectedDatesForSchedule.includes(dateStr);
                      
                      days.push(
                        <button
                          key={d}
                          onClick={() => {
                            if (scheduleModalMode === 'create' || scheduleModalMode === 'copy') {
                              // В режиме создания/копирования - выбор нескольких дат
                              if (isPast) return;
                              setSelectedDatesForSchedule(prev => 
                                prev.includes(dateStr)
                                  ? prev.filter(dd => dd !== dateStr)
                                  : [...prev, dateStr]
                              );
                            } else {
                              // В режиме просмотра - открыть детали дня
                              setSelectedDate(isSelected ? null : dateStr);
                            }
                          }}
                          className={`h-16 p-1 rounded-lg border transition-all relative ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200'
                              : isInSelectedDates
                              ? 'border-amber-400 bg-amber-100'
                              : isToday
                              ? 'border-amber-300 bg-amber-50/50'
                              : isPast
                              ? 'border-gray-100 bg-gray-50 opacity-60'
                              : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/30'
                          }`}
                        >
                          <span className={`text-sm font-medium ${
                            isToday ? 'text-amber-600' : isPast ? 'text-gray-400' : 'text-gray-700'
                          }`}>
                            {d}
                          </span>
                          {daySchedules.length > 0 && (
                            <div className="absolute bottom-1 left-1 right-1">
                              <div className="flex flex-wrap gap-0.5 justify-center">
                                {daySchedules.slice(0, 3).map((s, i) => (
                                  <div
                                    key={i}
                                    className="w-1.5 h-1.5 rounded-full bg-amber-500"
                                    title={s.master}
                                  />
                                ))}
                                {daySchedules.length > 3 && (
                                  <span className="text-[10px] text-amber-600">+{daySchedules.length - 3}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    }
                    
                    return days;
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Панель действий */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                onClick={() => {
                  setScheduleModalMode('create');
                  setSelectedDatesForSchedule([]);
                  setSelectedMastersForSchedule([]);
                  setSelectedDate(null);
                }}
                className={scheduleModalMode === 'create' ? 'ring-2 ring-amber-300' : ''}
              >
                <Plus className="h-4 w-4 mr-2" />
                Создать смены
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (scheduleModalMode === 'copy') {
                    setScheduleModalMode('view');
                    setCopySourceSchedules([]);
                    setSelectedDatesForSchedule([]);
                  } else {
                    setScheduleModalMode('copy');
                    setSelectedDatesForSchedule([]);
                  }
                }}
                className={scheduleModalMode === 'copy' ? 'ring-2 ring-amber-300 border-amber-400' : ''}
              >
                <Copy className="h-4 w-4 mr-2" />
                {scheduleModalMode === 'copy' ? 'Отмена копирования' : 'Копировать смены'}
              </Button>
            </div>

            {/* Форма массового создания смен */}
            {scheduleModalMode === 'create' && (
              <Card className="mb-6 border-amber-500 border-2">
                <CardContent>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    <CalendarDays className="h-5 w-5 inline mr-2" />
                    Создание смен
                  </h3>
                  
                  {/* Выбор мастеров */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Мастера (можно выбрать несколько)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {masters.map(m => (
                        <button
                          key={m.id}
                          onClick={() => setSelectedMastersForSchedule(prev =>
                            prev.includes(m.id)
                              ? prev.filter(id => id !== m.id)
                              : [...prev, m.id]
                          )}
                          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                            selectedMastersForSchedule.includes(m.id)
                              ? 'gold-gradient text-white shadow-sm'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Выбранные даты */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Выбранные даты ({selectedDatesForSchedule.length})
                    </label>
                    {selectedDatesForSchedule.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedDatesForSchedule.sort().map(d => (
                          <span
                            key={d}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-sm"
                          >
                            {formatDate(d)}
                            <button
                              onClick={() => setSelectedDatesForSchedule(prev => prev.filter(dd => dd !== d))}
                              className="text-amber-500 hover:text-red-500"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Кликните на даты в календаре выше</p>
                    )}
                  </div>
                  
                  {/* Время */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <Select
                      label="Начало"
                      options={timeOptions}
                      value={scheduleForm.startTime}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                    />
                    <Select
                      label="Конец"
                      options={timeOptions}
                      value={scheduleForm.endTime}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={handleMassCreateSchedules}
                      disabled={selectedMastersForSchedule.length === 0 || selectedDatesForSchedule.length === 0}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Создать {selectedMastersForSchedule.length * selectedDatesForSchedule.length} смен(ы)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setScheduleModalMode('view');
                        setSelectedDatesForSchedule([]);
                        setSelectedMastersForSchedule([]);
                      }}
                    >
                      Отмена
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Форма копирования смен */}
            {scheduleModalMode === 'copy' && (
              <Card className="mb-6 border-amber-500 border-2">
                <CardContent>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    <Copy className="h-5 w-5 inline mr-2" />
                    Копирование смен
                  </h3>
                  
                  {copySourceSchedules.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-gray-500 mb-2">Выберите смены для копирования</p>
                      <p className="text-sm text-gray-400">Кликните на дату в календаре, затем выберите смены</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Смены для копирования
                        </label>
                        <div className="space-y-2">
                          {copySourceSchedules.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm">
                                <strong>{s.master}</strong> • {s.startTime}-{s.endTime}
                              </span>
                              <button
                                onClick={() => setCopySourceSchedules(prev => prev.filter(ss => ss.id !== s.id))}
                                className="text-gray-400 hover:text-red-500"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Копировать на даты ({selectedDatesForSchedule.length})
                        </label>
                        {selectedDatesForSchedule.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedDatesForSchedule.sort().map(d => (
                              <span
                                key={d}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-sm"
                              >
                                {formatDate(d)}
                                <button
                                  onClick={() => setSelectedDatesForSchedule(prev => prev.filter(dd => dd !== d))}
                                  className="text-amber-500 hover:text-red-500"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Кликните на даты в календаре выше</p>
                        )}
                      </div>
                      
                      <div className="flex gap-3">
                        <Button
                          onClick={handleCopySchedules}
                          disabled={selectedDatesForSchedule.length === 0}
                          className="flex-1"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Копировать на {selectedDatesForSchedule.length} дат(у)
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setScheduleModalMode('view');
                            setCopySourceSchedules([]);
                            setSelectedDatesForSchedule([]);
                          }}
                        >
                          Отмена
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Детали выбранного дня */}
            {selectedDate && scheduleModalMode === 'view' && (
              <Card className="mb-6 border-amber-500 border-2">
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {formatDate(selectedDate)}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDate(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {(() => {
                    const daySchedules = schedules.filter(s => s.date === selectedDate);
                    const dayBookings = bookings.filter(b => b.date === selectedDate);
                    const today = new Date().toISOString().split('T')[0];
                    const isPastDay = selectedDate < today;
                    
                    if (daySchedules.length === 0) {
                      return (
                        <div className="text-center py-4">
                          <p className="text-gray-500">Нет смен в этот день</p>
                          {!isPastDay && (
                            <Button
                              className="mt-3"
                              onClick={() => {
                                setScheduleModalMode('create');
                                setSelectedDatesForSchedule([selectedDate]);
                                setSelectedDate(null);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Создать смену
                            </Button>
                          )}
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-3">
                        {daySchedules.map(schedule => (
                          <div key={schedule.id}>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-900">{schedule.master}</p>
                                <p className="text-sm text-amber-600">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  {schedule.startTime} - {schedule.endTime}
                                </p>
                                {/* Записи этого мастера */}
                                {(() => {
                                  const masterBookings = dayBookings.filter(b => b.masterId === schedule.masterId);
                                  if (masterBookings.length > 0) {
                                    return (
                                      <div className="mt-2 text-xs text-gray-500">
                                        Записей: {masterBookings.length} • 
                                        Выручка: {formatPrice(masterBookings.reduce((sum, b) => sum + b.price, 0))}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                              <div className="flex items-center gap-1">
                                {/* Копировать в буфер */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setCopySourceSchedules(prev => 
                                      prev.some(s => s.id === schedule.id)
                                        ? prev.filter(s => s.id !== schedule.id)
                                        : [...prev, schedule]
                                    );
                                    // Переключаем в режим копирования
                                    setScheduleModalMode('copy');
                                  }}
                                  className={copySourceSchedules.some(s => s.id === schedule.id) ? 'text-amber-600' : ''}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                {/* Редактировать */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingSchedule(
                                    editingSchedule?.id === schedule.id ? null : schedule
                                  )}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {/* Удалить (только для будущих смен) */}
                                {!isPastDay && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteSchedule(schedule.id)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            {/* Inline редактирование смены */}
                            {editingSchedule?.id === schedule.id && (
                              <div className="mt-2 p-3 border border-amber-300 rounded-lg bg-amber-50/50">
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                  <Select
                                    label="Начало"
                                    options={timeOptions}
                                    value={editingSchedule.startTime}
                                    onChange={(e) => setEditingSchedule({
                                      ...editingSchedule,
                                      startTime: e.target.value
                                    })}
                                  />
                                  <Select
                                    label="Конец"
                                    options={timeOptions}
                                    value={editingSchedule.endTime}
                                    onChange={(e) => setEditingSchedule({
                                      ...editingSchedule,
                                      endTime: e.target.value
                                    })}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={handleUpdateSchedule} size="sm" className="flex-1">
                                    Сохранить
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingSchedule(null)}
                                  >
                                    Отмена
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </TabContent>
        )}

        {/* Reports tab */}
        {activeTab === 'reports' && (
          <TabContent>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {/* Services report */}
              <Card>
                <CardContent>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Услуги за месяц
                  </h3>
                  {serviceReports.length === 0 ? (
                    <p className="text-gray-500 text-sm">Нет данных</p>
                  ) : (
                    <div className="space-y-3">
                      {serviceReports.map((report) => (
                        <div
                          key={report.category}
                          className="flex items-center justify-between"
                        >
                          <span className="text-gray-600">{report.category}</span>
                          <span className="font-medium">{report.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Revenue report */}
              <Card>
                <CardContent>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Выручка по услугам
                  </h3>
                  {serviceReports.length === 0 ? (
                    <p className="text-gray-500 text-sm">Нет данных</p>
                  ) : (
                    <div className="space-y-3">
                      {serviceReports.map((report) => (
                        <div
                          key={report.category}
                          className="flex items-center justify-between"
                        >
                          <span className="text-gray-600">{report.category}</span>
                          <span className="font-medium">
                            {formatPrice(report.revenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Masters rating */}
              <Card>
                <CardContent>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Рейтинг мастеров
                  </h3>
                  {masterReports.length === 0 ? (
                    <p className="text-gray-500 text-sm">Нет данных</p>
                  ) : (
                    <div className="space-y-3">
                      {masterReports.map((report, index) => (
                        <div
                          key={report.masterId}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-amber-600 font-bold">
                              #{index + 1}
                            </span>
                            <span className="text-gray-600">{report.name}</span>
                          </div>
                          <span className="font-medium">{report.bookings}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Statistics */}
              <Card>
                <CardContent>
                  <h3 className="font-semibold text-gray-900 mb-4">Статистика</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Средний чек</span>
                      <span className="font-medium">
                        {formatPrice(stats.averageCheck)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Новых клиентов</span>
                      <span className="font-medium">{stats.newClients}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Повторных визитов</span>
                      <span className="font-medium">{stats.repeatRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabContent>
        )}
      </main>
    </div>
  );
}
