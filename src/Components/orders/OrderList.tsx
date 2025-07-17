import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Skeleton } from '@/Components/ui/skeleton';
import { format } from 'date-fns';
import { Eye, MoreHorizontal, CheckCircle, Clock, Truck, Package } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  confirmed: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
  in_production: { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Package },
  ready: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  dispatched: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Truck },
  delivered: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
  cancelled: { color: 'bg-red-100 text-red-800 border-red-200', icon: Clock }
};

const paymentStatusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-800' },
  partial: { color: 'bg-orange-100 text-orange-800' },
  paid: { color: 'bg-green-100 text-green-800' },
  overdue: { color: 'bg-red-100 text-red-800' }
};

export default function OrderList({ orders, customers, loading, onRefresh }) {
  if (loading) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
        <CardHeader>
          <CardTitle>Customer Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {Array(8).fill(0).map((_, i) => (
                  <TableHead key={i}><Skeleton className="h-4 w-20" /></TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  {Array(8).fill(0).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  };

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-gray-900">Customer Orders</CardTitle>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-amber-50">
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Order Date</TableHead>
              <TableHead>Delivery Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No orders found. Create your first order to get started.
                </TableCell>
              </TableRow>
            ) : (
              orders.map(order => {
                const statusInfo = statusConfig[order.status] || statusConfig.pending;
                const paymentInfo = paymentStatusConfig[order.payment_status] || paymentStatusConfig.pending;
                const StatusIcon = statusInfo.icon;
                
                return (
                  <TableRow key={order.id} className="hover:bg-amber-50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                        {order.order_number}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{getCustomerName(order.customer_id)}</p>
                        <p className="text-sm text-gray-500">
                          {customers.find(c => c.id === order.customer_id)?.customer_type || ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(order.order_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      {order.expected_delivery 
                        ? format(new Date(order.expected_delivery), 'MMM d, yyyy')
                        : 'Not set'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusInfo.color} border flex items-center gap-1 w-fit`}>
                        <StatusIcon className="w-3 h-3" />
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${paymentInfo.color} border`}>
                        {order.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{order.net_amount?.toLocaleString('en-IN') || '0'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Edit Order
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Update Status
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Print Invoice
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
} 