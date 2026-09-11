# Security and Production Hardening

## Current status

Globetrotter is not yet in a fully production-grade state. The project has security controls in several layers, but the current configuration still includes hardcoded secrets and incomplete per-service ownership validation.

## Critical findings

1. JWT secrets are currently stored in committed files and environment examples.
2. Gateway-level JWT validation is present, but ownership control is not consistently enforced inside every service.
3. Rate limiting and CORS are enabled at the gateway, but service-level authorization still needs a unified contract.
4. Elasticsearch and OpenRouter are configured without a hardened production credential strategy.
5. Uploaded media and external source data are not yet stored through a validated storage pipeline.

## Required production rules

- Never commit `.env` files or real credentials.
- Use a unique JWT secret per environment.
- Keep the gateway as the public entrypoint and verify identity at the service boundary when needed.
- Enforce `req.user.id` ownership checks on user-owned resources.
- Require super-admin checks for admin-only operations.
- Treat external data as untrusted until normalized and approved.
- Validate MIME type, extension, size and file content on every upload.
- Rotate secrets and audit access regularly.

## Minimum controls implemented

- Helmet middleware in the gateway and chatbot service.
- CORS allowlist in the API gateway.
- Request sanitization for obvious HTML and null-byte injection patterns.
- JWT expiry and token verification in the gateway and auth service.
- Rate limiting on authentication and general API traffic.

## Remaining work before production

- Replace all runtime secrets with environment-provided values.
- Introduce a shared auth/claims contract across all services.
- Add role-based authorization and ownership checks in every protected route.
- Add secret rotation and observability, including correlation IDs and structured logs.
- Separate development and production Docker profiles.

## Verification checklist

- `JWT_SECRET` loaded from environment, never hardcoded.
- `ALLOWED_ORIGINS` restricted to real domain names.
- All admin routes protected by server-side role checks.
- All file uploads validated and stored outside the database when production scale matters.
- Secrets rotated and recorded in a secret manager or external vault.
