const path = require('path');

const config = {
  port: process.env.PORT || 3000,
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  dataDir: path.join(__dirname, '..', 'data'),

  synthflow: {
    apiKey: process.env.SYNTHFLOW_API_KEY || '',
    webhookSecret: process.env.SYNTHFLOW_WEBHOOK_SECRET || '',
    baseUrl: 'https://api.synthflow.ai/v2',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  },

  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/auth/microsoft/callback',
    tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    scopes: ['Calendars.ReadWrite', 'offline_access'],
    authorityBase: 'https://login.microsoftonline.com',
    graphBase: 'https://graph.microsoft.com/v1.0',
  },

  caldav: {
    serverUrl: process.env.CALDAV_SERVER_URL || '',
    username: process.env.CALDAV_USERNAME || '',
    password: process.env.CALDAV_PASSWORD || '',
  },

  servicePlatforms: {
    servicetitan: {
      appKey: process.env.SERVICETITAN_APP_KEY || '',
      tenantId: process.env.SERVICETITAN_TENANT_ID || '',
      baseUrl: 'https://api.servicetitan.io',
    },
    housecallpro: {
      apiKey: process.env.HOUSECALLPRO_API_KEY || '',
      baseUrl: 'https://api.housecallpro.com',
    },
    jobber: {
      clientId: process.env.JOBBER_CLIENT_ID || '',
      clientSecret: process.env.JOBBER_CLIENT_SECRET || '',
      baseUrl: 'https://api.getjobber.com/api/graphql',
    },
  },

  booking: {
    defaultDurationMinutes: 60,
    bufferMinutes: 15,
    maxAdvanceDays: 60,
    businessHours: {
      start: '08:00',
      end: '18:00',
      timezone: 'America/New_York',
      workDays: [1, 2, 3, 4, 5], // Mon-Fri
    },
  },
};

module.exports = config;
