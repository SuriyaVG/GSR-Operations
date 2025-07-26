import { useState, useEffect } from "react";
import MaterialIntakeService from "@/services/MaterialIntakeService";
import { OrderService } from "@/lib/orderService";
// TODO: Import FinancialLedgerService when available
import { Button } from "@/Components/ui/button";
import { 
  Package, 
  Factory, 
  ShoppingCart, 
  Users
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { getBatchYieldData, getCustomerMetricsData } from "@/lib/database-view-handler";
import { PageSkeleton } from "@/Components/ui/skeleton";

import StatsCard from "../Components/dashboard/StatsCard";
import RecentActivity from "../Components/dashboard/RecentActivity";
import ProductionMetrics from "../Components/dashboard/ProductionMetrics";
import FinancialOverview from "../Components/dashboard/FinancialOverview";

export default function Dashboard() {
  console.log('Dashboard mounted');
  const [stats, setStats] = useState({
    totalMaterials: 0,
    activeBatches: 0,
    pendingOrders: 0,
    totalCustomers: 0,
    monthlyRevenue: 0,
    avgYield: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching materials...');
      const materialsPromise = MaterialIntakeService.list('-created_at', 50);
      console.log('Fetching batchYieldData...');
      const batchYieldDataPromise = getBatchYieldData(undefined, 20);
      console.log('Fetching orders...');
      const ordersPromise = OrderService.list('-created_at', 20);
      console.log('Fetching customerMetrics...');
      const customerMetricsPromise = getCustomerMetricsData(undefined, 20);
      console.log('Fetching ledger...');
      // TODO: Use FinancialLedgerService.list('-transaction_date', 50) when available
      const ledgerPromise = Promise.resolve([]);

      const [materials, batchYieldData, orders, customerMetrics, ledger] = await Promise.all([
        materialsPromise,
        batchYieldDataPromise,
        ordersPromise,
        customerMetricsPromise,
        ledgerPromise
      ]);
      console.log('All dashboard data fetched.');
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const monthlyRevenue = ledger
        .filter(entry => {
          const entryDate = new Date(entry.transaction_date);
          return entry.transaction_type === 'payment' && 
                 entryDate.getMonth() === currentMonth && 
                 entryDate.getFullYear() === currentYear;
        })
        .reduce((sum, entry) => sum + (entry.amount || 0), 0);

      // Convert batch yield data to the format expected by components
      const batches = batchYieldData.map(batch => ({
        id: batch.batch_id,
        batch_number: batch.batch_number,
        status: batch.status,
        output_litres: batch.output_litres,
        yield_percentage: batch.yield_percentage
      }));

      const activeBatches = batches.filter(batch => 
        batch.status === 'active'
      ).length;

      const pendingOrders = orders.filter(order => 
        order.status === 'draft' || order.status === 'confirmed'
      ).length;

      const avgYield = batches.length > 0 
        ? batches.reduce((sum, batch) => sum + (batch.output_litres || 0), 0) / batches.length 
        : 0;

      setStats({
        totalMaterials: materials.reduce((sum, m) => sum + (m.remaining_quantity || 0), 0),
        activeBatches,
        pendingOrders,
        totalCustomers: customerMetrics.length,
        monthlyRevenue,
        avgYield
      });

      const activities = [
        ...materials.slice(0, 3).map(m => ({
          type: 'material',
          title: 'Material received',
          description: `${m.quantity} kg of raw material`,
          time: m.created_at,
          icon: Package
        })),
        ...batches.slice(0, 3).map(b => ({
          type: 'production',
          title: 'Batch created',
          description: `Batch ${b.batch_number} - ${b.output_litres}L`,
          time: b.created_at,
          icon: Factory
        })),
        ...orders.slice(0, 3).map(o => ({
          type: 'order',
          title: 'New order',
          description: `Order #${o.order_number} - ₹${o.total_amount}`,
          time: o.created_at,
          icon: ShoppingCart
        }))
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

      setRecentActivity(activities);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
      console.log('Dashboard loading set to false');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 min-h-screen">
        <PageSkeleton variant="dashboard" />
      </div>
    );
  }
  console.log('Dashboard main content rendered');
  return (
    <div className="p-6 space-y-8 bg-gradient-to-br from-amber-50 to-orange-50 min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to GheeRoots
            </h1>
            <p className="text-lg text-amber-700 font-medium">
              {format(new Date(), "EEEE, MMMM do, yyyy")}
            </p>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl("MaterialIntake")}> 
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg py-3 px-6 text-lg rounded-xl">
                <Package className="w-6 h-6 mr-3" />
                Add Material
              </Button>
            </Link>
            <Link to={createPageUrl("Production")}> 
              <Button className="bg-white border border-amber-200 text-amber-700 rounded-xl shadow-sm hover:bg-amber-50 transition-all py-3 px-6 text-lg">
                <Factory className="w-6 h-6 mr-3" />
                New Batch
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <StatsCard
            title="Material Stock"
            value={`${stats.totalMaterials.toFixed(1)} kg`}
            icon={Package}
            color="blue"
            trend="Available inventory"
            loading={false}
          />
          <StatsCard
            title="Active Batches"
            value={stats.activeBatches}
            icon={Factory}
            color="green"
            trend="In production"
            loading={false}
          />
          <StatsCard
            title="Pending Orders"
            value={stats.pendingOrders}
            icon={ShoppingCart}
            color="orange"
            trend="Awaiting fulfillment"
            loading={false}
          />
          <StatsCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon={Users}
            color="purple"
            trend="Registered customers"
            loading={false}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-10">
          <FinancialOverview monthlyRevenue={stats.monthlyRevenue} loading={false} />
          <ProductionMetrics avgYield={stats.avgYield} loading={false} />
        </div>

        <RecentActivity activities={recentActivity} loading={false} />
    </div>
  );
} 