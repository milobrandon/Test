const express = require('express');
const router = express.Router();
const synthflow = require('../services/synthflow');
const bookingService = require('../services/booking');
const store = require('../services/store');

/**
 * POST /webhooks/synthflow
 * Main webhook endpoint — Synthflow sends call data here when a voice
 * agent completes a call that includes a booking intent.
 */
router.post('/synthflow', async (req, res) => {
  try {
    // Verify webhook authenticity
    const signature = req.headers['x-synthflow-signature'] || req.headers['x-webhook-signature'] || '';
    const rawBody = JSON.stringify(req.body);
    if (synthflow.webhookSecret && !synthflow.verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Log the webhook
    store.addWebhookLog({
      id: Date.now().toString(),
      provider: 'synthflow',
      event: req.body.event || req.body.call_status || 'unknown',
      callId: req.body.call_id,
      timestamp: new Date().toISOString(),
      payload: req.body,
    });

    const eventType = req.body.event || '';

    // Handle different Synthflow event types
    if (eventType === 'call.completed' || eventType === 'call.ended' || req.body.extracted_data) {
      const bookingRequest = synthflow.parseBookingRequest(req.body);

      // Only attempt booking if the agent extracted booking-related data
      if (bookingRequest.customerName || bookingRequest.preferredDate || bookingRequest.serviceType) {
        const result = await bookingService.processVoiceBooking(bookingRequest);

        return res.json({
          status: result.success ? 'booked' : 'failed',
          booking: result.booking || null,
          error: result.error || null,
          alternatives: result.alternativeSlots || null,
        });
      }
    }

    // Acknowledge non-booking events
    res.json({ status: 'received', message: 'Event logged' });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Internal processing error' });
  }
});

/**
 * POST /webhooks/synthflow/availability
 * Called by Synthflow during a live call to check availability
 * so the agent can offer slots to the caller in real time.
 */
router.post('/synthflow/availability', async (req, res) => {
  try {
    const { date, duration } = req.body;
    const availability = require('../services/availability');

    if (date) {
      const result = await availability.getAvailableSlots(date, duration);
      return res.json(result);
    }

    // No date specified — find the next available
    const next = await availability.findNextAvailable(duration);
    res.json(next || { slots: [], message: 'No availability found' });
  } catch (err) {
    console.error('Availability check error:', err);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

/**
 * GET /webhooks/logs
 * Dashboard view of recent webhook events.
 */
router.get('/logs', (req, res) => {
  const logs = store.getWebhookLogs();
  res.json(logs);
});

module.exports = router;
