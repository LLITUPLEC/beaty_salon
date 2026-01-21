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
 * Создать смену для мастера
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async () => {
    const body = await request.json();
    const { masterId, date, startTime, endTime } = body;

    if (!masterId || !date || !startTime || !endTime) {
      return errorResponse('INVALID_DATA', 'Missing required fields');
    }

    const scheduleDate = new Date(date);

    // Проверяем, нет ли уже расписания на этот день
    const existing = await prisma.schedule.findUnique({
      where: {
        masterId_date: {
          masterId,
          date: scheduleDate,
        }
      }
    });

    if (existing) {
      // Обновляем существующее
      const updated = await prisma.schedule.update({
        where: { id: existing.id },
        data: { startTime, endTime, isActive: true },
        include: {
          master: { select: { firstName: true, lastName: true } }
        }
      });

      return jsonResponse({
        id: updated.id,
        message: 'Schedule updated',
      });
    }

    const schedule = await prisma.schedule.create({
      data: {
        masterId,
        date: scheduleDate,
        startTime,
        endTime,
      },
      include: {
        master: { select: { firstName: true, lastName: true } }
      }
    });

    return jsonResponse({
      id: schedule.id,
      message: 'Schedule created',
    });
  }, [UserRole.ADMIN]);
}

