// Form validation utilities and hooks

export interface ValidationRule {
  required?: boolean | string
  minLength?: number | { value: number; message: string }
  maxLength?: number | { value: number; message: string }
  pattern?: RegExp | { value: RegExp; message: string }
  custom?: (value: any) => string | undefined
}

export interface ValidationError {
  field: string
  message: string
}

export interface FormValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

// Built-in validation functions
export const validators = {
  required: (message = "This field is required") => (value: any): string | undefined => {
    if (value === null || value === undefined || value === "" || 
        (Array.isArray(value) && value.length === 0)) {
      return message
    }
    return undefined
  },

  minLength: (min: number, message?: string) => (value: string): string | undefined => {
    if (value && value.length < min) {
      return message || `Must be at least ${min} characters`
    }
    return undefined
  },

  maxLength: (max: number, message?: string) => (value: string): string | undefined => {
    if (value && value.length > max) {
      return message || `Must be no more than ${max} characters`
    }
    return undefined
  },

  email: (message = "Please enter a valid email address") => (value: string): string | undefined => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return message
    }
    return undefined
  },

  pattern: (regex: RegExp, message = "Invalid format") => (value: string): string | undefined => {
    if (value && !regex.test(value)) {
      return message
    }
    return undefined
  },

  number: (message = "Please enter a valid number") => (value: string): string | undefined => {
    if (value && isNaN(Number(value))) {
      return message
    }
    return undefined
  },

  positiveNumber: (message = "Please enter a positive number") => (value: string): string | undefined => {
    if (value && (isNaN(Number(value)) || Number(value) <= 0)) {
      return message
    }
    return undefined
  },

  nonZeroPositive: (message = "Value must be greater than zero") => (value: string | number): string | undefined => {
    const numValue = typeof value === 'string' ? Number(value) : value
    if (numValue !== undefined && numValue !== null && numValue !== '' && (isNaN(numValue) || numValue <= 0)) {
      return message
    }
    return undefined
  },

  nonNegative: (message = "Value cannot be negative") => (value: string | number): string | undefined => {
    const numValue = typeof value === 'string' ? Number(value) : value
    if (numValue !== undefined && numValue !== null && numValue !== '' && (isNaN(numValue) || numValue < 0)) {
      return message
    }
    return undefined
  },

  quantity: (message = "Please enter a valid quantity greater than zero") => (value: string | number): string | undefined => {
    const numValue = typeof value === 'string' ? Number(value) : value
    if (numValue !== undefined && numValue !== null && numValue !== '') {
      if (isNaN(numValue) || numValue <= 0 || !Number.isInteger(numValue)) {
        return message
      }
    }
    return undefined
  },

  cost: (message = "Please enter a valid cost greater than zero") => (value: string | number): string | undefined => {
    const numValue = typeof value === 'string' ? Number(value) : value
    if (numValue !== undefined && numValue !== null && numValue !== '') {
      if (isNaN(numValue) || numValue <= 0) {
        return message
      }
    }
    return undefined
  }
}

// Validate a single field
export function validateField(value: any, rules: ValidationRule): string | undefined {
  // Required validation
  if (rules.required) {
    const message = typeof rules.required === 'string' ? rules.required : 'This field is required'
    const error = validators.required(message)(value)
    if (error) return error
  }

  // Skip other validations if field is empty and not required
  if (!value && !rules.required) return undefined

  // Min length validation
  if (rules.minLength) {
    const config = typeof rules.minLength === 'number' 
      ? { value: rules.minLength, message: `Must be at least ${rules.minLength} characters` }
      : rules.minLength
    const error = validators.minLength(config.value, config.message)(value)
    if (error) return error
  }

  // Max length validation
  if (rules.maxLength) {
    const config = typeof rules.maxLength === 'number'
      ? { value: rules.maxLength, message: `Must be no more than ${rules.maxLength} characters` }
      : rules.maxLength
    const error = validators.maxLength(config.value, config.message)(value)
    if (error) return error
  }

  // Pattern validation
  if (rules.pattern) {
    const config = rules.pattern instanceof RegExp
      ? { value: rules.pattern, message: 'Invalid format' }
      : rules.pattern
    const error = validators.pattern(config.value, config.message)(value)
    if (error) return error
  }

  // Custom validation
  if (rules.custom) {
    const error = rules.custom(value)
    if (error) return error
  }

  return undefined
}

// Validate entire form
export function validateForm(
  data: Record<string, any>, 
  rules: Record<string, ValidationRule>
): FormValidationResult {
  const errors: ValidationError[] = []

  Object.keys(rules).forEach(field => {
    const error = validateField(data[field], rules[field])
    if (error) {
      errors.push({ field, message: error })
    }
  })

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Common validation rule sets
export const commonRules = {
  email: {
    required: true,
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "Please enter a valid email address"
    }
  },
  
  password: {
    required: true,
    minLength: {
      value: 8,
      message: "Password must be at least 8 characters"
    }
  },
  
  name: {
    required: true,
    minLength: {
      value: 2,
      message: "Name must be at least 2 characters"
    },
    maxLength: {
      value: 50,
      message: "Name must be no more than 50 characters"
    }
  },
  
  description: {
    maxLength: {
      value: 500,
      message: "Description must be no more than 500 characters"
    }
  },

  quantity: {
    required: true,
    custom: validators.quantity("Please enter a valid quantity greater than zero")
  },

  cost: {
    required: true,
    custom: validators.cost("Please enter a valid cost greater than zero")
  },

  unitPrice: {
    required: true,
    custom: validators.cost("Please enter a valid unit price greater than zero")
  },

  optionalQuantity: {
    custom: validators.nonZeroPositive("Quantity must be greater than zero if provided")
  },

  optionalCost: {
    custom: validators.nonNegative("Cost cannot be negative")
  }
}