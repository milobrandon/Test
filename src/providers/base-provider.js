/**
 * Base class for field-service platform integrations.
 * Each provider (ServiceTitan, Housecall Pro, Jobber, etc.) extends this
 * to implement platform-specific API calls.
 */
class BaseProvider {
  constructor(name, config) {
    this.name = name;
    this.config = config;
    this.connected = false;
  }

  /** Check whether the provider is configured and reachable. */
  async testConnection() {
    throw new Error(`${this.name}: testConnection() not implemented`);
  }

  /** Push a new job / appointment to the platform. */
  async createJob(booking) {
    throw new Error(`${this.name}: createJob() not implemented`);
  }

  /** Update an existing job. */
  async updateJob(jobId, updates) {
    throw new Error(`${this.name}: updateJob() not implemented`);
  }

  /** Cancel / delete a job. */
  async cancelJob(jobId) {
    throw new Error(`${this.name}: cancelJob() not implemented`);
  }

  /** Fetch a list of customers matching a phone or email. */
  async findCustomer(query) {
    throw new Error(`${this.name}: findCustomer() not implemented`);
  }

  /** Create a new customer record. */
  async createCustomer(customerData) {
    throw new Error(`${this.name}: createCustomer() not implemented`);
  }

  /** Fetch technician / team availability. */
  async getTechnicianAvailability(date) {
    throw new Error(`${this.name}: getTechnicianAvailability() not implemented`);
  }
}

module.exports = BaseProvider;
