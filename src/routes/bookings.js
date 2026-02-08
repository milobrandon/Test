const express = require('express');
const router = express.Router();
const bookingService = require('../services/booking');
const store = require('../services/store');

/**
 * GET /api/bookings
 * Admin view: list all bookings across all accounts.
 * Supports filters: ?accountId=xxx&status=xxx&date=xxx&source=xxx
 */
router.get('/', (req, res) => {
  const { accountId, status, date, source } = req.query;

  let bookings = store.getBookings(accountId || undefined);

  if (status) bookings = bookings.filter((b) => b.status === status);
  if (date) bookings = bookings.filter((b) => b.date === date);
  if (source) bookings = bookings.filter((b) => b.source === source);

  // Sort newest first
  bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(bookings);
});

/**
 * GET /api/bookings/:id
 */
router.get('/:id', (req, res) => {
  const booking = store.getBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json(booking);
});

/**
 * POST /api/bookings
 * Create a manual booking from the dashboard.
 * Requires accountId in the request body.
 */
router.post('/', async (req, res) => {
  try {
    const { accountId } = req.body;
    if (!accountId) return res.status(400).json({ error: 'accountId is required' });

    const account = store.getAccountById(accountId);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const booking = await bookingService.createManualBooking(accountId, req.body);
    res.status(201).json(booking);
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/bookings/:id
 * Update a booking.
 */
router.put('/:id', (req, res) => {
  const updated = store.updateBooking(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Booking not found' });
  res.json(updated);
});

/**
 * POST /api/bookings/:id/cancel
 * Cancel a booking and remove its calendar event.
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const result = await bookingService.cancelBooking(req.params.id);
    if (!result) return res.status(404).json({ error: 'Booking not found' });
    res.json(result);
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
