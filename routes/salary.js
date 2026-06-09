// =============================================
// routes/salary.js - Oylik Hisob API
// Maosh, bonus, jarima hisoblash
// =============================================

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Ishchining oylik maoshini hisoblash
 * @param {number} workerId
 * @param {number} month - 1-12
 * @param {number} year
 */
async function calculateMonthlySalary(workerId, month, year) {
  const worker = await prisma.worker.findUnique({ where: { id: workerId } });
  if (!worker) throw new Error('Ishchi topilmadi');

  // Oyning boshlanish va tugash sanasi
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59); // Oyning oxiri

  // O'sha oydagi barcha davomatlarni olish
  const attendances = await prisma.attendance.findMany({
    where: {
      workerId,
      date: { gte: startDate, lte: endDate }
    }
  });

  const daysWorked = attendances.filter(a => a.status === 'present').length;
  const daysAbsent = attendances.filter(a => a.status === 'absent').length;
  const daysExcused = attendances.filter(a => a.status === 'excused').length;

  // Ish kunlari soni (oyda taxminan 22-26 kun)
  const totalWorkDays = 26;

  // Bir kunlik maosh
  const dailyRate = worker.baseSalary / totalWorkDays;

  // Sababsiz qolgan kunlar uchun ushlab qolish
  const deductions = dailyRate * daysAbsent;

  // Mavjud salary yozuvini olish (bonus/jarima uchun)
  const existingSalary = await prisma.salary.findUnique({
    where: { workerId_month_year: { workerId, month, year } }
  });

  const bonus = existingSalary?.bonus || 0;
  const fine = existingSalary?.fine || 0;
  const totalSalary = worker.baseSalary + bonus - fine - deductions;

  return {
    workerId,
    workerName: `${worker.firstName} ${worker.lastName}`,
    baseSalary: worker.baseSalary,
    daysWorked,
    daysAbsent,
    daysExcused,
    dailyRate: Math.round(dailyRate),
    deductions: Math.round(deductions),
    bonus,
    fine,
    totalSalary: Math.max(0, Math.round(totalSalary)), // Manfiy bo'lmasin
    month,
    year
  };
}

// ─── GET /api/salary/:workerId?month=&year= ───────────────────────────────────
// Ishchining oylik hisobi
router.get('/:workerId', async (req, res) => {
  try {
    const workerId = parseInt(req.params.workerId);
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const salaryData = await calculateMonthlySalary(workerId, month, year);
    res.json({ success: true, data: salaryData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/salary/all?month=&year= ────────────────────────────────────────
// Admin: barcha ishchilarning oylik hisobi
router.get('/all/summary', async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const workers = await prisma.worker.findMany();
    const salaries = await Promise.all(
      workers.map(w => calculateMonthlySalary(w.id, month, year))
    );

    const totalPayroll = salaries.reduce((sum, s) => sum + s.totalSalary, 0);

    res.json({
      success: true,
      data: salaries,
      summary: {
        totalWorkers: workers.length,
        totalPayroll: Math.round(totalPayroll),
        month,
        year
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/salary/bonus-fine ─────────────────────────────────────────────
// Admin: bonus yoki jarima qo'shish
router.post('/bonus-fine', async (req, res) => {
  try {
    const { workerId, month, year, bonus, fine, notes } = req.body;

    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    if (!worker) return res.status(404).json({ success: false, message: 'Ishchi topilmadi' });

    // Salary yozuvini yangilash yoki yaratish
    const salaryData = await calculateMonthlySalary(workerId, month, year);
    const totalSalary = salaryData.baseSalary
      + (bonus || 0)
      - (fine || 0)
      - salaryData.deductions;

    const salary = await prisma.salary.upsert({
      where: { workerId_month_year: { workerId, month, year } },
      update: {
        bonus: bonus || 0,
        fine: fine || 0,
        totalSalary: Math.max(0, Math.round(totalSalary)),
        notes,
        updatedAt: new Date()
      },
      create: {
        workerId,
        month,
        year,
        baseSalary: salaryData.baseSalary,
        bonus: bonus || 0,
        fine: fine || 0,
        deductions: salaryData.deductions,
        totalSalary: Math.max(0, Math.round(totalSalary)),
        daysWorked: salaryData.daysWorked,
        daysAbsent: salaryData.daysAbsent,
        daysExcused: salaryData.daysExcused,
        notes
      }
    });

    res.json({
      success: true,
      message: '✅ Bonus/jarima saqlandi',
      data: { ...salary, workerName: `${worker.firstName} ${worker.lastName}` }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PATCH /api/salary/:id/pay ────────────────────────────────────────────────
// Maosh to'langan deb belgilash
router.patch('/:id/pay', async (req, res) => {
  try {
    const updated = await prisma.salary.update({
      where: { id: parseInt(req.params.id) },
      data: { isPaid: true }
    });
    res.json({ success: true, message: "✅ Maosh to'langan deb belgilandi", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

module.exports = router;
