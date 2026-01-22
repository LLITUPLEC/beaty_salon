import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth, jsonResponse, errorResponse } from '@/lib/api-utils';
import { UserRole } from '@prisma/client';

/**
 * GET /api/admin/schedule
 * Получить расписание мастеров
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async () => {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('masterId');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const where: any = { isActive: true };

    if (masterId) {
      where.masterId = parseInt(masterId, 10);
    }

    if (startDateStr) {
      where.date = { ...where.date, gte: new Date(startDateStr) };
    }

    if (endDateStr) {
      where.date = { ...where.date, lte: new Date(endDateStr) };
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        master: {
          select: { id: true, firstName: true, lastName: true, nickname: true }
        }
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    });

    return jsonResponse(
      schedules.map(s => ({
        id: s.id,
        // Используем nickname если есть
        master: s.master.nickname || `${s.master.firstName} ${s.master.lastName || ''}`.trim(),
        masterId: s.masterId,
        date: s.date.toISOString().split('T')[0],
        startTime: s.startTime,
        endTime: s.endTime,
      }))
    );
  }, [UserRole.ADMIN]);
}

/**
 * POST /api/admin/schedule
 * Создать смену для мастера (или массово для нескольких)
 * Параметры:
 * - masterId или masterIds[] - мастер(ы)
 * - date или dates[] - дата(ы)
 * - startTime, endTime - время
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async () => {
    const body = await request.json();
    const { masterId, masterIds, date, dates, startTime, endTime } = body;

    if (!startTime || !endTime) {
      return errorResponse('INVALID_DATA', 'Укажите время начала и окончания');
    }

    // Определяем список мастеров
    const masterIdList: number[] = masterIds || (masterId ? [masterId] : []);
    if (masterIdList.length === 0) {
      return errorResponse('INVALID_DATA', 'Укажите мастера(ов)');
    }

    // Определяем список дат
    const dateList: string[] = dates || (date ? [date] : []);
    if (dateList.length === 0) {
      return errorResponse('INVALID_DATA', 'Укажите дату(ы)');
    }

    const createdIds: number[] = [];
    const updatedIds: number[] = [];

    // Создаём/обновляем смены для каждой комбинации мастер+дата
    for (const mId of masterIdList) {
      for (const d of dateList) {
        const scheduleDate = new Date(d);

        // Проверяем, нет ли уже расписания на этот день
        const existing = await prisma.schedule.findUnique({
          where: {
            masterId_date: {
              masterId: mId,
              date: scheduleDate,
            }
          }
        });

        if (existing) {
          // Обновляем существующее
          await prisma.schedule.update({
            where: { id: existing.id },
            data: { startTime, endTime, isActive: true }
          });
          updatedIds.push(existing.id);
        } else {
          const schedule = await prisma.schedule.create({
            data: {
              masterId: mId,
              date: scheduleDate,
              startTime,
              endTime,
            }
          });
          createdIds.push(schedule.id);
        }
      }
    }

    return jsonResponse({
      created: createdIds.length,
      updated: updatedIds.length,
      message: `Создано: ${createdIds.length}, обновлено: ${updatedIds.length}`,
    });
  }, [UserRole.ADMIN]);
}

/**
 * PUT /api/admin/schedule
 * Обновить смену
 */
export async function PUT(request: NextRequest) {
  return withAuth(request, async () => {
    const body = await request.json();
    const { id, startTime, endTime } = body;

    if (!id) {
      return errorResponse('INVALID_DATA', 'ID смены обязателен');
    }

    const existing = await prisma.schedule.findUnique({
      where: { id }
    });

    if (!existing) {
      return errorResponse('NOT_FOUND', 'Смена не найдена', 404);
    }

    const updated = await prisma.schedule.update({
      where: { id },
      data: {
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
      },
      include: {
        master: { select: { firstName: true, lastName: true, nickname: true } }
      }
    });

    return jsonResponse({
      id: updated.id,
      master: updated.master.nickname || `${updated.master.firstName} ${updated.master.lastName || ''}`.trim(),
      masterId: updated.masterId,
      date: updated.date.toISOString().split('T')[0],
      startTime: updated.startTime,
      endTime: updated.endTime,
    });
  }, [UserRole.ADMIN]);
}

/**
 * DELETE /api/admin/schedule
 * Удалить смену (soft delete - isActive=false)
 * Нельзя удалить прошедшую смену
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async () => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('INVALID_DATA', 'ID смены обязателен');
    }

    const scheduleId = parseInt(id, 10);

    const existing = await prisma.schedule.findUnique({
      where: { id: scheduleId }
    });

    if (!existing) {
      return errorResponse('NOT_FOUND', 'Смена не найдена', 404);
    }

    // Проверяем, не прошедшая ли это смена
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduleDate = new Date(existing.date);
    scheduleDate.setHours(0, 0, 0, 0);

    if (scheduleDate < today) {
      return errorResponse('CANNOT_DELETE', 'Нельзя удалить прошедшую смену');
    }

    await prisma.schedule.update({
      where: { id: scheduleId },
      data: { isActive: false }
    });

    return jsonResponse({ message: 'Смена удалена' });
  }, [UserRole.ADMIN]);
}

