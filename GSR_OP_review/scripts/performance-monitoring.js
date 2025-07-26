// Performance Monitoring Script
// Tracks and logs duration of DB operations

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function monitorOperation(label, operation, threshold = 500) {
  const start = Date.now();
  const result = await operation();
  const duration = Date.now() - start;
  if (duration > threshold) {
    console.warn(`⚠️  ${label} took ${duration}ms (exceeds ${threshold}ms)`);
  } else {
    console.log(`✅ ${label} completed in ${duration}ms`);
  }
  return result;
}

// Example usage: monitor a query
async function example() {
  await monitorOperation('vw_batch_yield query', async () => {
    return await supabase.from('vw_batch_yield').select('*').limit(10);
  });
}

example(); 