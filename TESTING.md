# Testing and verification strategy

## Current status

The project still lacks a complete automated suite. The build verification below is the strongest fresh evidence currently available for the frontend.

## Commands executed

- Frontend dependency install: `cd frontend && npm install`
- Frontend production build: `cd frontend && npm run build`

### Fresh evidence

The build succeeded with Vite and produced the bundle without a blocking asset error in the current workspace.

Observed output summary:

```text
✓ 492 modules transformed.
```

## Minimum required future coverage

1. Unit tests for auth utilities, route guards, and pricing helpers.
2. API tests for login, protected routes, and admin-only endpoints.
3. Integration tests for catalog, itinerary, routing, and analytics flows.
4. E2E tests for the 11 required user journeys.
5. Failure-resilience tests for PostgreSQL, Redis, RabbitMQ, OSRM, and external APIs.

## Recommended stack

- Frontend: Vitest + React Testing Library
- Backend: Jest + Supertest
- E2E: Playwright
- Database: postgres test container or ephemeral schema reset
- CI: run unit, API, and build checks on every PR

## Exit criteria before production

- all protected routes have 401/403 checks
- admin and ownership flows pass automated tests
- frontend pages render without runtime errors
- Docker stack boots with healthy dependencies
- API contract tests pass end-to-end
- resilience and security tests pass under dependency outage conditions
