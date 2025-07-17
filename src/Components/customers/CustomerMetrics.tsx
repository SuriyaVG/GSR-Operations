import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Skeleton } from '@/Components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, CreditCard, Star } from 'lucide-react';

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'];

export default function CustomerMetrics({ customers, orders, loading }) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
      </div>
    );
  }

  const totalCustomers = customers.length;
  const activeCustomerIds = new Set(orders.map(o => o.customer_id));
  const activeCustomers = activeCustomerIds.size;
  const retentionRate = totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0;
  
  const totalRevenue = orders.reduce((sum, o) => sum + (o.net_amount || 0), 0);
  const avgCustomerValue = activeCustomers > 0 ? totalRevenue / activeCustomers : 0;
  
  const typeDistribution = [...activeCustomerIds].map(id => customers.find(c => c.id === id)?.customer_type).reduce((acc, type) => {
    if(type) acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const typeData = Object.entries(typeDistribution).map(([name, value]) => ({ name, value }));
  
  const tierRevenue = customers.reduce((acc, customer) => {
    const revenue = orders.filter(o => o.customer_id === customer.id).reduce((sum, o) => sum + (o.net_amount || 0), 0);
    const tier = customer.tier || 'standard';
    if (!acc[tier]) acc[tier] = 0;
    acc[tier] += revenue;
    return acc;
  }, {});

  const tierData = Object.entries(tierRevenue).map(([name, revenue]) => ({ name, revenue }));

  const topCustomers = customers
    .map(c => ({...c, revenue: orders.filter(o => o.customer_id === c.id).reduce((sum, o) => sum + (o.net_amount || 0), 0)}))
    .sort((a,b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-amber-700 font-medium">Total Customers</p><p className="text-2xl font-bold text-gray-900">{totalCustomers}</p></div><Users className="w-8 h-8 text-amber-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-amber-700 font-medium">Active Customers</p><p className="text-2xl font-bold text-gray-900">{activeCustomers}</p></div><TrendingUp className="w-8 h-8 text-green-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-amber-700 font-medium">Avg Customer Value</p><p className="text-2xl font-bold text-gray-900">₹{avgCustomerValue.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p></div><CreditCard className="w-8 h-8 text-blue-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-amber-700 font-medium">Retention Rate</p><p className="text-2xl font-bold text-gray-900">{retentionRate.toFixed(0)}%</p></div><Star className="w-8 h-8 text-purple-500" /></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle>Customer Type Distribution</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={typeData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} >{typeData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>Revenue by Customer Tier</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={tierData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} /><Bar dataKey="revenue" fill="#10b981" /></BarChart></ResponsiveContainer></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle>Top Customers by Revenue</CardTitle></CardHeader><CardContent className="space-y-4">{topCustomers.map((customer, index) => (<div key={customer.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg"><div><p className="font-medium text-gray-900">{customer.name}</p><p className="text-sm text-gray-600 capitalize">{customer.customer_type}</p></div><p className="text-lg font-bold text-gray-900">₹{customer.revenue.toLocaleString('en-IN')}</p></div>))}</CardContent></Card>
    </div>
  );
} 