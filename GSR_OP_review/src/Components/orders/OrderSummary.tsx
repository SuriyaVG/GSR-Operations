import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Skeleton } from '@/Components/ui/skeleton';
import { ShoppingCart, Clock, CheckCircle, Truck, AlertTriangle } from 'lucide-react';

export default function OrderSummary({ orders, customers, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i} className="bg-white/70 backdrop-blur-sm border-amber-200">
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  const paymentCounts = orders.reduce((acc, order) => {
    acc[order.payment_status] = (acc[order.payment_status] || 0) + 1;
    return acc;
  }, {});

  const totalRevenue = orders.reduce((sum, order) => sum + (order.net_amount || 0), 0);
  const pendingPayments = orders
    .filter(order => order.payment_status === 'pending' || order.payment_status === 'partial')
    .reduce((sum, order) => sum + (order.net_amount || 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
        <CardHeader>
          <CardTitle>Total Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
          <p className="text-sm text-gray-600">All time</p>
        </CardContent>
      </Card>
      <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
        <CardHeader>
          <CardTitle>Pending Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-orange-600">{statusCounts['pending'] || 0}</p>
          <p className="text-sm text-gray-600">Awaiting fulfillment</p>
        </CardContent>
      </Card>
      <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-700">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <p className="text-sm text-gray-600">Net revenue</p>
        </CardContent>
      </Card>
      <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
        <CardHeader>
          <CardTitle>Pending Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-red-700">₹{pendingPayments.toLocaleString('en-IN')}</p>
          <p className="text-sm text-gray-600">Unpaid orders</p>
        </CardContent>
      </Card>
    </div>
  );
} 