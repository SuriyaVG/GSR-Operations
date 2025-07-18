-- Rollback Migration for Initial Schema
-- This migration removes all tables, views, functions, and types created in the initial schema

-- Drop triggers
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
DROP TRIGGER IF EXISTS update_raw_materials_updated_at ON raw_materials;
DROP TRIGGER IF EXISTS update_material_intake_log_updated_at ON material_intake_log;
DROP TRIGGER IF EXISTS update_production_batches_updated_at ON production_batches;
DROP TRIGGER IF EXISTS update_batch_inputs_updated_at ON batch_inputs;
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
DROP TRIGGER IF EXISTS update_order_items_updated_at ON order_items;
DROP TRIGGER IF EXISTS update_pricing_rules_updated_at ON pricing_rules;
DROP TRIGGER IF EXISTS update_interaction_log_updated_at ON interaction_log;
DROP TRIGGER IF EXISTS update_samples_log_updated_at ON samples_log;
DROP TRIGGER IF EXISTS update_returns_log_updated_at ON returns_log;
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
DROP TRIGGER IF EXISTS update_credit_notes_updated_at ON credit_notes;
DROP TRIGGER IF EXISTS update_financial_ledger_updated_at ON financial_ledger;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop views
DROP VIEW IF EXISTS vw_customer_metrics;
DROP VIEW IF EXISTS vw_invoice_aging;
DROP VIEW IF EXISTS vw_batch_yield;

-- Drop indexes
DROP INDEX IF EXISTS idx_user_profiles_role;
DROP INDEX IF EXISTS idx_suppliers_active;
DROP INDEX IF EXISTS idx_raw_materials_active;
DROP INDEX IF EXISTS idx_material_intake_supplier;
DROP INDEX IF EXISTS idx_material_intake_raw_material;
DROP INDEX IF EXISTS idx_material_intake_date;
DROP INDEX IF EXISTS idx_production_batches_date;
DROP INDEX IF EXISTS idx_production_batches_status;
DROP INDEX IF EXISTS idx_batch_inputs_batch;
DROP INDEX IF EXISTS idx_batch_inputs_material;
DROP INDEX IF EXISTS idx_customers_tier;
DROP INDEX IF EXISTS idx_customers_channel;
DROP INDEX IF EXISTS idx_customers_active;
DROP INDEX IF EXISTS idx_orders_customer;
DROP INDEX IF EXISTS idx_orders_date;
DROP INDEX IF EXISTS idx_orders_status;
DROP INDEX IF EXISTS idx_order_items_order;
DROP INDEX IF EXISTS idx_order_items_batch;
DROP INDEX IF EXISTS idx_pricing_rules_tier_category;
DROP INDEX IF EXISTS idx_pricing_rules_effective_dates;
DROP INDEX IF EXISTS idx_interaction_log_customer;
DROP INDEX IF EXISTS idx_interaction_log_created_at;
DROP INDEX IF EXISTS idx_samples_log_customer;
DROP INDEX IF EXISTS idx_samples_log_sent_date;
DROP INDEX IF EXISTS idx_returns_log_customer;
DROP INDEX IF EXISTS idx_returns_log_order;
DROP INDEX IF EXISTS idx_invoices_order;
DROP INDEX IF EXISTS idx_invoices_due_date;
DROP INDEX IF EXISTS idx_invoices_status;
DROP INDEX IF EXISTS idx_credit_notes_invoice;
DROP INDEX IF EXISTS idx_financial_ledger_customer;
DROP INDEX IF EXISTS idx_financial_ledger_date;
DROP INDEX IF EXISTS idx_financial_ledger_reference;

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS financial_ledger;
DROP TABLE IF EXISTS credit_notes;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS returns_log;
DROP TABLE IF EXISTS samples_log;
DROP TABLE IF EXISTS interaction_log;
DROP TABLE IF EXISTS pricing_rules;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS batch_inputs;
DROP TABLE IF EXISTS production_batches;
DROP TABLE IF EXISTS material_intake_log;
DROP TABLE IF EXISTS raw_materials;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS user_profiles;

-- Drop custom types
DROP TYPE IF EXISTS reference_type;
DROP TYPE IF EXISTS transaction_type;
DROP TYPE IF EXISTS return_status;
DROP TYPE IF EXISTS interaction_type;
DROP TYPE IF EXISTS credit_note_status;
DROP TYPE IF EXISTS invoice_status;
DROP TYPE IF EXISTS quality_grade;
DROP TYPE IF EXISTS batch_status;
DROP TYPE IF EXISTS payment_status;
DROP TYPE IF EXISTS order_status;
DROP TYPE IF EXISTS customer_channel;
DROP TYPE IF EXISTS customer_tier;
DROP TYPE IF EXISTS user_role;