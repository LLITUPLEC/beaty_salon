import CryptoJS from 'crypto-js';

interface TelegramInitData {
  query_id?: string;
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    photo_url?: string;
  };
  auth_date: number;
  hash: string;
}

/**
 * Парсит initData строку от Telegram Web App
 */
export function parseInitData(initData: string): TelegramInitData | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    if (!hash) return null;

    const userStr = params.get('user');
    const user = userStr ? JSON.parse(userStr) : undefined;
    const auth_date = parseInt(params.get('auth_date') || '0', 10);
    const query_id = params.get('query_id') || undefined;

    return {
      query_id,
      user,
      auth_date,
      hash,
    };
  } catch {
    return null;
  }
}

/**
 * Проверяет валидность данных от Telegram Web App
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramData(initData: string, botToken: string): boolean {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    if (!hash) return false;

    // Удаляем hash из параметров для проверки
    params.delete('hash');
    
    // Сортируем параметры и создаем строку для проверки
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Создаем secret key из токена бота
    const secretKey = CryptoJS.HmacSHA256(botToken, 'WebAppData');
    
    // Вычисляем HMAC-SHA256
    const calculatedHash = CryptoJS.HmacSHA256(dataCheckString, secretKey).toString(CryptoJS.enc.Hex);

    return calculatedHash === hash;
  } catch {
    return false;
  }
}

/**
 * Проверяет, что данные не устарели (не старше 24 часов)
 */
export function isDataFresh(authDate: number, maxAgeSeconds: number = 86400): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now - authDate < maxAgeSeconds;
}

/**
 * Полная валидация данных Telegram
 */
export function verifyTelegramWebAppData(
  initData: string,
  botToken: string
): { valid: boolean; data: TelegramInitData | null; error?: string } {
  // Парсим данные
  const data = parseInitData(initData);
  
  if (!data) {
    return { valid: false, data: null, error: 'Invalid init data format' };
  }

  // Проверяем подпись
  if (!validateTelegramData(initData, botToken)) {
    return { valid: false, data: null, error: 'Invalid signature' };
  }

  // Проверяем свежесть данных
  if (!isDataFresh(data.auth_date)) {
    return { valid: false, data: null, error: 'Data is expired' };
  }

  return { valid: true, data };
}

