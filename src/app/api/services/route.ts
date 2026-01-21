import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth, jsonResponse, errorResponse } from '@/lib/api-utils';
import { UserRole } from '@prisma/client';

/**
 * GET /api/services
 * Получить список всех услуг
 */
export async function GET() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    include: {
      category: true,
      master: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        }
      }
    },
    orderBy: [
      { category: { name: 'asc' } },
      { name: 'asc' }
    ]
  });

  return jsonResponse(
    services.map(s => ({
      id: s.id,
      name: s.name,
      category: s.category.name,
      categoryId: s.categoryId,
      price: s.price,
      duration: s.duration,
      masterId: s.masterId,
      masterName: s.master ? `${s.master.firstName} ${s.master.lastName || ''}`.trim() : null,
    }))
  );
}

/**
 * POST /api/services
 * Создать услугу (только для мастера или админа)
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (user) => {
    const body = await request.json();
    const { name, categoryId, price, duration } = body;

    if (!name || !categoryId || !price || !duration) {
      return errorResponse('INVALID_DATA', 'Missing required fields');
    }

    // Мастер может создавать только свои услуги
    const masterId = user.role === UserRole.MASTER ? user.id : body.masterId;

    const service = await prisma.service.create({
      data: {
        name,
        categoryId,
        price,
        duration,
        masterId,
      },
      include: {
        category: true,
      }
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

