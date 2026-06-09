// =============================================
// routes/admin.js - Admin Panel API
// =============================================

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/admin/dashboard - Umumiy statistika
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalWorkers, todayPresent, todayAbsent] = await Promise.all([
      prisma.worker.count(),
      prisma.attendance.count({
        where: { date: { gte: today }, status: 'present' }
      }),
      prisma.attendance.count({
        where: { date: { gte: today }, status: 'absent' }
      })
    ]);

    const recentAttendances = await prisma.attendance.findMany({
      where: { date: { gte: today } },
      include: { worker: { select: { firstName: true, lastName: true } } },
      orderBy: { checkInTime: 'desc' }
    });

    res.json({
      success: true,
      data: {
        totalWorkers,
        todayPresent,
        todayAbsent,
        todayNotChecked: totalWorkers - todayPresent - todayAbsent,
        recentAttendances
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

module.exports = router;
