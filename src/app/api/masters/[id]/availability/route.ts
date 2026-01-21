import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { jsonResponse, errorResponse } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/masters/[id]/availability?date=2026-01-23&serviceId=1
 * Получить доступные слоты для записи к мастеру
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const masterId = parseInt(id, 10);
  
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date');
  const serviceIdStr = searchParams.get('serviceId');

  if (!dateStr) {
    return errorResponse('INVALID_DATA', 'Date is required');
  }

  const date = new Date(dateStr);

  // Получаем расписание мастера на этот день
  const schedule = await prisma.schedule.findUnique({
    where: {
      masterId_date: {
        masterId,
        date,
      }
    }
  });

  if (!schedule || !schedule.isActive) {
    return jsonResponse({
      date: dateStr,
      availableSlots: [],
      message: 'Master is not available on this date'
    });
  }

  // Получаем длительность услуги
  let serviceDuration = 60; // по умолчанию 1 час
  if (serviceIdStr) {
    const service = await prisma.service.findUnique({
      where: { id: parseInt(serviceIdStr, 10) }
    });
    if (service) {
      serviceDuration = service.duration;
    }
  }

  // Получаем существующие записи на этот день
  const existingBookings = await prisma.booking.findMany({
    where: {
      masterId,
      date,
      status: {
        in: ['PENDING', 'CONFIRMED']
      }
    },
    include: {
      service: {
        select: { duration: true }
      }
    }
  });

  // Генерируем слоты
  const slots: string[] = [];
  const [startHour, startMin] = schedule.startTime.split(':').map(Number);
  const [endHour, endMin] = schedule.endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Каждый слот = 30 минут
  const slotInterval = 30;

  for (let time = startMinutes; time + serviceDuration <= endMinutes; time += slotInterval) {
    const slotHour = Math.floor(time / 60);
    const slotMin = time % 60;
    const slotStr = `${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`;
    const slotEndTime = time + serviceDuration;

    // Проверяем, не пересекается ли с существующими записями
    const isOccupied = existingBookings.some(booking => {
      const [bHour, bMin] = booking.time.split(':').map(Number);
      const bookingStart = bHour * 60 + bMin;
      const bookingEnd = bookingStart + booking.service.duration;

      // Проверяем пересечение интервалов
      return time < bookingEnd && slotEndTime > bookingStart;
    });

    if (!isOccupied) {
      slots.push(slotStr);
    }
  }

  return jsonResponse({
    date: dateStr,
    availableSlots: slots,
  });
}

