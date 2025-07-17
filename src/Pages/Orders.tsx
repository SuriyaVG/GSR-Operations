import { useState, useEffect } from "react";
import { Order, OrderItem, Customer, ProductionBatch } from "@/Entities/all";
import { Button } from "@/Components/ui/button";
import { Card, CardContent } from "@/Components/ui/card";
import { Plus, ShoppingCart, Search, Filter, Package } from "lucide-react";
import { Input } from "@/Components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/Components/ui/tabs";

import OrderForm from "../Components/orders/OrderForm";
import OrderList from "../Components/orders/OrderList";
import OrderSummary from "../Components/orders/OrderSummary";
import OrderMetrics from "../Components/orders/OrderMetrics";

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ordersData, customersData, batchesData] = await Promise.all([
        Order.list('-created_date', 50),
        Customer.list(),
        ProductionBatch.filter({ status: 'completed' })
      ]);
      
      setOrders(ordersData);
      setCustomers(customersData);
      setBatches(batchesData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleSaveOrder = async (orderData: any) => {
    try {
      const { items, ...order } = orderData;
      
      // Generate order number
      const orderNumber = `GR-${new Date().getFullYear()}-${String(orders.length + 1).padStart(4, '0')}`;
      
      // Create order
      const newOrder = await Order.create({
        ...order,
        order_number: orderNumber
      });

      // Create order items
      for (const item of items) {
        await OrderItem.create({
          ...item,
          order_id: newOrder.id
        });
      }

      setShowForm(false);
      loadData();
    } catch (error) {
      console.error("Error saving order:", error);
    }
  };

  const filteredOrders = orders.filter(order => {
    const customer = customers.find(c => c.id === order.customer_id);
    const matchesSearch = 
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-amber-50 to-orange-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
            <p className="text-amber-700 mt-1">Track customer orders and delivery pipeline</p>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/70 backdrop-blur-sm border border-amber-200">
            <TabsTrigger value="orders" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
              <ShoppingCart className="w-4 h-4 mr-2" />
              All Orders
            </TabsTrigger>
            <TabsTrigger value="summary" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
              <Package className="w-4 h-4 mr-2" />
              Order Summary
            </TabsTrigger>
            <TabsTrigger value="metrics" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            {/* Search and Filter */}
            <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by order number or customer name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-amber-200 focus:border-amber-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-amber-200 rounded-md focus:border-amber-400 bg-white"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="in_production">In Production</option>
                      <option value="ready">Ready</option>
                      <option value="dispatched">Dispatched</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <OrderList 
              orders={filteredOrders}
              customers={customers}
              loading={isLoading}
              onRefresh={loadData}
            />
          </TabsContent>

          <TabsContent value="summary">
            <OrderSummary orders={orders} customers={customers} loading={isLoading} />
          </TabsContent>

          <TabsContent value="metrics">
            <OrderMetrics orders={orders} customers={customers} loading={isLoading} />
          </TabsContent>
        </Tabs>

        {/* Form Modal */}
        {showForm && (
          <OrderForm
            customers={customers}
            batches={batches}
            onSave={handleSaveOrder}
            onCancel={() => setShowForm(false)}
          />
        )}
      </div>
    </div>
  );
} 