import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Skeleton } from '@/Components/ui/skeleton';
import { Badge } from '@/Components/ui/badge';
import { Users, TrendingUp, DollarSign, Star, HeartHandshake, Sparkles, Target } from 'lucide-react';

export default function CustomerSegments({ customers, orders, loading }) {
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i} className="bg-white/70 backdrop-blur-sm border-amber-200">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Segment customers by revenue
  const customerAnalysis = customers.map(customer => {
    const customerOrders = orders.filter(order => order.customer_id === customer.id);
    const totalRevenue = customerOrders.reduce((sum, order) => sum + (order.net_amount || 0), 0);
    const orderCount = customerOrders.length;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
    
    // Determine segment
    let segment = 'New';
    if (totalRevenue > 50000) segment = 'VIP';
    else if (totalRevenue > 20000) segment = 'High Value';
    else if (totalRevenue > 5000) segment = 'Regular';
    else if (orderCount > 0) segment = 'Active';
    
    return {
      ...customer,
      totalRevenue,
      orderCount,
      avgOrderValue,
      segment
    };
  });

  // Group by segments
  const segments = {
    'VIP': customerAnalysis.filter(c => c.segment === 'VIP'),
    'High Value': customerAnalysis.filter(c => c.segment === 'High Value'),
    'Regular': customerAnalysis.filter(c => c.segment === 'Regular'),
    'Active': customerAnalysis.filter(c => c.segment === 'Active'),
    'New': customerAnalysis.filter(c => c.segment === 'New')
  };

  const segmentColors = {
    'VIP': 'from-purple-50 to-violet-50 border-purple-200 text-purple-800',
    'High Value': 'from-blue-50 to-cyan-50 border-blue-200 text-blue-800',
    'Regular': 'from-green-50 to-emerald-50 border-green-200 text-green-800',
    'Active': 'from-yellow-50 to-amber-50 border-yellow-200 text-yellow-800',
    'New': 'from-gray-50 to-slate-50 border-gray-200 text-gray-800'
  };

  const segmentIcons = {
    'VIP': Star,
    'High Value': DollarSign,
    'Regular': TrendingUp,
    'Active': Users,
    'New': Sparkles
  };

  return (
    <div className="space-y-6">
      {/* Segment Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.entries(segments).map(([segmentName, segmentCustomers]) => {
          const Icon = segmentIcons[segmentName];
          const totalRevenue = segmentCustomers.reduce((sum, c) => sum + c.totalRevenue, 0);
          
          return (
            <Card key={segmentName} className="bg-white/70 backdrop-blur-sm border-amber-200 text-center">
              <CardContent className="p-4">
                <div className="flex items-center justify-center mb-2">
                  <Icon className="w-6 h-6 text-amber-600" />
                </div>
                <p className="text-xl font-bold text-gray-900">{segmentCustomers.length}</p>
                <p className="text-sm text-gray-600 mb-1">{segmentName} customers</p>
                <p className="text-xs font-medium text-green-600">
                  Total: ₹{totalRevenue.toLocaleString('en-IN', { notation: 'compact' })}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* New Customers List */}
      <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              New Customers ({segments['New'].length})
            </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {segments['New'].length > 0 ? segments['New'].slice(0, 5).map(customer => (
              <div key={customer.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{customer.name}</p>
                  <p className="text-sm text-gray-600">{customer.customer_type} • {customer.orderCount} orders</p>
                </div>
                <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ₹{customer.totalRevenue.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-gray-500">Avg: ₹{customer.avgOrderValue.toFixed(0)}</p>
                </div>
              </div>
            )) : <p className="text-gray-500 text-center py-4">No new customers.</p>}
          </div>
        </CardContent>
      </Card>


      {/* Segment Insights */}
      <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
        <CardHeader>
          <CardTitle>Segment Insights & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border bg-gradient-to-r ${segmentColors['VIP']}`}>
              <h4 className="font-semibold mb-2 flex items-center gap-2"><Star className="w-4 h-4" /> VIP Customers</h4>
              <p className="text-sm">Your highest value customers. Focus on retention with exclusive offers and premium service.</p>
            </div>
            
            <div className={`p-4 rounded-lg border bg-gradient-to-r ${segmentColors['High Value']}`}>
              <h4 className="font-semibold mb-2 flex items-center gap-2"><Target className="w-4 h-4" />High Value Growth</h4>
              <p className="text-sm">Target these customers for upselling to reach VIP status with larger order incentives.</p>
            </div>
            
            <div className={`p-4 rounded-lg border bg-gradient-to-r ${segmentColors['Regular']}`}>
              <h4 className="font-semibold mb-2 flex items-center gap-2"><HeartHandshake className="w-4 h-4" /> Regular Engagement</h4>
              <p className="text-sm">Keep regular customers engaged with consistent quality and loyalty programs.</p>
            </div>
            
            <div className={`p-4 rounded-lg border bg-gradient-to-r ${segmentColors['Active']}`}>
              <h4 className="font-semibold mb-2 flex items-center gap-2"><Users className="w-4 h-4" /> Active Nurturing</h4>
              <p className="text-sm">Recent customers who need nurturing to become regular buyers through follow-ups.</p>
            </div>
            
            <div className={`p-4 rounded-lg border bg-gradient-to-r ${segmentColors['New']}`}>
              <h4 className="font-semibold mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4" /> New Customer Focus</h4>
              <p className="text-sm">First-time buyers need excellent onboarding experience to convert to active customers.</p>
            </div>
            
            <div className={`p-4 rounded-lg border bg-gradient-to-r from-orange-50 to-red-50 border-orange-200 text-orange-800`}>
              <h4 className="font-semibold mb-2 flex items-center gap-2"><Target className="w-4 h-4" /> Win-Back Campaign</h4>
              <p className="text-sm">Identify inactive customers and create targeted campaigns to re-engage them.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 