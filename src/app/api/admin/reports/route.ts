import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth, jsonResponse } from '@/lib/api-utils';
import { UserRole } from '@prisma/client';

/**
 * GET /api/admin/reports
 * Получить отчёты и статистику
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async () => {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    // Даты по умолчанию - текущий месяц
    const now = new Date();
    const startDate = startDateStr 
      ? new Date(startDateStr) 
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = endDateStr 
      ? new Date(endDateStr) 
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Все записи за период
    const bookings = await prisma.booking.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        }
      },
      include: {
        service: {
          include: { category: true }
        },
        master: true,
        client: true,
      }
    });

    // Статистика по категориям услуг
    const servicesByCategory: Record<string, { count: number; revenue: number }> = {};
    const masterStats: Record<number, { name: string; bookings: number; revenue: number }> = {};
    const clientIds = new Set<number>();
    const repeatClients = new Set<number>();

    let totalRevenue = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    for (const booking of bookings) {
      const categoryName = booking.service.category.name;
      
      if (!servicesByCategory[categoryName]) {
        servicesByCategory[categoryName] = { count: 0, revenue: 0 };
      }

      if (booking.status === 'COMPLETED') {
        servicesByCategory[categoryName].count++;
        servicesByCategory[categoryName].revenue += booking.price;
        totalRevenue += booking.price;
        completedCount++;

        // Статистика мастеров
        if (!masterStats[booking.masterId]) {
          masterStats[booking.masterId] = {
            name: `${booking.master.firstName} ${booking.master.lastName || ''}`.trim(),
            bookings: 0,
            revenue: 0,
          };
        }
        masterStats[booking.masterId].bookings++;
        masterStats[booking.masterId].revenue += booking.price;

        // Повторные клиенты
        if (clientIds.has(booking.clientId)) {
          repeatClients.add(booking.clientId);
        }
        clientIds.add(booking.clientId);
      }

      if (booking.status === 'CANCELLED') {
        cancelledCount++;
      }
    }

    // Формируем отчёты
    const serviceReports = Object.entries(servicesByCategory).map(([category, data]) => ({
      category,
      count: data.count,
      revenue: data.revenue,
    }));

    const masterReports = Object.entries(masterStats)
      .map(([masterId, data]) => ({
        masterId: parseInt(masterId),
        name: data.name,
        bookings: data.bookings,
        revenue: data.revenue,
        rating: 5.0, // TODO: реальный рейтинг
      }))
      .sort((a, b) => b.bookings - a.bookings);

    // Новые клиенты за период
    const existingClientsBefore = await prisma.booking.findMany({
      where: {
        date: { lt: startDate },
        status: 'COMPLETED'
      },
      select: { clientId: true },
      distinct: ['clientId']
    });
    const existingClientIds = new Set(existingClientsBefore.map(b => b.clientId));
    const newClients = [...clientIds].filter(id => !existingClientIds.has(id)).length;

    const stats = {
      totalBookings: bookings.length,
      completedBookings: completedCount,
      cancelledBookings: cancelledCount,
      totalRevenue,
      averageCheck: completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0,
      newClients,
      repeatClients: repeatClients.size,
      repeatRate: clientIds.size > 0 ? Math.round((repeatClients.size / clientIds.size) * 100) : 0,
    };

    return jsonResponse({
      serviceReports,
      masterReports,
      stats,
    });
  }, [UserRole.ADMIN]);
}

