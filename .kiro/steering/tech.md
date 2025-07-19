# Technology Stack

## Frontend Framework
- **React 19** with TypeScript
- **Vite 7** for build tooling and development server
- **React Router DOM 7** for client-side routing

## UI & Styling
- **Tailwind CSS 3.4** with custom design system and animations
- **Radix UI** components for accessible primitives (Dialog, Dropdown, Select, etc.)
- **Lucide React** for icons
- **class-variance-authority**, **clsx**, and **tailwind-merge** for conditional styling
- **Recharts** for data visualization and charts

## Backend & Database
- **Supabase** for database, authentication, and real-time features
- **PostgreSQL** database with Row Level Security (RLS)
- **Supabase Auth** with PKCE flow for secure authentication
- **Real-time subscriptions** for live data updates

## State & Data Management
- **Supabase client** with TypeScript database types
- **Entity-based data layer** with comprehensive TypeScript interfaces
- **Custom hooks** for data fetching and state management
- **Role-based authorization** system with fine-grained permissions
- **React Context** for authentication state management
- **Custom permission hooks** (`useAuth`, `usePermissions`) for component-level access control
- **Profile management** with enhanced user configurations and special user support

## Testing
- **Vitest 3** for unit and integration testing
- **Testing Library** (React, Jest DOM, User Event)
- **jsdom** for DOM simulation
- **Comprehensive test coverage** including auth, database, and UI components

## Development Tools
- **ESLint 9** with TypeScript and React plugins
- **TypeScript 5.8** with strict mode enabled
- **PostCSS** with Autoprefixer
- **Path aliases** configured (`@/` maps to `src/`)
- **dotenv** for environment variable management

## Database Management
- **Migration system** with Supabase migrations
- **Seed scripts** for development data
- **Health check utilities** for database monitoring
- **Audit logging** system for compliance and tracking

## Common Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once

# Code Quality
npm run lint         # Run ESLint

# Database Management
npm run db:setup     # Setup Supabase database
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed development data
npm run db:verify    # Verify database connection
npm run db:health    # Check database health
npm run db:reset     # Reset database (development)
```

## Build Configuration
- **TypeScript** with strict mode and project references
- **Vite** with React plugin and path resolution
- **Tailwind** with custom theme, animations, and shadcn/ui integration
- **Test setup** with global configuration and mocks
- **Environment validation** with runtime checks