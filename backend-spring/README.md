# ChurchOne Spring Backend

This is the new Java 21 and Spring Boot backend foundation. It is intentionally separate from the existing `backend/` Hono Worker, which remains unchanged and continues serving production during migration.

## Current scope

- Spring Boot application foundation
- Public `GET /` and `GET /health` endpoints
- Actuator `GET /actuator/health` endpoint
- CORS defaults matching the existing ChurchOne frontend
- Docker image tuned for a small Back4app container
- Automated Maven tests in GitHub Actions

No ChurchOne production route has been moved from Hono yet.

## Local run

Requires Java 21 and Maven:

```bash
mvn spring-boot:run
```

Then open:

```text
http://localhost:8080/health
```

## Local Docker test

From this directory:

```bash
docker build -t churchone-spring-backend .
docker run --rm -p 8080:8080 churchone-spring-backend
```

## Back4app initial deployment settings

Use these values on the container setup screen:

- **Name:** `churchone-spring-backend`
- **Branch:** `main`
- **Root directory:** `backend-spring`
- **Dockerfile:** `Dockerfile`
- **Port:** `8080`
- **Health path:** `/actuator/health`

No environment variables are mandatory for the first health-only deployment.

Optional variables:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | Container HTTP port |
| `APP_VERSION` | `0.0.1` | Version returned by `/health` |
| `CORS_ALLOWED_ORIGINS` | `https://lincministry.com,http://localhost:5173` | Comma-separated allowed frontend origins |

## Expected response

`GET /health` returns a response similar to:

```json
{
  "status": "UP",
  "service": "churchone-spring-backend",
  "version": "0.0.1",
  "timestamp": "2026-08-01T00:00:00Z"
}
```
