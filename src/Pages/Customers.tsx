import { useState, useEffect } from "react";
import { Customer, Order } from "@/Entities/all";
import { Button } from "@/Components/ui/button";
import { Card, CardContent } from "@/Components/ui/card";
import { Users, Search, Filter, UserPlus } from "lucide-react";
import { Input } from "@/Components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/Components/ui/tabs";

import CustomerForm from "../Components/customers/CustomerForm";
import CustomerList from "../Components/customers/CustomerList";
import CustomerMetrics from "../Components/customers/CustomerMetrics";
import CustomerSegments from "../Components/customers/CustomerSegments";

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [customersData, ordersData] = await Promise.all([
        Customer.list('-created_date', 100),
        Order.list('-created_date', 200)
      ]);
      
      setCustomers(customersData);
      setOrders(ordersData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleSaveCustomer = async (customerData: any) => {
    try {
      await Customer.create(customerData);
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error("Error saving customer:", error);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm);
    const matchesType = typeFilter === "all" || customer.channel === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-amber-50 to-orange-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
            <p className="text-amber-700 mt-1">Manage relationships and track customer interactions</p>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>

        <Tabs defaultValue="customers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/70 backdrop-blur-sm border border-amber-200">
            <TabsTrigger value="customers" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
              <Users className="w-4 h-4 mr-2" />
              All Customers
            </TabsTrigger>
            <TabsTrigger value="segments" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
              <Filter className="w-4 h-4 mr-2" />
              Customer Segments
            </TabsTrigger>
            <TabsTrigger value="metrics" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
              <Users className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="space-y-6">
            {/* Search and Filter */}
            <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by name, email, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-amber-200 focus:border-amber-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select 
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="px-3 py-2 border border-amber-200 rounded-md focus:border-amber-400 bg-white"
                    >
                      <option value="all">All Types</option>
                      <option value="retail">Retail</option>
                      <option value="d2c">D2C</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="distributor">Distributor</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <CustomerList 
              customers={filteredCustomers}
              orders={orders}
              loading={isLoading}
              onRefresh={loadData}
            />
          </TabsContent>

          <TabsContent value="segments">
            <CustomerSegments customers={customers} orders={orders} loading={isLoading} />
          </TabsContent>

          <TabsContent value="metrics">
            <CustomerMetrics customers={customers} orders={orders} loading={isLoading} />
          </TabsContent>
        </Tabs>

        {/* Form Modal */}
        {showForm && (
          <CustomerForm
            onSave={handleSaveCustomer}
            onCancel={() => setShowForm(false)}
          />
        )}
      </div>
    </div>
  );
} 