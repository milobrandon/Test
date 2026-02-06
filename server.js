const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./src/config');
const errorHandler = require('./src/middleware/error-handler');

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ─────────────────────────────────────────────
app.use('/webhooks', require('./src/routes/webhooks'));
app.use('/auth', require('./src/routes/auth'));
app.use('/api/bookings', require('./src/routes/bookings'));
app.use('/api/calendars', require('./src/routes/calendars'));
app.use('/api/settings', require('./src/routes/settings'));

// Stats shortcut
app.get('/api/stats', (req, res) => {
  const store = require('./src/services/store');
  const bookings = store.getBookings();
  const calendars = store.getCalendars();
  const today = new Date().toISOString().split('T')[0];

  res.json({
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter((b) => b.status === 'confirmed').length,
    cancelledBookings: bookings.filter((b) => b.status === 'cancelled').length,
    todayBookings: bookings.filter((b) => b.date === today).length,
    voiceBookings: bookings.filter((b) => b.source === 'synthflow').length,
    manualBookings: bookings.filter((b) => b.source === 'manual').length,
    connectedCalendars: calendars.length,
    calendarProviders: [...new Set(calendars.map((c) => c.provider))],
  });
});

// Webhook URL helper — shows the URL to paste into Synthflow
app.get('/api/webhook-url', (req, res) => {
  const base = config.appUrl;
  res.json({
    booking: `${base}/webhooks/synthflow`,
    availability: `${base}/webhooks/synthflow/availability`,
    instructions: 'Paste these URLs into your Synthflow agent\'s webhook configuration.',
  });
});

// ── SPA fallback ───────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Error handler ──────────────────────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`\n  Synthflow Calendar Booking`);
  console.log(`  ─────────────────────────`);
  console.log(`  Dashboard   : http://localhost:${config.port}`);
  console.log(`  Webhook URL : http://localhost:${config.port}/webhooks/synthflow`);
  console.log(`  API Base    : http://localhost:${config.port}/api\n`);
});
