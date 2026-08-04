# LinC Hono backend

The Cloudflare Worker is the active LinC backend. It owns the
Brevo email routes and Firebase-backed authentication routes.

## Local development

```txt
npm install
npm run dev
```

Configure these Worker variables in `backend/.dev.vars` locally and
in the Cloudflare Worker environment for deployment:

```txt
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=
BREVO_TEST_RECIPIENT=
FIREBASE_PROJECT_ID=
FIREBASE_DATABASE_URL=
FIREBASE_SERVICE_ACCOUNT_EMAIL=
FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY=
BOOKING_NOTIFICATION_EMAIL=
NEXTGEN_MISSION_MAP_DATA=
```

`FIREBASE_PROJECT_ID` is a public Firebase project identifier, not a private
service-account key. The auth routes verify the Firebase ID token supplied by
the existing frontend login. Pastor authorization is restricted to the exact
verified token email `rev.ibrahim@lincministry.com` using an anchored,
case-insensitive allowlist pattern.

`FIREBASE_DATABASE_URL` is also a public Firebase project URL. People Notes
requests reuse the verified caller's short-lived Firebase ID token when
calling the Realtime Database REST API, so existing Firebase Security Rules
continue to apply. No Firebase service-account key is required for this
migration phase.

## Authentication API

- `GET /api/v1/auth/session` verifies the caller and reports Pastor access.
- `GET /api/v1/auth/pastor-access` requires the allowlisted Pastor email.

Both endpoints require `Authorization: Bearer <Firebase ID token>`.

## People Development Notes API

Every endpoint requires a valid Firebase Bearer token and the allowlisted
Pastor email:

- `GET /api/v1/people-notes`
- `POST /api/v1/people-notes`
- `POST /api/v1/people-notes/:personId/items`
- `POST /api/v1/people-notes/:personId/items/:itemId/comments`
- `PATCH /api/v1/people-notes/:personId/items/:itemId/follow-up`
- `DELETE /api/v1/people-notes/:personId`
- `DELETE /api/v1/people-notes/:personId/items/:itemId`
- `DELETE /api/v1/people-notes/:personId/items/:itemId/comments/:commentId`

React no longer reads or writes the `peopleNotes` Firebase branch directly.

## Public booking API

- `GET /api/v1/booking/schedule?start=YYYY-MM-DD&end=YYYY-MM-DD`
  returns privacy-safe availability and busy time ranges.
- `POST /api/v1/booking/requests` validates and stores an anonymous visitor's
  request, then notifies Pastor through Brevo.

The booking API uses short-lived Google OAuth access tokens generated from
`FIREBASE_SERVICE_ACCOUNT_EMAIL` and `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY`.
Both values must be configured as Cloudflare secrets. Never commit a Firebase
service-account JSON file or private key.

## Pastor Calendar API

All Pastor Calendar endpoints require a valid Firebase Bearer token and the
exact allowlisted Pastor email:

- `GET /api/v1/pastor-calendar`
- `POST /api/v1/pastor-calendar/meetings`
- `PATCH /api/v1/pastor-calendar/meetings/:meetingId`
- `DELETE /api/v1/pastor-calendar/meetings/:meetingId`
- `POST /api/v1/pastor-calendar/availability`
- `PATCH /api/v1/pastor-calendar/availability/:blockId`
- `DELETE /api/v1/pastor-calendar/availability/:blockId`
- `POST /api/v1/pastor-calendar/unavailability`
- `PATCH /api/v1/pastor-calendar/unavailability/:blockId`
- `DELETE /api/v1/pastor-calendar/unavailability/:blockId`
- `POST /api/v1/pastor-calendar/meeting-requests/:requestId/decision`

Request decisions and meeting cancellation notifications use backend Brevo.
The Pastor dashboard no longer accesses the calendar Firebase branches
directly. `POST /api/v1/meeting-invitations` is also Pastor-authenticated.

## NextGen mission map

`GET /api/v1/nextgen/mission-map` requires a Firebase password login for
`nextgen@montreal.ca`. The private map payload must be configured as the
Cloudflare secret `NEXTGEN_MISSION_MAP_DATA`; do not commit home addresses to
the frontend or Wrangler configuration.

## Deployment

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiating `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
