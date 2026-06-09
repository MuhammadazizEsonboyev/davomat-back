// =============================================
// prisma/seed.js - Boshlang'ich ma'lumotlar
// =============================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Boshlang\'ich ma\'lumotlar qo\'shilmoqda...');

  // Admin yaratish
  const admin = await prisma.worker.upsert({
    where: { telegramId: '123456789' },
    update: {},
    create: {
      telegramId: '123456789',
      firstName: 'Admin',
      lastName: 'Rahimov',
      phone: '+998901234567',
      isAdmin: true,
      baseSalary: 1000000
    }
  });

  // Demo ishchilar
  const workers = [
    { telegramId: '111111111', firstName: 'Sardor', lastName: 'Toshmatov', baseSalary: 600000 },
    { telegramId: '222222222', firstName: 'Jasur', lastName: 'Yusupov', baseSalary: 550000 },
    { telegramId: '333333333', firstName: 'Dilnoza', lastName: 'Karimova', baseSalary: 500000 },
  ];

  for (const w of workers) {
    await prisma.worker.upsert({
      where: { telegramId: w.telegramId },
      update: {},
      create: w
    });
  }

  console.log('✅ Demo ma\'lumotlar qo\'shildi!');
  console.log('👤 Admin telegramId: 123456789');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
