// Google Meet / Google Calendar API service
// Replace GOOGLE_CLIENT_ID and GOOGLE_API_KEY with your credentials
// The pastor must also grant OAuth consent for calendar.events scope

export const GOOGLE_CLIENT_ID =
  "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"; // TODO: replace
export const GOOGLE_API_KEY = "YOUR_GOOGLE_API_KEY"; // TODO: replace
const DISCOVERY_DOC =
  "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest";
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

let gapiInited = false;
let gisInited = false;
let tokenClient = null;

/** Load gapi + gis scripts and initialise them once */
export function loadGoogleApi() {
  return new Promise((resolve, reject) => {
    if (gapiInited && gisInited) {
      resolve();
      return;
    }

    // Load gapi script
    const gapiScript = document.createElement("script");
    gapiScript.src = "https://apis.google.com/js/api.js";
    gapiScript.onload = () => {
      window.gapi.load("client", async () => {
        await window.gapi.client.init({
          apiKey: GOOGLE_API_KEY,
          discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInited = true;
        if (gisInited) resolve();
      });
    };
    gapiScript.onerror = reject;
    document.body.appendChild(gapiScript);

    // Load gis (Google Identity Services) script
    const gisScript = document.createElement("script");
    gisScript.src = "https://accounts.google.com/gsi/client";
    gisScript.onload = () => {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: () => {},
      });
      gisInited = true;
      if (gapiInited) resolve();
    };
    gisScript.onerror = reject;
    document.body.appendChild(gisScript);
  });
}

/** Prompt the user for OAuth consent and return an access token */
export function authorizeGoogle() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error("Google API not loaded yet"));
      return;
    }
    tokenClient.callback = (response) => {
      if (response.error) reject(response);
      else resolve(response);
    };
    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: "consent" });
    } else {
      tokenClient.requestAccessToken({ prompt: "" });
    }
  });
}

/** Sign out of Google */
export function signOutGoogle() {
  const token = window.gapi.client.getToken();
  if (token !== null) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken("");
  }
}

/**
 * Create a Google Calendar event with a Meet link.
 * @param {object} params
 * @param {string} params.summary   - Event title
 * @param {string} params.description
 * @param {string} params.startDateTime  - ISO 8601 e.g. "2026-05-10T10:00:00"
 * @param {string} params.endDateTime    - ISO 8601
 * @param {string[]} params.attendeeEmails
 * @returns {Promise<object>} Google Calendar event resource
 */
export async function createMeetEvent({
  summary,
  description = "",
  startDateTime,
  endDateTime,
  attendeeEmails = [],
}) {
  const event = {
    summary,
    description,
    start: { dateTime: startDateTime, timeZone: "America/Toronto" },
    end: { dateTime: endDateTime, timeZone: "America/Toronto" },
    attendees: attendeeEmails.map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: `linc-meet-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const response = await window.gapi.client.calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    resource: event,
  });

  return response.result;
}
