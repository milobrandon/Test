const config = require('../config');
const fetch = require('node-fetch');

/**
 * CalDAV service for Apple Calendar, iCloud, FastMail, and other
 * CalDAV-compatible servers.
 *
 * CalDAV uses XML (WebDAV) over HTTP — this implementation covers the
 * core operations needed for booking: discovery, event creation, and
 * free/busy queries.
 */
class CalDAVService {
  constructor() {
    this.serverUrl = config.caldav.serverUrl;
    this.username = config.caldav.username;
    this.password = config.caldav.password;
  }

  /**
   * Build basic-auth header value.
   */
  authHeader() {
    return 'Basic ' + Buffer.from(`${this.username}:${this.password}`).toString('base64');
  }

  /**
   * Send a CalDAV (WebDAV) request.
   */
  async request(url, method, body, depth = '1') {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/xml; charset=utf-8',
        Depth: depth,
      },
      body,
    });
    if (!res.ok && res.status !== 207) {
      throw new Error(`CalDAV error ${res.status}: ${await res.text()}`);
    }
    return res.text();
  }

  /**
   * Discover available calendars via PROPFIND.
   */
  async listCalendars() {
    const body = `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:" xmlns:cs="http://calendarserver.org/ns/" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:displayname />
    <d:resourcetype />
    <cs:getctag />
  </d:prop>
</d:propfind>`;

    const xml = await this.request(this.serverUrl, 'PROPFIND', body, '1');
    // Simple extraction — in production you'd use an XML parser
    const calendars = [];
    const hrefMatches = xml.match(/<d:href>([^<]+)<\/d:href>/g) || [];
    const nameMatches = xml.match(/<d:displayname>([^<]*)<\/d:displayname>/g) || [];

    for (let i = 0; i < hrefMatches.length; i++) {
      const href = hrefMatches[i].replace(/<\/?d:href>/g, '');
      const name = nameMatches[i] ? nameMatches[i].replace(/<\/?d:displayname>/g, '') : href;
      if (href.includes('/calendars/') || href.includes('/cal/')) {
        calendars.push({ id: href, name, provider: 'caldav' });
      }
    }
    return calendars;
  }

  /**
   * Build an iCalendar (ICS) event string.
   */
  buildICS(eventData) {
    const uid = eventData.id || `${Date.now()}@relay-systems-booking`;
    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const dtStart = new Date(eventData.startTime).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const dtEnd = new Date(eventData.endTime).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//RelaySystemsBooking//EN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${eventData.title || 'Booking'}`,
      `DESCRIPTION:${(eventData.description || '').replace(/\n/g, '\\n')}`,
      `LOCATION:${eventData.location || ''}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }

  /**
   * Create a new event on a CalDAV calendar.
   */
  async createEvent(calendarPath, eventData) {
    const uid = eventData.id || `${Date.now()}@relay-systems-booking`;
    const url = `${this.serverUrl}${calendarPath}${uid}.ics`;
    const ics = this.buildICS({ ...eventData, id: uid });

    await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'text/calendar; charset=utf-8',
        'If-None-Match': '*',
      },
      body: ics,
    });

    return { id: uid, url };
  }

  /**
   * Delete an event from a CalDAV calendar.
   */
  async deleteEvent(eventUrl) {
    await fetch(eventUrl, {
      method: 'DELETE',
      headers: { Authorization: this.authHeader() },
    });
  }

  /**
   * Fetch events in a time range via REPORT.
   */
  async getEvents(calendarPath, startDate, endDate) {
    const start = new Date(startDate).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const end = new Date(endDate).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const body = `<?xml version="1.0" encoding="utf-8" ?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag />
    <c:calendar-data />
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${start}" end="${end}" />
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;

    const xml = await this.request(`${this.serverUrl}${calendarPath}`, 'REPORT', body, '1');
    // Basic extraction of VEVENT blocks
    const events = [];
    const dataBlocks = xml.match(/<c:calendar-data[^>]*>([\s\S]*?)<\/c:calendar-data>/g) || [];
    for (const block of dataBlocks) {
      const ics = block.replace(/<\/?c:calendar-data[^>]*>/g, '');
      const summary = (ics.match(/SUMMARY:(.*)/) || [])[1] || '';
      const dtStart = (ics.match(/DTSTART[^:]*:(.*)/) || [])[1] || '';
      const dtEnd = (ics.match(/DTEND[^:]*:(.*)/) || [])[1] || '';
      const uid = (ics.match(/UID:(.*)/) || [])[1] || '';
      events.push({ id: uid.trim(), title: summary.trim(), start: dtStart.trim(), end: dtEnd.trim() });
    }
    return events;
  }
}

module.exports = new CalDAVService();
