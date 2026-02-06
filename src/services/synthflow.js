const crypto = require('crypto');
const config = require('../config');

class SynthflowService {
  constructor() {
    this.apiKey = config.synthflow.apiKey;
    this.baseUrl = config.synthflow.baseUrl;
    this.webhookSecret = config.synthflow.webhookSecret;
  }

  /**
   * Verify that an incoming webhook request is genuinely from Synthflow.
   */
  verifyWebhookSignature(payload, signature) {
    if (!this.webhookSecret) return true; // skip if no secret configured
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ''));
  }

  /**
   * Parse a Synthflow webhook payload into a normalized booking request.
   * Synthflow sends call transcript data and extracted entities.
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

      // Booking details extracted by the voice agent
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
   * Call Synthflow API to list configured agents.
   */
  async listAgents() {
    const fetch = require('node-fetch');
    const res = await fetch(`${this.baseUrl}/agents`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Synthflow API error: ${res.status}`);
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
    if (!res.ok) throw new Error(`Synthflow API error: ${res.status}`);
    return res.json();
  }

  /**
   * Send a booking confirmation back to Synthflow so the agent can
   * relay it to the caller or trigger a follow-up action.
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
      console.error(`Failed to send confirmation to Synthflow: ${res.status}`);
    }
    return res.ok;
  }
}

module.exports = new SynthflowService();
