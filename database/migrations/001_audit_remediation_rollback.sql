-- Rollback Migration: Remove audit remediation tables and views
-- File: database/migrations/001_audit_remediation_rollback.sql

-- Drop triggers
DROP TRIGGER IF EXISTS update_pricing_rules_updated_at ON pricing_rules;
DROP TRIGGER IF EXISTS update_interaction_log_updated_at ON interaction_log;
DROP TRIGGER IF EXISTS update_samples_log_updated_at ON samples_log;
DROP TRIGGER IF EXISTS update_returns_log_updated_at ON returns_log;
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
DROP TRIGGER IF EXISTS update_credit_notes_updated_at ON credit_notes;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop views
DROP VIEW IF EXISTS vw_customer_metrics;
DROP VIEW IF EXISTS vw_invoice_aging;
DROP VIEW IF EXISTS vw_batch_yield;

-- Drop indexes
DROP INDEX IF EXISTS idx_credit_notes_invoice;
DROP INDEX IF EXISTS idx_invoices_status;
DROP INDEX IF EXISTS idx_invoices_due_date;
DROP INDEX IF EXISTS idx_invoices_order;
DROP INDEX IF EXISTS idx_returns_log_order;
DROP INDEX IF EXISTS idx_returns_log_customer;
DROP INDEX IF EXISTS idx_samples_log_sent_date;
DROP INDEX IF EXISTS idx_samples_log_customer;
DROP INDEX IF EXISTS idx_interaction_log_created_at;
DROP INDEX IF EXISTS idx_interaction_log_customer;
DROP INDEX IF EXISTS idx_pricing_rules_effective_dates;
DROP INDEX IF EXISTS idx_pricing_rules_tier_category;

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS credit_notes;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS returns_log;
DROP TABLE IF EXISTS samples_log;
DROP TABLE IF EXISTS interaction_log;
DROP TABLE IF EXISTS pricing_rules;

-- Remove channel column from customers table (if it was added)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'channel') THEN
    ALTER TABLE customers DROP COLUMN channel;
  END IF;
END $$;