const express = require('express');
const router = express.Router();
const synthflow = require('../services/synthflow');
const bookingService = require('../services/booking');
const availability = require('../services/availability');
const store = require('../services/store');

/**
 * POST /webhooks/:slug
 * Per-account webhook endpoint — Synthflow sends call data here when a voice
 * agent completes a call that includes a booking intent.
 * The slug identifies which sub-account this webhook belongs to.
 */
router.post('/:slug', async (req, res) => {
  try {
    // Look up the account by slug
    const account = store.getAccountBySlug(req.params.slug);
    if (!account) {
      return res.status(404).json({ error: 'Account not found for this webhook URL' });
    }

    if (account.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    // Verify webhook authenticity
    const signature = req.headers['x-synthflow-signature'] || req.headers['x-webhook-signature'] || '';
    const rawBody = JSON.stringify(req.body);
    if (synthflow.webhookSecret && !synthflow.verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Log the webhook with accountId
    store.addWebhookLog({
      id: Date.now().toString(),
      accountId: account.id,
      provider: 'synthflow',
      event: req.body.event || req.body.call_status || 'unknown',
      callId: req.body.call_id,
      timestamp: new Date().toISOString(),
      payload: req.body,
    });

    console.log(`[Account ${account.id}] Webhook received: ${req.body.event || 'call_data'}`);

    const eventType = req.body.event || '';

    // Handle different Synthflow event types
    if (eventType === 'call.completed' || eventType === 'call.ended' || req.body.extracted_data) {
      const bookingRequest = synthflow.parseBookingRequest(req.body);

      // Only attempt booking if the agent extracted booking-related data
      if (bookingRequest.customerName || bookingRequest.preferredDate || bookingRequest.serviceType) {
        const result = await bookingService.processVoiceBooking(account.id, bookingRequest);

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
 * POST /webhooks/:slug/availability
 * Called by Synthflow during a live call to check availability for an account
 * so the agent can offer slots to the caller in real time.
 */
router.post('/:slug/availability', async (req, res) => {
  try {
    // Look up the account by slug
    const account = store.getAccountBySlug(req.params.slug);
    if (!account) {
      return res.status(404).json({ error: 'Account not found for this webhook URL' });
    }

    if (account.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    console.log(`[Account ${account.id}] Availability check requested`);

    const { date, duration } = req.body;

    if (date) {
      const result = await availability.getAvailableSlots(account.id, date, duration);
      return res.json(result);
    }

    // No date specified — find the next available
    const next = await availability.findNextAvailable(account.id, duration);
    res.json(next || { slots: [], message: 'No availability found' });
  } catch (err) {
    console.error('Availability check error:', err);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

/**
 * GET /webhooks/logs/all
 * Admin view of all webhook logs across all accounts.
 */
router.get('/logs/all', (req, res) => {
  const logs = store.getWebhookLogs();
  res.json(logs);
});

module.exports = router;
