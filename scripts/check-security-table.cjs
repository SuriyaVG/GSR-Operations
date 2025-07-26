#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTable() {
  try {
    // Check table structure
    const { data, error } = await supabase
      .from('security_audit_logs')
      .select('*')
      .limit(1);
    
    console.log('Table access test:', { error: error?.message || 'SUCCESS' });
    
    // Try to insert a simple event
    const { data: insertData, error: insertError } = await supabase
      .from('security_audit_logs')
      .insert({
        event_type: 'login_success',
        email: 'test@example.com',
        metadata: { test: true }
      })
      .select()
      .single();
    
    console.log('Insert test:', { 
      success: !insertError, 
      error: insertError?.message,
      id: insertData?.id 
    });
    
    // Clean up
    if (insertData?.id) {
      await supabase
        .from('security_audit_logs')
        .delete()
        .eq('id', insertData.id);
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

checkTable();