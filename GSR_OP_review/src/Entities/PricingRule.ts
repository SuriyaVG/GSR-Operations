// src/Entities/PricingRule.ts
import { createEntity } from '@/lib/entity';

export interface PricingRule {
  id: string;
  customer_tier: 'premium' | 'wholesale' | 'standard';
  product_category: string;
  min_quantity: number;
  unit_price: number;
  margin_percentage: number;
  effective_from: string;
  effective_to?: string;
  created_at: string;
  updated_at: string;
}

export const PricingRule = createEntity<PricingRule>('pricing_rules');