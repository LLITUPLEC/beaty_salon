import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth, jsonResponse, errorResponse } from '@/lib/api-utils';
import { UserRole } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/services/[id]
 * Получить услугу с мастерами
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const serviceId = parseInt(id, 10);

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      category: true,
      masters: {
        include: {
          master: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              nickname: true,
              rating: true,
              _count: {
                select: { masterBookings: true }
              }
            }
          }
        }
      }
    }
  });

  if (!service) {
    return errorResponse('NOT_FOUND', 'Service not found', 404);
  }

  return jsonResponse({
    id: service.id,
    name: service.name,
    category: service.category.name,
    categoryId: service.categoryId,
    price: service.price,
    duration: service.duration,
    masters: service.masters.map(ms => ({
      id: ms.master.id,
      name: ms.master.nickname || `${ms.master.firstName} ${ms.master.lastName || ''}`.trim(),
      rating: ms.master.rating,
      bookings: ms.master._count.masterBookings,
    })),
  });
}

/**
 * PUT /api/services/[id]
 * Обновить услугу (только админ)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  return withAuth(request, async (user) => {
    // Только админ может редактировать услуги
    if (user.role !== UserRole.ADMIN) {
      return errorResponse('PERMISSION_DENIED', 'Only admin can edit services', 403);
    }

    const serviceId = parseInt(id, 10);
    const body = await request.json();

    const existing = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!existing) {
      return errorResponse('NOT_FOUND', 'Service not found', 404);
    }

    // Обновляем услугу
    const service = await prisma.service.update({
      where: { id: serviceId },
      data: {
        name: body.name,
        categoryId: body.categoryId,
        price: body.price,
        duration: body.duration,
      },
      include: { category: true }
    });

    // Если указаны мастера - обновляем связи
    if (body.masterIds !== undefined && Array.isArray(body.masterIds)) {
      // Удаляем старые связи
      await prisma.masterService.deleteMany({
        where: { serviceId }
      });
      
      // Создаём новые
      if (body.masterIds.length > 0) {
        await prisma.masterService.createMany({
          data: body.masterIds.map((masterId: number) => ({
            masterId,
            serviceId,
          }))
        });
      }
    }

    return jsonResponse({
      id: service.id,
      name: service.name,
      category: service.category.name,
      price: service.price,
      duration: service.duration,
    });
  }, [UserRole.ADMIN]);
}

/**
 * DELETE /api/services/[id]
 * Удалить услугу (только админ)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  return withAuth(request, async (user) => {
    // Только админ может удалять услуги
    if (user.role !== UserRole.ADMIN) {
      return errorResponse('PERMISSION_DENIED', 'Only admin can delete services', 403);
    }

    const serviceId = parseInt(id, 10);

    const existing = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!existing) {
      return errorResponse('NOT_FOUND', 'Service not found', 404);
    }

    // Удаляем связи с мастерами
    await prisma.masterService.deleteMany({
      where: { serviceId }
    });

    // Soft delete
    await prisma.service.update({
      where: { id: serviceId },
      data: { isActive: false }
    });

    return jsonResponse({ message: 'Service deleted' });
  }, [UserRole.ADMIN]);
}
