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
```

`FIREBASE_PROJECT_ID` is a public Firebase project identifier, not a private
service-account key. The auth routes verify the Firebase ID token supplied by
the existing frontend login. Pastor authorization is restricted to the exact
verified token email `rev.ibrahim@lincministry.com` using an anchored,
case-insensitive allowlist pattern.

## Authentication API

- `GET /api/v1/auth/session` verifies the caller and reports Pastor access.
- `GET /api/v1/auth/pastor-access` requires the allowlisted Pastor email.

Both endpoints require `Authorization: Bearer <Firebase ID token>`.

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
