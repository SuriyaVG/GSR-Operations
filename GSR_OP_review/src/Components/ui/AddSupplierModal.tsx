import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { toast } from '@/lib/toast';
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
  onSave: (data: SupplierData) => Promise<void>;
  initialData?: SupplierData;
  isEdit?: boolean;
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
        return;
      }
      await onSave(form);
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
          <Input
            label="Supplier Name"
            value={form.name}
            onChange={e => handleChange('name', e.target.value)}
            required
            autoComplete="off"
            error={errors.name?.[0]}
          />
          <Input
            label="Contact Email"
            value={form.email || ''}
            onChange={e => handleChange('email', e.target.value)}
            autoComplete="off"
            error={errors.email?.[0]}
          />
          <Input
            label="Contact Person"
            value={form.contact_person || ''}
            onChange={e => handleChange('contact_person', e.target.value)}
            autoComplete="off"
            error={errors.contact_person?.[0]}
          />
          <Input
            label="Phone"
            value={form.phone || ''}
            onChange={e => handleChange('phone', e.target.value)}
            autoComplete="off"
            error={errors.phone?.[0]}
          />
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Update Supplier' : 'Add Supplier'}
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