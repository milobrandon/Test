const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const store = require('./store');
const availability = require('./availability');
const googleCalendar = require('./google-calendar');
const outlookService = require('./outlook');
const caldavService = require('./caldav');
const synthflow = require('./synthflow');

class BookingService {
  /**
   * Process a booking request that originated from a Synthflow voice call,
   * scoped to a specific account.
   */
  async processVoiceBooking(accountId, bookingRequest) {
    const settings = store.getAccountSettings(accountId);

    // 1. Determine the date and time
    let targetDate = bookingRequest.preferredDate;
    let targetTime = bookingRequest.preferredTime;
    const duration = bookingRequest.duration || settings.defaultDuration || config.booking.defaultDurationMinutes;

    // 2. If no specific date/time, find the next available slot
    let slot;
    if (!targetDate || !targetTime) {
      const next = await availability.findNextAvailable(accountId, duration);
      if (!next) {
        return {
          success: false,
          error: 'No available slots in the next 14 days',
        };
      }
      slot = next.slot;
      targetDate = next.date;
    } else {
      // Verify the requested slot is actually available
      const slotsResult = await availability.getAvailableSlots(accountId, targetDate, duration);
      slot = this.findClosestSlot(slotsResult.slots, targetTime);
      if (!slot) {
        return {
          success: false,
          error: `No availability on ${targetDate} at ${targetTime}`,
          alternativeSlots: slotsResult.slots.slice(0, 3),
        };
      }
    }

    // 3. Create the booking record
    const booking = {
      id: uuidv4(),
      accountId,
      status: 'confirmed',
      customerName: bookingRequest.customerName,
      customerEmail: bookingRequest.customerEmail,
      customerPhone: bookingRequest.customerPhone,
      serviceType: bookingRequest.serviceType,
      date: targetDate,
      startTime: slot.start || slot.startFormatted,
      endTime: slot.end || slot.endFormatted,
      duration,
      notes: bookingRequest.notes,
      address: bookingRequest.address,
      urgency: bookingRequest.urgency,
      source: 'synthflow',
      sourceCallId: bookingRequest.sourceCallId,
      agentId: bookingRequest.agentId,
      calendarProvider: settings.defaultCalendarProvider,
      calendarEventId: null,
      servicePlatformJobId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 4. Create the calendar event
    try {
      const eventResult = await this.createCalendarEvent(accountId, booking, settings);
      booking.calendarEventId = eventResult.id;
      booking.calendarLink = eventResult.htmlLink || eventResult.url || null;
    } catch (err) {
      console.error(`[Account ${accountId}] Failed to create calendar event:`, err.message);
      booking.status = 'pending_calendar';
      booking.calendarError = err.message;
    }

    // 5. Save the booking
    store.addBooking(booking);

    // 6. Notify Synthflow of the confirmation
    if (bookingRequest.sourceCallId) {
      try {
        await synthflow.sendBookingConfirmation(bookingRequest.sourceCallId, booking);
      } catch (err) {
        console.error(`[Account ${accountId}] Failed to notify Synthflow:`, err.message);
      }
    }

    return { success: true, booking };
  }

  /**
   * Create a calendar event on the configured provider for an account.
   */
  async createCalendarEvent(accountId, booking, settings) {
    const calendars = store.getCalendars(accountId);
    const targetCalendar = calendars.find(
      (c) => c.provider === settings.defaultCalendarProvider && (c.isDefault || c.calendarId === settings.defaultCalendarId)
    ) || calendars[0];

    if (!targetCalendar) {
      throw new Error('No calendar connected. Please connect a calendar in Settings.');
    }

    const eventData = {
      title: `${booking.serviceType || 'Appointment'} — ${booking.customerName}`,
      description: [
        `Customer: ${booking.customerName}`,
        `Phone: ${booking.customerPhone}`,
        `Email: ${booking.customerEmail}`,
        `Service: ${booking.serviceType}`,
        booking.address ? `Address: ${booking.address}` : '',
        booking.notes ? `Notes: ${booking.notes}` : '',
        `Booked via Synthflow Voice AI (Call ID: ${booking.sourceCallId || 'N/A'})`,
      ].filter(Boolean).join('\n'),
      startTime: booking.startTime,
      endTime: booking.endTime,
      location: booking.address,
      attendees: booking.customerEmail ? [{ email: booking.customerEmail, name: booking.customerName }] : [],
    };

    if (targetCalendar.provider === 'google') {
      return googleCalendar.createEvent(targetCalendar.tokens, targetCalendar.calendarId, eventData);
    } else if (targetCalendar.provider === 'microsoft') {
      return outlookService.createEvent(targetCalendar.tokens.access_token, targetCalendar.calendarId, eventData);
    } else if (targetCalendar.provider === 'caldav') {
      return caldavService.createEvent(targetCalendar.calendarId, eventData);
    }

    throw new Error(`Unsupported calendar provider: ${targetCalendar.provider}`);
  }

  /**
   * Find the slot closest to the requested time.
   */
  findClosestSlot(slots, requestedTime) {
    if (!slots || slots.length === 0) return null;

    // Try exact match first
    for (const slot of slots) {
      const slotTime = new Date(slot.start).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      if (slotTime === requestedTime || slot.startFormatted === requestedTime) {
        return slot;
      }
    }

    // Otherwise, find the closest slot
    const requestedMinutes = this.timeToMinutes(requestedTime);
    let closest = null;
    let minDiff = Infinity;

    for (const slot of slots) {
      const slotMinutes = new Date(slot.start).getHours() * 60 + new Date(slot.start).getMinutes();
      const diff = Math.abs(slotMinutes - requestedMinutes);
      if (diff < minDiff) {
        minDiff = diff;
        closest = slot;
      }
    }

    return minDiff <= 60 ? closest : null; // within 1 hour tolerance
  }

  timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (!parts) return 0;
    let hours = parseInt(parts[1], 10);
    const minutes = parseInt(parts[2] || '0', 10);
    if (parts[3]) {
      if (parts[3].toLowerCase() === 'pm' && hours !== 12) hours += 12;
      if (parts[3].toLowerCase() === 'am' && hours === 12) hours = 0;
    }
    return hours * 60 + minutes;
  }

  /**
   * Manually create a booking (from dashboard), scoped to an account.
   */
  async createManualBooking(accountId, data) {
    const booking = {
      id: uuidv4(),
      accountId,
      status: 'confirmed',
      customerName: data.customerName,
      customerEmail: data.customerEmail || '',
      customerPhone: data.customerPhone || '',
      serviceType: data.serviceType || '',
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      duration: data.duration || config.booking.defaultDurationMinutes,
      notes: data.notes || '',
      address: data.address || '',
      urgency: 'normal',
      source: 'manual',
      sourceCallId: null,
      agentId: null,
      calendarProvider: data.calendarProvider || '',
      calendarEventId: null,
      servicePlatformJobId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (data.createCalendarEvent !== false) {
      try {
        const settings = store.getAccountSettings(accountId);
        const eventResult = await this.createCalendarEvent(accountId, booking, settings);
        booking.calendarEventId = eventResult.id;
        booking.calendarLink = eventResult.htmlLink || eventResult.url || null;
      } catch (err) {
        console.error(`[Account ${accountId}] Calendar event creation failed:`, err.message);
      }
    }

    store.addBooking(booking);
    return booking;
  }

  /**
   * Cancel a booking and remove the calendar event.
   * Reads the booking to determine its accountId.
   */
  async cancelBooking(bookingId) {
    const booking = store.getBookingById(bookingId);
    if (!booking) return null;

    // Attempt to remove calendar event
    if (booking.calendarEventId) {
      try {
        const calendars = store.getCalendars(booking.accountId);
        const cal = calendars.find((c) => c.provider === booking.calendarProvider);
        if (cal) {
          if (cal.provider === 'google') {
            await googleCalendar.deleteEvent(cal.tokens, cal.calendarId, booking.calendarEventId);
          } else if (cal.provider === 'microsoft') {
            await outlookService.deleteEvent(cal.tokens.access_token, booking.calendarEventId);
          } else if (cal.provider === 'caldav') {
            await caldavService.deleteEvent(booking.calendarEventId);
          }
        }
      } catch (err) {
        console.error(`[Account ${booking.accountId}] Failed to remove calendar event:`, err.message);
      }
    }

    return store.updateBooking(bookingId, { status: 'cancelled' });
  }
}

module.exports = new BookingService();
