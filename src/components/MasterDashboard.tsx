'use client';

import { useState } from 'react';
import { Calendar, Clock, User, Plus, Pencil, Trash2 } from 'lucide-react';
import { Header } from './ui/Header';
import { Tabs, TabContent } from './ui/Tabs';
import { Card, CardContent, StatCard } from './ui/Card';
import { StatusBadge } from './ui/Badge';
import { Button } from './ui/Button';
import { ServiceEditor } from './ServiceEditor';
import { Service, Booking, ServiceFormData } from '@/types';
import { formatPrice, formatDuration, formatDate } from '@/lib/utils';
import { mockServices, mockMasterBookings } from '@/lib/mockData';
import { hapticFeedback, showAlert, showConfirm } from '@/lib/telegram';

interface MasterDashboardProps {
  masterName: string;
  onLogout: () => void;
}

export function MasterDashboard({ masterName, onLogout }: MasterDashboardProps) {
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState<Booking[]>(mockMasterBookings);
  const [services, setServices] = useState<Service[]>(mockServices);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isAddingService, setIsAddingService] = useState(false);

  const todayBookings = bookings.filter(
    (b) => b.date === new Date().toISOString().split('T')[0]
  );
  const pendingBookings = bookings.filter((b) => b.status === 'pending');

  const handleConfirmBooking = async (bookingId: number) => {
    hapticFeedback('success');
    setBookings(
      bookings.map((b) =>
        b.id === bookingId ? { ...b, status: 'confirmed' as const } : b
      )
    );
    await showAlert('Запись подтверждена!');
  };

  const handleRejectBooking = async (bookingId: number) => {
    const confirmed = await showConfirm('Вы уверены, что хотите отклонить эту запись?');
    if (confirmed) {
      hapticFeedback('warning');
      setBookings(
        bookings.map((b) =>
          b.id === bookingId ? { ...b, status: 'cancelled' as const } : b
        )
      );
    }
  };

  const handleSaveService = async (data: ServiceFormData) => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (editingService) {
      setServices(
        services.map((s) =>
          s.id === editingService.id ? { ...s, ...data } : s
        )
      );
      hapticFeedback('success');
      await showAlert('Услуга обновлена!');
    } else {
      const newService: Service = {
        id: Date.now(),
        ...data
      };
      setServices([...services, newService]);
      hapticFeedback('success');
      await showAlert('Услуга добавлена!');
    }

    setEditingService(null);
    setIsAddingService(false);
  };

  const handleDeleteService = async (serviceId: number) => {
    const confirmed = await showConfirm('Удалить эту услугу?');
    if (confirmed) {
      hapticFeedback('warning');
      setServices(services.filter((s) => s.id !== serviceId));
    }
  };

  const tabs = [
    { id: 'bookings', label: 'Записи' },
    { id: 'services', label: 'Услуги' }
  ];

  // Show service editor
  if (isAddingService || editingService) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onLogout={onLogout} />
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
      <Header onLogout={onLogout} />
      
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
            value={todayBookings.length > 0 ? todayBookings.length : 8}
          />
          <StatCard
            label="Ожидают подтверждения"
            value={pendingBookings.length > 0 ? pendingBookings.length : 3}
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
              {bookings.map((booking) => (
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

              {bookings.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Нет записей</p>
                </div>
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
              {services.map((service) => (
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
              ))}

              {services.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Нет услуг</p>
                </div>
              )}
            </div>
          </TabContent>
        )}
      </main>
    </div>
  );
}

