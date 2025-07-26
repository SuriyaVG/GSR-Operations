-- Seed Data Migration for GSR Operations
-- This migration inserts initial data for development and testing

-- Insert default pricing rules data
INSERT INTO pricing_rules (customer_tier, product_category, min_quantity, unit_price, margin_percentage, effective_from) VALUES
  ('premium', 'ghee', 1, 650.00, 35.00, NOW()),
  ('premium', 'ghee', 5, 620.00, 32.00, NOW()),
  ('premium', 'ghee', 10, 590.00, 28.00, NOW()),
  ('wholesale', 'ghee', 1, 580.00, 25.00, NOW()),
  ('wholesale', 'ghee', 10, 550.00, 22.00, NOW()),
  ('wholesale', 'ghee', 25, 520.00, 18.00, NOW()),
  ('standard', 'ghee', 1, 600.00, 30.00, NOW()),
  ('standard', 'ghee', 5, 580.00, 27.00, NOW()),
  ('standard', 'ghee', 10, 560.00, 24.00, NOW())
ON CONFLICT DO NOTHING;

-- Insert sample suppliers
INSERT INTO suppliers (name, contact_person, email, phone, address, payment_terms, active) VALUES
  ('Dairy Fresh Suppliers', 'Rajesh Kumar', 'rajesh@dairyfresh.com', '+91-9876543210', 'Mumbai, Maharashtra', 30, true),
  ('Premium Cream Co.', 'Priya Sharma', 'priya@premiumcream.com', '+91-9876543211', 'Pune, Maharashtra', 15, true),
  ('Golden Milk Farms', 'Amit Patel', 'amit@goldenmilk.com', '+91-9876543212', 'Ahmedabad, Gujarat', 45, true)
ON CONFLICT DO NOTHING;

-- Insert sample raw materials
INSERT INTO raw_materials (name, category, unit, cost_per_unit, active) VALUES
  ('Fresh Cream', 'Dairy', 'Litre', 45.00, true),
  ('Butter', 'Dairy', 'Kg', 350.00, true),
  ('Salt', 'Additive', 'Kg', 25.00, true),
  ('Packaging Material', 'Packaging', 'Unit', 5.00, true)
ON CONFLICT DO NOTHING;

-- Insert sample customers
INSERT INTO customers (name, email, phone, address, city, channel, tier, credit_limit, payment_terms, active) VALUES
  ('Gourmet Foods Ltd', 'orders@gourmetfoods.com', '+91-9876543220', '123 Food Street', 'Mumbai', 'direct', 'premium', 100000.00, 30, true),
  ('Healthy Living Store', 'contact@healthyliving.com', '+91-9876543221', '456 Health Avenue', 'Delhi', 'retail', 'standard', 50000.00, 15, true),
  ('Organic Market Chain', 'procurement@organicmarket.com', '+91-9876543222', '789 Organic Plaza', 'Bangalore', 'distributor', 'wholesale', 200000.00, 45, true),
  ('Home Kitchen Supplies', 'info@homekitchen.com', '+91-9876543223', '321 Kitchen Lane', 'Chennai', 'direct', 'standard', 25000.00, 30, true)
ON CONFLICT DO NOTHING;