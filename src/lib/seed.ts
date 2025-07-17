import { Supplier, RawMaterial, Customer, MaterialIntakeLog, ProductionBatch, Order, FinancialLedger } from '@/Entities/all';

export const seedDatabase = async () => {
  const hasBeenSeeded = localStorage.getItem('db_seeded_v3'); // New version key to force re-seed
  if (hasBeenSeeded) {
    return;
  }

  console.log('Clearing old data and seeding database with comprehensive prototype data...');
  
  // Clear all old data from localStorage
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('db_')) {
      localStorage.removeItem(key);
    }
  });

  // --- Core Entities ---
  const suppliers = await Promise.all([
    Supplier.create({ name: 'Amul Dairy Cooperative', contact_person: 'Raj Kumar', phone: '+91-9999888877', email: 'raj@amul.com', address: 'Anand, Gujarat', active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
    Supplier.create({ name: 'Mother Dairy', contact_person: 'Priya Sharma', phone: '+91-9888777666', email: 'priya@motherdairy.com', address: 'Delhi', active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
    Supplier.create({ name: 'Glass Jar Industries', contact_person: 'Amit Singh', phone: '+91-9777666555', email: 'amit@glassjar.com', address: 'Mumbai', active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
  ]);
  
  const rawMaterials = await Promise.all([
    RawMaterial.create({ name: 'Cream Butter', category: 'butter', unit: 'kg', active: true, cost_per_unit: 450.00, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
    RawMaterial.create({ name: 'Sunday Butter', category: 'butter', unit: 'kg', active: true, cost_per_unit: 480.00, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
    RawMaterial.create({ name: 'Wednesday Butter', category: 'butter', unit: 'kg', active: true, cost_per_unit: 470.00, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
    RawMaterial.create({ name: '500ml Glass Jars', category: 'packaging', unit: 'pieces', active: true, cost_per_unit: 15.00, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
    RawMaterial.create({ name: 'Gold Seals', category: 'packaging', unit: 'pieces', active: true, cost_per_unit: 2.00, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
    RawMaterial.create({ name: '1000ml Glass Jars', category: 'packaging', unit: 'pieces', active: true, cost_per_unit: 25.00, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  ]);
  
  const customers = await Promise.all([
    Customer.create({ name: 'Raj Foods & Restaurant', channel: 'retail', tier: 'wholesale', address: 'New Delhi', phone: '+91-9999888877', email: 'raj@rajfoods.com', active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString()}),
    Customer.create({ name: 'Sharma Family', channel: 'direct', tier: 'premium', address: 'Noida', phone: '+91-9888777666', email: 'sharma.family@gmail.com', active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString()}),
    Customer.create({ name: 'Organic Store Chain', channel: 'distributor', tier: 'wholesale', address: 'Bangalore', phone: '+91-9777666555', email: 'orders@organicstore.com', active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString()})
  ]);

  // --- Material Intake ---
  await MaterialIntakeLog.create({ 
    supplier_id: suppliers[0].id, 
    raw_material_id: rawMaterials[0].id, 
    quantity: 50, 
    cost_per_unit: 450.00, 
    lot_number: 'CB-2024-001', 
    intake_date: new Date(2024, 11, 20).toISOString(), 
    remaining_quantity: 45,
    total_cost: 22500,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  await MaterialIntakeLog.create({ 
    supplier_id: suppliers[1].id, 
    raw_material_id: rawMaterials[1].id, 
    quantity: 30, 
    cost_per_unit: 480.00, 
    lot_number: 'SB-2024-002', 
    intake_date: new Date(2024, 11, 21).toISOString(), 
    remaining_quantity: 30,
    total_cost: 14400,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  await MaterialIntakeLog.create({ 
    supplier_id: suppliers[2].id, 
    raw_material_id: rawMaterials[3].id, 
    quantity: 200, 
    cost_per_unit: 25.00, 
    lot_number: 'GJ-500-2024', 
    intake_date: new Date(2024, 11, 22).toISOString(), 
    remaining_quantity: 180,
    total_cost: 5000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // --- Production ---
  await ProductionBatch.create({ batch_number: 'GR-20241220-001', production_date: new Date(2024, 11, 20).toISOString(), output_litres: 25.5, remaining_quantity: 25.5, status: 'completed', quality_grade: 'A', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  await ProductionBatch.create({ batch_number: 'GR-20241221-002', production_date: new Date(2024, 11, 21).toISOString(), output_litres: 18.2, remaining_quantity: 18.2, status: 'completed', quality_grade: 'B', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  await ProductionBatch.create({ batch_number: 'GR-20241222-003', production_date: new Date(2024, 11, 22).toISOString(), output_litres: 32.1, remaining_quantity: 32.1, status: 'completed', quality_grade: 'A', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  await ProductionBatch.create({ batch_number: 'GR-20250714-701', production_date: new Date(2025, 6, 14).toISOString(), output_litres: 0, remaining_quantity: 0, status: 'active', quality_grade: 'A', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  
  // --- Orders ---
  await Order.create({ order_number: 'GR-2024-0001', customer_id: customers[0].id, order_date: new Date(2024, 11, 20).toISOString(), total_amount: 5830, status: 'confirmed', payment_status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  await Order.create({ order_number: 'GR-2024-0002', customer_id: customers[1].id, order_date: new Date(2024, 11, 21).toISOString(), total_amount: 1320, status: 'completed', payment_status: 'paid', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  await Order.create({ order_number: 'GR-2024-0003', customer_id: customers[2].id, order_date: new Date(2024, 11, 22).toISOString(), total_amount: 13062.5, status: 'processing', payment_status: 'partial', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  
  // --- Financials ---
  await FinancialLedger.create({ 
    transaction_date: new Date(2024, 11, 20).toISOString(), 
    transaction_type: 'adjustment', 
    reference_id: 'MAT-001', 
    reference_type: 'order', 
    customer_id: customers[0].id, 
    amount: -22500, 
    description: 'Purchase of cream butter - 50kg', 
    created_by: 'system', 
    created_at: new Date().toISOString(), 
    updated_at: new Date().toISOString() 
  });
  await FinancialLedger.create({ 
    transaction_date: new Date(2024, 11, 21).toISOString(), 
    transaction_type: 'payment', 
    reference_id: 'GR-2024-0002', 
    reference_type: 'order', 
    customer_id: customers[1].id, 
    amount: 1320, 
    description: 'Payment received for order GR-2024-0002', 
    created_by: 'system', 
    created_at: new Date().toISOString(), 
    updated_at: new Date().toISOString() 
  });
  await FinancialLedger.create({ 
    transaction_date: new Date(2024, 11, 22).toISOString(), 
    transaction_type: 'adjustment', 
    reference_id: 'PKG-001', 
    reference_type: 'order', 
    customer_id: customers[2].id, 
    amount: -5000, 
    description: 'Glass jars and packaging materials', 
    created_by: 'system', 
    created_at: new Date().toISOString(), 
    updated_at: new Date().toISOString() 
  });

  localStorage.setItem('db_seeded_v3', 'true');
  console.log('Comprehensive prototype seeding complete.');
}; 