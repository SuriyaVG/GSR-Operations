# Requirements Document

## Introduction

This feature addresses the critical audit findings identified in the GSR Operations system review. The audit revealed six major categories of issues: authentication system mismatch, automated financial workflow bugs, inventory management flaws, database schema inconsistencies, UI component issues, and insufficient test coverage. These findings represent fundamental system failures that compromise security, data integrity, and business logic functionality.

## Requirements

### Requirement 1: Authentication System Overhaul

**User Story:** As a system administrator, I want a proper 5-role authentication system instead of the hardcoded 2-role system, so that role-based access control functions correctly and security policies are enforced.

#### Acceptance Criteria

1. WHEN the system authenticates a user THEN it SHALL assign roles based on database user_profiles table, not hardcoded email checks
2. WHEN a user is assigned a role THEN the system SHALL support all 5 roles: ADMIN, PRODUCTION, SALES_MANAGER, FINANCE, VIEWER
3. WHEN RLS policies are evaluated THEN they SHALL function correctly with the proper role assignments
4. WHEN a user accesses protected resources THEN the system SHALL enforce role-based permissions according to the specification
5. WHEN the authentication system initializes THEN it SHALL replace auth-simple.tsx with the full auth.tsx implementation

### Requirement 2: Automated Financial Workflow Fix

**User Story:** As a finance manager, I want orders to automatically create invoices through the proper service layer, so that financial records are complete and business logic is correctly implemented.

#### Acceptance Criteria

1. WHEN an order is saved in the UI THEN the system SHALL call OrderService.createOrder instead of Order.create directly
2. WHEN OrderService.createOrder is called THEN it SHALL automatically create an Invoice record via FinancialService.createInvoiceFromOrder
3. WHEN the invoice creation process fails THEN the system SHALL rollback the order creation to maintain data integrity
4. WHEN the automated workflow completes THEN both order and invoice records SHALL exist with proper linking
5. WHEN the UI displays order confirmation THEN it SHALL show both order and invoice details

### Requirement 3: Inventory Management Data Integrity Fix

**User Story:** As an operations manager, I want inventory decrements to occur within database transactions, so that stock levels remain accurate even if production batch creation fails.

#### Acceptance Criteria

1. WHEN a production batch is created THEN inventory decrements SHALL occur within the same database transaction as batch creation
2. WHEN production batch creation fails THEN inventory quantities SHALL remain unchanged (automatic rollback)
3. WHEN inventory operations succeed THEN the system SHALL maintain accurate stock levels and audit trails
4. WHEN batch creation is attempted with insufficient inventory THEN the system SHALL prevent the operation before any changes
5. WHEN inventory transactions are processed THEN they SHALL be atomic and consistent

### Requirement 4: Database View Logic Correction

**User Story:** As a business analyst, I want accurate database views that calculate metrics correctly, so that business intelligence and reporting provide reliable data.

#### Acceptance Criteria

1. WHEN vw_batch_yield is queried THEN it SHALL calculate yield_percentage and cost_per_litre within the view, not rely on table values
2. WHEN vw_customer_metrics is queried THEN the predicted_reorder_date calculation SHALL use a simplified and accurate algorithm
3. WHEN database views are created THEN they SHALL include proper error handling for edge cases (customers with single orders, zero quantities)
4. WHEN views are updated THEN they SHALL maintain backward compatibility with existing queries
5. WHEN view calculations are performed THEN they SHALL handle NULL values and division by zero scenarios gracefully

### Requirement 5: UI Component Consistency Fix

**User Story:** As a user, I want consistent loading states and proper client-side validation across all forms, so that the interface behaves predictably and provides immediate feedback.

#### Acceptance Criteria

1. WHEN data is loading THEN all pages SHALL use the centralized CardSkeleton and TableSkeleton components consistently
2. WHEN forms are submitted THEN they SHALL include robust client-side validation beyond basic HTML5 attributes
3. WHEN validation errors occur THEN the system SHALL display specific, actionable error messages
4. WHEN zero or negative values are entered THEN the system SHALL prevent submission with clear validation feedback
5. WHEN loading states are displayed THEN they SHALL follow the established design system patterns

### Requirement 6: Test Coverage and Reliability Improvement

**User Story:** As a developer, I want reliable and comprehensive test coverage for core business logic, so that regressions are caught early and the system remains stable.

#### Acceptance Criteria

1. WHEN RoleService tests are run THEN they SHALL pass without mock setup failures
2. WHEN CreditNoteForm tests are executed THEN they SHALL properly mock dependencies and test business logic
3. WHEN authentication tests are run THEN they SHALL cover the full 5-role system, not the simplified version
4. WHEN end-to-end tests are implemented THEN they SHALL cover critical user flows: order creation with invoice, production batch with inventory decrement
5. WHEN test suites are executed THEN they SHALL have at least 80% coverage for business logic components

### Requirement 7: Critical Security Vulnerability Fix

**User Story:** As a security administrator, I want proper role assignment and permission enforcement, so that users cannot access resources beyond their authorized level.

#### Acceptance Criteria

1. WHEN non-admin users log in THEN they SHALL receive appropriate roles (PRODUCTION, SALES_MANAGER, FINANCE) based on their profile, not default to VIEWER
2. WHEN RLS policies are evaluated THEN they SHALL function with the correct role assignments
3. WHEN users attempt unauthorized actions THEN the system SHALL deny access and log the attempt
4. WHEN role assignments are made THEN they SHALL be based on database records, not hardcoded email comparisons
5. WHEN the system is audited for security THEN it SHALL pass role-based access control verification

### Requirement 8: Data Consistency and Integrity Assurance

**User Story:** As a data administrator, I want all business operations to maintain referential integrity and data consistency, so that the system provides reliable information for decision-making.

#### Acceptance Criteria

1. WHEN orders are created THEN the system SHALL ensure both order and invoice records are created or neither is created
2. WHEN production batches are processed THEN inventory levels SHALL be updated atomically with batch creation
3. WHEN financial transactions occur THEN all related ledger entries SHALL be created consistently
4. WHEN data validation fails THEN the system SHALL prevent partial updates and maintain data integrity
5. WHEN business operations are performed THEN audit trails SHALL be created for all data modifications

### Requirement 9: Performance and Reliability Enhancement

**User Story:** As a system user, I want the application to perform reliably under normal operating conditions, so that business operations are not disrupted by system failures.

#### Acceptance Criteria

1. WHEN database views are queried THEN they SHALL return results within acceptable performance thresholds (< 500ms for complex queries)
2. WHEN business logic operations are performed THEN they SHALL complete successfully under normal load conditions
3. WHEN errors occur THEN the system SHALL provide meaningful error messages and recovery options
4. WHEN the system is under load THEN it SHALL maintain responsive user interface performance
5. WHEN critical operations fail THEN the system SHALL log detailed error information for troubleshooting

### Requirement 10: Code Quality and Maintainability Improvement

**User Story:** As a developer, I want clean, maintainable code that follows established patterns, so that the system can be efficiently maintained and extended.

#### Acceptance Criteria

1. WHEN UI components are implemented THEN they SHALL follow consistent patterns and use centralized skeleton components
2. WHEN business logic is implemented THEN it SHALL be properly separated from UI components in service layers
3. WHEN database operations are performed THEN they SHALL use proper transaction management and error handling
4. WHEN code is written THEN it SHALL follow TypeScript best practices and maintain type safety
5. WHEN components are created THEN they SHALL be properly tested with reliable, maintainable test suites