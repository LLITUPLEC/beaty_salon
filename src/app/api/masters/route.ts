import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth, jsonResponse, errorResponse } from '@/lib/api-utils';
import { UserRole } from '@prisma/client';
import { notifyMasterRoleAssigned } from '@/lib/notifications';

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
      nickname: true,
      specialization: true,
      rating: true,
      photoUrl: true,
      canCreateServices: true,
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
      // Используем nickname если есть, иначе firstName + lastName
      name: m.nickname || `${m.firstName} ${m.lastName || ''}`.trim(),
      fullName: `${m.firstName} ${m.lastName || ''}`.trim(),
      nickname: m.nickname,
      telegram: m.username ? `@${m.username}` : null,
      telegramId: m.telegramId.toString(),
      specialization: m.specialization || 'Мастер',
      rating: m.rating,
      avatar: m.photoUrl,
      bookings: m._count.masterBookings,
      canCreateServices: m.canCreateServices,
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
    const { telegramId, nickname, specialization, canCreateServices } = body;

    if (!telegramId) {
      return errorResponse('INVALID_DATA', 'Telegram ID обязателен');
    }

    let tgId: bigint;
    try {
      tgId = BigInt(telegramId);
    } catch {
      return errorResponse('INVALID_DATA', 'Некорректный Telegram ID');
    }

    // Проверяем существует ли пользователь
    const existingUser = await prisma.user.findUnique({
      where: { telegramId: tgId }
    });

    if (!existingUser) {
      return errorResponse(
        'USER_NOT_FOUND', 
        'Пользователь с таким Telegram ID не найден. Он должен сначала открыть приложение.'
      );
    }

    if (existingUser.role === UserRole.MASTER) {
      return errorResponse('ALREADY_MASTER', 'Пользователь уже является мастером');
    }

    if (existingUser.role === UserRole.ADMIN) {
      return errorResponse('IS_ADMIN', 'Нельзя назначить админа мастером');
    }

    // Обновляем роль пользователя на MASTER
    const master = await prisma.user.update({
      where: { telegramId: tgId },
      data: {
        role: UserRole.MASTER,
        nickname: nickname || null,
        specialization: specialization || 'Мастер',
        canCreateServices: canCreateServices || false,
      }
    });

    // Отправляем уведомление новому мастеру
    notifyMasterRoleAssigned({
      masterTelegramId: master.telegramId,
      masterName: master.firstName,
    }).catch(err => console.error('Error notifying new master:', err));

    return jsonResponse({
      id: master.id,
      name: master.nickname || `${master.firstName} ${master.lastName || ''}`.trim(),
      telegramId: master.telegramId.toString(),
      specialization: master.specialization,
      canCreateServices: master.canCreateServices,
    });
  }, [UserRole.ADMIN]);
}

/**
 * DELETE /api/masters
 * Удалить мастера (сменить роль на CLIENT)
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async () => {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('id');

    if (!masterId) {
      return errorResponse('INVALID_DATA', 'ID мастера обязателен');
    }

    const master = await prisma.user.findUnique({
      where: { id: parseInt(masterId, 10) }
    });

    if (!master) {
      return errorResponse('NOT_FOUND', 'Мастер не найден', 404);
    }

    if (master.role !== UserRole.MASTER) {
      return errorResponse('NOT_MASTER', 'Пользователь не является мастером');
    }

    // Удаляем связи мастера с услугами
    await prisma.masterService.deleteMany({
      where: { masterId: master.id }
    });

    // Меняем роль на CLIENT
    await prisma.user.update({
      where: { id: master.id },
      data: {
        role: UserRole.CLIENT,
        specialization: null,
        nickname: null,
        canCreateServices: false,
      }
    });

    return jsonResponse({ message: 'Мастер удалён' });
  }, [UserRole.ADMIN]);
}

/**
 * PUT /api/masters
 * Обновить данные мастера
 */
export async function PUT(request: NextRequest) {
  return withAuth(request, async () => {
    const body = await request.json();
    const { id, nickname, specialization, canCreateServices } = body;

    if (!id) {
      return errorResponse('INVALID_DATA', 'ID мастера обязателен');
    }

    const master = await prisma.user.findUnique({
      where: { id }
    });

    if (!master || master.role !== UserRole.MASTER) {
      return errorResponse('NOT_FOUND', 'Мастер не найден', 404);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(nickname !== undefined && { nickname }),
        ...(specialization !== undefined && { specialization }),
        ...(canCreateServices !== undefined && { canCreateServices }),
      }
    });

    return jsonResponse({
      id: updated.id,
      name: updated.nickname || `${updated.firstName} ${updated.lastName || ''}`.trim(),
      nickname: updated.nickname,
      specialization: updated.specialization,
      canCreateServices: updated.canCreateServices,
    });
  }, [UserRole.ADMIN]);
}
