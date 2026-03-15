# Gran Kush Project Documentation

## Project Overview

This is a monorepo project migrating from an old React + Firebase application to a modern stack with NestJS backend, Next.js frontend, and TypeScript throughout.

## Project Structure

```
gran-kush/
├── apps/
│   ├── api/          # NestJS backend API
│   ├── web/          # Next.js frontend application
│   ├── admin/        # Admin panel (future)
│   └── crm/          # CRM system (future)
├── packages/
│   ├── api-client/   # OpenAPI TypeScript client generator
│   ├── ui/           # Shared UI components (shadcn/ui)
│   ├── eslint-config/    # Shared ESLint configuration
│   └── typescript-config/ # Shared TypeScript configuration
└── documentation/    # Project documentation
```

## Technology Stack

### Backend (API)
- **Framework**: NestJS 11
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (Passport.js)
- **API Documentation**: Swagger/OpenAPI
- **Validation**: class-validator, class-transformer
- **Queue**: Bull (Redis)

### Frontend (Web)
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (Radix UI)
- **State Management**: TanStack Query (React Query)
- **Theming**: next-themes (light/dark mode)
- **API Client**: Auto-generated from OpenAPI spec

### Monorepo
- **Package Manager**: pnpm
- **Build System**: Turborepo
- **Workspace**: pnpm workspaces

## Key Features

### Authentication & Authorization
- JWT-based authentication
- Separate authentication for Members and Employees
- Email confirmation flow
- Password reset functionality

### Member Registration
The member registration form includes:
- Personal information (name, surname, email, phone, birthday)
- Identity documents (type, number, photos)
- Medical/Recreational usage status
- Digital signature capture
- Document uploads (first page, second page, signature)

### API Client Generation
OpenAPI client is automatically generated from the NestJS Swagger documentation:
- Located in `packages/api-client`
- Generated TypeScript types and API methods
- Uses axios for HTTP requests
- Accessible via `@workspace/api-client/generated`

## Development Setup

### Prerequisites
- Node.js >= 20
- pnpm >= 10.4.1
- PostgreSQL database
- Redis (for queues)

### Installation

```bash
# Install dependencies
pnpm install

# Generate Prisma client
cd apps/api
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate
```

### Running Development Servers

```bash
# Run all apps in development mode
pnpm dev

# Or run individually:
# API (port 3000)
cd apps/api && pnpm start:dev

# Web (port 3001)
cd apps/web && pnpm dev
```

### Generating API Client

```bash
# Ensure API server is running on http://localhost:3000
cd packages/api-client
pnpm generate
```

## API Endpoints

### Member Registration
- `POST /lk/auth/member/register` - Register new member
- `POST /lk/auth/member/check` - Check if user exists

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/confirm-email` - Confirm email address

### Documentation
- `GET /docs` - Swagger UI
- `GET /docs-json` - OpenAPI JSON specification

## Frontend Pages

### Public Pages
- `/` - Home page with hero section, about us, contacts
- `/login` - Login page
- `/register` - Registration page
- `/confirm-email` - Email confirmation page
- `/contacts` - Contact information

### Protected Pages
- `/lk` - Personal cabinet (dashboard)
- `/lk/profile` - User profile
- `/lk/settings` - Account settings

## UI Components

All UI components are located in `packages/ui/src/components` and use shadcn/ui patterns:
- Button
- Form components (Input, Select, Checkbox, etc.)
- Theme toggle
- Navigation components

## Theming

The application supports light and dark themes:
- Uses `next-themes` for theme management
- CSS variables defined in `packages/ui/src/styles/globals.css`
- Theme toggle component available in navigation

## Migration Notes

### From Old Site (React + Firebase)
The old site (`C:\Projects\Sites\grankush`) used:
- React 17 with Redux
- Firebase Authentication & Firestore
- Redux Form for form management
- Material-UI components

The new site uses:
- Next.js 16 with App Router
- NestJS backend with PostgreSQL
- React Hook Form (recommended) or native form handling
- shadcn/ui components
- TanStack Query for data fetching

### Key Differences
1. **State Management**: Redux → TanStack Query + React Context
2. **Forms**: Redux Form → React Hook Form
3. **Database**: Firestore → PostgreSQL with Prisma
4. **Authentication**: Firebase Auth → JWT with NestJS
5. **File Storage**: Firebase Storage → Custom storage module

## Environment Variables

### API (.env in apps/api)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
PORT=3000
FRONTEND_URL=http://localhost:3001
```

### Web (.env.local in apps/web)
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Build & Deployment

```bash
# Build all packages
pnpm build

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## Contributing

1. Create feature branch
2. Make changes
3. Run tests and linting
4. Submit pull request

## License

Private project - All rights reserved
