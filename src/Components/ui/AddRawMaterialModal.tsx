import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { z } from 'zod';

const RawMaterialSchema = z.object({
  name: z.string().min(1, 'Required'),
  category: z.string().min(1, 'Required'),
  unit: z.string().min(1, 'Required'),
  cost_per_unit: z.number().min(0.01, 'Must be greater than 0')
});

interface RawMaterialData {
  id?: string;
  name: string;
  category: string;
  unit: string;
  cost_per_unit: number;
}

interface AddRawMaterialModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: RawMaterialData) => Promise<void>;
  initialData?: RawMaterialData;
  isEdit?: boolean;
}

export function AddRawMaterialModal({ open, onClose, onSave, initialData, isEdit = false }: AddRawMaterialModalProps) {
  const [form, setForm] = useState<{ name: string; category: string; unit: string; cost_per_unit: string }>({ name: '', category: '', unit: '', cost_per_unit: '' });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({ 
        name: initialData.name || '', 
        category: initialData.category || '',
        unit: initialData.unit || '', 
        cost_per_unit: initialData.cost_per_unit?.toString() || ''
      });
    } else {
      setForm({ name: '', category: '', unit: '', cost_per_unit: '' });
    }
    setErrors({});
  }, [initialData, open]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    try {
      // Convert cost_per_unit to number
      const formData = {
        ...form,
        cost_per_unit: parseFloat(form.cost_per_unit)
      };
      
      const result = RawMaterialSchema.safeParse(formData);
      if (!result.success) {
        setErrors(result.error.flatten().fieldErrors);
        return;
      }
      await onSave(initialData ? { ...formData, id: initialData.id } : formData);
      onClose();
      toast.success(isEdit ? 'Raw material updated!' : 'Raw material added!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Raw Material' : 'Add Raw Material'}</DialogTitle>
          <DialogDescription>
            {isEdit 
              ? 'Update raw material information. Fill in the required fields below.'
              : 'Add a new raw material to your database. Fill in the required information below.'
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium mb-1">Raw Material Name</label>
          <Input
            value={form.name}
            onChange={e => handleChange('name', e.target.value)}
            required
            autoComplete="off"
            placeholder="Enter raw material name"
            error={errors.name?.[0]}
          />
          <label className="block text-sm font-medium mb-1">Category</label>
          <Input
            value={form.category}
            onChange={e => handleChange('category', e.target.value)}
            required
            autoComplete="off"
            placeholder="e.g. Dairy, Spices, Packaging"
            error={errors.category?.[0]}
          />
          <label className="block text-sm font-medium mb-1">Unit</label>
          <Input
            value={form.unit}
            onChange={e => handleChange('unit', e.target.value)}
            required
            autoComplete="off"
            placeholder="e.g. kg, litres, pieces"
            error={errors.unit?.[0]}
          />

          <label className="block text-sm font-medium mb-1">Cost per Unit (₹)</label>
          <Input
            type="number"
            step="0.01"
            value={form.cost_per_unit}
            onChange={e => handleChange('cost_per_unit', e.target.value)}
            required
            autoComplete="off"
            placeholder="Enter cost per unit"
            error={errors.cost_per_unit?.[0]}
          />
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Update Raw Material' : 'Add Raw Material'}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 