import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Skeleton } from '@/Components/ui/skeleton';
import { format } from 'date-fns';
import { Eye, MoreHorizontal, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';

const statusConfig = {
  in_progress: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock },
  completed: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  quality_check: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle },
  approved: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle }
};

export default function BatchList({ batches, loading, onRefresh }) {
  if (loading) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
        <CardHeader>
          <CardTitle>Production Batches</CardTitle>
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

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-gray-900">Production Batches</CardTitle>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-amber-50">
              <TableHead>Batch Number</TableHead>
              <TableHead>Production Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Output (L)</TableHead>
              <TableHead className="text-right">Cost/L</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
              <TableHead className="text-right">Yield %</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No production batches found. Create your first batch to get started.
                </TableCell>
              </TableRow>
            ) : (
              batches.map(batch => {
                const statusInfo = statusConfig[batch.status] || statusConfig.in_progress;
                const StatusIcon = statusInfo.icon;
                
                return (
                  <TableRow key={batch.id} className="hover:bg-amber-50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                        {batch.batch_number}
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(batch.production_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Badge className={`${statusInfo.color} border flex items-center gap-1 w-fit`}>
                        <StatusIcon className="w-3 h-3" />
                        {batch.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{batch.output_litres?.toFixed(1) || '0'}</TableCell>
                    <TableCell className="text-right">₹{batch.cost_per_litre?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell className="text-right">₹{batch.total_input_cost?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-medium ${
                        (batch.yield_percentage || 0) > 80 ? 'text-green-600' : 
                        (batch.yield_percentage || 0) > 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {batch.yield_percentage?.toFixed(1) || '0.0'}%
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
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Edit Batch
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Update Status
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