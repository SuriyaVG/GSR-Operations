# Technology Stack

## Frontend Framework
- **React 19** with TypeScript
- **Vite** for build tooling and development server
- **React Router DOM** for client-side routing

## UI & Styling
- **Tailwind CSS** with custom design system
- **Radix UI** components for accessible primitives
- **Lucide React** for icons
- **class-variance-authority** and **clsx** for conditional styling
- **tailwind-merge** for class merging

## State & Data Management
- Mock database service with retry logic and error handling
- Entity-based data layer with TypeScript interfaces
- Local storage for authentication state

## Testing
- **Vitest** for unit testing
- **Testing Library** (React, Jest DOM, User Event)
- **jsdom** for DOM simulation

## Development Tools
- **ESLint** with TypeScript and React plugins
- **PostCSS** with Autoprefixer
- Path aliases configured (`@/` maps to `src/`)

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
```

## Build Configuration
- TypeScript with strict mode enabled
- Vite with React plugin and path resolution
- Tailwind with custom theme and animations
- Test setup with global configuration