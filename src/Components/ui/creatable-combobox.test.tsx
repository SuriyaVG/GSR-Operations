import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { CreatableCombobox, type CreatableComboboxOption } from './creatable-combobox'

// Mock data
const mockOptions: CreatableComboboxOption[] = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3' }
]

describe('CreatableCombobox', () => {
  const mockOnSelect = vi.fn()
  const mockOnCreate = vi.fn()

  beforeEach(() => {
    mockOnSelect.mockClear()
    mockOnCreate.mockClear()
  })

  it('renders with placeholder text', () => {
    render(
      <CreatableCombobox
        options={mockOptions}
        onSelect={mockOnSelect}
        onCreate={mockOnCreate}
        placeholder="Select an option..."
      />
    )

    expect(screen.getByText('Select an option...')).toBeInTheDocument()
  })

  it('opens dropdown when clicked', () => {
    render(
      <CreatableCombobox
        options={mockOptions}
        onSelect={mockOnSelect}
        onCreate={mockOnCreate}
      />
    )

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
    expect(screen.getByText('Option 1')).toBeInTheDocument()
    expect(screen.getByText('Option 2')).toBeInTheDocument()
    expect(screen.getByText('Option 3')).toBeInTheDocument()
  })

  it('filters options based on search input', async () => {
    render(
      <CreatableCombobox
        options={mockOptions}
        onSelect={mockOnSelect}
        onCreate={mockOnCreate}
      />
    )

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.change(searchInput, { target: { value: 'Option 1' } })

    await waitFor(() => {
      expect(screen.getByText('Option 1')).toBeInTheDocument()
      expect(screen.queryByText('Option 2')).not.toBeInTheDocument()
      expect(screen.queryByText('Option 3')).not.toBeInTheDocument()
    })
  })

  it('calls onSelect when option is clicked', () => {
    render(
      <CreatableCombobox
        options={mockOptions}
        onSelect={mockOnSelect}
        onCreate={mockOnCreate}
      />
    )

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    const option = screen.getByText('Option 1')
    fireEvent.click(option)

    expect(mockOnSelect).toHaveBeenCalledWith(mockOptions[0])
  })

  it('shows create button when no options match search', () => {
    render(
      <CreatableCombobox
        options={mockOptions}
        onSelect={mockOnSelect}
        onCreate={mockOnCreate}
      />
    )

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.change(searchInput, { target: { value: 'New Option' } })

    expect(screen.getByText('No options found')).toBeInTheDocument()
    expect(screen.getByText('+ Add new')).toBeInTheDocument()
  })

  it('opens create modal when create button is clicked', () => {
    render(
      <CreatableCombobox
        options={mockOptions}
        onSelect={mockOnSelect}
        onCreate={mockOnCreate}
      />
    )

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    const createButton = screen.getByText('+ Add new')
    fireEvent.click(createButton)

    expect(screen.getByText('Create New Item')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
  })

  it('calls onCreate when create form is submitted', async () => {
    const newOption = { value: '4', label: 'New Option' }
    mockOnCreate.mockResolvedValue(newOption)

    render(
      <CreatableCombobox
        options={mockOptions}
        onSelect={mockOnSelect}
        onCreate={mockOnCreate}
      />
    )

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    const createButton = screen.getByText('+ Add new')
    fireEvent.click(createButton)

    const nameInput = screen.getByLabelText('Name')
    fireEvent.change(nameInput, { target: { value: 'New Option' } })

    const submitButton = screen.getByText('Create')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnCreate).toHaveBeenCalledWith('New Option')
      expect(mockOnSelect).toHaveBeenCalledWith(newOption)
    })
  })

  it('displays selected value', () => {
    render(
      <CreatableCombobox
        options={mockOptions}
        value={mockOptions[0]}
        onSelect={mockOnSelect}
        onCreate={mockOnCreate}
      />
    )

    expect(screen.getByText('Option 1')).toBeInTheDocument()
  })

  it('is disabled when disabled prop is true', () => {
    render(
      <CreatableCombobox
        options={mockOptions}
        onSelect={mockOnSelect}
        onCreate={mockOnCreate}
        disabled={true}
      />
    )

    const trigger = screen.getByRole('combobox')
    expect(trigger).toBeDisabled()
  })

  describe('Keyboard Navigation', () => {
    it('opens dropdown with arrow down key', async () => {
      const user = userEvent.setup()
      render(
        <CreatableCombobox
          options={mockOptions}
          onSelect={mockOnSelect}
          onCreate={mockOnCreate}
        />
      )

      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      await user.keyboard('{ArrowDown}')

      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
    })

    it('navigates through options with arrow keys', async () => {
      const user = userEvent.setup()
      render(
        <CreatableCombobox
          options={mockOptions}
          onSelect={mockOnSelect}
          onCreate={mockOnCreate}
        />
      )

      const trigger = screen.getByRole('combobox')
      await user.click(trigger)

      const searchInput = screen.getByPlaceholderText('Search...')
      
      // Navigate down through options
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')
      
      // The second option should be highlighted
      const option2 = screen.getByText('Option 2')
      expect(option2.closest('button')).toHaveClass('bg-amber-50')
    })

    it('selects option with Enter key', async () => {
      const user = userEvent.setup()
      render(
        <CreatableCombobox
          options={mockOptions}
          onSelect={mockOnSelect}
          onCreate={mockOnCreate}
        />
      )

      const trigger = screen.getByRole('combobox')
      await user.click(trigger)

      const searchInput = screen.getByPlaceholderText('Search...')
      
      // Navigate to first option and select with Enter
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Enter}')

      expect(mockOnSelect).toHaveBeenCalledWith(mockOptions[0])
    })

    it('closes dropdown with Escape key', async () => {
      const user = userEvent.setup()
      render(
        <CreatableCombobox
          options={mockOptions}
          onSelect={mockOnSelect}
          onCreate={mockOnCreate}
        />
      )

      const trigger = screen.getByRole('combobox')
      await user.click(trigger)

      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()

      const searchInput = screen.getByPlaceholderText('Search...')
      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument()
      })
    })

    it('navigates to create option with arrow keys', async () => {
      const user = userEvent.setup()
      render(
        <CreatableCombobox
          options={mockOptions}
          onSelect={mockOnSelect}
          onCreate={mockOnCreate}
        />
      )

      const trigger = screen.getByRole('combobox')
      await user.click(trigger)

      const searchInput = screen.getByPlaceholderText('Search...')
      
      // Navigate past all options to create button
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')
      
      // The create button should be highlighted
      const createButton = screen.getByText('+ Add new')
      expect(createButton.closest('button')).toHaveClass('bg-amber-50')
    })

    it('opens create modal with Enter on create option', async () => {
      const user = userEvent.setup()
      render(
        <CreatableCombobox
          options={mockOptions}
          onSelect={mockOnSelect}
          onCreate={mockOnCreate}
        />
      )

      const trigger = screen.getByRole('combobox')
      await user.click(trigger)

      const searchInput = screen.getByPlaceholderText('Search...')
      
      // Navigate to create option and press Enter
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Enter}')

      expect(screen.getByText('Create New Item')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <CreatableCombobox
          options={mockOptions}
          onSelect={mockOnSelect}
          onCreate={mockOnCreate}
        />
      )

      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')

      fireEvent.click(trigger)

      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      expect(trigger).toHaveAttribute('aria-controls', 'combobox-options')
    })

    it('has proper option roles and attributes', () => {
      render(
        <CreatableCombobox
          options={mockOptions}
          value={mockOptions[0]}
          onSelect={mockOnSelect}
          onCreate={mockOnCreate}
        />
      )

      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)

      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(3)

      // Check that selected option has aria-selected="true"
      const selectedOption = options.find(option => 
        option.getAttribute('aria-selected') === 'true'
      )
      expect(selectedOption).toHaveAttribute('aria-selected', 'true')
      expect(selectedOption).toHaveAttribute('id', 'option-1')
    })

    it('has proper listbox role and label', () => {
      render(
        <CreatableCombobox
          options={mockOptions}
          onSelect={mockOnSelect}
          onCreate={mockOnCreate}
        />
      )

      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)

      const listbox = screen.getByRole('listbox')
      expect(listbox).toHaveAttribute('aria-label', 'Options')
      expect(listbox).toHaveAttribute('id', 'combobox-options')
    })

    it('has proper aria-label for create button', () => {
      render(
        <CreatableCombobox
          options={mockOptions}
          onSelect={mockOnSelect}
          onCreate={mockOnCreate}
        />
      )

      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)

      const searchInput = screen.getByPlaceholderText('Search...')
      fireEvent.change(searchInput, { target: { value: 'New Item' } })

      const createButton = screen.getByLabelText('Create new item "New Item"')
      expect(createButton).toBeInTheDocument()
    })
  })
})