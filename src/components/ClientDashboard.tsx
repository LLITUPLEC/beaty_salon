'use client';

import { useState } from 'react';
import { Clock, User, Calendar, CheckCircle, Scissors } from 'lucide-react';
import { Header } from './ui/Header';
import { Tabs, TabContent } from './ui/Tabs';
import { Card, CardContent } from './ui/Card';
import { StatusBadge } from './ui/Badge';
import { BookingForm } from './BookingForm';
import { Service, Booking, BookingFormData } from '@/types';
import { formatPrice, formatDuration, formatDate, cn } from '@/lib/utils';
import { mockServices, mockClientBookings } from '@/lib/mockData';
import { hapticFeedback, showAlert } from '@/lib/telegram';

interface ClientDashboardProps {
  userName: string;
  onLogout: () => void;
}

export function ClientDashboard({ userName, onLogout }: ClientDashboardProps) {
  const [activeTab, setActiveTab] = useState('services');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookings, setBookings] = useState<Booking[]>(mockClientBookings);

  const services = mockServices;

  const activeBookings = bookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'pending'
  );
  const completedBookings = bookings.filter(
    (b) => b.status === 'completed' || b.status === 'cancelled'
  );

  const handleServiceClick = (service: Service) => {
    hapticFeedback('light');
    setSelectedService(service);
  };

  const handleBookingSubmit = async (data: BookingFormData) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const service = services.find((s) => s.id === data.serviceId);
    const newBooking: Booking = {
      id: Date.now(),
      client: userName,
      clientId: 123456789,
      master: 'Анна Петрова',
      masterId: data.masterId,
      service: service?.name || '',
      serviceId: data.serviceId,
      date: data.date,
      time: data.time,
      status: 'pending',
      price: service?.price || 0,
      duration: service?.duration || 0
    };

    setBookings([newBooking, ...bookings]);
    setSelectedService(null);
    setActiveTab('bookings');
    
    hapticFeedback('success');
    await showAlert('Запись создана! Ожидайте подтверждения от мастера.');
  };

  const tabs = [
    { id: 'services', label: 'Услуги' },
    { id: 'bookings', label: 'Мои записи' }
  ];

  // Service card icon based on category
  const getCategoryIcon = (category: string) => {
    return (
      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
        <Scissors className="h-5 w-5 text-amber-600" />
      </div>
    );
  };

  if (selectedService) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onLogout={onLogout} />
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          <BookingForm
            service={selectedService}
            onBack={() => setSelectedService(null)}
            onSubmit={handleBookingSubmit}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onLogout={onLogout} />
      
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Welcome section */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Добро пожаловать</h1>
          <p className="text-gray-500">Выберите услугу и запишитесь к мастеру</p>
        </div>

        {/* Tabs */}
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="mb-6"
        />

        {/* Services tab */}
        {activeTab === 'services' && (
          <TabContent>
            <div className="grid gap-4 md:grid-cols-2">
              {services.map((service) => (
                <Card
                  key={service.id}
                  hover
                  onClick={() => handleServiceClick(service)}
                  className="cursor-pointer"
                >
                  <CardContent>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          {service.category}
                        </p>
                        <h3 className="font-semibold text-gray-900 mb-3">
                          {service.name}
                        </h3>
                        <div className="flex items-center gap-1 text-gray-500 text-sm">
                          <Clock className="h-4 w-4" />
                          <span>{formatDuration(service.duration)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        {getCategoryIcon(service.category)}
                        <p className="text-lg font-bold text-gray-900 mt-3">
                          {formatPrice(service.price)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabContent>
        )}

        {/* Bookings tab */}
        {activeTab === 'bookings' && (
          <TabContent>
            {/* Active bookings */}
            {activeBookings.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Активные записи
                  </h2>
                </div>
                <div className="space-y-3">
                  {activeBookings.map((booking) => (
                    <Card key={booking.id} className="border-l-4 border-l-amber-500">
                      <CardContent>
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {booking.service}
                          </h3>
                          <StatusBadge status={booking.status} />
                        </div>
                        <div className="flex items-center gap-1 text-gray-500 text-sm mb-1">
                          <User className="h-4 w-4" />
                          <span>{booking.master}</span>
                        </div>
                        <div className="flex items-center gap-4 text-gray-500 text-sm">
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
                </div>
              </div>
            )}

            {/* Completed bookings */}
            {completedBookings.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Завершенные записи
                  </h2>
                </div>
                <div className="space-y-3">
                  {completedBookings.map((booking) => (
                    <Card key={booking.id} className="opacity-75">
                      <CardContent>
                        <h3 className="font-medium text-gray-700 mb-1">
                          {booking.service}
                        </h3>
                        <div className="flex items-center gap-1 text-gray-400 text-sm mb-1">
                          <User className="h-4 w-4" />
                          <span>{booking.master}</span>
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
                </div>
              </div>
            )}

            {activeBookings.length === 0 && completedBookings.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">У вас пока нет записей</p>
                <button
                  onClick={() => setActiveTab('services')}
                  className="mt-4 text-amber-600 font-medium hover:underline"
                >
                  Выбрать услугу
                </button>
              </div>
            )}
          </TabContent>
        )}
      </main>
    </div>
  );
}

