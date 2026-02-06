const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./src/config');
const errorHandler = require('./src/middleware/error-handler');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/webhooks', require('./src/routes/webhooks'));
app.use('/auth', require('./src/routes/auth'));
app.use('/api/accounts', require('./src/routes/accounts'));
app.use('/api/bookings', require('./src/routes/bookings'));
app.use('/api/calendars', require('./src/routes/calendars'));
app.use('/api/settings', require('./src/routes/settings'));

// Admin stats shortcut
app.get('/api/stats', (req, res) => {
  const store = require('./src/services/store');
  const bookings = store.getBookings();
  const calendars = store.getCalendars();
  const accounts = store.getAccounts();
  const today = new Date().toISOString().split('T')[0];
  res.json({
    totalAccounts: accounts.length,
    activeAccounts: accounts.filter(a => a.status === 'active').length,
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
    cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
    todayBookings: bookings.filter(b => b.date === today).length,
    voiceBookings: bookings.filter(b => b.source === 'synthflow').length,
    manualBookings: bookings.filter(b => b.source === 'manual').length,
    connectedCalendars: calendars.length,
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(errorHandler);
app.listen(config.port, () => {
  console.log('\n  Synthflow Calendar Booking (Multi-Tenant)');
  console.log('  ──────────────────────────────────────────');
  console.log(`  Admin Dashboard : http://localhost:${config.port}`);
  console.log(`  API Base        : http://localhost:${config.port}/api`);
  console.log(`  Webhooks        : http://localhost:${config.port}/webhooks/:account-slug\n`);
});
