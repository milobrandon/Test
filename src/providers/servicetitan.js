const BaseProvider = require('./base-provider');
const fetch = require('node-fetch');

/**
 * ServiceTitan integration provider.
 * Docs: https://developer.servicetitan.io
 *
 * This is a scaffold — fill in your ServiceTitan App Key and Tenant ID
 * in .env, then implement the methods against their REST API.
 */
class ServiceTitanProvider extends BaseProvider {
  constructor(cfg) {
    super('ServiceTitan', cfg);
    this.baseUrl = cfg.baseUrl || 'https://api.servicetitan.io';
    this.appKey = cfg.appKey || '';
    this.tenantId = cfg.tenantId || '';
    this.accessToken = null;
  }

  async authenticate() {
    const res = await fetch(`${this.baseUrl}/connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.appKey,
        client_secret: this.config.clientSecret || '',
      }),
    });
    if (!res.ok) throw new Error(`ServiceTitan auth failed: ${res.status}`);
    const data = await res.json();
    this.accessToken = data.access_token;
    return data;
  }

  headers() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'ST-App-Key': this.appKey,
      'Content-Type': 'application/json',
    };
  }

  async testConnection() {
    try {
      await this.authenticate();
      this.connected = true;
      return { connected: true };
    } catch (err) {
      this.connected = false;
      return { connected: false, error: err.message };
    }
  }

  async createJob(booking) {
    if (!this.accessToken) await this.authenticate();

    const jobData = {
      customerId: booking.servicePlatformCustomerId || null,
      typeId: null, // map serviceType to a ServiceTitan job type
      summary: `${booking.serviceType} — ${booking.customerName}`,
      start: booking.startTime,
      end: booking.endTime,
      priority: booking.urgency === 'urgent' ? 'Urgent' : 'Normal',
      location: { street: booking.address || '' },
    };

    const res = await fetch(
      `${this.baseUrl}/jpm/v2/tenant/${this.tenantId}/jobs`,
      { method: 'POST', headers: this.headers(), body: JSON.stringify(jobData) }
    );
    if (!res.ok) throw new Error(`ServiceTitan createJob failed: ${res.status}`);
    return res.json();
  }

  async findCustomer(query) {
    if (!this.accessToken) await this.authenticate();
    const params = new URLSearchParams({ name: query.name || '', phone: query.phone || '' });
    const res = await fetch(
      `${this.baseUrl}/crm/v2/tenant/${this.tenantId}/customers?${params}`,
      { headers: this.headers() }
    );
    if (!res.ok) throw new Error(`ServiceTitan findCustomer failed: ${res.status}`);
    return res.json();
  }

  async createCustomer(data) {
    if (!this.accessToken) await this.authenticate();
    const res = await fetch(
      `${this.baseUrl}/crm/v2/tenant/${this.tenantId}/customers`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          name: data.customerName,
          phones: [{ type: 'Mobile', number: data.customerPhone }],
          emails: data.customerEmail ? [{ type: 'Personal', email: data.customerEmail }] : [],
          address: { street: data.address || '' },
        }),
      }
    );
    if (!res.ok) throw new Error(`ServiceTitan createCustomer failed: ${res.status}`);
    return res.json();
  }

  async cancelJob(jobId) {
    if (!this.accessToken) await this.authenticate();
    const res = await fetch(
      `${this.baseUrl}/jpm/v2/tenant/${this.tenantId}/jobs/${jobId}/cancel`,
      { method: 'PUT', headers: this.headers() }
    );
    if (!res.ok) throw new Error(`ServiceTitan cancelJob failed: ${res.status}`);
    return res.json();
  }
}

module.exports = ServiceTitanProvider;
