import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notifyClientBookingReminder } from '@/lib/notifications';

/**
 * POST /api/cron/reminders
 * Отправляет напоминания клиентам о предстоящих записях
 * Вызывается по cron (из бота или внешнего сервиса)
 * 
 * Защита: проверяем секретный ключ
 */
export async function POST(request: NextRequest) {
  // Проверяем секретный ключ
  const authHeader = request.headers.get('x-cron-secret');
  const cronSecret = process.env.CRON_SECRET || 'default-cron-secret';
  
  if (authHeader !== cronSecret) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const now = new Date();
    const results = {
      checked: 0,
      sent24h: 0,
      sent2h: 0,
      errors: 0,
    };

    // Получаем все подтверждённые записи на ближайшие 25 часов
    const futureDate = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    
    const bookings = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        date: {
          gte: new Date(now.toISOString().split('T')[0]),
          lte: futureDate,
        },
        // Исключаем записи, которым уже отправили оба напоминания
        NOT: {
          AND: [
            { reminder24hSent: true },
            { reminder2hSent: true },
          ]
        }
      },
      include: {
        client: {
          select: { telegramId: true, firstName: true }
        },
        master: {
          select: { firstName: true, lastName: true, nickname: true }
        },
        service: {
          select: { name: true }
        }
      }
    });

    results.checked = bookings.length;

    for (const booking of bookings) {
      // Вычисляем время до записи
      const bookingDateTime = new Date(
        `${booking.date.toISOString().split('T')[0]}T${booking.time}:00`
      );
      const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      const masterName = booking.master.nickname || 
        `${booking.master.firstName} ${booking.master.lastName || ''}`.trim();
      const dateStr = booking.date.toISOString().split('T')[0];

      // Напоминание за 24 часа (от 23 до 25 часов до записи)
      if (!booking.reminder24hSent && hoursUntilBooking >= 23 && hoursUntilBooking <= 25) {
        if (booking.client.telegramId) {
          try {
            await notifyClientBookingReminder({
              clientTelegramId: booking.client.telegramId,
              masterName,
              serviceName: booking.service.name,
              date: dateStr,
              time: booking.time,
              hoursLeft: 24,
            });

            await prisma.booking.update({
              where: { id: booking.id },
              data: { reminder24hSent: true }
            });

            results.sent24h++;
          } catch (error) {
            console.error(`Error sending 24h reminder for booking ${booking.id}:`, error);
            results.errors++;
          }
        }
      }

      // Напоминание за 2 часа (от 1.5 до 2.5 часов до записи)
      if (!booking.reminder2hSent && hoursUntilBooking >= 1.5 && hoursUntilBooking <= 2.5) {
        if (booking.client.telegramId) {
          try {
            await notifyClientBookingReminder({
              clientTelegramId: booking.client.telegramId,
              masterName,
              serviceName: booking.service.name,
              date: dateStr,
              time: booking.time,
              hoursLeft: 2,
            });

            await prisma.booking.update({
              where: { id: booking.id },
              data: { reminder2hSent: true }
            });

            results.sent2h++;
          } catch (error) {
            console.error(`Error sending 2h reminder for booking ${booking.id}:`, error);
            results.errors++;
          }
        }
      }
    }

    console.log(`[Reminders] Checked: ${results.checked}, Sent 24h: ${results.sent24h}, Sent 2h: ${results.sent2h}, Errors: ${results.errors}`);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Error in reminders cron:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET для проверки работоспособности
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Reminders cron endpoint. Use POST with x-cron-secret header to trigger.',
  });
}

