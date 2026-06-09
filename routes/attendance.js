// =============================================
// routes/attendance.js - Davomat API Marshrutlari
// Check-in / Check-out operatsiyalari
// =============================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { checkGeofence, detectMockLocation } = require('../middleware/geofence');

const prisma = new PrismaClient();

// ─── Selfi Rasmini Saqlash Konfiguratsiyasi ──────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads/selfies');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    // Fayl nomi: workerId_timestamp.jpg
    const unique = `${Date.now()}-${Math.round(Math.random() * 1E6)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Faqat rasm fayllarini qabul qilish
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Faqat rasm fayllari qabul qilinadi'));
  }
});

// ─── POST /api/attendance/check-in ───────────────────────────────────────────
// Ishchi keldi deb belgilash
router.post('/check-in', upload.single('photo'), async (req, res) => {
  try {
    const { telegramId, latitude, longitude, accuracy } = req.body;

    // 1. Ishchini topish
    const worker = await prisma.worker.findUnique({ where: { telegramId } });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Ishchi topilmadi' });
    }

    // 2. Mock lokatsiya tekshiruvi
    const mockCheck = detectMockLocation(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(accuracy)
    );
    if (mockCheck.riskLevel === 'high') {
      return res.status(400).json({
        success: false,
        message: '⚠️ Soxta lokatsiya aniqlandi',
        details: mockCheck.reasons
      });
    }

    // 3. Geofencing tekshiruvi
    const geoCheck = checkGeofence(parseFloat(latitude), parseFloat(longitude));

    // 4. Bugun check-in qilganmi tekshirish
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingRecord = await prisma.attendance.findFirst({
      where: {
        workerId: worker.id,
        date: { gte: today },
        checkInTime: { not: null }
      }
    });
    if (existingRecord) {
      return res.status(400).json({
        success: false,
        message: 'Siz bugun allaqachon check-in qildingiz'
      });
    }

    // 5. Davomat yozuvini yaratish
    const photoPath = req.file ? `/uploads/selfies/${req.file.filename}` : null;

    const attendance = await prisma.attendance.create({
      data: {
        workerId: worker.id,
        checkInTime: new Date(),
        checkInLat: parseFloat(latitude),
        checkInLng: parseFloat(longitude),
        checkInPhoto: photoPath,
        isInsideZone: geoCheck.isInside,
        status: 'present'
      }
    });

    res.json({
      success: true,
      message: geoCheck.isInside
        ? '✅ Check-in muvaffaqiyatli!'
        : `⚠️ Check-in qabul qilindi, lekin siz sex tashqaridasiz (${geoCheck.distance}m)`,
      data: {
        attendanceId: attendance.id,
        checkInTime: attendance.checkInTime,
        isInsideZone: geoCheck.isInside,
        distance: geoCheck.distance,
        workerName: `${worker.firstName} ${worker.lastName}`
      }
    });

  } catch (error) {
    console.error('Check-in xatosi:', error);
    res.status(500).json({ success: false, message: 'Server xatosi', error: error.message });
  }
});

// ─── POST /api/attendance/check-out ──────────────────────────────────────────
// Ishchi ketdi deb belgilash
router.post('/check-out', upload.single('photo'), async (req, res) => {
  try {
    const { telegramId, latitude, longitude } = req.body;

    const worker = await prisma.worker.findUnique({ where: { telegramId } });
    if (!worker) return res.status(404).json({ success: false, message: 'Ishchi topilmadi' });

    // Bugungi check-in yozuvini topish
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const attendance = await prisma.attendance.findFirst({
      where: {
        workerId: worker.id,
        date: { gte: today },
        checkInTime: { not: null },
        checkOutTime: null  // Hali chiqmagan
      }
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'Bugungi check-in topilmadi. Avval check-in qiling.'
      });
    }

    const geoCheck = checkGeofence(parseFloat(latitude), parseFloat(longitude));
    const photoPath = req.file ? `/uploads/selfies/${req.file.filename}` : null;

    // Check-out vaqtini saqlash
    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime: new Date(),
        checkOutLat: parseFloat(latitude),
        checkOutLng: parseFloat(longitude),
        checkOutPhoto: photoPath
      }
    });

    // Ishlash soatlarini hisoblash
    const workHours = (
      (updated.checkOutTime - updated.checkInTime) / (1000 * 60 * 60)
    ).toFixed(2);

    res.json({
      success: true,
      message: '✅ Check-out muvaffaqiyatli! Xayr, yaxshi dam oling!',
      data: {
        checkInTime: updated.checkInTime,
        checkOutTime: updated.checkOutTime,
        workHours: `${workHours} soat`,
        distance: geoCheck.distance
      }
    });

  } catch (error) {
    console.error('Check-out xatosi:', error);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// ─── GET /api/attendance/:telegramId/today ────────────────────────────────────
// Bugungi holat
router.get('/:telegramId/today', async (req, res) => {
  try {
    const worker = await prisma.worker.findUnique({
      where: { telegramId: req.params.telegramId }
    });
    if (!worker) return res.status(404).json({ success: false, message: 'Ishchi topilmadi' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findFirst({
      where: { workerId: worker.id, date: { gte: today } }
    });

    res.json({ success: true, data: attendance || null });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// ─── GET /api/attendance/all ──────────────────────────────────────────────────
// Admin: barcha davomatlar
router.get('/all', async (req, res) => {
  try {
    const { month, year } = req.query;
    const filterDate = new Date(year || new Date().getFullYear(), (month || new Date().getMonth() + 1) - 1, 1);
    const nextMonth = new Date(filterDate.getFullYear(), filterDate.getMonth() + 1, 1);

    const attendances = await prisma.attendance.findMany({
      where: { date: { gte: filterDate, lt: nextMonth } },
      include: { worker: { select: { firstName: true, lastName: true, telegramId: true } } },
      orderBy: { date: 'desc' }
    });

    res.json({ success: true, data: attendances });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

// ─── PATCH /api/attendance/:id/excuse ────────────────────────────────────────
// Admin: sababli qilish
router.patch('/:id/excuse', async (req, res) => {
  try {
    const { note, keepSalary } = req.body;

    const updated = await prisma.attendance.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status: 'excused',
        note: note || 'Sababli'
      }
    });

    res.json({
      success: true,
      message: keepSalary
        ? '✅ Sababli belgilandi, maosh saqlanadi'
        : '✅ Sababli belgilandi, maosh ayiriladi',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
});

module.exports = router;
