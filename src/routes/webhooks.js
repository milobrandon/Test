const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const voiceAiService = require('../services/voice-ai');
const bookingService = require('../services/booking');
const availability = require('../services/availability');
const store = require('../services/store');

/**
 * POST /webhooks/:slug
 * Per-account webhook endpoint — voice AI platform sends call data here
 * when a voice agent completes a call.
 * Creates a call log entry with all configured variables, and attempts
 * a booking if booking-related data was extracted.
 */
router.post('/:slug', async (req, res) => {
  try {
    const account = store.getAccountBySlug(req.params.slug);
    if (!account) {
      return res.status(404).json({ error: 'Account not found for this webhook URL' });
    }
    if (account.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    // Verify webhook authenticity
    const signature = req.headers['x-relay-signature'] || req.headers['x-synthflow-signature'] || req.headers['x-webhook-signature'] || '';
    const rawBody = JSON.stringify(req.body);
    if (voiceAiService.webhookSecret && !voiceAiService.verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Log the raw webhook event
    store.addWebhookLog({
      id: Date.now().toString(),
      accountId: account.id,
      provider: 'voice_ai',
      event: req.body.event || req.body.call_status || 'unknown',
      callId: req.body.call_id,
      timestamp: new Date().toISOString(),
      payload: req.body,
    });

    console.log(`[Account ${account.id}] Webhook received: ${req.body.event || 'call_data'}`);

    const eventType = req.body.event || '';

    // Parse the incoming payload
    const parsed = voiceAiService.parseCallData(req.body);

    // Build the call log entry with account-specific variables
    const settings = store.getAccountSettings(account.id);
    const variableDefs = settings.callVariables || [];
    const callVariables = {};

    for (const def of variableDefs) {
      if (!def.enabled) continue;
      callVariables[def.key] = parsed[def.key] !== undefined ? parsed[def.key] : null;
    }

    // Create the call log
    const callLog = {
      id: uuidv4(),
      accountId: account.id,
      callId: parsed.sourceCallId || req.body.call_id,
      agentId: parsed.agentId,
      callerPhone: parsed.callerPhone,
      variables: callVariables,
      rawPayload: req.body,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    store.addCallLog(callLog);

    // Handle booking events
    if (eventType === 'call.completed' || eventType === 'call.ended' || req.body.extracted_data) {
      const bookingRequest = voiceAiService.parseBookingRequest(req.body);

      if (bookingRequest.customerName || bookingRequest.preferredDate || bookingRequest.serviceType) {
        const result = await bookingService.processVoiceBooking(account.id, bookingRequest);

        return res.json({
          status: result.success ? 'booked' : 'failed',
          booking: result.booking || null,
          callLogId: callLog.id,
          error: result.error || null,
          alternatives: result.alternativeSlots || null,
        });
      }
    }

    res.json({ status: 'received', callLogId: callLog.id, message: 'Call logged' });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Internal processing error' });
  }
});

/**
 * POST /webhooks/:slug/availability
 * Called during a live call to check availability for an account.
 */
router.post('/:slug/availability', async (req, res) => {
  try {
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

    const next = await availability.findNextAvailable(account.id, duration);
    res.json(next || { slots: [], message: 'No availability found' });
  } catch (err) {
    console.error('Availability check error:', err);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

/**
 * GET /webhooks/logs/all
 * Admin view of all webhook logs.
 */
router.get('/logs/all', (req, res) => {
  const logs = store.getWebhookLogs();
  res.json(logs);
});

module.exports = router;
