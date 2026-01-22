import { NextRequest, NextResponse } from 'next/server';
import { verifyTelegramWebAppData, parseInitData } from './telegram-auth';
import prisma from './prisma';
import { UserRole } from '@prisma/client';
import { notifyAdminNewUser } from './notifications';

// Admin Telegram ID из env
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID 
  ? BigInt(process.env.ADMIN_TELEGRAM_ID) 
  : BigInt(668127354);

export interface AuthUser {
  id: number;
  telegramId: bigint;
  firstName: string;
  lastName: string | null;
  username: string | null;
  role: UserRole;
  nickname: string | null;
  canCreateServices: boolean;
}

interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

/**
 * Авторизация пользователя по initData от Telegram
 * Создает пользователя если его нет в БД
 */
export async function authenticateUser(request: NextRequest): Promise<AuthResult> {
  const initData = request.headers.get('x-telegram-init-data');
  
  // В режиме разработки разрешаем тестовые запросы
  if (process.env.NODE_ENV === 'development' && !initData) {
    const testTelegramId = request.headers.get('x-test-telegram-id');
    if (testTelegramId) {
      const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(testTelegramId) }
      });
      
      if (user) {
        return {
          success: true,
          user: {
            id: user.id,
            telegramId: user.telegramId,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            role: user.role,
            nickname: user.nickname,
            canCreateServices: user.canCreateServices,
          }
        };
      }
    }
    return { success: false, error: 'No init data provided' };
  }

  if (!initData) {
    return { success: false, error: 'No init data provided' };
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return { success: false, error: 'Bot token not configured' };
  }

  // Верифицируем данные от Telegram
  const verification = verifyTelegramWebAppData(initData, botToken);
  
  if (!verification.valid || !verification.data?.user) {
    return { success: false, error: verification.error || 'Invalid Telegram data' };
  }

  const tgUser = verification.data.user;
  const telegramId = BigInt(tgUser.id);

  // Определяем роль: админ если telegram_id совпадает
  const isAdmin = telegramId === ADMIN_TELEGRAM_ID;

  // Проверяем, существует ли пользователь
  const existingUser = await prisma.user.findUnique({
    where: { telegramId }
  });

  const isNewUser = !existingUser;

  // Ищем или создаем пользователя
  const user = await prisma.user.upsert({
    where: { telegramId },
    update: {
      username: tgUser.username,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name || null,
      photoUrl: tgUser.photo_url || null,
      // Обновляем роль на ADMIN только если это админ и роль еще не установлена
      ...(isAdmin ? { role: UserRole.ADMIN } : {}),
    },
    create: {
      telegramId,
      username: tgUser.username,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name || null,
      photoUrl: tgUser.photo_url || null,
      role: isAdmin ? UserRole.ADMIN : UserRole.CLIENT,
    },
  });

  // Уведомляем админа о новом пользователе (если это не сам админ)
  if (isNewUser && !isAdmin) {
    const userName = `${tgUser.first_name} ${tgUser.last_name || ''}`.trim();
    notifyAdminNewUser({
      adminTelegramId: ADMIN_TELEGRAM_ID,
      userName,
      userTelegramId: telegramId,
      username: tgUser.username || null,
    }).catch(err => console.error('Error notifying admin about new user:', err));
  }

  return {
    success: true,
    user: {
      id: user.id,
      telegramId: user.telegramId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      role: user.role,
      nickname: user.nickname,
      canCreateServices: user.canCreateServices,
    }
  };
}

/**
 * Проверка роли пользователя
 */
export function hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  // ADMIN имеет доступ ко всему
  if (userRole === UserRole.ADMIN) return true;
  return requiredRoles.includes(userRole);
}

/**
 * Middleware для проверки авторизации
 */
export async function withAuth(
  request: NextRequest,
  handler: (user: AuthUser) => Promise<NextResponse>,
  requiredRoles?: UserRole[]
): Promise<NextResponse> {
  const auth = await authenticateUser(request);

  if (!auth.success || !auth.user) {
    return NextResponse.json(
      { success: false, error: { code: 'AUTH_REQUIRED', message: auth.error || 'Authentication required' } },
      { status: 401 }
    );
  }

  if (requiredRoles && !hasRole(auth.user.role, requiredRoles)) {
    return NextResponse.json(
      { success: false, error: { code: 'PERMISSION_DENIED', message: 'Insufficient permissions' } },
      { status: 403 }
    );
  }

  return handler(auth.user);
}

/**
 * Стандартный JSON response
 */
export function jsonResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Ошибка response
 */
export function errorResponse(code: string, message: string, status: number = 400): NextResponse {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status }
  );
}

