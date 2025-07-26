import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Skeleton } from '@/Components/ui/skeleton';
import { IndianRupee, Layers, Truck, BarChart } from 'lucide-react';

export default function StockSummary({ materials, rawMaterials, suppliers, loading }) {
  if (loading) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border-amber-200 mb-6">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const stockValue = materials.reduce((sum, m) => sum + ((m.remaining_quantity || 0) * (m.cost_per_unit || 0)), 0);
  const distinctMaterials = new Set(materials.map(m => m.raw_material_id)).size;
  const totalSuppliers = new Set(materials.map(m => m.supplier_id)).size;

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-amber-200 mb-6">
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-blue-700">Total Stock Value</p>
            <IndianRupee className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">₹{stockValue.toLocaleString('en-IN')}</p>
        </div>
        <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-green-700">Distinct Materials</p>
            <Layers className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{distinctMaterials}</p>
        </div>
        <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-purple-700">Total Suppliers</p>
            <Truck className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalSuppliers}</p>
        </div>
        <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-orange-700">Low Stock Items</p>
            <BarChart className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
        </div>
      </CardContent>
    </Card>
  );
} 