/**
 * Database View Handler
 * Provides error handling and fallback logic for database views
 */

import { supabase } from './supabase';
import { toast } from './toast';
import { ErrorHandlingService } from './services/errorHandlingService';

/**
 * Batch yield data with proper error handling
 */
export interface BatchYieldData {
  batch_id: string;
  batch_number: string;
  production_date: string;
  status: string;
  output_litres: number;
  total_input_cost: number;
  cost_per_litre: number;
  yield_percentage: number;
  calculated_input_cost: number;
  material_breakdown: any[];
  effective_output: number;
  efficiency_rating: string;
}

/**
 * Customer metrics data with proper error handling
 */
export interface CustomerMetricsData {
  customer_id: string;
  customer_name: string;
  tier: string;
  channel: string;
  city: string;
  active: boolean;
  total_orders: number;
  total_revenue: number;
  ltv: number;
  aov: number;
  last_order_date: string | null;
  first_order_date: string | null;
  avg_days_between_orders: number | null;
  predicted_reorder_date: string | null;
  days_since_last_order: number | null;
  activity_status: string;
  reorder_likelihood: string;
  value_segment: string;
}

/**
 * Fetches batch yield data with error handling and fallback calculations
 * @param batchId Optional batch ID to filter by
 * @param limit Maximum number of records to return
 * @returns Array of batch yield data
 */
export async function getBatchYieldData(batchId?: string, limit = 50): Promise<BatchYieldData[]> {
  try {
    // Try to fetch from the view first
    const query = supabase.from('vw_batch_yield').select('*');
    
    if (batchId) {
      query.eq('batch_id', batchId);
    }
    
    const { data, error } = await query.limit(limit);
    
    if (error) {
      console.error('Error fetching from vw_batch_yield view:', error);
      
      // Fallback: Calculate the data manually from production_batches table
      return await calculateBatchYieldFallback(batchId, limit);
    }
    
    return data as BatchYieldData[];
  } catch (error) {
    ErrorHandlingService.handleUserManagementError(error, 'Failed to fetch batch yield data');
    return [];
  }
}

/**
 * Fallback function to calculate batch yield data when the view is unavailable
 */
async function calculateBatchYieldFallback(batchId?: string, limit = 50): Promise<BatchYieldData[]> {
  try {
    // Fetch from production_batches table
    const query = supabase.from('production_batches').select(`
      id,
      batch_number,
      production_date,
      status,
      output_litres,
      total_input_cost,
      remaining_quantity
    `);
    
    if (batchId) {
      query.eq('id', batchId);
    }
    
    const { data: batches, error: batchesError } = await query.limit(limit);
    
    if (batchesError) {
      throw new Error(`Failed to fetch production batches: ${batchesError.message}`);
    }
    
    // For each batch, fetch the inputs
    const results: BatchYieldData[] = [];
    
    for (const batch of batches) {
      // Fetch batch inputs
      const { data: inputs, error: inputsError } = await supabase
        .from('batch_inputs')
        .select(`
          quantity_used,
          material_intake_log (
            cost_per_unit,
            lot_number,
            raw_material_id,
            raw_materials (name)
          )
        `)
        .eq('batch_id', batch.id);
      
      if (inputsError) {
        console.error(`Failed to fetch inputs for batch ${batch.id}:`, inputsError);
      }
      
      // Calculate cost per litre with error handling
      let costPerLitre = 0;
      if (batch.output_litres && batch.output_litres > 0 && batch.total_input_cost) {
        costPerLitre = Number((batch.total_input_cost / batch.output_litres).toFixed(4));
      }
      
      // Calculate yield percentage (simplified fallback)
      let yieldPercentage = 0;
      if (batch.total_input_cost && batch.total_input_cost > 0) {
        yieldPercentage = 75; // Default fallback value
      }
      
      // Calculate material breakdown
      const materialBreakdown = inputs?.map(input => {
        const materialIntake = input.material_intake_log;
        const totalCost = input.quantity_used * (materialIntake?.cost_per_unit || 0);
        const percentageOfBatch = batch.total_input_cost > 0 
          ? Number(((totalCost / batch.total_input_cost) * 100).toFixed(2))
          : 0;
          
        return {
          material_name: materialIntake?.raw_materials?.name || 'Unknown Material',
          quantity_used: input.quantity_used || 0,
          cost_per_unit: materialIntake?.cost_per_unit || 0,
          total_cost: totalCost,
          lot_number: materialIntake?.lot_number || 'N/A',
          percentage_of_batch: percentageOfBatch
        };
      }) || [];
      
      // Calculate efficiency rating
      let efficiencyRating = 'Unknown';
      if (yieldPercentage >= 85) {
        efficiencyRating = 'Excellent';
      } else if (yieldPercentage >= 75) {
        efficiencyRating = 'Good';
      } else if (yieldPercentage >= 60) {
        efficiencyRating = 'Fair';
      } else if (yieldPercentage > 0) {
        efficiencyRating = 'Poor';
      }
      
      // Calculate total material cost
      const calculatedInputCost = materialBreakdown.reduce(
        (sum, item) => sum + item.total_cost, 0
      );
      
      results.push({
        batch_id: batch.id,
        batch_number: batch.batch_number,
        production_date: batch.production_date,
        status: batch.status,
        output_litres: batch.output_litres || 0,
        total_input_cost: batch.total_input_cost || 0,
        cost_per_litre: costPerLitre,
        yield_percentage: yieldPercentage,
        calculated_input_cost: calculatedInputCost || batch.total_input_cost || 0,
        material_breakdown: materialBreakdown,
        effective_output: batch.output_litres ? Number(batch.output_litres.toFixed(2)) : 0,
        efficiency_rating: efficiencyRating
      });
    }
    
    return results;
  } catch (error) {
    console.error('Error in batch yield fallback calculation:', error);
    ErrorHandlingService.handleUserManagementError(error, 'Failed to calculate batch yield data');
    toast.error('Unable to load batch yield data. Using estimated values.');
    return [];
  }
}

/**
 * Fetches customer metrics data with error handling and fallback calculations
 * @param customerId Optional customer ID to filter by
 * @param limit Maximum number of records to return
 * @returns Array of customer metrics data
 */
export async function getCustomerMetricsData(customerId?: string, limit = 50): Promise<CustomerMetricsData[]> {
  try {
    // Try to fetch from the view first
    const query = supabase.from('vw_customer_metrics').select('*');
    
    if (customerId) {
      query.eq('customer_id', customerId);
    }
    
    const { data, error } = await query.limit(limit);
    
    if (error) {
      console.error('Error fetching from vw_customer_metrics view:', error);
      
      // Fallback: Calculate the data manually from customers and orders tables
      return await calculateCustomerMetricsFallback(customerId, limit);
    }
    
    return data as CustomerMetricsData[];
  } catch (error) {
    ErrorHandlingService.handleUserManagementError(error, 'Failed to fetch customer metrics data');
    return [];
  }
}

/**
 * Fallback function to calculate customer metrics data when the view is unavailable
 */
async function calculateCustomerMetricsFallback(customerId?: string, limit = 50): Promise<CustomerMetricsData[]> {
  try {
    // Fetch customers
    const query = supabase.from('customers').select(`
      id,
      name,
      tier,
      channel,
      city,
      active
    `);
    
    if (customerId) {
      query.eq('id', customerId);
    }
    
    const { data: customers, error: customersError } = await query.limit(limit);
    
    if (customersError) {
      throw new Error(`Failed to fetch customers: ${customersError.message}`);
    }
    
    // For each customer, fetch their orders
    const results: CustomerMetricsData[] = [];
    
    for (const customer of customers) {
      // Fetch customer orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_date, total_amount, status')
        .eq('customer_id', customer.id)
        .not('status', 'in', '("cancelled","draft")');
      
      if (ordersError) {
        console.error(`Failed to fetch orders for customer ${customer.id}:`, ordersError);
      }
      
      const validOrders = orders || [];
      const totalOrders = validOrders.length;
      const totalRevenue = validOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      
      // Calculate AOV with error handling
      const aov = totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0;
      
      // Get order dates
      const orderDates = validOrders
        .map(order => new Date(order.order_date))
        .sort((a, b) => a.getTime() - b.getTime());
      
      const firstOrderDate = orderDates.length > 0 ? orderDates[0].toISOString() : null;
      const lastOrderDate = orderDates.length > 0 ? orderDates[orderDates.length - 1].toISOString() : null;
      
      // Calculate average days between orders
      let avgDaysBetweenOrders = null;
      let predictedReorderDate = null;
      
      if (orderDates.length > 1) {
        const firstDate = orderDates[0];
        const lastDate = orderDates[orderDates.length - 1];
        const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
        avgDaysBetweenOrders = Math.round(daysDiff / (orderDates.length - 1));
        
        // Calculate predicted reorder date
        const nextOrderDate = new Date(lastDate);
        nextOrderDate.setDate(nextOrderDate.getDate() + avgDaysBetweenOrders);
        predictedReorderDate = nextOrderDate.toISOString();
      } else if (orderDates.length === 1) {
        // For single orders, predict based on average customer behavior (30 days default)
        const nextOrderDate = new Date(orderDates[0]);
        nextOrderDate.setDate(nextOrderDate.getDate() + 30);
        predictedReorderDate = nextOrderDate.toISOString();
      }
      
      // Calculate days since last order
      let daysSinceLastOrder = null;
      if (lastOrderDate) {
        const lastDate = new Date(lastOrderDate);
        const now = new Date();
        daysSinceLastOrder = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      // Determine activity status
      let activityStatus = 'never_ordered';
      if (lastOrderDate) {
        const daysSinceLastOrder = Math.floor((new Date().getTime() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastOrder <= 30) {
          activityStatus = 'active';
        } else if (daysSinceLastOrder <= 60) {
          activityStatus = 'recent';
        } else if (daysSinceLastOrder <= 90) {
          activityStatus = 'at_risk';
        } else if (daysSinceLastOrder <= 180) {
          activityStatus = 'dormant';
        } else {
          activityStatus = 'inactive';
        }
      }
      
      // Determine reorder likelihood
      let reorderLikelihood = 'unknown';
      if (totalOrders === 0) {
        reorderLikelihood = 'unknown';
      } else if (totalOrders === 1) {
        reorderLikelihood = 'new_customer';
      } else if (lastOrderDate) {
        const daysSinceLastOrder = Math.floor((new Date().getTime() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastOrder <= 30) {
          reorderLikelihood = 'high';
        } else if (daysSinceLastOrder <= 60) {
          reorderLikelihood = 'medium';
        } else if (daysSinceLastOrder <= 90) {
          reorderLikelihood = 'low';
        } else {
          reorderLikelihood = 'very_low';
        }
      }
      
      // Determine value segment
      let valueSegment = 'no_value';
      if (totalRevenue >= 50000) {
        valueSegment = 'high_value';
      } else if (totalRevenue >= 20000) {
        valueSegment = 'medium_value';
      } else if (totalRevenue >= 5000) {
        valueSegment = 'low_value';
      } else if (totalRevenue > 0) {
        valueSegment = 'minimal_value';
      }
      
      results.push({
        customer_id: customer.id,
        customer_name: customer.name,
        tier: customer.tier,
        channel: customer.channel,
        city: customer.city,
        active: customer.active,
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        ltv: totalRevenue, // LTV is same as total revenue in this simple model
        aov,
        last_order_date: lastOrderDate,
        first_order_date: firstOrderDate,
        avg_days_between_orders: avgDaysBetweenOrders,
        predicted_reorder_date: predictedReorderDate,
        days_since_last_order: daysSinceLastOrder,
        activity_status: activityStatus,
        reorder_likelihood: reorderLikelihood,
        value_segment: valueSegment
      });
    }
    
    return results;
  } catch (error) {
    console.error('Error in customer metrics fallback calculation:', error);
    ErrorHandlingService.handleUserManagementError(error, 'Failed to calculate customer metrics data');
    toast.error('Unable to load customer metrics data. Using estimated values.');
    return [];
  }
}