// =============================================
// routes/workers.js - Ishchilar API
// =============================================

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/workers - Barcha ishchilar
router.get('/', async (req, res) => {
  try {
    const workers = await prisma.worker.findMany({
      orderBy: { firstName: 'asc' }
    });
    res.json({ success: true, data: workers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// GET /api/workers/:telegramId - Bitta ishchi
router.get('/:telegramId', async (req, res) => {
  try {
    const worker = await prisma.worker.findUnique({
      where: { telegramId: req.params.telegramId },
      include: {
        attendances: {
          orderBy: { date: 'desc' },
          take: 30  // Oxirgi 30 kun
        }
      }
    });
    if (!worker) return res.status(404).json({ success: false, message: 'Ishchi topilmadi' });
    res.json({ success: true, data: worker });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// POST /api/workers - Yangi ishchi qo'shish / Telegram login
router.post('/', async (req, res) => {
  try {
    const { telegramId, firstName, lastName, phone, baseSalary } = req.body;

    // Upsert - mavjud bo'lsa yangilash, yo'q bo'lsa yaratish
    const worker = await prisma.worker.upsert({
      where: { telegramId },
      update: { firstName, lastName, phone },
      create: {
        telegramId,
        firstName,
        lastName,
        phone,
        baseSalary: baseSalary || 500000
      }
    });

    res.json({
      success: true,
      message: 'Ishchi muvaffaqiyatli saqlandi',
      data: worker
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi', error: error.message });
  }
});

// PATCH /api/workers/:id - Ishchini tahrirlash (admin)
router.patch('/:id', async (req, res) => {
  try {
    const { baseSalary, isAdmin } = req.body;
    const updated = await prisma.worker.update({
      where: { id: parseInt(req.params.id) },
      data: { baseSalary, isAdmin }
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// DELETE /api/workers/:id - Ishchini o'chirish
router.delete('/:id', async (req, res) => {
  try {
    await prisma.worker.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: "Ishchi o'chirildi" });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

module.exports = router;
