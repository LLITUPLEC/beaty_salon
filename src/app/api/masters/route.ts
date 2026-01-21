import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth, jsonResponse, errorResponse } from '@/lib/api-utils';
import { UserRole } from '@prisma/client';

/**
 * GET /api/masters
 * Получить список мастеров
 */
export async function GET() {
  const masters = await prisma.user.findMany({
    where: {
      role: UserRole.MASTER,
      isActive: true,
    },
    select: {
      id: true,
      telegramId: true,
      firstName: true,
      lastName: true,
      username: true,
      specialization: true,
      rating: true,
      photoUrl: true,
      _count: {
        select: {
          masterBookings: true,
        }
      }
    },
    orderBy: { firstName: 'asc' }
  });

  return jsonResponse(
    masters.map(m => ({
      id: m.id,
      name: `${m.firstName} ${m.lastName || ''}`.trim(),
      telegram: m.username ? `@${m.username}` : null,
      telegramId: m.telegramId.toString(),
      specialization: m.specialization || 'Мастер',
      rating: m.rating,
      avatar: m.photoUrl,
      bookings: m._count.masterBookings,
    }))
  );
}

/**
 * POST /api/masters
 * Добавить мастера (только для админа)
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async () => {
    const body = await request.json();
    const { telegramId, name, specialization } = body;

    if (!telegramId || !name) {
      return errorResponse('INVALID_DATA', 'Missing required fields');
    }

    const tgId = BigInt(telegramId);

    // Ищем существующего пользователя или создаем нового
    const master = await prisma.user.upsert({
      where: { telegramId: tgId },
      update: {
        role: UserRole.MASTER,
        specialization: specialization || 'Мастер',
      },
      create: {
        telegramId: tgId,
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' ') || null,
        role: UserRole.MASTER,
        specialization: specialization || 'Мастер',
      }
    });

    return jsonResponse({
      id: master.id,
      name: `${master.firstName} ${master.lastName || ''}`.trim(),
      telegramId: master.telegramId.toString(),
      specialization: master.specialization,
    });
  }, [UserRole.ADMIN]);
}

