/**
 * Сервис уведомлений через Telegram Bot API
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

interface SendMessageParams {
  chatId: number | string;
  text: string;
  parseMode?: 'Markdown' | 'HTML';
}

/**
 * Отправить сообщение через Telegram Bot API
 */
async function sendTelegramMessage({ chatId, text, parseMode = 'Markdown' }: SendMessageParams): Promise<boolean> {
  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    });

    const result = await response.json();
    
    if (!result.ok) {
      console.error('Telegram API error:', result.description);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

/**
 * Форматирование даты для уведомлений
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

// ============ Уведомления для клиента ============

/**
 * Уведомление клиенту о создании записи
 */
export async function notifyClientBookingCreated(params: {
  clientTelegramId: bigint;
  masterName: string;
  serviceName: string;
  date: string;
  time: string;
}): Promise<boolean> {
  const text = `
📝 *Запись создана!*

💇 Услуга: ${params.serviceName}
👤 Мастер: ${params.masterName}
📅 Дата: ${formatDate(params.date)}
⏰ Время: ${params.time}

⏳ Ожидайте подтверждения от мастера.
  `.trim();

  return sendTelegramMessage({
    chatId: params.clientTelegramId.toString(),
    text,
  });
}

/**
 * Уведомление клиенту о подтверждении записи
 */
export async function notifyClientBookingConfirmed(params: {
  clientTelegramId: bigint;
  masterName: string;
  serviceName: string;
  date: string;
  time: string;
}): Promise<boolean> {
  const text = `
✅ *Запись подтверждена!*

💇 Услуга: ${params.serviceName}
👤 Мастер: ${params.masterName}
📅 Дата: ${formatDate(params.date)}
⏰ Время: ${params.time}

Ждём вас! 💅
  `.trim();

  return sendTelegramMessage({
    chatId: params.clientTelegramId.toString(),
    text,
  });
}

/**
 * Уведомление клиенту об отмене записи
 */
export async function notifyClientBookingCancelled(params: {
  clientTelegramId: bigint;
  masterName: string;
  serviceName: string;
  date: string;
  time: string;
  cancelledBy: 'master' | 'client' | 'admin';
}): Promise<boolean> {
  const cancelReason = params.cancelledBy === 'master' 
    ? 'мастером' 
    : params.cancelledBy === 'admin' 
    ? 'администратором' 
    : 'вами';

  const text = `
❌ *Запись отменена ${cancelReason}*

💇 Услуга: ${params.serviceName}
👤 Мастер: ${params.masterName}
📅 Дата: ${formatDate(params.date)}
⏰ Время: ${params.time}

Вы можете записаться на другое время.
  `.trim();

  return sendTelegramMessage({
    chatId: params.clientTelegramId.toString(),
    text,
  });
}

// ============ Уведомления для мастера ============

/**
 * Уведомление мастеру о новой записи
 */
export async function notifyMasterNewBooking(params: {
  masterTelegramId: bigint;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
}): Promise<boolean> {
  const text = `
🔔 *Новая запись!*

👤 Клиент: ${params.clientName}
💇 Услуга: ${params.serviceName}
📅 Дата: ${formatDate(params.date)}
⏰ Время: ${params.time}

Подтвердите или отклоните запись в приложении.
  `.trim();

  return sendTelegramMessage({
    chatId: params.masterTelegramId.toString(),
    text,
  });
}

/**
 * Уведомление мастеру об отмене записи клиентом
 */
export async function notifyMasterBookingCancelled(params: {
  masterTelegramId: bigint;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
}): Promise<boolean> {
  const text = `
❌ *Клиент отменил запись*

👤 Клиент: ${params.clientName}
💇 Услуга: ${params.serviceName}
📅 Дата: ${formatDate(params.date)}
⏰ Время: ${params.time}
  `.trim();

  return sendTelegramMessage({
    chatId: params.masterTelegramId.toString(),
    text,
  });
}

// ============ Уведомления для админа ============

/**
 * Уведомление админу о новой записи (опционально)
 */
export async function notifyAdminNewBooking(params: {
  adminTelegramId: bigint;
  clientName: string;
  masterName: string;
  serviceName: string;
  date: string;
  time: string;
}): Promise<boolean> {
  const text = `
📊 *Новая запись в салоне*

👤 Клиент: ${params.clientName}
💇 Мастер: ${params.masterName}
✂️ Услуга: ${params.serviceName}
📅 Дата: ${formatDate(params.date)}
⏰ Время: ${params.time}
  `.trim();

  return sendTelegramMessage({
    chatId: params.adminTelegramId.toString(),
    text,
  });
}

