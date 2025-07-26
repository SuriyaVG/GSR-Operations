# Code Quality & Maintainability Checklist

## UI Refactor
- [ ] Use standardized component patterns (see design.md)
- [ ] Use centralized skeleton/loading components (CardSkeleton, TableSkeleton)
- [ ] Remove code duplication in loading and error handling
- [ ] Use consistent prop interfaces and naming conventions
- [ ] Ensure all components are mobile responsive
- [ ] Follow glassy card and amber color design system

## Business Logic Separation
- [ ] Move business logic out of UI components into service layers
- [ ] Use clear interfaces between UI and business logic
- [ ] Implement dependency injection patterns where appropriate
- [ ] Ensure all database operations go through service classes (e.g., DatabaseService, InventoryService)
- [ ] Avoid direct DB calls in React components

## TypeScript Type Safety
- [ ] Add/extend type definitions for all data models (see design.md)
- [ ] Use strict type checking for all service layer methods
- [ ] Create type-safe interfaces for all database operations
- [ ] Avoid use of 'any' and implicit 'any' types
- [ ] Ensure all API contracts are reflected in TypeScript interfaces
- [ ] Add/maintain unit tests for type safety and business logic 