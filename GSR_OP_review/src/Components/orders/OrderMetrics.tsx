import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Skeleton } from '@/Components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'];

export default function OrderMetrics({ orders, customers, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i} className="bg-white/70 backdrop-blur-sm border-amber-200"><CardHeader><Skeleton className="h-6 w-32" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const monthlyData = orders.reduce((acc, order) => {
    const month = format(new Date(order.order_date), 'MMM yy');
    let existing = acc.find(item => item.month === month);
    if (!existing) {
      existing = { month, orders: 0, revenue: 0 };
      acc.push(existing);
    }
    existing.orders += 1;
    existing.revenue += order.net_amount || 0;
    return acc;
  }, []);
  
  const statusData = Object.entries(orders.reduce((acc, order) => {
    const status = order.status.replace('_', ' ');
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {})).map(([name, value]) => ({ name, value }));

  const paymentStatusData = Object.entries(orders.reduce((acc, order) => {
    acc[order.payment_status] = (acc[order.payment_status] || 0) + 1;
    return acc;
  }, {})).map(([name, value]) => ({ name, value }));
  
  const revenueByCustomerType = customers.map(customer => {
    const revenue = orders.filter(o => o.customer_id === customer.id).reduce((sum, o) => sum + (o.net_amount || 0), 0);
    return { type: customer.customer_type, revenue };
  }).reduce((acc, { type, revenue }) => {
    let existing = acc.find(item => item.type === type);
    if (!existing) {
      existing = { type, revenue: 0 };
      acc.push(existing);
    }
    existing.revenue += revenue;
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/70 backdrop-blur-sm border-amber-200"><CardHeader><CardTitle>Monthly Order Trends</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Bar dataKey="orders" fill="#f59e0b" /></BarChart></ResponsiveContainer></CardContent></Card>
        <Card className="bg-white/70 backdrop-blur-sm border-amber-200"><CardHeader><CardTitle>Order Status Distribution</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={statusData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} >{statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card>
        <Card className="bg-white/70 backdrop-blur-sm border-amber-200"><CardHeader><CardTitle>Payment Status Distribution</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={paymentStatusData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} >{paymentStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card>
        <Card className="bg-white/70 backdrop-blur-sm border-amber-200"><CardHeader><CardTitle>Revenue by Customer Type</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={revenueByCustomerType}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="type" /><YAxis /><Tooltip /><Bar dataKey="revenue" fill="#10b981" /></BarChart></ResponsiveContainer></CardContent></Card>
      </div>
    </div>
  );
} 