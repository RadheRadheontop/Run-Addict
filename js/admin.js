'use strict';

const STORE_VERSION = '3';
const KEYS = {
  version: 'runAddict_store_version',
  users: 'runAddict_users',
  challenges: 'runAddict_challenges',
  events: 'runAddict_events',
  orders: 'runAddict_reward_orders',
  flagged: 'runAddict_flagged_runs',
  config: 'runAddict_config'
};

const DEFAULT_CONFIG = {
  shippingPortalUrl: '',
  stravaClientId: '',
  stravaExchangeUrl: '',
  googleClientId: ''
};

const ICONS = {
  check: '<path d="M20 6L9 17l-5-5"></path>',
  close: '<path d="M18 6L6 18"></path><path d="M6 6l12 12"></path>',
  external: '<path d="M14 3h7v7"></path><path d="M10 14L21 3"></path><path d="M21 14v7H3V3h7"></path>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>'
};

let currentShippingOrderId = null;

function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.check}</svg>`;
}

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureStorage() {
  if (localStorage.getItem(KEYS.version) !== STORE_VERSION) {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('runAddict_'))
      .forEach((key) => localStorage.removeItem(key));
    localStorage.setItem(KEYS.version, STORE_VERSION);
  }
  if (!localStorage.getItem(KEYS.users)) writeJson(KEYS.users, []);
  if (!localStorage.getItem(KEYS.challenges)) writeJson(KEYS.challenges, []);
  if (!localStorage.getItem(KEYS.events)) writeJson(KEYS.events, []);
  if (!localStorage.getItem(KEYS.orders)) writeJson(KEYS.orders, []);
  if (!localStorage.getItem(KEYS.flagged)) writeJson(KEYS.flagged, []);
  if (!localStorage.getItem(KEYS.config)) writeJson(KEYS.config, DEFAULT_CONFIG);
}

function getUsers() {
  return readJson(KEYS.users, []);
}

function setUsers(users) {
  writeJson(KEYS.users, users);
}

function getChallenges() {
  return readJson(KEYS.challenges, []);
}

function setChallenges(challenges) {
  writeJson(KEYS.challenges, challenges);
}

function getEvents() {
  return readJson(KEYS.events, []);
}

function setEvents(events) {
  writeJson(KEYS.events, events);
}

function getOrders() {
  return readJson(KEYS.orders, []);
}

function setOrders(orders) {
  writeJson(KEYS.orders, orders);
}

function getFlaggedRuns() {
  return readJson(KEYS.flagged, []);
}

function setFlaggedRuns(flagged) {
  writeJson(KEYS.flagged, flagged);
}

function getConfig() {
  return { ...DEFAULT_CONFIG, ...readJson(KEYS.config, {}) };
}

function setConfig(config) {
  writeJson(KEYS.config, { ...DEFAULT_CONFIG, ...config });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function makeId(prefix) {
  if (window.crypto && window.crypto.randomUUID) return `${prefix}_${window.crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatDate(value) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

function challengeMetric(type, goal) {
  const amount = Number(goal);
  if (type === 'distance') return `${amount} km`;
  if (type === 'elevation') return `${amount} m gain`;
  if (type === 'streak') return `${amount} days`;
  if (type === 'pace') return `Fastest ${amount}K`;
  return `${amount}`;
}

function eventCategoryLabel(category) {
  const labels = {
    race: 'Race',
    special: 'Special Event',
    community: 'Community Run',
    virtual: 'Virtual Event'
  };
  return labels[category] || 'Event';
}

function calculateStatus(startDate, endDate) {
  const now = new Date();
  if (new Date(`${startDate}T00:00:00`) > now) return 'upcoming';
  if (new Date(`${endDate}T23:59:59`) < now) return 'completed';
  return 'active';
}

function valueOf(id) {
  return document.getElementById(id)?.value.trim() || '';
}

document.addEventListener('DOMContentLoaded', () => {
  ensureStorage();
  const isAuthenticated = sessionStorage.getItem('runAddict_admin_authenticated') === 'true';
  document.getElementById('admin-login-screen')?.classList.toggle('hidden', isAuthenticated);
  const dashboard = document.getElementById('admin-dashboard-content');
  if (dashboard) dashboard.style.display = isAuthenticated ? 'block' : 'none';
  if (isAuthenticated) initAdminDashboard();
});

function handleAdminLogin(event) {
  event.preventDefault();
  const username = valueOf('admin-username');
  const password = document.getElementById('admin-password')?.value || '';

  if (username === 'admin' && password === 'admin') {
    sessionStorage.setItem('runAddict_admin_authenticated', 'true');
    document.getElementById('admin-login-screen')?.classList.add('hidden');
    document.getElementById('admin-dashboard-content').style.display = 'block';
    initAdminDashboard();
    showToast('success', 'Admin signed in', 'Console is ready.');
    return;
  }

  showToast('error', 'Login failed', 'Use username admin and password admin.');
}

function handleAdminLogout() {
  sessionStorage.removeItem('runAddict_admin_authenticated');
  window.location.reload();
}

function initAdminDashboard() {
  renderConfig();
  renderStats();
  renderAdminChallenges();
  renderAdminEvents();
  renderAdminFlaggedRuns();
  renderAdminFulfillment();
}

function renderConfig() {
  const config = getConfig();
  setValue('config-shipping-url', config.shippingPortalUrl);
  setValue('config-strava-client-id', config.stravaClientId);
  setValue('config-strava-exchange-url', config.stravaExchangeUrl);
  setValue('config-google-client-id', config.googleClientId);
}

function setValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value || '';
}

function saveAdminConfig(event) {
  event.preventDefault();
  setConfig({
    shippingPortalUrl: valueOf('config-shipping-url'),
    stravaClientId: valueOf('config-strava-client-id'),
    stravaExchangeUrl: valueOf('config-strava-exchange-url'),
    googleClientId: valueOf('config-google-client-id')
  });
  showToast('success', 'Configuration saved', 'User app connectors now use these settings.');
}

function renderStats() {
  const users = getUsers();
  const challenges = getChallenges();
  const events = getEvents();
  const flagged = getFlaggedRuns();
  const orders = getOrders();
  setText('stat-total-users', users.length);
  setText('stat-active-challenges', challenges.filter((challenge) => challenge.status === 'active').length);
  setText('stat-total-events', events.length);
  setText('stat-flagged-runs', flagged.length);
  setText('stat-pending-ship', orders.filter((order) => order.status === 'Pending Shipping').length);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function renderAdminChallenges() {
  const list = document.getElementById('admin-challenges-list');
  const badge = document.getElementById('badge-challenges-count');
  if (!list) return;
  const challenges = getChallenges();
  if (badge) badge.textContent = challenges.length;

  if (!challenges.length) {
    list.innerHTML = '<div class="admin-empty">No challenges published yet. Create the first one when rewards and rules are ready.</div>';
    return;
  }

  list.innerHTML = challenges.map((challenge) => `
    <div class="admin-row-item">
      <div class="admin-row-main">
        <strong>${escapeHtml(challenge.title)}</strong>
        <span>${escapeHtml(challenge.metric)} - ${formatDate(challenge.startDate)} to ${formatDate(challenge.endDate)}</span>
      </div>
      <div class="admin-row-actions">
        <span class="badge ${challenge.status === 'active' ? 'badge-green' : challenge.status === 'upcoming' ? 'badge-blue' : 'badge-outline'}">${escapeHtml(challenge.status)}</span>
        <button class="btn btn-secondary btn-sm" onclick="openEditChallengeModal('${challenge.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteChallenge('${challenge.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function openCreateChallengeModal() {
  document.getElementById('challenge-form')?.reset();
  setValue('challenge-edit-id', '');
  setValue('challenge-start', new Date().toISOString().slice(0, 10));
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  setValue('challenge-end', end.toISOString().slice(0, 10));
  setText('challenge-modal-title', 'Create Challenge');
  openModal('challenge-modal');
}

function openEditChallengeModal(id) {
  const challenge = getChallenges().find((item) => item.id === id);
  if (!challenge) return;
  setValue('challenge-edit-id', challenge.id);
  setValue('challenge-name', challenge.title);
  setValue('challenge-desc', challenge.desc);
  setValue('challenge-type', challenge.type);
  setValue('challenge-goal', challenge.goal);
  setValue('challenge-min-distance', challenge.minDistanceKm || 3);
  setValue('challenge-start', challenge.startDate);
  setValue('challenge-end', challenge.endDate);
  setValue('challenge-reward1', challenge.rewards[0] || '');
  setValue('challenge-reward2', challenge.rewards[1] || '');
  setValue('challenge-reward3', challenge.rewards[2] || '');
  setText('challenge-modal-title', 'Edit Challenge');
  openModal('challenge-modal');
}

function submitChallengeForm(event) {
  event.preventDefault();
  const id = valueOf('challenge-edit-id');
  const title = valueOf('challenge-name');
  const desc = valueOf('challenge-desc');
  const type = valueOf('challenge-type');
  const goal = Number(valueOf('challenge-goal'));
  const minDistanceKm = Number(valueOf('challenge-min-distance') || 3);
  const startDate = valueOf('challenge-start');
  const endDate = valueOf('challenge-end');
  const rewards = [valueOf('challenge-reward1'), valueOf('challenge-reward2'), valueOf('challenge-reward3')].filter(Boolean);

  if (!title || !desc || !type || !goal || !startDate || !endDate || !rewards.length) {
    showToast('error', 'Missing challenge fields', 'Complete challenge details and at least one reward.');
    return;
  }

  const challenges = getChallenges();
  const existing = challenges.find((challenge) => challenge.id === id);
  const payload = {
    id: existing?.id || makeId('challenge'),
    title,
    desc,
    type,
    goal,
    minDistanceKm,
    metric: challengeMetric(type, goal),
    startDate,
    endDate,
    status: calculateStatus(startDate, endDate),
    participants: existing?.participants || 0,
    rewards
  };

  if (existing) {
    Object.assign(existing, payload);
  } else {
    challenges.unshift(payload);
  }

  setChallenges(challenges);
  closeModal('challenge-modal');
  initAdminDashboard();
  showToast('success', existing ? 'Challenge updated' : 'Challenge created', `${title} is now available in the user app.`);
}

function deleteChallenge(id) {
  const confirmed = confirm('Delete this challenge? Existing joined progress for it will no longer show.');
  if (!confirmed) return;
  setChallenges(getChallenges().filter((challenge) => challenge.id !== id));
  initAdminDashboard();
  showToast('success', 'Challenge deleted', 'The challenge was removed.');
}

function renderAdminEvents() {
  const list = document.getElementById('admin-events-list');
  const badge = document.getElementById('badge-events-count');
  if (!list) return;
  const events = getEvents().slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  if (badge) badge.textContent = events.length;

  if (!events.length) {
    list.innerHTML = '<div class="admin-empty">No events published yet. Add races, meetups, and prize events here.</div>';
    return;
  }

  list.innerHTML = events.map((event) => {
    const slotsLeft = Math.max(0, Number(event.slots || 0) - Number(event.registered || 0));
    return `
      <div class="admin-row-item">
        <div class="admin-row-main">
          <strong>${escapeHtml(event.title)}</strong>
          <span>${escapeHtml(eventCategoryLabel(event.category))} - ${formatDate(event.date)} - ${escapeHtml(event.city)} - ${escapeHtml(event.distance)} - ${slotsLeft} slots left</span>
        </div>
        <div class="admin-row-actions">
          <span class="badge ${event.status === 'open' ? 'badge-green' : event.status === 'upcoming' ? 'badge-blue' : 'badge-outline'}">${escapeHtml(event.status)}</span>
          <button class="btn btn-secondary btn-sm" onclick="openEditEventModal('${event.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteEvent('${event.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function openCreateEventModal() {
  document.getElementById('event-form')?.reset();
  setValue('event-edit-id', '');
  setValue('event-date', new Date().toISOString().slice(0, 10));
  setValue('event-category', 'race');
  setValue('event-status', 'open');
  setText('event-modal-title', 'Create Event');
  openModal('event-modal');
}

function openEditEventModal(id) {
  const event = getEvents().find((item) => item.id === id);
  if (!event) return;
  setValue('event-edit-id', event.id);
  setValue('event-title', event.title);
  setValue('event-desc', event.desc);
  setValue('event-city', event.city);
  setValue('event-category', event.category || 'race');
  setValue('event-venue', event.venue);
  setValue('event-address', event.address);
  setValue('event-date', event.date);
  setValue('event-distance', event.distance);
  setValue('event-slots', event.slots);
  setValue('event-entry-fee', event.entryFee);
  setValue('event-prize1', event.prizes?.[0] || '');
  setValue('event-prize2', event.prizes?.[1] || '');
  setValue('event-prize3', event.prizes?.[2] || '');
  setValue('event-status', event.status);
  setText('event-modal-title', 'Edit Event');
  openModal('event-modal');
}

function submitEventForm(event) {
  event.preventDefault();
  const id = valueOf('event-edit-id');
  const title = valueOf('event-title');
  const desc = valueOf('event-desc');
  const city = valueOf('event-city');
  const category = valueOf('event-category');
  const venue = valueOf('event-venue');
  const address = valueOf('event-address');
  const date = valueOf('event-date');
  const distance = valueOf('event-distance');
  const slots = Number(valueOf('event-slots'));
  const entryFee = valueOf('event-entry-fee') || 'Free';
  const status = valueOf('event-status');
  const prizes = [valueOf('event-prize1'), valueOf('event-prize2'), valueOf('event-prize3')].filter(Boolean);

  if (!title || !desc || !city || !category || !venue || !date || !distance || !slots || !status || !prizes.length) {
    showToast('error', 'Missing event fields', 'Complete event details and at least one prize.');
    return;
  }

  const events = getEvents();
  const existing = events.find((item) => item.id === id);
  const payload = {
    id: existing?.id || makeId('event'),
    title,
    desc,
    city,
    category,
    venue,
    address,
    date,
    distance,
    slots,
    entryFee,
    prizes,
    status,
    registered: existing?.registered || 0,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existing) {
    Object.assign(existing, payload);
  } else {
    events.unshift(payload);
  }

  setEvents(events);
  closeModal('event-modal');
  initAdminDashboard();
  showToast('success', existing ? 'Event updated' : 'Event created', `${title} is now available in the user app.`);
}

function deleteEvent(id) {
  const confirmed = confirm('Delete this event? Existing user registrations for it will no longer show.');
  if (!confirmed) return;
  setEvents(getEvents().filter((event) => event.id !== id));
  initAdminDashboard();
  showToast('success', 'Event deleted', 'The event was removed.');
}

function renderAdminFlaggedRuns() {
  const list = document.getElementById('admin-flagged-list');
  const badge = document.getElementById('badge-flagged-count');
  if (!list) return;
  const flagged = getFlaggedRuns();
  if (badge) badge.textContent = flagged.length;

  if (!flagged.length) {
    list.innerHTML = '<div class="admin-empty">No activities are waiting for review.</div>';
    return;
  }

  list.innerHTML = flagged.map((item) => `
    <div class="admin-row-item">
      <div class="admin-row-main">
        <strong>${escapeHtml(item.user)} - ${escapeHtml(item.distance)}</strong>
        <span>${escapeHtml(item.reason)}</span>
      </div>
      <div class="admin-row-actions">
        <button class="btn btn-secondary btn-sm" onclick="handleFlaggedAction('approve','${item.id}')">Approve</button>
        <button class="btn btn-danger btn-sm" onclick="handleFlaggedAction('reject','${item.id}')">Reject</button>
      </div>
    </div>
  `).join('');
}

function handleFlaggedAction(action, id) {
  const flagged = getFlaggedRuns();
  const item = flagged.find((entry) => entry.id === id);
  if (!item) return;

  const runsKey = `runAddict_runs_${item.userId}`;
  const runs = readJson(runsKey, []);
  const run = runs.find((entry) => entry.id === item.runId);

  if (run && action === 'approve') {
    run.status = 'verified';
    run.statusLabel = 'Verified by admin';
    run.flags = [];
    writeJson(runsKey, runs);
  }

  if (run && action === 'reject') {
    writeJson(runsKey, runs.filter((entry) => entry.id !== item.runId));
  }

  setFlaggedRuns(flagged.filter((entry) => entry.id !== id));
  refreshUserMetric(item.userId);
  initAdminDashboard();
  showToast('success', action === 'approve' ? 'Run approved' : 'Run rejected', 'Review queue updated.');
}

function refreshUserMetric(userId) {
  const users = getUsers();
  const user = users.find((item) => item.id === userId);
  if (!user) return;
  const runs = readJson(`runAddict_runs_${userId}`, []).filter((run) => run.status === 'verified');
  user.totalDistance = Number(runs.reduce((sum, run) => sum + Number(run.distanceKm || 0), 0).toFixed(1));
  user.totalRuns = runs.length;
  setUsers(users);
}

function renderAdminFulfillment() {
  const body = document.getElementById('admin-fulfillment-body');
  if (!body) return;
  const orders = getOrders();

  if (!orders.length) {
    body.innerHTML = '<tr><td colspan="8" class="table-empty">No reward claims submitted yet.</td></tr>';
    return;
  }

  body.innerHTML = orders.map((order) => `
    <tr>
      <td>${formatDate(order.date)}</td>
      <td><strong>${escapeHtml(order.fullName)}</strong><small>${escapeHtml(order.email)}</small></td>
      <td><strong>${escapeHtml(order.reward)}</strong><small>${escapeHtml(order.challenge)}</small></td>
      <td>${escapeHtml(order.size || 'Not applicable')}</td>
      <td><button class="btn btn-secondary btn-sm" onclick="viewAddress('${order.id}')">Details</button></td>
      <td><span class="badge ${order.status === 'Pending Shipping' ? 'badge-gold' : order.status === 'Shipped' ? 'badge-green' : 'badge-outline'}">${escapeHtml(order.status)}</span></td>
      <td>${order.tracking ? `<strong>${escapeHtml(order.tracking)}</strong>${order.trackingUrl ? `<a href="${escapeHtml(order.trackingUrl)}" target="_blank" rel="noopener">Track</a>` : ''}` : 'Not shipped'}</td>
      <td>
        <div class="admin-row-actions">
          ${order.status === 'Pending Shipping' ? `
            <button class="btn btn-secondary btn-sm" onclick="copyPortalPacket('${order.id}')">Copy</button>
            <button class="btn btn-secondary btn-sm" onclick="openPortalLink('${order.id}')">${icon('external')} Portal</button>
            <button class="btn btn-primary btn-sm" onclick="openShipModal('${order.id}')">Ship</button>
          ` : ''}
          ${order.status === 'Shipped' ? `<button class="btn btn-secondary btn-sm" onclick="markDelivered('${order.id}')">Delivered</button>` : ''}
          ${order.status === 'Delivered' ? '<span class="muted-copy">Complete</span>' : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function buildPortalPacket(order) {
  return [
    `Reward: ${order.reward}`,
    `Challenge: ${order.challenge}`,
    `Receiver: ${order.fullName}`,
    `Email: ${order.email}`,
    `Phone: ${order.phone}`,
    order.altPhone ? `Alternate phone: ${order.altPhone}` : '',
    `Address 1: ${order.address1}`,
    order.address2 ? `Address 2: ${order.address2}` : '',
    order.landmark ? `Landmark: ${order.landmark}` : '',
    `City: ${order.city}`,
    `State: ${order.stateLoc}`,
    `PIN: ${order.pincode}`,
    `Size: ${order.size || 'Not applicable'}`,
    order.notes ? `Notes: ${order.notes}` : ''
  ].filter(Boolean).join('\n');
}

async function copyPortalPacket(orderId) {
  const order = getOrders().find((item) => item.id === orderId);
  if (!order) return;
  const text = buildPortalPacket(order);
  try {
    await navigator.clipboard.writeText(text);
    showToast('success', 'Copied', 'Delivery packet copied for the shipping portal.');
  } catch (error) {
    window.prompt('Copy delivery packet', text);
  }
}

function openPortalLink() {
  const url = getConfig().shippingPortalUrl;
  if (!url) {
    showToast('warning', 'Portal missing', 'Add a shipping portal URL in configuration.');
    return;
  }
  window.open(url, '_blank', 'noopener');
}

function viewAddress(orderId) {
  const order = getOrders().find((item) => item.id === orderId);
  if (!order) return;
  const content = document.getElementById('address-modal-content');
  if (!content) return;
  content.innerHTML = `
    <div class="address-card">
      <strong>${escapeHtml(order.fullName)}</strong>
      <span>${escapeHtml(order.email)} - ${escapeHtml(order.phone)}</span>
      ${order.altPhone ? `<span>Alt: ${escapeHtml(order.altPhone)}</span>` : ''}
    </div>
    <div class="address-card">
      <strong>Delivery address</strong>
      <span>${escapeHtml(order.address1)}</span>
      ${order.address2 ? `<span>${escapeHtml(order.address2)}</span>` : ''}
      ${order.landmark ? `<span>Landmark: ${escapeHtml(order.landmark)}</span>` : ''}
      <span>${escapeHtml(order.city)}, ${escapeHtml(order.stateLoc)} - ${escapeHtml(order.pincode)}</span>
    </div>
    <div class="address-card">
      <strong>Portal packet</strong>
      <pre>${escapeHtml(buildPortalPacket(order))}</pre>
    </div>
  `;
  openModal('address-modal');
}

function openShipModal(orderId) {
  const order = getOrders().find((item) => item.id === orderId);
  if (!order) return;
  currentShippingOrderId = orderId;
  setText('shipping-winner-name', order.fullName);
  setValue('ship-carrier', 'Delhivery');
  setValue('ship-tracking', '');
  setValue('ship-tracking-url', '');
  setValue('ship-note', '');
  openModal('shipping-modal');
}

function submitShippingForm(event) {
  event.preventDefault();
  const orders = getOrders();
  const order = orders.find((item) => item.id === currentShippingOrderId);
  if (!order) return;

  const carrier = valueOf('ship-carrier');
  const trackingNumber = valueOf('ship-tracking');
  const trackingUrl = valueOf('ship-tracking-url');
  const note = valueOf('ship-note');

  if (!carrier || !trackingNumber) {
    showToast('error', 'Missing shipping info', 'Carrier and tracking number are required.');
    return;
  }

  order.status = 'Shipped';
  order.tracking = `${carrier}: ${trackingNumber}`;
  order.trackingUrl = trackingUrl;
  order.shipNote = note;
  order.shippedAt = new Date().toISOString();
  setOrders(orders);
  updateUserRewardStatus(order, 'shipped', order.tracking, trackingUrl);
  closeModal('shipping-modal');
  initAdminDashboard();
  showToast('success', 'Order shipped', `${order.tracking} saved.`);
}

function markDelivered(orderId) {
  const orders = getOrders();
  const order = orders.find((item) => item.id === orderId);
  if (!order) return;
  order.status = 'Delivered';
  order.deliveredAt = new Date().toISOString();
  setOrders(orders);
  updateUserRewardStatus(order, 'delivered', order.tracking, order.trackingUrl);
  initAdminDashboard();
  showToast('success', 'Marked delivered', `${order.reward} is complete.`);
}

function updateUserRewardStatus(order, status, tracking, trackingUrl) {
  const rewardsKey = `runAddict_rewards_${order.userId}`;
  const rewards = readJson(rewardsKey, []);
  const reward = rewards.find((item) => item.id === order.rewardId);
  if (!reward) return;
  reward.status = status;
  reward.tracking = tracking;
  reward.trackingUrl = trackingUrl;
  writeJson(rewardsKey, rewards);
}

function openModal(id) {
  document.getElementById(id)?.classList.add('active');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
}

function showToast(type, title, message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icon(type === 'error' ? 'close' : 'check')}</span>
    <div class="toast-content"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span></div>
    <button class="modal-close" onclick="this.parentElement.remove()">${icon('close')}</button>
  `;
  container.appendChild(toast);
  window.setTimeout(() => {
    toast.classList.add('toast-out');
    window.setTimeout(() => toast.remove(), 250);
  }, 4200);
}

document.addEventListener('click', (event) => {
  if (event.target.classList.contains('modal-overlay') && event.target.classList.contains('active')) {
    event.target.classList.remove('active');
  }
});

Object.assign(window, {
  handleAdminLogin,
  handleAdminLogout,
  saveAdminConfig,
  openCreateChallengeModal,
  openEditChallengeModal,
  submitChallengeForm,
  deleteChallenge,
  openCreateEventModal,
  openEditEventModal,
  submitEventForm,
  deleteEvent,
  handleFlaggedAction,
  copyPortalPacket,
  openPortalLink,
  viewAddress,
  openShipModal,
  submitShippingForm,
  markDelivered,
  openModal,
  closeModal
});
