import React from 'react';
import { Label } from '@/Components/ui/label';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BaseFieldProps {
  label: string;
  id: string;
  error?: string;
  required?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface InputFieldProps extends BaseFieldProps {
  type?: 'text' | 'number' | 'email' | 'tel' | 'date' | 'password';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  disabled?: boolean;
}

interface TextareaFieldProps extends BaseFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

interface SelectFieldProps extends BaseFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}

// Base field wrapper component
function FieldWrapper({ label, id, error, required, className, children }: BaseFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600 animate-fadeIn">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}
    </div>
  );
}

// Input field component
export function InputField({
  label,
  id,
  error,
  required,
  className,
  type = 'text',
  value,
  onChange,
  placeholder,
  min,
  max,
  step,
  disabled
}: InputFieldProps) {
  return (
    <FieldWrapper label={label} id={id} error={error} required={required} className={className}>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={cn(
          "transition-colors duration-200",
          error 
            ? "border-red-300 focus:border-red-400 focus:ring-red-100" 
            : "border-amber-200 focus:border-amber-400 focus:ring-amber-100"
        )}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
      />
    </FieldWrapper>
  );
}

// Textarea field component
export function TextareaField({
  label,
  id,
  error,
  required,
  className,
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled
}: TextareaFieldProps) {
  return (
    <FieldWrapper label={label} id={id} error={error} required={required} className={className}>
      <Textarea
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={cn(
          "transition-colors duration-200",
          error 
            ? "border-red-300 focus:border-red-400 focus:ring-red-100" 
            : "border-amber-200 focus:border-amber-400 focus:ring-amber-100"
        )}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
      />
    </FieldWrapper>
  );
}

// Select field component
export function SelectField({
  label,
  id,
  error,
  required,
  className,
  value,
  onValueChange,
  placeholder,
  disabled,
  options
}: SelectFieldProps) {
  return (
    <FieldWrapper label={label} id={id} error={error} required={required} className={className}>
      <select
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'block w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors duration-200',
          error ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-amber-200 focus:border-amber-400 focus:ring-amber-100',
          className
        )}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {placeholder && <option value="" disabled hidden>{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

// Form error summary component
interface FormErrorSummaryProps {
  errors: Record<string, string>;
  className?: string;
}

export function FormErrorSummary({ errors, className }: FormErrorSummaryProps) {
  const errorEntries = Object.entries(errors)
    .filter(([key, message]) => key !== 'general' && message);
  
  if (errorEntries.length === 0) return null;

  return (
    <div className={cn("bg-red-50 border border-red-200 rounded-lg p-4 animate-fadeIn", className)}>
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-medium text-red-800 mb-2">
            Please fix the following errors:
          </h3>
          <ul className="text-sm text-red-700 space-y-1">
            {errorEntries.map(([field, message]) => {
              // Format field name for better readability
              const readableField = field
                .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                .replace(/\./g, ' → ') // Replace dots with arrows for nested fields
                .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
                
              return (
                <li key={field} className="flex items-start gap-1">
                  <span className="text-red-500">•</span>
                  <span>
                    <span className="font-medium">{readableField}:</span> {message}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Inline validation feedback component
interface ValidationFeedbackProps {
  isValid?: boolean;
  message?: string;
  className?: string;
}

export function ValidationFeedback({ isValid, message, className }: ValidationFeedbackProps) {
  if (!message) return null;

  return (
    <div className={cn(
      "flex items-center gap-1 text-sm mt-1 animate-fadeIn",
      isValid ? "text-green-600" : "text-red-600",
      className
    )}>
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      <span className="font-medium">{message}</span>
    </div>
  );
}

// Real-time validation indicator
interface ValidationIndicatorProps {
  isValid?: boolean;
  isValidating?: boolean;
  className?: string;
}

export function ValidationIndicator({ isValid, isValidating, className }: ValidationIndicatorProps) {
  if (isValidating) {
    return (
      <div className={cn("flex items-center gap-1 text-sm text-amber-600", className)}>
        <div className="animate-spin h-3 w-3 border border-amber-600 border-t-transparent rounded-full" />
        <span>Validating...</span>
      </div>
    );
  }

  if (isValid === undefined) return null;

  return (
    <div className={cn(
      "flex items-center gap-1 text-sm",
      isValid ? "text-green-600" : "text-red-600",
      className
    )}>
      {isValid ? (
        <>
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span>Valid</span>
        </>
      ) : (
        <>
          <AlertCircle className="h-3 w-3" />
          <span>Invalid</span>
        </>
      )}
    </div>
  );
}