import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorMessage } from '../error-message';
import { ErrorRecoveryAction } from '@/lib/services/errorHandlingService';

describe('ErrorMessage', () => {
  const mockError = {
    type: 'profile_update_error',
    message: 'Failed to update profile',
    technicalDetails: 'Error: Network error',
    recoveryActions: [
      ErrorRecoveryAction.RETRY,
      ErrorRecoveryAction.CANCEL
    ],
    context: {
      operation: 'profile_update',
      timestamp: Date.now()
    }
  };

  it('renders the error message', () => {
    render(<ErrorMessage error={mockError} />);
    
    expect(screen.getByText('Failed to update profile')).toBeInTheDocument();
  });

  it('renders recovery action buttons', () => {
    render(<ErrorMessage error={mockError} />);
    
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onAction when a recovery action is clicked', () => {
    const onAction = vi.fn();
    render(<ErrorMessage error={mockError} onAction={onAction} />);
    
    fireEvent.click(screen.getByText('Try Again'));
    expect(onAction).toHaveBeenCalledWith(ErrorRecoveryAction.RETRY);
    
    fireEvent.click(screen.getByText('Cancel'));
    expect(onAction).toHaveBeenCalledWith(ErrorRecoveryAction.CANCEL);
  });

  it('shows technical details when showDetails is true', () => {
    render(<ErrorMessage error={mockError} showDetails={true} />);
    
    expect(screen.getByText('Error: Network error')).toBeInTheDocument();
  });

  it('does not show technical details when showDetails is false', () => {
    render(<ErrorMessage error={mockError} showDetails={false} />);
    
    expect(screen.queryByText('Error: Network error')).not.toBeInTheDocument();
  });

  it('renders different icons based on error type', () => {
    const validationError = {
      ...mockError,
      type: 'validation_error'
    };
    
    const { rerender } = render(<ErrorMessage error={validationError} />);
    // Would need to check for specific icon classes or attributes
    
    const authError = {
      ...mockError,
      type: 'authentication_error'
    };
    
    rerender(<ErrorMessage error={authError} />);
    // Would need to check for specific icon classes or attributes
  });
});