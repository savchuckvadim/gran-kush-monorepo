# Gran Kush - Fullstack Club Administration Platform

## Summary

Gran Kush is a comprehensive fullstack platform designed for managing clubs, their members, and employees. Built as a TypeScript/JavaScript monorepository, the system provides a universal solution that can be adapted for various types of clubs (sports, educational, business communities, private associations, etc.).

The platform consists of three main applications:
- **Public Website** - Member registration and information portal
- **Member Portal (Portfolio)** - Personal dashboard for club members
- **CRM System** - Internal management system for employees (planned)

### Key Features

- **Dual Authentication Architecture** - Separate authentication systems for members and employees
- **Multilingual Support** - Full i18n support (Russian, English, Spanish)
- **Document Management** - Secure file storage and digital signature handling
- **Email Campaigns** - Mass email functionality for member communication
- **Scalable Architecture** - Built for growth and extensibility

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose (for local development)

### Installation

```bash
# Install dependencies
pnpm install

# Start database and Redis
docker-compose -f docker-compose-dev.yml up -d

# Run database migrations
cd apps/api
pnpm prisma migrate dev
pnpm prisma generate
```

### Running Applications

```bash
# Backend API (NestJS)
cd apps/api
pnpm dev

# Public Website (Next.js)
cd apps/web
pnpm dev

# CRM System (Next.js) - Planned
cd apps/crm
pnpm dev
```

### Code Formatting

Format code across the entire monorepo:

```bash
# Format all packages
pnpm format

# Check formatting without changes
pnpm format:check

# Format specific package
cd apps/web
pnpm format
```

The monorepo uses a shared Prettier configuration (`@workspace/prettier-config`) with automatic import sorting via `@trivago/prettier-plugin-sort-imports`.

## Project Structure

```
gran-kush/
├── apps/
│   ├── api/          # NestJS backend API
│   ├── web/          # Next.js public website & member portal
│   ├── crm/          # Next.js CRM system (planned)
│   └── admin/        # Admin panel (future)
├── packages/
│   ├── api-client/   # Auto-generated OpenAPI TypeScript client
│   ├── ui/           # Shared UI components (shadcn/ui)
│   ├── eslint-config/    # Shared ESLint configuration
│   └── typescript-config/ # Shared TypeScript configuration
└── documentation/    # Comprehensive project documentation
```

## Technology Stack

### Backend
- **Framework**: NestJS 11
- **Database**: MySQL 8.0 with Prisma ORM
- **Cache**: Redis
- **Queue**: Bull (Redis-based)
- **Authentication**: JWT with dual token system
- **File Storage**: Modular storage system

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (Radix UI)
- **State Management**: TanStack Query (React Query)
- **Internationalization**: next-intl
- **API Client**: Auto-generated from OpenAPI spec

### Monorepo
- **Package Manager**: pnpm
- **Build System**: Turborepo
- **Workspace**: pnpm workspaces

## Documentation

Comprehensive documentation is available in the [`documentation/`](./documentation/) directory:

- **[Documentation Overview](./documentation/README.md)** - Complete project documentation
- **[Backend Documentation](./documentation/backend/README.md)** - API architecture, modules, and technical details
- **[Site Documentation](./documentation/site/README.md)** - Public website and member portal
- **[CRM Documentation](./documentation/crm/README.md)** - CRM system (planned)

### Key Documentation Topics

- [Authentication System](./documentation/AUTHENTICATION.md) - Dual authentication architecture
- [Storage Module](./documentation/STORAGE.md) - File storage and management
- [Backend Modules](./documentation/backend/README.md) - Detailed module descriptions
- [Frontend Architecture](./documentation/site/README.md) - Next.js app structure

## Architecture Highlights

### Dual Authentication System

The platform implements two completely separate authentication mechanisms:
- **Member Authentication** - For club members accessing the public site
- **Employee Authentication** - For employees accessing the CRM system

This design allows:
- A single person to be both a member and an employee
- Complete separation of access contexts
- Enhanced security isolation between public and internal systems

### Scalability & Performance

- **Queue System**: Bull queues for async operations (email sending, file processing)
- **Caching**: Redis for session management and performance optimization
- **Database**: Optimized schema with proper indexing
- **File Storage**: Modular storage system supporting multiple backends

### Internationalization

All text content is extracted into constants:
- UI text and labels
- System messages
- Email templates

Supports multiple languages and easy localization.

## Development

### Code Style

- TypeScript strict mode
- ESLint with shared configuration
- Prettier for code formatting
- FSD (Feature-Sliced Design) architecture for frontend

### Testing

```bash
# Run tests
pnpm test

# E2E tests
pnpm test:e2e
```

## Contributing

Please read the documentation before contributing. Key areas:
- [Backend Architecture](./documentation/backend/README.md)
- [Frontend Architecture](./documentation/site/README.md)
- [Authentication System](./documentation/AUTHENTICATION.md)

## License

Private project - All rights reserved
