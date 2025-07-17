import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Skeleton } from '@/Components/ui/skeleton';
import { format } from 'date-fns';
import { Eye, MoreHorizontal, Phone, Mail, MapPin } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';

const customerTypeColors = {
  retail: 'bg-blue-100 text-blue-800 border-blue-200',
  d2c: 'bg-green-100 text-green-800 border-green-200',
  restaurant: 'bg-purple-100 text-purple-800 border-purple-200',
  distributor: 'bg-orange-100 text-orange-800 border-orange-200'
};

const tierColors = {
  premium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  standard: 'bg-gray-100 text-gray-800 border-gray-200',
  wholesale: 'bg-indigo-100 text-indigo-800 border-indigo-200'
};

export default function CustomerList({ customers, orders, loading, onRefresh }) {
  if (loading) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
        <CardHeader>
          <CardTitle>Customer Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {Array(7).fill(0).map((_, i) => (
                  <TableHead key={i}><Skeleton className="h-4 w-20" /></TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  {Array(7).fill(0).map((_, j) => (
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

  const getCustomerStats = (customerId) => {
    const customerOrders = orders.filter(order => order.customer_id === customerId);
    const totalRevenue = customerOrders.reduce((sum, order) => sum + (order.net_amount || 0), 0);
    const lastOrderDate = customerOrders.length > 0 
      ? Math.max(...customerOrders.map(order => new Date(order.order_date).getTime()))
      : null;
    
    return {
      orderCount: customerOrders.length,
      totalRevenue,
      lastOrderDate: lastOrderDate ? new Date(lastOrderDate) : null
    };
  };

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-gray-900">Customer Directory</CardTitle>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-amber-50">
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Total Revenue</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No customers found. Add your first customer to get started.
                </TableCell>
              </TableRow>
            ) : (
              customers.map(customer => {
                const stats = getCustomerStats(customer.id);
                
                return (
                  <TableRow key={customer.id} className="hover:bg-amber-50 transition-colors">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                          <span className="font-medium">{customer.name}</span>
                        </div>
                        {stats.lastOrderDate && (
                          <p className="text-xs text-gray-500">
                            Last order: {format(stats.lastOrderDate, 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${customerTypeColors[customer.customer_type] || 'bg-gray-100'} border capitalize`}>
                        {customer.customer_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${tierColors[customer.tier] || 'bg-gray-100'} border capitalize`}>
                        {customer.tier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {customer.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <span className="truncate max-w-32">{customer.email}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span>{customer.city || 'Not specified'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">{stats.orderCount}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium text-green-600">
                        ₹{stats.totalRevenue.toLocaleString('en-IN')}
                      </span>
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
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Edit Customer
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            View Orders
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Contact Customer
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