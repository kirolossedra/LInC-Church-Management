# ChurchOne Spring Backend

This Java 21 Spring Boot service is being built beside the existing `backend/` Hono Worker. Hono remains the production backend until each Java route is tested and deliberately switched over.

## Current scope — version 0.0.2

- Public `GET /`, `GET /health`, and `GET /actuator/health`
- Firebase Admin Java SDK initialization
- Verification of the existing Firebase ID token from `Authorization: Bearer <token>`
- Pastor authorization through the existing Realtime Database `admins/` branch
- Exact accepted Pastor role: `pastor`
- No custom login and no second Pastor token
- Existing `/administrator` frontend pipeline remains untouched
- Stateless Spring Security with JSON `401`, `403`, and `503` responses
- Automated unit and MockMvc security tests

The meeting-invitation and People Development email routes still run through Hono. This package does not switch the production frontend to Spring Boot.

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

## Required Back4app environment variables

Configure these before deploying version `0.0.2`:

| Variable | Required | Value |
|---|---:|---|
| `FIREBASE_ENABLED` | Yes | `true` |
| `FIREBASE_PROJECT_ID` | Yes | The same Firebase project ID used by Netlify |
| `FIREBASE_DATABASE_URL` | Yes | The existing Realtime Database URL |
| `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64` | Yes on Back4app | Base64 of the Firebase Admin service-account JSON |
| `FIREBASE_CHECK_REVOKED_TOKENS` | No | Default `false` |
| `FIREBASE_ROLE_LOOKUP_TIMEOUT` | No | Default `5s` |
| `APP_VERSION` | Recommended | `0.0.2` |
| `CORS_ALLOWED_ORIGINS` | No | Defaults to production and local frontend origins |

Do not commit the Firebase service-account JSON or its encoded value.

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
