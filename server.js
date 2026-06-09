// =============================================
// server.js - Asosiy Server Fayli
// Mebel Sexi Ishchilar Nazorat Tizimi
// =============================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

// Route fayllarini import qilish
const workerRoutes = require('./routes/workers');
const attendanceRoutes = require('./routes/attendance');
const salaryRoutes = require('./routes/salary');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────────────────────

// CORS - Frontend bilan muloqot uchun
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// JSON so'rovlarni qabul qilish
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Statik fayllar (selfi rasmlari)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── API Marshrutlari ─────────────────────────────────────────────────────────

app.use('/api/workers', workerRoutes);         // Ishchilar CRUD
app.use('/api/attendance', attendanceRoutes);  // Kelish/ketish
app.use('/api/salary', salaryRoutes);          // Oylik hisob
app.use('/api/admin', adminRoutes);            // Admin paneli

// ─── Sog'liqni tekshirish ─────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server ishlayapti ✅' });
});

// ─── Xato ushlash ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server xatosi:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Server ichki xatosi',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ─── Serverni ishga tushirish ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   Mebel Sexi Nazorat Tizimi          ║
  ║   Server: http://localhost:${PORT}      ║
  ╚══════════════════════════════════════╝
  `);
});

module.exports = app;
