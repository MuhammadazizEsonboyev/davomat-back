// =============================================
// utils/geofence.js - Geofencing Yordamchi Funksiyalar
// geolib kutubxonasi yordamida lokatsiya tekshiruvi
// =============================================

const geolib = require('geolib');

// ─── Sex koordinatalari (o'zgartiring!) ──────────────────────────────────────
const WORKSHOP_CONFIG = {
  // Mebel sexingizning haqiqiy koordinatalarini kiriting:
  latitude: 41.2995,   // Toshkent markazi (misol)
  longitude: 69.2401,
  radiusMeters: 50,    // 50 metr radius
  name: "Mebel Sexi"
};

/**
 * Ishchi sex ichida ekanligini tekshiradi
 * @param {number} lat - Ishchi kenglik koordinatasi
 * @param {number} lng - Ishchi uzunlik koordinatasi
 * @returns {object} { isInside, distance, allowed }
 */
function checkGeofence(lat, lng) {
  // Masofa hisoblash (metrda)
  const distance = geolib.getDistance(
    { latitude: lat, longitude: lng },
    { latitude: WORKSHOP_CONFIG.latitude, longitude: WORKSHOP_CONFIG.longitude }
  );

  const isInside = distance <= WORKSHOP_CONFIG.radiusMeters;

  return {
    isInside,
    distance: Math.round(distance),       // Metrda
    maxRadius: WORKSHOP_CONFIG.radiusMeters,
    workshopName: WORKSHOP_CONFIG.name,
    message: isInside
      ? `✅ Sex ichida (${distance}m masofada)`
      : `❌ Sex tashqarisida (${distance}m masofada, ruxsat: ${WORKSHOP_CONFIG.radiusMeters}m)`
  };
}

/**
 * Mock lokatsiyani aniqlash algoritmi
 * Oddiy tekshiruvlar (production'da kuchaytiring)
 * @param {number} lat
 * @param {number} lng
 * @param {number} accuracy - GPS aniqligi (metrda)
 * @returns {object} { isSuspicious, reasons }
 */
function detectMockLocation(lat, lng, accuracy) {
  const reasons = [];

  // 1. Koordinatalar to'liq son bo'lsa - shubhali (mock app ko'pincha 0.0 beradi)
  if (Number.isInteger(lat) || Number.isInteger(lng)) {
    reasons.push('Koordinatalar aniq butun son - shubhali');
  }

  // 2. GPS aniqligi juda yuqori bo'lsa - shubhali (real GPS 3-50m)
  if (accuracy !== undefined && accuracy < 1) {
    reasons.push(`GPS aniqligi juda yuqori (${accuracy}m) - shubhali`);
  }

  // 3. Koordinatalar noto'g'ri chegarada bo'lsa
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    reasons.push('Koordinatalar noto\'g\'ri diapazonda');
  }

  // 4. Koordinatalar (0, 0) bo'lsa - null island
  if (lat === 0 && lng === 0) {
    reasons.push('Null Island koordinatasi - aniq soxta');
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
    riskLevel: reasons.length === 0 ? 'low' : reasons.length === 1 ? 'medium' : 'high'
  };
}

module.exports = { checkGeofence, detectMockLocation, WORKSHOP_CONFIG };
