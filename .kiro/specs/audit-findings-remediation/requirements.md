# Requirements Document

## Introduction

This feature addresses critical audit findings identified in the GSR Operations system review against PRD v2.0. The findings are categorized into six priority levels focusing on core business logic, data integrity, user experience, customer intelligence, analytics, and mobile optimization. The implementation will systematically resolve these issues to ensure the system meets business requirements and provides a robust, user-friendly experience.

## Requirements

### Requirement 1: Database Views Integration

**User Story:** As a system administrator, I want the application to use optimized database views instead of front-end calculations, so that data accuracy is guaranteed and performance is improved.

#### Acceptance Criteria

1. WHEN the system needs yield and COGP data THEN the system SHALL query vw_batch_yield view directly
2. WHEN the system needs invoice aging information THEN the system SHALL query vw_invoice_aging view directly  
3. WHEN the system needs customer metrics THEN the system SHALL query vw_customer_metrics view for LTV and AOV calculations
4. WHEN any database view is queried THEN the system SHALL handle errors gracefully and display 400-level error toasts with backend error messages
5. WHEN database connections fail THEN the system SHALL display "Unable to connect to database" error toast and retry mechanism

### Requirement 2: Inventory Management and FIFO Control

**User Story:** As an operations manager, I want strict inventory control with FIFO enforcement, so that stock levels are accurate and batches are consumed in the correct order.

#### Acceptance Criteria

1. WHEN a user selects batches in OrderForm THEN the system SHALL prevent selection of batches with zero remaining litres
2. WHEN a production batch is saved THEN the system SHALL automatically decrement remaining_quantity in material_intake_log
3. WHEN inventory operations occur THEN the system SHALL enforce FIFO (First In, First Out) ordering
4. IF a batch has insufficient quantity THEN the system SHALL display an error message and prevent the operation
5. WHEN inventory operations are performed THEN only users with Production or Admin roles SHALL be authorized to modify batch quantities

### Requirement 3: Automated Financial Workflow

**User Story:** As a finance manager, I want automated invoice and ledger management, so that financial records are consistent and complete without manual intervention.

#### Acceptance Criteria

1. WHEN an order is saved THEN the system SHALL automatically create an Invoice row
2. WHEN an invoice is created THEN the system SHALL link payments and credit notes via financial_ledger
3. WHEN returns or refunds occur THEN the system SHALL create negative ledger entries through a Credit Note UI
4. WHEN financial transactions are processed THEN the system SHALL maintain referential integrity across all related tables
5. WHEN financial operations are performed THEN only users with Finance or Admin roles SHALL be authorized to create invoices and credit notes

### Requirement 4: Dynamic Pricing Engine

**User Story:** As a sales manager, I want automated pricing with margin calculations, so that pricing is consistent and profitable across all orders.

#### Acceptance Criteria

1. WHEN the system initializes THEN the system SHALL create a pricing_rules table with tier-based pricing structure
2. WHEN creating an order THEN the system SHALL auto-populate unit_price from pricing rules
3. WHEN pricing is auto-populated THEN the system SHALL allow manual overrides only for users with Admin or Sales Manager roles
4. WHEN prices are set THEN the system SHALL automatically compute and display margin calculations
5. WHEN the system initializes pricing_rules table THEN it SHALL include default tier-based pricing data for existing products

### Requirement 5: Enhanced Master Data Management

**User Story:** As a data entry user, I want flexible input options for master data, so that I can quickly add new suppliers, materials, customers, and vendors without administrative delays.

#### Acceptance Criteria

1. WHEN entering supplier information THEN the system SHALL provide combobox with "+ New" option for free-text entry
2. WHEN entering material information THEN the system SHALL provide combobox with "+ New" option for free-text entry
3. WHEN entering customer information THEN the system SHALL provide combobox with "+ New" option for free-text entry
4. WHEN entering vendor information THEN the system SHALL provide combobox with "+ New" option for free-text entry
5. WHEN new master data is entered THEN the system SHALL enforce uniqueness at the database level
6. WHEN duplicate entries are attempted THEN the system SHALL display appropriate error messages

### Requirement 6: Form Validation and User Feedback

**User Story:** As a user, I want immediate feedback on form inputs and operations, so that I can correct errors quickly and understand the system's response to my actions.

#### Acceptance Criteria

1. WHEN entering quantities THEN the system SHALL prevent zero or negative values with client-side validation
2. WHEN entering costs THEN the system SHALL prevent zero or negative values with client-side validation
3. WHEN create operations succeed THEN the system SHALL display success toast notifications
4. WHEN create operations fail THEN the system SHALL display error toast notifications
5. WHEN update operations succeed THEN the system SHALL display success toast notifications
6. WHEN update operations fail THEN the system SHALL display error toast notifications

### Requirement 7: Consistent UI States

**User Story:** As a user, I want consistent loading and empty states across the application, so that I always understand the system's current status.

#### Acceptance Criteria

1. WHEN data is loading THEN the system SHALL display consistent skeleton components
2. WHEN no data is available THEN the system SHALL display a reusable EmptyState component with appropriate icon and message
3. WHEN tables are loading THEN the system SHALL use consistent skeleton patterns
4. WHEN cards are loading THEN the system SHALL use consistent skeleton patterns

### Requirement 8: Customer Relationship Management

**User Story:** As a customer service representative, I want comprehensive customer interaction tracking, so that I can provide personalized service and maintain complete customer history.

#### Acceptance Criteria

1. WHEN viewing customer details THEN the system SHALL display interaction_log entries with creation and editing capabilities
2. WHEN viewing customer details THEN the system SHALL display samples_log entries with creation and editing capabilities
3. WHEN viewing customer details THEN the system SHALL display returns_log entries with creation and editing capabilities
4. WHEN creating sample entries THEN the system SHALL allow creatable sample SKUs
5. WHEN creating return entries THEN the system SHALL allow creatable return reasons
6. WHEN viewing customer timeline THEN the system SHALL display orders, interactions, samples, and returns in chronological order

### Requirement 9: Automated Customer Intelligence

**User Story:** As a sales manager, I want automated reorder predictions and notifications, so that we can proactively engage customers and increase retention.

#### Acceptance Criteria

1. WHEN the system runs scheduled processes THEN it SHALL scan vw_customer_metrics for reorder patterns
2. WHEN reorder opportunities are identified THEN the system SHALL trigger follow-up reminders via email
3. WHEN reorder opportunities are identified THEN the system SHALL trigger follow-up reminders via WhatsApp
4. WHEN notifications are sent THEN the system SHALL log the communication in interaction_log

### Requirement 10: Financial Analytics and Reporting

**User Story:** As a finance manager, I want comprehensive cost analysis and margin reporting, so that I can make informed pricing and profitability decisions.

#### Acceptance Criteria

1. WHEN viewing order summaries THEN the system SHALL display cost-per-unit from vw_batch_yield
2. WHEN viewing order summaries THEN the system SHALL display margin per item calculations
3. WHEN creating orders THEN the system SHALL allow channel selection and display channel-specific pricing
4. WHEN viewing financial dashboards THEN the system SHALL display invoice aging data from vw_invoice_aging
5. WHEN viewing cash flow analytics THEN the system SHALL use actual data from database views

### Requirement 11: Mobile Web Optimization

**User Story:** As a mobile user, I want a responsive and touch-friendly interface, so that I can efficiently use the system on mobile devices.

#### Acceptance Criteria

1. WHEN viewing on small screens THEN the system SHALL convert wide tables to card lists using sm: breakpoints
2. WHEN using long forms on mobile THEN the system SHALL implement multi-step wizards or accordions
3. WHEN the app is accessed on mobile THEN the system SHALL provide PWA capabilities with offline caching
4. WHEN interacting with touch elements THEN the system SHALL provide adequate padding (p-4) for buttons and inputs
5. WHEN using modals on mobile THEN the system SHALL ensure they are scrollable and properly sized

### Requirement 12: System Performance and Accessibility

**User Story:** As any user, I want a performant and accessible system, so that I can use it efficiently regardless of my abilities or device capabilities.

#### Acceptance Criteria

1. WHEN performing operations THEN the system SHALL provide optimistic UI updates or loading indicators
2. WHEN buttons are processing THEN the system SHALL disable them and show spinners for feedback
3. WHEN the system is audited for accessibility THEN it SHALL pass axe accessibility testing
4. WHEN navigating with keyboard THEN the system SHALL provide proper focus outlines and aria-* attributes
5. WHEN importing entities THEN the system SHALL use barrel exports from Entities/all.ts
6. WHEN using utility functions THEN the system SHALL have complete implementations in utils.ts and User.ts

### Requirement 13: Data Migration and System Setup

**User Story:** As a system administrator, I want proper data migration and initialization procedures, so that the system can be deployed with consistent baseline data.

#### Acceptance Criteria

1. WHEN the pricing_rules table is created THEN the system SHALL include migration scripts for default tier-based pricing
2. WHEN new master data tables are added THEN the system SHALL include migration scripts to populate initial reference data
3. WHEN the system is deployed THEN it SHALL execute all pending migrations automatically
4. WHEN migrations fail THEN the system SHALL log detailed error messages and rollback incomplete changes
5. WHEN the system initializes THEN it SHALL verify all required database views exist and are accessible

### Requirement 14: Design System Consistency

**User Story:** As a user, I want a consistent visual experience that matches the established design system, so that the interface feels cohesive and professional.

#### Acceptance Criteria

1. WHEN implementing new UI components THEN the system SHALL use the established amber/orange color palette
2. WHEN creating cards and panels THEN the system SHALL maintain the glassy card aesthetic with consistent shadows and borders
3. WHEN adding new components THEN the system SHALL follow the established spacing scale and typography hierarchy
4. WHEN implementing responsive breakpoints THEN the system SHALL use consistent sm:, md:, lg: patterns
5. WHEN creating interactive elements THEN the system SHALL maintain consistent hover states and transitions
6. WHEN displaying data THEN the system SHALL use consistent icon sets and visual indicators