// Error Handling Utilities
// Provides withRetry and handleDatabaseError functions

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(operation, maxRetries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries || !error.retryable) {
        throw error;
      }
      await sleep(delay * attempt);
    }
  }
  throw new Error('Max retries exceeded');
}

function handleDatabaseError(error) {
  if (!error) return;
  if (error.type === 'database_connection') {
    console.error('Unable to connect to database. Please try again later.');
  } else if (error.type === 'validation') {
    console.error('Validation Error:', error.message);
  } else if (error.type === 'authorization') {
    console.error('You do not have permission to perform this action');
  } else {
    console.error('An unexpected error occurred. Please try again.');
  }
}

module.exports = { withRetry, handleDatabaseError }; 