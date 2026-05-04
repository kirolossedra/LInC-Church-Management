# LINC Pastor Admin Dashboard

A React + Vite admin dashboard for the LINC church pastor to:
- View all spiritual gifts assessment **submissions** from the form
- Manage a **calendar** of meetings with trainees
- Schedule meetings with **Google Meet** links (automatic link generation)

## Quick Start

```bash
cd admin
npm install
npm run dev
```

Open http://localhost:5173

## Configuration

### 1. Firebase
Edit `src/firebase/config.js` and paste your Firebase project credentials.
The app reads from the same `form/` path that `index.html` writes to, and creates a `meetings/` path for scheduled meetings.

**Enable Firebase Authentication** in the Firebase Console:
- Go to Authentication → Sign-in method → Email/Password → Enable
- Create a user for the pastor (e.g. `rev.Ibrahim@lincministry.com`)

### 2. Google Meet Integration
Edit `src/services/googleMeet.js` and set:

```js
export const GOOGLE_CLIENT_ID = "YOUR_CLIENT_ID.apps.googleusercontent.com";
export const GOOGLE_API_KEY   = "YOUR_API_KEY";
```

**Google Cloud Console steps:**
1. Create a project → Enable **Google Calendar API**
2. Create an **API key** (restrict to Calendar API)
3. Create **OAuth 2.0 Client ID** (Web application)
   - Add authorized JavaScript origin: `http://localhost:5173` (dev) and your production domain
4. Add the pastor's Google account as a test user (OAuth consent screen)

Once configured, the "🎥 Create Meet" button in the meeting scheduler will:
- Ask the pastor to authorize with Google once
- Create a Google Calendar event with a Meet link
- Paste the Meet link into the form automatically

If Google API is not yet configured the app still works — you can paste Meet links manually.

## Build for Production

```bash
npm run build   # outputs to dist/
```

Deploy the `dist/` folder to any static host (Firebase Hosting, Netlify, Vercel, etc.).
