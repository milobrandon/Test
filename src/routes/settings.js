const express = require('express');
const router = express.Router();
const store = require('../services/store');
const { listProviders, testAllConnections } = require('../providers');

/**
 * GET /api/settings
 */
router.get('/', (req, res) => {
  res.json(store.getSettings());
});

/**
 * PUT /api/settings
 */
router.put('/', (req, res) => {
  const current = store.getSettings();
  const updated = { ...current, ...req.body };
  store.saveSettings(updated);
  res.json(updated);
});

/**
 * GET /api/settings/providers
 * List service-platform providers and their status.
 */
router.get('/providers', async (req, res) => {
  const providers = await listProviders();
  res.json(providers);
});

/**
 * POST /api/settings/providers/test
 * Test connectivity to all configured service platforms.
 */
router.post('/providers/test', async (req, res) => {
  const results = await testAllConnections();
  res.json(results);
});

/**
 * GET /api/stats
 * Dashboard statistics.
 */
router.get('/stats', (req, res) => {
  const bookings = store.getBookings();
  const calendars = store.getCalendars();
  const today = new Date().toISOString().split('T')[0];

  const stats = {
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter((b) => b.status === 'confirmed').length,
    cancelledBookings: bookings.filter((b) => b.status === 'cancelled').length,
    todayBookings: bookings.filter((b) => b.date === today).length,
    voiceBookings: bookings.filter((b) => b.source === 'synthflow').length,
    manualBookings: bookings.filter((b) => b.source === 'manual').length,
    connectedCalendars: calendars.length,
    calendarProviders: [...new Set(calendars.map((c) => c.provider))],
  };

  res.json(stats);
});

module.exports = router;
