import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toast } from '../toast'

describe('Toast Service', () => {
  beforeEach(() => {
    // Clear all toasts before each test
    toast.clear()
  })

  it('should create success toast', () => {
    const id = toast.success('Success message')
    
    expect(id).toBeDefined()
    expect(typeof id).toBe('string')
    
    const toasts = toast.getAll()
    expect(toasts).toHaveLength(1)
    expect(toasts[0].type).toBe('success')
    expect(toasts[0].message).toBe('Success message')
  })

  it('should create error toast', () => {
    const id = toast.error('Error message')
    
    expect(id).toBeDefined()
    const toasts = toast.getAll()
    expect(toasts).toHaveLength(1)
    expect(toasts[0].type).toBe('error')
    expect(toasts[0].message).toBe('Error message')
  })

  it('should create warning toast', () => {
    const id = toast.warning('Warning message')
    
    expect(id).toBeDefined()
    const toasts = toast.getAll()
    expect(toasts).toHaveLength(1)
    expect(toasts[0].type).toBe('warning')
    expect(toasts[0].message).toBe('Warning message')
  })

  it('should create info toast', () => {
    const id = toast.info('Info message')
    
    expect(id).toBeDefined()
    const toasts = toast.getAll()
    expect(toasts).toHaveLength(1)
    expect(toasts[0].type).toBe('info')
    expect(toasts[0].message).toBe('Info message')
  })

  it('should dismiss specific toast', () => {
    const id1 = toast.success('Message 1')
    const id2 = toast.error('Message 2')
    
    expect(toast.getAll()).toHaveLength(2)
    
    toast.dismiss(id1)
    
    const remainingToasts = toast.getAll()
    expect(remainingToasts).toHaveLength(1)
    expect(remainingToasts[0].id).toBe(id2)
  })

  it('should clear all toasts', () => {
    toast.success('Message 1')
    toast.error('Message 2')
    toast.warning('Message 3')
    
    expect(toast.getAll()).toHaveLength(3)
    
    toast.clear()
    
    expect(toast.getAll()).toHaveLength(0)
  })

  it('should auto-dismiss toast after duration', (done) => {
    const id = toast.success('Auto dismiss message', { duration: 100 })
    
    expect(toast.getAll()).toHaveLength(1)
    
    setTimeout(() => {
      expect(toast.getAll()).toHaveLength(0)
      done()
    }, 150)
  })

  it('should not auto-dismiss when duration is 0', (done) => {
    const id = toast.success('Persistent message', { duration: 0 })
    
    expect(toast.getAll()).toHaveLength(1)
    
    setTimeout(() => {
      expect(toast.getAll()).toHaveLength(1)
      done()
    }, 100)
  })

  it('should notify subscribers when toasts change', () => {
    const mockListener = vi.fn()
    
    const unsubscribe = toast.subscribe(mockListener)
    
    toast.success('Test message')
    
    expect(mockListener).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'success',
          message: 'Test message'
        })
      ])
    )
    
    unsubscribe()
  })

  it('should unsubscribe listeners correctly', () => {
    const mockListener = vi.fn()
    
    const unsubscribe = toast.subscribe(mockListener)
    unsubscribe()
    
    toast.success('Test message')
    
    expect(mockListener).not.toHaveBeenCalled()
  })

  it('should set default options correctly', () => {
    const id = toast.success('Test message')
    const toasts = toast.getAll()
    
    expect(toasts[0].options).toEqual({
      duration: 5000,
      position: 'top-right',
      dismissible: true
    })
  })

  it('should override default options', () => {
    const id = toast.success('Test message', {
      duration: 10000,
      position: 'bottom-left',
      dismissible: false
    })
    
    const toasts = toast.getAll()
    
    expect(toasts[0].options).toEqual({
      duration: 10000,
      position: 'bottom-left',
      dismissible: false
    })
  })
})