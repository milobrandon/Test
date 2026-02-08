const config = require('../config');
const googleCalendar = require('./google-calendar');
const outlook = require('./outlook');
const caldav = require('./caldav');
const store = require('./store');

class AvailabilityService {
  /**
   * Parse a time string like "08:00" into { hours, minutes }.
   */
  parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  }

  /**
   * Generate all possible slots for a given date based on business hours.
   */
  generateSlots(date, durationMinutes, bufferMinutes, businessHours) {
    const bh = businessHours || config.booking.businessHours;
    const start = this.parseTime(bh.start);
    const end = this.parseTime(bh.end);

    const dayStart = new Date(date);
    dayStart.setHours(start.hours, start.minutes, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(end.hours, end.minutes, 0, 0);

    const slots = [];
    let cursor = new Date(dayStart);

    while (cursor.getTime() + durationMinutes * 60000 <= dayEnd.getTime()) {
      slots.push({
        start: new Date(cursor),
        end: new Date(cursor.getTime() + durationMinutes * 60000),
      });
      cursor = new Date(cursor.getTime() + (durationMinutes + bufferMinutes) * 60000);
    }

    return slots;
  }

  /**
   * Fetch existing events from all connected calendar providers for an account
   * within a given date range.
   */
  async fetchAllEvents(accountId, startDate, endDate) {
    const calendars = store.getCalendars(accountId);
    const allEvents = [];

    for (const cal of calendars) {
      try {
        let events = [];
        if (cal.provider === 'google') {
          const tokens = cal.tokens;
          events = await googleCalendar.getEvents(tokens, cal.calendarId, startDate, endDate);
        } else if (cal.provider === 'microsoft') {
          events = await outlook.getEvents(cal.tokens.access_token, cal.calendarId, startDate, endDate);
        } else if (cal.provider === 'caldav') {
          events = await caldav.getEvents(cal.calendarId, startDate, endDate);
        }
        allEvents.push(...events.map((e) => ({ ...e, calendarProvider: cal.provider, calendarName: cal.name })));
      } catch (err) {
        console.error(`[Account ${accountId}] Error fetching events from ${cal.provider} (${cal.name}):`, err.message);
      }
    }

    return allEvents;
  }

  /**
   * Check whether a time slot conflicts with any existing events.
   */
  hasConflict(slot, events) {
    const slotStart = new Date(slot.start).getTime();
    const slotEnd = new Date(slot.end).getTime();

    return events.some((evt) => {
      const evtStart = new Date(evt.start).getTime();
      const evtEnd = new Date(evt.end).getTime();
      return slotStart < evtEnd && slotEnd > evtStart;
    });
  }

  /**
   * Get available slots for a specific date, scoped to an account.
   */
  async getAvailableSlots(accountId, date, durationMinutes) {
    const settings = store.getAccountSettings(accountId);
    const duration = durationMinutes || settings.defaultDuration || config.booking.defaultDurationMinutes;
    const buffer = settings.bufferMinutes != null ? settings.bufferMinutes : config.booking.bufferMinutes;
    const businessHours = settings.businessHours || config.booking.businessHours;

    // Check that the requested date is a valid business day
    const dayOfWeek = new Date(date).getDay();
    if (!businessHours.workDays.includes(dayOfWeek)) {
      return { date, slots: [], message: 'Not a business day' };
    }

    // Don't allow booking too far in advance
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + config.booking.maxAdvanceDays);
    if (new Date(date) > maxDate) {
      return { date, slots: [], message: 'Date too far in advance' };
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const existingEvents = await this.fetchAllEvents(accountId, dayStart.toISOString(), dayEnd.toISOString());
    const allSlots = this.generateSlots(date, duration, buffer, businessHours);

    const available = allSlots.filter((slot) => !this.hasConflict(slot, existingEvents));

    return {
      date,
      duration,
      totalSlots: allSlots.length,
      availableSlots: available.length,
      slots: available.map((s) => ({
        start: s.start.toISOString(),
        end: s.end.toISOString(),
        startFormatted: s.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        endFormatted: s.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      })),
    };
  }

  /**
   * Find the next available slot across upcoming days, scoped to an account.
   */
  async findNextAvailable(accountId, durationMinutes, maxDaysToSearch = 14) {
    const settings = store.getAccountSettings(accountId);
    const duration = durationMinutes || settings.defaultDuration || config.booking.defaultDurationMinutes;

    for (let i = 0; i < maxDaysToSearch; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const result = await this.getAvailableSlots(accountId, dateStr, duration);
      if (result.slots.length > 0) {
        return { date: dateStr, slot: result.slots[0], allSlots: result.slots };
      }
    }

    return null;
  }
}

module.exports = new AvailabilityService();
