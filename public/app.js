// ─── Relay Systems — Multi-Tenant Admin + Client Frontend ───
const API = '/api';
let currentPage = 'dashboard';
let currentAccountId = null;
let currentAccountTab = 'overview';
let authToken = localStorage.getItem('relay_token');
let currentUser = null;

// ─── Bootstrap ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  createToastContainer();
  if (authToken) {
    const valid = await loadCurrentUser();
    if (valid) { showApp(); return; }
  }
  showAuthScreen();
});

function createToastContainer() {
  if (!document.querySelector('.toast-container')) {
    const el = document.createElement('div');
    el.className = 'toast-container';
    document.body.appendChild(el);
  }
}

// ─── Auth Screen ────────────────────────────────────────────
async function showAuthScreen() {
  document.getElementById('app').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  const status = await fetch(`${API}/setup-status`).then(r => r.json()).catch(() => ({ setupRequired: false }));
  if (status.setupRequired) {
    renderSetupForm();
  } else {
    renderLoginForm();
  }
}

function renderLoginForm() {
  document.getElementById('auth-subtitle').textContent = 'Sign in to your account';
  document.getElementById('auth-form-container').innerHTML = `
    <form onsubmit="handleLogin(event)">
      <div id="auth-error"></div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" name="email" required autofocus>
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" name="password" required>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:11px;">Sign In</button>
    </form>`;
}

function renderSetupForm() {
  document.getElementById('auth-subtitle').textContent = 'Create your admin account to get started';
  document.getElementById('auth-form-container').innerHTML = `
    <form onsubmit="handleSetup(event)">
      <div id="auth-error"></div>
      <div class="form-group">
        <label>Your Name</label>
        <input type="text" name="name" required autofocus placeholder="Admin">
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" name="email" required placeholder="admin@example.com">
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" name="password" required minlength="6" placeholder="Min 6 characters">
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:11px;">Create Admin Account</button>
    </form>`;
}

async function handleLogin(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const errEl = document.getElementById('auth-error');
  errEl.innerHTML = '';
  const res = await fetch(`${API}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }),
  });
  const data = await res.json();
  if (!res.ok) { errEl.innerHTML = `<div class="auth-error">${esc(data.error)}</div>`; return; }
  authToken = data.token;
  localStorage.setItem('relay_token', authToken);
  currentUser = data.user;
  showApp();
}

async function handleSetup(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const errEl = document.getElementById('auth-error');
  errEl.innerHTML = '';
  const res = await fetch(`${API}/users/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: fd.get('name'), email: fd.get('email'), password: fd.get('password') }),
  });
  const data = await res.json();
  if (!res.ok) { errEl.innerHTML = `<div class="auth-error">${esc(data.error)}</div>`; return; }
  authToken = data.token;
  localStorage.setItem('relay_token', authToken);
  currentUser = data.user;
  showApp();
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('relay_token');
  showAuthScreen();
}

async function loadCurrentUser() {
  const res = await fetchJSON(`${API}/users/me`);
  if (!res) { authToken = null; localStorage.removeItem('relay_token'); return false; }
  currentUser = res;
  return true;
}

// ─── Show App ───────────────────────────────────────────────
function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('user-label').textContent = `${currentUser.name} (${currentUser.role})`;
  document.getElementById('sidebar-role-label').textContent = currentUser.role === 'admin' ? 'Admin Dashboard' : 'Client Dashboard';
  buildNavMenu();
  handleHashRoute();
  window.onhashchange = handleHashRoute;
}

function buildNavMenu() {
  const menu = document.getElementById('nav-menu');
  const isAdmin = currentUser.role === 'admin';
  const items = isAdmin ? [
    { id: 'dashboard', icon: gridIcon, label: 'Dashboard' },
    { id: 'accounts', icon: usersIcon, label: 'Accounts' },
    { id: 'bookings', icon: calIcon, label: 'All Bookings' },
    { id: 'call-logs', icon: phoneIcon, label: 'Call Logs' },
    { id: 'users', icon: userIcon, label: 'Users' },
    { id: 'platforms', icon: boxIcon, label: 'Service Platforms' },
    { id: 'settings', icon: gearIcon, label: 'Settings' },
  ] : [
    { id: 'dashboard', icon: gridIcon, label: 'Dashboard' },
    { id: 'bookings', icon: calIcon, label: 'Bookings' },
    { id: 'call-logs', icon: phoneIcon, label: 'Call Logs' },
  ];
  menu.innerHTML = items.map(i => `<li class="nav-item" data-page="${i.id}">${i.icon}${i.label}</li>`).join('');
  menu.querySelectorAll('.nav-item').forEach(el => el.addEventListener('click', () => { window.location.hash = el.dataset.page; }));
}

// SVG icons
const gridIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>';
const usersIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
const calIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
const phoneIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
const userIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
const boxIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 0 0-8 0v2"/></svg>';
const gearIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

// ─── Hash Routing ───────────────────────────────────────────
function handleHashRoute() {
  const hash = window.location.hash.slice(1);
  if (!hash) { navigate('dashboard'); return; }
  const parts = hash.split('/');
  if (parts[0] === 'account' && parts[1]) {
    currentAccountId = parts[1];
    currentAccountTab = parts[2] || 'overview';
    setActive('accounts');
    renderAccountDetail(currentAccountId, currentAccountTab);
  } else if (parts[0] === 'call-log' && parts[1]) {
    setActive('call-logs');
    renderCallLogDetail(parts[1]);
  } else {
    navigate(parts[0] || 'dashboard');
  }
}

function setActive(page) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
}

function navigate(page) {
  // Client users get redirected to their account for certain pages
  if (currentUser.role === 'client' && (page === 'accounts' || page === 'users' || page === 'platforms' || page === 'settings')) {
    window.location.hash = 'dashboard';
    return;
  }
  currentPage = page;
  currentAccountId = null;
  setActive(page);
  document.getElementById('breadcrumb').innerHTML = '';
  const titles = { dashboard:'Dashboard', accounts:'Accounts', bookings: currentUser.role === 'admin' ? 'All Bookings' : 'Bookings', 'call-logs':'Call Logs', users:'Users', platforms:'Service Platforms', settings:'Settings' };
  document.getElementById('page-title').textContent = titles[page] || page;
  renderTopbarActions(page);
  renderPage(page);
}

function renderTopbarActions(page) {
  const el = document.getElementById('topbar-actions');
  const isAdmin = currentUser.role === 'admin';
  if (page === 'accounts' && isAdmin) el.innerHTML = '<button class="btn btn-primary" onclick="showNewAccountModal()">+ New Account</button>';
  else if (page === 'bookings') el.innerHTML = '<button class="btn btn-primary" onclick="showNewBookingModal()">+ New Booking</button>';
  else if (page === 'users' && isAdmin) el.innerHTML = '<button class="btn btn-primary" onclick="showInviteUserModal()">+ Invite User</button>';
  else el.innerHTML = '';
}

async function renderPage(page) {
  const el = document.getElementById('content');
  const isAdmin = currentUser.role === 'admin';
  switch (page) {
    case 'dashboard': return isAdmin ? renderAdminDashboard(el) : renderClientDashboard(el);
    case 'accounts': return renderAccounts(el);
    case 'bookings': return renderAllBookings(el);
    case 'call-logs': return renderCallLogs(el);
    case 'users': return renderUsers(el);
    case 'platforms': return renderPlatforms(el);
    case 'settings': return renderSettings(el);
    default: el.innerHTML = '<p>Page not found</p>';
  }
}

// ─── Admin Dashboard ────────────────────────────────────────
async function renderAdminDashboard(el) {
  el.innerHTML = '<p style="color:var(--text-light)">Loading...</p>';
  const [stats, accounts, bookings] = await Promise.all([fetchJSON(`${API}/stats`), fetchJSON(`${API}/accounts`), fetchJSON(`${API}/bookings`)]);
  const recent = (bookings || []).slice(0, 8);
  const acctList = (accounts || []).slice(0, 6);
  el.innerHTML = `
    <div class="stats-row">
      <div class="stat-card"><div class="stat-value">${stats.totalAccounts||0}</div><div class="stat-label">Accounts</div></div>
      <div class="stat-card green"><div class="stat-value">${stats.activeAccounts||0}</div><div class="stat-label">Active</div></div>
      <div class="stat-card"><div class="stat-value">${stats.totalUsers||0}</div><div class="stat-label">Users</div></div>
      <div class="stat-card"><div class="stat-value">${stats.totalBookings||0}</div><div class="stat-label">Bookings</div></div>
      <div class="stat-card green"><div class="stat-value">${stats.confirmedBookings||0}</div><div class="stat-label">Confirmed</div></div>
      <div class="stat-card orange"><div class="stat-value">${stats.todayBookings||0}</div><div class="stat-label">Today</div></div>
      <div class="stat-card teal"><div class="stat-value">${stats.totalCalls||0}</div><div class="stat-label">Total Calls</div></div>
      <div class="stat-card red"><div class="stat-value">${stats.cancelledBookings||0}</div><div class="stat-label">Cancelled</div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h2>Recent Accounts</h2><button class="btn btn-sm btn-secondary" onclick="window.location.hash='accounts'">View All</button></div>
        <div class="table-wrap">${acctList.length ? `<table><thead><tr><th>Name</th><th>Status</th><th>Bookings</th></tr></thead><tbody>
          ${acctList.map(a=>`<tr class="clickable" onclick="window.location.hash='account/${a.id}'"><td><strong>${esc(a.name)}</strong><br><small style="color:var(--text-light)">${esc(a.contactEmail||'')}</small></td><td><span class="badge badge-${a.status}">${cap(a.status)}</span></td><td>${a.bookingCount||0}</td></tr>`).join('')}
        </tbody></table>` : '<div class="empty-state"><h3>No accounts yet</h3></div>'}</div>
      </div>
      <div class="card">
        <div class="card-header"><h2>Recent Bookings</h2><button class="btn btn-sm btn-secondary" onclick="window.location.hash='bookings'">View All</button></div>
        <div class="table-wrap">${recent.length ? renderBookingTable(recent,false) : '<div class="empty-state"><h3>No bookings yet</h3></div>'}</div>
      </div>
    </div>`;
}

// ─── Client Dashboard (Voice Agent Performance) ─────────────
async function renderClientDashboard(el) {
  el.innerHTML = '<p style="color:var(--text-light)">Loading...</p>';
  const accountId = currentUser.accountId;
  const [stats, callStats, bookings] = await Promise.all([
    fetchJSON(`${API}/stats`),
    fetchJSON(`${API}/call-logs/account/${accountId}/stats`),
    fetchJSON(`${API}/bookings?accountId=${accountId}`),
  ]);
  const recent = (bookings || []).slice(0, 5);

  el.innerHTML = `
    <div class="stats-row">
      <div class="stat-card"><div class="stat-value">${stats.totalBookings||0}</div><div class="stat-label">Total Bookings</div></div>
      <div class="stat-card green"><div class="stat-value">${stats.confirmedBookings||0}</div><div class="stat-label">Confirmed</div></div>
      <div class="stat-card orange"><div class="stat-value">${stats.todayBookings||0}</div><div class="stat-label">Today</div></div>
      <div class="stat-card teal"><div class="stat-value">${callStats.totalCalls||0}</div><div class="stat-label">Total Calls</div></div>
      <div class="stat-card green"><div class="stat-value">${callStats.bookingRate||0}%</div><div class="stat-label">Booking Rate</div></div>
      <div class="stat-card"><div class="stat-value">${callStats.avgDurationSeconds||0}s</div><div class="stat-label">Avg Duration</div></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h2>Call Outcomes</h2></div>
        <div class="card-body">
          ${Object.keys(callStats.outcomes||{}).length ? Object.entries(callStats.outcomes).map(([k,v])=>`
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
              <span>${esc(k)}</span><strong>${v}</strong>
            </div>`).join('') : '<p style="color:var(--text-light);font-size:14px">No call data yet. Call data will appear here once your voice agent starts receiving calls.</p>'}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h2>Caller Sentiment</h2></div>
        <div class="card-body">
          ${Object.keys(callStats.sentiments||{}).length ? Object.entries(callStats.sentiments).map(([k,v])=>`
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
              <span>${esc(k)}</span><strong>${v}</strong>
            </div>`).join('') : '<p style="color:var(--text-light);font-size:14px">Sentiment data will appear once calls are processed.</p>'}
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:20px;">
      <div class="card-header"><h2>Recent Bookings</h2><button class="btn btn-sm btn-secondary" onclick="window.location.hash='bookings'">View All</button></div>
      <div class="table-wrap">${recent.length ? renderBookingTable(recent,false) : '<div class="empty-state"><h3>No bookings yet</h3></div>'}</div>
    </div>`;
}

// ─── Accounts List (Admin) ──────────────────────────────────
async function renderAccounts(el) {
  el.innerHTML = '<p style="color:var(--text-light)">Loading accounts...</p>';
  const accounts = await fetchJSON(`${API}/accounts`);
  if (!accounts || accounts.length === 0) {
    el.innerHTML = '<div class="card"><div class="empty-state"><div class="empty-state-icon">&#128101;</div><h3>No accounts yet</h3><p>Create your first client account to get started.</p><button class="btn btn-primary" style="margin-top:16px" onclick="showNewAccountModal()">+ Create Account</button></div></div>';
    return;
  }
  el.innerHTML = `<div class="account-grid">${accounts.map(a=>`
    <div class="account-card ${a.status!=='active'?'inactive':''}" onclick="window.location.hash='account/${a.id}'">
      <div class="account-card-top"><div class="account-card-name">${esc(a.name)}</div><span class="badge badge-${a.status}">${cap(a.status)}</span></div>
      <div class="account-contact">${esc(a.contactName||'')}${a.contactEmail?' &mdash; '+esc(a.contactEmail):''}</div>
      <div class="account-card-stats">
        <div class="account-card-stat"><strong>${a.bookingCount||0}</strong>Bookings</div>
        <div class="account-card-stat"><strong>${a.confirmedBookings||0}</strong>Confirmed</div>
        <div class="account-card-stat"><strong>${a.calendarCount||0}</strong>Calendars</div>
      </div>
    </div>`).join('')}</div>`;
}

// ─── Account Detail ─────────────────────────────────────────
async function renderAccountDetail(accountId, tab) {
  const el = document.getElementById('content');
  el.innerHTML = '<p style="color:var(--text-light)">Loading account...</p>';
  const account = await fetchJSON(`${API}/accounts/${accountId}`);
  if (!account) { el.innerHTML = '<div class="card"><div class="empty-state"><h3>Account not found</h3></div></div>'; return; }
  document.getElementById('page-title').textContent = account.name;
  document.getElementById('breadcrumb').innerHTML = `<a href="#accounts">Accounts</a> / ${esc(account.name)}`;
  document.getElementById('topbar-actions').innerHTML = currentUser.role === 'admin' ? `
    <button class="btn btn-secondary btn-sm" onclick="showEditAccountModal('${accountId}')">Edit Account</button>
    <button class="btn btn-primary btn-sm" onclick="showNewBookingModalForAccount('${accountId}')">+ New Booking</button>` : '';

  const tabs = [
    {id:'overview',label:'Overview'}, {id:'bookings',label:'Bookings'}, {id:'calendars',label:'Calendars'},
    {id:'call-logs',label:'Call Logs'}, {id:'webhooks',label:'Webhooks'}, {id:'variables',label:'Variables'}, {id:'settings',label:'Settings'}
  ];
  const visibleTabs = currentUser.role === 'admin' ? tabs : tabs.filter(t=>['overview','bookings','call-logs'].includes(t.id));
  const tabsHtml = `<div class="tabs">${visibleTabs.map(t=>`<div class="tab ${tab===t.id?'active':''}" onclick="window.location.hash='account/${accountId}/${t.id}'">${t.label}</div>`).join('')}</div>`;
  const contentHtml = await renderAccountTab(account, tab);
  el.innerHTML = tabsHtml + contentHtml;
}

async function renderAccountTab(account, tab) {
  switch(tab) {
    case 'overview': return renderAccountOverview(account);
    case 'bookings': return renderAccountBookings(account);
    case 'calendars': return renderAccountCalendars(account);
    case 'call-logs': return renderAccountCallLogs(account);
    case 'webhooks': return renderAccountWebhooks(account);
    case 'variables': return renderAccountVariables(account);
    case 'settings': return renderAccountSettings(account);
    default: return renderAccountOverview(account);
  }
}

async function renderAccountOverview(account) {
  const [stats, callStats] = await Promise.all([
    fetchJSON(`${API}/accounts/${account.id}/stats`),
    fetchJSON(`${API}/call-logs/account/${account.id}/stats`),
  ]);
  return `
    <div class="stats-row">
      <div class="stat-card"><div class="stat-value">${stats.totalBookings||0}</div><div class="stat-label">Bookings</div></div>
      <div class="stat-card green"><div class="stat-value">${stats.confirmedBookings||0}</div><div class="stat-label">Confirmed</div></div>
      <div class="stat-card orange"><div class="stat-value">${stats.todayBookings||0}</div><div class="stat-label">Today</div></div>
      <div class="stat-card teal"><div class="stat-value">${callStats.totalCalls||0}</div><div class="stat-label">Calls</div></div>
      <div class="stat-card green"><div class="stat-value">${callStats.bookingRate||0}%</div><div class="stat-label">Booking Rate</div></div>
      <div class="stat-card"><div class="stat-value">${callStats.avgDurationSeconds||0}s</div><div class="stat-label">Avg Duration</div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h2>Account Details</h2></div>
        <div class="card-body"><table><tbody>
          <tr><td style="font-weight:600;width:140px">Name</td><td>${esc(account.name)}</td></tr>
          <tr><td style="font-weight:600">Contact</td><td>${esc(account.contactName||'—')}</td></tr>
          <tr><td style="font-weight:600">Email</td><td>${esc(account.contactEmail||'—')}</td></tr>
          <tr><td style="font-weight:600">Phone</td><td>${esc(account.contactPhone||'—')}</td></tr>
          <tr><td style="font-weight:600">Agent ID</td><td>${esc(account.voiceAgentId||'—')}</td></tr>
          <tr><td style="font-weight:600">Status</td><td><span class="badge badge-${account.status}">${cap(account.status)}</span></td></tr>
          <tr><td style="font-weight:600">Created</td><td>${fmtDT(account.createdAt)}</td></tr>
        </tbody></table></div>
      </div>
      <div class="card">
        <div class="card-header"><h2>Call Outcomes</h2></div>
        <div class="card-body">
          ${Object.keys(callStats.outcomes||{}).length ? Object.entries(callStats.outcomes).map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span>${esc(k)}</span><strong>${v}</strong></div>`).join('') : '<p style="color:var(--text-light);font-size:13px">No call data yet.</p>'}
        </div>
      </div>
    </div>`;
}

async function renderAccountBookings(account) {
  const bookings = await fetchJSON(`${API}/accounts/${account.id}/bookings`);
  if (!bookings||!bookings.length) return `<div class="card"><div class="empty-state"><h3>No bookings yet</h3><button class="btn btn-primary" style="margin-top:12px" onclick="showNewBookingModalForAccount('${account.id}')">+ New Booking</button></div></div>`;
  return `<div class="card"><div class="card-header"><h2>Bookings (${bookings.length})</h2><button class="btn btn-primary btn-sm" onclick="showNewBookingModalForAccount('${account.id}')">+ New Booking</button></div><div class="table-wrap">${renderBookingTable(bookings,true)}</div></div>`;
}

async function renderAccountCalendars(account) {
  const calendars = await fetchJSON(`${API}/accounts/${account.id}/calendars`);
  return `
    <div class="card" style="margin-bottom:20px"><div class="card-header"><h2>Connect a Calendar</h2></div><div class="card-body">
      <div class="info-box">Calendar connections are specific to this account.</div>
      <div class="provider-grid">
        <div class="provider-card ${hasP(calendars,'google')?'connected':''}"><div class="provider-icon google">G</div><h3>Google Calendar</h3><p>Connect Google Calendar</p><a href="/auth/google?accountId=${account.id}" class="btn btn-primary btn-sm">Connect</a>${hasP(calendars,'google')?'<div class="provider-status connected">Connected</div>':''}</div>
        <div class="provider-card ${hasP(calendars,'microsoft')?'connected':''}"><div class="provider-icon microsoft">M</div><h3>Outlook</h3><p>Connect Microsoft Outlook</p><a href="/auth/microsoft?accountId=${account.id}" class="btn btn-primary btn-sm">Connect</a>${hasP(calendars,'microsoft')?'<div class="provider-status connected">Connected</div>':''}</div>
        <div class="provider-card ${hasP(calendars,'caldav')?'connected':''}"><div class="provider-icon caldav">C</div><h3>CalDAV</h3><p>Apple Calendar / CalDAV</p><button class="btn btn-primary btn-sm" onclick="connectCalDAV('${account.id}')">Connect</button>${hasP(calendars,'caldav')?'<div class="provider-status connected">Connected</div>':''}</div>
      </div>
    </div></div>
    <div class="card"><div class="card-header"><h2>Connected Calendars</h2></div><div class="card-body">
      ${calendars&&calendars.length ? calendars.map(cal=>`<div class="cal-list-item"><div class="cal-info"><div class="cal-dot" style="background:${pColor(cal.provider)}"></div><div><strong>${esc(cal.name)}</strong><div style="font-size:12px;color:var(--text-light)">${cap(cal.provider)}${cal.isDefault?' — Default':''}</div></div></div><div class="cal-actions">${!cal.isDefault?`<button class="btn btn-sm btn-secondary" onclick="setDefCal('${account.id}','${cal.id}')">Set Default</button>`:'<span class="badge badge-confirmed">Default</span>'}<button class="btn btn-sm btn-danger" onclick="disconnCal('${account.id}','${cal.id}')">Disconnect</button></div></div>`).join('') : '<div class="empty-state"><h3>No calendars connected</h3></div>'}
    </div></div>`;
}

async function renderAccountCallLogs(account) {
  const logs = await fetchJSON(`${API}/call-logs?accountId=${account.id}`);
  if (!logs||!logs.length) return '<div class="card"><div class="empty-state"><h3>No call logs yet</h3><p>Call data will appear here when the voice agent receives calls.</p></div></div>';
  return `<div class="card"><div class="card-header"><h2>Call Logs (${logs.length})</h2></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Phone</th><th>Outcome</th><th>Duration</th><th>Sentiment</th><th></th></tr></thead><tbody>
    ${logs.map(l=>{const v=l.variables||{};return `<tr><td>${fmtDT(l.timestamp)}</td><td>${esc(l.callerPhone||'—')}</td><td>${esc(v.call_outcome||'—')}</td><td>${v.call_duration?v.call_duration+'s':'—'}</td><td>${esc(v.caller_sentiment||'—')}</td><td><button class="btn btn-sm btn-secondary" onclick="window.location.hash='call-log/${l.id}'">View</button></td></tr>`;}).join('')}
  </tbody></table></div></div>`;
}

async function renderAccountWebhooks(account) {
  const logs = await fetchJSON(`${API}/accounts/${account.id}/webhook-logs`);
  return `
    <div class="card" style="margin-bottom:20px"><div class="card-header"><h2>Webhook URLs</h2></div><div class="card-body">
      <p style="margin-bottom:12px;font-size:14px;color:var(--text-light)">Configure these in the voice AI agent for this account.</p>
      <div style="margin-bottom:16px"><label style="font-size:13px;font-weight:500;display:block;margin-bottom:6px">Booking Webhook</label><div class="webhook-url-box"><code id="wh-b-${account.id}">${esc(account.webhookUrl)}</code><button class="copy-btn" onclick="copyEl('wh-b-${account.id}')">Copy</button></div></div>
      <div><label style="font-size:13px;font-weight:500;display:block;margin-bottom:6px">Availability Webhook</label><div class="webhook-url-box"><code id="wh-a-${account.id}">${esc(account.webhookAvailabilityUrl)}</code><button class="copy-btn" onclick="copyEl('wh-a-${account.id}')">Copy</button></div></div>
    </div></div>
    <div class="card"><div class="card-header"><h2>Webhook Event Log</h2></div><div>
      ${logs&&logs.length ? logs.map(log=>`<div class="log-entry"><div class="log-dot ${log.event==='call.completed'?'success':'info'}"></div><span class="log-time">${fmtDT(log.timestamp)}</span><span class="log-message"><strong>${esc(log.event)}</strong> — Call ${esc(log.callId||'N/A')}</span></div>`).join('') : '<div class="empty-state"><h3>No events yet</h3></div>'}
    </div></div>`;
}

async function renderAccountVariables(account) {
  if (currentUser.role !== 'admin') return '<div class="card"><div class="empty-state"><h3>Access Denied</h3></div></div>';
  const vars = await fetchJSON(`${API}/call-logs/account/${account.id}/variables`);
  return `
    <div class="card"><div class="card-header"><h2>Call Variable Definitions</h2><button class="btn btn-sm btn-primary" onclick="showAddVariableModal('${account.id}')">+ Add Variable</button></div><div class="card-body">
      <div class="info-box">These variables define what data is captured from each voice agent call. Toggle or customize them per account. Changes only affect future calls.</div>
      <div id="var-list-${account.id}">
        ${(vars||[]).map((v,i)=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
          <div><strong>${esc(v.label)}</strong> <code style="font-size:11px;color:var(--text-light)">${esc(v.key)}</code><br><span style="font-size:12px;color:var(--text-light)">Type: ${esc(v.type)}${v.options&&v.options.length?' — Options: '+v.options.join(', '):''}</span></div>
          <div style="display:flex;gap:8px;align-items:center">
            <label style="font-size:12px;cursor:pointer"><input type="checkbox" ${v.enabled?'checked':''} onchange="toggleVar('${account.id}',${i},this.checked)"> Enabled</label>
            <button class="btn btn-sm btn-danger" onclick="removeVar('${account.id}',${i})">Remove</button>
          </div>
        </div>`).join('')}
        ${(!vars||!vars.length) ? '<p style="color:var(--text-light)">No variables configured.</p>' : ''}
      </div>
    </div></div>`;
}

async function renderAccountSettings(account) {
  if (currentUser.role !== 'admin') return '<div class="card"><div class="empty-state"><h3>Access Denied</h3></div></div>';
  const s = await fetchJSON(`${API}/accounts/${account.id}/settings`);
  if (!s) return '<p>Failed to load.</p>';
  const bh = s.businessHours||{};
  return `<form onsubmit="saveAcctSettings(event,'${account.id}')" id="acct-settings-form">
    <div class="card" style="margin-bottom:20px"><div class="card-header"><h2>Booking Defaults</h2></div><div class="card-body"><div class="form-row"><div class="form-group"><label>Default Duration (min)</label><input type="number" name="defaultDuration" value="${s.defaultDuration||60}" min="15" step="15"></div><div class="form-group"><label>Buffer (min)</label><input type="number" name="bufferMinutes" value="${s.bufferMinutes||15}" min="0" step="5"></div></div></div></div>
    <div class="card" style="margin-bottom:20px"><div class="card-header"><h2>Business Hours</h2></div><div class="card-body"><div class="form-row"><div class="form-group"><label>Start</label><input type="time" name="bhStart" value="${bh.start||'08:00'}"></div><div class="form-group"><label>End</label><input type="time" name="bhEnd" value="${bh.end||'18:00'}"></div></div><div class="form-row"><div class="form-group"><label>Timezone</label><input type="text" name="bhTZ" value="${esc(bh.timezone||'America/New_York')}"></div><div class="form-group"><label>Work Days (1=Mon..7=Sun)</label><input type="text" name="bhDays" value="${(bh.workDays||[1,2,3,4,5]).join(',')}"></div></div></div></div>
    <div style="display:flex;justify-content:flex-end"><button type="submit" class="btn btn-primary">Save Settings</button></div></form>`;
}

// ─── Call Variable Actions ──────────────────────────────────
async function toggleVar(accountId, idx, enabled) {
  const vars = await fetchJSON(`${API}/call-logs/account/${accountId}/variables`);
  if (!vars||!vars[idx]) return;
  vars[idx].enabled = enabled;
  await fetchJSON(`${API}/call-logs/account/${accountId}/variables`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({callVariables:vars}) });
  toast('Variable updated','success');
}

async function removeVar(accountId, idx) {
  if (!confirm('Remove this variable?')) return;
  const vars = await fetchJSON(`${API}/call-logs/account/${accountId}/variables`);
  if (!vars) return;
  vars.splice(idx,1);
  await fetchJSON(`${API}/call-logs/account/${accountId}/variables`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({callVariables:vars}) });
  toast('Variable removed','success');
  renderAccountDetail(accountId,'variables');
}

function showAddVariableModal(accountId) {
  openModal('Add Call Variable', `<form onsubmit="submitAddVar(event,'${accountId}')">
    <div class="form-row"><div class="form-group"><label>Key (snake_case)</label><input type="text" name="key" required placeholder="e.g., caller_zip_code" pattern="[a-z_]+"></div><div class="form-group"><label>Label</label><input type="text" name="label" required placeholder="e.g., Caller Zip Code"></div></div>
    <div class="form-row"><div class="form-group"><label>Type</label><select name="type"><option value="text">Text</option><option value="longtext">Long Text</option><option value="number">Number</option><option value="boolean">Boolean</option><option value="select">Select (dropdown)</option><option value="url">URL</option></select></div><div class="form-group"><label>Options (comma-separated, for select type)</label><input type="text" name="options" placeholder="Option1, Option2, Option3"></div></div>
    <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Add Variable</button></div></form>`);
}

async function submitAddVar(e, accountId) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const vars = await fetchJSON(`${API}/call-logs/account/${accountId}/variables`);
  vars.push({ key:fd.get('key'), label:fd.get('label'), type:fd.get('type'), options:fd.get('options')?fd.get('options').split(',').map(s=>s.trim()).filter(Boolean):[], enabled:true });
  await fetchJSON(`${API}/call-logs/account/${accountId}/variables`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({callVariables:vars}) });
  closeModal();
  toast('Variable added','success');
  renderAccountDetail(accountId,'variables');
}

// ─── Call Logs (Global) ─────────────────────────────────────
async function renderCallLogs(el) {
  el.innerHTML = '<p style="color:var(--text-light)">Loading...</p>';
  const accountId = currentUser.role === 'client' ? currentUser.accountId : null;
  const logs = await fetchJSON(`${API}/call-logs${accountId?'?accountId='+accountId:''}`);
  if (!logs||!logs.length) { el.innerHTML = '<div class="card"><div class="empty-state"><h3>No call logs yet</h3><p>Call data appears here when voice agents process calls.</p></div></div>'; return; }
  el.innerHTML = `<div class="card"><div class="card-header"><h2>Call Logs (${logs.length})</h2></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Phone</th>${currentUser.role==='admin'?'<th>Account</th>':''}><th>Outcome</th><th>Duration</th><th>Sentiment</th><th></th></tr></thead><tbody>
    ${logs.map(l=>{const v=l.variables||{};return `<tr><td>${fmtDT(l.timestamp)}</td><td>${esc(l.callerPhone||'—')}</td>${currentUser.role==='admin'?`<td><a href="#account/${l.accountId}" style="color:var(--primary);text-decoration:none">${esc(l.accountId?.slice(0,8)||'—')}</a></td>`:''}<td>${esc(v.call_outcome||'—')}</td><td>${v.call_duration?v.call_duration+'s':'—'}</td><td>${esc(v.caller_sentiment||'—')}</td><td><button class="btn btn-sm btn-secondary" onclick="window.location.hash='call-log/${l.id}'">View</button></td></tr>`;}).join('')}
  </tbody></table></div></div>`;
}

async function renderCallLogDetail(logId) {
  const el = document.getElementById('content');
  el.innerHTML = '<p style="color:var(--text-light)">Loading...</p>';
  const log = await fetchJSON(`${API}/call-logs/${logId}`);
  if (!log) { el.innerHTML = '<div class="card"><div class="empty-state"><h3>Call log not found</h3></div></div>'; return; }
  document.getElementById('page-title').textContent = 'Call Detail';
  document.getElementById('breadcrumb').innerHTML = `<a href="#call-logs">Call Logs</a> / ${esc(log.callId||logId.slice(0,8))}`;
  const v = log.variables||{};

  el.innerHTML = `
    <div class="card" style="margin-bottom:20px"><div class="card-header"><h2>Call Information</h2></div><div class="card-body"><table><tbody>
      <tr><td style="font-weight:600;width:140px">Call ID</td><td>${esc(log.callId||'—')}</td></tr>
      <tr><td style="font-weight:600">Agent ID</td><td>${esc(log.agentId||'—')}</td></tr>
      <tr><td style="font-weight:600">Caller Phone</td><td>${esc(log.callerPhone||'—')}</td></tr>
      <tr><td style="font-weight:600">Date</td><td>${fmtDT(log.timestamp)}</td></tr>
    </tbody></table></div></div>
    <div class="card" style="margin-bottom:20px"><div class="card-header"><h2>Call Variables</h2></div><div class="card-body">
      <div class="var-grid">
        ${Object.entries(v).map(([k,val])=>`<div class="var-item"><div class="var-item-label">${esc(k.replace(/_/g,' '))}</div><div class="var-item-value">${val!==null&&val!==undefined?esc(String(val)):'<span style="color:var(--text-light)">—</span>'}</div></div>`).join('')}
      </div>
      ${!Object.keys(v).length ? '<p style="color:var(--text-light)">No variables recorded for this call.</p>' : ''}
    </div></div>
    ${v.transcript ? `<div class="card"><div class="card-header"><h2>Transcript</h2></div><div class="card-body"><pre style="white-space:pre-wrap;font-size:13px;max-height:400px;overflow-y:auto">${esc(v.transcript)}</pre></div></div>` : ''}`;
}

// ─── Users (Admin) ──────────────────────────────────────────
async function renderUsers(el) {
  el.innerHTML = '<p style="color:var(--text-light)">Loading...</p>';
  const [users, accounts] = await Promise.all([fetchJSON(`${API}/users`), fetchJSON(`${API}/accounts`)]);
  const acctMap = {}; (accounts||[]).forEach(a=>{acctMap[a.id]=a.name;});
  el.innerHTML = `<div class="card"><div class="card-header"><h2>All Users (${(users||[]).length})</h2><button class="btn btn-primary btn-sm" onclick="showInviteUserModal()">+ Invite User</button></div><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Account</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    ${(users||[]).map(u=>`<tr>
      <td><strong>${esc(u.name)}</strong></td>
      <td>${esc(u.email)}</td>
      <td><span class="badge badge-${u.role}">${cap(u.role)}</span></td>
      <td>${u.accountId?`<a href="#account/${u.accountId}" style="color:var(--primary);text-decoration:none">${esc(acctMap[u.accountId]||u.accountId.slice(0,8))}</a>`:'<span style="color:var(--text-light)">Global</span>'}</td>
      <td><span class="badge badge-${u.status}">${cap(u.status)}</span></td>
      <td>${u.id!==currentUser.id?`<button class="btn btn-sm btn-secondary" onclick="showEditUserModal('${u.id}')">Edit</button> <button class="btn btn-sm btn-danger" onclick="deleteUserById('${u.id}')">Delete</button>`:''}</td>
    </tr>`).join('')}
  </tbody></table></div></div>`;
}

function showInviteUserModal() {
  fetchJSON(`${API}/accounts`).then(accounts=>{
    openModal('Invite User',`<form onsubmit="submitInviteUser(event)">
      <div class="form-row"><div class="form-group"><label>Email *</label><input type="email" name="email" required></div><div class="form-group"><label>Name</label><input type="text" name="name"></div></div>
      <div class="form-row"><div class="form-group"><label>Role</label><select name="role" onchange="document.getElementById('invite-acct-group').style.display=this.value==='client'?'block':'none'"><option value="client">Client</option><option value="admin">Admin</option></select></div><div class="form-group" id="invite-acct-group"><label>Account *</label><select name="accountId"><option value="">Select account...</option>${(accounts||[]).map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></div></div>
      <div class="form-group"><label>Password (auto-generated if blank)</label><input type="text" name="password" placeholder="Leave blank for auto-generated"></div>
      <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Send Invite</button></div></form>`);
  });
}

async function submitInviteUser(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = { email:fd.get('email'), name:fd.get('name'), role:fd.get('role'), accountId:fd.get('accountId'), password:fd.get('password')||undefined };
  const res = await fetchJSON(`${API}/users/invite`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  if (res) {
    closeModal();
    toast(`User invited. Temp password: ${res.temporaryPassword}`,'success');
    renderUsers(document.getElementById('content'));
  }
}

async function showEditUserModal(userId) {
  const [user, accounts] = await Promise.all([fetchJSON(`${API}/users`).then(us=>(us||[]).find(u=>u.id===userId)), fetchJSON(`${API}/accounts`)]);
  if (!user) return;
  openModal('Edit User',`<form onsubmit="submitEditUser(event,'${userId}')">
    <div class="form-row"><div class="form-group"><label>Name</label><input type="text" name="name" value="${esc(user.name)}"></div><div class="form-group"><label>Email</label><input type="email" name="email" value="${esc(user.email)}"></div></div>
    <div class="form-row"><div class="form-group"><label>Role</label><select name="role"><option value="client" ${user.role==='client'?'selected':''}>Client</option><option value="admin" ${user.role==='admin'?'selected':''}>Admin</option></select></div><div class="form-group"><label>Status</label><select name="status"><option value="active" ${user.status==='active'?'selected':''}>Active</option><option value="disabled" ${user.status==='disabled'?'selected':''}>Disabled</option></select></div></div>
    <div class="form-group"><label>Account</label><select name="accountId"><option value="">None (Global)</option>${(accounts||[]).map(a=>`<option value="${a.id}" ${user.accountId===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select></div>
    <div class="form-group"><label>New Password (leave blank to keep current)</label><input type="text" name="password"></div>
    <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Save</button></div></form>`);
}

async function submitEditUser(e, userId) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = { name:fd.get('name'), email:fd.get('email'), role:fd.get('role'), status:fd.get('status'), accountId:fd.get('accountId')||null };
  if (fd.get('password')) data.password = fd.get('password');
  await fetchJSON(`${API}/users/${userId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  closeModal(); toast('User updated','success'); renderUsers(document.getElementById('content'));
}

async function deleteUserById(userId) {
  if (!confirm('Delete this user?')) return;
  await fetchJSON(`${API}/users/${userId}`,{method:'DELETE'});
  toast('User deleted','success'); renderUsers(document.getElementById('content'));
}

// ─── All Bookings ───────────────────────────────────────────
async function renderAllBookings(el) {
  el.innerHTML = '<p style="color:var(--text-light)">Loading...</p>';
  const isAdmin = currentUser.role === 'admin';
  const acctFilter = isAdmin ? '' : `accountId=${currentUser.accountId}&`;
  const [bookings, accounts] = await Promise.all([fetchJSON(`${API}/bookings?${acctFilter}`), isAdmin?fetchJSON(`${API}/accounts`):Promise.resolve([])]);
  const acctMap = {}; (accounts||[]).forEach(a=>{acctMap[a.id]=a.name;});
  if (!bookings||!bookings.length) { el.innerHTML = '<div class="card"><div class="empty-state"><h3>No bookings yet</h3></div></div>'; return; }
  el.innerHTML = `<div class="card"><div class="card-header"><h2>Bookings (${bookings.length})</h2></div><div class="table-wrap">
    <table><thead><tr><th>Customer</th>${isAdmin?'<th>Account</th>':''}<th>Service</th><th>Date & Time</th><th>Source</th><th>Status</th><th></th></tr></thead><tbody>
    ${bookings.map(b=>`<tr><td><strong>${esc(b.customerName)}</strong><br><small style="color:var(--text-light)">${esc(b.customerPhone||'')}</small></td>${isAdmin?`<td><a href="#account/${b.accountId}" style="color:var(--primary);text-decoration:none">${esc(acctMap[b.accountId]||'Unknown')}</a></td>`:''}<td>${esc(b.serviceType||'—')}</td><td>${fmtD(b.date)}<br><small style="color:var(--text-light)">${fmtT(b.startTime)}</small></td><td><span class="badge badge-${b.source==='voice_ai'?'voice':'manual'}">${b.source==='voice_ai'?'Voice AI':'Manual'}</span></td><td><span class="badge badge-${b.status}">${cap(b.status)}</span></td><td>${b.status==='confirmed'?`<button class="btn btn-sm btn-danger" onclick="cancelBooking('${b.id}')">Cancel</button>`:''}</td></tr>`).join('')}
    </tbody></table></div></div>`;
}

// ─── Platforms & Settings (Admin only) ──────────────────────
async function renderPlatforms(el) {
  el.innerHTML = `<div class="card"><div class="card-header"><h2>Service Platform Integrations</h2></div><div class="card-body">
    <p style="margin-bottom:20px;font-size:14px;color:var(--text-light)">Connect field service platforms to automatically create jobs from bookings.</p>
    <div class="provider-grid">
      <div class="provider-card"><div class="provider-icon servicetitan">ST</div><h3>ServiceTitan</h3><p>Sync bookings as jobs in ServiceTitan.</p><button class="btn btn-sm btn-secondary" disabled>Coming Soon</button></div>
      <div class="provider-card"><div class="provider-icon housecallpro">HC</div><h3>Housecall Pro</h3><p>Push bookings for dispatch.</p><button class="btn btn-sm btn-secondary" disabled>Coming Soon</button></div>
      <div class="provider-card"><div class="provider-icon jobber">J</div><h3>Jobber</h3><p>Create quotes and jobs in Jobber.</p><button class="btn btn-sm btn-secondary" disabled>Coming Soon</button></div>
    </div></div></div>`;
}

async function renderSettings(el) {
  const s = await fetchJSON(`${API}/settings`);
  if (!s){el.innerHTML='<p>Failed to load.</p>';return;}
  const bh=s.businessHours||{};
  el.innerHTML = `<form onsubmit="saveGlobalSettings(event)" id="settings-form">
    <div class="card" style="margin-bottom:20px"><div class="card-header"><h2>General</h2></div><div class="card-body"><div class="info-box">Global defaults. Each account can override these in their own settings.</div><div class="form-row"><div class="form-group"><label>Business Name</label><input type="text" name="businessName" value="${esc(s.businessName||'')}"></div><div class="form-group"><label>Default Calendar Provider</label><select name="defaultCalendarProvider"><option value="google" ${s.defaultCalendarProvider==='google'?'selected':''}>Google</option><option value="microsoft" ${s.defaultCalendarProvider==='microsoft'?'selected':''}>Outlook</option><option value="caldav" ${s.defaultCalendarProvider==='caldav'?'selected':''}>CalDAV</option></select></div></div></div></div>
    <div class="card" style="margin-bottom:20px"><div class="card-header"><h2>Booking Defaults</h2></div><div class="card-body"><div class="form-row"><div class="form-group"><label>Duration (min)</label><input type="number" name="defaultDuration" value="${s.defaultDuration||60}" min="15" step="15"></div><div class="form-group"><label>Buffer (min)</label><input type="number" name="bufferMinutes" value="${s.bufferMinutes||15}" min="0" step="5"></div></div></div></div>
    <div class="card" style="margin-bottom:20px"><div class="card-header"><h2>Business Hours</h2></div><div class="card-body"><div class="form-row"><div class="form-group"><label>Start</label><input type="time" name="bhStart" value="${bh.start||'08:00'}"></div><div class="form-group"><label>End</label><input type="time" name="bhEnd" value="${bh.end||'18:00'}"></div></div><div class="form-row"><div class="form-group"><label>Timezone</label><input type="text" name="bhTZ" value="${esc(bh.timezone||'America/New_York')}"></div><div class="form-group"><label>Work Days (1=Mon..7=Sun)</label><input type="text" name="bhDays" value="${(bh.workDays||[1,2,3,4,5]).join(',')}"></div></div></div></div>
    <div style="display:flex;justify-content:flex-end"><button type="submit" class="btn btn-primary">Save Settings</button></div></form>`;
}

async function saveGlobalSettings(e) {
  e.preventDefault();
  const fd=new FormData(e.target);
  const s={businessName:fd.get('businessName'),defaultCalendarProvider:fd.get('defaultCalendarProvider'),defaultDuration:+fd.get('defaultDuration'),bufferMinutes:+fd.get('bufferMinutes'),businessHours:{start:fd.get('bhStart'),end:fd.get('bhEnd'),timezone:fd.get('bhTZ'),workDays:fd.get('bhDays').split(',').map(Number)}};
  await fetchJSON(`${API}/settings`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(s)});
  toast('Settings saved','success');
}

// ─── Account & Booking Actions ──────────────────────────────
async function connectCalDAV(accountId) {
  const res = await fetchJSON(`/auth/caldav/connect?accountId=${accountId}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accountId})});
  if (res&&res.success){toast('CalDAV connected','success');renderAccountDetail(accountId,'calendars');}else{toast('CalDAV connection failed','error');}
}
async function setDefCal(accountId,calId){await fetchJSON(`${API}/accounts/${accountId}/calendars/${calId}/default`,{method:'PUT'});toast('Default updated','success');renderAccountDetail(accountId,'calendars');}
async function disconnCal(accountId,calId){if(!confirm('Disconnect?'))return;await fetchJSON(`${API}/accounts/${accountId}/calendars/${calId}`,{method:'DELETE'});toast('Disconnected','success');renderAccountDetail(accountId,'calendars');}
async function saveAcctSettings(e,accountId){e.preventDefault();const fd=new FormData(e.target);const s={defaultDuration:+fd.get('defaultDuration'),bufferMinutes:+fd.get('bufferMinutes'),businessHours:{start:fd.get('bhStart'),end:fd.get('bhEnd'),timezone:fd.get('bhTZ'),workDays:fd.get('bhDays').split(',').map(Number)}};await fetchJSON(`${API}/accounts/${accountId}/settings`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(s)});toast('Saved','success');}
async function deleteAccount(accountId){if(!confirm('Delete this account and ALL data?'))return;await fetchJSON(`${API}/accounts/${accountId}`,{method:'DELETE'});toast('Deleted','success');window.location.hash='accounts';}
async function cancelBooking(id){if(!confirm('Cancel booking?'))return;await fetchJSON(`${API}/bookings/${id}/cancel`,{method:'POST'});toast('Cancelled','success');handleHashRoute();}

function renderBookingTable(bookings,showActions){return `<table><thead><tr><th>Customer</th><th>Service</th><th>Date & Time</th><th>Source</th><th>Status</th>${showActions?'<th></th>':''}</tr></thead><tbody>${bookings.map(b=>`<tr><td><strong>${esc(b.customerName)}</strong><br><small style="color:var(--text-light)">${esc(b.customerPhone||'')}</small></td><td>${esc(b.serviceType||'—')}</td><td>${fmtD(b.date)}<br><small style="color:var(--text-light)">${fmtT(b.startTime)}</small></td><td><span class="badge badge-${b.source==='voice_ai'?'voice':'manual'}">${b.source==='voice_ai'?'Voice AI':'Manual'}</span></td><td><span class="badge badge-${b.status}">${cap(b.status)}</span></td>${showActions?`<td>${b.status==='confirmed'?`<button class="btn btn-sm btn-danger" onclick="cancelBooking('${b.id}')">Cancel</button>`:''}</td>`:''}</tr>`).join('')}</tbody></table>`;}

// ─── Modals ─────────────────────────────────────────────────
function openModal(title,body){document.getElementById('modal-title').textContent=title;document.getElementById('modal-body').innerHTML=body;document.getElementById('modal-overlay').classList.add('active');}
function closeModal(){document.getElementById('modal-overlay').classList.remove('active');}

function showNewAccountModal(){openModal('New Account',`<form onsubmit="submitNewAccount(event)"><div class="form-row"><div class="form-group"><label>Account Name *</label><input type="text" name="name" required placeholder="Acme Plumbing"></div><div class="form-group"><label>Contact Name</label><input type="text" name="contactName"></div></div><div class="form-row"><div class="form-group"><label>Email</label><input type="email" name="contactEmail"></div><div class="form-group"><label>Phone</label><input type="tel" name="contactPhone"></div></div><div class="form-group"><label>Voice Agent ID</label><input type="text" name="voiceAgentId" placeholder="Voice AI agent ID"></div><div class="form-group"><label>Notes</label><textarea name="notes" rows="2"></textarea></div><div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Create Account</button></div></form>`);}

async function submitNewAccount(e){e.preventDefault();const fd=new FormData(e.target);const r=await fetchJSON(`${API}/accounts`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:fd.get('name'),contactName:fd.get('contactName'),contactEmail:fd.get('contactEmail'),contactPhone:fd.get('contactPhone'),voiceAgentId:fd.get('voiceAgentId'),notes:fd.get('notes')})});if(r){closeModal();toast('Account created','success');window.location.hash=`account/${r.id}`;}}

async function showEditAccountModal(accountId){const a=await fetchJSON(`${API}/accounts/${accountId}`);if(!a)return;openModal('Edit Account',`<form onsubmit="submitEditAccount(event,'${accountId}')"><div class="form-row"><div class="form-group"><label>Name *</label><input type="text" name="name" value="${esc(a.name)}" required></div><div class="form-group"><label>Contact</label><input type="text" name="contactName" value="${esc(a.contactName||'')}"></div></div><div class="form-row"><div class="form-group"><label>Email</label><input type="email" name="contactEmail" value="${esc(a.contactEmail||'')}"></div><div class="form-group"><label>Phone</label><input type="tel" name="contactPhone" value="${esc(a.contactPhone||'')}"></div></div><div class="form-group"><label>Agent ID</label><input type="text" name="voiceAgentId" value="${esc(a.voiceAgentId||'')}"></div><div class="form-group"><label>Status</label><select name="status"><option value="active" ${a.status==='active'?'selected':''}>Active</option><option value="inactive" ${a.status==='inactive'?'selected':''}>Inactive</option></select></div><div class="form-group"><label>Notes</label><textarea name="notes" rows="2">${esc(a.notes||'')}</textarea></div><div class="form-actions"><button type="button" class="btn btn-danger" onclick="deleteAccount('${accountId}');closeModal();">Delete</button><div style="flex:1"></div><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Save</button></div></form>`);}

async function submitEditAccount(e,accountId){e.preventDefault();const fd=new FormData(e.target);await fetchJSON(`${API}/accounts/${accountId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:fd.get('name'),contactName:fd.get('contactName'),contactEmail:fd.get('contactEmail'),contactPhone:fd.get('contactPhone'),voiceAgentId:fd.get('voiceAgentId'),status:fd.get('status'),notes:fd.get('notes')})});closeModal();toast('Updated','success');renderAccountDetail(accountId,currentAccountTab);}

function showNewBookingModalForAccount(accountId){const today=new Date().toISOString().split('T')[0];openModal('New Booking',`<form onsubmit="submitBooking(event,'${accountId}')"><div class="form-row"><div class="form-group"><label>Customer *</label><input type="text" name="customerName" required></div><div class="form-group"><label>Phone *</label><input type="tel" name="customerPhone" required></div></div><div class="form-row"><div class="form-group"><label>Email</label><input type="email" name="customerEmail"></div><div class="form-group"><label>Service</label><input type="text" name="serviceType"></div></div><div class="form-row"><div class="form-group"><label>Date *</label><input type="date" name="date" required value="${today}"></div><div class="form-group"><label>Time *</label><input type="time" name="startTime" required></div></div><div class="form-row"><div class="form-group"><label>Duration (min)</label><input type="number" name="duration" value="60" min="15" step="15"></div><div class="form-group"><label>Address</label><input type="text" name="address"></div></div><div class="form-group"><label>Notes</label><textarea name="notes" rows="2"></textarea></div><div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Create</button></div></form>`);}

async function showNewBookingModal(){const accts=await fetchJSON(`${API}/accounts`);if(!accts||!accts.length){toast('Create an account first','error');return;}const today=new Date().toISOString().split('T')[0];openModal('New Booking',`<form onsubmit="submitBookingWithAccount(event)"><div class="form-group"><label>Account *</label><select name="accountId" required><option value="">Select...</option>${accts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></div><div class="form-row"><div class="form-group"><label>Customer *</label><input type="text" name="customerName" required></div><div class="form-group"><label>Phone *</label><input type="tel" name="customerPhone" required></div></div><div class="form-row"><div class="form-group"><label>Email</label><input type="email" name="customerEmail"></div><div class="form-group"><label>Service</label><input type="text" name="serviceType"></div></div><div class="form-row"><div class="form-group"><label>Date *</label><input type="date" name="date" required value="${today}"></div><div class="form-group"><label>Time *</label><input type="time" name="startTime" required></div></div><div class="form-row"><div class="form-group"><label>Duration</label><input type="number" name="duration" value="60" min="15" step="15"></div><div class="form-group"><label>Address</label><input type="text" name="address"></div></div><div class="form-group"><label>Notes</label><textarea name="notes" rows="2"></textarea></div><div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Create</button></div></form>`);}

async function submitBooking(e,accountId){e.preventDefault();const fd=new FormData(e.target);const dur=+(fd.get('duration'))||60;const st=new Date(`${fd.get('date')}T${fd.get('startTime')}`);const en=new Date(st.getTime()+dur*60000);const r=await fetchJSON(`${API}/bookings`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accountId,customerName:fd.get('customerName'),customerPhone:fd.get('customerPhone'),customerEmail:fd.get('customerEmail'),serviceType:fd.get('serviceType'),date:fd.get('date'),startTime:st.toISOString(),endTime:en.toISOString(),duration:dur,address:fd.get('address'),notes:fd.get('notes')})});if(r){closeModal();toast('Booking created','success');handleHashRoute();}}

async function submitBookingWithAccount(e){e.preventDefault();const fd=new FormData(e.target);if(!fd.get('accountId')){toast('Select an account','error');return;}await submitBooking(e,fd.get('accountId'));}

// ─── Helpers ────────────────────────────────────────────────
async function fetchJSON(url,opts={}){try{const hdrs=opts.headers||{};if(authToken)hdrs['Authorization']=`Bearer ${authToken}`;opts.headers=hdrs;const res=await fetch(url,opts);if(res.status===401){logout();return null;}if(!res.ok){const err=await res.json().catch(()=>({error:res.statusText}));toast(err.error||'Request failed','error');return null;}return res.json();}catch(e){console.error('Fetch error:',e);toast('Network error','error');return null;}}

function esc(s){if(!s)return '';const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
function cap(s){return s?s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):''}
function fmtD(s){if(!s)return '—';const d=new Date(s);return isNaN(d)?s:d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}
function fmtT(s){if(!s)return '';const d=new Date(s);return isNaN(d)?s:d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});}
function fmtDT(s){if(!s)return '';const d=new Date(s);return isNaN(d)?s:d.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});}
function hasP(cals,p){return cals&&cals.some(c=>c.provider===p);}
function pColor(p){return {google:'#4285f4',microsoft:'#00a4ef',caldav:'#333'}[p]||'#6c5ce7';}
function copyEl(id){navigator.clipboard.writeText(document.getElementById(id).textContent).then(()=>toast('Copied','success'));}
function toast(msg,type='info'){const c=document.querySelector('.toast-container');if(!c)return;const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=msg;c.appendChild(el);setTimeout(()=>el.remove(),4000);}
