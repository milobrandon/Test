// ─── Synthflow Calendar Booking — Multi-Tenant Admin Frontend ──
const API = '/api';
let currentPage = 'dashboard';
let currentAccountId = null;
let currentAccountTab = 'overview';

// ─── Bootstrap ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  createToastContainer();
  // Handle hash-based deep links
  handleHashRoute();
  window.addEventListener('hashchange', handleHashRoute);
});

function createToastContainer() {
  if (!document.querySelector('.toast-container')) {
    const el = document.createElement('div');
    el.className = 'toast-container';
    document.body.appendChild(el);
  }
}

// ─── Hash Routing ───────────────────────────────────────────
function handleHashRoute() {
  const hash = window.location.hash.slice(1);
  if (!hash) {
    navigate('dashboard');
    return;
  }
  const parts = hash.split('/');
  if (parts[0] === 'account' && parts[1]) {
    currentAccountId = parts[1];
    currentAccountTab = parts[2] || 'overview';
    setActiveSidebarItem('accounts');
    renderAccountDetail(currentAccountId, currentAccountTab);
  } else {
    navigate(parts[0] || 'dashboard');
  }
}

// ─── Navigation ─────────────────────────────────────────────
function initNav() {
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      window.location.hash = item.dataset.page;
    });
  });
}

function setActiveSidebarItem(page) {
  document.querySelectorAll('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}

function navigate(page) {
  currentPage = page;
  currentAccountId = null;
  setActiveSidebarItem(page);
  document.getElementById('breadcrumb').innerHTML = '';
  const titles = {
    dashboard: 'Dashboard',
    accounts: 'Accounts',
    bookings: 'All Bookings',
    platforms: 'Service Platforms',
    settings: 'Settings',
  };
  document.getElementById('page-title').textContent = titles[page] || page;
  renderTopbarActions(page);
  renderPage(page);
}

function renderTopbarActions(page) {
  const el = document.getElementById('topbar-actions');
  if (page === 'accounts') {
    el.innerHTML = '<button class="btn btn-primary" onclick="showNewAccountModal()">+ New Account</button>';
  } else if (page === 'bookings') {
    el.innerHTML = '<button class="btn btn-primary" onclick="showNewBookingModal()">+ New Booking</button>';
  } else {
    el.innerHTML = '';
  }
}

async function renderPage(page) {
  const el = document.getElementById('content');
  switch (page) {
    case 'dashboard': return renderDashboard(el);
    case 'accounts': return renderAccounts(el);
    case 'bookings': return renderAllBookings(el);
    case 'platforms': return renderPlatforms(el);
    case 'settings': return renderSettings(el);
    default: el.innerHTML = '<p>Page not found</p>';
  }
}

// ─── Admin Dashboard ────────────────────────────────────────
async function renderDashboard(el) {
  el.innerHTML = '<p style="color:var(--text-light)">Loading...</p>';
  const [stats, accounts, bookings] = await Promise.all([
    fetchJSON(`${API}/stats`),
    fetchJSON(`${API}/accounts`),
    fetchJSON(`${API}/bookings`),
  ]);
  const recent = (bookings || []).slice(0, 8);
  const acctList = (accounts || []).slice(0, 6);

  el.innerHTML = `
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">${stats.totalAccounts || 0}</div>
        <div class="stat-label">Total Accounts</div>
      </div>
      <div class="stat-card green">
        <div class="stat-value">${stats.activeAccounts || 0}</div>
        <div class="stat-label">Active Accounts</div>
      </div>
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
      <div class="stat-card teal">
        <div class="stat-value">${stats.connectedCalendars || 0}</div>
        <div class="stat-label">Calendars</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.voiceBookings || 0}</div>
        <div class="stat-label">Voice AI</div>
      </div>
      <div class="stat-card red">
        <div class="stat-value">${stats.cancelledBookings || 0}</div>
        <div class="stat-label">Cancelled</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <h2>Recent Accounts</h2>
          <button class="btn btn-sm btn-secondary" onclick="window.location.hash='accounts'">View All</button>
        </div>
        <div class="table-wrap">
          ${acctList.length ? `<table><thead><tr><th>Name</th><th>Status</th><th>Bookings</th><th>Calendars</th></tr></thead><tbody>
            ${acctList.map(a => `<tr class="clickable" onclick="window.location.hash='account/${a.id}'">
              <td><strong>${esc(a.name)}</strong><br><small style="color:var(--text-light)">${esc(a.contactEmail || a.contactName || '')}</small></td>
              <td><span class="badge badge-${a.status}">${capitalize(a.status)}</span></td>
              <td>${a.bookingCount || 0}</td>
              <td>${a.calendarCount || 0}</td>
            </tr>`).join('')}
          </tbody></table>` : `<div class="empty-state"><h3>No accounts yet</h3><p>Create your first client account to get started.</p></div>`}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2>Recent Bookings</h2>
          <button class="btn btn-sm btn-secondary" onclick="window.location.hash='bookings'">View All</button>
        </div>
        <div class="table-wrap">
          ${recent.length ? renderBookingTable(recent, false) : `<div class="empty-state"><h3>No bookings yet</h3><p>Bookings from voice calls will appear here.</p></div>`}
        </div>
      </div>
    </div>`;
}

// ─── Accounts List ──────────────────────────────────────────
async function renderAccounts(el) {
  el.innerHTML = '<p style="color:var(--text-light)">Loading accounts...</p>';
  const accounts = await fetchJSON(`${API}/accounts`);

  if (!accounts || accounts.length === 0) {
    el.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="empty-state-icon">&#128101;</div>
          <h3>No accounts yet</h3>
          <p>Create your first client account to start managing sub-accounts and voice agents.</p>
          <button class="btn btn-primary" style="margin-top:16px" onclick="showNewAccountModal()">+ Create Account</button>
        </div>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="account-grid">
      ${accounts.map(a => `
        <div class="account-card ${a.status !== 'active' ? 'inactive' : ''}" onclick="window.location.hash='account/${a.id}'">
          <div class="account-card-top">
            <div class="account-card-name">${esc(a.name)}</div>
            <span class="badge badge-${a.status}">${capitalize(a.status)}</span>
          </div>
          <div class="account-contact">${esc(a.contactName || '')}${a.contactEmail ? ' &mdash; ' + esc(a.contactEmail) : ''}</div>
          <div class="account-card-stats">
            <div class="account-card-stat"><strong>${a.bookingCount || 0}</strong>Bookings</div>
            <div class="account-card-stat"><strong>${a.confirmedBookings || 0}</strong>Confirmed</div>
            <div class="account-card-stat"><strong>${a.calendarCount || 0}</strong>Calendars</div>
          </div>
        </div>`).join('')}
    </div>`;
}

// ─── Account Detail ─────────────────────────────────────────
async function renderAccountDetail(accountId, tab) {
  const el = document.getElementById('content');
  el.innerHTML = '<p style="color:var(--text-light)">Loading account...</p>';

  const account = await fetchJSON(`${API}/accounts/${accountId}`);
  if (!account) {
    el.innerHTML = '<div class="card"><div class="empty-state"><h3>Account not found</h3></div></div>';
    return;
  }

  document.getElementById('page-title').textContent = account.name;
  document.getElementById('breadcrumb').innerHTML = `<a href="#accounts">Accounts</a> / ${esc(account.name)}`;
  document.getElementById('topbar-actions').innerHTML = `
    <button class="btn btn-secondary btn-sm" onclick="showEditAccountModal('${accountId}')">Edit Account</button>
    <button class="btn btn-primary btn-sm" onclick="showNewBookingModalForAccount('${accountId}')">+ New Booking</button>`;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'bookings', label: 'Bookings' },
    { id: 'calendars', label: 'Calendars' },
    { id: 'webhooks', label: 'Webhooks' },
    { id: 'settings', label: 'Settings' },
  ];

  const tabsHtml = `<div class="tabs">${tabs.map(t =>
    `<div class="tab ${tab === t.id ? 'active' : ''}" onclick="window.location.hash='account/${accountId}/${t.id}'">${t.label}</div>`
  ).join('')}</div>`;

  const contentHtml = await renderAccountTab(account, tab);
  el.innerHTML = tabsHtml + contentHtml;
}

async function renderAccountTab(account, tab) {
  switch (tab) {
    case 'overview': return renderAccountOverview(account);
    case 'bookings': return renderAccountBookings(account);
    case 'calendars': return renderAccountCalendars(account);
    case 'webhooks': return renderAccountWebhooks(account);
    case 'settings': return renderAccountSettings(account);
    default: return renderAccountOverview(account);
  }
}

async function renderAccountOverview(account) {
  const stats = await fetchJSON(`${API}/accounts/${account.id}/stats`);
  return `
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
        <div class="stat-label">Voice AI</div>
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
        <div class="card-header"><h2>Account Details</h2></div>
        <div class="card-body">
          <table>
            <tbody>
              <tr><td style="font-weight:600;width:140px;">Name</td><td>${esc(account.name)}</td></tr>
              <tr><td style="font-weight:600">Contact</td><td>${esc(account.contactName || '—')}</td></tr>
              <tr><td style="font-weight:600">Email</td><td>${esc(account.contactEmail || '—')}</td></tr>
              <tr><td style="font-weight:600">Phone</td><td>${esc(account.contactPhone || '—')}</td></tr>
              <tr><td style="font-weight:600">Agent ID</td><td>${esc(account.synthflowAgentId || '—')}</td></tr>
              <tr><td style="font-weight:600">Status</td><td><span class="badge badge-${account.status}">${capitalize(account.status)}</span></td></tr>
              <tr><td style="font-weight:600">Slug</td><td><code>${esc(account.slug)}</code></td></tr>
              <tr><td style="font-weight:600">Created</td><td>${formatDateTime(account.createdAt)}</td></tr>
              ${account.notes ? `<tr><td style="font-weight:600">Notes</td><td>${esc(account.notes)}</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h2>Webhook URLs</h2></div>
        <div class="card-body">
          <p style="font-size:13px;color:var(--text-light);margin-bottom:12px">Configure these in the Synthflow agent for this account.</p>
          <div style="margin-bottom:16px;">
            <label style="font-size:13px;font-weight:500;display:block;margin-bottom:6px;">Booking Webhook</label>
            <div class="webhook-url-box">
              <code id="wh-booking-${account.id}">${esc(account.webhookUrl)}</code>
              <button class="copy-btn" onclick="copyText('wh-booking-${account.id}')">Copy</button>
            </div>
          </div>
          <div>
            <label style="font-size:13px;font-weight:500;display:block;margin-bottom:6px;">Availability Webhook</label>
            <div class="webhook-url-box">
              <code id="wh-avail-${account.id}">${esc(account.webhookAvailabilityUrl)}</code>
              <button class="copy-btn" onclick="copyText('wh-avail-${account.id}')">Copy</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

async function renderAccountBookings(account) {
  const bookings = await fetchJSON(`${API}/accounts/${account.id}/bookings`);
  if (!bookings || bookings.length === 0) {
    return `<div class="card"><div class="empty-state"><h3>No bookings yet</h3><p>Bookings for this account will appear here.</p>
      <button class="btn btn-primary" style="margin-top:12px" onclick="showNewBookingModalForAccount('${account.id}')">+ New Booking</button></div></div>`;
  }
  return `
    <div class="card">
      <div class="card-header">
        <h2>Bookings (${bookings.length})</h2>
        <button class="btn btn-primary btn-sm" onclick="showNewBookingModalForAccount('${account.id}')">+ New Booking</button>
      </div>
      <div class="table-wrap">${renderBookingTable(bookings, true)}</div>
    </div>`;
}

async function renderAccountCalendars(account) {
  const calendars = await fetchJSON(`${API}/accounts/${account.id}/calendars`);
  return `
    <div class="card" style="margin-bottom:20px;">
      <div class="card-header"><h2>Connect a Calendar</h2></div>
      <div class="card-body">
        <div class="info-box">Calendar connections are specific to this account. Each account can have its own Google, Outlook, or CalDAV calendars.</div>
        <div class="provider-grid">
          <div class="provider-card ${hasProvider(calendars, 'google') ? 'connected' : ''}">
            <div class="provider-icon google">G</div>
            <h3>Google Calendar</h3>
            <p>Connect this account's Google Calendar.</p>
            <a href="/auth/google?accountId=${account.id}" class="btn btn-primary btn-sm">Connect Google</a>
            ${hasProvider(calendars, 'google') ? '<div class="provider-status connected">Connected</div>' : ''}
          </div>
          <div class="provider-card ${hasProvider(calendars, 'microsoft') ? 'connected' : ''}">
            <div class="provider-icon microsoft">M</div>
            <h3>Microsoft Outlook</h3>
            <p>Connect this account's Outlook calendar.</p>
            <a href="/auth/microsoft?accountId=${account.id}" class="btn btn-primary btn-sm">Connect Outlook</a>
            ${hasProvider(calendars, 'microsoft') ? '<div class="provider-status connected">Connected</div>' : ''}
          </div>
          <div class="provider-card ${hasProvider(calendars, 'caldav') ? 'connected' : ''}">
            <div class="provider-icon caldav">C</div>
            <h3>Apple / CalDAV</h3>
            <p>Connect a CalDAV-compatible calendar.</p>
            <button class="btn btn-primary btn-sm" onclick="connectCalDAVForAccount('${account.id}')">Connect CalDAV</button>
            ${hasProvider(calendars, 'caldav') ? '<div class="provider-status connected">Connected</div>' : ''}
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h2>Connected Calendars</h2></div>
      <div class="card-body">
        ${calendars && calendars.length ? calendars.map(cal => `
          <div class="cal-list-item">
            <div class="cal-info">
              <div class="cal-dot" style="background:${providerColor(cal.provider)}"></div>
              <div>
                <strong>${esc(cal.name)}</strong>
                <div style="font-size:12px;color:var(--text-light)">${capitalize(cal.provider)}${cal.isDefault ? ' &mdash; Default' : ''}</div>
              </div>
            </div>
            <div class="cal-actions">
              ${!cal.isDefault ? `<button class="btn btn-sm btn-secondary" onclick="setDefaultCalendarForAccount('${account.id}','${cal.id}')">Set Default</button>` : '<span class="badge badge-confirmed">Default</span>'}
              <button class="btn btn-sm btn-danger" onclick="disconnectCalendarFromAccount('${account.id}','${cal.id}')">Disconnect</button>
            </div>
          </div>`).join('') : '<div class="empty-state"><h3>No calendars connected</h3><p>Connect a calendar provider above to receive bookings for this account.</p></div>'}
      </div>
    </div>`;
}

async function renderAccountWebhooks(account) {
  const logs = await fetchJSON(`${API}/accounts/${account.id}/webhook-logs`);
  return `
    <div class="card" style="margin-bottom:20px;">
      <div class="card-header"><h2>Webhook URLs for ${esc(account.name)}</h2></div>
      <div class="card-body">
        <p style="margin-bottom:12px;font-size:14px;color:var(--text-light)">
          Copy these URLs into the <strong>Synthflow agent configuration</strong> for this account.
        </p>
        <div style="margin-bottom:16px;">
          <label style="font-size:13px;font-weight:500;display:block;margin-bottom:6px;">Booking Webhook (call completed)</label>
          <div class="webhook-url-box">
            <code id="wh-log-booking-${account.id}">${esc(account.webhookUrl)}</code>
            <button class="copy-btn" onclick="copyText('wh-log-booking-${account.id}')">Copy</button>
          </div>
        </div>
        <div>
          <label style="font-size:13px;font-weight:500;display:block;margin-bottom:6px;">Availability Check (live call)</label>
          <div class="webhook-url-box">
            <code id="wh-log-avail-${account.id}">${esc(account.webhookAvailabilityUrl)}</code>
            <button class="copy-btn" onclick="copyText('wh-log-avail-${account.id}')">Copy</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h2>Webhook Event Log</h2></div>
      <div>
        ${logs && logs.length ? logs.map(log => `
          <div class="log-entry">
            <div class="log-dot ${log.event === 'call.completed' ? 'success' : 'info'}"></div>
            <span class="log-time">${formatDateTime(log.timestamp)}</span>
            <span class="log-message"><strong>${esc(log.event)}</strong> &mdash; Call ${esc(log.callId || 'N/A')}</span>
          </div>`).join('') : '<div class="empty-state"><h3>No webhook events yet</h3><p>Events appear here when Synthflow sends data to this account\'s webhook.</p></div>'}
      </div>
    </div>`;
}

async function renderAccountSettings(account) {
  const settings = await fetchJSON(`${API}/accounts/${account.id}/settings`);
  if (!settings) return '<p>Failed to load settings.</p>';
  const bh = settings.businessHours || {};

  return `
    <form onsubmit="saveAccountSettings(event, '${account.id}')" id="account-settings-form">
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
        <button type="submit" class="btn btn-primary">Save Account Settings</button>
      </div>
    </form>`;
}

// ─── Account Actions ────────────────────────────────────────
async function connectCalDAVForAccount(accountId) {
  const res = await fetchJSON(`/auth/caldav/connect?accountId=${accountId}`, { method: 'POST' });
  if (res && res.success) {
    toast('CalDAV connected', 'success');
    window.location.hash = `account/${accountId}/calendars`;
    renderAccountDetail(accountId, 'calendars');
  } else {
    toast('CalDAV connection failed. Check server credentials in .env', 'error');
  }
}

async function setDefaultCalendarForAccount(accountId, calId) {
  await fetchJSON(`${API}/accounts/${accountId}/calendars/${calId}/default`, { method: 'PUT' });
  toast('Default calendar updated', 'success');
  renderAccountDetail(accountId, 'calendars');
}

async function disconnectCalendarFromAccount(accountId, calId) {
  if (!confirm('Disconnect this calendar?')) return;
  await fetchJSON(`${API}/accounts/${accountId}/calendars/${calId}`, { method: 'DELETE' });
  toast('Calendar disconnected', 'success');
  renderAccountDetail(accountId, 'calendars');
}

async function saveAccountSettings(e, accountId) {
  e.preventDefault();
  const form = document.getElementById('account-settings-form');
  const fd = new FormData(form);
  const settings = {
    defaultDuration: parseInt(fd.get('defaultDuration'), 10),
    bufferMinutes: parseInt(fd.get('bufferMinutes'), 10),
    businessHours: {
      start: fd.get('bhStart'),
      end: fd.get('bhEnd'),
      timezone: fd.get('bhTimezone'),
      workDays: fd.get('bhWorkDays').split(',').map(Number),
    },
  };
  const res = await fetchJSON(`${API}/accounts/${accountId}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (res) toast('Account settings saved', 'success');
}

async function deleteAccount(accountId) {
  if (!confirm('Delete this account and ALL its data (bookings, calendars, logs)? This cannot be undone.')) return;
  const res = await fetchJSON(`${API}/accounts/${accountId}`, { method: 'DELETE' });
  if (res) {
    toast('Account deleted', 'success');
    window.location.hash = 'accounts';
  }
}

// ─── All Bookings (Admin) ───────────────────────────────────
async function renderAllBookings(el) {
  el.innerHTML = '<p style="color:var(--text-light)">Loading bookings...</p>';
  const [bookings, accounts] = await Promise.all([
    fetchJSON(`${API}/bookings`),
    fetchJSON(`${API}/accounts`),
  ]);

  const acctMap = {};
  (accounts || []).forEach(a => { acctMap[a.id] = a.name; });

  if (!bookings || bookings.length === 0) {
    el.innerHTML = `<div class="card"><div class="empty-state"><h3>No bookings yet</h3><p>Create a manual booking or let a Synthflow voice agent create one.</p></div></div>`;
    return;
  }

  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>All Bookings (${bookings.length})</h2>
        <div style="display:flex;gap:8px;">
          <select id="filter-account" onchange="filterAllBookings()" style="padding:5px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:13px;">
            <option value="">All Accounts</option>
            ${(accounts || []).map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}
          </select>
          <select id="filter-status" onchange="filterAllBookings()" style="padding:5px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:13px;">
            <option value="">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="pending_calendar">Pending</option>
          </select>
          <select id="filter-source" onchange="filterAllBookings()" style="padding:5px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:13px;">
            <option value="">All Sources</option>
            <option value="synthflow">Voice AI</option>
            <option value="manual">Manual</option>
          </select>
        </div>
      </div>
      <div class="table-wrap" id="bookings-table-wrap">
        ${renderBookingTableAdmin(bookings, acctMap)}
      </div>
    </div>`;
}

async function filterAllBookings() {
  const accountId = document.getElementById('filter-account').value;
  const status = document.getElementById('filter-status').value;
  const source = document.getElementById('filter-source').value;
  let url = `${API}/bookings?`;
  if (accountId) url += `accountId=${accountId}&`;
  if (status) url += `status=${status}&`;
  if (source) url += `source=${source}&`;
  const [bookings, accounts] = await Promise.all([
    fetchJSON(url),
    fetchJSON(`${API}/accounts`),
  ]);
  const acctMap = {};
  (accounts || []).forEach(a => { acctMap[a.id] = a.name; });
  document.getElementById('bookings-table-wrap').innerHTML = renderBookingTableAdmin(bookings || [], acctMap);
}

function renderBookingTableAdmin(bookings, acctMap) {
  return `<table><thead><tr>
    <th>Customer</th><th>Account</th><th>Service</th><th>Date & Time</th><th>Source</th><th>Status</th><th>Actions</th>
  </tr></thead><tbody>
    ${bookings.map(b => `<tr>
      <td><strong>${esc(b.customerName)}</strong><br><small style="color:var(--text-light)">${esc(b.customerPhone || '')}</small></td>
      <td><a href="#account/${b.accountId}" style="color:var(--primary);text-decoration:none">${esc(acctMap[b.accountId] || 'Unknown')}</a></td>
      <td>${esc(b.serviceType || '—')}</td>
      <td>${formatDate(b.date)}<br><small style="color:var(--text-light)">${formatTime(b.startTime)}</small></td>
      <td><span class="badge badge-${b.source === 'synthflow' ? 'voice' : 'manual'}">${b.source === 'synthflow' ? 'Voice AI' : 'Manual'}</span></td>
      <td><span class="badge badge-${b.status}">${capitalize(b.status)}</span></td>
      <td>${b.status === 'confirmed' ? `<button class="btn btn-sm btn-danger" onclick="cancelBooking('${b.id}')">Cancel</button>` : ''}</td>
    </tr>`).join('')}
  </tbody></table>`;
}

// ─── Basic Booking Table (no account column) ────────────────
function renderBookingTable(bookings, showActions) {
  return `<table><thead><tr>
    <th>Customer</th><th>Service</th><th>Date & Time</th><th>Source</th><th>Status</th>
    ${showActions ? '<th>Actions</th>' : ''}
  </tr></thead><tbody>
    ${bookings.map(b => `<tr>
      <td><strong>${esc(b.customerName)}</strong><br><small style="color:var(--text-light)">${esc(b.customerPhone || '')}</small></td>
      <td>${esc(b.serviceType || '—')}</td>
      <td>${formatDate(b.date)}<br><small style="color:var(--text-light)">${formatTime(b.startTime)}</small></td>
      <td><span class="badge badge-${b.source === 'synthflow' ? 'voice' : 'manual'}">${b.source === 'synthflow' ? 'Voice AI' : 'Manual'}</span></td>
      <td><span class="badge badge-${b.status}">${capitalize(b.status)}</span></td>
      ${showActions ? `<td>${b.status === 'confirmed' ? `<button class="btn btn-sm btn-danger" onclick="cancelBooking('${b.id}')">Cancel</button>` : ''}</td>` : ''}
    </tr>`).join('')}
  </tbody></table>`;
}

async function cancelBooking(id) {
  if (!confirm('Cancel this booking? The calendar event will also be removed.')) return;
  const res = await fetchJSON(`${API}/bookings/${id}/cancel`, { method: 'POST' });
  if (res) {
    toast('Booking cancelled', 'success');
    handleHashRoute();
  }
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
    <div id="provider-test-results"></div>`;
}

async function testAllProviders() {
  const resultsEl = document.getElementById('provider-test-results');
  resultsEl.innerHTML = '<p style="padding:16px;color:var(--text-light)">Testing connections...</p>';
  const results = await fetchJSON(`${API}/settings/providers/test`, { method: 'POST' });
  if (results) {
    resultsEl.innerHTML = `<div class="card"><div class="card-header"><h2>Connection Results</h2></div><div class="card-body"><pre style="font-size:13px;white-space:pre-wrap;">${JSON.stringify(results, null, 2)}</pre></div></div>`;
  }
}

// ─── Global Settings ────────────────────────────────────────
async function renderSettings(el) {
  const settings = await fetchJSON(`${API}/settings`);
  if (!settings) { el.innerHTML = '<p>Failed to load settings.</p>'; return; }
  const bh = settings.businessHours || {};

  el.innerHTML = `
    <form onsubmit="saveGlobalSettings(event)" id="settings-form">
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header"><h2>General</h2></div>
        <div class="card-body">
          <div class="info-box">These are global admin settings. Each account can override booking defaults and business hours in their own settings.</div>
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
        <div class="card-header"><h2>Default Booking Settings</h2></div>
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
        <div class="card-header"><h2>Default Business Hours</h2></div>
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

async function saveGlobalSettings(e) {
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
  const res = await fetchJSON(`${API}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (res) toast('Settings saved', 'success');
}

// ─── Modals ─────────────────────────────────────────────────
function openModal(title, bodyHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

// New Account Modal
function showNewAccountModal() {
  openModal('New Account', `
    <form onsubmit="submitNewAccount(event)">
      <div class="form-row">
        <div class="form-group">
          <label>Account Name *</label>
          <input type="text" name="name" required placeholder="e.g., Acme Plumbing">
        </div>
        <div class="form-group">
          <label>Contact Name</label>
          <input type="text" name="contactName" placeholder="John Smith">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Contact Email</label>
          <input type="email" name="contactEmail" placeholder="john@example.com">
        </div>
        <div class="form-group">
          <label>Contact Phone</label>
          <input type="tel" name="contactPhone" placeholder="(555) 123-4567">
        </div>
      </div>
      <div class="form-group">
        <label>Synthflow Agent ID</label>
        <input type="text" name="synthflowAgentId" placeholder="The Synthflow agent ID for this account">
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea name="notes" rows="2" placeholder="Internal notes about this client..."></textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create Account</button>
      </div>
    </form>`);
}

async function submitNewAccount(e) {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  const account = {
    name: fd.get('name'),
    contactName: fd.get('contactName'),
    contactEmail: fd.get('contactEmail'),
    contactPhone: fd.get('contactPhone'),
    synthflowAgentId: fd.get('synthflowAgentId'),
    notes: fd.get('notes'),
  };
  const res = await fetchJSON(`${API}/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(account),
  });
  if (res) {
    closeModal();
    toast('Account created', 'success');
    window.location.hash = `account/${res.id}`;
  }
}

// Edit Account Modal
async function showEditAccountModal(accountId) {
  const account = await fetchJSON(`${API}/accounts/${accountId}`);
  if (!account) return;
  openModal('Edit Account', `
    <form onsubmit="submitEditAccount(event, '${accountId}')">
      <div class="form-row">
        <div class="form-group">
          <label>Account Name *</label>
          <input type="text" name="name" value="${esc(account.name)}" required>
        </div>
        <div class="form-group">
          <label>Contact Name</label>
          <input type="text" name="contactName" value="${esc(account.contactName || '')}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Contact Email</label>
          <input type="email" name="contactEmail" value="${esc(account.contactEmail || '')}">
        </div>
        <div class="form-group">
          <label>Contact Phone</label>
          <input type="tel" name="contactPhone" value="${esc(account.contactPhone || '')}">
        </div>
      </div>
      <div class="form-group">
        <label>Synthflow Agent ID</label>
        <input type="text" name="synthflowAgentId" value="${esc(account.synthflowAgentId || '')}">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select name="status">
          <option value="active" ${account.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="inactive" ${account.status === 'inactive' ? 'selected' : ''}>Inactive</option>
        </select>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea name="notes" rows="2">${esc(account.notes || '')}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-danger" onclick="deleteAccount('${accountId}');closeModal();">Delete Account</button>
        <div style="flex:1"></div>
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Changes</button>
      </div>
    </form>`);
}

async function submitEditAccount(e, accountId) {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  const updates = {
    name: fd.get('name'),
    contactName: fd.get('contactName'),
    contactEmail: fd.get('contactEmail'),
    contactPhone: fd.get('contactPhone'),
    synthflowAgentId: fd.get('synthflowAgentId'),
    status: fd.get('status'),
    notes: fd.get('notes'),
  };
  const res = await fetchJSON(`${API}/accounts/${accountId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (res) {
    closeModal();
    toast('Account updated', 'success');
    renderAccountDetail(accountId, currentAccountTab);
  }
}

// New Booking Modal (for specific account)
function showNewBookingModalForAccount(accountId) {
  const today = new Date().toISOString().split('T')[0];
  openModal('New Booking', `
    <form onsubmit="submitBooking(event, '${accountId}')">
      <div class="form-row">
        <div class="form-group">
          <label>Customer Name *</label>
          <input type="text" name="customerName" required placeholder="John Smith">
        </div>
        <div class="form-group">
          <label>Phone *</label>
          <input type="tel" name="customerPhone" required placeholder="(555) 123-4567">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="customerEmail" placeholder="john@example.com">
        </div>
        <div class="form-group">
          <label>Service Type</label>
          <input type="text" name="serviceType" placeholder="e.g., HVAC Repair">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Date *</label>
          <input type="date" name="date" required value="${today}">
        </div>
        <div class="form-group">
          <label>Time *</label>
          <input type="time" name="startTime" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Duration (minutes)</label>
          <input type="number" name="duration" value="60" min="15" step="15">
        </div>
        <div class="form-group">
          <label>Urgency</label>
          <select name="urgency">
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Address</label>
        <input type="text" name="address" placeholder="123 Main St, City, State">
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea name="notes" rows="2" placeholder="Special instructions..."></textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create Booking</button>
      </div>
    </form>`);
}

// New Booking Modal (from all bookings page — select account)
async function showNewBookingModal() {
  const accounts = await fetchJSON(`${API}/accounts`);
  if (!accounts || accounts.length === 0) {
    toast('Create an account first before adding a booking', 'error');
    return;
  }
  const today = new Date().toISOString().split('T')[0];
  openModal('New Booking', `
    <form onsubmit="submitBookingWithAccount(event)">
      <div class="form-group">
        <label>Account *</label>
        <select name="accountId" required>
          <option value="">Select an account...</option>
          ${accounts.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Customer Name *</label>
          <input type="text" name="customerName" required placeholder="John Smith">
        </div>
        <div class="form-group">
          <label>Phone *</label>
          <input type="tel" name="customerPhone" required placeholder="(555) 123-4567">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="customerEmail" placeholder="john@example.com">
        </div>
        <div class="form-group">
          <label>Service Type</label>
          <input type="text" name="serviceType" placeholder="e.g., HVAC Repair">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Date *</label>
          <input type="date" name="date" required value="${today}">
        </div>
        <div class="form-group">
          <label>Time *</label>
          <input type="time" name="startTime" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Duration (minutes)</label>
          <input type="number" name="duration" value="60" min="15" step="15">
        </div>
        <div class="form-group">
          <label>Urgency</label>
          <select name="urgency">
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Address</label>
        <input type="text" name="address" placeholder="123 Main St, City, State">
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea name="notes" rows="2" placeholder="Special instructions..."></textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create Booking</button>
      </div>
    </form>`);
}

async function submitBooking(e, accountId) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const duration = parseInt(fd.get('duration'), 10) || 60;
  const startTime = fd.get('startTime');
  const date = fd.get('date');
  const start = new Date(`${date}T${startTime}`);
  const end = new Date(start.getTime() + duration * 60000);

  const booking = {
    accountId,
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
  const res = await fetchJSON(`${API}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking),
  });
  if (res) {
    closeModal();
    toast('Booking created', 'success');
    handleHashRoute();
  }
}

async function submitBookingWithAccount(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const accountId = fd.get('accountId');
  if (!accountId) { toast('Please select an account', 'error'); return; }
  await submitBooking(e, accountId);
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
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
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

function hasProvider(calendars, provider) {
  return calendars && calendars.some(c => c.provider === provider);
}

function providerColor(provider) {
  const colors = { google: '#4285f4', microsoft: '#00a4ef', caldav: '#333' };
  return colors[provider] || '#6c5ce7';
}

function copyText(elementId) {
  const text = document.getElementById(elementId).textContent;
  navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard', 'success'));
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
