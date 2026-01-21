'use client';

import { useState } from 'react';
import { ArrowLeft, Clock, Star, Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent, Button, Calendar, Input } from './ui';
import { Service, Master, BookingFormData } from '@/types';
import { formatPrice, formatDuration, cn } from '@/lib/utils';
import { mockMasters, mockAvailableSlots } from '@/lib/mockData';

interface BookingFormProps {
  service: Service;
  onBack: () => void;
  onSubmit: (data: BookingFormData) => void;
}

export function BookingForm({ service, onBack, onSubmit }: BookingFormProps) {
  const [selectedMaster, setSelectedMaster] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const masters = mockMasters;
  const availableSlots = mockAvailableSlots;

  const handleSubmit = async () => {
    if (!selectedMaster || !selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        serviceId: service.id,
        masterId: selectedMaster,
        date: selectedDate,
        time: selectedTime
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = selectedMaster && selectedDate && selectedTime;

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
                    <span className="font-medium">{master.rating}</span>
                  </div>
                </div>
              ))}
            </div>
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
          {selectedDate && (
            <div className="mb-6 animate-fade-in">
              <h3 className="text-base font-medium text-gray-900 mb-3">
                Выберите время
              </h3>
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

