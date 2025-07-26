import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Skeleton } from '@/Components/ui/skeleton';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Calculator } from 'lucide-react';

export default function CashFlow({ transactions, loading }) {
  if (loading) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
        <CardHeader>
          <CardTitle>Cash Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Prepare cash flow data
  const monthlyData = transactions.reduce((acc, t) => {
    const month = new Date(t.transaction_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const existing = acc.find(item => item.month === month);
    if (existing) {
      if (t.type === 'payment' || t.type === 'invoice') existing.income += t.amount || 0;
      if (t.type === 'expense') existing.expense += t.amount || 0;
    } else {
      acc.push({
        month,
        income: t.type === 'payment' || t.type === 'invoice' ? t.amount || 0 : 0,
        expense: t.type === 'expense' ? t.amount || 0 : 0
      });
    }
    return acc;
  }, []);

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-amber-200">
      <CardHeader>
        <CardTitle>Cash Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={monthlyData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="income" stackId="1" stroke="#10b981" fill="#d1fae5" name="Income" />
            <Area type="monotone" dataKey="expense" stackId="1" stroke="#ef4444" fill="#fee2e2" name="Expense" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
} 