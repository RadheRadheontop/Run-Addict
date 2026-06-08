'use strict';

const STORE_VERSION = '3';
const KEYS = {
  version: 'runAddict_store_version',
  users: 'runAddict_users',
  auth: 'runAddict_auth',
  challenges: 'runAddict_challenges',
  events: 'runAddict_events',
  orders: 'runAddict_reward_orders',
  flagged: 'runAddict_flagged_runs',
  config: 'runAddict_config',
  onboarded: 'runAddict_onboarded'
};

const DEFAULT_CONFIG = {
  shippingPortalUrl: '',
  stravaClientId: '',
  stravaExchangeUrl: '',
  googleClientId: ''
};

const APP_STATE = {
  currentPage: 'dashboard',
  onboardingStep: 0,
  currentFilter: 'all',
  currentEventFilter: 'all',
  currentClaimingRewardId: null,
  user: null
};

let googleIdentityClientId = '';

const ONBOARDING_STEPS = [
  {
    icon: 'activity',
    title: 'Connect Strava',
    desc: 'Only verified Strava running activities count toward challenges and rewards.'
  },
  {
    icon: 'target',
    title: 'Join Challenges',
    desc: 'Admins publish distance, elevation, streak, and pace challenges from the admin console.'
  },
  {
    icon: 'shield',
    title: 'Fair Progress',
    desc: 'Suspicious speed, duplicate activity IDs, non-running activities, and weak activity data are sent to admin review.'
  },
  {
    icon: 'package',
    title: 'Claim Rewards',
    desc: 'Delivery details are stored for the admin fulfillment portal after a reward is earned.'
  }
];

const ICONS = {
  activity: '<path d="M22 12h-4l-3 7L9 5l-3 7H2"></path>',
  target: '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="1"></circle>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
  package: '<path d="M21 8l-9-5-9 5 9 5 9-5z"></path><path d="M3 8v8l9 5 9-5V8"></path><path d="M12 13v8"></path>',
  trophy: '<path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"></path><path d="M5 5H3v2a4 4 0 0 0 4 4"></path><path d="M19 5h2v2a4 4 0 0 1-4 4"></path>',
  user: '<path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle>',
  run: '<path d="M13 4a2 2 0 1 0 0 .01"></path><path d="M7 21l3-6"></path><path d="M12 21l-2-6 3-4 3 3 3-1"></path><path d="M8 8l3 1 2 2"></path>',
  chart: '<path d="M3 3v18h18"></path><path d="M7 14l3-3 3 2 5-7"></path>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.7 21a2 2 0 0 1-3.4 0"></path>',
  home: '<path d="M3 11l9-8 9 8"></path><path d="M5 10v10h14V10"></path>',
  flag: '<path d="M5 22V4"></path><path d="M5 4h12l-2 5 2 5H5"></path>',
  gift: '<path d="M20 12v10H4V12"></path><path d="M2 7h20v5H2z"></path><path d="M12 22V7"></path><path d="M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z"></path>',
  strava: '<path d="M13.2 6l-4.1 8.2h3l1.1-2.2 1.1 2.2h3L13.2 6z"></path><path d="M17.4 14.2l-2.1 4.1h4.2l-2.1-4.1z"></path>',
  check: '<path d="M20 6L9 17l-5-5"></path>',
  close: '<path d="M18 6L6 18"></path><path d="M6 6l12 12"></path>',
  external: '<path d="M14 3h7v7"></path><path d="M10 14L21 3"></path><path d="M21 14v7H3V3h7"></path>',
  lock: '<rect x="4" y="10" width="16" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path>'
};

function icon(name, className = '') {
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.activity}</svg>`;
}

function migrateStorage() {
  if (localStorage.getItem(KEYS.version) === STORE_VERSION) return;

  Object.keys(localStorage)
    .filter((key) => key.startsWith('runAddict_'))
    .forEach((key) => localStorage.removeItem(key));

  localStorage.setItem(KEYS.version, STORE_VERSION);
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
  migrateStorage();
  if (!localStorage.getItem(KEYS.users)) writeJson(KEYS.users, []);
  if (!localStorage.getItem(KEYS.challenges)) writeJson(KEYS.challenges, []);
  if (!localStorage.getItem(KEYS.events)) writeJson(KEYS.events, []);
  if (!localStorage.getItem(KEYS.orders)) writeJson(KEYS.orders, []);
  if (!localStorage.getItem(KEYS.flagged)) writeJson(KEYS.flagged, []);
  if (!localStorage.getItem(KEYS.config)) writeJson(KEYS.config, DEFAULT_CONFIG);
}

function getConfig() {
  return { ...DEFAULT_CONFIG, ...readJson(KEYS.config, {}) };
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

function userKey(suffix) {
  const id = APP_STATE.user ? APP_STATE.user.id : 'guest';
  return `runAddict_${suffix}_${id}`;
}

function getRuns() {
  return readJson(userKey('runs'), []);
}

function setRuns(runs) {
  writeJson(userKey('runs'), runs);
}

function getRewards() {
  return readJson(userKey('rewards'), []);
}

function setRewards(rewards) {
  writeJson(userKey('rewards'), rewards);
}

function getJoinedChallengeIds() {
  return readJson(userKey('joined_challenges'), []);
}

function setJoinedChallengeIds(ids) {
  writeJson(userKey('joined_challenges'), ids);
}

function getJoinedEventIds() {
  return readJson(userKey('joined_events'), []);
}

function setJoinedEventIds(ids) {
  writeJson(userKey('joined_events'), ids);
}

function isStravaConnected() {
  return localStorage.getItem(userKey('strava_connected')) === 'true';
}

function setStravaConnected(value) {
  if (value) {
    localStorage.setItem(userKey('strava_connected'), 'true');
  } else {
    localStorage.removeItem(userKey('strava_connected'));
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateValue) {
  if (!dateValue) return 'Not set';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function makeId(prefix) {
  if (window.crypto && window.crypto.randomUUID) return `${prefix}_${window.crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function hashPassword(password) {
  if (!window.crypto || !window.crypto.subtle) return btoa(password);
  const data = new TextEncoder().encode(password);
  const hash = await window.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function buildUser({ id, name, email, passwordHash = '', provider = 'email', state = 'Maharashtra' }) {
  const cleanName = name.trim();
  const handleBase = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'runner';
  return {
    id: id || makeId('user'),
    name: cleanName,
    email: email.toLowerCase(),
    passwordHash,
    provider,
    handle: `@${handleBase}`,
    initials: cleanName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
    state,
    totalDistance: 0,
    totalRuns: 0,
    streak: 0,
    rank: null,
    medals: []
  };
}

function loadSession() {
  const auth = readJson(KEYS.auth, null);
  if (!auth || !auth.id) return false;
  const user = getUsers().find((item) => item.id === auth.id);
  if (!user) {
    localStorage.removeItem(KEYS.auth);
    return false;
  }
  APP_STATE.user = user;
  recalculateUserStats();
  return true;
}

function saveSession() {
  if (!APP_STATE.user) return;
  writeJson(KEYS.auth, { id: APP_STATE.user.id });
  const users = getUsers();
  const index = users.findIndex((user) => user.id === APP_STATE.user.id);
  if (index >= 0) {
    users[index] = { ...users[index], ...APP_STATE.user };
  } else {
    users.push(APP_STATE.user);
  }
  setUsers(users);
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((button) => button.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach((form) => form.classList.remove('active'));

  const signIn = document.getElementById('auth-signin');
  const signUp = document.getElementById('auth-signup');
  const tabs = document.querySelectorAll('.auth-tab');

  if (tab === 'signup') {
    tabs[1]?.classList.add('active');
    signUp?.classList.add('active');
  } else {
    tabs[0]?.classList.add('active');
    signIn?.classList.add('active');
  }
}

async function handleSignIn() {
  const email = document.getElementById('signin-email').value.trim().toLowerCase();
  const password = document.getElementById('signin-password').value;

  if (!email || !password) {
    showToast('error', 'Missing fields', 'Enter email and password.');
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = getUsers().find((item) => item.email === email && item.passwordHash === passwordHash);
  if (!user) {
    showToast('error', 'Sign in failed', 'Use a registered email and password.');
    return;
  }

  loginAsUser(user);
  showToast('success', 'Signed in', `Welcome back, ${user.name}.`);
}

async function handleSignUp() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim().toLowerCase();
  const password = document.getElementById('signup-password').value;
  const state = document.getElementById('signup-state').value;

  if (!name || !email || !password || !state) {
    showToast('error', 'Missing fields', 'Complete every field to create an account.');
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('error', 'Invalid email', 'Enter a valid email address.');
    return;
  }

  if (password.length < 8) {
    showToast('error', 'Weak password', 'Use at least 8 characters.');
    return;
  }

  const users = getUsers();
  if (users.some((user) => user.email === email)) {
    showToast('error', 'Account exists', 'Sign in with this email or use another address.');
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = buildUser({ name, email, passwordHash, state });
  users.push(user);
  setUsers(users);
  loginAsUser(user);
  showToast('success', 'Account created', 'Your account is ready.');
}

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function handleGoogleAuth() {
  const ready = await setupGoogleIdentity({ prompt: true });
  if (!ready) return;
}

async function setupGoogleIdentity({ prompt = false } = {}) {
  const config = getConfig();
  if (!config.googleClientId) {
    showToast('warning', 'Google not configured', 'Add a Google Client ID in the admin console first.');
    return false;
  }

  try {
    await loadGoogleScript();
    if (googleIdentityClientId !== config.googleClientId) {
      window.google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: handleGoogleCredential,
        cancel_on_tap_outside: false
      });
      googleIdentityClientId = config.googleClientId;
    }
    renderGoogleButtons();
    if (prompt) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          showToast('info', 'Google sign-in', 'Use the Google button above, or check the authorized origin in Google Cloud.');
        }
      });
    }
    return true;
  } catch (error) {
    showToast('error', 'Google unavailable', 'Could not load Google Identity Services.');
    return false;
  }
}

function renderGoogleButtons() {
  if (!window.google?.accounts?.id) return;
  ['google-signin-signin', 'google-signin-signup'].forEach((id) => {
    const target = document.getElementById(id);
    if (!target || target.dataset.rendered === googleIdentityClientId) return;
    target.innerHTML = '';
    window.google.accounts.id.renderButton(target, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      logo_alignment: 'left',
      width: Math.min(target.clientWidth || 340, 360)
    });
    target.dataset.rendered = googleIdentityClientId;
  });
}

function decodeJwtPayload(token) {
  const payload = token.split('.')[1];
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(escape(atob(normalized))));
}

function handleGoogleCredential(response) {
  try {
    const payload = decodeJwtPayload(response.credential);
    const email = payload.email.toLowerCase();
    const users = getUsers();
    let user = users.find((item) => item.email === email);

    if (!user) {
      user = buildUser({
        id: `google_${payload.sub}`,
        name: payload.name || email.split('@')[0],
        email,
        provider: 'google',
        state: 'Maharashtra'
      });
      users.push(user);
    } else {
      user.provider = user.provider || 'google';
    }

    setUsers(users);
    loginAsUser(user);
    showToast('success', 'Google signed in', `Welcome, ${user.name}.`);
  } catch (error) {
    showToast('error', 'Google failed', 'Google returned an invalid sign-in response.');
  }
}

function loginAsUser(user) {
  APP_STATE.user = user;
  recalculateUserStats();
  saveSession();
  document.getElementById('auth-screen')?.classList.add('hidden');
  if (!localStorage.getItem(KEYS.onboarded)) {
    showOnboarding();
  } else {
    showApp();
  }
}

function handleSignOut() {
  localStorage.removeItem(KEYS.auth);
  APP_STATE.user = null;
  document.getElementById('app-shell')?.classList.add('hidden');
  document.getElementById('auth-screen')?.classList.remove('hidden');
  showToast('info', 'Signed out', 'Your session has ended.');
}

function showOnboarding() {
  APP_STATE.onboardingStep = 0;
  renderOnboarding();
  document.getElementById('onboarding-overlay')?.classList.remove('hidden');
}

function renderOnboarding() {
  const steps = document.getElementById('onboarding-steps');
  const dots = document.getElementById('onboarding-dots');
  if (!steps || !dots) return;

  steps.innerHTML = ONBOARDING_STEPS.map((step, index) => `
    <div class="onboarding-step ${index === APP_STATE.onboardingStep ? 'active' : ''}">
      <div class="onboarding-icon">${icon(step.icon)}</div>
      <h2 class="onboarding-title">${escapeHtml(step.title)}</h2>
      <p class="onboarding-desc">${escapeHtml(step.desc)}</p>
    </div>
  `).join('');

  dots.innerHTML = ONBOARDING_STEPS.map((_, index) => `
    <span class="onboarding-dot ${index === APP_STATE.onboardingStep ? 'active' : ''}"></span>
  `).join('');

  const button = document.getElementById('onboarding-next-btn');
  if (button) button.textContent = APP_STATE.onboardingStep === ONBOARDING_STEPS.length - 1 ? 'Open App' : 'Continue';
}

function nextOnboardingStep() {
  APP_STATE.onboardingStep += 1;
  if (APP_STATE.onboardingStep >= ONBOARDING_STEPS.length) {
    skipOnboarding();
    return;
  }
  renderOnboarding();
}

function skipOnboarding() {
  localStorage.setItem(KEYS.onboarded, 'true');
  document.getElementById('onboarding-overlay')?.classList.add('hidden');
  showApp();
}

function showApp() {
  document.getElementById('app-shell')?.classList.remove('hidden');
  updateProfileUI();
  initializeApp();
}

function initializeApp() {
  recalculateUserStats();
  syncChallengeRewards();
  updateProfileUI();
  renderDashboard();
  renderChallenges(APP_STATE.currentFilter);
  renderEvents(APP_STATE.currentEventFilter);
  renderLeaderboard();
  renderRewards();
  renderProfile();
  updatePageHeader(APP_STATE.currentPage);
}

function updateProfileUI() {
  if (!APP_STATE.user) return;
  const user = APP_STATE.user;
  setText('header-avatar-btn', user.initials);
  setText('profile-avatar-large', user.initials);
  setText('profile-name-display', user.name);
  setText('profile-handle-display', user.handle);
  setText('profile-state-display', user.state);
  setValue('settings-name', user.name);
  setValue('settings-handle', user.handle);
  setValue('settings-state', user.state);
  setValue('state-select', user.state);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function setValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value;
}

function saveProfileSettings() {
  const name = document.getElementById('settings-name').value.trim();
  const handle = document.getElementById('settings-handle').value.trim();
  const state = document.getElementById('settings-state').value;
  if (!name || !handle || !state) {
    showToast('error', 'Missing profile', 'Name, username, and state are required.');
    return;
  }

  APP_STATE.user.name = name;
  APP_STATE.user.handle = handle.startsWith('@') ? handle : `@${handle}`;
  APP_STATE.user.state = state;
  APP_STATE.user.initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  saveSession();
  updateProfileUI();
  renderLeaderboard();
  showToast('success', 'Profile saved', 'Your profile has been updated.');
}

function navigateTo(page) {
  APP_STATE.currentPage = page;

  document.querySelectorAll('.bottom-nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.page === page);
  });
  document.querySelectorAll('.page-section').forEach((section) => {
    section.classList.toggle('active', section.id === `page-${page}`);
  });

  document.querySelector('.page-body')?.scrollTo({ top: 0, behavior: 'smooth' });
  updatePageHeader(page);

  if (page === 'dashboard') renderDashboard();
  if (page === 'challenges') renderChallenges(APP_STATE.currentFilter);
  if (page === 'events') renderEvents(APP_STATE.currentEventFilter);
  if (page === 'leaderboard') renderLeaderboard();
  if (page === 'rewards') renderRewards();
  if (page === 'profile') renderProfile();
}

function updatePageHeader(page) {
  if (!APP_STATE.user) return;
  const titles = {
    dashboard: ['Dashboard', `Welcome back, ${APP_STATE.user.name.split(' ')[0]}`],
    challenges: ['Challenges', 'Join verified running challenges'],
    events: ['Events', 'Register for live runs and prizes'],
    leaderboard: ['Leaderboard', `${APP_STATE.user.state} rankings`],
    rewards: ['Rewards', 'Claim and track earned rewards'],
    profile: ['Profile', 'Account, Strava, and run history']
  };
  const [title, subtitle] = titles[page] || ['Run Addict', ''];
  setText('page-title', title);
  setText('page-subtitle', subtitle);
}

function getEligibleRuns() {
  return getRuns().filter((run) => run.status === 'verified');
}

function computeStreak(runs) {
  const daySet = new Set(runs.map((run) => new Date(run.startDate).toISOString().slice(0, 10)));
  let cursor = new Date();
  let streak = 0;

  for (let offset = 0; offset < 365; offset += 1) {
    const day = cursor.toISOString().slice(0, 10);
    if (!daySet.has(day)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function recalculateUserStats() {
  if (!APP_STATE.user) return;
  const runs = getEligibleRuns();
  const totalDistance = runs.reduce((sum, run) => sum + Number(run.distanceKm || 0), 0);
  APP_STATE.user.totalDistance = Number(totalDistance.toFixed(1));
  APP_STATE.user.totalRuns = runs.length;
  APP_STATE.user.streak = computeStreak(runs);
  APP_STATE.user.medals = [
    APP_STATE.user.totalDistance >= 10 ? '10K verified' : null,
    APP_STATE.user.totalDistance >= 50 ? '50K verified' : null,
    APP_STATE.user.totalRuns >= 10 ? '10 runs verified' : null
  ].filter(Boolean);
  saveSession();
}

function renderDashboard() {
  if (!APP_STATE.user) return;
  recalculateUserStats();
  syncChallengeRewards();

  const weeklyTargetKm = 25;
  const weeklyRuns = getEligibleRuns().filter((run) => {
    const runTime = new Date(run.startDate).getTime();
    return Date.now() - runTime <= 7 * 86400000;
  });
  const weeklyDistance = weeklyRuns.reduce((sum, run) => sum + Number(run.distanceKm || 0), 0);
  const weeklyPercent = Math.min(100, Math.round((weeklyDistance / weeklyTargetKm) * 100));

  setText('hero-distance', `${APP_STATE.user.totalDistance.toFixed(1)} km`);
  setText('hero-progress', `${weeklyPercent}%`);
  setText(
    'hero-subtitle',
    APP_STATE.user.totalRuns
      ? `${weeklyDistance.toFixed(1)} km this week toward a ${weeklyTargetKm} km target.`
      : 'Your next synced run starts the board.'
  );
  const ring = document.getElementById('hero-ring-fill');
  if (ring) {
    const circumference = 2 * Math.PI * 48;
    ring.style.strokeDasharray = `${circumference}`;
    ring.style.strokeDashoffset = `${circumference - (circumference * weeklyPercent) / 100}`;
  }

  setText('dashboard-distance', `${APP_STATE.user.totalDistance.toFixed(1)} km`);
  setText('dashboard-runs', APP_STATE.user.totalRuns);
  setText('dashboard-streak', `${APP_STATE.user.streak} days`);
  setText('dashboard-rank', APP_STATE.user.rank ? `#${APP_STATE.user.rank}` : '--');
  setText('streak-headline', APP_STATE.user.streak > 0 ? `${APP_STATE.user.streak}-day verified streak` : 'No active streak');
  setText('streak-subheadline', isStravaConnected() ? 'Your verified Strava runs update this dashboard.' : 'Connect Strava to start counting verified runs.');

  renderWeeklyChart();
  renderRecentRuns();
  renderActiveChallengesWidget();
}

function renderWeeklyChart() {
  const chart = document.getElementById('weekly-chart');
  if (!chart) return;
  const runs = getEligibleRuns();
  const days = [];

  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    const iso = date.toISOString().slice(0, 10);
    const total = runs
      .filter((run) => new Date(run.startDate).toISOString().slice(0, 10) === iso)
      .reduce((sum, run) => sum + Number(run.distanceKm), 0);
    days.push({ label: date.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 1), total });
  }

  const max = Math.max(...days.map((day) => day.total), 1);
  chart.innerHTML = days.map((day, index) => {
    const height = Math.max(4, Math.round((day.total / max) * 96));
    return `
      <div class="chart-column">
        <div class="chart-bar ${index === days.length - 1 ? 'active' : ''}" style="height:${height}px" title="${day.total.toFixed(1)} km"></div>
        <span class="chart-label">${day.label}</span>
      </div>
    `;
  }).join('');

  const total = days.reduce((sum, day) => sum + day.total, 0);
  setText('weekly-total', `Total: ${total.toFixed(1)} km`);
  setText('weekly-avg', `Avg: ${(total / 7).toFixed(1)} km/day`);
}

function renderRecentRuns() {
  const container = document.getElementById('recent-runs');
  if (!container) return;
  const runs = getRuns().slice().sort((a, b) => new Date(b.startDate) - new Date(a.startDate)).slice(0, 5);

  if (runs.length === 0) {
    container.innerHTML = emptyState('No runs synced yet', 'Connect Strava to import running activities.');
    return;
  }

  container.innerHTML = runs.map((run) => `
    <div class="run-item">
      <div class="run-icon">${icon('run')}</div>
      <div class="run-details">
        <div class="run-title">${escapeHtml(run.title)}</div>
        <div class="run-meta">${formatDateTime(run.startDate)} - ${escapeHtml(run.statusLabel)}</div>
      </div>
      <div class="run-stats">
        <div class="run-distance">${Number(run.distanceKm).toFixed(1)}<span>km</span></div>
        <div class="run-pace">${escapeHtml(run.pace)}</div>
      </div>
    </div>
  `).join('');
}

function renderActiveChallengesWidget() {
  const container = document.getElementById('active-challenges-widget');
  if (!container) return;
  const joined = new Set(getJoinedChallengeIds());
  const challenges = getChallenges().filter((challenge) => joined.has(challenge.id) && challenge.status === 'active');

  if (challenges.length === 0) {
    container.innerHTML = emptyState('No active challenges joined', 'Open Challenges to join a published running challenge.');
    return;
  }

  container.innerHTML = challenges.map((challenge) => {
    const progress = calculateChallengeProgress(challenge);
    return `
      <button class="challenge-row" onclick="openChallengeModal('${challenge.id}')">
        <div>
          <div class="challenge-row-title">${escapeHtml(challenge.title)}</div>
          <div class="challenge-row-sub">${escapeHtml(progress.summary)}</div>
        </div>
        <strong>${progress.percent}%</strong>
        <div class="progress-bar"><div class="progress-fill" style="width:${progress.percent}%"></div></div>
      </button>
    `;
  }).join('');
}

function emptyState(title, text) {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon('activity')}</div>
      <div class="empty-title">${escapeHtml(title)}</div>
      <div class="empty-text">${escapeHtml(text)}</div>
    </div>
  `;
}

function challengeMetric(type, goal) {
  const amount = Number(goal);
  if (type === 'distance') return `${amount} km`;
  if (type === 'elevation') return `${amount} m gain`;
  if (type === 'streak') return `${amount} days`;
  if (type === 'pace') return `Fastest ${amount}K`;
  return `${amount}`;
}

function runsInChallengeWindow(challenge) {
  const start = new Date(`${challenge.startDate}T00:00:00`);
  const end = new Date(`${challenge.endDate}T23:59:59`);
  return getEligibleRuns().filter((run) => {
    const runDate = new Date(run.startDate);
    return runDate >= start && runDate <= end;
  });
}

function longestStreakForChallenge(runs, minDistanceKm) {
  const days = new Set(
    runs
      .filter((run) => Number(run.distanceKm) >= minDistanceKm)
      .map((run) => new Date(run.startDate).toISOString().slice(0, 10))
  );
  const sorted = Array.from(days).sort();
  let longest = 0;
  let current = 0;
  let previous = null;

  sorted.forEach((day) => {
    if (!previous) {
      current = 1;
    } else {
      const date = new Date(day);
      const prevDate = new Date(previous);
      const diff = (date - prevDate) / 86400000;
      current = diff === 1 ? current + 1 : 1;
    }
    longest = Math.max(longest, current);
    previous = day;
  });

  return longest;
}

function calculateChallengeProgress(challenge) {
  const runs = runsInChallengeWindow(challenge);
  const goal = Number(challenge.goal || 1);
  let value = 0;
  let summary = '';

  if (challenge.type === 'distance') {
    value = runs.reduce((sum, run) => sum + Number(run.distanceKm || 0), 0);
    summary = `${value.toFixed(1)} of ${goal} km`;
  } else if (challenge.type === 'elevation') {
    value = runs.reduce((sum, run) => sum + Number(run.elevationGain || 0), 0);
    summary = `${Math.round(value)} of ${goal} m elevation`;
  } else if (challenge.type === 'streak') {
    const minDistance = Number(challenge.minDistanceKm || 3);
    value = longestStreakForChallenge(runs, minDistance);
    summary = `${value} of ${goal} days, min ${minDistance} km/day`;
  } else if (challenge.type === 'pace') {
    const qualifying = runs.filter((run) => Number(run.distanceKm) >= goal);
    const best = qualifying.sort((a, b) => Number(a.paceSecondsPerKm) - Number(b.paceSecondsPerKm))[0];
    value = best ? goal : 0;
    summary = best ? `Best qualifying pace ${best.pace}` : `No ${goal}K run yet`;
  }

  return {
    value,
    percent: Math.min(100, Math.round((value / goal) * 100)),
    summary
  };
}

function renderChallenges(filterType = 'all') {
  APP_STATE.currentFilter = filterType;
  const container = document.getElementById('challenges-grid');
  const badge = document.getElementById('bottom-challenges-badge');
  if (!container) return;

  const challenges = getChallenges();
  const joined = new Set(getJoinedChallengeIds());
  const activeCount = challenges.filter((challenge) => challenge.status === 'active').length;
  if (badge) {
    badge.textContent = activeCount;
    badge.style.display = activeCount ? 'block' : 'none';
  }

  let filtered = challenges;
  if (filterType === 'active') filtered = challenges.filter((challenge) => challenge.status === 'active');
  if (filterType === 'upcoming') filtered = challenges.filter((challenge) => challenge.status === 'upcoming');
  if (filterType === 'joined') filtered = challenges.filter((challenge) => joined.has(challenge.id));

  if (filtered.length === 0) {
    container.innerHTML = emptyState('No challenges published', 'Admin can publish running challenges from the admin console.');
    return;
  }

  container.innerHTML = filtered.map((challenge) => {
    const isJoined = joined.has(challenge.id);
    const progress = calculateChallengeProgress(challenge);
    return `
      <article class="challenge-card" onclick="openChallengeModal('${challenge.id}')">
        <div class="challenge-banner">
          <div class="challenge-banner-icon">${icon(challenge.type === 'elevation' ? 'chart' : 'flag')}</div>
          <span class="badge ${challenge.status === 'active' ? 'badge-green' : 'badge-blue'}">${escapeHtml(challenge.status)}</span>
        </div>
        <div class="challenge-info">
          <h3 class="challenge-title">${escapeHtml(challenge.title)}</h3>
          <p class="challenge-desc">${escapeHtml(challenge.desc)}</p>
          <div class="challenge-meta">
            <div><strong>${escapeHtml(challenge.metric || challengeMetric(challenge.type, challenge.goal))}</strong><span>Goal</span></div>
            <div><strong>${formatDate(challenge.endDate)}</strong><span>Ends</span></div>
            <div><strong>${challenge.rewards.length}</strong><span>Rewards</span></div>
          </div>
          ${isJoined ? `
            <div class="challenge-progress">
              <div><span>${escapeHtml(progress.summary)}</span><strong>${progress.percent}%</strong></div>
              <div class="progress-bar"><div class="progress-fill" style="width:${progress.percent}%"></div></div>
            </div>
          ` : ''}
          <div class="challenge-footer">
            <span>${Number(challenge.participants || 0).toLocaleString('en-IN')} joined</span>
            ${isJoined ? '<span class="badge badge-green">Joined</span>' : `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();joinChallenge('${challenge.id}')">Join</button>`}
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function filterChallenges(type, button) {
  button?.closest('.tabs')?.querySelectorAll('.tab-btn').forEach((tab) => tab.classList.remove('active'));
  button?.classList.add('active');
  renderChallenges(type);
}

function joinChallenge(id) {
  const challenges = getChallenges();
  const challenge = challenges.find((item) => item.id === id);
  if (!challenge) return;
  if (challenge.status === 'completed') {
    showToast('warning', 'Challenge closed', 'This challenge is no longer accepting entries.');
    return;
  }

  const joined = new Set(getJoinedChallengeIds());
  if (!joined.has(id)) {
    joined.add(id);
    challenge.participants = Number(challenge.participants || 0) + 1;
    setJoinedChallengeIds(Array.from(joined));
    setChallenges(challenges);
  }

  syncChallengeRewards();
  renderChallenges(APP_STATE.currentFilter);
  renderDashboard();
  showToast('success', 'Challenge joined', `You joined ${challenge.title}.`);
}

function openChallengeModal(id) {
  const challenge = getChallenges().find((item) => item.id === id);
  if (!challenge) return;
  const joined = new Set(getJoinedChallengeIds());
  const isJoined = joined.has(id);
  const progress = calculateChallengeProgress(challenge);
  const body = document.getElementById('challenge-detail-body');
  const footer = document.getElementById('challenge-detail-footer');
  if (!body || !footer) return;

  body.innerHTML = `
    <div class="detail-head">
      <div class="detail-icon">${icon(challenge.type === 'elevation' ? 'chart' : 'flag')}</div>
      <h2>${escapeHtml(challenge.title)}</h2>
      <span class="badge ${challenge.status === 'active' ? 'badge-green' : 'badge-blue'}">${escapeHtml(challenge.status)}</span>
    </div>
    <p class="detail-copy">${escapeHtml(challenge.desc)}</p>
    <div class="detail-grid">
      <div><strong>${escapeHtml(challenge.metric || challengeMetric(challenge.type, challenge.goal))}</strong><span>Goal</span></div>
      <div><strong>${formatDate(challenge.startDate)}</strong><span>Starts</span></div>
      <div><strong>${formatDate(challenge.endDate)}</strong><span>Ends</span></div>
    </div>
    <div class="detail-block">
      <h4>Verification rule</h4>
      <p>${escapeHtml(getChallengeRuleCopy(challenge))}</p>
    </div>
    <div class="detail-block">
      <h4>Rewards</h4>
      ${challenge.rewards.map((reward) => `<p>${escapeHtml(reward)}</p>`).join('')}
    </div>
    ${isJoined ? `
      <div class="detail-block">
        <h4>Your progress</h4>
        <div class="challenge-progress">
          <div><span>${escapeHtml(progress.summary)}</span><strong>${progress.percent}%</strong></div>
          <div class="progress-bar"><div class="progress-fill" style="width:${progress.percent}%"></div></div>
        </div>
      </div>
    ` : ''}
  `;

  footer.innerHTML = isJoined
    ? '<button class="btn btn-secondary" onclick="closeModal(\'challenge-detail-modal\')">Close</button>'
    : `<button class="btn btn-secondary" onclick="closeModal('challenge-detail-modal')">Cancel</button><button class="btn btn-primary" onclick="joinChallenge('${challenge.id}');closeModal('challenge-detail-modal');">Join Challenge</button>`;
  openModal('challenge-detail-modal');
}

function renderEvents(filterType = 'all') {
  APP_STATE.currentEventFilter = filterType;
  const container = document.getElementById('events-grid');
  const badge = document.getElementById('bottom-events-badge');
  if (!container) return;

  const events = getEvents().slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const joined = new Set(getJoinedEventIds());
  const openEvents = events.filter((event) => event.status === 'open').length;
  if (badge) {
    badge.textContent = openEvents;
    badge.style.display = openEvents ? 'block' : 'none';
  }

  let filtered = events;
  if (filterType === 'open') filtered = events.filter((event) => event.status === 'open');
  if (filterType === 'special') filtered = events.filter((event) => event.category === 'special');
  if (filterType === 'registered') filtered = events.filter((event) => joined.has(event.id));

  if (!filtered.length) {
    const emptyTitle = filterType === 'all' ? 'No events yet' : `No ${filterType} events`;
    container.innerHTML = emptyState(emptyTitle, 'Admin can publish race events, special events, prizes, venue, date, and slots.');
    return;
  }

  container.innerHTML = filtered.map((event) => {
    const isJoined = joined.has(event.id);
    const slotsLeft = Math.max(0, Number(event.slots || 0) - Number(event.registered || 0));
    const canRegister = event.status === 'open' && slotsLeft > 0;
    const statusClass = event.status === 'open' ? 'badge-green' : event.status === 'upcoming' ? 'badge-blue' : 'badge-outline';
    return `
      <article class="event-card ${isJoined ? 'joined' : ''}">
        <div class="event-topline">
          <span class="badge ${statusClass}">${escapeHtml(event.status)}</span>
          <span class="badge ${event.category === 'special' ? 'badge-gold' : 'badge-outline'}">${escapeHtml(eventCategoryLabel(event.category))}</span>
          <strong>${slotsLeft} slots left</strong>
        </div>
        <h3>${escapeHtml(event.title)}</h3>
        <p>${escapeHtml(event.desc)}</p>
        <div class="event-meta">
          <span>${formatDate(event.date)}</span>
          <span>${escapeHtml(event.city)}</span>
          <span>${escapeHtml(event.distance)}</span>
          <span>${escapeHtml(event.entryFee || 'Free')}</span>
        </div>
        <div class="event-venue">
          <strong>${escapeHtml(event.venue)}</strong>
          <span>${escapeHtml(event.address || 'Venue details to be announced')}</span>
        </div>
        <div class="event-prizes">
          ${(event.prizes || []).filter(Boolean).map((prize) => `<span>${escapeHtml(prize)}</span>`).join('')}
        </div>
        <div class="event-footer">
          <span>${Number(event.registered || 0).toLocaleString('en-IN')} registered</span>
          ${isJoined ? '<span class="badge badge-green">Registered</span>' : `<button class="btn ${canRegister ? 'btn-primary' : 'btn-secondary'} btn-sm" ${canRegister ? '' : 'disabled'} onclick="joinEvent('${event.id}')">${canRegister ? 'Register' : 'Unavailable'}</button>`}
        </div>
      </article>
    `;
  }).join('');
}

function filterEvents(type, button) {
  button?.closest('.tabs')?.querySelectorAll('.tab-btn').forEach((tab) => tab.classList.remove('active'));
  button?.classList.add('active');
  renderEvents(type);
}

function eventCategoryLabel(category) {
  const labels = {
    race: 'Race',
    special: 'Special',
    community: 'Community',
    virtual: 'Virtual'
  };
  return labels[category] || 'Event';
}

function joinEvent(id) {
  const events = getEvents();
  const event = events.find((item) => item.id === id);
  if (!event) return;
  const slotsLeft = Math.max(0, Number(event.slots || 0) - Number(event.registered || 0));
  if (event.status !== 'open' || slotsLeft <= 0) {
    showToast('warning', 'Event unavailable', 'This event is not accepting registrations right now.');
    return;
  }

  const joined = new Set(getJoinedEventIds());
  if (!joined.has(id)) {
    joined.add(id);
    event.registered = Number(event.registered || 0) + 1;
    setJoinedEventIds(Array.from(joined));
    setEvents(events);
  }

  renderEvents(APP_STATE.currentEventFilter);
  renderDashboard();
  showToast('success', 'Event registered', `You are registered for ${event.title}.`);
}

function getChallengeRuleCopy(challenge) {
  if (challenge.type === 'distance') return 'Counts verified Strava running distance inside the challenge dates.';
  if (challenge.type === 'elevation') return 'Counts Strava total_elevation_gain from verified Run, Trail Run, and Virtual Run activities inside the challenge dates. That is how Mountain Climber is tracked.';
  if (challenge.type === 'streak') return `Counts consecutive days with at least ${challenge.minDistanceKm || 3} km of verified running.`;
  if (challenge.type === 'pace') return `Counts the fastest verified run that is at least ${challenge.goal} km.`;
  return 'Counts verified Strava running activities only.';
}

function syncChallengeRewards() {
  if (!APP_STATE.user) return;
  const joined = new Set(getJoinedChallengeIds());
  const rewards = getRewards();
  let changed = false;

  getChallenges().forEach((challenge) => {
    if (!joined.has(challenge.id)) return;
    const progress = calculateChallengeProgress(challenge);
    if (progress.percent < 100) return;

    const rewardName = challenge.rewards[0] || `${challenge.title} completion reward`;
    const exists = rewards.some((reward) => reward.challengeId === challenge.id && reward.title === rewardName);
    if (!exists) {
      rewards.unshift({
        id: makeId('reward'),
        challengeId: challenge.id,
        title: rewardName,
        from: challenge.title,
        status: 'available',
        earnedAt: new Date().toISOString()
      });
      changed = true;
    }
  });

  if (changed) setRewards(rewards);
}

function renderLeaderboard() {
  if (!APP_STATE.user) return;
  const state = document.getElementById('state-select')?.value || APP_STATE.user.state;
  const users = getUsers()
    .filter((user) => user.state === state)
    .sort((a, b) => Number(b.totalDistance || 0) - Number(a.totalDistance || 0));

  users.forEach((user, index) => {
    user.rank = index + 1;
    if (user.id === APP_STATE.user.id) APP_STATE.user.rank = index + 1;
  });
  saveSession();

  const top = document.getElementById('leaderboard-top3');
  const body = document.getElementById('leaderboard-table-body');
  if (!top || !body) return;

  if (users.length === 0) {
    top.innerHTML = emptyState('No rankings yet', 'Verified Strava runs create the leaderboard.');
    body.innerHTML = '<tr><td colspan="4" class="table-empty">No runners in this state yet.</td></tr>';
    return;
  }

  top.innerHTML = users.slice(0, 3).map((user, index) => `
    <div class="podium-card ${user.id === APP_STATE.user.id ? 'self' : ''}">
      <div class="avatar avatar-lg">${escapeHtml(user.initials)}</div>
      <strong>#${index + 1}</strong>
      <span>${escapeHtml(user.name)}</span>
      <small>${Number(user.totalDistance || 0).toFixed(1)} km</small>
    </div>
  `).join('');

  body.innerHTML = users.map((user, index) => `
    <tr class="${user.id === APP_STATE.user.id ? 'self-row' : ''}">
      <td>#${index + 1}</td>
      <td>
        <div class="table-user"><span class="avatar avatar-sm">${escapeHtml(user.initials)}</span><div><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.handle)}</small></div></div>
      </td>
      <td>${Number(user.totalDistance || 0).toFixed(1)} km</td>
      <td>${Number(user.totalRuns || 0)}</td>
    </tr>
  `).join('');
}

function renderRewards() {
  syncChallengeRewards();
  const grid = document.getElementById('rewards-grid');
  const medals = document.getElementById('medals-grid');
  if (!grid || !medals) return;

  const rewards = getRewards();
  const orders = getOrders().filter((order) => order.userId === APP_STATE.user.id);
  const available = rewards.filter((reward) => reward.status === 'available').length;
  const shipped = orders.filter((order) => order.status === 'Shipped' || order.status === 'Delivered').length;

  setText('rewards-medals-count', APP_STATE.user.medals.length);
  setText('rewards-shipped-count', shipped);
  setText('rewards-available-count', available);

  const badge = document.getElementById('bottom-rewards-badge');
  if (badge) {
    badge.textContent = available;
    badge.style.display = available ? 'block' : 'none';
  }

  if (rewards.length === 0) {
    grid.innerHTML = emptyState('No rewards earned yet', 'Complete joined challenges with verified Strava runs.');
  } else {
    grid.innerHTML = rewards.map((reward) => `
      <article class="reward-card ${reward.status === 'available' ? 'claimable' : ''}">
        <div class="reward-icon-wrap">${icon('gift')}</div>
        <div class="reward-info">
          <h3>${escapeHtml(reward.title)}</h3>
          <p>${escapeHtml(reward.from)}</p>
          <span class="reward-status ${escapeHtml(reward.status)}">${rewardStatusLabel(reward.status)}</span>
          ${reward.tracking ? `<small>Tracking: ${escapeHtml(reward.tracking)}</small>` : ''}
          ${reward.trackingUrl ? `<a href="${escapeHtml(reward.trackingUrl)}" target="_blank" rel="noopener">Track shipment</a>` : ''}
        </div>
        ${reward.status === 'available' ? `<button class="btn btn-primary btn-sm" onclick="openClaimModal('${reward.id}')">Claim</button>` : ''}
      </article>
    `).join('');
  }

  medals.innerHTML = APP_STATE.user.medals.length
    ? APP_STATE.user.medals.map((medal) => `<span class="medal-chip">${escapeHtml(medal)}</span>`).join('')
    : '<p class="muted-copy">Badges appear here after verified milestones.</p>';
}

function rewardStatusLabel(status) {
  const labels = {
    available: 'Ready to claim',
    claimed: 'Claim submitted',
    shipped: 'Shipped',
    delivered: 'Delivered'
  };
  return labels[status] || status;
}

function openClaimModal(rewardId) {
  const reward = getRewards().find((item) => item.id === rewardId && item.status === 'available');
  if (!reward) {
    showToast('error', 'Reward unavailable', 'This reward cannot be claimed right now.');
    return;
  }
  APP_STATE.currentClaimingRewardId = rewardId;
  setText('claim-reward-name', reward.title);
  setValue('claim-fullname', APP_STATE.user.name);
  setValue('claim-email', APP_STATE.user.email);
  setValue('claim-state', APP_STATE.user.state);
  openModal('claim-modal');
}

function submitClaimForm(event) {
  event.preventDefault();
  const rewards = getRewards();
  const reward = rewards.find((item) => item.id === APP_STATE.currentClaimingRewardId && item.status === 'available');
  if (!reward) {
    showToast('error', 'Claim failed', 'The reward could not be found.');
    return;
  }

  const order = {
    id: makeId('order'),
    userId: APP_STATE.user.id,
    user: APP_STATE.user.name,
    handle: APP_STATE.user.handle,
    accountState: APP_STATE.user.state,
    rewardId: reward.id,
    reward: reward.title,
    challenge: reward.from,
    fullName: valueOf('claim-fullname'),
    email: valueOf('claim-email'),
    phone: `+91 ${valueOf('claim-phone')}`,
    altPhone: valueOf('claim-alt-phone') ? `+91 ${valueOf('claim-alt-phone')}` : '',
    address1: valueOf('claim-address1'),
    address2: valueOf('claim-address2'),
    landmark: valueOf('claim-landmark'),
    city: valueOf('claim-city'),
    stateLoc: valueOf('claim-state'),
    pincode: valueOf('claim-pincode'),
    size: valueOf('claim-size'),
    notes: valueOf('claim-notes'),
    status: 'Pending Shipping',
    date: new Date().toISOString()
  };

  if (!order.fullName || !order.email || !order.phone || !order.address1 || !order.city || !order.stateLoc || !order.pincode) {
    showToast('error', 'Missing delivery info', 'Complete the required delivery fields.');
    return;
  }

  reward.status = 'claimed';
  setRewards(rewards);
  const orders = getOrders();
  orders.unshift(order);
  setOrders(orders);
  closeModal('claim-modal');
  event.target.reset();
  renderRewards();
  showToast('success', 'Claim submitted', 'Admin can now open the shipping portal and fulfill this order.');
}

function valueOf(id) {
  return document.getElementById(id)?.value.trim() || '';
}

function renderProfile() {
  if (!APP_STATE.user) return;
  updateProfileUI();
  const runsBody = document.getElementById('profile-runs-body');
  if (!runsBody) return;
  const runs = getRuns().slice().sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

  if (runs.length === 0) {
    runsBody.innerHTML = '<tr><td colspan="5" class="table-empty">No Strava runs synced yet.</td></tr>';
  } else {
    runsBody.innerHTML = runs.map((run) => `
      <tr>
        <td><strong>${escapeHtml(run.title)}</strong><small>${formatDateTime(run.startDate)}</small></td>
        <td>${Number(run.distanceKm).toFixed(1)} km</td>
        <td>${escapeHtml(run.elevationGain ? `${Math.round(run.elevationGain)} m` : '0 m')}</td>
        <td>${escapeHtml(run.pace)}</td>
        <td><span class="badge ${run.status === 'verified' ? 'badge-green' : 'badge-gold'}">${escapeHtml(run.statusLabel)}</span></td>
      </tr>
    `).join('');
  }

  setText('profile-km', APP_STATE.user.totalDistance.toFixed(1));
  setText('profile-runs', APP_STATE.user.totalRuns);
  setText('profile-streak', APP_STATE.user.streak);
  setText('profile-rank-display', APP_STATE.user.rank ? `#${APP_STATE.user.rank}` : '--');

  const status = document.getElementById('strava-status-text');
  const button = document.getElementById('strava-connect-btn');
  if (status && button) {
    status.textContent = isStravaConnected() ? 'Connected' : 'Not connected';
    status.className = `service-status ${isStravaConnected() ? 'connected' : 'disconnected'}`;
    button.textContent = isStravaConnected() ? 'Disconnect' : 'Connect';
    button.className = isStravaConnected() ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm';
  }
}

function toggleStravaConnection() {
  if (isStravaConnected()) {
    disconnectStrava();
  } else {
    connectStrava();
  }
}

function connectStrava() {
  const config = getConfig();
  if (!config.stravaClientId) {
    showToast('warning', 'Strava not configured', 'Add the Strava Client ID in the admin console.');
    return;
  }

  const redirectUri = window.location.origin + window.location.pathname;
  const state = makeId('strava_state');
  localStorage.setItem('runAddict_strava_oauth_state', state);
  localStorage.setItem('runAddict_strava_redirect_uri', redirectUri);

  const params = new URLSearchParams({
    client_id: config.stravaClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
    state
  });

  window.location.href = `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

function disconnectStrava() {
  const confirmed = confirm('Disconnect Strava for this account? Synced runs will be removed from this local device.');
  if (!confirmed) return;
  setStravaConnected(false);
  setRuns([]);
  setRewards([]);
  recalculateUserStats();
  initializeApp();
  showToast('info', 'Strava disconnected', 'Runs and local rewards were cleared for this user.');
}

async function handleStravaCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const error = params.get('error');
  if (!code && !error) return;

  window.history.replaceState({}, document.title, window.location.pathname);

  if (error) {
    showToast('error', 'Strava denied', 'Strava did not authorize this connection.');
    return;
  }

  const expectedState = localStorage.getItem('runAddict_strava_oauth_state');
  if (expectedState && params.get('state') !== expectedState) {
    showToast('error', 'Strava blocked', 'OAuth state did not match.');
    return;
  }

  localStorage.removeItem('runAddict_strava_oauth_state');
  const config = getConfig();
  if (!config.stravaExchangeUrl) {
    localStorage.setItem('runAddict_strava_pending_code', code);
    showToast('warning', 'Exchange endpoint missing', 'Admin must configure a Strava exchange API to finish syncing.');
    return;
  }

  try {
    showToast('info', 'Syncing Strava', 'Fetching verified running activities.');
    const response = await fetch(config.stravaExchangeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        redirectUri: localStorage.getItem('runAddict_strava_redirect_uri') || (window.location.origin + window.location.pathname)
      })
    });
    if (!response.ok) throw new Error(`Exchange failed: ${response.status}`);
    const payload = await response.json();
    await importStravaPayload(payload);
  } catch (error) {
    showToast('error', 'Strava sync failed', 'Check the Strava exchange endpoint in admin settings.');
  }
}

async function importStravaPayload(payload) {
  let activities = Array.isArray(payload.activities) ? payload.activities : [];

  if (!activities.length && payload.access_token) {
    const response = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=100', {
      headers: { Authorization: `Bearer ${payload.access_token}` }
    });
    if (response.ok) activities = await response.json();
  }

  if (!activities.length) {
    showToast('warning', 'No activities', 'Strava returned no running activities.');
    return;
  }

  const existing = getRuns();
  const existingIds = new Set(existing.map((run) => run.providerId));
  const syncIds = new Set();
  const imported = [];
  const flagged = getFlaggedRuns();

  activities.forEach((activity) => {
    const run = normalizeStravaActivity(activity);
    if (!run || existingIds.has(run.providerId) || syncIds.has(run.providerId)) return;
    syncIds.add(run.providerId);
    const review = verifyRun(run);
    run.status = review.flags.length ? 'review' : 'verified';
    run.statusLabel = review.flags.length ? 'Admin review' : 'Verified';
    run.flags = review.flags;
    imported.push(run);

    if (review.flags.length) {
      flagged.unshift({
        id: makeId('flag'),
        userId: APP_STATE.user.id,
        user: APP_STATE.user.name,
        handle: APP_STATE.user.handle,
        runId: run.id,
        providerId: run.providerId,
        distance: `${run.distanceKm.toFixed(1)} km`,
        date: run.startDate,
        reason: review.flags.join('; '),
        run
      });
    }
  });

  setRuns([...imported, ...existing].sort((a, b) => new Date(b.startDate) - new Date(a.startDate)));
  setFlaggedRuns(flagged);
  setStravaConnected(true);
  recalculateUserStats();
  syncChallengeRewards();
  initializeApp();
  showToast('success', 'Strava synced', `${imported.length} new activities imported. ${imported.filter((run) => run.status === 'review').length} sent to review.`);
}

function normalizeStravaActivity(activity) {
  const sport = String(activity.sport_type || activity.type || '').toLowerCase().replace(/\s+/g, '');
  const allowed = ['run', 'trailrun', 'virtualrun'];
  if (!allowed.includes(sport)) return null;

  const distanceKm = Number(activity.distance || 0) / 1000;
  const movingSeconds = Number(activity.moving_time || activity.elapsed_time || 0);
  const paceSecondsPerKm = distanceKm > 0 ? movingSeconds / distanceKm : 0;

  return {
    id: makeId('run'),
    provider: 'strava',
    providerId: String(activity.id),
    title: activity.name || 'Strava Run',
    startDate: activity.start_date || activity.start_date_local || new Date().toISOString(),
    distanceKm: Number(distanceKm.toFixed(2)),
    movingSeconds,
    elapsedSeconds: Number(activity.elapsed_time || movingSeconds),
    paceSecondsPerKm,
    pace: formatPace(paceSecondsPerKm),
    elevationGain: Number(activity.total_elevation_gain || 0),
    averageSpeed: Number(activity.average_speed || 0),
    source: 'Strava',
    rawType: activity.sport_type || activity.type || 'Run'
  };
}

function formatPace(secondsPerKm) {
  if (!secondsPerKm || !Number.isFinite(secondsPerKm)) return '--';
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}/km`;
}

function verifyRun(run) {
  const flags = [];
  if (run.distanceKm < 0.4) flags.push('distance below running threshold');
  if (!run.movingSeconds || run.movingSeconds <= 0) flags.push('missing moving time');
  if (run.paceSecondsPerKm && run.paceSecondsPerKm < 150) flags.push('pace faster than allowed running threshold');
  if (run.paceSecondsPerKm && run.paceSecondsPerKm > 1200) flags.push('pace outside running range');
  if (run.elapsedSeconds && run.movingSeconds && run.elapsedSeconds / run.movingSeconds > 3) flags.push('elapsed time too different from moving time');
  return { flags };
}

function toggleNotifications() {
  const modalId = 'notifications-modal';
  let modal = document.getElementById(modalId);
  if (!modal) {
    const orders = getOrders().filter((order) => order.userId === APP_STATE.user.id).slice(0, 5);
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header"><h3 class="modal-title">Notifications</h3><button class="modal-close" onclick="closeModal('${modalId}')">${icon('close')}</button></div>
        <div class="modal-body">
          ${orders.length ? orders.map((order) => `<div class="notice-item"><strong>${escapeHtml(order.reward)}</strong><span>${escapeHtml(order.status)}</span></div>`).join('') : emptyState('No notifications', 'Shipping and challenge updates will appear here.')}
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  openModal(modalId);
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
  if (type === 'success') triggerBurst();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icon(type === 'success' ? 'check' : type === 'error' ? 'close' : 'activity')}</span>
    <div class="toast-content"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span></div>
    <button class="modal-close" onclick="this.parentElement.remove()">${icon('close')}</button>
  `;
  container.appendChild(toast);
  window.setTimeout(() => {
    toast.classList.add('toast-out');
    window.setTimeout(() => toast.remove(), 250);
  }, 4200);
}

function triggerBurst() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.createElement('div');
  layer.className = 'burst-layer';
  const colors = ['#ff4d1c', '#ff8c42', '#00d68f', '#4c8eff'];
  layer.innerHTML = Array.from({ length: 14 }).map((_, index) => {
    const angle = (360 / 14) * index;
    const distance = 52 + (index % 4) * 10;
    return `<span class="burst-dot" style="--angle:${angle}deg;--distance:${distance}px;--color:${colors[index % colors.length]}"></span>`;
  }).join('');
  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), 820);
}

document.addEventListener('click', (event) => {
  if (event.target.classList.contains('modal-overlay') && event.target.classList.contains('active')) {
    event.target.classList.remove('active');
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach((modal) => modal.classList.remove('active'));
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  ensureStorage();
  registerServiceWorker();
  if (getConfig().googleClientId) {
    await setupGoogleIdentity({ prompt: false });
  }
  const hasSession = loadSession();
  if (hasSession) {
    document.getElementById('auth-screen')?.classList.add('hidden');
    showApp();
    await handleStravaCallback();
  } else {
    document.getElementById('auth-screen')?.classList.remove('hidden');
  }
});

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

Object.assign(window, {
  switchAuthTab,
  handleSignIn,
  handleSignUp,
  handleGoogleAuth,
  handleSignOut,
  nextOnboardingStep,
  skipOnboarding,
  navigateTo,
  renderLeaderboard,
  filterChallenges,
  filterEvents,
  joinChallenge,
  openChallengeModal,
  joinEvent,
  saveProfileSettings,
  toggleStravaConnection,
  toggleNotifications,
  openClaimModal,
  submitClaimForm,
  openModal,
  closeModal
});
