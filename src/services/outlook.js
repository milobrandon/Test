const config = require('../config');
const fetch = require('node-fetch');

class OutlookCalendarService {
  constructor() {
    this.clientId = config.microsoft.clientId;
    this.clientSecret = config.microsoft.clientSecret;
    this.redirectUri = config.microsoft.redirectUri;
    this.tenantId = config.microsoft.tenantId;
    this.scopes = config.microsoft.scopes;
    this.authorityBase = config.microsoft.authorityBase;
    this.graphBase = config.microsoft.graphBase;
  }

  /**
   * Generate the Microsoft OAuth authorization URL.
   */
  getAuthUrl(state) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
      response_mode: 'query',
      state: state || '',
    });
    return `${this.authorityBase}/${this.tenantId}/oauth2/v2.0/authorize?${params}`;
  }

  /**
   * Exchange authorization code for tokens.
   */
  async getTokens(code) {
    const res = await fetch(`${this.authorityBase}/${this.tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
        scope: this.scopes.join(' '),
      }),
    });
    if (!res.ok) throw new Error(`Microsoft token error: ${res.status}`);
    return res.json();
  }

  /**
   * Refresh an expired access token.
   */
  async refreshTokens(refreshToken) {
    const res = await fetch(`${this.authorityBase}/${this.tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: this.scopes.join(' '),
      }),
    });
    if (!res.ok) throw new Error(`Microsoft refresh error: ${res.status}`);
    return res.json();
  }

  /**
   * Make an authenticated request to the Microsoft Graph API.
   */
  async graphRequest(accessToken, endpoint, method = 'GET', body = null) {
    const options = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${this.graphBase}${endpoint}`, options);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Graph API error ${res.status}: ${text}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  /**
   * List all calendars.
   */
  async listCalendars(accessToken) {
    const data = await this.graphRequest(accessToken, '/me/calendars');
    return (data.value || []).map((cal) => ({
      id: cal.id,
      name: cal.name,
      color: cal.color,
      isDefault: cal.isDefaultCalendar,
      owner: cal.owner ? cal.owner.name : '',
    }));
  }

  /**
   * Fetch events within a time range.
   */
  async getEvents(accessToken, calendarId, startDateTime, endDateTime) {
    const params = new URLSearchParams({
      startDateTime,
      endDateTime,
      $orderby: 'start/dateTime',
      $top: '100',
    });
    const path = calendarId
      ? `/me/calendars/${calendarId}/calendarView?${params}`
      : `/me/calendarView?${params}`;
    const data = await this.graphRequest(accessToken, path);
    return (data.value || []).map((evt) => ({
      id: evt.id,
      title: evt.subject,
      start: evt.start.dateTime,
      end: evt.end.dateTime,
      timeZone: evt.start.timeZone,
      status: evt.showAs,
    }));
  }

  /**
   * Create a new calendar event.
   */
  async createEvent(accessToken, calendarId, eventData) {
    const path = calendarId
      ? `/me/calendars/${calendarId}/events`
      : '/me/events';
    const graphEvent = {
      subject: eventData.title,
      body: {
        contentType: 'text',
        content: eventData.description || '',
      },
      start: {
        dateTime: eventData.startTime,
        timeZone: eventData.timeZone || 'Eastern Standard Time',
      },
      end: {
        dateTime: eventData.endTime,
        timeZone: eventData.timeZone || 'Eastern Standard Time',
      },
      location: {
        displayName: eventData.location || '',
      },
      attendees: (eventData.attendees || []).map((a) => ({
        emailAddress: { address: a.email, name: a.name || '' },
        type: 'required',
      })),
    };
    return this.graphRequest(accessToken, path, 'POST', graphEvent);
  }

  /**
   * Delete a calendar event.
   */
  async deleteEvent(accessToken, eventId) {
    return this.graphRequest(accessToken, `/me/events/${eventId}`, 'DELETE');
  }
}

module.exports = new OutlookCalendarService();
