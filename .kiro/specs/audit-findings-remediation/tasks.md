# Implementation Plan

- [x] 1. Database Infrastructure Setup







  - Create database migration scripts for new tables and views
  - Implement database service layer with error handling and retry mechanisms
  - Add role-based authentication and permission system
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 1.1 Create database migration scripts


  - Write SQL migration file for pricing_rules, interaction_log, samples_log, returns_log tables
  - Create database views: vw_batch_yield, vw_invoice_aging, vw_customer_metrics
  - Add indexes for performance optimization on frequently queried columns
  - _Requirements: 1.1, 1.2, 1.3, 13.1, 13.2_

- [x] 1.2 Implement DatabaseService class with view integration


  - Create DatabaseService class with methods for querying vw_batch_yield, vw_invoice_aging, vw_customer_metrics
  - Implement error handling with 400-level error toast display and retry mechanisms
  - Add database connection validation and graceful failure handling
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_





- [x] 1.3 Create role-based authentication system





  - Define UserRole enum and Permission interface with resource-action mapping
  - Implement permission checking functions for Admin, Production, Sales Manager, Finance roles

  - Add authorization middleware for protecting sensitive operations

  - _Requirements: 2.5, 3.5, 4.3_


- [x] 2. Enhanced UI Components Foundation




  - Create reusable CreatableCombobox component for master data entry
  - Implement consistent loading states with EmptyState and enhanced Skeleton components

  - Add form validation system with toast notifications
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

- [x] 2.1 Create CreatableCombobox component










  - Build reusable combobox component with "+ New" option for free-text entry
  - Implement dropdown with search functionality and create new item modal
  - Add proper keyboard navigation and accessibility attributes
  - _Requirements: 5.1, 5.2, 5.3, 5.4_







- [x] 2.2 Implement enhanced loading and empty states





  - Create reusable EmptyState component with icon, title, description, and optional action

  - Build TableSkeleton, CardSkeleton, and FormSkeleton components with consistent styling


  - Ensure all skeleton components use amber/orange color scheme and proper animations







  - _Requirements: 7.1, 7.2, 7.3, 7.4, 14.1, 14.2_





- [x] 2.3 Add form validation and toast notification system



  - Implement client-side validation for preventing zero/negative quantities and costs
  - Create toast notification service with success, error, warning, and info methods

  - Add form validation hooks and error display components
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 3. Inventory Management with FIFO Enforcement






  - Implement InventoryService class with FIFO batch selection logic

  - Update OrderForm to prevent selection of zero-quantity batches
  - Add automatic quantity decrementing when production batches are saved
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
-

- [x] 3.1 Create InventoryService with FIFO logic









  - Implement getAvailableBatches method with FIFO ordering by intake_date
  - Add validateBatchSelection method to check remaining quantities
  - Create decrementBatchQuantity method with transaction logging
  - _Requirements: 2.1, 2.3, 2.4_
-

- [x] 3.2 Update OrderForm with batch validation










  - Modify OrderForm to query available batches and prevent zero-quantity selection
  - Add real-time quantity validation and error display
  - Implement batch selection UI with remaining quantity indicators
  - _Requirements: 2.1, 2.4, 2.5_

- [x] 3.3 Implement automatic inventory decrementing

















  - Add hooks to ProductionBatch save operations to decrement material_intake_log quantities
  - Create audit trail for inventory movements with user tracking
  - Add rollback functionality for failed production batch operations
  - _Requirements: 2.2, 2.5_


- [x] 4. Automated Financial Workflow










  - Create Invoice and CreditNote entity models
  - Implement automated invoice creation on order save
  - Build Credit Note UI for handling returns and refunds
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4.1 Create Invoice and CreditNote entities






  - Implement Invoice entity with order linking and payment tracking
  - Create CreditNote entity with invoice references and negative ledger entries

  - Add financial_ledger integration for maintaining transaction history
  - _Requirements: 3.1, 3.2, 3.4_



- [x] 4.2 Implement automated invoice workflow





  - Add order save hooks to automatically create Invoice records
  - Link payments and credit notes through financial_ledger entries
  - Ensure referential integrity across orders, invoices, and ledger entries
  - _Requirements: 3.1, 3.2, 3.4, 3.5_
- [x] 4.3 Build Credit Note UI component




- [x] 4.3 Build Credit Note UI component



  - Create CreditNoteForm component for processing returns and refunds
  - Implement negative ledger entry creation with proper validation

  - Add credit note approval workflow for Finance role users
  - _Requirements: 3.3, 3.5_

- [ ] 5. Dynamic Pricing Engine

  - Create PricingService class with tier-based pricing logic

  - Implement pricing_rules table integration
  - Update OrderForm with automatic price calculation and override capabilities

  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 5.1 Implement PricingService class



  - Create calculatePrice method using customer tier and quantity thresholds
  - Implement applyPricingRules method for order item price calculation
  - Add validatePriceOverride method with role-based authorization

  - _Requirements: 4.1, 4.2, 4.3, 4.5_


- [-] 5.2 Update OrderForm with dynamic pricing



  - Integrate PricingService to auto-populate unit prices based on customer and quantity

  - Add price override functionality with proper authorization checks

  - Display margin calculations and pricing rule information
  - _Requirements: 4.2, 4.3, 4.4_

- [ ] 5.3 Create pricing rules management interface




  - Build PricingRulesForm for creating and editing tier-based pricing
  - Add pricing rules table with effective date management
  - Implement default pricing data seeding for existing products
  - _Requirements: 4.1, 4.5_


- [ ] 6. Customer Relationship Management Features


  - Create interaction_log, samples_log, returns_log entity models
  - Build customer detail page with CRM forms and timeline
  - Implement unified customer timeline component
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_


- [-] 6.1 Create CRM entity models



  - Implement InteractionLog entity with customer linking and user tracking
  - Create SamplesLog entity with SKU management and conversion tracking
  - Build ReturnsLog entity with order references and refund processing
  - _Requirements: 8.1, 8.2, 8.3_


- [ ] 6.2 Build CRM forms for customer interactions


  - Create InteractionForm component with type selection and follow-up tracking
  - Implement SampleForm component with creatable SKU options
  - Build ReturnForm component with order selection and reason tracking


  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_


- [ ] 6.3 Implement unified customer timeline



  - Create CustomerTimeline component displaying orders, interactions, samples, returns chronologically
  - Add timeline event filtering and search functionality
  - Implement timeline event detail modals with edit capabilities
  - _Requirements: 8.6_

- [ ] 7. Automated Customer Intelligence



  - Implement reorder prediction using vw_customer_metrics
  - Create notification system for email and WhatsApp reminders
  - Add customer intelligence dashboard
  - _Requirements: 9.1, 9.2, 9.3, 9.4_


- [ ] 7.1 Create reorder prediction service


  - Implement CustomerIntelligenceService using vw_customer_metrics for pattern analysis
  - Add reorder prediction algorithm based on average days between orders
  - Create scheduled job system for scanning customer metrics
  - _Requirements: 9.1_

- [ ] 7.2 Build notification system


  - Implement NotificationService with email and WhatsApp integration
  - Create notification templates for reorder reminders
  - Add notification logging to interaction_log for tracking
  - _Requirements: 9.2, 9.3, 9.4_

- [ ] 7.3 Create customer intelligence dashboard

  - Build dashboard showing reorder predictions and customer insights
  - Add customer segmentation based on LTV, AOV, and order frequency
  - Implement actionable notifications and follow-up task management
  - _Requirements: 9.1, 9.2_

- [ ] 8. Financial Analytics and Reporting

  - Create cost and margin analysis components
  - Implement invoice aging dashboard
  - Add channel-specific pricing and analytics
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 8.1 Build cost and margin analysis components

  - Create CostMarginCard component using vw_batch_yield data
  - Implement detailed cost breakdown with material-level analysis
  - Add margin calculation display with profitability indicators
  - _Requirements: 10.1, 10.2_

- [ ] 8.2 Implement invoice aging dashboard

  - Create InvoiceAgingChart component using vw_invoice_aging data
  - Build aging bucket visualization with drill-down capabilities

  - Add overdue invoice alerts and follow-up action items
  - _Requirements: 10.4_

- [ ] 8.3 Add channel-specific pricing and analytics

  - Extend Customer entity with channel field (direct, distributor, online, retail)
  - Update OrderForm to display channel-specific pricing and margins
  - Create channel performance analytics dashboard
  - _Requirements: 10.3, 10.5_

- [ ] 9. Mobile Web Optimization

  - Create responsive table component with card layout fallback
  - Implement multi-step form wizard for mobile
  - Add PWA capabilities with offline caching
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 9.1 Create responsive table component


  - Build ResponsiveTable component that switches to card layout on small screens
  - Implement mobile-friendly card renderer for table data
  - Add touch-friendly sorting and filtering controls
  - _Requirements: 11.1_


- [ ] 9.2 Implement multi-step form wizard

  - Create FormWizard component with step navigation and progress indicators

  - Add mobile-optimized step transitions and validation
  - Implement accordion-style form sections for long forms
  - _Requirements: 11.2_


- [ ] 9.3 Add PWA capabilities
  - Configure service worker with Workbox for offline caching
  - Create web app manifest with proper icons and theme colors
  - Implement offline data synchronization for critical operations
  - _Requirements: 11.3_

- [ ] 9.4 Enhance mobile touch interactions

  - Increase button and input padding to p-4 for better touch targets
  - Ensure modals and drawers are properly sized and scrollable on mobile
  - Add touch-friendly gestures for common actions
  - _Requirements: 11.4, 11.5_

- [ ] 10. System Performance and Accessibility

  - Implement optimistic UI updates and loading indicators
  - Conduct accessibility audit and add proper ARIA attributes
  - Complete barrel exports and utility functions
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [ ] 10.1 Add optimistic UI updates and loading states


  - Implement optimistic updates for form submissions with rollback on failure
  - Add loading spinners and disabled states for processing buttons
  - Create consistent loading indicators across all async operations
  - _Requirements: 12.1, 12.2_


- [ ] 10.2 Conduct accessibility improvements

  - Run axe accessibility audit and fix identified issues
  - Add proper ARIA attributes, labels, and focus management
  - Ensure keyboard navigation works for all interactive elements
  - _Requirements: 12.3, 12.4_

- [ ] 10.3 Complete code organization and utilities

  - Update Entities/all.ts with barrel exports for all entity models
  - Complete utils.ts with missing helper functions for date formatting, validation, etc.
  - Implement User.ts with proper user management and role checking utilities
  - _Requirements: 12.5, 12.6_