# Implementation Plan

- [x] 1. Authentication System Overhaul





  - Replace auth-simple.tsx with proper database-driven role assignment
  - Update AuthProvider to use full authentication system
  - Fix role-based access control and RLS policy functionality
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 1.1 Replace auth-simple.tsx with proper authentication


  - Remove hardcoded email-based role assignment logic
  - Implement AuthService.getCurrentUser() to query user_profiles table for role assignment
  - Update AuthUser interface to include proper role and permissions from database
  - _Requirements: 1.1, 1.2, 1.5, 7.1, 7.4_

- [x] 1.2 Update AuthProvider with database-driven authentication



  - Replace simplified auth context with full AuthContextType implementation
  - Add hasPermission and hasRole methods that work with 5-role system
  - Implement proper authentication state initialization from database
  - _Requirements: 1.3, 1.4, 7.2, 7.3_

- [x] 1.3 Fix user role assignments in database



  - Create migration script to update user_profiles table with proper role assignments
  - Add database indexes for performance on user_profiles queries
  - Verify RLS policies function correctly with proper role assignments
  - _Requirements: 1.2, 1.3, 7.1, 7.5_

- [x] 2. Automated Financial Workflow Fix





  - Fix OrderForm to use OrderService instead of direct Order.create calls
  - Implement atomic order and invoice creation with proper error handling
  - Add database function for transactional order/invoice operations
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.1, 8.2_

- [x] 2.1 Create atomic order/invoice database function


  - Write create_order_with_invoice stored procedure for atomic operations
  - Include automatic invoice number generation and financial ledger entries
  - Add proper error handling and rollback for failed operations
  - _Requirements: 2.2, 2.3, 8.1, 8.2_

- [x] 2.2 Update OrderService with transaction management




  - Modify OrderService.createOrder to use atomic database function
  - Add proper error handling and user-friendly error messages
  - Return both order and invoice objects for UI display
  - _Requirements: 2.1, 2.4, 2.5, 8.2_

- [x] 2.3 Fix OrderForm component to use proper service layer


  - Replace direct Order.create calls with OrderService.createOrder
  - Update UI to display both order and invoice creation success
  - Add proper loading states and error handling for order creation
  - _Requirements: 2.1, 2.5, 8.1_

- [x] 3. Inventory Management Data Integrity Fix






  - Implement atomic production batch creation with inventory decrements
  - Create database function for transactional inventory operations
  - Fix timing of inventory updates to prevent data inconsistency
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.3, 8.4_

- [x] 3.1 Create atomic production batch database function


  - Write create_production_batch_atomic stored procedure
  - Include inventory quantity validation before any updates
  - Implement atomic inventory decrement with production batch creation
  - _Requirements: 3.1, 3.2, 3.5, 8.3_

- [x] 3.2 Update ProductionBatchService with transaction management


  - Modify createProductionBatch to use atomic database function
  - Add inventory validation before attempting batch creation
  - Include proper error handling for insufficient inventory scenarios
  - _Requirements: 3.2, 3.3, 3.4, 8.4_

- [x] 3.3 Fix Production page to use proper service layer


  - Update handleSaveBatch to use ProductionBatchService instead of direct entity calls
  - Add inventory availability checking before batch creation
  - Implement proper error messages for inventory-related failures
  - _Requirements: 3.1, 3.4, 3.5_

- [x] 4. Database View Logic Correction





  - Rewrite vw_batch_yield with proper calculated fields
  - Fix vw_customer_metrics reorder prediction algorithm
  - Add error handling for edge cases in view calculations
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.4_

- [x] 4.1 Fix vw_batch_yield view calculations


  - Rewrite view to calculate yield_percentage and cost_per_litre within the view
  - Add proper NULL handling and division by zero protection
  - Include material breakdown calculations with proper aggregation
  - _Requirements: 4.1, 4.3, 4.5_

- [x] 4.2 Fix vw_customer_metrics reorder prediction


  - Simplify predicted_reorder_date calculation algorithm
  - Add proper handling for customers with single orders
  - Include NULL value handling for edge cases
  - _Requirements: 4.2, 4.3, 4.5_

- [x] 4.3 Update application code to use corrected views



  - Modify components that query batch yield data to use vw_batch_yield
  - Update customer metrics queries to use corrected vw_customer_metrics
  - Add error handling for view query failures
  - _Requirements: 4.4, 9.1, 9.4_

- [x] 5. UI Component Consistency Fix






  - Standardize loading state components across all pages
  - Implement robust client-side validation for forms
  - Fix inconsistent skeleton component usage
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 10.1, 10.2_

- [x] 5.1 Standardize loading state components




  - Replace inconsistent loading implementations with centralized CardSkeleton and TableSkeleton
  - Update Dashboard, Orders, Production, and other pages to use consistent skeleton patterns
  - Remove custom loading logic in favor of reusable components
  - _Requirements: 5.1, 5.4, 10.1_

- [x] 5.2 Implement robust client-side validation





  - Add comprehensive validation to MaterialIntakeForm beyond basic HTML5 attributes
  - Implement validation for ProductionForm with zero/negative value prevention
  - Create reusable validation schemas using Zod for consistent validation patterns
  - _Requirements: 5.2, 5.3, 5.5, 10.2_

- [x] 5.3 Fix form validation error display




  - Add specific, actionable error messages for validation failures
  - Implement real-time validation feedback for quantity and cost inputs
  - Create consistent error styling and positioning across all forms
  - _Requirements: 5.3, 5.5, 10.2_

- [-] 6. Test Coverage and Reliability Improvement


  - Fix failing RoleService tests with proper mock setup
  - Implement reliable CreditNoteForm tests without brittle mocks
  - Add end-to-end tests for critical user flows
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 10.3, 10.4_

- [x] 6.1 Fix RoleService test failures







  - Rewrite RoleService tests with proper Supabase mocking
  - Remove brittle mock setups that cause test failures
  - Add comprehensive test coverage for role assignment and permission checking
  - _Requirements: 6.1, 6.3, 10.3_

- [x] 6.2 Fix CreditNoteForm test reliability





  - Implement proper component testing without complex mock dependencies
  - Add unit tests for form validation and submission logic
  - Create integration tests for credit note creation workflow
  - _Requirements: 6.2, 6.4, 10.4_

- [x] 6.3 Add end-to-end tests for critical flows






  - Create E2E test for order creation with automatic invoice generation
  - Implement E2E test for production batch creation with inventory decrement
  - Add E2E test for complete authentication flow with proper role assignment
  - _Requirements: 6.4, 6.5, 10.3, 10.4_

- [ ] 7. Security Vulnerability Remediation
  - Verify proper role assignment prevents unauthorized access
  - Test RLS policies with corrected authentication system
  - Add security audit logging for role-based access attempts
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.5, 9.5_

- [x] 7.1 Test role-based access control functionality








  - Create comprehensive tests for all 5 user roles (ADMIN, PRODUCTION, SALES_MANAGER, FINANCE, VIEWER)
  - Verify users receive appropriate permissions based on database role assignment
  - Test that RLS policies function correctly with proper role assignments
  - _Requirements: 7.1, 7.2, 7.5_

- [x] 7.2 Add security audit logging








  - Implement logging for unauthorized access attempts
  - Add audit trail for role assignment changes
  - Create monitoring for authentication failures and security events
  - _Requirements: 7.3, 7.5, 8.5_

- [x] 7.3 Verify RLS policy enforcement

  - [x] Test database-level security with corrected role assignments
  - [x] Verify users can only access data appropriate to their role
  - [x] Add integration tests for RLS policy compliance
  - _Requirements: 7.4, 7.5, 9.5_

- [x] 8. Data Consistency and Integrity Verification


  - [x] Add comprehensive transaction testing for critical operations
  - [x] Implement data integrity checks for financial workflows
  - [x] Create monitoring for data consistency issues
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.2, 9.3_

- [x] 8.1 Test atomic transaction functionality






  - [x] Create integration tests for order/invoice creation atomicity
  - [x] Test production batch/inventory decrement transaction integrity
  - [x] Verify rollback functionality when operations fail
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 8.2 Add data integrity monitoring








  - [x] Implement checks for orphaned records (orders without invoices)
  - [x] Add monitoring for inventory inconsistencies
  - [x] Create alerts for data integrity violations
  - _Requirements: 8.4, 8.5, 9.2_

- [x] 8.3 Create data consistency validation tools
  - [x] Build database validation queries to check referential integrity
  - [x] Add automated checks for business rule compliance
  - [x] Implement data repair utilities for consistency issues
  - _Requirements: 8.4, 8.5, 9.3_

- [x] 9. Performance and Reliability Enhancement
  - [x] Optimize database view query performance
  - [x] Add error handling and recovery mechanisms
  - [x] Implement performance monitoring for critical operations
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.5_

- [x] 9.1 Optimize database view performance
  - [x] Add appropriate indexes for vw_batch_yield, vw_invoice_aging, vw_customer_metrics
  - [x] Test view query performance under load conditions
  - [x] Implement query optimization for complex view calculations
  - _Requirements: 9.1, 9.4_

- [x] 9.2 Add comprehensive error handling
  - [x] Implement retry mechanisms for transient database failures
  - [x] Add user-friendly error messages for common failure scenarios
  - [x] Create error recovery workflows for critical operations
  - _Requirements: 9.2, 9.3, 10.5_

- [x] 9.3 Implement performance monitoring
  - [x] Add performance tracking for database operations
  - [x] Monitor critical user flow completion times
  - [x] Create alerts for performance degradation
  - _Requirements: 9.4, 9.5, 10.5_

- [x] 10. Code Quality and Maintainability Improvement
  - [x] Refactor components to follow consistent patterns
  - [x] Implement proper separation of concerns between UI and business logic
  - [x] Add comprehensive TypeScript type safety
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 10.1 Refactor UI components for consistency
  - [x] Standardize component patterns across pages
  - [x] Implement consistent prop interfaces and component structure
  - [x] Remove code duplication in loading and error handling
  - _Requirements: 10.1, 10.2_

- [x] 10.2 Improve business logic separation
  - [x] Move business logic from UI components to service layers
  - [x] Create clear interfaces between UI and business logic
  - [x] Implement proper dependency injection patterns
  - _Requirements: 10.2, 10.3_

- [x] 10.3 Enhance TypeScript type safety
  - [x] Add comprehensive type definitions for all data models
  - [x] Implement strict type checking for service layer methods
  - [x] Create type-safe interfaces for database operations
  - _Requirements: 10.4, 10.5_