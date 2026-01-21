import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth, jsonResponse, errorResponse } from '@/lib/api-utils';
import { UserRole } from '@prisma/client';

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
    const bookingId = parseInt(id, 10);
    const body = await request.json();
    const { status } = body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
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

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: status.toUpperCase() }
    });

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
    const bookingId = parseInt(id, 10);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
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

    return jsonResponse({ message: 'Booking cancelled' });
  });
}

