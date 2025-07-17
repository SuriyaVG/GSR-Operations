import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Skeleton } from '@/Components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Factory, TrendingUp, Target, Clock } from 'lucide-react';

export default function ProductionMetrics({ batches, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i} className="bg-white/70 backdrop-blur-sm border-amber-200">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate metrics
  const totalProduction = batches.reduce((sum, batch) => sum + (batch.output_litres || 0), 0);
  const avgYield = batches.length > 0 
    ? batches.reduce((sum, batch) => sum + (batch.yield_percentage || 0), 0) / batches.length 
    : 0;
  const avgCostPerLitre = batches.length > 0
    ? batches.reduce((sum, batch) => sum + (batch.cost_per_litre || 0), 0) / batches.length
    : 0;
  const activeBatches = batches.filter(b => b.status === 'in_progress' || b.status === 'quality_check').length;

  // Prepare chart data
  const monthlyData = batches.reduce((acc, batch) => {
    const month = new Date(batch.production_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const existing = acc.find(item => item.month === month);
    if (existing) {
      existing.production += batch.output_litres || 0;
      existing.batches += 1;
    } else {
      acc.push({
        month,
        production: batch.output_litres || 0,
        batches: 1,
        avgYield: batch.yield_percentage || 0
      });
    }
    return acc;
  }, []).slice(-6);

  const yieldTrendData = batches.slice(-10).map((batch, index) => ({
    batch: `B${index + 1}`,
    yield: batch.yield_percentage || 0,
    cost: batch.cost_per_litre || 0
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 font-medium">Total Production</p>
                <p className="text-2xl font-bold text-gray-900">{totalProduction.toFixed(1)}L</p>
              </div>
              <Factory className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 font-medium">Average Yield</p>
                <p className="text-2xl font-bold text-gray-900">{avgYield.toFixed(1)}%</p>
              </div>
              <Target className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 font-medium">Avg Cost/Litre</p>
                <p className="text-2xl font-bold text-gray-900">₹{avgCostPerLitre.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 font-medium">Active Batches</p>
                <p className="text-2xl font-bold text-gray-900">{activeBatches}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
          <CardHeader>
            <CardTitle>Monthly Production</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="production" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
          <CardHeader>
            <CardTitle>Yield Trend (Last 10 Batches)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={yieldTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="batch" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="yield" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 