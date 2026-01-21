'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Star, Calendar as CalendarIcon, Users, Loader2 } from 'lucide-react';
import { Card, CardContent, Button, Calendar } from './ui';
import { ServiceData, MasterData, getServiceMasters, getMasterAvailability } from '@/lib/api-client';
import { formatPrice, formatDuration, cn } from '@/lib/utils';
import { hapticFeedback, showAlert } from '@/lib/telegram';

interface BookingFormProps {
  service: ServiceData;
  onBack: () => void;
  onSubmit: (data: {
    serviceId: number;
    masterId?: number;
    date: string;
    time: string;
    anyMaster?: boolean;
  }) => void;
}

export function BookingForm({ service, onBack, onSubmit }: BookingFormProps) {
  const [masters, setMasters] = useState<MasterData[]>([]);
  const [selectedMaster, setSelectedMaster] = useState<number | null>(null);
  const [anyMaster, setAnyMaster] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingMasters, setIsLoadingMasters] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadMasters();
  }, [service.id]);

  useEffect(() => {
    if (selectedDate && (selectedMaster || anyMaster)) {
      loadAvailableSlots();
    } else {
      setAvailableSlots([]);
      setSelectedTime(null);
    }
  }, [selectedMaster, selectedDate, anyMaster]);

  const loadMasters = async () => {
    setIsLoadingMasters(true);
    try {
      const result = await getServiceMasters(service.id);
      if (result.success && result.data) {
        setMasters(result.data);
      }
    } catch (error) {
      console.error('Error loading masters:', error);
    } finally {
      setIsLoadingMasters(false);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedDate) return;
    
    setIsLoadingSlots(true);
    setSelectedTime(null);
    
    try {
      if (anyMaster) {
        // Для "любой мастер" - объединяем слоты всех мастеров
        const allSlots = new Set<string>();
        
        await Promise.all(
          masters.map(async (master) => {
            const result = await getMasterAvailability(master.id, selectedDate, service.id);
            if (result.success && result.data) {
              result.data.availableSlots.forEach(slot => allSlots.add(slot));
            }
          })
        );
        
        const slots = Array.from(allSlots).sort();
        const filteredSlots = filterPastTimeSlots(slots, selectedDate);
        setAvailableSlots(filteredSlots);
      } else if (selectedMaster) {
        const result = await getMasterAvailability(selectedMaster, selectedDate, service.id);
        if (result.success && result.data) {
          const filteredSlots = filterPastTimeSlots(result.data.availableSlots || [], selectedDate);
          setAvailableSlots(filteredSlots);
        } else {
          setAvailableSlots([]);
        }
      }
    } catch (error) {
      console.error('Error loading slots:', error);
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const filterPastTimeSlots = (slots: string[], date: string): string[] => {
    const today = new Date().toISOString().split('T')[0];
    
    if (date !== today) {
      return slots;
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute + 30;
    
    return slots.filter(slot => {
      const [hours, minutes] = slot.split(':').map(Number);
      const slotTimeInMinutes = hours * 60 + minutes;
      return slotTimeInMinutes > currentTimeInMinutes;
    });
  };

  const handleAnyMasterToggle = () => {
    setAnyMaster(!anyMaster);
    if (!anyMaster) {
      setSelectedMaster(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      hapticFeedback('warning');
      showAlert('Выберите дату и время');
      return;
    }

    if (!anyMaster && !selectedMaster) {
      hapticFeedback('warning');
      showAlert('Выберите мастера или включите "Любой мастер"');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        serviceId: service.id,
        masterId: anyMaster ? undefined : selectedMaster!,
        date: selectedDate,
        time: selectedTime,
        anyMaster,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = selectedDate && selectedTime && (anyMaster || selectedMaster);

  if (isLoadingMasters) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Назад</span>
      </button>

      <Card className="mb-6">
        <CardContent>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Запись на услугу
          </h2>
          <p className="text-amber-600 font-medium mb-6">{service.name}</p>

          <div className="flex gap-8 mb-6">
            <div>
              <p className="text-sm text-gray-500">Длительность</p>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{formatDuration(service.duration)}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Стоимость</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {formatPrice(service.price)}
              </p>
            </div>
          </div>

          {/* "Any master" toggle */}
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border-2 border-gray-200 hover:border-amber-300 transition-all">
              <div className={cn(
                'relative w-12 h-6 rounded-full transition-colors',
                anyMaster ? 'bg-amber-500' : 'bg-gray-300'
              )}>
                <div className={cn(
                  'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                  anyMaster ? 'translate-x-6' : 'translate-x-0.5'
                )} />
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Любой мастер</span>
              </div>
            </label>
            <p className="text-xs text-gray-500 mt-2 ml-1">
              Система автоматически выберет свободного мастера
            </p>
          </div>

          {/* Master selection */}
          {!anyMaster && (
            <div className="mb-6 animate-fade-in">
              <h3 className="text-base font-medium text-gray-900 mb-3">
                Выберите мастера
              </h3>
              {masters.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Нет доступных мастеров для этой услуги
                </p>
              ) : (
                <div className="space-y-3">
                  {masters.map((master) => (
                    <div
                      key={master.id}
                      onClick={() => setSelectedMaster(master.id)}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all',
                        selectedMaster === master.id
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 hover:border-amber-300'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                          selectedMaster === master.id
                            ? 'border-amber-500'
                            : 'border-gray-300'
                        )}>
                          {selectedMaster === master.id && (
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{master.name}</p>
                          <p className="text-sm text-gray-500">{master.specialization}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="font-medium">{master.rating?.toFixed(1) || '5.0'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Date selection */}
          {(selectedMaster || anyMaster) && (
            <div className="mb-6 animate-fade-in">
              <h3 className="text-base font-medium text-gray-900 mb-3">
                Выберите дату
              </h3>
              <Calendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                minDate={new Date()}
              />
              
              {selectedDate && (
                <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900">{selectedDate}</span>
                </div>
              )}
            </div>
          )}

          {/* Time selection */}
          {selectedDate && (selectedMaster || anyMaster) && (
            <div className="mb-6 animate-fade-in">
              <h3 className="text-base font-medium text-gray-900 mb-3">
                Выберите время
              </h3>
              {isLoadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                </div>
              ) : availableSlots.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Нет доступных слотов на эту дату
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedTime(time)}
                      className={cn(
                        'py-3 px-2 rounded-xl text-sm font-medium transition-all',
                        selectedTime === time
                          ? 'gold-gradient text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!isFormValid}
            isLoading={isSubmitting}
            className="w-full"
            size="lg"
          >
            Записаться
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
