import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { ToastContainer, useToast } from '../toast'
import { toast } from '@/lib/toast'

// Test component that uses the toast hook
function TestComponent() {
  const { success, error, warning, info } = useToast()

  return (
    <div>
      <button onClick={() => success('Success message')}>Success</button>
      <button onClick={() => error('Error message')}>Error</button>
      <button onClick={() => warning('Warning message')}>Warning</button>
      <button onClick={() => info('Info message')}>Info</button>
    </div>
  )
}

describe('Toast UI Components', () => {
  beforeEach(() => {
    toast.clear()
  })

  it('should render ToastContainer and display toasts', async () => {
    render(
      <>
        <TestComponent />
        <ToastContainer />
      </>
    )

    const successButton = screen.getByText('Success')
    fireEvent.click(successButton)

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument()
    })

    // Check that the toast has the correct styling
    const toastElement = screen.getByRole('alert')
    expect(toastElement).toHaveClass('bg-green-50', 'border-green-200', 'text-green-800')
  })

  it('should display different toast types with correct styling', async () => {
    render(
      <>
        <TestComponent />
        <ToastContainer />
      </>
    )

    // Test error toast
    const errorButton = screen.getByText('Error')
    fireEvent.click(errorButton)

    await waitFor(() => {
      expect(screen.getByText('Error message')).toBeInTheDocument()
    })

    const errorToast = screen.getByRole('alert')
    expect(errorToast).toHaveClass('bg-red-50', 'border-red-200', 'text-red-800')
  })

  it('should dismiss toast when close button is clicked', async () => {
    render(
      <>
        <TestComponent />
        <ToastContainer />
      </>
    )

    const successButton = screen.getByText('Success')
    fireEvent.click(successButton)

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument()
    })

    const dismissButton = screen.getByLabelText('Dismiss notification')
    fireEvent.click(dismissButton)

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument()
    })
  })

  it('should display multiple toasts', async () => {
    render(
      <>
        <TestComponent />
        <ToastContainer />
      </>
    )

    const successButton = screen.getByText('Success')
    const errorButton = screen.getByText('Error')

    fireEvent.click(successButton)
    fireEvent.click(errorButton)

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument()
      expect(screen.getByText('Error message')).toBeInTheDocument()
    })

    const alerts = screen.getAllByRole('alert')
    expect(alerts).toHaveLength(2)
  })

  it('should auto-dismiss toast after duration', async () => {
    render(
      <>
        <TestComponent />
        <ToastContainer />
      </>
    )

    // Create a toast with short duration
    toast.success('Auto dismiss message', { duration: 100 })

    await waitFor(() => {
      expect(screen.getByText('Auto dismiss message')).toBeInTheDocument()
    })

    // Wait for auto-dismiss
    await waitFor(
      () => {
        expect(screen.queryByText('Auto dismiss message')).not.toBeInTheDocument()
      },
      { timeout: 200 }
    )
  })

  it('should render ToastContainer with correct position classes', async () => {
    render(
      <>
        <TestComponent />
        <ToastContainer position="top-left" />
      </>
    )
    
    // Add a toast so the container renders
    const successButton = screen.getByText('Success')
    fireEvent.click(successButton)
    
    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument()
      const container = document.querySelector('.fixed')
      expect(container).toHaveClass('top-4', 'left-4')
    })
  })

  it('should not render ToastContainer when no toasts exist', () => {
    render(<ToastContainer />)
    
    const container = document.querySelector('.fixed')
    expect(container).not.toBeInTheDocument()
  })
})