# Fitbit Large Screen Dashboard (V0)

A lightweight, purely client-side web application designed to render health
and fitness data on large-screen formats. This project addresses the
deprecation of the legacy Fitbit Web Dashboard by integrating directly with
the **Google Health API REST endpoints**.

The application runs entirely within the browser as a static site hosted
via GitHub Pages (`https://annolangen.github.io/fitbit`). It utilizes an
explicit, secure authentication architecture tailored for public,
serverless clients.

## Architecture & Security Blueprint

Because this application lacks a backend server to securely store secrets
or orchestrate standard authorization flows, it functions strictly as an
OAuth 2.0 **Public Client**:

* **Authentication via PKCE:** Implements **Authorization Code Flow with Proof Key for Code Exchange (PKCE)**. The browser generates a runtime cryptographic string (`code_verifier`) and a SHA-256 hash challenge (`code_challenge`) to negotiate tokens securely without exposing a Client Secret in the client-side source code.
* **Direct REST Ingestion:** Data streams natively from Google Health API endpoints via asynchronous `fetch()` operations using standard `Bearer` token authorization headers.
* **CORS Compatibility:** Origin requests hitting `https://health.googleapis.com` are natively handled by Google's API routing layer, removing the need for a proxy server or routing middleware.

---

## Google Cloud Console Provisioning Guide

To run or deploy this application, you must provision an application footprint in the Google Cloud Platform (GCP) console to manage credentials.

### 1. Project Initialization & API Activation
1. Access the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown near the top-left logo and select **New Project**. Name it descriptively (e.g., `fitbit-large-screen`).
3. Use the sidebar to go to **APIs & Services** > **Library**. Search for the **Google Health API**, click it, and select **Enable**.

### 2. Configure the OAuth Platform Screen
Google manages authorization via the **Google Auth / OAuth Platform** portal.
1. Navigate to **APIs & Services** > **OAuth platform overview** (or **OAuth consent screen**). Click **Get Started**.
2. **App Information:** Enter your application name (e.g., `Fitbit Large Screen`) and specify your user support email.
3. **Audience:** Select **External** to ensure personal accounts outside an organizational workspace can interface with the runtime.
4. **Scopes:** Click *Add or Remove Scopes*, search for `googlehealth`, and select:
   `.../auth/googlehealth.sleep.readonly`
5. **Test Users:** Under the *Audience/Test Users* profile, explicitly add your primary device-linked Google/Fitbit email addresses (e.g., your testing aliases). *Crucial: While the app remains unverified and in "Testing" mode, only accounts on this roster can successfully authenticate.*

### 3. Generate OAuth 2.0 Credentials
1. Navigate to **APIs & Services** > **Credentials**.
2. Click **+ Create Credentials** at the top and select **OAuth client ID**.
3. Choose **Web application** from the *Application type* dropdown menu.
4. **Authorized JavaScript origins:** Enter your local address and production domains (do not include trailing slashes or sub-paths):
   * `http://localhost:8080`
   * `https://annolangen.github.io`
5. **Authorized redirect URIs:** Paste the precise callback targets (Google matches these strings character-for-character):
   * `http://localhost:8080`
   * `http://localhost:8080/`
   * `https://annolangen.github.io/fitbit`
   * `https://annolangen.github.io/fitbit/`
6. Click **Create**. Download the resulting configuration JSON file. Note your `client_id` and `client_secret` strings.

---

## Installation & Configuration

### Local Deployment
Because the codebase is self-contained in a single, lightweight HTML asset, no packaging systems (`package.json`), node modules, or modern build frameworks are required.

1. Clone or download `index.html` into a local directory.
2. Edit `index.html` configuration declarations with your designated GCP parameters:
   ```javascript
   const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
   const CLIENT_SECRET = 'YOUR_GOOGLE_CLIENT_SECRET_STRING';
   ```
3. Open a terminal path inside that folder and execute a light HTTP layer using Python 3:

```shell
python3 -m http.server 8080
```

4. Point your browser to http://localhost:8080 to initiate testing.

## Scope & Implementation Details (V0)

The initial milestone (V0) establishes baseline end-to-end telemetry
verification:

Token Lifetime: Access tokens are cached safely in volatile
sessionStorage. Closing the browser tab terminates token exposure.

Sleep Analytics Parsing: Google Health API endpoints restrict sleep queries
by forcing strict sorting structures against sleep.interval.civil_end_time
(filtering directly against start_time configurations is rejected by the
server).

Data Selection: The processing logic strips granular sub-interval phase
records (REM, deep, light cycles), sorts the remaining top-level sessions
chronologically via their termination boundaries, and calculates a reliable
duration measurement for the most recent primary sleep segment.
