# ChurchOne Spring Backend

This Java 21 Spring Boot service is being built beside the existing `backend/` Hono Worker. Hono remains the production backend until each Java route is tested and deliberately switched over.

## Current scope — version 0.0.3

- Public `GET /`, `GET /health`, and `GET /actuator/health`
- Firebase Admin Java SDK initialization
- Verification of the existing Firebase ID token from `Authorization: Bearer <token>`
- Pastor authorization through the existing Realtime Database `admins/` branch
- Exact accepted Pastor role: `pastor`
- No custom login and no second Pastor token
- Existing `/administrator` frontend pipeline remains untouched
- Stateless Spring Security with JSON `401`, `403`, and `503` responses
- Automated unit and MockMvc security tests
- Public `POST /api/v1/email/test` compatibility route for validating Brevo from Spring
- Sandbox-by-default email testing with a fixed server-configured recipient

The meeting-invitation and People Development email routes still run through Hono. The original Hono test-email route also remains available during compatibility validation. This package does not switch the production frontend to Spring Boot.

## Brevo test-email endpoint

### `POST /api/v1/email/test`

The request body accepts only an optional Boolean `sandbox` field:

```json
{
  "sandbox": true
}
```

Sandbox mode defaults to `true`. The recipient is always taken from the server-side `BREVO_TEST_RECIPIENT` variable; callers cannot provide an arbitrary recipient. A successful request returns HTTP `201`. Invalid fields or values return `400`, missing server configuration returns `503`, and provider/network failures return `502`.

This route is public for compatibility with the existing Hono endpoint. Keep sandbox mode enabled until the deployed Spring route has passed its health and validation checks.

## Authentication endpoints

### `GET /api/v1/auth/session`

Requires the Firebase ID token already available in the signed-in browser session:

```http
Authorization: Bearer <firebase-id-token>
```

A valid Firebase account receives `200`. The response states whether the email is currently stored as `pastor` under the existing `admins/` branch.

### `GET /api/v1/auth/pastor-access`

Requires both:

1. A valid Firebase ID token.
2. An exact `pastor` value for the normalized email under `admins/`.

A valid non-Pastor Firebase account receives `403`. A missing or invalid token receives `401`.

## Why this does not add another login

Firebase Authentication remains responsible for the user login. Later, the React client will call `currentUser.getIdToken()` and send that already-issued token to Spring Boot. The Pastor does not enter credentials again, and Spring Boot does not issue a separate ChurchOne token.

## Firebase Admin variables (later phase)

Configure Firebase only during the later Firebase Admin activation phase. Version `0.0.3` continues to support `FIREBASE_ENABLED=false` while the Brevo route is validated.

| Variable | Required | Value |
|---|---:|---|
| `FIREBASE_ENABLED` | Yes | Keep `false` during the Brevo migration |
| `FIREBASE_PROJECT_ID` | Later | Required only when Firebase Admin is deliberately enabled |
| `FIREBASE_DATABASE_URL` | Later | Required only when Firebase Admin is deliberately enabled |
| `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64` | Later | Required on Back4app only when Firebase Admin is enabled |
| `FIREBASE_CHECK_REVOKED_TOKENS` | Later | Default `false` |
| `FIREBASE_ROLE_LOOKUP_TIMEOUT` | Later | Default `5s` |
| `APP_VERSION` | Recommended | `0.0.3` |
| `CORS_ALLOWED_ORIGINS` | No | Defaults to production and local frontend origins |

Do not commit the Firebase service-account JSON or its encoded value.

## Required Brevo variables

Configure these on the Spring backend host before testing the email route:

| Variable | Required | Purpose |
|---|---:|---|
| `BREVO_API_KEY` | Yes | Existing Brevo API key used by Hono |
| `BREVO_SENDER_EMAIL` | Yes | Existing verified sender address |
| `BREVO_SENDER_NAME` | Yes | Sender display name |
| `BREVO_TEST_RECIPIENT` | Yes | Fixed recipient for this test route |
| `BREVO_REQUEST_TIMEOUT` | No | Provider timeout; defaults to `15s` |

Keep `FIREBASE_ENABLED=false` during this phase. Do not copy Firebase service-account credentials merely to enable the Brevo route.

## Obtain and encode the Firebase service account

1. Open the existing Firebase project.
2. Open **Project settings → Service accounts**.
3. Generate a new private key for Firebase Admin.
4. Save the downloaded JSON outside the repository.
5. From PowerShell, run this from `backend-spring`:

```powershell
.\scripts\encode-firebase-service-account.ps1 -Path "C:\secure\firebase-service-account.json"
```

6. Copy the single Base64 output into the Back4app variable `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64`.
7. Delete unnecessary local copies of the key after securely storing the required copy.

## Local run without Firebase

The application can still start for health and test work with Firebase disabled:

```powershell
$env:FIREBASE_ENABLED="false"
mvn spring-boot:run
```

Protected authentication endpoints return `503` until Firebase is configured.

## Local run with Firebase

```powershell
$env:FIREBASE_ENABLED="true"
$env:FIREBASE_PROJECT_ID="your-project-id"
$env:FIREBASE_DATABASE_URL="https://your-project-default-rtdb.firebaseio.com"
$env:FIREBASE_SERVICE_ACCOUNT_JSON_BASE64="your-base64-value"
mvn spring-boot:run
```

## Automated tests

```bash
mvn --batch-mode --no-transfer-progress clean verify
```

The existing GitHub Actions workflow runs this command whenever `backend-spring/**` changes.
