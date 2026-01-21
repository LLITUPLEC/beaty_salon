'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, User, Plus, Loader2, Scissors } from 'lucide-react';
import { Header } from './ui/Header';
import { Tabs, TabContent } from './ui/Tabs';
import { Card, CardContent, StatCard } from './ui/Card';
import { StatusBadge } from './ui/Badge';
import { Button } from './ui/Button';
import { ServiceEditor } from './ServiceEditor';
import { Service, Booking } from '@/types';
import { formatPrice, formatDuration, formatDate } from '@/lib/utils';
import { hapticFeedback, showAlert, showConfirm } from '@/lib/telegram';
import {
  getServices,
  getBookings,
  updateBookingStatus,
  createService,
  ServiceData,
  BookingData
} from '@/lib/api-client';

interface MasterDashboardProps {
  masterName: string;
  masterId?: number;
  canCreateServices?: boolean;
}

export function MasterDashboard({ masterName, masterId, canCreateServices = false }: MasterDashboardProps) {
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isAddingService, setIsAddingService] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bookingsRes, servicesRes] = await Promise.all([
        getBookings({ showCompleted }),
        // Получаем услуги, которые мастер может оказывать
        masterId ? getServices({ masterId }) : getServices()
      ]);

      if (bookingsRes.success && bookingsRes.data) {
        setBookings(bookingsRes.data.map(mapBookingData));
      }

      if (servicesRes.success && servicesRes.data) {
        setServices(servicesRes.data.map(mapServiceData));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [showCompleted]);

  const loadBookings = async () => {
    const result = await getBookings({ showCompleted });
    if (result.success && result.data) {
      setBookings(result.data.map(mapBookingData));
    }
  };

  const mapServiceData = (data: ServiceData): Service => ({
    id: data.id,
    name: data.name,
    category: data.category,
    price: data.price,
    duration: data.duration,
  });

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

  const activeBookings = bookings.filter(
    (b) => b.status === 'pending' || b.status === 'confirmed'
  );
  
  const completedBookings = bookings.filter(
    (b) => b.status === 'completed' || b.status === 'cancelled'
  );

  const todayBookings = bookings.filter(
    (b) => b.date === new Date().toISOString().split('T')[0]
  );
  const pendingBookings = bookings.filter((b) => b.status === 'pending');

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
    const confirmed = await showConfirm('Вы уверены, что хотите отклонить эту запись?');
    if (confirmed) {
      const result = await updateBookingStatus(bookingId, 'cancelled');
      if (result.success) {
        hapticFeedback('warning');
        setBookings(
          bookings.map((b) =>
            b.id === bookingId ? { ...b, status: 'cancelled' as const } : b
          )
        );
      }
    }
  };

  const handleSaveService = async (data: { name: string; categoryId: number; price: number; duration: number }) => {
    const result = await createService({
      name: data.name,
      categoryId: data.categoryId,
      price: data.price,
      duration: data.duration,
    });
    
    if (result.success) {
      await loadData();
      hapticFeedback('success');
      await showAlert('Услуга добавлена!');
    } else {
      await showAlert(result.error?.message || 'Ошибка при создании услуги');
    }

    setIsAddingService(false);
  };

  const tabs = [
    { id: 'bookings', label: 'Записи' },
    { id: 'services', label: 'Мои услуги' }
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

  // Show service editor (only if allowed)
  if (isAddingService && canCreateServices) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          <ServiceEditor
            service={null}
            onBack={() => setIsAddingService(false)}
            onSave={handleSaveService}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header section */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Панель мастера</h1>
          <p className="text-gray-500">{masterName}</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard
            label="Записи сегодня"
            value={todayBookings.length}
          />
          <StatCard
            label="Ожидают"
            value={pendingBookings.length}
          />
          <StatCard
            label="Мои услуги"
            value={services.length}
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
            {/* Show completed filter */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded border-gray-300 focus:ring-amber-500"
                />
                <span className="text-sm text-gray-600">Показать завершённые</span>
              </label>
            </div>

            <div className="space-y-3">
              {activeBookings.length === 0 && !showCompleted ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Нет активных записей</p>
                </div>
              ) : (
                <>
                  {/* Active bookings */}
                  {activeBookings.map((booking) => (
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

                        {booking.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleConfirmBooking(booking.id)}
                            >
                              Подтвердить
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectBooking(booking.id)}
                            >
                              Отклонить
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {/* Completed bookings */}
                  {showCompleted && completedBookings.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 mt-6 mb-3">
                        <Clock className="h-5 w-5 text-gray-400" />
                        <h2 className="text-lg font-semibold text-gray-900">
                          Завершённые
                        </h2>
                      </div>
                      {completedBookings.map((booking) => (
                        <Card key={booking.id} className="opacity-75">
                          <CardContent>
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-medium text-gray-700">
                                  {booking.service}
                                </h3>
                                <div className="flex items-center gap-1 text-gray-400 text-sm mt-1">
                                  <User className="h-4 w-4" />
                                  <span>{booking.client}</span>
                                </div>
                              </div>
                              <StatusBadge status={booking.status} />
                            </div>
                            <div className="flex items-center gap-4 text-gray-400 text-sm">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(booking.date)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{booking.time}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </TabContent>
        )}

        {/* Services tab */}
        {activeTab === 'services' && (
          <TabContent>
            {/* Add service button - only if allowed */}
            {canCreateServices && (
              <Button
                onClick={() => setIsAddingService(true)}
                className="mb-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить услугу
              </Button>
            )}

            {!canCreateServices && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700">
                  Услуги назначаются администратором
                </p>
              </div>
            )}

            <div className="space-y-3">
              {services.length === 0 ? (
                <div className="text-center py-12">
                  <Scissors className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {canCreateServices 
                      ? 'Нет услуг. Добавьте первую услугу.' 
                      : 'Вам пока не назначены услуги'
                    }
                  </p>
                </div>
              ) : (
                services.map((service) => (
                  <Card key={service.id}>
                    <CardContent>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                            {service.category}
                          </p>
                          <h3 className="font-semibold text-gray-900 mb-2">
                            {service.name}
                          </h3>
                          <div className="flex items-center gap-1 text-gray-500 text-sm">
                            <Clock className="h-4 w-4" />
                            <span>{formatDuration(service.duration)}</span>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-gray-900">
                          {formatPrice(service.price)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabContent>
        )}
      </main>
    </div>
  );
}
