-- Row Level Security (RLS) Policies for GSR Operations
-- This migration sets up comprehensive RLS policies for all tables

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_intake_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE samples_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_ledger ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM user_profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has specific role
CREATE OR REPLACE FUNCTION has_role(required_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() = required_role OR is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has any of multiple roles
CREATE OR REPLACE FUNCTION has_any_role(roles user_role[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() = ANY(roles) OR is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User Profiles Policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update all profiles" ON user_profiles
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can delete profiles" ON user_profiles
  FOR DELETE USING (is_admin());

-- Suppliers Policies
CREATE POLICY "All authenticated users can view suppliers" ON suppliers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Production and admin can manage suppliers" ON suppliers
  FOR ALL USING (has_any_role(ARRAY['admin', 'production']::user_role[]));

-- Raw Materials Policies
CREATE POLICY "All authenticated users can view raw materials" ON raw_materials
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Production and admin can manage raw materials" ON raw_materials
  FOR ALL USING (has_any_role(ARRAY['admin', 'production']::user_role[]));

-- Material Intake Log Policies
CREATE POLICY "All authenticated users can view material intake" ON material_intake_log
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Production and admin can manage material intake" ON material_intake_log
  FOR ALL USING (has_any_role(ARRAY['admin', 'production']::user_role[]));

-- Production Batches Policies
CREATE POLICY "All authenticated users can view production batches" ON production_batches
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Production and admin can manage production batches" ON production_batches
  FOR ALL USING (has_any_role(ARRAY['admin', 'production']::user_role[]));

-- Batch Inputs Policies
CREATE POLICY "All authenticated users can view batch inputs" ON batch_inputs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Production and admin can manage batch inputs" ON batch_inputs
  FOR ALL USING (has_any_role(ARRAY['admin', 'production']::user_role[]));

-- Customers Policies
CREATE POLICY "All authenticated users can view customers" ON customers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Sales and admin can manage customers" ON customers
  FOR ALL USING (has_any_role(ARRAY['admin', 'sales_manager']::user_role[]));

-- Orders Policies
CREATE POLICY "All authenticated users can view orders" ON orders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Sales and admin can manage orders" ON orders
  FOR ALL USING (has_any_role(ARRAY['admin', 'sales_manager']::user_role[]));

-- Order Items Policies
CREATE POLICY "All authenticated users can view order items" ON order_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Sales and admin can manage order items" ON order_items
  FOR ALL USING (has_any_role(ARRAY['admin', 'sales_manager']::user_role[]));

-- Pricing Rules Policies
CREATE POLICY "All authenticated users can view pricing rules" ON pricing_rules
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Sales and admin can manage pricing rules" ON pricing_rules
  FOR ALL USING (has_any_role(ARRAY['admin', 'sales_manager']::user_role[]));

-- Interaction Log Policies
CREATE POLICY "All authenticated users can view interaction log" ON interaction_log
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Sales and admin can manage interaction log" ON interaction_log
  FOR ALL USING (has_any_role(ARRAY['admin', 'sales_manager']::user_role[]));

-- Samples Log Policies
CREATE POLICY "All authenticated users can view samples log" ON samples_log
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Sales and admin can manage samples log" ON samples_log
  FOR ALL USING (has_any_role(ARRAY['admin', 'sales_manager']::user_role[]));

-- Returns Log Policies
CREATE POLICY "All authenticated users can view returns log" ON returns_log
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Finance and admin can manage returns log" ON returns_log
  FOR ALL USING (has_any_role(ARRAY['admin', 'finance']::user_role[]));

-- Invoices Policies
CREATE POLICY "All authenticated users can view invoices" ON invoices
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Finance and admin can manage invoices" ON invoices
  FOR ALL USING (has_any_role(ARRAY['admin', 'finance']::user_role[]));

-- Credit Notes Policies
CREATE POLICY "All authenticated users can view credit notes" ON credit_notes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Finance and admin can manage credit notes" ON credit_notes
  FOR ALL USING (has_any_role(ARRAY['admin', 'finance']::user_role[]));

-- Financial Ledger Policies
CREATE POLICY "Finance and admin can view financial ledger" ON financial_ledger
  FOR SELECT USING (has_any_role(ARRAY['admin', 'finance']::user_role[]));

CREATE POLICY "Finance and admin can manage financial ledger" ON financial_ledger
  FOR ALL USING (has_any_role(ARRAY['admin', 'finance']::user_role[]));

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, role, name)
  VALUES (NEW.id, 'viewer', COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();