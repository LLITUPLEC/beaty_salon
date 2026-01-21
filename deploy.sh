#!/bin/bash

# ============================================
# Первоначальная установка на VPS
# Запускай ОДИН РАЗ при первом деплое
# Использование: curl -s URL | bash
# ============================================

# === КОНФИГУРАЦИЯ ===
GIT_REPO_URL="https://github.com/ВАШ_ЛОГИН/ВАШ_РЕПОЗИТОРИЙ.git"
INSTALL_DIR="/var/www/beauty-salon"
DOMAIN="prokrust-game.ru"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${GREEN}========================================"
echo "🚀 Установка Beauty Salon на VPS"
echo -e "========================================${NC}"
echo ""

# Проверка root
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Запустите от root: sudo bash deploy.sh${NC}"
fi

# 1. Установка Node.js
echo ""
echo -e "${GREEN}📦 Установка Node.js 20...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "Node.js уже установлен: $(node -v)"
fi

# 2. Установка PM2
echo ""
echo -e "${GREEN}📦 Установка PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
else
    echo "PM2 уже установлен"
fi

# 3. Создание директории
echo ""
echo -e "${GREEN}📂 Создание директории проекта...${NC}"
sudo mkdir -p "$INSTALL_DIR"
sudo chown -R $USER:$USER "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 4. Клонирование репозитория
echo ""
echo -e "${GREEN}📥 Клонирование репозитория...${NC}"
if [ -d "app" ]; then
    echo "Директория app уже существует. Обновляем..."
    cd app
    git pull
else
    git clone "$GIT_REPO_URL" app
    cd app
fi

# 5. Создание .env
echo ""
echo -e "${YELLOW}📝 Настройка .env файла...${NC}"
if [ ! -f ".env" ]; then
    echo "Создаём .env файл..."
    cat > .env << 'ENVEOF'
# Database - ЗАМЕНИТЕ НА СВОИ ДАННЫЕ
DATABASE_URL="postgresql://beauty_user:your_password@localhost:5432/beauty_salon"

# Telegram Bot Token
TELEGRAM_BOT_TOKEN="ваш_токен"

# Admin Telegram ID
ADMIN_TELEGRAM_ID="668127354"

# Web App URL
WEB_APP_URL="https://prokrust-game.ru"
ENVEOF
    echo ""
    echo -e "${RED}⚠️  ВАЖНО: Отредактируйте .env файл перед продолжением!${NC}"
    echo "nano $INSTALL_DIR/app/.env"
    echo ""
    read -p "Нажмите Enter после редактирования .env..."
fi

# 6. Установка зависимостей
echo ""
echo -e "${GREEN}📦 Установка зависимостей...${NC}"
npm install

# 7. Генерация Prisma
echo ""
echo -e "${GREEN}🔧 Генерация Prisma клиента...${NC}"
npx prisma generate

# 8. Миграции БД
echo ""
echo -e "${GREEN}🗃️  Применение миграций...${NC}"
npx prisma db push

# 9. Seed данных
echo ""
read -p "Заполнить БД тестовыми данными? (y/n): " SEED_CHOICE
if [ "$SEED_CHOICE" = "y" ]; then
    npm run db:seed
fi

# 10. Сборка
echo ""
echo -e "${GREEN}🏗️  Сборка приложения...${NC}"
npm run build

# 11. Запуск через PM2
echo ""
echo -e "${GREEN}🚀 Запуск сервисов...${NC}"
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo ""
echo -e "${GREEN}========================================"
echo "✅ Установка завершена!"
echo "========================================"
echo ""
echo "📋 Следующие шаги:"
echo ""
echo "1. Настройте Nginx Proxy Manager:"
echo "   - Domain: $DOMAIN"
echo "   - Forward: http://127.0.0.1:3000"
echo "   - SSL: Let's Encrypt"
echo ""
echo "2. Настройте бота в @BotFather:"
echo "   - Menu Button URL: https://$DOMAIN"
echo ""
echo "3. Проверьте статус:"
echo "   pm2 status"
echo "   pm2 logs"
echo ""
echo -e "${NC}"

