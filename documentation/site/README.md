# Site Documentation - Public Website & Member Portal

## Overview

The site application (`apps/web`) is a Next.js 16 application that serves both as a public website for attracting new members and a member portal (portfolio) for registered members. The application is built with React 19, TypeScript, and follows Feature-Sliced Design (FSD) architecture.

## Architecture

### Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **Components**: shadcn/ui (Radix UI)
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **Internationalization**: next-intl
- **API Client**: Auto-generated from OpenAPI spec
- **Theming**: next-themes (light/dark mode)

### Project Structure (FSD)

```
apps/web/
├── app/                    # Next.js App Router
│   ├── [locale]/          # Localized routes
│   │   ├── (site)/        # Public site routes
│   │   ├── auth/          # Authentication routes
│   │   ├── profile/       # Member portal routes
│   │   └── layout.tsx     # Locale layout
│   └── layout.tsx         # Root layout
├── modules/               # Feature modules (FSD)
│   ├── shared/            # Shared resources
│   │   ├── config/        # Configuration (routes, i18n)
│   │   └── lib/           # Utilities (hooks, helpers)
│   ├── features/          # Feature modules
│   │   ├── auth/          # Authentication features
│   │   └── lang-switcher/ # Language switcher
│   ├── pages/             # Page-level composition blocks
│   └── widgets/           # Composite widgets (layout/sections)
├── packages/ui            # Shared UI package (workspace)
├── proxy.ts              # Next.js 16 proxy (locale routing)
└── i18n.ts               # next-intl configuration
```

### Feature-Sliced Design (FSD)

The application follows FSD architecture principles:

- **app/** - Application entry points (pages, layouts)
- **modules/shared/** - Shared resources (config, lib, ui)
- **modules/features/** - Feature modules (isolated features)
- **modules/widgets/** - Composite UI blocks

## Internationalization

### Locale Support

- **Russian (ru)** - Default locale
- **English (en)**
- **Spanish (es)**

### Implementation

- **next-intl** for i18n management
- **Locale routing** via `[locale]` dynamic segment
- **Proxy-based routing** for automatic locale detection
- **JSON message files** for translations

### Message Structure

```
modules/shared/config/i18n/messages/
├── ru/
│   ├── common.json
│   ├── auth.json
│   ├── navigation.json
│   ├── home.json
│   ├── contacts.json
│   └── profile.json
├── en/
└── es/
```

### Locale Detection

The proxy (`proxy.ts`) handles locale detection:
1. Checks cookie (`NEXT_LOCALE`)
2. Parses `Accept-Language` header
3. Falls back to default locale (`en`)

## Public Website

### Purpose

- Attract new members
- Present club information
- Enable member registration
- Multilingual content presentation

### Routes

- `/` - Homepage with hero, about, and CTA sections
- `/[locale]` - Localized homepage
- `/[locale]/contacts` - Contact information
- `/[locale]/auth/login` - Member login
- `/[locale]/auth/register` - Member registration
- `/[locale]/auth/confirm-email` - Email confirmation

### Key Components

#### Hero Section

- Full-width hero with background pattern
- Sticky transparent header overlay
- Call-to-action buttons
- Responsive design

#### About Section

- Club information
- Key features presentation
- Service descriptions

#### CTA Section

- Registration encouragement
- Clear call-to-action

## Member Portal (Portfolio)

### Purpose

Personal dashboard for registered club members.

### Features

- **Profile Management**: View and edit personal information
- **Application Status**: Track membership application status
- **Document Management**: Upload and manage documents
- **Digital Signature**: Capture and manage digital signature
- **Notifications**: Receive system notifications (planned)

### Routes

- `/[locale]/profile` - Member profile dashboard
- `/[locale]/profile/edit` - Edit profile (planned)
- `/[locale]/profile/documents` - Document management (planned)

### Authentication

- **Member Authentication**: JWT-based authentication
- **Protected Routes**: All profile routes require authentication
- **Token Management**: Automatic token refresh

## Member Registration

### Registration Flow

1. **Personal Information**:
   - Name, surname
   - Email, phone
   - Birthday

2. **Identity Documents**:
   - Document type selection
   - Document number
   - Front and back photos
   - Issue/expiry dates

3. **Usage Status**:
   - Medical use
   - Recreational use
   - Marijuana use

4. **Digital Signature**:
   - Signature capture using canvas
   - Signature validation

5. **Password Creation**:
   - Password with validation
   - Terms acceptance

### Form Components

#### Registration Form

- Multi-step form with validation
- React Hook Form for form management
- Zod for schema validation
- File upload with drag-and-drop
- Signature canvas integration

#### File Upload

- Drag-and-drop interface
- File type validation
- Image preview
- Upload progress indication

#### Signature Canvas

- Canvas-based signature capture
- Signature validation
- Clear and submit actions

## UI Components

### Shared UI Components

Located in `@workspace/ui` and `@workspace/ui/shared`:

- Button, Input, Card (shadcn/ui)
- ThemeToggle
- Separator
- Iridescence (animated background)

### Component Usage (Current)

```typescript
import { Button, Card, FieldInput } from "@workspace/ui";
import { FileUpload, SignatureCanvasField } from "@workspace/ui/shared";
```

## API Integration

### API Client

Auto-generated TypeScript client from OpenAPI spec:

- **Package**: `@workspace/api-client`
- **Generation**: From `packages/api-client/openapi.json`
- **Type Safety**: Full TypeScript types

### Usage with TanStack Query

```typescript
import { useQuery } from "@tanstack/react-query";
import { MemberAuthenticationSiteService } from "@workspace/api-client/generated";

const { data } = useQuery({
  queryKey: ["member", "profile"],
  queryFn: () => MemberAuthenticationSiteService.membersAuthGetMe(),
});
```

### API Configuration

- Base URL from environment variables
- Automatic token injection
- Error handling
- Refresh retry handled by app-level helper around generated fetch client

## Styling

### Tailwind CSS 4

- Utility-first CSS framework
- Custom theme configuration
- Dark mode support
- Responsive design utilities

### Theme System

- Light/dark mode via `next-themes`
- CSS variables for theming
- Consistent color palette
- Component-level theme support

## State Management

### TanStack Query

- Server state management
- Automatic caching
- Background refetching
- Optimistic updates

### Local State

- React hooks for component state
- Form state via React Hook Form
- Theme state via next-themes

## Routing

### Next.js App Router

- File-based routing
- Dynamic routes with `[locale]`
- Route groups with `(site)`
- Layout composition

### Locale Routing

- All routes prefixed with locale
- Automatic locale detection
- Locale switching
- SEO-friendly URLs

### Proxy Configuration

The `proxy.ts` file handles:
- Locale detection and routing
- Automatic redirects to localized routes
- Cookie-based locale persistence

## Forms & Validation

### React Hook Form

- Performant form library
- Minimal re-renders
- Built-in validation support

### Zod Validation

- Schema-based validation
- Type-safe validation
- Integration with React Hook Form

### Form Example

```typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const form = useForm({
  resolver: zodResolver(schema),
});
```

## File Upload

### Implementation

- Drag-and-drop interface
- File type validation
- Image preview
- Upload progress
- Error handling

### Storage Integration

- Uploads to backend storage module
- Private file storage for member documents
- Secure file access
- File metadata management

## Digital Signature

### Signature Capture

- Canvas-based signature
- Touch and mouse support
- Signature validation
- Clear functionality

### Storage

- Signature saved as image
- Stored in private storage
- Associated with member profile
- Secure access

## Performance Optimization

### Next.js Optimizations

- Automatic code splitting
- Image optimization
- Static generation where possible
- Server components

### React Optimizations

- Component memoization
- Lazy loading
- Virtual scrolling (if needed)

### API Optimizations

- Request caching with TanStack Query
- Background refetching
- Optimistic updates

## SEO

### Implementation

- Meta tags per page
- Open Graph tags
- Structured data (planned)
- Sitemap generation (planned)

### Internationalization SEO

- Hreflang tags
- Locale-specific URLs
- Multilingual sitemaps

## Security

### Client-Side Security

- XSS prevention
- CSRF protection (via Next.js)
- Secure cookie handling
- Token storage in memory

### Authentication Security

- JWT token management
- Automatic token refresh
- Secure token storage
- Token expiration handling

## Development

### Running the Application

```bash
cd apps/web
pnpm install
pnpm dev
```

### Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_APP_URL` - Application URL

### Building for Production

```bash
pnpm build
pnpm start
```

## Testing

### Component Testing

- React Testing Library
- Component unit tests
- Integration tests

### E2E Testing

- Playwright (planned)
- User flow testing
- Registration flow testing

## Future Enhancements

- **Advanced Profile Management**: Extended profile editing
- **Document Management UI**: Full document management interface
- **Notifications System**: Real-time notifications
- **Analytics Integration**: User analytics
- **Progressive Web App**: PWA support
- **Offline Support**: Service worker integration

## Related Documentation

- [Backend Documentation](../backend/README.md) - API details
- [Authentication System](../AUTHENTICATION.md) - Auth flow
- [Storage Module](../STORAGE.md) - File storage
- [CRM Documentation](../crm/README.md) - CRM system
