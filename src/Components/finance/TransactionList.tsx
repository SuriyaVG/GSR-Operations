import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Skeleton } from '@/Components/ui/skeleton';
import { format } from 'date-fns';
import { ArrowUpCircle, ArrowDownCircle, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';

const typeConfig = {
  payment: { color: 'bg-green-100 text-green-800 border-green-200', icon: ArrowUpCircle },
  expense: { color: 'bg-red-100 text-red-800 border-red-200', icon: ArrowDownCircle },
  credit_note: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: ArrowUpCircle },
  invoice: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: ArrowUpCircle }
};

export default function TransactionList({ transactions, customers, suppliers, loading, onRefresh }) {
  if (loading) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
        <CardHeader>
          <CardTitle>Financial Transactions</CardTitle>
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

  const getEntityName = (transaction) => {
    if (transaction.customer_id) {
      const customer = customers.find(c => c.id === transaction.customer_id);
      return customer?.name || 'Unknown Customer';
    }
    if (transaction.supplier_id) {
      const supplier = suppliers.find(s => s.id === transaction.supplier_id);
      return supplier?.name || 'Unknown Supplier';
    }
    return 'N/A';
  };

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-gray-900">Financial Transactions</CardTitle>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-amber-50">
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No transactions found. Add your first transaction to get started.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map(transaction => {
                const typeInfo = typeConfig[transaction.type] || typeConfig.payment;
                const TypeIcon = typeInfo.icon;
                const isIncome = transaction.type === 'payment' || transaction.type === 'invoice';
                
                return (
                  <TableRow key={transaction.id} className="hover:bg-amber-50 transition-colors">
                    <TableCell>{format(new Date(transaction.transaction_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Badge className={`${typeInfo.color} border flex items-center gap-1 w-fit capitalize`}>
                        <TypeIcon className="w-3 h-3" />
                        {transaction.type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        {transaction.reference_id && (
                          <p className="text-sm text-gray-500">Ref: {transaction.reference_id}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getEntityName(transaction)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-amber-300 capitalize">
                        {transaction.payment_method?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      isIncome ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isIncome ? '+' : ''}₹{transaction.amount?.toLocaleString('en-IN') || '0'}
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
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Edit Transaction
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Print Receipt
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