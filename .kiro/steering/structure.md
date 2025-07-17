# Project Structure

## Root Directory
```
├── src/                    # Source code
├── public/                 # Static assets
├── database/               # Database migrations and schemas
├── .kiro/                  # Kiro configuration and specs
├── node_modules/           # Dependencies
└── config files            # Build and tool configurations
```

## Source Organization (`src/`)

### Components (`src/Components/`)
Organized by feature domains with consistent naming:
- `auth/` - Authentication components
- `customers/` - Customer management UI
- `dashboard/` - Dashboard widgets and metrics
- `finance/` - Financial reporting components
- `material/` - Material intake and inventory
- `orders/` - Order management components
- `production/` - Production tracking UI
- `ui/` - Reusable UI components and design system
- `examples/` - Component examples and demos

### Business Logic (`src/lib/`)
- `auth/` - Authentication services and middleware
- `hooks/` - Custom React hooks
- `__tests__/` - Unit tests for utilities
- Core services: `database.ts`, `validation.ts`, `toast.ts`
- Business logic: `inventory.ts`, `productionBatch.ts`

### Data Layer (`src/Entities/`)
TypeScript interfaces and entity definitions:
- `User.ts` - User roles and authorization
- `SamplesLog.ts` - Sample tracking entities

### Pages (`src/Pages/`)
Top-level route components for each major section

## Naming Conventions

### Files
- **Components**: PascalCase (e.g., `OrderForm.tsx`)
- **Utilities**: camelCase (e.g., `validation.ts`)
- **Tests**: `*.test.ts` or `__tests__/` directory
- **Types/Entities**: PascalCase (e.g., `User.ts`)

### Components
- Feature components in domain folders
- Reusable UI components in `ui/` folder
- Test files co-located with components when possible

## Component Organization & Styling

#### Styling Governance
- All new components must adhere strictly to the existing Tailwind theme tokens:
  - `from-amber-50 to-orange-50` backgrounds
  - `border-amber-200` accents
  - `rounded-xl` corners and `backdrop-blur-sm` cards
- **No deviations** from these tokens are permitted without an explicit review and approval.

### Import Patterns
- Use `@/` alias for src imports
- Group imports: external libraries, internal modules, relative imports
- Prefer named exports over default exports for utilities

## Architecture Patterns

### Component Structure
- Functional components with TypeScript
- Custom hooks for business logic
- Props interfaces defined inline or exported
- Error boundaries for robust error handling

### Data Flow
- Mock database service with retry logic
- Entity-based data access patterns
- Form validation with custom hooks
- Toast notifications for user feedback

### Testing Strategy
- Unit tests for utilities and business logic
- Component tests for UI interactions
- Test files in `__tests__/` directories or co-located