import React from 'react';
import { Card, CardContent } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Badge } from '@/Components/ui/badge';
import { Skeleton } from '@/Components/ui/skeleton';
import { format } from 'date-fns';

export default function MaterialList({ materials, suppliers, rawMaterials, loading }) {
  if (loading) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  const getSupplierName = (id) => suppliers.find(s => s.id === id)?.name || 'N/A';
  const getRawMaterialName = (id) => rawMaterials.find(r => r.id === id)?.name || 'N/A';

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-amber-50">
              <TableHead>Intake Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Lot #</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead className="text-right">Cost/Unit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map(material => (
              <TableRow key={material.id} className="hover:bg-amber-50 transition-colors">
                <TableCell>{format(new Date(material.intake_date), 'MMM d, yyyy')}</TableCell>
                <TableCell>{getSupplierName(material.supplier_id)}</TableCell>
                <TableCell>{getRawMaterialName(material.raw_material_id)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-amber-300">{material.lot_number || 'N/A'}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium">{material.quantity}</TableCell>
                <TableCell className="text-right font-semibold text-green-600">{material.remaining_quantity}</TableCell>
                <TableCell className="text-right">₹{material.cost_per_unit.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
} 