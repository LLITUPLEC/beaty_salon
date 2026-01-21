import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth, jsonResponse, errorResponse } from '@/lib/api-utils';
import { UserRole } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/services/[id]/masters
 * Получить мастеров, оказывающих услугу
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const serviceId = parseInt(id, 10);

  const masters = await prisma.masterService.findMany({
    where: { serviceId },
    include: {
      master: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          nickname: true,
          rating: true,
          specialization: true,
          photoUrl: true,
          schedules: {
            where: {
              date: { gte: new Date() },
              isActive: true,
            },
            take: 7,
            orderBy: { date: 'asc' }
          },
          _count: {
            select: { masterBookings: true }
          }
        }
      }
    }
  });

  return jsonResponse(
    masters.map(ms => ({
      id: ms.master.id,
      name: ms.master.nickname || `${ms.master.firstName} ${ms.master.lastName || ''}`.trim(),
      specialization: ms.master.specialization,
      rating: ms.master.rating,
      avatar: ms.master.photoUrl,
      bookings: ms.master._count.masterBookings,
      hasAvailability: ms.master.schedules.length > 0,
    }))
  );
}

/**
 * POST /api/services/[id]/masters
 * Добавить мастера к услуге (только админ)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  return withAuth(request, async (user) => {
    if (user.role !== UserRole.ADMIN) {
      return errorResponse('PERMISSION_DENIED', 'Only admin can manage service masters', 403);
    }

    const serviceId = parseInt(id, 10);
    const body = await request.json();
    const { masterId } = body;

    if (!masterId) {
      return errorResponse('INVALID_DATA', 'masterId is required');
    }

    // Проверяем что услуга существует
    const service = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!service) {
      return errorResponse('NOT_FOUND', 'Service not found', 404);
    }

    // Проверяем что мастер существует
    const master = await prisma.user.findUnique({
      where: { id: masterId }
    });

    if (!master || master.role !== UserRole.MASTER) {
      return errorResponse('NOT_FOUND', 'Master not found', 404);
    }

    // Создаём связь
    await prisma.masterService.create({
      data: {
        masterId,
        serviceId,
      }
    }).catch(() => {
      // Уже существует
    });

    return jsonResponse({ message: 'Master added to service' });
  }, [UserRole.ADMIN]);
}

/**
 * DELETE /api/services/[id]/masters
 * Удалить мастера из услуги
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  return withAuth(request, async (user) => {
    if (user.role !== UserRole.ADMIN) {
      return errorResponse('PERMISSION_DENIED', 'Only admin can manage service masters', 403);
    }

    const serviceId = parseInt(id, 10);
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('masterId');

    if (!masterId) {
      return errorResponse('INVALID_DATA', 'masterId is required');
    }

    await prisma.masterService.deleteMany({
      where: {
        serviceId,
        masterId: parseInt(masterId, 10),
      }
    });

    return jsonResponse({ message: 'Master removed from service' });
  }, [UserRole.ADMIN]);
}

