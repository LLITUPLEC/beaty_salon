import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth, jsonResponse, errorResponse } from '@/lib/api-utils';
import { UserRole, BookingStatus } from '@prisma/client';
import { 
  notifyClientBookingCreated, 
  notifyMasterNewBooking 
} from '@/lib/notifications';

/**
 * GET /api/bookings
 * Получить записи пользователя (клиента или мастера)
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (user) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let where: any = {};

    // Клиент видит свои записи, мастер - записи к себе
    if (user.role === UserRole.CLIENT) {
      where.clientId = user.id;
    } else if (user.role === UserRole.MASTER) {
      where.masterId = user.id;
    }
    // Админ видит все записи

    if (status && status !== 'all') {
      where.status = status.toUpperCase() as BookingStatus;
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true }
        },
        master: {
          select: { id: true, firstName: true, lastName: true }
        },
        service: {
          select: { id: true, name: true, duration: true }
        }
      },
      orderBy: [
        { date: 'desc' },
        { time: 'desc' }
      ]
    });

    return jsonResponse(
      bookings.map(b => ({
        id: b.id,
        client: `${b.client.firstName} ${b.client.lastName || ''}`.trim(),
        clientId: b.clientId,
        master: `${b.master.firstName} ${b.master.lastName || ''}`.trim(),
        masterId: b.masterId,
        service: b.service.name,
        serviceId: b.serviceId,
        date: b.date.toISOString().split('T')[0],
        time: b.time,
        status: b.status.toLowerCase(),
        price: b.price,
        duration: b.service.duration,
      }))
    );
  });
}

/**
 * POST /api/bookings
 * Создать запись
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (user) => {
    const body = await request.json();
    const { masterId, serviceId, date, time } = body;

    if (!masterId || !serviceId || !date || !time) {
      return errorResponse('INVALID_DATA', 'Missing required fields');
    }

    // Проверяем что дата и время не в прошлом
    const bookingDate = new Date(date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (bookingDate < today) {
      return errorResponse('INVALID_DATE', 'Cannot book for past dates');
    }
    
    // Если сегодня - проверяем время
    if (bookingDate.getTime() === today.getTime()) {
      const [hours, minutes] = time.split(':').map(Number);
      const slotTime = hours * 60 + minutes;
      const currentTime = now.getHours() * 60 + now.getMinutes() + 30; // +30 min buffer
      
      if (slotTime <= currentTime) {
        return errorResponse('INVALID_TIME', 'Cannot book for past time slots');
      }
    }

    // Получаем услугу для определения цены
    const service = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!service) {
      return errorResponse('NOT_FOUND', 'Service not found', 404);
    }

    // Проверяем доступность слота
    const existingBooking = await prisma.booking.findFirst({
      where: {
        masterId,
        date: bookingDate,
        time,
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      }
    });

    if (existingBooking) {
      return errorResponse('TIME_SLOT_TAKEN', 'This time slot is already booked');
    }

    // Получаем данные мастера для уведомлений
    const master = await prisma.user.findUnique({
      where: { id: masterId },
      select: { 
        id: true, 
        telegramId: true, 
        firstName: true, 
        lastName: true 
      }
    });

    if (!master) {
      return errorResponse('NOT_FOUND', 'Master not found', 404);
    }

    // Получаем данные клиента для уведомлений
    const client = await prisma.user.findUnique({
      where: { id: user.id },
      select: { 
        id: true, 
        telegramId: true, 
        firstName: true, 
        lastName: true 
      }
    });

    // Создаем запись
    const booking = await prisma.booking.create({
      data: {
        clientId: user.id,
        masterId,
        serviceId,
        date: bookingDate,
        time,
        price: service.price,
        status: 'PENDING',
      },
      include: {
        master: { select: { firstName: true, lastName: true } },
        service: { select: { name: true } }
      }
    });

    // Отправляем уведомления
    const clientName = client 
      ? `${client.firstName} ${client.lastName || ''}`.trim() 
      : 'Клиент';
    const masterName = `${master.firstName} ${master.lastName || ''}`.trim();
    const dateStr = date;

    // Уведомление клиенту
    if (client?.telegramId) {
      notifyClientBookingCreated({
        clientTelegramId: client.telegramId,
        masterName,
        serviceName: service.name,
        date: dateStr,
        time,
      }).catch(err => console.error('Error notifying client:', err));
    }

    // Уведомление мастеру
    if (master.telegramId) {
      notifyMasterNewBooking({
        masterTelegramId: master.telegramId,
        clientName,
        serviceName: service.name,
        date: dateStr,
        time,
      }).catch(err => console.error('Error notifying master:', err));
    }

    return jsonResponse({
      id: booking.id,
      status: booking.status.toLowerCase(),
      message: 'Запись создана, ожидает подтверждения мастера',
    });
  }, [UserRole.CLIENT, UserRole.ADMIN]);
}
