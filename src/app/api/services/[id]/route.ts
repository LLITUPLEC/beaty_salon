import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth, jsonResponse, errorResponse } from '@/lib/api-utils';
import { UserRole } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/services/[id]
 * Обновить услугу
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  return withAuth(request, async (user) => {
    const serviceId = parseInt(id, 10);
    const body = await request.json();

    // Проверяем существование услуги
    const existing = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!existing) {
      return errorResponse('NOT_FOUND', 'Service not found', 404);
    }

    // Мастер может редактировать только свои услуги
    if (user.role === UserRole.MASTER && existing.masterId !== user.id) {
      return errorResponse('PERMISSION_DENIED', 'Cannot edit this service', 403);
    }

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

    return jsonResponse({
      id: service.id,
      name: service.name,
      category: service.category.name,
      price: service.price,
      duration: service.duration,
    });
  }, [UserRole.MASTER, UserRole.ADMIN]);
}

/**
 * DELETE /api/services/[id]
 * Удалить услугу
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  return withAuth(request, async (user) => {
    const serviceId = parseInt(id, 10);

    const existing = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!existing) {
      return errorResponse('NOT_FOUND', 'Service not found', 404);
    }

    if (user.role === UserRole.MASTER && existing.masterId !== user.id) {
      return errorResponse('PERMISSION_DENIED', 'Cannot delete this service', 403);
    }

    // Soft delete
    await prisma.service.update({
      where: { id: serviceId },
      data: { isActive: false }
    });

    return jsonResponse({ message: 'Service deleted' });
  }, [UserRole.MASTER, UserRole.ADMIN]);
}

