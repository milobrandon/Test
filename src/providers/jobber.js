const BaseProvider = require('./base-provider');
const fetch = require('node-fetch');

/**
 * Jobber integration provider.
 * Docs: https://developer.getjobber.com
 * Jobber uses a GraphQL API.
 */
class JobberProvider extends BaseProvider {
  constructor(cfg) {
    super('Jobber', cfg);
    this.baseUrl = cfg.baseUrl || 'https://api.getjobber.com/api/graphql';
    this.accessToken = null;
  }

  headers() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async authenticate() {
    const res = await fetch('https://api.getjobber.com/api/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.clientId || '',
        client_secret: this.config.clientSecret || '',
      }),
    });
    if (!res.ok) throw new Error(`Jobber auth failed: ${res.status}`);
    const data = await res.json();
    this.accessToken = data.access_token;
    return data;
  }

  async graphql(query, variables = {}) {
    if (!this.accessToken) await this.authenticate();
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error(`Jobber API error: ${res.status}`);
    return res.json();
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
    const mutation = `
      mutation CreateJob($input: JobCreateInput!) {
        jobCreate(input: $input) {
          job { id title startAt endAt }
          userErrors { message path }
        }
      }
    `;

    return this.graphql(mutation, {
      input: {
        title: `${booking.serviceType} — ${booking.customerName}`,
        clientId: booking.servicePlatformCustomerId || null,
        startAt: booking.startTime,
        endAt: booking.endTime,
        description: booking.notes || '',
        jobType: booking.serviceType || 'Service',
      },
    });
  }

  async findCustomer(query) {
    const gql = `
      query FindClients($search: String!) {
        clients(searchTerm: $search, first: 5) {
          nodes { id firstName lastName email phones { number } }
        }
      }
    `;
    return this.graphql(gql, { search: query.phone || query.email || query.name || '' });
  }

  async createCustomer(data) {
    const mutation = `
      mutation CreateClient($input: ClientCreateInput!) {
        clientCreate(input: $input) {
          client { id firstName lastName }
          userErrors { message path }
        }
      }
    `;
    const names = data.customerName.split(' ');
    return this.graphql(mutation, {
      input: {
        firstName: names[0],
        lastName: names.slice(1).join(' ') || '',
        emails: data.customerEmail ? [{ description: 'Main', address: data.customerEmail }] : [],
        phones: data.customerPhone ? [{ description: 'Mobile', number: data.customerPhone }] : [],
      },
    });
  }

  async cancelJob(jobId) {
    const mutation = `
      mutation CloseJob($id: ID!) {
        jobClose(jobId: $id) {
          job { id }
          userErrors { message path }
        }
      }
    `;
    return this.graphql(mutation, { id: jobId });
  }
}

module.exports = JobberProvider;
