# Backend API Documentation

## Overview

The backend API is built with **NestJS 11**, following Domain-Driven Design (DDD) principles and Clean Architecture patterns. The API provides RESTful endpoints for the frontend applications and implements a robust authentication system, file storage, email processing, and queue-based async operations.

**Current HTTP contract (errors, CORS, portal headers, cookies vs mobile):** [HTTP_API_CONTRACT.md](./HTTP_API_CONTRACT.md)

**Entity-first CRM, платформа, биллинг:** [ENTITY_PLATFORM_ARCHITECTURE.md](./ENTITY_PLATFORM_ARCHITECTURE.md)

## Architecture

### Design Patterns

- **Domain-Driven Design (DDD)**: Business logic separated into domain, application, and infrastructure layers
- **Clean Architecture**: Clear separation of concerns with dependency inversion
- **Repository Pattern**: Data access abstraction through repositories
- **Module Pattern**: Feature-based module organization

### Project Structure

```
apps/api/src/
├── core/                # Ядро (расширяемый слой; см. ENTITY_PLATFORM_ARCHITECTURE.md)
├── common/              # Shared modules and utilities
│   ├── config/         # Configuration (CORS, Mailer, Swagger)
│   ├── decorators/      # Custom decorators (Auth, DTO, Response)
│   ├── filters/        # Exception filters
│   ├── interceptors/   # Response interceptors
│   ├── prisma/         # Prisma module and service
│   ├── queue/          # Bull queue configuration
│   ├── redis/          # Redis module and service
│   └── telegram/       # Telegram integration
├── modules/            # Feature modules
│   ├── crm/            # CrmModule — порталы, CRM, каталог, заказы, …
│   ├── platform/       # Platform admin JWT, список порталов
│   ├── portal/         # auth (employee/member) + crm/* домены
│   ├── users/          # User management
│   ├── storage/        # File storage
│   └── mail/           # Email service
└── generated/          # Prisma generated types
```

### Module Structure

Each module follows a consistent structure:

```
module-name/
├── api/                # API layer (controllers, DTOs)
│   ├── controllers/   # REST controllers
│   └── dto/           # Data Transfer Objects
├── application/        # Application layer (use cases)
│   └── services/      # Application services
├── domain/            # Domain layer (business logic)
│   ├── entity/        # Domain entities
│   └── repositories/  # Repository interfaces
└── infrastructure/    # Infrastructure layer
    ├── repositories/  # Repository implementations
    ├── guards/        # Auth guards
    └── strategies/    # Auth strategies
```

## Core Modules

### 1. Users Module

**Purpose**: Base user authentication and management

**Key Features**:
- User creation and management
- Email uniqueness validation
- Password hashing (bcrypt)
- User activation/deactivation

**Domain Model**:
- `User` - Minimal authentication model
  - `id`, `email`, `passwordHash`, `isActive`

**API Endpoints**:
- `POST /users` - Create user
- `GET /users/:id` - Get user by ID
- `PATCH /users/:id` - Update user

**Repository**: `UsersRepository`

### 2. Members Module

**Purpose**: Club member management and registration

**Field-driven profile (portal fields, forms, statuses):** see [MEMBER_AND_ENTITY_FIELDS.md](./MEMBER_AND_ENTITY_FIELDS.md).

**Key Features**:
- Member registration
- Profile management
- Document upload and management
- Digital signature handling
- Application status tracking
- Member-MJ Status relationships
- Member-Document relationships

**Domain Model**:
- `Member` - Core row: `userId`, `portalId`, `membershipNumber`, `statusItemId` (FK to `status_items`), `isActive`; profile attributes live in `field_values` keyed by `portal_field_definitions`
  - Relations: `User`, `FieldValue[]`, `IdentityDocument[]`, `Signature`, `MemberMjStatus[]`, `MemberDocument[]`

**API Endpoints**:
- `POST /lk/auth/member/check` - Check if user exists for member registration
- `POST /lk/auth/member/register` - Register new member account (portal-scoped; `PortalId` from context)
- `POST /lk/auth/member/files` - Queue private documents/signature upload (BullMQ)
- `POST /lk/auth/login` - Member login (web cookies under `lk/auth`)
- `POST /lk/auth/refresh` - Refresh member session (cookie-based for web)
- **Mobile:** `lk/mobile/auth` — Bearer-based flows parallel to web

**Repositories**:
- `MembersRepository`
- `IdentityDocumentsRepository`
- `SignaturesRepository`
- `MemberMjStatusRepository`
- `MemberDocumentsRepository`

**Guards**: `MemberJwtAuthGuard` (and related local JWT guards per route)

### 3. Employees Module

**Purpose**: Employee management and CRM access

**Key Features**:
- Employee registration
- Role-based access control (employee, manager, admin)
- Employee authentication
- Department and position management

**Domain Model**:
- `Employee` - Extended user with employee-specific data
  - Personal info: `name`, `surname`, `phone`
  - Work info: `role`, `position`, `department`
  - Status: `isActive`, `lastLoginAt`

**API Endpoints (web, HttpOnly cookies)** — see `EmployeeAuthController` (`crm/auth`):
- `POST /crm/auth/login` — sets access/refresh cookies; response body is profile-shaped (tokens are not returned in JSON for web)
- `POST /crm/auth/refresh` — reads refresh cookie, rotates cookies
- `POST /crm/auth/logout` — clears cookies
- `GET /crm/auth/me` — session via cookie JWT

**Mobile / Bearer** — `EmployeeMobileAuthController` (`crm/mobile/auth`): JSON tokens + `Authorization: Bearer`.

**Registration (admin-only)** — `POST /crm/auth/employee/register` under `crm/auth/employee` (requires authenticated admin in portal context).

**Repositories**:
- `EmployeesRepository`
- `EmployeeTokensRepository`

**Guards**: `EmployeeJwtAuthGuard`, `AdminGuard` (and portal match where applicable)

### 4. Auth Module

**Purpose**: Authentication and authorization

**Key Features**:
- Dual authentication system (Member/Employee), plus **portal** scoping for tenant data
- JWT generation/validation; refresh persistence in DB
- Password reset and email verification (shared controllers under `auth`)

**Transport**: **Web** uses HttpOnly cookies (`crm/auth`, `lk/auth`); **mobile** uses separate route prefixes and Bearer tokens — details in [HTTP_API_CONTRACT.md](./HTTP_API_CONTRACT.md).

**API Endpoints (non-exhaustive)**:
- `POST /lk/auth/login` - Member login (web cookies)
- `POST /lk/auth/member/register` - Member registration
- `POST /lk/auth/refresh` - Refresh member session
- `POST /crm/auth/login` - Employee login (web cookies)
- `POST /crm/auth/refresh` - Refresh employee session
- `POST /auth/password/reset` - Request password reset
- `POST /auth/password/reset/confirm` - Confirm password reset

**Strategies / guards** (names in `apps/api/src/modules/auth/.../infrastructure`):
- Member: local + JWT (cookie and/or bearer strategies per route)
- Employee: local + JWT (cookie and/or bearer strategies per route)
- `AdminGuard` — admin-only employee actions

**Guards**:
- `MemberJwtAuthGuard` — member JWT routes
- `EmployeeJwtAuthGuard` — employee JWT routes
- `AdminGuard` — admin role check

### 5. Storage Module

**Purpose**: File storage and management

**Key Features**:
- Public and private storage types
- File category management
- User-scoped file access
- File validation and security

**Storage Types**:
- `PUBLIC` - Publicly accessible files
- `PRIVATE` - Authentication-required files

**File Categories**:
- `member-document` - Member documents
- `member-signature` - Digital signatures
- `product-image` - Product images
- `employee-avatar` - Employee avatars
- `member-avatar` - Member avatars
- `other` - Other files

**API Endpoints**:
- `POST /storage/upload` - Upload file (Member)
- `POST /storage/employee/upload` - Upload file (Employee)
- `GET /storage/:id` - Get file metadata
- `GET /storage/:id/download` - Download file
- `DELETE /storage/:id` - Delete file

**See**: [Storage Documentation](../STORAGE.md) for detailed information

### 6. Mail Module

**Purpose**: Email sending and template management

**Key Features**:
- Queue-based email sending (BullMQ)
- Email templates (React components)
- Email verification
- Password reset emails
- Mass email campaigns (planned)

**Email Templates**:
- `email-verification.template.tsx` - Email verification
- `reset-password.template.tsx` - Password reset
- `restriction-lifted.template.tsx` - Restriction notifications
- `test.template.tsx` - Testing template

**Queue Processing**:
- `MailProcessor` - Processes email queue jobs
- Async email sending to prevent blocking

**API Endpoints**:
- `POST /mail/send` - Send email (admin)


Email verification & password reset are handled in the **Auth module**:
- `GET /auth/verify/:token`
- `POST /auth/verify`
- `POST /auth/password/reset/request`
- `POST /auth/password/reset`

**Queue-based flow (event-like)**:
- Email sending is queued into the `mail` BullMQ queue.
- Job name: `send-email` (see `MAIL_QUEUE_JOB_NAMES.SEND_EMAIL`).
- After completion, `MailProcessor` checks `emailType` and triggers:
  - Telegram notification for verification emails
  - follow-up `portal-events` job for portal-registration email

## Common Modules

### Prisma Module

**Purpose**: Database access and ORM

**Features**:
- Type-safe database queries
- Connection pooling
- Migration management
- Generated types

**Service**: `PrismaService`

### Queue Module

**Purpose**: Async job processing with BullMQ

**Features**:
- Redis-backed queues (BullMQ)
- Job processing in worker(s)
- Retry logic available via BullMQ job options (per `queue.add(...)`)
- Job monitoring

**Queues**:
- `mail` - Email sending queue
- `member-files` - Async member documents/signature processing queue
- `portal-events` - Platform/portal registration flow (welcome email + admin notifications)

### Redis Module

**Purpose**: Redis client infrastructure used by BullMQ queues

**Features**:
- Current code uses Redis as the BullMQ backend connection.
- App-level caching/rate-limiting/session storage is not implemented via `RedisService` in the visible code.

**Service**: `RedisService`

### Telegram Module

**Purpose**: Telegram bot integration

**Features**:
- Notification sending
- Bot commands
- Integration with system events

## Database Schema

### Core Tables

- **users** - Base user authentication
- **members** - Club member data
- **employees** - Employee data
- **tokens** - Member refresh tokens
- **employee_tokens** - Employee refresh tokens
- **identity_documents** - Member identity documents
- **signatures** - Digital signatures
- **mj_status** - MJ status reference
- **member_mj_status** - Member-MJ Status relationships
- **documents** - Document type reference
- **member_documents** - Member-Document relationships

### Design Principles

1. **User as Base**: User table contains only authentication data
2. **Extension Pattern**: Member and Employee extend User
3. **Reference Tables**: Status and Document types in separate tables
4. **Many-to-Many**: Flexible relationships through junction tables

## Authentication & Authorization

### Multi-tenant portals

Members and employees belong to a **portal** (`portalId`). Requests can carry portal context via **`X-Portal-Id`** / **`X-Portal-Slug`** headers (see [HTTP_API_CONTRACT.md](./HTTP_API_CONTRACT.md)). After JWT validation, **`PortalTenantMatchGuard`** rejects cross-portal access when context is present.

Platform onboarding: **`POST /platform/portals/register`** creates a portal and initial owner (public).

### Dual principal types (Member vs Employee)

The system implements two separate authentication **domains**:

1. **Member Authentication**:
   - Web: `/lk/auth/*` (HttpOnly cookies for session)
   - Mobile: `/lk/mobile/auth` (Bearer)
   - Refresh tokens: stored in `tokens` (member/user scope as implemented)

2. **Employee Authentication**:
   - Web: `/crm/auth/*` (HttpOnly cookies)
   - Mobile: `/crm/mobile/auth` (Bearer)
   - Refresh tokens: `employee_tokens` table
   - Guards: `EmployeeJwtAuthGuard`, `AdminGuard`, plus portal match where applicable

### JWT Token System

- **Access Tokens**: Short-lived (15 minutes)
- **Refresh Tokens**: Long-lived (7 days)
- **Token Rotation**: Refresh tokens rotated on use
- **Token Revocation**: Tokens can be revoked

### Role-Based Access Control

**Employee Roles**:
- `employee` - Basic employee access
- `manager` - Manager-level access
- `admin` - Full administrative access

## Queue System & Scalability

### BullMQ Queue Integration

**Purpose**: Async operation processing

**Benefits**:
- Non-blocking operations
- Retry logic via BullMQ job options / worker configuration
- Job monitoring
- Scalability

**Current Queues**:
- `mail` - Email sending
- `member-files` - Async member documents/signature processing
- `portal-events` - Portal registration notifications and follow-up events

**Future Queues**:
- Notification sending
- Report generation
- Data synchronization

### Redis / Queue Infrastructure

**Usage**:
- BullMQ backend storage for queue state (via Redis client)

### Database Optimization

- **Indexing**: Proper indexes on foreign keys and search fields
- **Connection Pooling**: Prisma connection pool configuration
- **Query Optimization**: Efficient Prisma queries
- **Pagination**: Built-in pagination support

## API Documentation

### Swagger/OpenAPI

- **UI**: `GET /docs`
- **OpenAPI JSON** (codegen): `GET /docs-json`

**Features**:
- Interactive API explorer
- Request/response schemas
- Authentication testing
- Example requests

### Error response format (HTTP errors)

Unhandled HTTP exceptions are normalized by **`GlobalExceptionFilter`** to JSON:

```json
{
  "message": "Human-readable message",
  "errors": []
}
```

**Validation** (`400`) uses `message: "Validation failed"` and `errors` as a **string array** of constraint messages. Clients should prefer displaying **`errors`** when non-empty, otherwise **`message`**. See [HTTP_API_CONTRACT.md](./HTTP_API_CONTRACT.md).

Success payloads are **per controller/DTO** (not a global `{ success, data }` envelope unless a specific endpoint defines that shape).

## Security

### Authentication Security

- Password hashing with bcrypt (10 rounds)
- JWT token signing with secret key
- Refresh token rotation
- Token expiration and revocation

### API Security

- CORS configuration
- Rate limiting (planned)
- Input validation (class-validator)
- SQL injection prevention (Prisma)
- XSS protection

### File Security

- File type validation
- File size limits
- User-scoped file access
- Private file authentication

## Testing

### Unit Tests

- Service layer tests
- Repository tests
- Utility function tests

### Integration Tests

- API endpoint tests
- Authentication flow tests
- Database integration tests

### E2E Tests

- Complete user flows
- Member registration flow
- Employee management flow

## Development

### Running the API

```bash
cd apps/api
pnpm install
pnpm prisma migrate dev
pnpm prisma generate
pnpm prisma:seed:admin
pnpm dev
```

### Bootstrap Root Admin (CRM)

Use env variables in backend `.env`:

```env
BOOTSTRAP_ADMIN_ENABLED=true
BOOTSTRAP_ADMIN_EMAIL=admin@company.com
BOOTSTRAP_ADMIN_PASSWORD=ChangeMe_StrongPassword
BOOTSTRAP_ADMIN_NAME=Root
BOOTSTRAP_ADMIN_FORCE_PASSWORD_RESET=false
```

Optional fields:
- `BOOTSTRAP_ADMIN_SURNAME`
- `BOOTSTRAP_ADMIN_PHONE`
- `BOOTSTRAP_ADMIN_POSITION`
- `BOOTSTRAP_ADMIN_DEPARTMENT`

How it works:
- `BOOTSTRAP_ADMIN_ENABLED=true` means seed is allowed to create/update bootstrap admin.
- Seed is idempotent: it upserts `User` by email and `Employee` by `userId`.
- `Employee.role` is always set to `admin`.
- If `BOOTSTRAP_ADMIN_FORCE_PASSWORD_RESET=true`, password hash is updated on existing user.

Commands:

```bash
# Run only bootstrap-admin seed (without migration)
pnpm prisma:seed:admin

# Prisma standard seed command (uses the same seed script)
pnpm prisma:seed
```

### Database Migrations

```bash
# Create migration
pnpm prisma migrate dev --name migration_name

# Apply migrations
pnpm prisma migrate deploy

# Generate Prisma client
pnpm prisma generate
```

### Environment Variables

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - JWT refresh secret
- `MAIL_HOST` - SMTP host
- `MAIL_USER` - SMTP user
- `MAIL_PASS` - SMTP password
- `BOOTSTRAP_ADMIN_ENABLED` - enable/disable root-admin bootstrap seed
- `BOOTSTRAP_ADMIN_EMAIL` - root admin email
- `BOOTSTRAP_ADMIN_PASSWORD` - root admin password

## Module Details

For detailed information about each module, see:

- [HTTP API Contract](./HTTP_API_CONTRACT.md) — errors, CORS, cookies, portal headers
- [Authentication System](../AUTHENTICATION.md) — long-form flows (partially historical; cross-check with contract)
- [Storage Module](../STORAGE.md)
- [Module Development Principles](./MODULE_DEVELOPMENT_PRINCIPLES.md)
- [Site Documentation](../site/README.md) - Frontend integration
- [CRM Documentation](../crm/README.md) - CRM system

## Architecture Decisions

### Why NestJS?

- **TypeScript First**: Full TypeScript support
- **Modular Architecture**: Clear module boundaries
- **Dependency Injection**: Testable and maintainable code
- **Rich Ecosystem**: Extensive plugin ecosystem
- **Enterprise Ready**: Built for scalable applications

### Why Prisma?

- **Type Safety**: Generated types from schema
- **Migration Management**: Version-controlled migrations
- **Query Builder**: Intuitive query API
- **Performance**: Optimized queries
- **Developer Experience**: Excellent tooling

### Why BullMQ Queue?

- **Redis Backend**: Fast and reliable
- **Job Processing**: Robust job handling
- **Monitoring**: Built-in monitoring tools
- **Scalability**: Horizontal scaling support
- **Retry Logic**: Configurable per job via BullMQ job options (attempts/backoff); defaults depend on job configuration.

## Future Enhancements

- GraphQL API (optional)
- WebSocket support for real-time features
- Advanced caching strategies
- Microservices architecture (if needed)
- API versioning
- Advanced rate limiting
- Request logging and analytics
