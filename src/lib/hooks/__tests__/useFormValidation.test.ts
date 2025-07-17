import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useFormValidation } from '../useFormValidation'
import { commonRules, validators } from '../../validation'

interface TestFormData {
  name: string
  quantity: number
  cost: number
  description: string
}

describe('useFormValidation', () => {
  const initialValues: TestFormData = {
    name: '',
    quantity: 0,
    cost: 0,
    description: ''
  }

  const validationRules = {
    name: commonRules.name,
    quantity: commonRules.quantity,
    cost: commonRules.cost,
    description: commonRules.description
  }

  it('should initialize with correct initial values', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    )

    expect(result.current.fields.name.value).toBe('')
    expect(result.current.fields.quantity.value).toBe(0)
    expect(result.current.fields.cost.value).toBe(0)
    expect(result.current.fields.description.value).toBe('')
    
    // Form should be invalid initially due to required fields
    expect(result.current.isValid).toBe(false)
  })

  it('should update field values correctly', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    )

    act(() => {
      result.current.setValue('name', 'Test Product')
      result.current.setValue('quantity', 5)
      result.current.setValue('cost', 10.99)
    })

    expect(result.current.fields.name.value).toBe('Test Product')
    expect(result.current.fields.quantity.value).toBe(5)
    expect(result.current.fields.cost.value).toBe(10.99)
  })

  it('should validate form correctly', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    )

    // Initially invalid
    expect(result.current.isValid).toBe(false)

    // Set valid values
    act(() => {
      result.current.setValue('name', 'Test Product')
      result.current.setValue('quantity', 5)
      result.current.setValue('cost', 10.99)
    })

    // Should be valid now
    expect(result.current.isValid).toBe(true)
  })

  it('should prevent zero quantities', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    )

    act(() => {
      result.current.setValue('name', 'Test Product')
      result.current.setValue('quantity', 0) // Invalid quantity
      result.current.setValue('cost', 10.99)
    })

    expect(result.current.isValid).toBe(false)
  })

  it('should prevent negative quantities', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    )

    act(() => {
      result.current.setValue('name', 'Test Product')
      result.current.setValue('quantity', -1) // Invalid quantity
      result.current.setValue('cost', 10.99)
    })

    expect(result.current.isValid).toBe(false)
  })

  it('should prevent zero costs', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    )

    act(() => {
      result.current.setValue('name', 'Test Product')
      result.current.setValue('quantity', 5)
      result.current.setValue('cost', 0) // Invalid cost
    })

    expect(result.current.isValid).toBe(false)
  })

  it('should prevent negative costs', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    )

    act(() => {
      result.current.setValue('name', 'Test Product')
      result.current.setValue('quantity', 5)
      result.current.setValue('cost', -10.99) // Invalid cost
    })

    expect(result.current.isValid).toBe(false)
  })

  it('should validate individual fields', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    )

    act(() => {
      result.current.setValue('quantity', 0)
      result.current.validateField('quantity')
    })

    expect(result.current.fields.quantity.error).toBe('Please enter a valid quantity greater than zero')
  })

  it('should clear field errors', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    )

    act(() => {
      result.current.setValue('quantity', 0)
      result.current.validateField('quantity')
    })

    expect(result.current.fields.quantity.error).toBeDefined()

    act(() => {
      result.current.clearError('quantity')
    })

    expect(result.current.fields.quantity.error).toBeUndefined()
  })

  it('should clear all errors', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    )

    act(() => {
      result.current.setValue('quantity', 0)
      result.current.setValue('cost', 0)
      result.current.validateField('quantity')
      result.current.validateField('cost')
    })

    expect(result.current.fields.quantity.error).toBeDefined()
    expect(result.current.fields.cost.error).toBeDefined()

    act(() => {
      result.current.clearAllErrors()
    })

    expect(result.current.fields.quantity.error).toBeUndefined()
    expect(result.current.fields.cost.error).toBeUndefined()
  })

  it('should reset form to initial values', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    )

    act(() => {
      result.current.setValue('name', 'Test Product')
      result.current.setValue('quantity', 5)
      result.current.setValue('cost', 10.99)
    })

    expect(result.current.fields.name.value).toBe('Test Product')

    act(() => {
      result.current.reset()
    })

    expect(result.current.fields.name.value).toBe('')
    expect(result.current.fields.quantity.value).toBe(0)
    expect(result.current.fields.cost.value).toBe(0)
  })

  it('should provide field props for easy integration', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules)
    )

    const nameProps = result.current.getFieldProps('name')

    expect(nameProps).toHaveProperty('value')
    expect(nameProps).toHaveProperty('onChange')
    expect(nameProps).toHaveProperty('onBlur')
    expect(nameProps).toHaveProperty('error')
  })

  it('should validate on blur when enabled', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules, { validateOnBlur: true })
    )

    act(() => {
      result.current.setValue('quantity', 0)
      result.current.handleBlur('quantity')()
    })

    expect(result.current.fields.quantity.error).toBe('Please enter a valid quantity greater than zero')
  })

  it('should validate on change when enabled', async () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationRules, { validateOnChange: true })
    )

    act(() => {
      result.current.setValue('quantity', 0)
    })

    // Wait for async validation to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    expect(result.current.fields.quantity.error).toBe('Please enter a valid quantity greater than zero')
  })
})