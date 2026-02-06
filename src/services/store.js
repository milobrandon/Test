const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * Simple JSON file-backed data store.
 * In production, replace with a proper database.
 */
class Store {
  constructor() {
    this.dataDir = config.dataDir;
    this.ensureDataDir();
  }

  ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  filePath(name) {
    return path.join(this.dataDir, `${name}.json`);
  }

  read(name, defaultValue = []) {
    const fp = this.filePath(name);
    if (!fs.existsSync(fp)) return defaultValue;
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  }

  write(name, data) {
    fs.writeFileSync(this.filePath(name), JSON.stringify(data, null, 2));
  }

  // --- Bookings ---

  getBookings() {
    return this.read('bookings', []);
  }

  getBookingById(id) {
    return this.getBookings().find((b) => b.id === id) || null;
  }

  addBooking(booking) {
    const bookings = this.getBookings();
    bookings.push(booking);
    this.write('bookings', bookings);
    return booking;
  }

  updateBooking(id, updates) {
    const bookings = this.getBookings();
    const idx = bookings.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    bookings[idx] = { ...bookings[idx], ...updates, updatedAt: new Date().toISOString() };
    this.write('bookings', bookings);
    return bookings[idx];
  }

  deleteBooking(id) {
    const bookings = this.getBookings();
    const filtered = bookings.filter((b) => b.id !== id);
    if (filtered.length === bookings.length) return false;
    this.write('bookings', filtered);
    return true;
  }

  // --- Connected calendars ---

  getCalendars() {
    return this.read('calendars', []);
  }

  getCalendarById(id) {
    return this.getCalendars().find((c) => c.id === id) || null;
  }

  addCalendar(calendar) {
    const calendars = this.getCalendars();
    calendars.push(calendar);
    this.write('calendars', calendars);
    return calendar;
  }

  updateCalendar(id, updates) {
    const calendars = this.getCalendars();
    const idx = calendars.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    calendars[idx] = { ...calendars[idx], ...updates };
    this.write('calendars', calendars);
    return calendars[idx];
  }

  removeCalendar(id) {
    const calendars = this.getCalendars();
    const filtered = calendars.filter((c) => c.id !== id);
    if (filtered.length === calendars.length) return false;
    this.write('calendars', filtered);
    return true;
  }

  // --- Settings ---

  getSettings() {
    return this.read('settings', {
      businessName: 'My Business',
      defaultCalendarProvider: 'google',
      defaultCalendarId: '',
      defaultDuration: config.booking.defaultDurationMinutes,
      bufferMinutes: config.booking.bufferMinutes,
      businessHours: config.booking.businessHours,
      enabledProviders: ['google', 'microsoft', 'caldav'],
      enabledServicePlatforms: [],
      notifications: { emailOnBooking: true, emailOnCancellation: true },
    });
  }

  saveSettings(settings) {
    this.write('settings', settings);
    return settings;
  }

  // --- Webhook log ---

  getWebhookLogs() {
    return this.read('webhook_logs', []);
  }

  addWebhookLog(entry) {
    const logs = this.getWebhookLogs();
    logs.unshift(entry); // newest first
    if (logs.length > 200) logs.length = 200; // cap at 200
    this.write('webhook_logs', logs);
  }
}

module.exports = new Store();
