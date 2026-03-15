# Backend API Documentation

## Overview

The backend API is built with **NestJS 11**, following Domain-Driven Design (DDD) principles and Clean Architecture patterns. The API provides RESTful endpoints for the frontend applications and implements a robust authentication system, file storage, email processing, and queue-based async operations.

## Architecture

### Design Patterns

- **Domain-Driven Design (DDD)**: Business logic separated into domain, application, and infrastructure layers
- **Clean Architecture**: Clear separation of concerns with dependency inversion
- **Repository Pattern**: Data access abstraction through repositories
- **Module Pattern**: Feature-based module organization

### Project Structure

```
apps/api/src/
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
│   ├── auth/           # Authentication module
│   ├── users/          # User management
│   ├── members/        # Member management
│   ├── employees/      # Employee management
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

**Key Features**:
- Member registration
- Profile management
- Document upload and management
- Digital signature handling
- Application status tracking
- Member-MJ Status relationships
- Member-Document relationships

**Domain Model**:
- `Member` - Extended user with member-specific data
  - Personal info: `name`, `surname`, `phone`, `birthday`
  - Membership: `membershipNumber`, `address`, `status`
  - Relations: `IdentityDocument[]`, `Signature`, `MemberMjStatus[]`, `MemberDocument[]`

**API Endpoints**:
- `POST /lk/auth/member/check` - Check if user exists for member registration
- `POST /lk/auth/member/register` - Register new member account (without blocking file uploads)
- `POST /lk/auth/member/files` - Queue private documents/signature upload (BullMQ)
- `POST /lk/auth/login` - Member login
- `POST /lk/auth/refresh` - Refresh member token

**Repositories**:
- `MembersRepository`
- `IdentityDocumentsRepository`
- `SignaturesRepository`
- `MemberMjStatusRepository`
- `MemberDocumentsRepository`

**Guards**: `MemberAuthGuard`

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

**API Endpoints**:
- `POST /crm/auth/employee/register` - Register employee (bootstrap/invite flow)
- `POST /crm/auth/login` - Employee login
- `POST /crm/auth/refresh` - Refresh employee access token
- `POST /crm/auth/logout` - Employee logout
- `GET /crm/auth/me` - Current employee profile

**Repositories**:
- `EmployeesRepository`
- `EmployeeTokensRepository`

**Guards**: `EmployeeAuthGuard`, `AdminGuard`

### 4. Auth Module

**Purpose**: Authentication and authorization

**Key Features**:
- Dual authentication system (Member/Employee)
- JWT token generation and validation
- Refresh token management
- Password reset functionality
- Email verification

**Authentication Flows**:

1. **Member Authentication**:
   - Login → Access token + Refresh token
   - Token stored in `Token` table
   - Separate token system from employees

2. **Employee Authentication**:
   - Login → Access token + Refresh token
   - Token stored in `EmployeeToken` table
   - Role-based access (employee, manager, admin)

**API Endpoints**:
- `POST /lk/auth/login` - Member login
- `POST /lk/auth/member/register` - Member registration
- `POST /lk/auth/refresh` - Refresh member token
- `POST /crm/auth/login` - Employee login
- `POST /crm/auth/refresh` - Refresh employee token
- `POST /auth/password/reset` - Request password reset
- `POST /auth/password/reset/confirm` - Confirm password reset

**Strategies**:
- `MemberJwtStrategy` - Member JWT validation
- `EmployeeJwtStrategy` - Employee JWT validation

**Guards**:
- `MemberAuthGuard` - Member authentication
- `EmployeeAuthGuard` - Employee authentication
- `AdminGuard` - Admin role check

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
- Queue-based email sending (Bull)
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
- `POST /mail/verify` - Verify email address

**Events**:
- `MAIL_SEND_EVENT` - Email send event
- `MAIL_VERIFY_EVENT` - Email verification event

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

**Purpose**: Async job processing with Bull

**Features**:
- Redis-based queue system
- Job processing
- Retry mechanisms
- Job monitoring

**Queues**:
- `mail` - Email sending queue
- `member-files` - Async member documents/signature processing queue

### Redis Module

**Purpose**: Caching and session storage

**Features**:
- Session management
- API response caching
- Rate limiting support
- Cache invalidation

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

### Dual Authentication System

The system implements two completely separate authentication flows:

1. **Member Authentication**:
   - Endpoints: `/lk/auth/*`
   - Tokens: Stored in `tokens` table
   - Guards: `MemberAuthGuard`
   - Strategy: `MemberJwtStrategy`

2. **Employee Authentication**:
   - Endpoints: `/crm/auth/*`
   - Tokens: Stored in `employee_tokens` table
   - Guards: `EmployeeAuthGuard`, `AdminGuard`
   - Strategy: `EmployeeJwtStrategy`

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

### Bull Queue Integration

**Purpose**: Async operation processing

**Benefits**:
- Non-blocking operations
- Retry mechanisms
- Job monitoring
- Scalability

**Current Queues**:
- `mail` - Email sending
- `member-files` - Async member documents/signature processing

**Future Queues**:
- Notification sending
- Report generation
- Data synchronization

### Redis Caching

**Usage**:
- Session storage
- API response caching
- Rate limiting
- Temporary data storage

### Database Optimization

- **Indexing**: Proper indexes on foreign keys and search fields
- **Connection Pooling**: Prisma connection pool configuration
- **Query Optimization**: Efficient Prisma queries
- **Pagination**: Built-in pagination support

## API Documentation

### Swagger/OpenAPI

API documentation is available at `/api/docs` when running in development mode.

**Features**:
- Interactive API explorer
- Request/response schemas
- Authentication testing
- Example requests

### Response Format

**Success Response**:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": { ... }
  }
}
```

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

- [Authentication System](../AUTHENTICATION.md)
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

### Why Bull Queue?

- **Redis Backend**: Fast and reliable
- **Job Processing**: Robust job handling
- **Monitoring**: Built-in monitoring tools
- **Scalability**: Horizontal scaling support
- **Retry Logic**: Automatic retry mechanisms

## Future Enhancements

- GraphQL API (optional)
- WebSocket support for real-time features
- Advanced caching strategies
- Microservices architecture (if needed)
- API versioning
- Advanced rate limiting
- Request logging and analytics
