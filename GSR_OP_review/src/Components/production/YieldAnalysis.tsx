import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Skeleton } from '@/Components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Badge } from '@/Components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function YieldAnalysis({ batches, materials, rawMaterials, loading }) {
  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group batches by material type and calculate yields
  const materialYields = rawMaterials.map(rawMaterial => {
    const relevantBatches = batches.filter(batch => {
      // This would need to be enhanced to properly link batches to materials
      return batch.yield_percentage > 0;
    });

    const avgYield = relevantBatches.length > 0
      ? relevantBatches.reduce((sum, batch) => sum + batch.yield_percentage, 0) / relevantBatches.length
      : 0;

    const totalProduction = relevantBatches.reduce((sum, batch) => sum + (batch.output_litres || 0), 0);
    const avgCost = relevantBatches.length > 0
      ? relevantBatches.reduce((sum, batch) => sum + (batch.cost_per_litre || 0), 0) / relevantBatches.length
      : 0;

    return {
      material: rawMaterial.name,
      avgYield: avgYield,
      totalProduction: totalProduction,
      avgCost: avgCost,
      batchCount: relevantBatches.length,
      trend: avgYield > 75 ? 'up' : avgYield > 50 ? 'stable' : 'down'
    };
  }).filter(item => item.batchCount > 0);

  // Recent batch performance
  const recentBatches = batches.slice(-10).map(batch => ({
    batchNumber: batch.batch_number,
    yield: batch.yield_percentage || 0,
    cost: batch.cost_per_litre || 0,
    output: batch.output_litres || 0,
    efficiency: (batch.yield_percentage || 0) > 80 ? 'excellent' : 
                (batch.yield_percentage || 0) > 60 ? 'good' : 'needs_improvement'
  }));

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEfficiencyColor = (efficiency) => {
    switch (efficiency) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'needs_improvement': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Material Yield Analysis */}
      <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
        <CardHeader>
          <CardTitle>Yield Analysis by Material Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Avg Yield %</TableHead>
                <TableHead>Total Production (L)</TableHead>
                <TableHead>Avg Cost/L</TableHead>
                <TableHead>Batches</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materialYields.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No yield data available. Complete some production batches to see analysis.
                  </TableCell>
                </TableRow>
              ) : (
                materialYields.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.material}</TableCell>
                    <TableCell>
                      <span className={`font-semibold ${
                        item.avgYield > 80 ? 'text-green-600' :
                        item.avgYield > 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {item.avgYield.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>{item.totalProduction.toFixed(1)}L</TableCell>
                    <TableCell>₹{item.avgCost.toFixed(2)}</TableCell>
                    <TableCell>{item.batchCount}</TableCell>
                    <TableCell>{getTrendIcon(item.trend)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Batch Performance */}
      <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
        <CardHeader>
          <CardTitle>Recent Batch Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Number</TableHead>
                <TableHead>Yield %</TableHead>
                <TableHead>Output (L)</TableHead>
                <TableHead>Cost/L</TableHead>
                <TableHead>Efficiency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No recent batch data available.
                  </TableCell>
                </TableRow>
              ) : (
                recentBatches.map((batch, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{batch.batchNumber}</TableCell>
                    <TableCell>
                      <span className={`font-semibold ${
                        batch.yield > 80 ? 'text-green-600' :
                        batch.yield > 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {batch.yield.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>{batch.output.toFixed(1)}L</TableCell>
                    <TableCell>₹{batch.cost.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={`${getEfficiencyColor(batch.efficiency)} border`}>
                        {batch.efficiency.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 