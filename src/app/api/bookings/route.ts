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
 * Параметры:
 * - status: фильтр по статусу (pending, confirmed, completed, cancelled)
 * - showCompleted: показать завершённые/отменённые (true/false)
 * - fromDate: с какой даты
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (user) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const showCompleted = searchParams.get('showCompleted') === 'true';
    const fromDate = searchParams.get('fromDate');

    const where: any = {};

    // Клиент видит свои записи, мастер - записи к себе
    if (user.role === UserRole.CLIENT) {
      where.clientId = user.id;
    } else if (user.role === UserRole.MASTER) {
      where.masterId = user.id;
    }
    // Админ видит все записи

    // Фильтр по статусу
    if (status && status !== 'all') {
      where.status = status.toUpperCase() as BookingStatus;
    } else if (!showCompleted) {
      // По умолчанию не показываем завершённые
      where.status = {
        in: ['PENDING', 'CONFIRMED']
      };
    }

    // Фильтр по дате
    if (fromDate) {
      where.date = {
        gte: new Date(fromDate)
      };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true, nickname: true }
        },
        master: {
          select: { id: true, firstName: true, lastName: true, nickname: true }
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
        // Используем nickname мастера если есть
        master: b.master.nickname || `${b.master.firstName} ${b.master.lastName || ''}`.trim(),
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
 * Параметры:
 * - anyMaster: true - выбрать мастера с наименьшим количеством записей
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (user) => {
    const body = await request.json();
    const { masterId, serviceId, date, time, anyMaster } = body;

    if (!serviceId || !date || !time) {
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
      const currentTime = now.getHours() * 60 + now.getMinutes() + 30;
      
      if (slotTime <= currentTime) {
        return errorResponse('INVALID_TIME', 'Cannot book for past time slots');
      }
    }

    // Получаем услугу
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        masters: {
          include: {
            master: {
              select: {
                id: true,
                telegramId: true,
                firstName: true,
                lastName: true,
                nickname: true,
              }
            }
          }
        }
      }
    });

    if (!service) {
      return errorResponse('NOT_FOUND', 'Service not found', 404);
    }

    let selectedMasterId = masterId;
    let selectedMaster: any = null;

    // Если выбран "любой мастер" - находим мастера с наименьшим количеством записей
    if (anyMaster) {
      // Получаем мастеров, оказывающих эту услугу
      const availableMasters = service.masters;

      if (availableMasters.length === 0) {
        return errorResponse('NO_MASTERS', 'No masters available for this service');
      }

      // Подсчитываем записи на выбранную дату для каждого мастера
      const masterBookingCounts = await Promise.all(
        availableMasters.map(async (ms) => {
          // Проверяем есть ли расписание у мастера на эту дату
          const schedule = await prisma.schedule.findUnique({
            where: {
              masterId_date: {
                masterId: ms.master.id,
                date: bookingDate,
              }
            }
          });

          if (!schedule || !schedule.isActive) {
            return { masterId: ms.master.id, master: ms.master, count: Infinity };
          }

          // Проверяем что слот не занят
          const existingBooking = await prisma.booking.findFirst({
            where: {
              masterId: ms.master.id,
              date: bookingDate,
              time,
              status: { in: ['PENDING', 'CONFIRMED'] }
            }
          });

          if (existingBooking) {
            return { masterId: ms.master.id, master: ms.master, count: Infinity };
          }

          // Считаем записи на эту дату
          const count = await prisma.booking.count({
            where: {
              masterId: ms.master.id,
              date: bookingDate,
              status: { in: ['PENDING', 'CONFIRMED'] }
            }
          });

          return { masterId: ms.master.id, master: ms.master, count };
        })
      );

      // Выбираем мастера с наименьшим количеством записей
      const available = masterBookingCounts.filter(m => m.count !== Infinity);
      
      if (available.length === 0) {
        return errorResponse('TIME_SLOT_TAKEN', 'No available masters for this time slot');
      }

      const minCount = Math.min(...available.map(m => m.count));
      // Если несколько мастеров с одинаковым минимумом - выбираем случайного
      const minCountMasters = available.filter(m => m.count === minCount);
      const selected = minCountMasters[Math.floor(Math.random() * minCountMasters.length)];
      
      selectedMasterId = selected.masterId;
      selectedMaster = selected.master;
    } else {
      if (!masterId) {
        return errorResponse('INVALID_DATA', 'masterId is required when anyMaster is false');
      }

      // Проверяем существование мастера
      selectedMaster = await prisma.user.findUnique({
        where: { id: masterId },
        select: { 
          id: true, 
          telegramId: true, 
          firstName: true, 
          lastName: true,
          nickname: true,
        }
      });

      if (!selectedMaster) {
        return errorResponse('NOT_FOUND', 'Master not found', 404);
      }

      // Проверяем доступность слота
      const existingBooking = await prisma.booking.findFirst({
        where: {
          masterId,
          date: bookingDate,
          time,
          status: { in: ['PENDING', 'CONFIRMED'] }
        }
      });

      if (existingBooking) {
        return errorResponse('TIME_SLOT_TAKEN', 'This time slot is already booked');
      }
    }

    // Получаем данные клиента
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
        masterId: selectedMasterId,
        serviceId,
        date: bookingDate,
        time,
        price: service.price,
        status: 'PENDING',
      },
      include: {
        master: { select: { firstName: true, lastName: true, nickname: true } },
        service: { select: { name: true } }
      }
    });

    // Отправляем уведомления
    const clientName = client 
      ? `${client.firstName} ${client.lastName || ''}`.trim() 
      : 'Клиент';
    const masterName = selectedMaster.nickname || `${selectedMaster.firstName} ${selectedMaster.lastName || ''}`.trim();
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

    // Уведомление мастеру с инлайн-кнопкой
    if (selectedMaster.telegramId) {
      notifyMasterNewBooking({
        masterTelegramId: selectedMaster.telegramId,
        clientName,
        serviceName: service.name,
        date: dateStr,
        time,
        bookingId: booking.id,
      }).catch(err => console.error('Error notifying master:', err));
    }

    return jsonResponse({
      id: booking.id,
      status: booking.status.toLowerCase(),
      masterName,
      message: 'Запись создана, ожидает подтверждения мастера',
    });
  }, [UserRole.CLIENT, UserRole.ADMIN]);
}
