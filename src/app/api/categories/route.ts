import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth, jsonResponse, errorResponse } from '@/lib/api-utils';
import { UserRole } from '@prisma/client';

/**
 * GET /api/categories
 * Получить список категорий
 */
export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { services: true }
      }
    }
  });

  return jsonResponse(
    categories.map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      servicesCount: c._count.services,
    }))
  );
}

/**
 * POST /api/categories
 * Создать категорию (только для админа)
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async () => {
    const body = await request.json();
    const { name, icon } = body;

    if (!name) {
      return errorResponse('INVALID_DATA', 'Name is required');
    }

    const category = await prisma.category.create({
      data: { name, icon }
    });

    return jsonResponse({
      id: category.id,
      name: category.name,
      icon: category.icon,
      servicesCount: 0,
    });
  }, [UserRole.ADMIN]);
}

/**
 * PUT /api/categories
 * Обновить категорию (только для админа)
 */
export async function PUT(request: NextRequest) {
  return withAuth(request, async () => {
    const body = await request.json();
    const { id, name, icon } = body;

    if (!id) {
      return errorResponse('INVALID_DATA', 'ID is required');
    }

    const existing = await prisma.category.findUnique({
      where: { id }
    });

    if (!existing) {
      return errorResponse('NOT_FOUND', 'Category not found', 404);
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(icon !== undefined && { icon }),
      },
      include: {
        _count: {
          select: { services: true }
        }
      }
    });

    return jsonResponse({
      id: category.id,
      name: category.name,
      icon: category.icon,
      servicesCount: category._count.services,
    });
  }, [UserRole.ADMIN]);
}

/**
 * DELETE /api/categories
 * Удалить категорию (только для админа)
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async () => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('INVALID_DATA', 'ID is required');
    }

    const categoryId = parseInt(id, 10);

    // Проверяем есть ли услуги в категории
    const servicesCount = await prisma.service.count({
      where: { categoryId }
    });

    if (servicesCount > 0) {
      return errorResponse(
        'HAS_SERVICES', 
        `Невозможно удалить категорию с ${servicesCount} услугами. Сначала удалите или переместите услуги.`
      );
    }

    await prisma.category.delete({
      where: { id: categoryId }
    });

    return jsonResponse({ message: 'Category deleted' });
  }, [UserRole.ADMIN]);
}

