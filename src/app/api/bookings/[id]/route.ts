import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth, jsonResponse, errorResponse } from '@/lib/api-utils';
import { UserRole } from '@prisma/client';
import {
  notifyClientBookingConfirmed,
  notifyClientBookingCancelled,
  notifyMasterBookingCancelled
} from '@/lib/notifications';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/bookings/[id]
 * Обновить статус записи (подтвердить/отклонить)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  return withAuth(request, async (user) => {
    if (!user) {
      return errorResponse('AUTH_REQUIRED', 'Authentication required', 401);
    }

    const bookingId = parseInt(id, 10);
    const body = await request.json();
    const { status } = body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: { 
          select: { 
            id: true, 
            telegramId: true, 
            firstName: true, 
            lastName: true 
          } 
        },
        master: { 
          select: { 
            id: true, 
            telegramId: true, 
            firstName: true, 
            lastName: true 
          } 
        },
        service: { 
          select: { 
            name: true 
          } 
        }
      }
    });

    if (!booking) {
      return errorResponse('NOT_FOUND', 'Booking not found', 404);
    }

    // Мастер может изменять только свои записи
    if (user.role === UserRole.MASTER && booking.masterId !== user.id) {
      return errorResponse('PERMISSION_DENIED', 'Cannot modify this booking', 403);
    }

    // Клиент может только отменять свои записи
    if (user.role === UserRole.CLIENT) {
      if (booking.clientId !== user.id) {
        return errorResponse('PERMISSION_DENIED', 'Cannot modify this booking', 403);
      }
      if (status !== 'cancelled') {
        return errorResponse('PERMISSION_DENIED', 'Client can only cancel bookings', 403);
      }
    }

    const oldStatus = booking.status;
    const newStatus = status.toUpperCase();

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: newStatus }
    });

    // Данные для уведомлений
    const clientName = `${booking.client.firstName} ${booking.client.lastName || ''}`.trim();
    const masterName = `${booking.master.firstName} ${booking.master.lastName || ''}`.trim();
    const dateStr = booking.date.toISOString().split('T')[0];

    // Отправляем уведомления в зависимости от нового статуса
    if (newStatus === 'CONFIRMED' && oldStatus !== 'CONFIRMED') {
      // Уведомление клиенту о подтверждении
      if (booking.client.telegramId) {
        notifyClientBookingConfirmed({
          clientTelegramId: booking.client.telegramId,
          masterName,
          serviceName: booking.service.name,
          date: dateStr,
          time: booking.time,
        }).catch(err => console.error('Error notifying client:', err));
      }
    }

    if (newStatus === 'CANCELLED' && oldStatus !== 'CANCELLED') {
      // Определяем кто отменил
      const cancelledBy = user.role === UserRole.MASTER 
        ? 'master' 
        : user.role === UserRole.ADMIN 
        ? 'admin' 
        : 'client';

      // Уведомление клиенту об отмене (если отменил не клиент сам)
      if (cancelledBy !== 'client' && booking.client.telegramId) {
        notifyClientBookingCancelled({
          clientTelegramId: booking.client.telegramId,
          masterName,
          serviceName: booking.service.name,
          date: dateStr,
          time: booking.time,
          cancelledBy,
        }).catch(err => console.error('Error notifying client:', err));
      }

      // Уведомление мастеру об отмене (если отменил клиент)
      if (cancelledBy === 'client' && booking.master.telegramId) {
        notifyMasterBookingCancelled({
          masterTelegramId: booking.master.telegramId,
          clientName,
          serviceName: booking.service.name,
          date: dateStr,
          time: booking.time,
        }).catch(err => console.error('Error notifying master:', err));
      }
    }

    return jsonResponse({
      id: updated.id,
      status: updated.status.toLowerCase(),
      message: `Booking ${status}`
    });
  });
}

/**
 * DELETE /api/bookings/[id]
 * Отменить запись
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  return withAuth(request, async (user) => {
    if (!user) {
      return errorResponse('AUTH_REQUIRED', 'Authentication required', 401);
    }

    const bookingId = parseInt(id, 10);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: { 
          select: { 
            id: true, 
            telegramId: true, 
            firstName: true, 
            lastName: true 
          } 
        },
        master: { 
          select: { 
            id: true, 
            telegramId: true, 
            firstName: true, 
            lastName: true 
          } 
        },
        service: { 
          select: { 
            name: true 
          } 
        }
      }
    });

    if (!booking) {
      return errorResponse('NOT_FOUND', 'Booking not found', 404);
    }

    // Клиент может отменять только свои записи
    if (user.role === UserRole.CLIENT && booking.clientId !== user.id) {
      return errorResponse('PERMISSION_DENIED', 'Cannot cancel this booking', 403);
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' }
    });

    // Данные для уведомлений
    const clientName = `${booking.client.firstName} ${booking.client.lastName || ''}`.trim();
    const masterName = `${booking.master.firstName} ${booking.master.lastName || ''}`.trim();
    const dateStr = booking.date.toISOString().split('T')[0];

    // Определяем кто отменил
    const cancelledBy = user.role === UserRole.MASTER 
      ? 'master' 
      : user.role === UserRole.ADMIN 
      ? 'admin' 
      : 'client';

    // Уведомление клиенту (если отменил не он сам)
    if (cancelledBy !== 'client' && booking.client.telegramId) {
      notifyClientBookingCancelled({
        clientTelegramId: booking.client.telegramId,
        masterName,
        serviceName: booking.service.name,
        date: dateStr,
        time: booking.time,
        cancelledBy,
      }).catch(err => console.error('Error notifying client:', err));
    }

    // Уведомление мастеру (если отменил клиент)
    if (cancelledBy === 'client' && booking.master.telegramId) {
      notifyMasterBookingCancelled({
        masterTelegramId: booking.master.telegramId,
        clientName,
        serviceName: booking.service.name,
        date: dateStr,
        time: booking.time,
      }).catch(err => console.error('Error notifying master:', err));
    }

    return jsonResponse({ message: 'Booking cancelled' });
  });
}
