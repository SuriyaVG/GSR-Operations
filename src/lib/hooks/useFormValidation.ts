import React, { useState, useCallback } from 'react'
import { type ValidationRule, validateField, validateForm, type ValidationError } from '../validation'

export interface UseFormValidationOptions {
  validateOnChange?: boolean
  validateOnBlur?: boolean
}

export interface FormField {
  value: any
  error?: string
  touched: boolean
}

export interface UseFormValidationReturn<T> {
  fields: Record<keyof T, FormField>
  errors: ValidationError[]
  isValid: boolean
  setValue: (field: keyof T, value: any) => void
  setError: (field: keyof T, error: string) => void
  clearError: (field: keyof T) => void
  clearAllErrors: () => void
  validateField: (field: keyof T) => boolean
  validateForm: () => boolean
  handleChange: (field: keyof T) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  handleBlur: (field: keyof T) => () => void
  reset: (initialValues?: Partial<T>) => void
  getFieldProps: (field: keyof T) => {
    value: any
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
    onBlur: () => void
    error?: string
  }
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Record<keyof T, ValidationRule>,
  options: UseFormValidationOptions = {}
): UseFormValidationReturn<T> {
  const { validateOnChange = false, validateOnBlur = true } = options

  // Initialize form fields
  const initializeFields = useCallback((values: T) => {
    const fields: Record<keyof T, FormField> = {} as Record<keyof T, FormField>
    Object.keys(values).forEach(key => {
      fields[key as keyof T] = {
        value: values[key as keyof T],
        touched: false
      }
    })
    return fields
  }, [])

  const [fields, setFields] = useState<Record<keyof T, FormField>>(() => 
    initializeFields(initialValues)
  )

  // Get current form data
  const getFormData = useCallback(() => {
    const data: Record<string, any> = {}
    Object.keys(fields).forEach(key => {
      data[key] = fields[key as keyof T].value
    })
    return data
  }, [fields])

  // Validate entire form
  const validateFormData = useCallback(() => {
    const data = getFormData()
    const result = validateForm(data, validationRules)
    
    // Update field errors
    setFields(prev => {
      const updated = { ...prev }
      
      // Clear all errors first
      Object.keys(updated).forEach(key => {
        updated[key as keyof T] = {
          ...updated[key as keyof T],
          error: undefined
        }
      })
      
      // Set new errors
      result.errors.forEach(error => {
        if (updated[error.field as keyof T]) {
          updated[error.field as keyof T] = {
            ...updated[error.field as keyof T],
            error: error.message
          }
        }
      })
      
      return updated
    })
    
    return result.isValid
  }, [getFormData, validationRules])

  // Validate single field
  const validateSingleField = useCallback((field: keyof T) => {
    const fieldValue = fields[field]?.value
    const rule = validationRules[field]
    
    if (!rule) return true
    
    const error = validateField(fieldValue, rule)
    
    setFields(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        error
      }
    }))
    
    return !error
  }, [fields, validationRules])

  // Set field value
  const setValue = useCallback((field: keyof T, value: any) => {
    setFields(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        value,
        touched: true
      }
    }))
    
    if (validateOnChange) {
      // Validate after state update
      setTimeout(() => validateSingleField(field), 0)
    }
  }, [validateOnChange, validateSingleField])

  // Set field error
  const setError = useCallback((field: keyof T, error: string) => {
    setFields(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        error
      }
    }))
  }, [])

  // Clear field error
  const clearError = useCallback((field: keyof T) => {
    setFields(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        error: undefined
      }
    }))
  }, [])

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setFields(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(key => {
        updated[key as keyof T] = {
          ...updated[key as keyof T],
          error: undefined
        }
      })
      return updated
    })
  }, [])

  // Handle input change
  const handleChange = useCallback((field: keyof T) => 
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setValue(field, event.target.value)
    }, [setValue])

  // Handle input blur
  const handleBlur = useCallback((field: keyof T) => () => {
    setFields(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        touched: true
      }
    }))
    
    if (validateOnBlur) {
      validateSingleField(field)
    }
  }, [validateOnBlur, validateSingleField])

  // Reset form
  const reset = useCallback((newInitialValues?: Partial<T>) => {
    const values = newInitialValues ? { ...initialValues, ...newInitialValues } : initialValues
    setFields(initializeFields(values))
  }, [initialValues, initializeFields])

  // Get field props for easy integration
  const getFieldProps = useCallback((field: keyof T) => ({
    value: fields[field]?.value || '',
    onChange: handleChange(field),
    onBlur: handleBlur(field),
    error: fields[field]?.error
  }), [fields, handleChange, handleBlur])

  // Compute derived state
  const errors = Object.keys(fields)
    .filter(key => fields[key as keyof T].error)
    .map(key => ({
      field: key,
      message: fields[key as keyof T].error!
    }))

  // Check if form is valid by validating all fields against rules
  const isValid = React.useMemo(() => {
    const formData = Object.keys(fields).reduce((acc, key) => {
      acc[key as keyof T] = fields[key as keyof T].value
      return acc
    }, {} as T)
    
    const result = validateForm(formData, validationRules)
    return result.isValid
  }, [fields, validationRules])

  return {
    fields,
    errors,
    isValid,
    setValue,
    setError,
    clearError,
    clearAllErrors,
    validateField: validateSingleField,
    validateForm: validateFormData,
    handleChange,
    handleBlur,
    reset,
    getFieldProps
  }
}