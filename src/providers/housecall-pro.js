const BaseProvider = require('./base-provider');
const fetch = require('node-fetch');

/**
 * Housecall Pro integration provider.
 * Docs: https://docs.housecallpro.com
 */
class HousecallProProvider extends BaseProvider {
  constructor(cfg) {
    super('Housecall Pro', cfg);
    this.baseUrl = cfg.baseUrl || 'https://api.housecallpro.com';
    this.apiKey = cfg.apiKey || '';
  }

  headers() {
    return {
      Authorization: `Token ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async testConnection() {
    try {
      const res = await fetch(`${this.baseUrl}/company`, { headers: this.headers() });
      this.connected = res.ok;
      return { connected: res.ok };
    } catch (err) {
      this.connected = false;
      return { connected: false, error: err.message };
    }
  }

  async createJob(booking) {
    const jobData = {
      customer_id: booking.servicePlatformCustomerId || null,
      scheduled_start: booking.startTime,
      scheduled_end: booking.endTime,
      description: `${booking.serviceType} — ${booking.customerName}\n${booking.notes || ''}`,
      address: booking.address || '',
      tags: ['synthflow-booking'],
    };

    const res = await fetch(`${this.baseUrl}/jobs`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(jobData),
    });
    if (!res.ok) throw new Error(`Housecall Pro createJob failed: ${res.status}`);
    return res.json();
  }

  async findCustomer(query) {
    const params = new URLSearchParams();
    if (query.phone) params.set('phone_number', query.phone);
    if (query.email) params.set('email', query.email);

    const res = await fetch(`${this.baseUrl}/customers?${params}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`Housecall Pro findCustomer failed: ${res.status}`);
    return res.json();
  }

  async createCustomer(data) {
    const res = await fetch(`${this.baseUrl}/customers`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        first_name: data.customerName.split(' ')[0],
        last_name: data.customerName.split(' ').slice(1).join(' ') || '',
        email: data.customerEmail || '',
        mobile_number: data.customerPhone || '',
        address: { street: data.address || '' },
      }),
    });
    if (!res.ok) throw new Error(`Housecall Pro createCustomer failed: ${res.status}`);
    return res.json();
  }

  async cancelJob(jobId) {
    const res = await fetch(`${this.baseUrl}/jobs/${jobId}/cancel`, {
      method: 'PUT',
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`Housecall Pro cancelJob failed: ${res.status}`);
    return res.json();
  }
}

module.exports = HousecallProProvider;
