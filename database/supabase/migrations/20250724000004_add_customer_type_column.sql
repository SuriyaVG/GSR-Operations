-- Add customer_type column to customers table
-- This resolves frontend schema mismatch errors

BEGIN;

-- Add column with default value 'retail' and constrain to allowed values
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS customer_type text NOT NULL DEFAULT 'retail' CHECK (customer_type IN ('retail', 'wholesale', 'distributor'));

-- Update any existing rows that may have NULLs (in case the column previously existed without NOT NULL)
UPDATE public.customers SET customer_type = COALESCE(customer_type, 'retail');

COMMIT; 