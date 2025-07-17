import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { 
  Skeleton, 
  TableSkeleton, 
  CardSkeleton, 
  FormSkeleton 
} from '../skeleton'

describe('Skeleton Components', () => {
  describe('Skeleton', () => {
    it('renders with default classes', () => {
      render(<Skeleton data-testid="skeleton" />)
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('rounded-md', 'bg-gradient-to-r', 'from-amber-100', 'via-amber-50', 'to-amber-100')
    })

    it('accepts custom className', () => {
      render(<Skeleton className="custom-class" data-testid="skeleton" />)
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('custom-class')
    })
  })

  describe('TableSkeleton', () => {
    it('renders with default rows and columns', () => {
      render(<TableSkeleton />)
      // Should render 5 rows by default (plus header)
      const rows = screen.getAllByRole('generic').filter(el => 
        el.className.includes('flex space-x-4')
      )
      expect(rows).toHaveLength(6) // 1 header + 5 rows
    })

    it('renders with custom rows and columns', () => {
      render(<TableSkeleton rows={3} columns={2} />)
      const rows = screen.getAllByRole('generic').filter(el => 
        el.className.includes('flex space-x-4')
      )
      expect(rows).toHaveLength(4) // 1 header + 3 rows
    })
  })

  describe('CardSkeleton', () => {
    it('renders default variant', () => {
      const { container } = render(<CardSkeleton />)
      expect(container.firstChild).toHaveClass('bg-white/80', 'backdrop-blur-sm', 'border', 'border-amber-200/20')
    })

    it('renders compact variant', () => {
      const { container } = render(<CardSkeleton variant="compact" />)
      // Should have a circular skeleton for compact variant
      const circularSkeleton = container.querySelector('.h-8.w-8.rounded-full')
      expect(circularSkeleton).toBeInTheDocument()
    })

    it('renders detailed variant', () => {
      const { container } = render(<CardSkeleton variant="detailed" />)
      // Detailed variant should have border-t class
      const borderElement = container.querySelector('.border-t')
      expect(borderElement).toBeInTheDocument()
    })
  })

  describe('FormSkeleton', () => {
    it('renders with default number of fields', () => {
      render(<FormSkeleton />)
      // Should render 4 fields by default
      const fieldContainers = screen.getAllByRole('generic').filter(el => 
        el.className.includes('space-y-2') && !el.className.includes('space-y-6')
      )
      expect(fieldContainers).toHaveLength(4)
    })

    it('renders with custom number of fields', () => {
      render(<FormSkeleton fields={2} />)
      const fieldContainers = screen.getAllByRole('generic').filter(el => 
        el.className.includes('space-y-2') && !el.className.includes('space-y-6')
      )
      expect(fieldContainers).toHaveLength(2)
    })

    it('renders action buttons', () => {
      const { container } = render(<FormSkeleton />)
      // Should have button skeletons in the footer
      const buttonArea = container.querySelector('.flex.justify-end.space-x-2')
      expect(buttonArea).toBeInTheDocument()
    })
  })
})