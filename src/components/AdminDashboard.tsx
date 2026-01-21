'use client';

import { useState } from 'react';
import {
  Calendar,
  Clock,
  User,
  Users,
  Scissors,
  TrendingUp,
  Plus,
  ChevronDown
} from 'lucide-react';
import { Header } from './ui/Header';
import { Tabs, TabContent } from './ui/Tabs';
import { Card, CardContent, StatCard } from './ui/Card';
import { StatusBadge } from './ui/Badge';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import { Booking, Master, Schedule, ScheduleFormData, MasterFormData } from '@/types';
import { formatPrice, formatDate } from '@/lib/utils';
import {
  mockAllBookings,
  mockMasters,
  mockSchedules,
  mockServiceReports,
  mockMasterReports,
  mockStats
} from '@/lib/mockData';
import { hapticFeedback, showAlert } from '@/lib/telegram';

interface AdminDashboardProps {
  onLogout: () => void;
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings] = useState<Booking[]>(mockAllBookings);
  const [masters, setMasters] = useState<Master[]>(mockMasters);
  const [schedules, setSchedules] = useState<Schedule[]>(mockSchedules);
  const [selectedMasterFilter, setSelectedMasterFilter] = useState<string>('all');

  // Form states
  const [newMasterTelegram, setNewMasterTelegram] = useState('');
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormData>({
    masterId: 0,
    date: '',
    startTime: '09:00',
    endTime: '18:00'
  });

  const stats = mockStats;
  const serviceReports = mockServiceReports;
  const masterReports = mockMasterReports;

  const filteredBookings = selectedMasterFilter === 'all'
    ? bookings
    : bookings.filter((b) => b.masterId === Number(selectedMasterFilter));

  const handleAddMaster = async () => {
    if (!newMasterTelegram.trim()) return;

    hapticFeedback('success');
    const newMaster: Master = {
      id: Date.now(),
      name: 'Новый мастер',
      telegram: newMasterTelegram,
      telegram_id: Date.now(),
      specialization: 'Специалист',
      bookings: 0,
      rating: 5.0,
      active: true
    };
    setMasters([...masters, newMaster]);
    setNewMasterTelegram('');
    await showAlert('Мастер добавлен!');
  };

  const handleCreateSchedule = async () => {
    if (!scheduleForm.masterId || !scheduleForm.date) return;

    const master = masters.find((m) => m.id === scheduleForm.masterId);
    const newSchedule: Schedule = {
      id: Date.now(),
      master: master?.name || '',
      masterId: scheduleForm.masterId,
      date: scheduleForm.date,
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime
    };

    hapticFeedback('success');
    setSchedules([...schedules, newSchedule]);
    setScheduleForm({
      masterId: 0,
      date: '',
      startTime: '09:00',
      endTime: '18:00'
    });
    await showAlert('Смена создана!');
  };

  const tabs = [
    { id: 'bookings', label: 'Записи' },
    { id: 'masters', label: 'Мастера' },
    { id: 'schedule', label: 'Расписание' },
    { id: 'reports', label: 'Отчёты' }
  ];

  const masterOptions = [
    { value: 'all', label: 'Все мастера' },
    ...masters.map((m) => ({ value: String(m.id), label: m.name }))
  ];

  const timeOptions = [
    { value: '09:00', label: '09:00' },
    { value: '10:00', label: '10:00' },
    { value: '11:00', label: '11:00' },
    { value: '12:00', label: '12:00' },
    { value: '13:00', label: '13:00' },
    { value: '14:00', label: '14:00' },
    { value: '15:00', label: '15:00' },
    { value: '16:00', label: '16:00' },
    { value: '17:00', label: '17:00' },
    { value: '18:00', label: '18:00' },
    { value: '19:00', label: '19:00' },
    { value: '20:00', label: '20:00' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onLogout={onLogout} />

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
            value={24}
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
            label="Выручка за месяц"
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
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Фильтр по мастеру:</span>
                <Select
                  options={masterOptions}
                  value={selectedMasterFilter}
                  onChange={(e) => setSelectedMasterFilter(e.target.value)}
                  className="w-48"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredBookings.map((booking) => (
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
                  Назначьте нового мастера по Telegram ID
                </p>
                <div className="flex gap-3">
                  <Input
                    placeholder="@telegram"
                    value={newMasterTelegram}
                    onChange={(e) => setNewMasterTelegram(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleAddMaster}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {masters.map((master) => (
                <Card key={master.id}>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {master.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {master.specialization}
                        </p>
                        <p className="text-sm text-amber-600">{master.telegram}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          {master.bookings}
                        </p>
                        <p className="text-sm text-gray-500">записей</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabContent>
        )}

        {/* Schedule tab */}
        {activeTab === 'schedule' && (
          <TabContent>
            <Card className="mb-6">
              <CardContent>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Создать смену
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Настройте рабочее время мастера
                </p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Select
                    label="Мастер"
                    options={masters.map((m) => ({ value: m.id, label: m.name }))}
                    value={scheduleForm.masterId || ''}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, masterId: Number(e.target.value) })
                    }
                    placeholder="Выберите мастера"
                  />
                  <Input
                    label="Дата"
                    type="date"
                    value={scheduleForm.date}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, date: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Select
                    label="Начало"
                    options={timeOptions}
                    value={scheduleForm.startTime}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, startTime: e.target.value })
                    }
                  />
                  <Select
                    label="Конец"
                    options={timeOptions}
                    value={scheduleForm.endTime}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, endTime: e.target.value })
                    }
                  />
                </div>
                <Button onClick={handleCreateSchedule} className="w-full">
                  Создать смену
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {schedules.map((schedule) => (
                <Card key={schedule.id}>
                  <CardContent>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {schedule.master}
                    </h3>
                    <div className="flex items-center gap-4 text-gray-500 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(schedule.date)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>
                          {schedule.startTime} - {schedule.endTime}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
                </CardContent>
              </Card>

              {/* Revenue report */}
              <Card>
                <CardContent>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Выручка по услугам
                  </h3>
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

