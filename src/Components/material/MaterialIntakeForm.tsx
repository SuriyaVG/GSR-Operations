import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Textarea } from '@/Components/ui/textarea';
import { format } from 'date-fns';

export default function MaterialIntakeForm({ suppliers, rawMaterials, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    supplier_id: '',
    raw_material_id: '',
    quantity: '',
    cost_per_unit: '',
    lot_number: '',
    intake_date: format(new Date(), 'yyyy-MM-dd'),
    expiry_date: '',
    quality_notes: '',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const total_cost = parseFloat(formData.quantity) * parseFloat(formData.cost_per_unit);
    onSave({ ...formData, total_cost, quantity: parseFloat(formData.quantity), cost_per_unit: parseFloat(formData.cost_per_unit) });
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-2xl bg-white/90 backdrop-blur-sm border-amber-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">New Material Intake</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="supplier_id">Supplier</Label>
              <Select onValueChange={(value) => handleChange('supplier_id', value)}>
                <SelectTrigger id="supplier_id"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="raw_material_id">Raw Material</Label>
              <Select onValueChange={(value) => handleChange('raw_material_id', value)}>
                <SelectTrigger id="raw_material_id"><SelectValue placeholder="Select material" /></SelectTrigger>
                <SelectContent>
                  {rawMaterials.map(r => <SelectItem key={r.id} value={r.id}>{r.name} ({r.unit})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" value={formData.quantity} onChange={(e) => handleChange('quantity', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost_per_unit">Cost per Unit (₹)</Label>
              <Input id="cost_per_unit" type="number" value={formData.cost_per_unit} onChange={(e) => handleChange('cost_per_unit', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lot_number">Lot Number</Label>
              <Input id="lot_number" value={formData.lot_number} onChange={(e) => handleChange('lot_number', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="intake_date">Intake Date</Label>
              <Input id="intake_date" type="date" value={formData.intake_date} onChange={(e) => handleChange('intake_date', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input id="expiry_date" type="date" value={formData.expiry_date} onChange={(e) => handleChange('expiry_date', e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="quality_notes">Quality Notes</Label>
              <Textarea id="quality_notes" value={formData.quality_notes} onChange={(e) => handleChange('quality_notes', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            </DialogClose>
            <Button type="submit" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">Save Intake</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 