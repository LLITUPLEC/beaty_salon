'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, User, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Header } from './ui/Header';
import { Tabs, TabContent } from './ui/Tabs';
import { Card, CardContent, StatCard } from './ui/Card';
import { StatusBadge } from './ui/Badge';
import { Button } from './ui/Button';
import { ServiceEditor } from './ServiceEditor';
import { Service, Booking, ServiceFormData } from '@/types';
import { formatPrice, formatDuration, formatDate } from '@/lib/utils';
import { hapticFeedback, showAlert, showConfirm } from '@/lib/telegram';
import {
  getServices,
  getBookings,
  updateBookingStatus,
  createService,
  updateService,
  deleteService,
  ServiceData,
  BookingData
} from '@/lib/api-client';

interface MasterDashboardProps {
  masterName: string;
}

export function MasterDashboard({ masterName }: MasterDashboardProps) {
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isAddingService, setIsAddingService] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bookingsRes, servicesRes] = await Promise.all([
        getBookings(),
        getServices()
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

  const handleSaveService = async (data: ServiceFormData) => {
    if (editingService) {
      const result = await updateService(editingService.id, {
        name: data.name,
        price: data.price,
        duration: data.duration,
      });
      if (result.success) {
        await loadData();
        hapticFeedback('success');
        await showAlert('Услуга обновлена!');
      }
    } else {
      const result = await createService({
        name: data.name,
        categoryId: 1, // Default category
        price: data.price,
        duration: data.duration,
      });
      if (result.success) {
        await loadData();
        hapticFeedback('success');
        await showAlert('Услуга добавлена!');
      }
    }

    setEditingService(null);
    setIsAddingService(false);
  };

  const handleDeleteService = async (serviceId: number) => {
    const confirmed = await showConfirm('Удалить эту услугу?');
    if (confirmed) {
      const result = await deleteService(serviceId);
      if (result.success) {
        hapticFeedback('warning');
        setServices(services.filter((s) => s.id !== serviceId));
      }
    }
  };

  const tabs = [
    { id: 'bookings', label: 'Записи' },
    { id: 'services', label: 'Услуги' }
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

  // Show service editor
  if (isAddingService || editingService) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          <ServiceEditor
            service={editingService}
            onBack={() => {
              setIsAddingService(false);
              setEditingService(null);
            }}
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
          <p className="text-gray-500">Управляйте записями и услугами</p>
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
            label="Услуги"
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
            <div className="space-y-3">
              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Нет записей</p>
                </div>
              ) : (
                bookings.map((booking) => (
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
                ))
              )}
            </div>
          </TabContent>
        )}

        {/* Services tab */}
        {activeTab === 'services' && (
          <TabContent>
            <Button
              onClick={() => setIsAddingService(true)}
              className="mb-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить услугу
            </Button>

            <div className="space-y-3">
              {services.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Нет услуг</p>
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingService(service)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service.id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-gray-900 mt-2">
                        {formatPrice(service.price)}
                      </p>
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
