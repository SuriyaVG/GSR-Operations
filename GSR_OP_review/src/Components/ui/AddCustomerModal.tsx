import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { toast } from '@/lib/toast';
import { z } from 'zod';

const CustomerSchema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
});

export function AddCustomerModal({ open, onClose, onSave, initialData, isEdit }) {
  const [form, setForm] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({ name: initialData.name || '', email: initialData.email || '' });
    } else {
      setForm({ name: '', email: '' });
    }
    setErrors({});
  }, [initialData, open]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    try {
      const result = CustomerSchema.safeParse(form);
      if (!result.success) {
        setErrors(result.error.flatten().fieldErrors);
        return;
      }
      await onSave(initialData ? { ...form, id: initialData.id } : form);
      onClose();
      toast.success(isEdit ? 'Customer updated!' : 'Customer added!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Customer Name"
            value={form.name}
            onChange={e => handleChange('name', e.target.value)}
            required
            autoComplete="off"
            error={errors.name?.[0]}
          />
          <Input
            label="Email"
            value={form.email}
            onChange={e => handleChange('email', e.target.value)}
            required
            autoComplete="off"
            error={errors.email?.[0]}
          />
          <DialogFooter>
            <Button type="submit" loading={isSubmitting}>{isEdit ? 'Update' : 'Add'} Customer</Button>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 