import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { format } from 'date-fns';

export default function TransactionForm({ customers, suppliers, orders, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    type: 'payment',
    reference_id: '',
    amount: '',
    description: '',
    payment_method: 'cash',
    category: 'sales',
    customer_id: '',
    supplier_id: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-2xl bg-white/90 backdrop-blur-sm border-amber-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">New Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="transaction_date">Date</Label>
              <Input id="transaction_date" type="date" value={formData.transaction_date} onChange={(e) => handleChange('transaction_date', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select onValueChange={(value) => handleChange('type', value)} value={formData.type}>
                <SelectTrigger id="type"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="credit_note">Credit Note</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference_id">Reference ID</Label>
              <Input id="reference_id" value={formData.reference_id} onChange={(e) => handleChange('reference_id', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input id="amount" type="number" value={formData.amount} onChange={(e) => handleChange('amount', e.target.value)} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => handleChange('description', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select onValueChange={(value) => handleChange('payment_method', value)} value={formData.payment_method}>
                <SelectTrigger id="payment_method"><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={formData.category} onChange={(e) => handleChange('category', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_id">Customer</Label>
              <Select onValueChange={(value) => handleChange('customer_id', value)} value={formData.customer_id}>
                <SelectTrigger id="customer_id"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers && customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier_id">Supplier</Label>
              <Select onValueChange={(value) => handleChange('supplier_id', value)} value={formData.supplier_id}>
                <SelectTrigger id="supplier_id"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers && suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              Save Transaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 