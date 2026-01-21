import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Создаем категории услуг
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Стрижки' },
      update: {},
      create: { name: 'Стрижки', icon: '✂️' },
    }),
    prisma.category.upsert({
      where: { name: 'Окрашивание' },
      update: {},
      create: { name: 'Окрашивание', icon: '🎨' },
    }),
    prisma.category.upsert({
      where: { name: 'Маникюр' },
      update: {},
      create: { name: 'Маникюр', icon: '💅' },
    }),
    prisma.category.upsert({
      where: { name: 'Педикюр' },
      update: {},
      create: { name: 'Педикюр', icon: '🦶' },
    }),
    prisma.category.upsert({
      where: { name: 'Косметология' },
      update: {},
      create: { name: 'Косметология', icon: '✨' },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  // Создаем админа (telegram_id из env или дефолтный)
  const adminTelegramId = process.env.ADMIN_TELEGRAM_ID 
    ? BigInt(process.env.ADMIN_TELEGRAM_ID) 
    : BigInt(668127354);

  const admin = await prisma.user.upsert({
    where: { telegramId: adminTelegramId },
    update: { role: UserRole.ADMIN },
    create: {
      telegramId: adminTelegramId,
      firstName: 'Администратор',
      role: UserRole.ADMIN,
    },
  });

  console.log(`✅ Admin user created: ${admin.firstName}`);

  // Создаем тестовых мастеров
  const masters = await Promise.all([
    prisma.user.upsert({
      where: { telegramId: BigInt(111111111) },
      update: {},
      create: {
        telegramId: BigInt(111111111),
        firstName: 'Анна',
        lastName: 'Петрова',
        username: 'anna_p',
        role: UserRole.MASTER,
        specialization: 'Стилист-парикмахер',
        rating: 4.9,
      },
    }),
    prisma.user.upsert({
      where: { telegramId: BigInt(222222222) },
      update: {},
      create: {
        telegramId: BigInt(222222222),
        firstName: 'Мария',
        lastName: 'Иванова',
        username: 'maria_i',
        role: UserRole.MASTER,
        specialization: 'Колорист',
        rating: 4.8,
      },
    }),
    prisma.user.upsert({
      where: { telegramId: BigInt(333333333) },
      update: {},
      create: {
        telegramId: BigInt(333333333),
        firstName: 'Елена',
        lastName: 'Сидорова',
        username: 'elena_s',
        role: UserRole.MASTER,
        specialization: 'Мастер маникюра',
        rating: 5.0,
      },
    }),
  ]);

  console.log(`✅ Created ${masters.length} masters`);

  // Создаем услуги
  const [haircuts, coloring, manicure] = categories;

  const services = await Promise.all([
    prisma.service.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: 'Женская стрижка',
        categoryId: haircuts.id,
        price: 2500,
        duration: 60,
      },
    }),
    prisma.service.upsert({
      where: { id: 2 },
      update: {},
      create: {
        name: 'Мужская стрижка',
        categoryId: haircuts.id,
        price: 1500,
        duration: 45,
      },
    }),
    prisma.service.upsert({
      where: { id: 3 },
      update: {},
      create: {
        name: 'Окрашивание волос',
        categoryId: coloring.id,
        price: 4500,
        duration: 120,
      },
    }),
    prisma.service.upsert({
      where: { id: 4 },
      update: {},
      create: {
        name: 'Маникюр классический',
        categoryId: manicure.id,
        price: 1800,
        duration: 60,
      },
    }),
    prisma.service.upsert({
      where: { id: 5 },
      update: {},
      create: {
        name: 'Маникюр с покрытием',
        categoryId: manicure.id,
        price: 2200,
        duration: 90,
      },
    }),
  ]);

  console.log(`✅ Created ${services.length} services`);

  // Создаем расписание мастеров на ближайшую неделю
  const today = new Date();
  const schedulePromises = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);

    // Пропускаем воскресенье
    if (date.getDay() === 0) continue;

    for (const master of masters) {
      schedulePromises.push(
        prisma.schedule.upsert({
          where: {
            masterId_date: {
              masterId: master.id,
              date,
            },
          },
          update: {},
          create: {
            masterId: master.id,
            date,
            startTime: '10:00',
            endTime: '19:00',
          },
        })
      );
    }
  }

  const schedules = await Promise.all(schedulePromises);
  console.log(`✅ Created ${schedules.length} schedule entries`);

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

