import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EmptyState } from '../empty-state'
import { Package } from 'lucide-react'

describe('EmptyState', () => {
  const defaultProps = {
    icon: Package,
    title: 'No items found',
    description: 'There are no items to display at the moment.'
  }

  it('renders with required props', () => {
    render(<EmptyState {...defaultProps} />)
    
    expect(screen.getByText('No items found')).toBeInTheDocument()
    expect(screen.getByText('There are no items to display at the moment.')).toBeInTheDocument()
  })

  it('renders icon with amber styling', () => {
    const { container } = render(<EmptyState {...defaultProps} />)
    
    const iconContainer = container.querySelector('.bg-amber-50.border-amber-200')
    expect(iconContainer).toBeInTheDocument()
    
    const icon = container.querySelector('.text-amber-400')
    expect(icon).toBeInTheDocument()
  })

  it('renders action button when provided', () => {
    const mockAction = {
      label: 'Add Item',
      onClick: vi.fn()
    }
    
    render(<EmptyState {...defaultProps} action={mockAction} />)
    
    const button = screen.getByRole('button', { name: 'Add Item' })
    expect(button).toBeInTheDocument()
  })

  it('calls action onClick when button is clicked', () => {
    const mockAction = {
      label: 'Add Item',
      onClick: vi.fn()
    }
    
    render(<EmptyState {...defaultProps} action={mockAction} />)
    
    const button = screen.getByRole('button', { name: 'Add Item' })
    fireEvent.click(button)
    
    expect(mockAction.onClick).toHaveBeenCalledTimes(1)
  })

  it('applies custom className', () => {
    const { container } = render(
      <EmptyState {...defaultProps} className="custom-class" />
    )
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('renders different button variants', () => {
    const mockAction = {
      label: 'Add Item',
      onClick: vi.fn(),
      variant: 'outline' as const
    }
    
    render(<EmptyState {...defaultProps} action={mockAction} />)
    
    const button = screen.getByRole('button', { name: 'Add Item' })
    expect(button).toBeInTheDocument()
  })
})