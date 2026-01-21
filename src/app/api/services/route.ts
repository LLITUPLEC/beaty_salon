import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth, jsonResponse, errorResponse } from '@/lib/api-utils';
import { UserRole } from '@prisma/client';

/**
 * GET /api/services
 * Получить список всех услуг
 * Параметры:
 * - categoryId: фильтр по категории
 * - masterId: получить услуги конкретного мастера
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('categoryId');
  const masterId = searchParams.get('masterId');

  const where: any = { isActive: true };
  
  if (categoryId) {
    where.categoryId = parseInt(categoryId, 10);
  }

  // Если запрашиваем услуги конкретного мастера
  if (masterId) {
    where.masters = {
      some: {
        masterId: parseInt(masterId, 10)
      }
    };
  }

  const services = await prisma.service.findMany({
    where,
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
            }
          }
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
      masters: s.masters.map(ms => ({
        id: ms.master.id,
        name: ms.master.nickname || `${ms.master.firstName} ${ms.master.lastName || ''}`.trim(),
      })),
    }))
  );
}

/**
 * POST /api/services
 * Создать услугу
 * Доступно: админу или мастеру с canCreateServices=true
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (user) => {
    // Проверяем разрешение для мастера
    if (user.role === UserRole.MASTER) {
      const masterData = await prisma.user.findUnique({
        where: { id: user.id },
        select: { canCreateServices: true }
      });
      
      if (!masterData?.canCreateServices) {
        return errorResponse('PERMISSION_DENIED', 'У вас нет разрешения создавать услуги');
      }
    }

    const body = await request.json();
    const { name, categoryId, price, duration, masterIds } = body;

    if (!name || !categoryId || price === undefined || !duration) {
      return errorResponse('INVALID_DATA', 'Missing required fields: name, categoryId, price, duration');
    }

    // Проверяем категорию
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return errorResponse('INVALID_CATEGORY', `Category with id ${categoryId} not found`);
    }

    // Создаем услугу
    const service = await prisma.service.create({
      data: {
        name,
        categoryId,
        price: Number(price),
        duration: Number(duration),
        creatorId: user.id,
      },
      include: {
        category: true,
      }
    });

    // Если указаны мастера - привязываем их к услуге
    if (masterIds && Array.isArray(masterIds) && masterIds.length > 0) {
      await prisma.masterService.createMany({
        data: masterIds.map((masterId: number) => ({
          masterId,
          serviceId: service.id,
        }))
      });
    }

    // Если создаёт мастер - автоматически привязываем его к услуге
    if (user.role === UserRole.MASTER) {
      await prisma.masterService.create({
        data: {
          masterId: user.id,
          serviceId: service.id,
        }
      }).catch(() => {}); // Игнорируем если уже существует
    }

    return jsonResponse({
      id: service.id,
      name: service.name,
      category: service.category.name,
      categoryId: service.categoryId,
      price: service.price,
      duration: service.duration,
    });
  }, [UserRole.MASTER, UserRole.ADMIN]);
}
