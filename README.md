# 🪑 Mebel Sexi Ishchilar Nazorat Tizimi

Telegram Mini App — Mebel Sexi uchun ishchilarni nazorat qilish tizimi.

## 📁 Loyiha Strukturasi

```
furniture-app/
├── server/                     # Backend (Node.js + Express)
│   ├── server.js               # Asosiy server fayli
│   ├── package.json
│   ├── routes/
│   │   ├── workers.js          # Ishchilar CRUD API
│   │   ├── attendance.js       # Check-in / Check-out API
│   │   ├── salary.js           # Oylik maosh API
│   │   └── admin.js            # Admin dashboard API
│   ├── middleware/
│   │   └── geofence.js         # GPS + Mock lokatsiya tekshiruvi
│   └── prisma/
│       ├── schema.prisma       # Ma'lumotlar bazasi sxemasi
│       └── seed.js             # Boshlang'ich demo ma'lumotlar
│
└── client/                     # Frontend (React + Vite)
    ├── index.html              # Telegram SDK scripti shu yerda
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── App.jsx             # Asosiy komponent + auth
        ├── main.jsx            # Entry point
        ├── index.css           # Global uslublar
        ├── hooks/
        │   └── useTelegram.js  # Telegram WebApp SDK hook
        ├── utils/
        │   └── api.js          # Barcha API so'rovlari
        └── components/
            ├── worker/
            │   └── WorkerPanel.jsx      # Check-in/Check-out
            └── admin/
                ├── AdminPanel.jsx       # Admin navigatsiya
                ├── AdminDashboard.jsx   # Bugungi statistika
                ├── AttendanceList.jsx   # Davomat ro'yxati
                ├── WorkersList.jsx      # Ishchilar boshqaruvi
                └── SalaryManager.jsx   # Maosh, bonus, jarima
```

---

## 🚀 Ishga Tushirish (localhost)

### 1-qadam: Kerakli dasturlar

```bash
node -v    # Node.js 18+ bo'lishi kerak
npm -v     # npm mavjudligini tekshirish
```

### 2-qadam: Backend o'rnatish

```bash
cd server

# Kutubxonalarni o'rnatish
npm install

# Prisma ORM ni sozlash
npx prisma generate

# SQLite ma'lumotlar bazasini yaratish
npx prisma migrate dev --name init

# Demo ma'lumotlarni qo'shish (ixtiyoriy)
node prisma/seed.js

# Serverni ishga tushirish
npm run dev
```

✅ Server `http://localhost:3001` da ishlaydi

### 3-qadam: Frontend o'rnatish

```bash
# Yangi terminal oching
cd client

# Kutubxonalarni o'rnatish
npm install

# Developement serverni ishga tushirish
npm run dev
```

✅ Frontend `http://localhost:5173` da ochiladi

---

## ⚙️ Muhim Sozlamalar

### Sex Koordinatasini O'zgartirish

`server/middleware/geofence.js` faylini oching:

```js
const WORKSHOP_CONFIG = {
  latitude: 41.2995,   // ← Sexingizning haqiqiy kenglik
  longitude: 69.2401,  // ← Sexingizning haqiqiy uzunlik
  radiusMeters: 50,    // ← Ruxsat etilgan radius (metr)
  name: "Mebel Sexi"
};
```

### Admin Foydalanuvchi

Demo ma'lumotlarda admin telegramId: `123456789`.
Brauzerda ochilganda demo admin sifatida kiriladi.

Haqiqiy Telegram foydalanuvchisini admin qilish uchun:
```bash
# Prisma Studio orqali
npx prisma studio
# Workers jadvalida isAdmin = true qo'yish
```

---

## 📡 API Endpointlar

| Method | URL | Tavsif |
|--------|-----|--------|
| GET | /api/health | Server holati |
| POST | /api/workers | Ishchi yaratish/login |
| GET | /api/workers | Barcha ishchilar |
| GET | /api/workers/:id | Bitta ishchi |
| PATCH | /api/workers/:id | Ishchini tahrirlash |
| DELETE | /api/workers/:id | Ishchini o'chirish |
| POST | /api/attendance/check-in | Keldi (GPS + foto) |
| POST | /api/attendance/check-out | Ketdi |
| GET | /api/attendance/:id/today | Bugungi holat |
| GET | /api/attendance/all | Barcha davomatlar |
| PATCH | /api/attendance/:id/excuse | Sababli qilish |
| GET | /api/salary/:id | Ishchi maoshi |
| GET | /api/salary/all/summary | Barcha maoshlar |
| POST | /api/salary/bonus-fine | Bonus/jarima qo'shish |
| GET | /api/admin/dashboard | Dashboard statistika |

---

## 🤖 Telegram Bot Sozlash

1. [@BotFather](https://t.me/BotFather) ga boring
2. `/newbot` buyrug'ini yuboring
3. Bot nomini kiriting
4. Menu Buttons → `/setmenubutton` → Web App URL kiriting
5. Frontend'ni deploy qiling (Vercel/Netlify) va URL'ni BotFather'ga bering

---

## 🛡️ Xavfsizlik Qo'shimchalari (Production uchun)

1. **JWT token** - har so'rovni telegramInitData bilan tekshirish
2. **Rate limiting** - `express-rate-limit` kutubxonasi
3. **HMAC tekshiruvi** - Telegram initData autentifikatsiya
4. **HTTPS** - faqat xavfsiz ulanishlar
5. **Helmet.js** - HTTP xavfsizlik headerlari

```bash
npm install express-rate-limit helmet crypto
```

---

## 📦 Ishlatilgan Texnologiyalar

**Backend:** Node.js, Express.js, Prisma ORM, SQLite, geolib, Multer  
**Frontend:** React 18, Vite, Telegram WebApp SDK, Axios, React Hot Toast
