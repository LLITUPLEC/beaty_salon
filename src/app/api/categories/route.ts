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
    orderBy: { name: 'asc' }
  });

  return jsonResponse(
    categories.map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
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
    });
  }, [UserRole.ADMIN]);
}

