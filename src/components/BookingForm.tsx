'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Star, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Card, CardContent, Button, Calendar } from './ui';
import { Service, Master, BookingFormData } from '@/types';
import { formatPrice, formatDuration, cn } from '@/lib/utils';
import { getMasters, getMasterAvailability, MasterData } from '@/lib/api-client';

interface BookingFormProps {
  service: Service;
  onBack: () => void;
  onSubmit: (data: BookingFormData) => void;
  isSubmitting?: boolean;
}

export function BookingForm({ service, onBack, onSubmit, isSubmitting = false }: BookingFormProps) {
  const [selectedMaster, setSelectedMaster] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  const [masters, setMasters] = useState<Master[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingMasters, setIsLoadingMasters] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Load masters on mount
  useEffect(() => {
    loadMasters();
  }, []);

  // Load available slots when master and date selected
  useEffect(() => {
    if (selectedMaster && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedMaster, selectedDate]);

  const loadMasters = async () => {
    setIsLoadingMasters(true);
    try {
      const result = await getMasters();
      if (result.success && result.data) {
        setMasters(result.data.map(mapMasterData));
      }
    } catch (error) {
      console.error('Error loading masters:', error);
    } finally {
      setIsLoadingMasters(false);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedMaster || !selectedDate) return;
    
    setIsLoadingSlots(true);
    setSelectedTime(null);
    try {
      const result = await getMasterAvailability(selectedMaster, selectedDate, service.id);
      let slots: string[] = [];
      
      if (result.success && result.data) {
        slots = result.data.availableSlots || [];
      } else {
        // Fallback to default slots if API fails (30 min intervals)
        slots = [
          '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
          '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
          '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
          '18:00', '18:30', '19:00', '19:30', '20:00'
        ];
      }
      
      // Filter out past time slots if selected date is today
      const filteredSlots = filterPastTimeSlots(slots, selectedDate);
      setAvailableSlots(filteredSlots);
    } catch (error) {
      console.error('Error loading slots:', error);
      // Fallback to default slots (30 min intervals)
      const defaultSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
        '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
        '18:00', '18:30', '19:00', '19:30', '20:00'
      ];
      const filteredSlots = filterPastTimeSlots(defaultSlots, selectedDate);
      setAvailableSlots(filteredSlots);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Filter out past time slots for today
  const filterPastTimeSlots = (slots: string[], date: string): string[] => {
    const today = new Date().toISOString().split('T')[0];
    
    // If not today, return all slots
    if (date !== today) {
      return slots;
    }
    
    // Get current time + 30 min buffer
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute + 30; // +30 min buffer
    
    return slots.filter(slot => {
      const [hours, minutes] = slot.split(':').map(Number);
      const slotTimeInMinutes = hours * 60 + minutes;
      return slotTimeInMinutes > currentTimeInMinutes;
    });
  };

  const mapMasterData = (data: MasterData): Master => ({
    id: data.id,
    name: data.name,
    telegram: data.telegram || '',
    telegram_id: parseInt(data.telegramId) || 0,
    specialization: data.specialization,
    rating: data.rating || 5.0,
    bookings: data.bookings || 0,
    active: true,
  });

  const handleSubmit = async () => {
    if (!selectedMaster || !selectedDate || !selectedTime) return;

    await onSubmit({
      serviceId: service.id,
      masterId: selectedMaster,
      date: selectedDate,
      time: selectedTime
    });
  };

  const isFormValid = selectedMaster && selectedDate && selectedTime && !isSubmitting;

  return (
    <div className="animate-fade-in">
      {/* Back button */}
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

          {/* Master selection */}
          <div className="mb-6">
            <h3 className="text-base font-medium text-gray-900 mb-3">
              Выберите мастера
            </h3>
            
            {isLoadingMasters ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              </div>
            ) : masters.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Нет доступных мастеров</p>
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
                      <span className="font-medium">{master.rating.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Date selection */}
          <div className="mb-6">
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

          {/* Time selection */}
          {selectedDate && selectedMaster && (
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
                  Нет доступного времени на эту дату
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedTime(time)}
                      className={cn(
                        'py-3 px-4 rounded-xl text-sm font-medium transition-all',
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

          {/* Submit button */}
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
