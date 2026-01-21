import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth, jsonResponse, errorResponse } from '@/lib/api-utils';
import { UserRole } from '@prisma/client';

/**
 * POST /api/masters/services
 * Назначить услугу мастеру (только для админа)
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async () => {
    const body = await request.json();
    const { masterId, serviceId } = body;

    if (!masterId || !serviceId) {
      return errorResponse('INVALID_DATA', 'masterId и serviceId обязательны');
    }

    // Проверяем существование мастера
    const master = await prisma.user.findUnique({
      where: { id: masterId }
    });

    if (!master || master.role !== UserRole.MASTER) {
      return errorResponse('NOT_FOUND', 'Мастер не найден', 404);
    }

    // Проверяем существование услуги
    const service = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!service) {
      return errorResponse('NOT_FOUND', 'Услуга не найдена', 404);
    }

    // Проверяем не назначена ли уже услуга
    const existing = await prisma.masterService.findUnique({
      where: {
        masterId_serviceId: {
          masterId,
          serviceId,
        }
      }
    });

    if (existing) {
      return errorResponse('ALREADY_EXISTS', 'Услуга уже назначена этому мастеру');
    }

    // Создаём связь
    await prisma.masterService.create({
      data: {
        masterId,
        serviceId,
      }
    });

    return jsonResponse({ message: 'Услуга назначена мастеру' });
  }, [UserRole.ADMIN]);
}

/**
 * DELETE /api/masters/services
 * Убрать услугу у мастера (только для админа)
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async () => {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('masterId');
    const serviceId = searchParams.get('serviceId');

    if (!masterId || !serviceId) {
      return errorResponse('INVALID_DATA', 'masterId и serviceId обязательны');
    }

    const deleted = await prisma.masterService.deleteMany({
      where: {
        masterId: parseInt(masterId, 10),
        serviceId: parseInt(serviceId, 10),
      }
    });

    if (deleted.count === 0) {
      return errorResponse('NOT_FOUND', 'Связь не найдена', 404);
    }

    return jsonResponse({ message: 'Услуга убрана у мастера' });
  }, [UserRole.ADMIN]);
}

