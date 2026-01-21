'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, getMonthName, getDayName } from '@/lib/utils';

interface CalendarProps {
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  minDate?: Date;
  className?: string;
}

export function Calendar({ selectedDate, onSelectDate, minDate, className }: CalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Get days from previous month to fill the first week
  const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
  const prevMonthDays = [];
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    prevMonthDays.push(prevMonthLastDay - i);
  }

  // Get days from next month to fill the last week
  const totalCells = 42; // 6 rows × 7 days
  const nextMonthDays = totalCells - prevMonthDays.length - daysInMonth;
  const nextMonthDaysArray = Array.from({ length: nextMonthDays }, (_, i) => i + 1);

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const isDateDisabled = (day: number, isCurrentMonth: boolean): boolean => {
    if (!isCurrentMonth) return true;
    
    const date = new Date(currentYear, currentMonth, day);
    const compareDate = minDate || today;
    compareDate.setHours(0, 0, 0, 0);
    
    return date < compareDate;
  };

  const formatDateString = (day: number): string => {
    const month = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${currentYear}-${month}-${dayStr}`;
  };

  const isSelected = (day: number): boolean => {
    return selectedDate === formatDateString(day);
  };

  const isToday = (day: number): boolean => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const weekDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h3 className="text-lg font-semibold text-gray-900">
          {getMonthName(currentMonth)} {currentYear}
        </h3>
        <button
          type="button"
          onClick={goToNextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-gray-500 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Previous month days */}
        {prevMonthDays.map((day) => (
          <div
            key={`prev-${day}`}
            className="aspect-square flex items-center justify-center text-sm text-gray-300"
          >
            {day}
          </div>
        ))}

        {/* Current month days */}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const disabled = isDateDisabled(day, true);
          const selected = isSelected(day);
          const todayDate = isToday(day);

          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onSelectDate(formatDateString(day))}
              className={cn(
                'aspect-square flex items-center justify-center text-sm rounded-full transition-all',
                disabled && 'text-gray-300 cursor-not-allowed',
                !disabled && !selected && 'text-gray-700 hover:bg-amber-100',
                selected && 'bg-gray-800 text-white',
                todayDate && !selected && 'font-bold text-amber-600'
              )}
            >
              {day}
            </button>
          );
        })}

        {/* Next month days */}
        {nextMonthDaysArray.map((day) => (
          <div
            key={`next-${day}`}
            className="aspect-square flex items-center justify-center text-sm text-gray-300"
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
}

