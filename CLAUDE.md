# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Financial Times-themed SaaS application built on Next.js that demonstrates subscription management and AI customer support. The project features a multi-tier subscription system (B2C individual, B2B enterprise, and B2B educational) with Stripe integration and includes an AI customer support agent (Finola) for subscription assistance.

## Development Commands

```bash
# Development server with Turbopack
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Database operations
pnpm db:setup     # Setup database with environment variables
pnpm db:migrate   # Run database migrations
pnpm db:seed      # Seed database with test data (test@test.com / admin123)
pnpm db:generate  # Generate new migration files
pnpm db:studio    # Open Drizzle Studio for database management
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with App Router and React 19
- **Database**: PostgreSQL with Drizzle ORM
- **Payments**: Stripe (with webhook handling)
- **Authentication**: JWT tokens stored in HTTP-only cookies
- **UI**: shadcn/ui components with Tailwind CSS
- **Type Safety**: TypeScript with strict mode enabled

### Key Directories
- `app/`: Next.js App Router pages and API routes
  - `(dashboard)/`: Protected dashboard routes with pricing pages
  - `(login)/`: Authentication pages
  - `api/`: API routes for Stripe, user management, and webhooks
- `lib/`: Core business logic
  - `auth/`: JWT session management and password hashing
  - `db/`: Database schema, queries, and migrations
  - `payments/`: Stripe integration and subscription handling
- `components/`: Reusable UI components
- `middleware.ts`: Global route protection and session refresh

### Database Schema
The application uses a multi-tenant architecture with these core entities:
- **Users**: Authentication with email/password and role-based access
- **Teams**: Subscription containers with Stripe customer data
- **TeamMembers**: Many-to-many relationship between users and teams
- **ActivityLogs**: Audit trail for user actions
- **Invitations**: Team invitation system

### Authentication Flow
- JWT tokens stored in secure HTTP-only cookies
- Global middleware protects `/dashboard` routes
- Session auto-renewal on GET requests
- Password hashing with bcryptjs (10 salt rounds)

### Stripe Integration
- Subscription management with Customer Portal
- Webhook handling for subscription events at `/api/stripe/webhook`
- Support for multiple pricing tiers and trial periods
- Test mode with development webhook forwarding

## Environment Variables

Required environment variables (use `pnpm db:setup` to configure):
```bash
POSTGRES_URL=          # PostgreSQL connection string
AUTH_SECRET=           # JWT signing secret (generate with: openssl rand -base64 32)
STRIPE_SECRET_KEY=     # Stripe secret key
STRIPE_WEBHOOK_SECRET= # Stripe webhook endpoint secret
BASE_URL=              # Application base URL (http://localhost:3000 for dev)
```

## Development Workflow

### Setting Up for Development
1. Install dependencies: `pnpm install`
2. Configure environment: `pnpm db:setup`
3. Run migrations: `pnpm db:migrate`
4. Seed test data: `pnpm db:seed`
5. Start development server: `pnpm dev`
6. For Stripe webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### Testing Stripe Payments
Use test card: `4242 4242 4242 4242` with any future expiration and 3-digit CVC.

### Database Operations
- Use `pnpm db:studio` to visually inspect/modify database
- Schema changes require running `pnpm db:generate` then `pnpm db:migrate`
- The seeded test user is `test@test.com` with password `admin123`

## Subscription System

### Pricing Tiers
The application supports three subscription categories:
- **B2C Individual** (`/pricing`): Personal subscriptions with trial offers
- **B2B Enterprise** (`/pricing-b2c`): Corporate subscriptions with team management
- **B2B Educational** (`/pricing-education`): Educational institution discounts

### AI Customer Support
The application includes "Finola," an AI customer support agent that:
- Routes customers to appropriate subscription types based on conversation context
- Handles B2C, B2B, and educational subscription inquiries
- Uses trigger word detection for subscription intent and category routing
- Maintains conversation state and provides contextual responses

## Code Patterns

### Server Actions and Route Handlers
- API routes in `app/api/` handle external integrations (Stripe, webhooks)
- Server Actions in page components handle form submissions and user interactions
- All database operations go through `lib/db/queries.ts` for consistency

### Type Safety
- Database types auto-generated from Drizzle schema
- Zod schemas for form validation and API request/response types
- TypeScript strict mode enabled with path mapping (`@/*` → `./`)

### Error Handling
- Middleware handles authentication errors with redirects
- Stripe webhook errors are logged but don't break the application
- Database errors in queries are propagated to calling code

### UI Components
- shadcn/ui components in `components/ui/`
- Custom components follow the same pattern with TypeScript interfaces
- Tailwind classes for styling with consistent design system