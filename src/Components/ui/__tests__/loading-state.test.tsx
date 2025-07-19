import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingState } from '../loading-state';

describe('LoadingState', () => {
  it('renders loading state with default text', () => {
    render(<LoadingState status="loading" />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders success state with default text', () => {
    render(<LoadingState status="success" />);
    
    expect(screen.getByText('Completed successfully')).toBeInTheDocument();
  });

  it('renders error state with default text', () => {
    render(<LoadingState status="error" />);
    
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
  });

  it('renders idle state with no text', () => {
    render(<LoadingState status="idle" />);
    
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(screen.queryByText('Completed successfully')).not.toBeInTheDocument();
    expect(screen.queryByText('An error occurred')).not.toBeInTheDocument();
  });

  it('renders custom text for each state', () => {
    const { rerender } = render(
      <LoadingState 
        status="loading" 
        loadingText="Custom loading..." 
        successText="Custom success!" 
        errorText="Custom error!" 
      />
    );
    
    expect(screen.getByText('Custom loading...')).toBeInTheDocument();
    
    rerender(
      <LoadingState 
        status="success" 
        loadingText="Custom loading..." 
        successText="Custom success!" 
        errorText="Custom error!" 
      />
    );
    
    expect(screen.getByText('Custom success!')).toBeInTheDocument();
    
    rerender(
      <LoadingState 
        status="error" 
        loadingText="Custom loading..." 
        successText="Custom success!" 
        errorText="Custom error!" 
      />
    );
    
    expect(screen.getByText('Custom error!')).toBeInTheDocument();
  });

  it('renders children with overlay when loading', () => {
    render(
      <LoadingState status="loading">
        <div data-testid="content">Content</div>
      </LoadingState>
    );
    
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders children without overlay when not loading', () => {
    render(
      <LoadingState status="idle">
        <div data-testid="content">Content</div>
      </LoadingState>
    );
    
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    const { container, rerender } = render(<LoadingState status="loading" size="sm" />);
    
    // Small size
    expect(container.firstChild).toHaveClass('text-xs');
    
    // Medium size (default)
    rerender(<LoadingState status="loading" size="md" />);
    expect(container.firstChild).toHaveClass('text-sm');
    
    // Large size
    rerender(<LoadingState status="loading" size="lg" />);
    expect(container.firstChild).toHaveClass('text-base');
  });
});