import { NextRequest } from 'next/server';
import { authenticateUser, jsonResponse, errorResponse } from '@/lib/api-utils';

/**
 * POST /api/auth/telegram
 * Авторизация через Telegram Web App
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateUser(request);

  if (!auth.success || !auth.user) {
    return errorResponse('AUTH_FAILED', auth.error || 'Authentication failed', 401);
  }

  return jsonResponse({
    id: auth.user.id,
    telegramId: auth.user.telegramId.toString(),
    firstName: auth.user.firstName,
    lastName: auth.user.lastName,
    username: auth.user.username,
    role: auth.user.role.toLowerCase(),
  });
}

