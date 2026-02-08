const path = require('path');

const config = {
  port: process.env.PORT || 3000,
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  dataDir: path.join(__dirname, '..', 'data'),

  // JWT secret for user authentication
  jwtSecret: process.env.JWT_SECRET || 'relay-systems-dev-secret-change-in-production',
  jwtExpiry: process.env.JWT_EXPIRY || '7d',

  voiceAi: {
    apiKey: process.env.VOICE_AI_API_KEY || process.env.SYNTHFLOW_API_KEY || '',
    webhookSecret: process.env.VOICE_AI_WEBHOOK_SECRET || process.env.SYNTHFLOW_WEBHOOK_SECRET || '',
    baseUrl: process.env.VOICE_AI_BASE_URL || 'https://api.synthflow.ai/v2',
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
      workDays: [1, 2, 3, 4, 5],
    },
  },

  // Default call variable definitions for new accounts
  defaultCallVariables: [
    { key: 'call_outcome', label: 'Call Outcome', type: 'select', options: ['Booked', 'Not Booked', 'Callback Requested', 'Wrong Number', 'Voicemail', 'Other'], enabled: true },
    { key: 'call_summary', label: 'Call Summary', type: 'text', options: [], enabled: true },
    { key: 'transcript', label: 'Transcript', type: 'longtext', options: [], enabled: true },
    { key: 'caller_sentiment', label: 'Caller Sentiment', type: 'select', options: ['Positive', 'Neutral', 'Negative'], enabled: true },
    { key: 'call_duration', label: 'Call Duration (seconds)', type: 'number', options: [], enabled: true },
    { key: 'recording_url', label: 'Recording URL', type: 'url', options: [], enabled: true },
    { key: 'agent_id', label: 'Agent ID', type: 'text', options: [], enabled: true },
    { key: 'call_type', label: 'Call Type', type: 'select', options: ['Inbound', 'Outbound'], enabled: true },
    { key: 'service_requested', label: 'Service Requested', type: 'text', options: [], enabled: true },
    { key: 'follow_up_required', label: 'Follow-up Required', type: 'boolean', options: [], enabled: true },
  ],
};

module.exports = config;
