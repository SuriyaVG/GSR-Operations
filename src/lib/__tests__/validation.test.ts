import { describe, it, expect } from 'vitest'
import { validators, validateField, validateForm, commonRules } from '../validation'

describe('Validation System', () => {
  describe('validators', () => {
    it('should validate positive numbers correctly', () => {
      const validator = validators.positiveNumber()
      
      expect(validator('5')).toBeUndefined()
      expect(validator('0')).toBe('Please enter a positive number')
      expect(validator('-1')).toBe('Please enter a positive number')
      expect(validator('abc')).toBe('Please enter a positive number')
    })

    it('should validate non-zero positive values', () => {
      const validator = validators.nonZeroPositive()
      
      expect(validator('5')).toBeUndefined()
      expect(validator(10)).toBeUndefined()
      expect(validator('0')).toBe('Value must be greater than zero')
      expect(validator(0)).toBe('Value must be greater than zero')
      expect(validator('-1')).toBe('Value must be greater than zero')
    })

    it('should validate quantities correctly', () => {
      const validator = validators.quantity()
      
      expect(validator('5')).toBeUndefined()
      expect(validator(10)).toBeUndefined()
      expect(validator('0')).toBe('Please enter a valid quantity greater than zero')
      expect(validator('-1')).toBe('Please enter a valid quantity greater than zero')
      expect(validator('1.5')).toBe('Please enter a valid quantity greater than zero') // Should be integer
    })

    it('should validate costs correctly', () => {
      const validator = validators.cost()
      
      expect(validator('5.99')).toBeUndefined()
      expect(validator(10.50)).toBeUndefined()
      expect(validator('0')).toBe('Please enter a valid cost greater than zero')
      expect(validator('-1')).toBe('Please enter a valid cost greater than zero')
    })

    it('should validate non-negative values', () => {
      const validator = validators.nonNegative()
      
      expect(validator('0')).toBeUndefined()
      expect(validator('5')).toBeUndefined()
      expect(validator(10)).toBeUndefined()
      expect(validator('-1')).toBe('Value cannot be negative')
    })
  })

  describe('validateField', () => {
    it('should validate required fields', () => {
      const rule = { required: true }
      
      expect(validateField('', rule)).toBe('This field is required')
      expect(validateField(null, rule)).toBe('This field is required')
      expect(validateField(undefined, rule)).toBe('This field is required')
      expect(validateField('value', rule)).toBeUndefined()
    })

    it('should validate custom rules', () => {
      const rule = { custom: validators.quantity() }
      
      expect(validateField('5', rule)).toBeUndefined()
      expect(validateField('0', rule)).toBe('Please enter a valid quantity greater than zero')
      expect(validateField('-1', rule)).toBe('Please enter a valid quantity greater than zero')
    })
  })

  describe('validateForm', () => {
    it('should validate entire form', () => {
      const data = {
        name: '',
        quantity: '0',
        cost: '5.99'
      }
      
      const rules = {
        name: { required: true },
        quantity: { custom: validators.quantity() },
        cost: { custom: validators.cost() }
      }
      
      const result = validateForm(data, rules)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(2)
      expect(result.errors[0].field).toBe('name')
      expect(result.errors[1].field).toBe('quantity')
    })

    it('should pass validation for valid form', () => {
      const data = {
        name: 'John Doe',
        quantity: '5',
        cost: '10.99'
      }
      
      const rules = {
        name: { required: true },
        quantity: { custom: validators.quantity() },
        cost: { custom: validators.cost() }
      }
      
      const result = validateForm(data, rules)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('commonRules', () => {
    it('should have quantity rule that prevents zero/negative values', () => {
      const rule = commonRules.quantity
      
      expect(validateField('5', rule)).toBeUndefined()
      expect(validateField('0', rule)).toBe('Please enter a valid quantity greater than zero')
      expect(validateField('', rule)).toBe('This field is required')
    })

    it('should have cost rule that prevents zero/negative values', () => {
      const rule = commonRules.cost
      
      expect(validateField('5.99', rule)).toBeUndefined()
      expect(validateField('0', rule)).toBe('Please enter a valid cost greater than zero')
      expect(validateField('', rule)).toBe('This field is required')
    })
  })
})