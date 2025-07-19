import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { UserProfileService } from '@/lib/services/userProfileService';
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
import { User, Settings, Save, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { ErrorMessage } from '@/Components/ui/error-message';
import { LoadingState } from '@/Components/ui/loading-state';
import { ErrorRecoveryAction, type RecoverableError } from '@/lib/services/errorHandlingService';

export interface ProfileSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  name: string;
  designation: string;
  displayName: string;
  title: string;
  department: string;
}

interface FormErrors {
  name?: string;
  designation?: string;
  displayName?: string;
  title?: string;
  department?: string;
}

export function ProfileSettings({ open, onOpenChange }: ProfileSettingsProps) {
  const { user, updateProfile } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: user?.name || '',
    designation: user?.designation || '',
    displayName: user?.custom_settings?.display_name || '',
    title: user?.custom_settings?.title || '',
    department: user?.custom_settings?.department || '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [recoverableError, setRecoverableError] = useState<RecoverableError | null>(null);

  // Reset form when user changes or dialog opens
  React.useEffect(() => {
    if (user && open) {
      const initialData = {
        name: user.name || '',
        designation: user.designation || '',
        displayName: user.custom_settings?.display_name || '',
        title: user.custom_settings?.title || '',
        department: user.custom_settings?.department || '',
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
      newFormData.designation !== (user?.designation || '') ||
      newFormData.displayName !== (user?.custom_settings?.display_name || '') ||
      newFormData.title !== (user?.custom_settings?.title || '') ||
      newFormData.department !== (user?.custom_settings?.department || '');
    
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
        } else if (!/^[a-zA-Z\s'-]+$/.test(value.trim())) {
          newErrors.name = 'Name can only contain letters, spaces, hyphens, and apostrophes';
        } else {
          delete newErrors.name;
        }
        break;

      case 'designation':
        if (value.trim() && value.trim().length > 50) {
          newErrors.designation = 'Designation must be no more than 50 characters';
        } else if (value.trim() && !/^[a-zA-Z\s'-]+$/.test(value.trim())) {
          newErrors.designation = 'Designation can only contain letters, spaces, hyphens, and apostrophes';
        } else {
          delete newErrors.designation;
        }
        break;

      case 'displayName':
        if (value.trim() && value.trim().length > 100) {
          newErrors.displayName = 'Display name must be no more than 100 characters';
        } else {
          delete newErrors.displayName;
        }
        break;

      case 'title':
        if (value.trim() && value.trim().length > 50) {
          newErrors.title = 'Title must be no more than 50 characters';
        } else {
          delete newErrors.title;
        }
        break;

      case 'department':
        if (value.trim() && value.trim().length > 50) {
          newErrors.department = 'Department must be no more than 50 characters';
        } else {
          delete newErrors.department;
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
    } else if (!/^[a-zA-Z\s'-]+$/.test(formData.name.trim())) {
      newErrors.name = 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }

    // Validate optional fields
    if (formData.designation.trim() && formData.designation.trim().length > 50) {
      newErrors.designation = 'Designation must be no more than 50 characters';
    } else if (formData.designation.trim() && !/^[a-zA-Z\s'-]+$/.test(formData.designation.trim())) {
      newErrors.designation = 'Designation can only contain letters, spaces, hyphens, and apostrophes';
    }

    if (formData.displayName.trim() && formData.displayName.trim().length > 100) {
      newErrors.displayName = 'Display name must be no more than 100 characters';
    }

    if (formData.title.trim() && formData.title.trim().length > 50) {
      newErrors.title = 'Title must be no more than 50 characters';
    }

    if (formData.department.trim() && formData.department.trim().length > 50) {
      newErrors.department = 'Department must be no more than 50 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear any previous errors
    setRecoverableError(null);

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
      // Prepare update data
      const updates = {
        name: formData.name.trim(),
        designation: formData.designation.trim() || undefined,
        custom_settings: {
          display_name: formData.displayName.trim() || undefined,
          title: formData.title.trim() || undefined,
          department: formData.department.trim() || undefined,
        }
      };

      // Update profile using the service
      const result = await UserProfileService.updateProfile(
        user!.id,
        UserProfileService.sanitizeProfileUpdate(updates)
      );

      if (result.success && result.user) {
        // Update auth context with new user data
        await updateProfile(result.user);
        
        // Show success toast with specific changes
        const changesSummary = UserProfileService.getUpdateSummary(
          { name: user?.name, designation: user?.designation, custom_settings: user?.custom_settings },
          { name: result.user.name, designation: result.user.designation, custom_settings: result.user.custom_settings }
        );
        success(changesSummary);
        
        onOpenChange(false);
        
        // If we're not on the profile page and the dialog is closed from elsewhere,
        // navigate to the profile page when requested
        if (location.pathname !== '/profile') {
          navigate('/profile');
        }
      } else {
        // Handle validation errors from the service
        if (result.errors && result.errors.length > 0) {
          const newErrors: FormErrors = {};
          
          result.errors.forEach(err => {
            if (err.field === 'name') {
              newErrors.name = err.message;
            } else if (err.field === 'designation') {
              newErrors.designation = err.message;
            } else if (err.field === 'custom_settings.display_name') {
              newErrors.displayName = err.message;
            } else if (err.field === 'custom_settings.title') {
              newErrors.title = err.message;
            } else if (err.field === 'custom_settings.department') {
              newErrors.department = err.message;
            }
          });
          
          setErrors(newErrors);
          error('Please fix the validation errors before saving');
        } else {
          throw new Error(result.message || 'Failed to update profile');
        }
      }
    } catch (err) {
      console.error('Profile update error:', err);
      
      // Create recoverable error for the UI
      setRecoverableError({
        type: 'profile_update_error',
        message: err instanceof Error ? err.message : 'Failed to update profile',
        technicalDetails: err instanceof Error ? err.stack : undefined,
        recoveryActions: [
          ErrorRecoveryAction.RETRY,
          ErrorRecoveryAction.EDIT_INPUT,
          ErrorRecoveryAction.CANCEL
        ]
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle error recovery actions
  const handleErrorAction = (action: ErrorRecoveryAction) => {
    switch (action) {
      case ErrorRecoveryAction.RETRY:
        setRecoverableError(null);
        handleSubmit(new Event('submit') as any);
        break;
      case ErrorRecoveryAction.EDIT_INPUT:
        setRecoverableError(null);
        // Focus on the first field with an error
        const firstErrorField = Object.keys(errors)[0] as keyof FormData;
        if (firstErrorField) {
          const element = document.getElementById(firstErrorField);
          if (element) element.focus();
        }
        break;
      case ErrorRecoveryAction.CANCEL:
        setRecoverableError(null);
        break;
      case ErrorRecoveryAction.LOGOUT:
        // Handle logout if needed
        break;
      default:
        setRecoverableError(null);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (hasChanges && !isSubmitting) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onOpenChange(false);
        // If we're not on the profile page and the dialog is closed from elsewhere, 
        // navigate to the profile page when requested
        if (location.pathname !== '/profile' && open) {
          navigate('/profile');
        }
      }
    } else {
      onOpenChange(false);
      // If we're not on the profile page and the dialog is closed from elsewhere,
      // navigate to the profile page when requested
      if (location.pathname !== '/profile' && open) {
        navigate('/profile');
      }
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
          {/* Error message */}
          {recoverableError && (
            <ErrorMessage 
              error={recoverableError} 
              onAction={handleErrorAction}
              className="mb-4"
            />
          )}
          
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

            {/* Designation Field */}
            <div className="space-y-2">
              <Label htmlFor="designation" className="text-amber-800 font-medium">
                Designation
              </Label>
              <Input
                id="designation"
                type="text"
                value={formData.designation}
                onChange={(e) => handleInputChange('designation', e.target.value)}
                className={cn(
                  "bg-white/80 backdrop-blur-sm border-amber-200 focus:border-amber-400 focus:ring-amber-500",
                  errors.designation && "border-red-300 focus:border-red-400 focus:ring-red-500"
                )}
                placeholder="e.g., Manager, Supervisor, CEO"
                disabled={isSubmitting}
              />
              {errors.designation && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <X className="w-3 h-3" />
                  {errors.designation}
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

            {/* Title Field */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-amber-800 font-medium">
                Title
              </Label>
              <Input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={cn(
                  "bg-white/80 backdrop-blur-sm border-amber-200 focus:border-amber-400 focus:ring-amber-500",
                  errors.title && "border-red-300 focus:border-red-400 focus:ring-red-500"
                )}
                placeholder="Professional title"
                disabled={isSubmitting}
              />
              {errors.title && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <X className="w-3 h-3" />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Department Field */}
            <div className="space-y-2">
              <Label htmlFor="department" className="text-amber-800 font-medium">
                Department
              </Label>
              <Input
                id="department"
                type="text"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                className={cn(
                  "bg-white/80 backdrop-blur-sm border-amber-200 focus:border-amber-400 focus:ring-amber-500",
                  errors.department && "border-red-300 focus:border-red-400 focus:ring-red-500"
                )}
                placeholder="Your department"
                disabled={isSubmitting}
              />
              {errors.department && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <X className="w-3 h-3" />
                  {errors.department}
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
            <LoadingState status={isSubmitting ? 'loading' : 'idle'}>
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
            </LoadingState>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}