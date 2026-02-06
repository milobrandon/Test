const { google } = require('googleapis');
const config = require('../config');

class GoogleCalendarService {
  constructor() {
    this.clientId = config.google.clientId;
    this.clientSecret = config.google.clientSecret;
    this.redirectUri = config.google.redirectUri;
    this.scopes = config.google.scopes;
  }

  /**
   * Create an OAuth2 client, optionally pre-loaded with tokens.
   */
  createOAuth2Client(tokens) {
    const client = new google.auth.OAuth2(this.clientId, this.clientSecret, this.redirectUri);
    if (tokens) client.setCredentials(tokens);
    return client;
  }

  /**
   * Generate the Google OAuth consent URL.
   */
  getAuthUrl(state) {
    const client = this.createOAuth2Client();
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: this.scopes,
      state,
    });
  }

  /**
   * Exchange an authorization code for tokens.
   */
  async getTokens(code) {
    const client = this.createOAuth2Client();
    const { tokens } = await client.getToken(code);
    return tokens;
  }

  /**
   * Refresh an expired access token.
   */
  async refreshTokens(tokens) {
    const client = this.createOAuth2Client(tokens);
    const { credentials } = await client.refreshAccessToken();
    return credentials;
  }

  /**
   * List all calendars for the connected account.
   */
  async listCalendars(tokens) {
    const client = this.createOAuth2Client(tokens);
    const calendar = google.calendar({ version: 'v3', auth: client });
    const res = await calendar.calendarList.list();
    return res.data.items.map((cal) => ({
      id: cal.id,
      name: cal.summary,
      description: cal.description || '',
      primary: cal.primary || false,
      timeZone: cal.timeZone,
      color: cal.backgroundColor,
    }));
  }

  /**
   * Fetch events within a time range (for availability checks).
   */
  async getEvents(tokens, calendarId, timeMin, timeMax) {
    const client = this.createOAuth2Client(tokens);
    const calendar = google.calendar({ version: 'v3', auth: client });
    const res = await calendar.events.list({
      calendarId: calendarId || 'primary',
      timeMin: new Date(timeMin).toISOString(),
      timeMax: new Date(timeMax).toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    return (res.data.items || []).map((evt) => ({
      id: evt.id,
      title: evt.summary,
      start: evt.start.dateTime || evt.start.date,
      end: evt.end.dateTime || evt.end.date,
      status: evt.status,
    }));
  }

  /**
   * Create a new calendar event (the actual booking).
   */
  async createEvent(tokens, calendarId, eventData) {
    const client = this.createOAuth2Client(tokens);
    const calendar = google.calendar({ version: 'v3', auth: client });
    const res = await calendar.events.insert({
      calendarId: calendarId || 'primary',
      resource: {
        summary: eventData.title,
        description: eventData.description || '',
        location: eventData.location || '',
        start: {
          dateTime: eventData.startTime,
          timeZone: eventData.timeZone || 'America/New_York',
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: eventData.timeZone || 'America/New_York',
        },
        attendees: eventData.attendees || [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 15 },
          ],
        },
      },
    });
    return {
      id: res.data.id,
      htmlLink: res.data.htmlLink,
      status: res.data.status,
    };
  }

  /**
   * Delete / cancel a calendar event.
   */
  async deleteEvent(tokens, calendarId, eventId) {
    const client = this.createOAuth2Client(tokens);
    const calendar = google.calendar({ version: 'v3', auth: client });
    await calendar.events.delete({
      calendarId: calendarId || 'primary',
      eventId,
    });
  }
}

module.exports = new GoogleCalendarService();
