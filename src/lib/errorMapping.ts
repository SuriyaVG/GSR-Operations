// Utility to map backend/API error messages to user-friendly messages
export function mapBackendError(error: any): string {
  if (typeof error === 'string') {
    if (error.includes('Inventory validation failed')) {
      return 'Insufficient quantity of one or more materials for this batch. Please check your stock.';
    }
    if (error.includes('Batch not found')) {
      return 'The selected material batch is not available.';
    }
    if (error.includes('Validation error') || error.includes('Output_Stress')) {
      return 'Output quantity is invalid. Please enter a value within the allowed range.';
    }
    // Add more mappings as needed
  }
  // Fallback
  return 'An unexpected error occurred. Please try again or contact support.';
} 