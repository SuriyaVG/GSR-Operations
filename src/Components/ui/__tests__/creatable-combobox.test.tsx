import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreatableCombobox } from '../creatable-combobox';

describe('CreatableCombobox', () => {
  const options = [
    { id: 1, name: 'Alpha' },
    { id: 2, name: 'Beta' },
    { id: 3, name: 'Gamma' },
  ];

  it('filters options based on input', () => {
    render(
      <CreatableCombobox
        options={options}
        value={undefined}
        onSelect={() => {}}
        onCreate={() => {}}
        displayField="name"
      />
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Al' } });
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
  });

  it('calls onSelect when an option is clicked', () => {
    const onSelect = vi.fn();
    render(
      <CreatableCombobox
        options={options}
        value={undefined}
        onSelect={onSelect}
        onCreate={() => {}}
        displayField="name"
      />
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Beta' } });
    fireEvent.mouseDown(screen.getByText('Beta'));
    expect(onSelect).toHaveBeenCalledWith(options[1]);
  });

  it('shows and calls onCreate when no match', () => {
    const onCreate = vi.fn();
    render(
      <CreatableCombobox
        options={options}
        value={undefined}
        onSelect={() => {}}
        onCreate={onCreate}
        displayField="name"
      />
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Delta' } });
    expect(screen.getByText('+ Add "Delta"')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByText('+ Add "Delta"'));
    expect(onCreate).toHaveBeenCalledWith('Delta');
  });

  it('supports keyboard navigation', () => {
    const onSelect = vi.fn();
    render(
      <CreatableCombobox
        options={options}
        value={undefined}
        onSelect={onSelect}
        onCreate={() => {}}
        displayField="name"
      />
    );
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // highlight first
    fireEvent.keyDown(input, { key: 'Enter' }); // select first
    expect(onSelect).toHaveBeenCalledWith(options[0]);
  });
}); 