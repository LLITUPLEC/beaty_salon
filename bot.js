/**
 * Telegram Bot для Beauty Salon Web App
 * 
 * Запуск: node bot.js
 * 
 * Бот отвечает на /start кнопкой для открытия Web App.
 * Запускай этот скрипт отдельно от Next.js приложения.
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Конфигурация
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://prokrust-game.ru';

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN не найден в .env файле!');
  process.exit(1);
}

// Создаём бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 Бот запущен!');
console.log(`📱 Web App URL: ${WEB_APP_URL}`);

// Команда /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'Гость';
  
  const welcomeMessage = `
✨ Добро пожаловать в *Beauty Salon*, ${firstName}!

Здесь вы можете:
💅 Записаться на услуги
📅 Просмотреть расписание мастеров
📋 Управлять своими записями

Нажмите кнопку ниже, чтобы открыть приложение:
  `.trim();

  await bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '💅 Открыть Beauty Salon',
            web_app: { url: WEB_APP_URL }
          }
        ]
      ]
    }
  });
});

// Команда /help
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  
  await bot.sendMessage(chatId, `
📖 *Помощь по Beauty Salon*

/start - Открыть приложение
/help - Показать эту справку
/contact - Связаться с нами

🌐 Веб-версия: ${WEB_APP_URL}
  `.trim(), { parse_mode: 'Markdown' });
});

// Команда /contact
bot.onText(/\/contact/, async (msg) => {
  const chatId = msg.chat.id;
  
  await bot.sendMessage(chatId, `
📞 *Контакты Beauty Salon*

📍 Адрес: г. Москва, ул. Примерная, д. 1
📱 Телефон: +7 (999) 123-45-67
🕐 Часы работы: 09:00 - 21:00

Или откройте приложение для онлайн-записи:
  `.trim(), {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '💅 Записаться онлайн',
            web_app: { url: WEB_APP_URL }
          }
        ]
      ]
    }
  });
});

// Обработка ошибок
bot.on('polling_error', (error) => {
  console.error('❌ Ошибка polling:', error.message);
});

// При получении данных из Web App
bot.on('web_app_data', async (msg) => {
  const chatId = msg.chat.id;
  const data = msg.web_app_data?.data;
  
  if (data) {
    try {
      const parsed = JSON.parse(data);
      console.log('📥 Данные из Web App:', parsed);
      
      // Можно отправить подтверждение
      if (parsed.type === 'booking_created') {
        await bot.sendMessage(chatId, 
          `✅ Ваша запись подтверждена!\n\n📅 ${parsed.date}\n⏰ ${parsed.time}\n💇 ${parsed.service}`
        );
      }
    } catch (e) {
      console.error('Ошибка парсинга данных:', e);
    }
  }
});

console.log('✅ Бот готов к работе!');

