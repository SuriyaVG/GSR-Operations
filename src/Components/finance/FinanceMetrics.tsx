import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Skeleton } from '@/Components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format } from 'date-fns';
import { IndianRupee, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function FinanceMetrics({ transactions, loading }) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const totalIncome = transactions.filter(t => t.type === 'payment' || t.type === 'invoice').reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : -100;

  const monthlyData = transactions.reduce((acc, transaction) => {
    const month = format(new Date(transaction.transaction_date), 'MMM yy');
    let existing = acc.find(item => item.month === month);
    if (!existing) {
      existing = { month, income: 0, expenses: 0 };
      acc.push(existing);
    }
    if (transaction.type === 'payment' || transaction.type === 'invoice') {
      existing.income += transaction.amount || 0;
    } else if (transaction.type === 'expense') {
      existing.expenses += transaction.amount || 0;
    }
    return acc;
  }, []);

  const expenseCategories = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, transaction) => {
      const category = transaction.category?.replace('_', ' ') || 'other';
      acc[category] = (acc[category] || 0) + (transaction.amount || 0);
      return acc;
    }, {});

  const expenseData = Object.entries(expenseCategories).map(([category, amount]) => ({
    category,
    amount
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-amber-700 font-medium">Total Income</p><p className="text-2xl font-bold text-green-600">₹{totalIncome.toLocaleString('en-IN')}</p></div><TrendingUp className="w-8 h-8 text-green-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-amber-700 font-medium">Total Expenses</p><p className="text-2xl font-bold text-red-600">₹{totalExpenses.toLocaleString('en-IN')}</p></div><TrendingDown className="w-8 h-8 text-red-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-amber-700 font-medium">Net Profit</p><p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{netProfit.toLocaleString('en-IN')}</p></div><DollarSign className="w-8 h-8 text-blue-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-amber-700 font-medium">Profit Margin</p><p className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{profitMargin.toFixed(1)}%</p></div><IndianRupee className="w-8 h-8 text-amber-500" /></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle>Monthly Cash Flow</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><LineChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Income" /><Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" /></LineChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>Expenses by Category</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={expenseData} layout="vertical" margin={{ left: 20 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="category" width={80} tick={{ textTransform: 'capitalize' }} /><Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} /><Bar dataKey="amount" fill="#f59e0b" /></BarChart></ResponsiveContainer></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Expense Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expenseData.map((expense, index) => (
              <div key={index} className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-gray-900 capitalize">{expense.category}</p>
                  <p className="text-lg font-bold text-gray-900">₹{expense.amount.toLocaleString('en-IN')}</p>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full" style={{ width: `${(expense.amount / totalExpenses) * 100}%` }}></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{((expense.amount / totalExpenses) * 100).toFixed(1)}% of total expenses</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 