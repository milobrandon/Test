const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const googleCalendar = require('../services/google-calendar');
const outlookService = require('../services/outlook');
const store = require('../services/store');

// ───────────────────────────────
// Google Calendar OAuth
// ───────────────────────────────

router.get('/google', (req, res) => {
  const accountId = req.query.accountId;
  if (!accountId) return res.status(400).json({ error: 'accountId query parameter is required' });

  // Encode accountId into the OAuth state so we can retrieve it in the callback
  const state = `accountId:${accountId}`;
  const url = googleCalendar.getAuthUrl(state);
  res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('Missing authorization code');

    // Extract accountId from state
    const accountId = state && state.startsWith('accountId:') ? state.split(':')[1] : null;
    if (!accountId) return res.status(400).send('Missing accountId in OAuth state');

    const account = store.getAccountById(accountId);
    if (!account) return res.status(404).send('Account not found');

    const tokens = await googleCalendar.getTokens(code);
    const calendars = await googleCalendar.listCalendars(tokens);

    // Store each calendar with the accountId
    for (const cal of calendars) {
      const existing = store.getCalendars(accountId).find(
        (c) => c.provider === 'google' && c.calendarId === cal.id
      );
      if (existing) {
        store.updateCalendar(existing.id, { tokens, name: cal.name });
      } else {
        store.addCalendar({
          id: uuidv4(),
          accountId,
          provider: 'google',
          calendarId: cal.id,
          name: cal.name,
          isDefault: cal.primary,
          timeZone: cal.timeZone,
          color: cal.color,
          tokens,
          connectedAt: new Date().toISOString(),
        });
      }
    }

    res.redirect(`/#account/${accountId}/calendars?connected=google`);
  } catch (err) {
    console.error('Google OAuth error:', err);
    const accountId = req.query.state && req.query.state.startsWith('accountId:')
      ? req.query.state.split(':')[1] : '';
    res.redirect(`/#account/${accountId}/calendars?error=google_auth_failed`);
  }
});

// ───────────────────────────────
// Microsoft Outlook OAuth
// ───────────────────────────────

router.get('/microsoft', (req, res) => {
  const accountId = req.query.accountId;
  if (!accountId) return res.status(400).json({ error: 'accountId query parameter is required' });

  // Encode accountId into the OAuth state
  const state = `accountId:${accountId}`;
  const url = outlookService.getAuthUrl(state);
  res.redirect(url);
});

router.get('/microsoft/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('Missing authorization code');

    // Extract accountId from state
    const accountId = state && state.startsWith('accountId:') ? state.split(':')[1] : null;
    if (!accountId) return res.status(400).send('Missing accountId in OAuth state');

    const account = store.getAccountById(accountId);
    if (!account) return res.status(404).send('Account not found');

    const tokens = await outlookService.getTokens(code);
    const calendars = await outlookService.listCalendars(tokens.access_token);

    for (const cal of calendars) {
      const existing = store.getCalendars(accountId).find(
        (c) => c.provider === 'microsoft' && c.calendarId === cal.id
      );
      if (existing) {
        store.updateCalendar(existing.id, { tokens, name: cal.name });
      } else {
        store.addCalendar({
          id: uuidv4(),
          accountId,
          provider: 'microsoft',
          calendarId: cal.id,
          name: cal.name,
          isDefault: cal.isDefault,
          color: cal.color,
          tokens,
          connectedAt: new Date().toISOString(),
        });
      }
    }

    res.redirect(`/#account/${accountId}/calendars?connected=microsoft`);
  } catch (err) {
    console.error('Microsoft OAuth error:', err);
    const accountId = req.query.state && req.query.state.startsWith('accountId:')
      ? req.query.state.split(':')[1] : '';
    res.redirect(`/#account/${accountId}/calendars?error=microsoft_auth_failed`);
  }
});

// ───────────────────────────────
// CalDAV (Apple / iCloud)
// ───────────────────────────────

router.post('/caldav/connect', async (req, res) => {
  try {
    const { accountId } = req.body;
    if (!accountId) return res.status(400).json({ error: 'accountId is required' });

    const account = store.getAccountById(accountId);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const caldavService = require('../services/caldav');
    const calendars = await caldavService.listCalendars();

    for (const cal of calendars) {
      const existing = store.getCalendars(accountId).find(
        (c) => c.provider === 'caldav' && c.calendarId === cal.id
      );
      if (!existing) {
        store.addCalendar({
          id: uuidv4(),
          accountId,
          provider: 'caldav',
          calendarId: cal.id,
          name: cal.name,
          isDefault: false,
          tokens: null, // credentials are in .env
          connectedAt: new Date().toISOString(),
        });
      }
    }

    res.json({ success: true, calendars });
  } catch (err) {
    console.error('CalDAV connection error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
