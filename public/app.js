// ─── Synthflow Calendar Booking — Frontend ──────────────────
const API = '/api';
let currentPage = 'dashboard';

// ─── Bootstrap ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  navigate('dashboard');
  createToastContainer();
});

function createToastContainer() {
  if (!document.querySelector('.toast-container')) {
    const el = document.createElement('div');
    el.className = 'toast-container';
    document.body.appendChild(el);
  }
}

// ─── Navigation ─────────────────────────────────────────────
function initNav() {
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      navigate(item.dataset.page);
    });
  });
}

function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  const titles = {
    dashboard: 'Dashboard',
    bookings: 'Bookings',
    calendars: 'Calendars',
    webhooks: 'Webhooks',
    platforms: 'Service Platforms',
    settings: 'Settings',
  };
  document.getElementById('page-title').textContent = titles[page] || page;
  document.getElementById('new-booking-btn').style.display =
    page === 'dashboard' || page === 'bookings' ? '' : 'none';
  renderPage(page);
}

async function renderPage(page) {
  const el = document.getElementById('content');
  switch (page) {
    case 'dashboard':
      return renderDashboard(el);
    case 'bookings':
      return renderBookings(el);
    case 'calendars':
      return renderCalendars(el);
    case 'webhooks':
      return renderWebhooks(el);
    case 'platforms':
      return renderPlatforms(el);
    case 'settings':
      return renderSettings(el);
    default:
      el.innerHTML = '<p>Page not found</p>';
  }
}

// ─── Dashboard ──────────────────────────────────────────────
async function renderDashboard(el) {
  el.innerHTML = '<p style="color:var(--text-light)">Loading...</p>';

  const [stats, bookings] = await Promise.all([
    fetchJSON('/api/stats'),
    fetchJSON('/api/bookings'),
  ]);

  const recent = (bookings || []).slice(0, 8);

  el.innerHTML = `
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">${stats.totalBookings || 0}</div>
        <div class="stat-label">Total Bookings</div>
      </div>
      <div class="stat-card green">
        <div class="stat-value">${stats.confirmedBookings || 0}</div>
        <div class="stat-label">Confirmed</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-value">${stats.todayBookings || 0}</div>
        <div class="stat-label">Today</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.voiceBookings || 0}</div>
        <div class="stat-label">Voice AI Bookings</div>
      </div>
      <div class="stat-card teal">
        <div class="stat-value">${stats.connectedCalendars || 0}</div>
        <div class="stat-label">Calendars</div>
      </div>
      <div class="stat-card red">
        <div class="stat-value">${stats.cancelledBookings || 0}</div>
        <div class="stat-label">Cancelled</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <h2>Recent Bookings</h2>
          <button class="btn btn-sm btn-secondary" onclick="navigate('bookings')">View All</button>
        </div>
        <div class="table-wrap">
          ${recent.length ? renderBookingTable(recent) : `
            <div class="empty-state">
              <div class="empty-state-icon">&#128197;</div>
              <h3>No bookings yet</h3>
              <p>Bookings from Synthflow voice calls will appear here automatically.</p>
            </div>`}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h2>Quick Setup</h2></div>
        <div class="card-body">
          <div class="setup-steps">
            <div class="setup-step">
              <div class="step-number">1</div>
              <div class="step-content">
                <h3>Connect a Calendar</h3>
                <p>Link Google Calendar, Microsoft Outlook, or Apple Calendar to receive bookings.</p>
              </div>
            </div>
            <div class="setup-step">
              <div class="step-number">2</div>
              <div class="step-content">
                <h3>Configure Synthflow Webhook</h3>
                <p>Copy the webhook URL and paste it into your Synthflow agent's configuration.</p>
              </div>
            </div>
            <div class="setup-step">
              <div class="step-number">3</div>
              <div class="step-content">
                <h3>Set Business Hours</h3>
                <p>Define your availability window so the AI agent only books during working hours.</p>
              </div>
            </div>
            <div class="setup-step">
              <div class="step-number">4</div>
              <div class="step-content">
                <h3>Connect Service Platforms</h3>
                <p>Optionally link ServiceTitan, Housecall Pro, or Jobber to sync jobs automatically.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

// ─── Bookings ───────────────────────────────────────────────
async function renderBookings(el) {
  el.innerHTML = '<p style="color:var(--text-light)">Loading bookings...</p>';
  const bookings = await fetchJSON('/api/bookings');

  if (!bookings || bookings.length === 0) {
    el.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="empty-state-icon">&#128197;</div>
          <h3>No bookings yet</h3>
          <p>Create a manual booking or let your Synthflow voice agent create one automatically.</p>
        </div>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>All Bookings (${bookings.length})</h2>
        <div style="display:flex;gap:8px;">
          <select id="filter-status" onchange="filterBookings()" style="padding:5px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:13px;">
            <option value="">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="pending_calendar">Pending</option>
          </select>
          <select id="filter-source" onchange="filterBookings()" style="padding:5px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:13px;">
            <option value="">All Sources</option>
            <option value="synthflow">Voice AI</option>
            <option value="manual">Manual</option>
          </select>
        </div>
      </div>
      <div class="table-wrap" id="bookings-table-wrap">
        ${renderBookingTable(bookings, true)}
      </div>
    </div>`;
}

function renderBookingTable(bookings, showActions = false) {
  return `
    <table>
      <thead>
        <tr>
          <th>Customer</th>
          <th>Service</th>
          <th>Date & Time</th>
          <th>Source</th>
          <th>Status</th>
          ${showActions ? '<th>Actions</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${bookings.map((b) => `
          <tr>
            <td>
              <strong>${esc(b.customerName)}</strong><br>
              <small style="color:var(--text-light)">${esc(b.customerPhone)}</small>
            </td>
            <td>${esc(b.serviceType || '—')}</td>
            <td>${formatDate(b.date)}<br><small style="color:var(--text-light)">${formatTime(b.startTime)}</small></td>
            <td><span class="badge badge-${b.source === 'synthflow' ? 'voice' : 'manual'}">${b.source === 'synthflow' ? 'Voice AI' : 'Manual'}</span></td>
            <td><span class="badge badge-${b.status}">${capitalize(b.status)}</span></td>
            ${showActions ? `<td>
              ${b.status === 'confirmed' ? `<button class="btn btn-sm btn-danger" onclick="cancelBooking('${b.id}')">Cancel</button>` : ''}
            </td>` : ''}
          </tr>`).join('')}
      </tbody>
    </table>`;
}

async function filterBookings() {
  const status = document.getElementById('filter-status').value;
  const source = document.getElementById('filter-source').value;
  let url = '/api/bookings?';
  if (status) url += `status=${status}&`;
  if (source) url += `source=${source}&`;
  const bookings = await fetchJSON(url);
  document.getElementById('bookings-table-wrap').innerHTML = renderBookingTable(bookings || [], true);
}

async function cancelBooking(id) {
  if (!confirm('Cancel this booking? The calendar event will also be removed.')) return;
  const res = await fetchJSON(`/api/bookings/${id}/cancel`, { method: 'POST' });
  if (res) {
    toast('Booking cancelled', 'success');
    renderPage(currentPage);
  }
}

// ─── Calendars ──────────────────────────────────────────────
async function renderCalendars(el) {
  el.innerHTML = '<p style="color:var(--text-light)">Loading calendars...</p>';
  const calendars = await fetchJSON('/api/calendars');

  el.innerHTML = `
    <div class="card" style="margin-bottom:20px;">
      <div class="card-header"><h2>Connect a Calendar Provider</h2></div>
      <div class="card-body">
        <div class="provider-grid">
          <div class="provider-card ${hasProvider(calendars, 'google') ? 'connected' : ''}">
            <div class="provider-icon google">G</div>
            <h3>Google Calendar</h3>
            <p>Connect your Google account to sync bookings with Google Calendar.</p>
            <a href="/auth/google" class="btn btn-primary btn-sm">Connect Google</a>
            ${hasProvider(calendars, 'google') ? '<div class="provider-status connected">Connected</div>' : ''}
          </div>
          <div class="provider-card ${hasProvider(calendars, 'microsoft') ? 'connected' : ''}">
            <div class="provider-icon microsoft">M</div>
            <h3>Microsoft Outlook</h3>
            <p>Connect your Microsoft 365 or Outlook account for calendar sync.</p>
            <a href="/auth/microsoft" class="btn btn-primary btn-sm">Connect Outlook</a>
            ${hasProvider(calendars, 'microsoft') ? '<div class="provider-status connected">Connected</div>' : ''}
          </div>
          <div class="provider-card ${hasProvider(calendars, 'caldav') ? 'connected' : ''}">
            <div class="provider-icon caldav">C</div>
            <h3>Apple / CalDAV</h3>
            <p>Connect iCloud Calendar, FastMail, or any CalDAV-compatible server.</p>
            <button class="btn btn-primary btn-sm" onclick="connectCalDAV()">Connect CalDAV</button>
            ${hasProvider(calendars, 'caldav') ? '<div class="provider-status connected">Connected</div>' : ''}
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h2>Connected Calendars</h2></div>
      <div class="card-body">
        ${calendars && calendars.length ? calendars.map((cal) => `
          <div class="cal-list-item">
            <div class="cal-info">
              <div class="cal-dot" style="background:${providerColor(cal.provider)}"></div>
              <div>
                <strong>${esc(cal.name)}</strong>
                <div style="font-size:12px;color:var(--text-light)">${capitalize(cal.provider)}${cal.isDefault ? ' &mdash; Default' : ''}</div>
              </div>
            </div>
            <div class="cal-actions">
              ${!cal.isDefault ? `<button class="btn btn-sm btn-secondary" onclick="setDefaultCalendar('${cal.id}')">Set Default</button>` : '<span class="badge badge-confirmed">Default</span>'}
              <button class="btn btn-sm btn-danger" onclick="disconnectCalendar('${cal.id}')">Disconnect</button>
            </div>
          </div>`).join('') : '<div class="empty-state"><h3>No calendars connected</h3><p>Connect a calendar provider above to start receiving bookings.</p></div>'}
      </div>
    </div>`;
}

function hasProvider(calendars, provider) {
  return calendars && calendars.some((c) => c.provider === provider);
}

function providerColor(provider) {
  const colors = { google: '#4285f4', microsoft: '#00a4ef', caldav: '#333' };
  return colors[provider] || '#6c5ce7';
}

async function connectCalDAV() {
  const res = await fetchJSON('/auth/caldav/connect', { method: 'POST' });
  if (res && res.success) {
    toast('CalDAV connected', 'success');
    renderPage('calendars');
  } else {
    toast('CalDAV connection failed. Check server credentials in .env', 'error');
  }
}

async function setDefaultCalendar(id) {
  await fetchJSON(`/api/calendars/${id}/default`, { method: 'PUT' });
  toast('Default calendar updated', 'success');
  renderPage('calendars');
}

async function disconnectCalendar(id) {
  if (!confirm('Disconnect this calendar?')) return;
  await fetchJSON(`/api/calendars/${id}`, { method: 'DELETE' });
  toast('Calendar disconnected', 'success');
  renderPage('calendars');
}

// ─── Webhooks ───────────────────────────────────────────────
async function renderWebhooks(el) {
  const [urls, logs] = await Promise.all([
    fetchJSON('/api/webhook-url'),
    fetchJSON('/webhooks/logs'),
  ]);

  el.innerHTML = `
    <div class="card" style="margin-bottom:20px;">
      <div class="card-header"><h2>Synthflow Webhook URLs</h2></div>
      <div class="card-body">
        <p style="margin-bottom:12px;font-size:14px;color:var(--text-light)">
          Copy these URLs and paste them into your <strong>Synthflow agent's webhook configuration</strong>.
        </p>
        <div style="margin-bottom:16px;">
          <label style="font-size:13px;font-weight:500;display:block;margin-bottom:6px;">Booking Webhook (call completed)</label>
          <div class="webhook-url-box">
            <code id="webhook-booking-url">${urls ? esc(urls.booking) : 'Loading...'}</code>
            <button class="copy-btn" onclick="copyText('webhook-booking-url')">Copy</button>
          </div>
        </div>
        <div>
          <label style="font-size:13px;font-weight:500;display:block;margin-bottom:6px;">Availability Webhook (live call lookup)</label>
          <div class="webhook-url-box">
            <code id="webhook-avail-url">${urls ? esc(urls.availability) : 'Loading...'}</code>
            <button class="copy-btn" onclick="copyText('webhook-avail-url')">Copy</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div class="card-header"><h2>How It Works</h2></div>
      <div class="card-body">
        <div class="setup-steps">
          <div class="setup-step">
            <div class="step-number">1</div>
            <div class="step-content">
              <h3>Voice Agent Receives a Call</h3>
              <p>Your Synthflow agent answers the phone and collects booking details from the caller (name, service, date, time).</p>
            </div>
          </div>
          <div class="setup-step">
            <div class="step-number">2</div>
            <div class="step-content">
              <h3>Synthflow Sends Webhook</h3>
              <p>When the call ends, Synthflow posts the extracted data to your Booking Webhook URL.</p>
            </div>
          </div>
          <div class="setup-step">
            <div class="step-number">3</div>
            <div class="step-content">
              <h3>Availability Check & Calendar Event</h3>
              <p>This app checks your connected calendars for conflicts, picks the best slot, and creates the event automatically.</p>
            </div>
          </div>
          <div class="setup-step">
            <div class="step-number">4</div>
            <div class="step-content">
              <h3>Confirmation Sent Back</h3>
              <p>A booking confirmation is sent back to Synthflow and recorded in your dashboard.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h2>Recent Webhook Events</h2></div>
      <div>
        ${logs && logs.length ? logs.map((log) => `
          <div class="log-entry">
            <div class="log-dot ${log.event === 'call.completed' ? 'success' : 'info'}"></div>
            <span class="log-time">${formatDateTime(log.timestamp)}</span>
            <span class="log-message"><strong>${esc(log.event)}</strong> &mdash; Call ${esc(log.callId || 'N/A')}</span>
          </div>`).join('') : '<div class="empty-state"><h3>No webhook events yet</h3><p>Events will appear here when Synthflow sends data to your webhook.</p></div>'}
      </div>
    </div>`;
}

function copyText(elementId) {
  const text = document.getElementById(elementId).textContent;
  navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard', 'success'));
}

// ─── Service Platforms ──────────────────────────────────────
async function renderPlatforms(el) {
  el.innerHTML = `
    <div class="card" style="margin-bottom:20px;">
      <div class="card-header">
        <h2>Field Service Platform Integrations</h2>
        <button class="btn btn-sm btn-secondary" onclick="testAllProviders()">Test All Connections</button>
      </div>
      <div class="card-body">
        <p style="margin-bottom:20px;font-size:14px;color:var(--text-light)">
          Connect your field service management platform to automatically create jobs and sync customer data when bookings come in.
        </p>
        <div class="provider-grid">
          <div class="provider-card">
            <div class="provider-icon servicetitan">ST</div>
            <h3>ServiceTitan</h3>
            <p>Sync bookings as jobs and manage customers directly in ServiceTitan.</p>
            <button class="btn btn-sm btn-secondary" disabled>Coming Soon</button>
            <div class="provider-status not-connected">Configure in .env</div>
          </div>
          <div class="provider-card">
            <div class="provider-icon housecallpro">HC</div>
            <h3>Housecall Pro</h3>
            <p>Push bookings to Housecall Pro for dispatch and technician assignment.</p>
            <button class="btn btn-sm btn-secondary" disabled>Coming Soon</button>
            <div class="provider-status not-connected">Configure in .env</div>
          </div>
          <div class="provider-card">
            <div class="provider-icon jobber">J</div>
            <h3>Jobber</h3>
            <p>Create quotes and jobs in Jobber automatically from voice bookings.</p>
            <button class="btn btn-sm btn-secondary" disabled>Coming Soon</button>
            <div class="provider-status not-connected">Configure in .env</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h2>Integration Roadmap</h2></div>
      <div class="card-body">
        <div class="setup-steps">
          <div class="setup-step">
            <div class="step-number" style="background:var(--success)">&#10003;</div>
            <div class="step-content">
              <h3>Calendar Providers</h3>
              <p>Google Calendar, Microsoft Outlook, Apple/CalDAV &mdash; Available now.</p>
            </div>
          </div>
          <div class="setup-step">
            <div class="step-number" style="background:var(--warning);color:var(--text)">~</div>
            <div class="step-content">
              <h3>ServiceTitan</h3>
              <p>Job creation, customer lookup, technician dispatch. Provider ready &mdash; add your API keys in .env to enable.</p>
            </div>
          </div>
          <div class="setup-step">
            <div class="step-number" style="background:var(--warning);color:var(--text)">~</div>
            <div class="step-content">
              <h3>Housecall Pro</h3>
              <p>Job creation, customer management, scheduling. Provider ready &mdash; add your API key in .env to enable.</p>
            </div>
          </div>
          <div class="setup-step">
            <div class="step-number" style="background:var(--warning);color:var(--text)">~</div>
            <div class="step-content">
              <h3>Jobber</h3>
              <p>GraphQL-based integration for jobs and clients. Provider ready &mdash; add your credentials in .env to enable.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div id="provider-test-results"></div>`;
}

async function testAllProviders() {
  const resultsEl = document.getElementById('provider-test-results');
  resultsEl.innerHTML = '<p style="padding:16px;color:var(--text-light)">Testing connections...</p>';
  const results = await fetchJSON('/api/settings/providers/test', { method: 'POST' });
  if (results) {
    resultsEl.innerHTML = `<div class="card" style="margin-top:20px;"><div class="card-header"><h2>Connection Results</h2></div><div class="card-body"><pre style="font-size:13px;white-space:pre-wrap;">${JSON.stringify(results, null, 2)}</pre></div></div>`;
  }
}

// ─── Settings ───────────────────────────────────────────────
async function renderSettings(el) {
  const settings = await fetchJSON('/api/settings');
  if (!settings) {
    el.innerHTML = '<p>Failed to load settings.</p>';
    return;
  }

  const bh = settings.businessHours || {};

  el.innerHTML = `
    <form onsubmit="saveSettings(event)" id="settings-form">
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header"><h2>General</h2></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>Business Name</label>
              <input type="text" name="businessName" value="${esc(settings.businessName || '')}">
            </div>
            <div class="form-group">
              <label>Default Calendar Provider</label>
              <select name="defaultCalendarProvider">
                <option value="google" ${settings.defaultCalendarProvider === 'google' ? 'selected' : ''}>Google Calendar</option>
                <option value="microsoft" ${settings.defaultCalendarProvider === 'microsoft' ? 'selected' : ''}>Microsoft Outlook</option>
                <option value="caldav" ${settings.defaultCalendarProvider === 'caldav' ? 'selected' : ''}>CalDAV</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:20px;">
        <div class="card-header"><h2>Booking Defaults</h2></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>Default Duration (minutes)</label>
              <input type="number" name="defaultDuration" value="${settings.defaultDuration || 60}" min="15" step="15">
            </div>
            <div class="form-group">
              <label>Buffer Between Appointments (minutes)</label>
              <input type="number" name="bufferMinutes" value="${settings.bufferMinutes || 15}" min="0" step="5">
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:20px;">
        <div class="card-header"><h2>Business Hours</h2></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>Start Time</label>
              <input type="time" name="bhStart" value="${bh.start || '08:00'}">
            </div>
            <div class="form-group">
              <label>End Time</label>
              <input type="time" name="bhEnd" value="${bh.end || '18:00'}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Timezone</label>
              <input type="text" name="bhTimezone" value="${esc(bh.timezone || 'America/New_York')}">
            </div>
            <div class="form-group">
              <label>Work Days (comma-separated: 1=Mon ... 7=Sun)</label>
              <input type="text" name="bhWorkDays" value="${(bh.workDays || [1,2,3,4,5]).join(',')}">
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;">
        <button type="submit" class="btn btn-primary">Save Settings</button>
      </div>
    </form>`;
}

async function saveSettings(e) {
  e.preventDefault();
  const form = document.getElementById('settings-form');
  const fd = new FormData(form);

  const settings = {
    businessName: fd.get('businessName'),
    defaultCalendarProvider: fd.get('defaultCalendarProvider'),
    defaultDuration: parseInt(fd.get('defaultDuration'), 10),
    bufferMinutes: parseInt(fd.get('bufferMinutes'), 10),
    businessHours: {
      start: fd.get('bhStart'),
      end: fd.get('bhEnd'),
      timezone: fd.get('bhTimezone'),
      workDays: fd.get('bhWorkDays').split(',').map(Number),
    },
  };

  const res = await fetchJSON('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (res) toast('Settings saved', 'success');
}

// ─── New Booking Modal ──────────────────────────────────────
function showNewBookingModal() {
  document.getElementById('booking-form').reset();
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  document.querySelector('[name="date"]').value = today;
  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

async function submitBooking(e) {
  e.preventDefault();
  const form = document.getElementById('booking-form');
  const fd = new FormData(form);

  const duration = parseInt(fd.get('duration'), 10) || 60;
  const startTime = fd.get('startTime');
  const date = fd.get('date');

  // Build ISO start/end times
  const start = new Date(`${date}T${startTime}`);
  const end = new Date(start.getTime() + duration * 60000);

  const booking = {
    customerName: fd.get('customerName'),
    customerPhone: fd.get('customerPhone'),
    customerEmail: fd.get('customerEmail'),
    serviceType: fd.get('serviceType'),
    date,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    duration,
    urgency: fd.get('urgency'),
    address: fd.get('address'),
    notes: fd.get('notes'),
  };

  const res = await fetchJSON('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking),
  });

  if (res) {
    closeModal();
    toast('Booking created', 'success');
    renderPage(currentPage);
  }
}

// ─── Helpers ────────────────────────────────────────────────
async function fetchJSON(url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      toast(err.error || 'Request failed', 'error');
      return null;
    }
    return res.json();
  } catch (err) {
    console.error('Fetch error:', err);
    toast('Network error', 'error');
    return null;
  }
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function capitalize(str) {
  if (!str) return '';
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const d = new Date(timeStr);
  if (isNaN(d)) return timeStr;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDateTime(str) {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function toast(message, type = 'info') {
  const container = document.querySelector('.toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}
