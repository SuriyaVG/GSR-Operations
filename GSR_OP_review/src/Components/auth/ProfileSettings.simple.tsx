import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-simple';
import { useToast } from '@/Components/ui/toast';
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
import { User, Settings, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export interface ProfileSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  name: string;
  displayName: string;
}

interface FormErrors {
  name?: string;
  displayName?: string;
}

export function ProfileSettings({ open, onOpenChange }: ProfileSettingsProps) {
  const { user } = useAuth();
  const { success, error } = useToast();
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: user?.name || '',
    displayName: user?.name || '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset form when user changes or dialog opens
  React.useEffect(() => {
    if (user && open) {
      const initialData = {
        name: user.name || '',
        displayName: user.name || '',
      };
      setFormData(initialData);
      setErrors({});
      setHasChanges(false);
    }
  }, [user, open]);

  // Handle input changes with real-time validation
  const handleInputChange = (field: keyof FormData, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Check if there are changes
    const hasFormChanges = 
      newFormData.name !== (user?.name || '') ||
      newFormData.displayName !== (user?.name || '');
    
    setHasChanges(hasFormChanges);

    // Real-time validation
    validateField(field, value);
  };

  // Validate individual field
  const validateField = (field: keyof FormData, value: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'name':
        if (!value.trim()) {
          newErrors.name = 'Name is required';
        } else if (value.trim().length < 2) {
          newErrors.name = 'Name must be at least 2 characters';
        } else if (value.trim().length > 100) {
          newErrors.name = 'Name must be no more than 100 characters';
        } else {
          delete newErrors.name;
        }
        break;

      case 'displayName':
        if (value.trim() && value.trim().length > 100) {
          newErrors.displayName = 'Display name must be no more than 100 characters';
        } else {
          delete newErrors.displayName;
        }
        break;
    }

    setErrors(newErrors);
  };

  // Validate entire form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate name (required)
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Name must be no more than 100 characters';
    }

    // Validate display name
    if (formData.displayName.trim() && formData.displayName.trim().length > 100) {
      newErrors.displayName = 'Display name must be no more than 100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      error('Please fix the validation errors before saving');
      return;
    }

    if (!hasChanges) {
      success('No changes to save');
      onOpenChange(false);
      return;
    }

    setIsSubmitting(true);

    try {
      // Update user metadata in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          name: formData.name.trim(),
          display_name: formData.displayName.trim() || formData.name.trim(),
        }
      });

      if (updateError) {
        throw updateError;
      }

      success('Profile updated successfully');
      onOpenChange(false);
    } catch (err) {
      console.error('Profile update error:', err);
      error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (hasChanges && !isSubmitting) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onOpenChange(false);
      }
    } else {
      onOpenChange(false);
    }
  };

  if (!user) {
    return null;
  }

  const isFormValid = Object.keys(errors).length === 0 && formData.name.trim().length >= 2;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-800">
            <Settings className="w-5 h-5" />
            Profile Settings
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Info Display */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{user.email}</p>
                <p className="text-sm text-amber-600">
                  {user.role?.replace('_', ' ').toUpperCase() || 'USER'}
                </p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-amber-800 font-medium">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={cn(
                  "bg-white/80 backdrop-blur-sm border-amber-200 focus:border-amber-400 focus:ring-amber-500",
                  errors.name && "border-red-300 focus:border-red-400 focus:ring-red-500"
                )}
                placeholder="Enter your full name"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <X className="w-3 h-3" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Display Name Field */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-amber-800 font-medium">
                Display Name
              </Label>
              <Input
                id="displayName"
                type="text"
                value={formData.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                className={cn(
                  "bg-white/80 backdrop-blur-sm border-amber-200 focus:border-amber-400 focus:ring-amber-500",
                  errors.displayName && "border-red-300 focus:border-red-400 focus:ring-red-500"
                )}
                placeholder="How you'd like to be displayed"
                disabled={isSubmitting}
              />
              {errors.displayName && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <X className="w-3 h-3" />
                  {errors.displayName}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="border-amber-200 text-amber-800 hover:bg-amber-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || !hasChanges || isSubmitting}
              className="bg-amber-400 hover:bg-amber-500 text-white"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}