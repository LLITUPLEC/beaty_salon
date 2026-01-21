import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth, jsonResponse } from '@/lib/api-utils';
import { UserRole, BookingStatus } from '@prisma/client';

/**
 * GET /api/admin/bookings
 * Получить все записи (только для админа)
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async () => {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('masterId');
    const status = searchParams.get('status');
    const dateStr = searchParams.get('date');

    const where: any = {};

    if (masterId && masterId !== 'all') {
      where.masterId = parseInt(masterId, 10);
    }

    if (status && status !== 'all') {
      where.status = status.toUpperCase() as BookingStatus;
    }

    if (dateStr) {
      where.date = new Date(dateStr);
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
  }, [UserRole.ADMIN]);
}

