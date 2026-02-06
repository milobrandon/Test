const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * Multi-tenant JSON file-backed data store.
 * All bookings, calendars, and settings are scoped by accountId.
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

  // ─── Accounts (sub-accounts for clients) ──────────────────

  getAccounts() {
    return this.read('accounts', []);
  }

  getAccountById(id) {
    return this.getAccounts().find((a) => a.id === id) || null;
  }

  getAccountBySlug(slug) {
    return this.getAccounts().find((a) => a.slug === slug) || null;
  }

  addAccount(account) {
    const accounts = this.getAccounts();
    accounts.push(account);
    this.write('accounts', accounts);
    return account;
  }

  updateAccount(id, updates) {
    const accounts = this.getAccounts();
    const idx = accounts.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    accounts[idx] = { ...accounts[idx], ...updates, updatedAt: new Date().toISOString() };
    this.write('accounts', accounts);
    return accounts[idx];
  }

  deleteAccount(id) {
    const accounts = this.getAccounts();
    const filtered = accounts.filter((a) => a.id !== id);
    if (filtered.length === accounts.length) return false;
    this.write('accounts', filtered);
    // Also clean up related data
    this.write('bookings', this.read('bookings', []).filter((b) => b.accountId !== id));
    this.write('calendars', this.read('calendars', []).filter((c) => c.accountId !== id));
    this.write('webhook_logs', this.read('webhook_logs', []).filter((l) => l.accountId !== id));
    return true;
  }

  // ─── Bookings (scoped by accountId) ───────────────────────

  getBookings(accountId) {
    const all = this.read('bookings', []);
    return accountId ? all.filter((b) => b.accountId === accountId) : all;
  }

  getBookingById(id) {
    return this.read('bookings', []).find((b) => b.id === id) || null;
  }

  addBooking(booking) {
    const bookings = this.read('bookings', []);
    bookings.push(booking);
    this.write('bookings', bookings);
    return booking;
  }

  updateBooking(id, updates) {
    const bookings = this.read('bookings', []);
    const idx = bookings.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    bookings[idx] = { ...bookings[idx], ...updates, updatedAt: new Date().toISOString() };
    this.write('bookings', bookings);
    return bookings[idx];
  }

  deleteBooking(id) {
    const bookings = this.read('bookings', []);
    const filtered = bookings.filter((b) => b.id !== id);
    if (filtered.length === bookings.length) return false;
    this.write('bookings', filtered);
    return true;
  }

  // ─── Connected calendars (scoped by accountId) ────────────

  getCalendars(accountId) {
    const all = this.read('calendars', []);
    return accountId ? all.filter((c) => c.accountId === accountId) : all;
  }

  getCalendarById(id) {
    return this.read('calendars', []).find((c) => c.id === id) || null;
  }

  addCalendar(calendar) {
    const calendars = this.read('calendars', []);
    calendars.push(calendar);
    this.write('calendars', calendars);
    return calendar;
  }

  updateCalendar(id, updates) {
    const calendars = this.read('calendars', []);
    const idx = calendars.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    calendars[idx] = { ...calendars[idx], ...updates };
    this.write('calendars', calendars);
    return calendars[idx];
  }

  removeCalendar(id) {
    const calendars = this.read('calendars', []);
    const filtered = calendars.filter((c) => c.id !== id);
    if (filtered.length === calendars.length) return false;
    this.write('calendars', filtered);
    return true;
  }

  // ─── Per-account settings ─────────────────────────────────

  getAccountSettings(accountId) {
    const all = this.read('account_settings', {});
    return all[accountId] || {
      defaultCalendarProvider: 'google',
      defaultCalendarId: '',
      defaultDuration: config.booking.defaultDurationMinutes,
      bufferMinutes: config.booking.bufferMinutes,
      businessHours: config.booking.businessHours,
      enabledProviders: ['google', 'microsoft', 'caldav'],
      enabledServicePlatforms: [],
      notifications: { emailOnBooking: true, emailOnCancellation: true },
    };
  }

  saveAccountSettings(accountId, settings) {
    const all = this.read('account_settings', {});
    all[accountId] = settings;
    this.write('account_settings', all);
    return settings;
  }

  // ─── Global admin settings ────────────────────────────────

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

  // ─── Webhook log (scoped by accountId) ────────────────────

  getWebhookLogs(accountId) {
    const all = this.read('webhook_logs', []);
    return accountId ? all.filter((l) => l.accountId === accountId) : all;
  }

  addWebhookLog(entry) {
    const logs = this.read('webhook_logs', []);
    logs.unshift(entry);
    if (logs.length > 500) logs.length = 500;
    this.write('webhook_logs', logs);
  }
}

module.exports = new Store();
