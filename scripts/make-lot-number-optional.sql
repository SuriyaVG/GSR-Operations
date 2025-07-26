-- Make lot_number optional in material_intake_log table
ALTER TABLE material_intake_log ALTER COLUMN lot_number DROP NOT NULL;