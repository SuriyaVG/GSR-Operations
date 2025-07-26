import { useState, useEffect } from "react";
import FinancialLedgerService from "@/services/FinancialLedgerService";
import { OrderService } from "@/lib/orderService";
import CustomerService from "@/services/CustomerService";
import SupplierService from "@/services/SupplierService";
import { Button } from "@/Components/ui/button";
import { Card, CardContent } from "@/Components/ui/card";
import { Plus, CreditCard, Search, Filter, IndianRupee } from "lucide-react";
import { Input } from "@/Components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/Components/ui/tabs";
import { PageSkeleton } from "@/Components/ui/skeleton";
import { toast } from '@/lib/toast';

import TransactionForm from "../Components/finance/TransactionForm";
import TransactionList from "../Components/finance/TransactionList";
import FinanceMetrics from "../Components/finance/FinanceMetrics";
import CashFlow from "../Components/finance/CashFlow";

export default function Finance() {
  const [transactions, setTransactions] = useState<FinancialLedgerService[]>([]);
  const [orders, setOrders] = useState<OrderService[]>([]);
  const [customers, setCustomers] = useState<CustomerService[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierService[]>([]);
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
      const [transactionsData, ordersData, customersData, suppliersData] = await Promise.all([
        FinancialLedgerService.list('-transaction_date', 100),
        OrderService.list(),
        CustomerService.list(),
        SupplierService.list()
      ]);
      
      setTransactions(transactionsData);
      setOrders(ordersData);
      setCustomers(customersData);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleSaveTransaction = async (transactionData: any) => {
    try {
      await FinancialLedgerService.create(transactionData);
      setShowForm(false);
      loadData();
      toast.success('Transaction recorded successfully!');
    } catch (error) {
      console.error("Error saving transaction:", error);
      const message = error instanceof Error ? error.message : 'Failed to record transaction';
      toast.error(message);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const customer = customers.find(c => c.id === transaction.customer_id);
    // FinancialLedger doesn't have supplier_id, only customer_id
    const supplier = null;
    
    const matchesSearch = 
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.reference_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || transaction.transaction_type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageSkeleton variant="list" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-amber-50 to-orange-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financial Management</h1>
            <p className="text-amber-700 mt-1">Track payments, expenses, and cash flow</p>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        </div>

        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/70 backdrop-blur-sm border border-amber-200">
            <TabsTrigger value="transactions" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
              <CreditCard className="w-4 h-4 mr-2" />
              All Transactions
            </TabsTrigger>
            <TabsTrigger value="cashflow" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
              <IndianRupee className="w-4 h-4 mr-2" />
              Cash Flow
            </TabsTrigger>
            <TabsTrigger value="metrics" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
              <CreditCard className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-6">
            {/* Search and Filter */}
            <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search transactions..."
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
                      <option value="payment">Payment</option>
                      <option value="expense">Expense</option>
                      <option value="credit_note">Credit Note</option>
                      <option value="invoice">Invoice</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <TransactionList 
              transactions={filteredTransactions}
              customers={customers}
              suppliers={suppliers}
              loading={isLoading}
              onRefresh={loadData}
            />
          </TabsContent>

          <TabsContent value="cashflow">
            <CashFlow transactions={transactions} loading={isLoading} />
          </TabsContent>

          <TabsContent value="metrics">
            <FinanceMetrics transactions={transactions} loading={isLoading} />
          </TabsContent>
        </Tabs>

        {/* Form Modal */}
        {showForm && (
          <TransactionForm
            customers={customers}
            suppliers={suppliers}
            orders={orders}
            onSave={handleSaveTransaction}
            onCancel={() => setShowForm(false)}
          />
        )}
      </div>
    </div>
  );
} 