import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { jsonResponse, errorResponse } from '@/lib/api-utils';
import { UserRole } from '@prisma/client';

/**
 * GET /api/masters/[id]/services
 * Получить услуги конкретного мастера
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const masterId = parseInt(id, 10);

  if (isNaN(masterId)) {
    return errorResponse('INVALID_DATA', 'Invalid master ID');
  }

  // Проверяем существование мастера
  const master = await prisma.user.findUnique({
    where: { id: masterId }
  });

  if (!master || master.role !== UserRole.MASTER) {
    return errorResponse('NOT_FOUND', 'Master not found', 404);
  }

  // Получаем услуги мастера через MasterService
  const masterServices = await prisma.masterService.findMany({
    where: { masterId },
    include: {
      service: {
        include: {
          category: true
        }
      }
    }
  });

  return jsonResponse(
    masterServices.map(ms => ({
      id: ms.service.id,
      name: ms.service.name,
      category: ms.service.category.name,
      categoryId: ms.service.categoryId,
      price: ms.service.price,
      duration: ms.service.duration,
    }))
  );
}

