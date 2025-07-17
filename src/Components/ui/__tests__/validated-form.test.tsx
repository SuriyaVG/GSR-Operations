import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { ValidatedForm, FormField, ValidatedInput } from '../validated-form'
import { commonRules } from '@/lib/validation'

// Mock the toast hook
vi.mock('../toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  })
}))

interface TestFormData {
  name: string
  quantity: number
  cost: number
}

describe('ValidatedForm', () => {
  const mockOnSubmit = vi.fn()
  
  const initialValues: TestFormData = {
    name: '',
    quantity: 0,
    cost: 0
  }
  
  const validationRules = {
    name: commonRules.name,
    quantity: commonRules.quantity,
    cost: commonRules.cost
  }

  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  it('renders form fields correctly', () => {
    render(
      <ValidatedForm
        initialValues={initialValues}
        validationRules={validationRules}
        onSubmit={mockOnSubmit}
      >
        {({ getFieldProps }) => (
          <>
            <FormField label="Name" required>
              <ValidatedInput {...getFieldProps('name')} placeholder="Enter name" />
            </FormField>
            <FormField label="Quantity" required>
              <ValidatedInput {...getFieldProps('quantity')} type="number" />
            </FormField>
            <FormField label="Cost" required>
              <ValidatedInput {...getFieldProps('cost')} type="number" />
            </FormField>
          </>
        )}
      </ValidatedForm>
    )

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cost/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })

  it('shows validation errors for invalid inputs', async () => {
    render(
      <ValidatedForm
        initialValues={initialValues}
        validationRules={validationRules}
        onSubmit={mockOnSubmit}
        validateOnBlur={true}
      >
        {({ getFieldProps }) => (
          <>
            <FormField label="Name" required error={getFieldProps('name').error}>
              <ValidatedInput {...getFieldProps('name')} placeholder="Enter name" />
            </FormField>
            <FormField label="Quantity" required error={getFieldProps('quantity').error}>
              <ValidatedInput {...getFieldProps('quantity')} type="number" />
            </FormField>
            <FormField label="Cost" required error={getFieldProps('cost').error}>
              <ValidatedInput {...getFieldProps('cost')} type="number" />
            </FormField>
          </>
        )}
      </ValidatedForm>
    )

    const quantityInput = screen.getByLabelText(/quantity/i)
    const costInput = screen.getByLabelText(/cost/i)

    // Test zero quantity validation
    fireEvent.change(quantityInput, { target: { value: '0' } })
    fireEvent.blur(quantityInput)

    // Test zero cost validation
    fireEvent.change(costInput, { target: { value: '0' } })
    fireEvent.blur(costInput)

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid quantity greater than zero/i)).toBeInTheDocument()
      expect(screen.getByText(/Please enter a valid cost greater than zero/i)).toBeInTheDocument()
    })
  })

  it('prevents form submission with invalid data', async () => {
    render(
      <ValidatedForm
        initialValues={initialValues}
        validationRules={validationRules}
        onSubmit={mockOnSubmit}
      >
        {({ getFieldProps }) => (
          <>
            <FormField label="Name" required>
              <ValidatedInput {...getFieldProps('name')} placeholder="Enter name" />
            </FormField>
            <FormField label="Quantity" required>
              <ValidatedInput {...getFieldProps('quantity')} type="number" />
            </FormField>
            <FormField label="Cost" required>
              <ValidatedInput {...getFieldProps('cost')} type="number" />
            </FormField>
          </>
        )}
      </ValidatedForm>
    )

    const submitButton = screen.getByRole('button', { name: /submit/i })
    fireEvent.click(submitButton)

    // Should not call onSubmit with invalid data
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('submits form with valid data', async () => {
    mockOnSubmit.mockResolvedValue(undefined)

    render(
      <ValidatedForm
        initialValues={initialValues}
        validationRules={validationRules}
        onSubmit={mockOnSubmit}
      >
        {({ getFieldProps }) => (
          <>
            <FormField label="Name" required>
              <ValidatedInput {...getFieldProps('name')} placeholder="Enter name" />
            </FormField>
            <FormField label="Quantity" required>
              <ValidatedInput {...getFieldProps('quantity')} type="number" />
            </FormField>
            <FormField label="Cost" required>
              <ValidatedInput {...getFieldProps('cost')} type="number" />
            </FormField>
          </>
        )}
      </ValidatedForm>
    )

    // Fill in valid data
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test Product' } })
    fireEvent.change(screen.getByLabelText(/quantity/i), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(/cost/i), { target: { value: '10.99' } })

    const submitButton = screen.getByRole('button', { name: /submit/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Test Product',
        quantity: '5',
        cost: '10.99'
      })
    })
  })

  it('disables submit button when form is invalid', () => {
    render(
      <ValidatedForm
        initialValues={initialValues}
        validationRules={validationRules}
        onSubmit={mockOnSubmit}
      >
        {({ getFieldProps }) => (
          <>
            <FormField label="Name" required>
              <ValidatedInput {...getFieldProps('name')} placeholder="Enter name" />
            </FormField>
          </>
        )}
      </ValidatedForm>
    )

    const submitButton = screen.getByRole('button', { name: /submit/i })
    expect(submitButton).toBeDisabled()
  })
})