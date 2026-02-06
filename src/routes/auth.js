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
  const state = uuidv4();
  const url = googleCalendar.getAuthUrl(state);
  res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('Missing authorization code');

    const tokens = await googleCalendar.getTokens(code);
    const calendars = await googleCalendar.listCalendars(tokens);

    // Store each calendar
    for (const cal of calendars) {
      const existing = store.getCalendars().find(
        (c) => c.provider === 'google' && c.calendarId === cal.id
      );
      if (existing) {
        store.updateCalendar(existing.id, { tokens, name: cal.name });
      } else {
        store.addCalendar({
          id: uuidv4(),
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

    res.redirect('/#/calendars?connected=google');
  } catch (err) {
    console.error('Google OAuth error:', err);
    res.redirect('/#/calendars?error=google_auth_failed');
  }
});

// ───────────────────────────────
// Microsoft Outlook OAuth
// ───────────────────────────────

router.get('/microsoft', (req, res) => {
  const state = uuidv4();
  const url = outlookService.getAuthUrl(state);
  res.redirect(url);
});

router.get('/microsoft/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('Missing authorization code');

    const tokens = await outlookService.getTokens(code);
    const calendars = await outlookService.listCalendars(tokens.access_token);

    for (const cal of calendars) {
      const existing = store.getCalendars().find(
        (c) => c.provider === 'microsoft' && c.calendarId === cal.id
      );
      if (existing) {
        store.updateCalendar(existing.id, { tokens, name: cal.name });
      } else {
        store.addCalendar({
          id: uuidv4(),
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

    res.redirect('/#/calendars?connected=microsoft');
  } catch (err) {
    console.error('Microsoft OAuth error:', err);
    res.redirect('/#/calendars?error=microsoft_auth_failed');
  }
});

// ───────────────────────────────
// CalDAV (Apple / iCloud)
// ───────────────────────────────

router.post('/caldav/connect', async (req, res) => {
  try {
    const caldavService = require('../services/caldav');
    const calendars = await caldavService.listCalendars();

    for (const cal of calendars) {
      const existing = store.getCalendars().find(
        (c) => c.provider === 'caldav' && c.calendarId === cal.id
      );
      if (!existing) {
        store.addCalendar({
          id: uuidv4(),
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
