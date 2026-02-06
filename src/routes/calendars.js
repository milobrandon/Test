const express = require('express');
const router = express.Router();
const store = require('../services/store');

/**
 * GET /api/calendars
 * List all connected calendars.
 */
router.get('/', (req, res) => {
  const calendars = store.getCalendars().map((c) => ({
    id: c.id,
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
 * PUT /api/calendars/:id/default
 * Set a calendar as the default booking target.
 */
router.put('/:id/default', (req, res) => {
  const calendars = store.getCalendars();
  // Clear existing defaults
  for (const cal of calendars) {
    if (cal.isDefault) store.updateCalendar(cal.id, { isDefault: false });
  }
  const updated = store.updateCalendar(req.params.id, { isDefault: true });
  if (!updated) return res.status(404).json({ error: 'Calendar not found' });
  res.json(updated);
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
