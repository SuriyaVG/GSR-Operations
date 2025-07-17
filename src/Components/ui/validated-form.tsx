import * as React from "react"
import { cn } from "@/lib/utils"
import { useFormValidation } from "@/lib/hooks/useFormValidation"
import { type ValidationRule } from "@/lib/validation"
import { useToast } from "./toast"
import { Button } from "./button"

export interface ValidatedFormProps<T extends Record<string, any>> {
  initialValues: T
  validationRules: Record<keyof T, ValidationRule>
  onSubmit: (data: T) => Promise<void>
  children: (props: {
    fields: ReturnType<typeof useFormValidation<T>>['fields']
    getFieldProps: ReturnType<typeof useFormValidation<T>>['getFieldProps']
    isValid: boolean
    isSubmitting: boolean
  }) => React.ReactNode
  className?: string
  submitButtonText?: string
  showSubmitButton?: boolean
  validateOnChange?: boolean
  validateOnBlur?: boolean
  successMessage?: string
  errorMessage?: string
}

export function ValidatedForm<T extends Record<string, any>>({
  initialValues,
  validationRules,
  onSubmit,
  children,
  className,
  submitButtonText = "Submit",
  showSubmitButton = true,
  validateOnChange = false,
  validateOnBlur = true,
  successMessage = "Form submitted successfully",
  errorMessage = "Failed to submit form"
}: ValidatedFormProps<T>) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const { success, error } = useToast()
  
  const {
    fields,
    isValid,
    validateForm,
    getFieldProps,
    // reset - commented out as it's not used
  } = useFormValidation(initialValues, validationRules, {
    validateOnChange,
    validateOnBlur
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!validateForm()) {
      error("Please fix the validation errors before submitting")
      return
    }

    setIsSubmitting(true)
    
    try {
      // Extract form data from fields
      const formData = Object.keys(fields).reduce((acc, key) => {
        acc[key as keyof T] = fields[key as keyof T].value
        return acc
      }, {} as T)
      
      await onSubmit(formData)
      success(successMessage)
      
      // Optionally reset form after successful submission
      // reset()
    } catch (err) {
      console.error("Form submission error:", err)
      const errorMsg = err instanceof Error ? err.message : errorMessage
      error(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      {children({
        fields,
        getFieldProps,
        isValid,
        isSubmitting
      })}
      
      {showSubmitButton && (
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="bg-amber-400 hover:bg-amber-500 text-white"
          >
            {isSubmitting ? "Submitting..." : submitButtonText}
          </Button>
        </div>
      )}
    </form>
  )
}

// Field wrapper component for consistent error display
export interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
  htmlFor?: string
}

export function FormField({
  label,
  error,
  required = false,
  children,
  className,
  htmlFor
}: FormFieldProps) {
  const fieldId = htmlFor || React.useId()
  
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {React.cloneElement(children as React.ReactElement, { id: fieldId })}
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <span className="mr-1">⚠</span>
          {error}
        </p>
      )}
    </div>
  )
}

// Input component with validation styling
export interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border px-3 py-2 text-sm transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-gray-500",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error
            ? "border-red-300 focus-visible:ring-red-500"
            : "border-amber-200 focus-visible:ring-amber-500 hover:border-amber-300",
          className
        )}
        {...props}
      />
    )
  }
)
ValidatedInput.displayName = "ValidatedInput"

// Textarea component with validation styling
export interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

export const ValidatedTextarea = React.forwardRef<HTMLTextAreaElement, ValidatedTextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm transition-colors",
          "placeholder:text-gray-500",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error
            ? "border-red-300 focus-visible:ring-red-500"
            : "border-amber-200 focus-visible:ring-amber-500 hover:border-amber-300",
          className
        )}
        {...props}
      />
    )
  }
)
ValidatedTextarea.displayName = "ValidatedTextarea"