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

export default function CustomerForm({ onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    customer_type: 'retail',
    tier: 'standard',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gst_number: '',
    credit_limit: 0,
    payment_terms: 'immediate',
    notes: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      credit_limit: parseFloat(formData.credit_limit) || 0
    });
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm border-amber-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">Add New Customer</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Customer Name *</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => handleChange('name', e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  value={formData.phone} 
                  onChange={(e) => handleChange('phone', e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={formData.email} 
                  onChange={(e) => handleChange('email', e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_type">Customer Type</Label>
                <Select value={formData.customer_type} onValueChange={(value) => handleChange('customer_type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="d2c">Direct to Consumer</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="distributor">Distributor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tier">Customer Tier</Label>
                <Select value={formData.tier} onValueChange={(value) => handleChange('tier', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="wholesale">Wholesale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="text-lg">Address Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea 
                  id="address" 
                  value={formData.address} 
                  onChange={(e) => handleChange('address', e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input 
                  id="city" 
                  value={formData.city} 
                  onChange={(e) => handleChange('city', e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input 
                  id="state" 
                  value={formData.state} 
                  onChange={(e) => handleChange('state', e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input 
                  id="pincode" 
                  value={formData.pincode} 
                  onChange={(e) => handleChange('pincode', e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gst_number">GST Number</Label>
                <Input 
                  id="gst_number" 
                  value={formData.gst_number} 
                  onChange={(e) => handleChange('gst_number', e.target.value)} 
                />
              </div>
            </CardContent>
          </Card>

          {/* Business Terms */}
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="text-lg">Business Terms</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="credit_limit">Credit Limit (₹)</Label>
                <Input 
                  id="credit_limit" 
                  type="number"
                  value={formData.credit_limit} 
                  onChange={(e) => handleChange('credit_limit', e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Select value={formData.payment_terms} onValueChange={(value) => handleChange('payment_terms', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="15_days">15 Days</SelectItem>
                    <SelectItem value="30_days">30 Days</SelectItem>
                    <SelectItem value="45_days">45 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea 
                  id="notes" 
                  value={formData.notes} 
                  onChange={(e) => handleChange('notes', e.target.value)} 
                  placeholder="Additional notes about the customer..."
                />
              </div>
            </CardContent>
          </Card>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
            >
              Add Customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 