const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./src/config');
const errorHandler = require('./src/middleware/error-handler');
const { requireAuth, requireAdmin, requireAccountAccess } = require('./src/middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Public routes (no auth required) ───────────────────────
app.use('/webhooks', require('./src/routes/webhooks'));
app.use('/auth', require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/users'));

// ─── Check if setup is needed ───────────────────────────────
app.get('/api/setup-status', (req, res) => {
  const store = require('./src/services/store');
  const users = store.getUsers();
  res.json({ setupRequired: users.length === 0 });
});

// ─── Protected routes (require auth) ────────────────────────
app.use('/api/accounts', requireAuth, require('./src/routes/accounts'));
app.use('/api/bookings', requireAuth, require('./src/routes/bookings'));
app.use('/api/calendars', requireAuth, require('./src/routes/calendars'));
app.use('/api/call-logs', requireAuth, require('./src/routes/call-logs'));
app.use('/api/settings', requireAuth, requireAdmin, require('./src/routes/settings'));

// ─── Admin stats ────────────────────────────────────────────
app.get('/api/stats', requireAuth, (req, res) => {
  const store = require('./src/services/store');

  // Client users get scoped stats
  if (req.user.role === 'client') {
    const bookings = store.getBookings(req.user.accountId);
    const calendars = store.getCalendars(req.user.accountId);
    const callLogs = store.getCallLogs(req.user.accountId);
    const today = new Date().toISOString().split('T')[0];
    return res.json({
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
      cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
      todayBookings: bookings.filter(b => b.date === today).length,
      voiceBookings: bookings.filter(b => b.source === 'voice_ai').length,
      manualBookings: bookings.filter(b => b.source === 'manual').length,
      connectedCalendars: calendars.length,
      totalCalls: callLogs.length,
    });
  }

  // Admin gets global stats
  const bookings = store.getBookings();
  const calendars = store.getCalendars();
  const accounts = store.getAccounts();
  const users = store.getUsers();
  const callLogs = store.getCallLogs();
  const today = new Date().toISOString().split('T')[0];
  res.json({
    totalAccounts: accounts.length,
    activeAccounts: accounts.filter(a => a.status === 'active').length,
    totalUsers: users.length,
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
    cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
    todayBookings: bookings.filter(b => b.date === today).length,
    voiceBookings: bookings.filter(b => b.source === 'voice_ai').length,
    manualBookings: bookings.filter(b => b.source === 'manual').length,
    connectedCalendars: calendars.length,
    totalCalls: callLogs.length,
  });
});

// ─── SPA fallback ───────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(errorHandler);
app.listen(config.port, () => {
  console.log('\n  Relay Systems — Voice AI Management Platform');
  console.log('  ─────────────────────────────────────────────');
  console.log(`  Dashboard  : http://localhost:${config.port}`);
  console.log(`  API Base   : http://localhost:${config.port}/api`);
  console.log(`  Webhooks   : http://localhost:${config.port}/webhooks/:account-slug\n`);
});
