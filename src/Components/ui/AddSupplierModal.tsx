import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { toast } from '@/lib/toast';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

const SupplierSchema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').optional(),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
});

interface SupplierData {
  id?: string;
  name: string;
  email?: string;
  contact_person?: string;
  phone?: string;
}

interface AddSupplierModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: SupplierData) => Promise<SupplierData>;
  initialData?: SupplierData;
  isEdit?: boolean;
  onSuccess?: (supplier: SupplierData) => void;
}

export function AddSupplierModal({ open, onClose, onSave, initialData, isEdit = false }: AddSupplierModalProps) {
  const [form, setForm] = useState<SupplierData>({ name: '', email: '', contact_person: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize form with initialData if provided
  useEffect(() => {
    if (initialData) {
      setForm(initialData);
    } else {
      setForm({ name: '', email: '', contact_person: '', phone: '' });
    }
  }, [initialData]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    try {
      const result = SupplierSchema.safeParse(form);
      if (!result.success) {
        setErrors(result.error.flatten().fieldErrors);
        setIsSubmitting(false);
        return;
      }
      const created = await onSave(form);
      if (onSuccess) onSuccess(created);
      onClose();
      toast.success(isEdit ? 'Supplier updated!' : 'Supplier added!');
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
          <DialogTitle>{isEdit ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          <DialogDescription>
            {isEdit 
              ? 'Update supplier information. Fill in the required fields below.'
              : 'Add a new supplier to your database. Fill in the required information below.'
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium mb-1">Supplier Name</label>
          <Input
            value={form.name}
            onChange={e => handleChange('name', e.target.value)}
            required
            autoComplete="off"
            placeholder="Enter supplier name"
            error={errors.name?.[0]}
          />
          <label className="block text-sm font-medium mb-1">Contact Email</label>
          <Input
            value={form.email || ''}
            onChange={e => handleChange('email', e.target.value)}
            autoComplete="off"
            placeholder="Enter contact email (optional)"
            error={errors.email?.[0]}
          />
          <label className="block text-sm font-medium mb-1">Contact Person</label>
          <Input
            value={form.contact_person || ''}
            onChange={e => handleChange('contact_person', e.target.value)}
            autoComplete="off"
            placeholder="Enter contact person (optional)"
            error={errors.contact_person?.[0]}
          />
          <label className="block text-sm font-medium mb-1">Phone</label>
          <Input
            value={form.phone || ''}
            onChange={e => handleChange('phone', e.target.value)}
            autoComplete="off"
            placeholder="Enter phone number (optional)"
            error={errors.phone?.[0]}
          />
          <DialogFooter>
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Update Supplier' : 'Add Supplier'}
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