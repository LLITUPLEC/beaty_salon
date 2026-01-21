'use client';

import { useState, useEffect } from 'react';
import { Clock, User, Calendar, CheckCircle, Scissors, Loader2 } from 'lucide-react';
import { Header } from './ui/Header';
import { Tabs, TabContent } from './ui/Tabs';
import { Card, CardContent } from './ui/Card';
import { StatusBadge } from './ui/Badge';
import { BookingForm } from './BookingForm';
import { Service, Booking, BookingFormData } from '@/types';
import { formatPrice, formatDuration, formatDate } from '@/lib/utils';
import { hapticFeedback, showAlert } from '@/lib/telegram';
import { 
  getServices, 
  getBookings, 
  createBooking,
  ServiceData,
  BookingData 
} from '@/lib/api-client';

interface ClientDashboardProps {
  userName: string;
}

export function ClientDashboard({ userName }: ClientDashboardProps) {
  const [activeTab, setActiveTab] = useState('services');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load services and bookings in parallel
      const [servicesRes, bookingsRes] = await Promise.all([
        getServices(),
        getBookings()
      ]);

      if (servicesRes.success && servicesRes.data) {
        setServices(servicesRes.data.map(mapServiceData));
      }

      if (bookingsRes.success && bookingsRes.data) {
        setBookings(bookingsRes.data.map(mapBookingData));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Map API data to component types
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
    setIsSubmitting(true);
    try {
      const result = await createBooking({
        masterId: data.masterId,
        serviceId: data.serviceId,
        date: data.date,
        time: data.time,
      });

      if (result.success) {
        // Reload bookings to get updated list
        const bookingsRes = await getBookings();
        if (bookingsRes.success && bookingsRes.data) {
          setBookings(bookingsRes.data.map(mapBookingData));
        }
        
        setSelectedService(null);
        setActiveTab('bookings');
        
        hapticFeedback('success');
        await showAlert('Запись создана! Ожидайте подтверждения от мастера.');
      } else {
        await showAlert(result.error?.message || 'Ошибка при создании записи');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      await showAlert('Произошла ошибка. Попробуйте еще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'services', label: 'Услуги' },
    { id: 'bookings', label: 'Мои записи' }
  ];

  // Service card icon based on category
  const getCategoryIcon = () => {
    return (
      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
        <Scissors className="h-5 w-5 text-amber-600" />
      </div>
    );
  };

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

  if (selectedService) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          <BookingForm
            service={selectedService}
            onBack={() => setSelectedService(null)}
            onSubmit={handleBookingSubmit}
            isSubmitting={isSubmitting}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
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
            {services.length === 0 ? (
              <div className="text-center py-12">
                <Scissors className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Услуги пока не добавлены</p>
              </div>
            ) : (
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
                          {getCategoryIcon()}
                          <p className="text-lg font-bold text-gray-900 mt-3">
                            {formatPrice(service.price)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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
