import { render, screen, fireEvent } from '@testing-library/react';
import { AddSupplierModal } from '../AddSupplierModal';
import { toast } from '@/lib/toast';

jest.mock('@/lib/toast');

describe('AddSupplierModal', () => {
  it('shows validation errors for empty fields', async () => {
    render(<AddSupplierModal open={true} onClose={() => {}} onSave={jest.fn()} />);
    fireEvent.click(screen.getByText('Add Supplier'));
    expect(await screen.findByText('Required')).toBeInTheDocument();
  });

  it('calls onSave with valid data', async () => {
    const onSave = jest.fn();
    render(<AddSupplierModal open={true} onClose={() => {}} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('Supplier Name'), { target: { value: 'Acme' } });
    fireEvent.change(screen.getByLabelText('Contact Email'), { target: { value: 'acme@example.com' } });
    fireEvent.click(screen.getByText('Add Supplier'));
    expect(onSave).toHaveBeenCalledWith({ name: 'Acme', contactEmail: 'acme@example.com' });
  });

  it('shows toast on error', async () => {
    const onSave = jest.fn(() => { throw new Error('Failed'); });
    render(<AddSupplierModal open={true} onClose={() => {}} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('Supplier Name'), { target: { value: 'Acme' } });
    fireEvent.change(screen.getByLabelText('Contact Email'), { target: { value: 'acme@example.com' } });
    fireEvent.click(screen.getByText('Add Supplier'));
    expect(toast.error).toHaveBeenCalledWith('Failed');
  });

  it('shows toast on success', async () => {
    const onSave = jest.fn();
    toast.success.mockClear();
    render(<AddSupplierModal open={true} onClose={() => {}} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('Supplier Name'), { target: { value: 'Acme' } });
    fireEvent.change(screen.getByLabelText('Contact Email'), { target: { value: 'acme@example.com' } });
    fireEvent.click(screen.getByText('Add Supplier'));
    expect(toast.success).toHaveBeenCalled();
  });
}); 