'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  User,
  Calendar,
  CheckCircle,
  Scissors,
  Loader2,
  Filter
} from 'lucide-react';
import { Header } from './ui/Header';
import { Tabs, TabContent } from './ui/Tabs';
import { Card, CardContent } from './ui/Card';
import { StatusBadge } from './ui/Badge';
import { Button } from './ui/Button';
import { BookingForm } from './BookingForm';
import { Service, Booking } from '@/types';
import { formatPrice, formatDuration, formatDate } from '@/lib/utils';
import { hapticFeedback, showAlert } from '@/lib/telegram';
import {
  getServices,
  getBookings,
  getCategories,
  createBooking,
  ServiceData,
  BookingData,
  CategoryData
} from '@/lib/api-client';

interface ClientDashboardProps {
  userName: string;
}

export function ClientDashboard({ userName }: ClientDashboardProps) {
  const [activeTab, setActiveTab] = useState('services');
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    loadCategories();
    loadBookings();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadServices(selectedCategory);
    } else {
      setServices([]);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    const result = await getCategories();
    if (result.success && result.data) {
      setCategories(result.data);
    }
    setIsLoading(false);
  };

  const loadServices = async (categoryId: number) => {
    const result = await getServices({ categoryId });
    if (result.success && result.data) {
      setServices(result.data);
    }
  };

  const loadBookings = async () => {
    const result = await getBookings({ showCompleted });
    if (result.success && result.data) {
      setBookings(result.data.map(mapBookingData));
    }
  };

  useEffect(() => {
    loadBookings();
  }, [showCompleted]);

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

  const handleServiceClick = (service: ServiceData) => {
    hapticFeedback('light');
    setSelectedService(service);
  };

  const handleBookingSubmit = async (data: {
    serviceId: number;
    masterId?: number;
    date: string;
    time: string;
    anyMaster?: boolean;
  }) => {
    const result = await createBooking(data);
    
    if (result.success) {
      hapticFeedback('success');
      const masterInfo = data.anyMaster && result.data?.masterName 
        ? `\nМастер: ${result.data.masterName}` 
        : '';
      await showAlert(`Запись создана!${masterInfo}\nОжидайте подтверждения.`);
      setSelectedService(null);
      setActiveTab('bookings');
      loadBookings();
    } else {
      hapticFeedback('error');
      await showAlert(result.error?.message || 'Ошибка при создании записи');
    }
  };

  const tabs = [
    { id: 'services', label: 'Услуги' },
    { id: 'bookings', label: 'Записи' }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto mb-2" />
          <p className="text-gray-500">Загрузка...</p>
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
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Добро пожаловать, {userName}
          </h1>
          <p className="text-gray-500">Выберите категорию и запишитесь</p>
        </div>

        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="mb-6"
        />

        {/* Services tab */}
        {activeTab === 'services' && (
          <TabContent>
            {/* Category filter */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Категория</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(
                      selectedCategory === category.id ? null : category.id
                    )}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedCategory === category.id
                        ? 'gold-gradient text-white'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-amber-300'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Services list */}
            {!selectedCategory ? (
              <div className="text-center py-12">
                <Scissors className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Выберите категорию для просмотра услуг</p>
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-12">
                <Scissors className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Нет услуг в этой категории</p>
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
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {service.name}
                          </h3>
                          <div className="flex items-center gap-1 text-gray-500 text-sm mb-2">
                            <Clock className="h-4 w-4" />
                            <span>{formatDuration(service.duration)}</span>
                          </div>
                          {service.masters && service.masters.length > 0 && (
                            <p className="text-xs text-amber-600">
                              {service.masters.length} мастер(ов)
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mb-2">
                            <Scissors className="h-5 w-5 text-amber-600" />
                          </div>
                          <p className="text-lg font-bold text-gray-900">
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
            {showCompleted && completedBookings.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Завершённые записи
                  </h2>
                </div>
                <div className="space-y-3">
                  {completedBookings.map((booking) => (
                    <Card key={booking.id} className="opacity-75">
                      <CardContent>
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-gray-700">
                            {booking.service}
                          </h3>
                          <StatusBadge status={booking.status} />
                        </div>
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

            {activeBookings.length === 0 && (!showCompleted || completedBookings.length === 0) && (
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
