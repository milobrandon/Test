const express = require('express');
const router = express.Router();
const store = require('../services/store');

/**
 * GET /api/calendars
 * List connected calendars. Supports ?accountId=xxx filter.
 */
router.get('/', (req, res) => {
  const { accountId } = req.query;
  const calendars = store.getCalendars(accountId || undefined).map((c) => ({
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
 * DELETE /api/calendars/:id
 * Disconnect a calendar.
 */
router.delete('/:id', (req, res) => {
  const removed = store.removeCalendar(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Calendar not found' });
  res.json({ message: 'Calendar disconnected' });
});

module.exports = router;
