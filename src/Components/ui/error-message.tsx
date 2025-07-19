import React from 'react';
import { AlertCircle, RefreshCw, LogOut, UserCog, Edit, X, ArrowRight } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/Components/ui/alert';
import { Button } from '@/Components/ui/button';
import { cn } from '@/lib/utils';
import { 
  ErrorRecoveryAction, 
  type RecoverableError 
} from '@/lib/services/errorHandlingService';

export interface ErrorMessageProps {
  error: RecoverableError;
  onAction?: (action: ErrorRecoveryAction) => void;
  className?: string;
  showDetails?: boolean;
}

/**
 * ErrorMessage Component
 * 
 * Displays user-friendly error messages with recovery options
 */
export function ErrorMessage({ 
  error, 
  onAction, 
  className,
  showDetails = false
}: ErrorMessageProps) {
  // Get icon based on error type
  const getIcon = () => {
    if (error.type.includes('connection')) {
      return <RefreshCw className="h-5 w-5 text-red-500" />;
    } else if (error.type.includes('authentication')) {
      return <LogOut className="h-5 w-5 text-red-500" />;
    } else if (error.type.includes('permission')) {
      return <UserCog className="h-5 w-5 text-red-500" />;
    } else if (error.type.includes('validation')) {
      return <Edit className="h-5 w-5 text-red-500" />;
    } else {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  // Get action icon based on recovery action
  const getActionIcon = (action: ErrorRecoveryAction) => {
    switch (action) {
      case ErrorRecoveryAction.RETRY:
        return <RefreshCw className="h-4 w-4 mr-1" />;
      case ErrorRecoveryAction.REFRESH:
        return <RefreshCw className="h-4 w-4 mr-1" />;
      case ErrorRecoveryAction.LOGOUT:
        return <LogOut className="h-4 w-4 mr-1" />;
      case ErrorRecoveryAction.CONTACT_ADMIN:
        return <UserCog className="h-4 w-4 mr-1" />;
      case ErrorRecoveryAction.EDIT_INPUT:
        return <Edit className="h-4 w-4 mr-1" />;
      case ErrorRecoveryAction.CANCEL:
        return <X className="h-4 w-4 mr-1" />;
      default:
        return <ArrowRight className="h-4 w-4 mr-1" />;
    }
  };

  // Get button variant based on recovery action
  const getButtonVariant = (action: ErrorRecoveryAction): 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' => {
    switch (action) {
      case ErrorRecoveryAction.RETRY:
        return 'default';
      case ErrorRecoveryAction.REFRESH:
        return 'default';
      case ErrorRecoveryAction.LOGOUT:
        return 'destructive';
      case ErrorRecoveryAction.CONTACT_ADMIN:
        return 'secondary';
      case ErrorRecoveryAction.EDIT_INPUT:
        return 'outline';
      case ErrorRecoveryAction.CANCEL:
        return 'ghost';
      default:
        return 'outline';
    }
  };

  // Get action label based on recovery action
  const getActionLabel = (action: ErrorRecoveryAction): string => {
    switch (action) {
      case ErrorRecoveryAction.RETRY:
        return 'Try Again';
      case ErrorRecoveryAction.REFRESH:
        return 'Refresh Page';
      case ErrorRecoveryAction.LOGOUT:
        return 'Log Out';
      case ErrorRecoveryAction.CONTACT_ADMIN:
        return 'Contact Admin';
      case ErrorRecoveryAction.EDIT_INPUT:
        return 'Edit Input';
      case ErrorRecoveryAction.CANCEL:
        return 'Cancel';
      default:
        return 'OK';
    }
  };

  return (
    <Alert 
      variant="destructive" 
      className={cn(
        "bg-red-50 border-red-200 text-red-800",
        className
      )}
    >
      <div className="flex items-start">
        <div className="mr-3 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1">
          <AlertTitle className="text-red-800 font-medium mb-1">
            {error.message}
          </AlertTitle>
          <AlertDescription className="text-red-700">
            {showDetails && error.technicalDetails && (
              <div className="mt-1 mb-2 text-xs bg-red-100 p-2 rounded overflow-auto max-h-24">
                {error.technicalDetails}
              </div>
            )}
            
            {error.recoveryActions && error.recoveryActions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {error.recoveryActions.map((action) => (
                  <Button
                    key={action}
                    size="sm"
                    variant={getButtonVariant(action)}
                    onClick={() => onAction && onAction(action)}
                    className={cn(
                      action === ErrorRecoveryAction.CANCEL && "border-red-200 text-red-700 hover:bg-red-50",
                      action === ErrorRecoveryAction.RETRY && "bg-amber-500 hover:bg-amber-600 text-white"
                    )}
                  >
                    {getActionIcon(action)}
                    {getActionLabel(action)}
                  </Button>
                ))}
              </div>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}