import { useState, useEffect } from "react";
import { 
  MaterialIntakeLog, 
  ProductionBatch, 
  Order, 
  Customer,
  FinancialLedger 
} from "@/Entities/all";
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

import StatsCard from "../Components/dashboard/StatsCard";
import RecentActivity from "../Components/dashboard/RecentActivity";
import ProductionMetrics from "../Components/dashboard/ProductionMetrics";
import FinancialOverview from "../Components/dashboard/FinancialOverview";

export default function Dashboard() {
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
      const [materials, batches, orders, customers, ledger] = await Promise.all([
        MaterialIntakeLog.list('-created_date', 50),
        ProductionBatch.list('-created_date', 20),
        Order.list('-created_date', 20),
        Customer.list('-created_date', 20),
        FinancialLedger.list('-transaction_date', 50)
      ]);

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
        totalCustomers: customers.length,
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
    }
    setIsLoading(false);
  };

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
            loading={isLoading}
          />
          <StatsCard
            title="Active Batches"
            value={stats.activeBatches}
            icon={Factory}
            color="green"
            trend="In production"
            loading={isLoading}
          />
          <StatsCard
            title="Pending Orders"
            value={stats.pendingOrders}
            icon={ShoppingCart}
            color="orange"
            trend="Awaiting fulfillment"
            loading={isLoading}
          />
          <StatsCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon={Users}
            color="purple"
            trend="Registered customers"
            loading={isLoading}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-10">
          <FinancialOverview monthlyRevenue={stats.monthlyRevenue} loading={isLoading} />
          <ProductionMetrics avgYield={stats.avgYield} loading={isLoading} />
        </div>

        <RecentActivity activities={recentActivity} loading={isLoading} />
    </div>
  );
} 