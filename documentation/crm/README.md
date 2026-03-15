# CRM Documentation

## Purpose

CRM (`apps/crm`) is the internal application for employees:

- view and manage members
- inspect uploaded documents/signatures
- update member profile/status data
- work with employee-authenticated flows

## Current Status

### Implemented

- CRM shell layout (sidebar + topbar)
- Localized routes (`ru`, `en`, `es`)
- Employee auth pages (`/auth/login`, `/auth/register`, `/auth/confirm-email`)
- Member list and member details routes
- Member document routes:
  - thumbnails on profile
  - document list page
  - single document preview page
- Member profile editing and re-upload flow for documents/signature

### In Progress / Planned

- Strict FSD cleanup completion
- full employee RBAC enforcement in frontend routes
- campaigns / analytics / advanced employee management

## Route Map (Current)

- `/{locale}/crm`
- `/{locale}/crm/members`
- `/{locale}/crm/members/{memberId}`
- `/{locale}/crm/members/{memberId}/documents`
- `/{locale}/crm/members/{memberId}/documents/{documentId}`
- `/{locale}/crm/products`
- `/{locale}/crm/orders`
- `/{locale}/crm/attendance`
- `/{locale}/crm/employees`
- `/{locale}/crm/profile`

## API and Auth Integration

- Employee auth endpoints:
  - `POST /crm/auth/login`
  - `POST /crm/auth/refresh`
  - `POST /crm/auth/logout`
  - `GET /crm/auth/me`
- Current member management endpoints (temporary/no-auth mode during implementation):
  - `GET /crm/members`
  - `GET /crm/members/:id`
  - `PATCH /crm/members/:id`
  - `PATCH /crm/members/:id/files`
  - `GET /crm/members/:id/identity-documents/:documentId/preview`
  - `GET /crm/members/:id/signature/preview`

### Client Strategy

- OpenAPI-generated client is the source of DTO typing.
- Request lifecycle (token + refresh retry) is centralized in CRM shared API layer.

## Architecture Notes

- Target frontend architecture is strict FSD.
- Entity-level member APIs and models should live in `entities/member`.
- Route pages should be thin composition layers.
- Feature logic should stay in `features/*`.

## Documentation Map

- [CRM Implementation Plan](./CRM_IMPLEMENTATION_PLAN.md)
- [Employee Authentication Detailed Task](./EMPLOYEE_AUTH_DETAILED_TASK.md)
- [Strict FSD Refactor Plan](./FSD_STRICT_REFACTOR_PLAN.md)

## Related Documentation

- [Backend Documentation](../backend/README.md)
- [Authentication System](../AUTHENTICATION.md)
- [Storage Module](../STORAGE.md)
- [Site + LK Documentation](../site/README.md)