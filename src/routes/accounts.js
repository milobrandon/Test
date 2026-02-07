const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const store = require('../services/store');
const config = require('../config');

/**
 * GET /api/accounts
 * List all sub-accounts (admin view) with booking and calendar counts.
 */
router.get('/', (req, res) => {
  const accounts = store.getAccounts().map((a) => {
    const bookings = store.getBookings(a.id);
    const calendars = store.getCalendars(a.id);
    return {
      ...a,
      bookingCount: bookings.length,
      confirmedBookings: bookings.filter((b) => b.status === 'confirmed').length,
      calendarCount: calendars.length,
    };
  });
  res.json(accounts);
});

/**
 * GET /api/accounts/:id
 * Get a single account with counts.
 */
router.get('/:id', (req, res) => {
  const account = store.getAccountById(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  const bookings = store.getBookings(account.id);
  const calendars = store.getCalendars(account.id);
  res.json({
    ...account,
    bookingCount: bookings.length,
    calendarCount: calendars.length,
  });
});

/**
 * POST /api/accounts
 * Create a new sub-account.
 * Fields: name, contactName, contactEmail, contactPhone, voiceAgentId, notes
 * Generates: slug, webhookUrl
 */
router.post('/', (req, res) => {
  const { name, contactName, contactEmail, contactPhone, voiceAgentId, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Account name is required' });

  // Generate a URL-safe slug for webhook routing
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    + '-' + uuidv4().slice(0, 6);

  const account = {
    id: uuidv4(),
    slug,
    name,
    contactName: contactName || '',
    contactEmail: contactEmail || '',
    contactPhone: contactPhone || '',
    voiceAgentId: voiceAgentId || '',
    notes: notes || '',
    status: 'active',
    webhookUrl: `${config.appUrl}/webhooks/${slug}`,
    webhookAvailabilityUrl: `${config.appUrl}/webhooks/${slug}/availability`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.addAccount(account);
  res.status(201).json(account);
});

/**
 * PUT /api/accounts/:id
 * Update an existing sub-account.
 */
router.put('/:id', (req, res) => {
  const { name, contactName, contactEmail, contactPhone, voiceAgentId, notes, status } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (contactName !== undefined) updates.contactName = contactName;
  if (contactEmail !== undefined) updates.contactEmail = contactEmail;
  if (contactPhone !== undefined) updates.contactPhone = contactPhone;
  if (voiceAgentId !== undefined) updates.voiceAgentId = voiceAgentId;
  if (notes !== undefined) updates.notes = notes;
  if (status !== undefined) updates.status = status;

  const updated = store.updateAccount(req.params.id, updates);
  if (!updated) return res.status(404).json({ error: 'Account not found' });
  res.json(updated);
});

/**
 * DELETE /api/accounts/:id
 * Delete an account and all related data (bookings, calendars, webhook logs).
 */
router.delete('/:id', (req, res) => {
  const removed = store.deleteAccount(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Account not found' });
  res.json({ message: 'Account and all related data deleted' });
});

/**
 * GET /api/accounts/:id/stats
 * Per-account statistics.
 */
router.get('/:id/stats', (req, res) => {
  const account = store.getAccountById(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const bookings = store.getBookings(account.id);
  const calendars = store.getCalendars(account.id);
  const today = new Date().toISOString().split('T')[0];

  res.json({
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter((b) => b.status === 'confirmed').length,
    cancelledBookings: bookings.filter((b) => b.status === 'cancelled').length,
    todayBookings: bookings.filter((b) => b.date === today).length,
    voiceBookings: bookings.filter((b) => b.source === 'voice_ai').length,
    manualBookings: bookings.filter((b) => b.source === 'manual').length,
    connectedCalendars: calendars.length,
    calendarProviders: [...new Set(calendars.map((c) => c.provider))],
  });
});

/**
 * GET /api/accounts/:id/settings
 * Get per-account settings.
 */
router.get('/:id/settings', (req, res) => {
  const account = store.getAccountById(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  res.json(store.getAccountSettings(account.id));
});

/**
 * PUT /api/accounts/:id/settings
 * Update per-account settings.
 */
router.put('/:id/settings', (req, res) => {
  const account = store.getAccountById(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  const current = store.getAccountSettings(account.id);
  const updated = { ...current, ...req.body };
  store.saveAccountSettings(account.id, updated);
  res.json(updated);
});

/**
 * GET /api/accounts/:id/bookings
 * List bookings for a specific account with optional filters.
 */
router.get('/:id/bookings', (req, res) => {
  const account = store.getAccountById(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  let bookings = store.getBookings(account.id);
  const { status, date, source } = req.query;
  if (status) bookings = bookings.filter((b) => b.status === status);
  if (date) bookings = bookings.filter((b) => b.date === date);
  if (source) bookings = bookings.filter((b) => b.source === source);
  bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(bookings);
});

/**
 * GET /api/accounts/:id/calendars
 * List connected calendars for a specific account.
 */
router.get('/:id/calendars', (req, res) => {
  const account = store.getAccountById(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  const calendars = store.getCalendars(account.id).map((c) => ({
    id: c.id,
    accountId: c.accountId,
    provider: c.provider,
    calendarId: c.calendarId,
    name: c.name,
    isDefault: c.isDefault,
    timeZone: c.timeZone,
    color: c.color,
    connectedAt: c.connectedAt,
  }));
  res.json(calendars);
});

/**
 * PUT /api/accounts/:accountId/calendars/:calId/default
 * Set a calendar as the default for an account.
 */
router.put('/:accountId/calendars/:calId/default', (req, res) => {
  const account = store.getAccountById(req.params.accountId);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  const calendars = store.getCalendars(account.id);
  for (const cal of calendars) {
    if (cal.isDefault) store.updateCalendar(cal.id, { isDefault: false });
  }
  const updated = store.updateCalendar(req.params.calId, { isDefault: true });
  if (!updated) return res.status(404).json({ error: 'Calendar not found' });
  res.json(updated);
});

/**
 * DELETE /api/accounts/:accountId/calendars/:calId
 * Disconnect a calendar from an account.
 */
router.delete('/:accountId/calendars/:calId', (req, res) => {
  const removed = store.removeCalendar(req.params.calId);
  if (!removed) return res.status(404).json({ error: 'Calendar not found' });
  res.json({ message: 'Calendar disconnected' });
});

/**
 * GET /api/accounts/:id/webhook-logs
 * Webhook logs for a specific account.
 */
router.get('/:id/webhook-logs', (req, res) => {
  const account = store.getAccountById(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  res.json(store.getWebhookLogs(account.id));
});

module.exports = router;
