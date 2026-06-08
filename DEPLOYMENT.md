# Run Addict Deployment Notes

## Admin Login

- Open `admin.html`.
- Username: `admin`
- Password: `admin`
- Use the admin console to save the Shipping Portal URL, Strava Client ID, Strava Exchange API URL, and Google Client ID.
- For production, do not rely on a static browser-only admin password. Use a backend/session gate like `api/admin-auth.example.js`, store `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` as server environment variables, and protect the deployed admin route.

## User Login

- Users can sign up with email/password directly in `index.html`.
- Google login needs a Google Web Client ID saved in the admin console.
- For local testing, add your local origin such as `http://127.0.0.1:4173` to Google Cloud authorized JavaScript origins.
- For production, add your deployed domain origin such as `https://yourdomain.com`.

## Strava OAuth

- Create a Strava app and save the Client ID in admin.
- Never put the Strava Client Secret in browser code.
- Copy `api/strava-exchange.example.js` to your deployed backend route, for example `api/strava-exchange.js`.
- Set server environment variables:
  - `STRAVA_CLIENT_ID`
  - `STRAVA_CLIENT_SECRET`
  - `ALLOWED_ORIGINS`, for example `https://yourdomain.com,http://127.0.0.1:4173`
- Paste the deployed exchange route into admin as the Strava Exchange API URL.

## Mountain Climber Tracking

- Mountain Climber is trackable because Strava activities include `total_elevation_gain`.
- The app only counts verified `Run`, `TrailRun`, and `VirtualRun` activities inside the challenge dates.
- Elevation challenge progress is the sum of each verified activity's elevation gain in meters.

## Rewards And Shipping

- Users claim earned rewards from the Rewards tab.
- The claim form collects full delivery details.
- Admin opens Reward Fulfillment, copies the shipping packet, opens the configured shipping portal, and adds tracking after shipping.

## Phone Install

- Open the deployed `index.html` URL on the phone.
- iPhone: Safari > Share > Add to Home Screen.
- Android: Chrome > menu > Add to Home screen or Install app.
- APK is Android-only. iPhone cannot install an APK; iPhone needs the PWA install flow above or a native iOS `.ipa` built with an Apple Developer account.
- To create an Android APK later, wrap the deployed PWA with Android Trusted Web Activity or Capacitor, then sign it with your Android release keystore.
