/// <reference lib="dom" />

import {html, render} from 'lit-html';

const CLIENT_ID =
  '356448156280-v8uhggf2sfgrgu5tb099tlg3qu0phe22.apps.googleusercontent.com';
const REDIRECT_URI = `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}`;
const SCOPES = 'https://www.googleapis.com/auth/googlehealth.sleep.readonly';

type AppState = {
  error?: string;
  sleepSummary?: string;
  sleepData?: unknown;
};

const state: AppState = {
  sleepSummary: 'Loading...',
  sleepData: 'Waiting for payload...',
};

function startAuthFlow() {
  window.location.href =
    'https://accounts.google.com/o/oauth2/v2/auth?response_type=token&' +
    `client_id=${encodeURIComponent(CLIENT_ID)}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `scope=${encodeURIComponent(SCOPES)}`;
}

function checkTokenInUrl() {
  const hash = window.location.hash;
  if (!hash) return;

  const params = new URLSearchParams(hash.substring(1));
  const token = params.get('access_token');
  const error = params.get('error');

  if (error) {
    state.error = `Authentication error: ${error}`;
    return;
  }
  if (token) {
    sessionStorage.setItem('access_token', token);
    window.history.replaceState({}, document.title, window.location.pathname);
    advanceState();
  }
}

async function fetchSleepData(): Promise<void> {
  const token = sessionStorage.getItem('access_token');
  if (!token) return;

  const lookbackDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const url = `https://health.googleapis.com/v4/users/me/dataTypes/sleep/dataPoints?filter=sleep.interval.civil_end_time>=%22${lookbackDate}%22`;

  try {
    const response = await fetch(url, {
      headers: {Authorization: `Bearer ${token}`, Accept: 'application/json'},
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();

    state.sleepData = JSON.stringify(data, null, 2);

    if (data.dataPoints && data.dataPoints.length > 0) {
      const mainSessions = data.dataPoints
        .filter(
          (point: {
            sleep?: {interval?: {endTime?: string; startTime?: string}};
          }) => point.sleep?.interval,
        )
        .sort(
          (
            a: {sleep?: {interval?: {endTime?: string}}},
            b: {sleep?: {interval?: {endTime?: string}}},
          ) =>
            new Date(b.sleep?.interval?.endTime ?? 0).getTime() -
            new Date(a.sleep?.interval?.endTime ?? 0).getTime(),
        );

      if (mainSessions.length > 0) {
        const lastNight = mainSessions[0];
        const start = new Date(lastNight.sleep?.interval?.startTime ?? 0);
        const end = new Date(lastNight.sleep?.interval?.endTime ?? 0);
        const totalMinutes = (end.getTime() - start.getTime()) / 1000 / 60;
        const hours = Math.floor(totalMinutes / 60);
        const mins = Math.round(totalMinutes % 60);
        state.sleepSummary = `${hours}h ${mins}m`;
      } else {
        state.sleepSummary = 'No main log found.';
      }
    } else {
      state.sleepSummary = 'No log found for last night.';
    }
  } catch (error) {
    state.error = `Failed to pull data from Google Health API: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function logout() {
  sessionStorage.clear();
  window.location.reload();
}

async function advanceState(): Promise<void> {
  if (sessionStorage.getItem('access_token')) {
    await fetchSleepData();
    renderPage();
  } else {
    checkTokenInUrl();
  }
}

const dashboardHtml = () =>
  html`<!-- Dashboard View -->
    <div
      id="dashboard-view"
      class="box has-background-grey-darker has-text-light"
    >
      <h3 class="title is-5">Last Night's Sleep</h3>
      <div class="title is-1 has-text-warning">${state.sleepSummary}</div>
      <button
        id="logout-button"
        @click=${logout}
        class="button is-danger is-light mb-4"
      >
        Disconnect
      </button>

      <h4 class="title is-6">Raw API Response Object:</h4>
      <pre
        id="raw-json"
        class="content has-background-black-ter has-text-success p-4"
      >
${state.sleepData}</pre>
    </div>`;

const authHtml = () =>
  html`<!-- Auth View -->
    <div class="box has-background-grey-darker has-text-light">
      <h3 class="title is-5">Connect Your Account</h3>
      <p class="mb-4">
        Authorize this application to read your sleep metric data securely using
        Google OAuth 2.0.
      </p>
      <button @click=${startAuthFlow} class="button is-info">
        Login with Google
      </button>
    </div>`;

const errorHtml = () =>
  html`<!-- Error View -->
    <div
      id="error-view"
      class="notification is-danger is-light ${state.error ? '' : 'is-hidden'}"
    >
      <strong>Error:</strong> <span id="error-message"></span>
    </div>`;

function pageHtml() {
  const token = sessionStorage.getItem('access_token');
  return html`<div class="container is-max-desktop">
    <section class="section">
      <h1 class="title is-2 has-text-info">
        Fitbit Data (via Google Health API)
      </h1>
      <p class="subtitle is-6 has-text-grey-lighter">
        A static dashboard running completely inside your browser.
      </p>

      ${token ? dashboardHtml() : authHtml()} ${state.error ? errorHtml() : ''}
    </section>
  </div>`;
}

const renderPage = () => render(pageHtml(), document.body);

window.addEventListener('popstate', renderPage);
window.addEventListener('hashchange', renderPage);
window.addEventListener('click', renderPage);

renderPage();
advanceState();
