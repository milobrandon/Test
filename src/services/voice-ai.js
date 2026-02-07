const crypto = require('crypto');
const config = require('../config');

/**
 * Voice AI service — handles webhook verification, payload parsing,
 * and API communication with the voice AI platform (e.g., Synthflow).
 * Abstracted so the platform can be swapped without touching other code.
 */
class VoiceAiService {
  constructor() {
    this.apiKey = config.voiceAi.apiKey;
    this.baseUrl = config.voiceAi.baseUrl;
    this.webhookSecret = config.voiceAi.webhookSecret;
  }

  /**
   * Verify that an incoming webhook request is authentic.
   */
  verifyWebhookSignature(payload, signature) {
    if (!this.webhookSecret) return true;
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
      .digest('hex');
    if (expected.length !== (signature || '').length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ''));
  }

  /**
   * Parse raw webhook payload into a flat map of all known call variables.
   * This is used by the webhook handler to populate the call log variables
   * based on each account's configured variable definitions.
   */
  parseCallData(payload) {
    const {
      call_id,
      agent_id,
      caller_number,
      call_type,
      transcript,
      extracted_data,
      call_status,
      call_duration,
      recording_url,
      call_summary,
      call_outcome,
      sentiment,
    } = payload;

    const data = extracted_data || {};

    return {
      sourceCallId: call_id,
      agentId: agent_id,
      callerPhone: caller_number,

      // Standard call variables
      call_outcome: call_outcome || data.call_outcome || call_status || null,
      call_summary: call_summary || data.call_summary || data.summary || null,
      transcript: transcript || data.transcript || null,
      caller_sentiment: sentiment || data.sentiment || data.caller_sentiment || null,
      call_duration: call_duration || data.call_duration || null,
      recording_url: recording_url || data.recording_url || null,
      agent_id: agent_id || null,
      call_type: call_type || data.call_type || 'Inbound',
      service_requested: data.service_type || data.service || data.service_requested || null,
      follow_up_required: data.follow_up_required || data.follow_up || false,
    };
  }

  /**
   * Parse a webhook payload into a normalized booking request.
   */
  parseBookingRequest(payload) {
    const {
      call_id,
      agent_id,
      caller_number,
      call_type,
      transcript,
      extracted_data,
      call_status,
      call_duration,
      recording_url,
    } = payload;

    const data = extracted_data || {};

    return {
      sourceCallId: call_id,
      agentId: agent_id,
      callerPhone: caller_number,
      callType: call_type || 'inbound',
      callStatus: call_status,
      callDuration: call_duration,
      recordingUrl: recording_url,
      transcript: transcript,

      customerName: data.customer_name || data.name || '',
      customerEmail: data.customer_email || data.email || '',
      customerPhone: data.customer_phone || caller_number || '',
      serviceType: data.service_type || data.service || '',
      preferredDate: data.preferred_date || data.date || '',
      preferredTime: data.preferred_time || data.time || '',
      duration: data.duration || null,
      notes: data.notes || data.special_requests || '',
      address: data.address || data.service_address || '',
      urgency: data.urgency || 'normal',
    };
  }

  /**
   * List configured voice agents from the AI platform.
   */
  async listAgents() {
    const fetch = require('node-fetch');
    const res = await fetch(`${this.baseUrl}/agents`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Voice AI API error: ${res.status}`);
    return res.json();
  }

  /**
   * Retrieve details of a specific call.
   */
  async getCallDetails(callId) {
    const fetch = require('node-fetch');
    const res = await fetch(`${this.baseUrl}/calls/${callId}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Voice AI API error: ${res.status}`);
    return res.json();
  }

  /**
   * Send a booking confirmation back to the voice AI platform.
   */
  async sendBookingConfirmation(callId, bookingDetails) {
    const fetch = require('node-fetch');
    const res = await fetch(`${this.baseUrl}/calls/${callId}/actions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'booking_confirmed',
        data: {
          booking_id: bookingDetails.id,
          date: bookingDetails.date,
          time: bookingDetails.startTime,
          duration: bookingDetails.duration,
          service: bookingDetails.serviceType,
          provider: bookingDetails.calendarProvider,
          confirmation_message: `Your appointment is confirmed for ${bookingDetails.date} at ${bookingDetails.startTime}.`,
        },
      }),
    });
    if (!res.ok) {
      console.error(`Failed to send confirmation to voice AI platform: ${res.status}`);
    }
    return res.ok;
  }
}

module.exports = new VoiceAiService();
