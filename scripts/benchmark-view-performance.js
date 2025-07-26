// Benchmark View Performance Script
// Benchmarks vw_batch_yield, vw_invoice_aging, vw_customer_metrics

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function benchmarkView(viewName) {
  const start = Date.now();
  const { data, error } = await supabase.from(viewName).select('*').limit(10);
  const duration = Date.now() - start;
  if (error) {
    console.error(`❌ Error querying ${viewName}:`, error.message);
  } else {
    console.log(`⏱️  ${viewName} queried in ${duration}ms (${data.length} rows)`);
    if (duration > 500) {
      console.warn(`⚠️  ${viewName} query exceeded 500ms!`);
    }
  }
}

async function runBenchmarks() {
  await benchmarkView('vw_batch_yield');
  await benchmarkView('vw_invoice_aging');
  await benchmarkView('vw_customer_metrics');
  console.log('View performance benchmarking complete.');
}

runBenchmarks(); 