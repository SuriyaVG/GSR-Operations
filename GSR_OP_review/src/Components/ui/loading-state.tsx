import React from 'react';
import { Loader2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LoadingStatus = 'idle' | 'loading' | 'success' | 'error';

export interface LoadingStateProps {
  status: LoadingStatus;
  loadingText?: string;
  successText?: string;
  errorText?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  children?: React.ReactNode;
}

/**
 * LoadingState Component
 * 
 * Displays loading states with user feedback
 */
export function LoadingState({
  status,
  loadingText = 'Loading...',
  successText = 'Completed successfully',
  errorText = 'An error occurred',
  className,
  size = 'md',
  showIcon = true,
  children
}: LoadingStateProps) {
  // Size classes for container and icon
  const sizeClasses = {
    sm: {
      container: 'text-xs py-1 px-2',
      icon: 'h-3 w-3 mr-1'
    },
    md: {
      container: 'text-sm py-2 px-3',
      icon: 'h-4 w-4 mr-2'
    },
    lg: {
      container: 'text-base py-3 px-4',
      icon: 'h-5 w-5 mr-2'
    }
  };

  // Status classes for styling
  const statusClasses = {
    idle: 'bg-gray-50 border-gray-200 text-gray-500',
    loading: 'bg-amber-50 border-amber-200 text-amber-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    error: 'bg-red-50 border-red-200 text-red-700'
  };

  // Get icon based on status
  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className={cn(sizeClasses[size].icon, "animate-spin")} />;
      case 'success':
        return <CheckCircle className={cn(sizeClasses[size].icon)} />;
      case 'error':
        return <AlertCircle className={cn(sizeClasses[size].icon)} />;
      default:
        return <RefreshCw className={cn(sizeClasses[size].icon)} />;
    }
  };

  // Get text based on status
  const getText = () => {
    switch (status) {
      case 'loading':
        return loadingText;
      case 'success':
        return successText;
      case 'error':
        return errorText;
      default:
        return '';
    }
  };

  // If children are provided, render them with status
  if (children) {
    return (
      <div className={cn(
        "relative",
        className
      )}>
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg z-10">
            <div className="flex items-center">
              <Loader2 className="animate-spin h-5 w-5 mr-2 text-amber-500" />
              <span className="text-amber-700 font-medium">{loadingText}</span>
            </div>
          </div>
        )}
        {children}
      </div>
    );
  }

  // Otherwise render a simple status indicator
  return (
    <div className={cn(
      "flex items-center border rounded-md",
      sizeClasses[size].container,
      statusClasses[status],
      className
    )}>
      {showIcon && getIcon()}
      <span>{getText()}</span>
    </div>
  );
}