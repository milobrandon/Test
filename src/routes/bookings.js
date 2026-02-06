const express = require('express');
const router = express.Router();
const bookingService = require('../services/booking');
const availability = require('../services/availability');
const store = require('../services/store');

/**
 * GET /api/bookings
 * List all bookings, with optional filters.
 */
router.get('/', (req, res) => {
  let bookings = store.getBookings();
  const { status, date, source } = req.query;

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
 */
router.post('/', async (req, res) => {
  try {
    const booking = await bookingService.createManualBooking(req.body);
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

/**
 * GET /api/availability
 * Check available slots for a given date.
 */
router.get('/availability/:date', async (req, res) => {
  try {
    const duration = parseInt(req.query.duration, 10) || undefined;
    const result = await availability.getAvailableSlots(req.params.date, duration);
    res.json(result);
  } catch (err) {
    console.error('Availability error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/availability/next
 * Find the next available slot.
 */
router.get('/availability/next', async (req, res) => {
  try {
    const duration = parseInt(req.query.duration, 10) || undefined;
    const result = await availability.findNextAvailable(duration);
    res.json(result || { message: 'No availability in the next 14 days' });
  } catch (err) {
    console.error('Next-available error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
