# Run Addict

Run Addict is a mobile-first PWA for verified running challenges, Strava-powered activity sync, leaderboards, events, rewards, and admin fulfillment.

## Local Run

Serve the folder with any static server:

```bash
npx serve .
```

Then open:

- User app: `index.html`
- Admin console: `admin.html`

## Admin

Temporary local admin credentials:

- Username: `admin`
- Password: `admin`

For production, protect the admin route with a real backend/session gate. See `api/admin-auth.example.js`.

## Connectors

- Strava OAuth requires a backend exchange endpoint so the browser never exposes the Strava client secret.
- Google sign-in requires a Google Web Client ID and authorized JavaScript origins.
- Deployment details are in `DEPLOYMENT.md`.

## Phone Install

- iPhone: open the deployed URL in Safari, then Share > Add to Home Screen.
- Android: open the deployed URL in Chrome, then Install app/Add to Home screen.
- APK is Android-only; iPhone needs PWA install or a native iOS `.ipa`.
