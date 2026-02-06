const config = require('../config');
const ServiceTitanProvider = require('./servicetitan');
const HousecallProProvider = require('./housecall-pro');
const JobberProvider = require('./jobber');

/**
 * Provider registry — instantiates and exposes all configured
 * service-platform providers.
 */
const providers = {
  servicetitan: new ServiceTitanProvider(config.servicePlatforms.servicetitan),
  housecallpro: new HousecallProProvider(config.servicePlatforms.housecallpro),
  jobber: new JobberProvider(config.servicePlatforms.jobber),
};

/**
 * Get a provider instance by key.
 */
function getProvider(name) {
  return providers[name] || null;
}

/**
 * List all providers with their connection status.
 */
async function listProviders() {
  const results = [];
  for (const [key, provider] of Object.entries(providers)) {
    results.push({
      key,
      name: provider.name,
      connected: provider.connected,
    });
  }
  return results;
}

/**
 * Test connectivity for all providers that have credentials configured.
 */
async function testAllConnections() {
  const results = {};
  for (const [key, provider] of Object.entries(providers)) {
    try {
      results[key] = await provider.testConnection();
    } catch (err) {
      results[key] = { connected: false, error: err.message };
    }
  }
  return results;
}

module.exports = { providers, getProvider, listProviders, testAllConnections };
