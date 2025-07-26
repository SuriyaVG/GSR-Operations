-- Security Audit Logs Migration for GSR Operations
-- This migration creates the security_audit_logs table for tracking security events

-- Create security_event_type enum (drop and recreate to add new values)
DO $$ 
BEGIN
  -- Drop the type if it exists (this will fail if there are dependencies)
  DROP TYPE IF EXISTS security_event_type CASCADE;
  
  -- Create the enum with all values
  CREATE TYPE security_event_type AS ENUM (
    'login_success',
    'login_failed', 
    'logout',
    'unauthorized_access_attempt',
    'permission_denied',
    'role_escalation_attempt',
    'role_assignment_change',
    'suspicious_activity',
    'password_reset_request',
    'password_change',
    'session_expired',
    'multiple_login_attempts',
    'authentication_failure',
    'session_hijack_attempt',
    'brute_force_attempt'
  );
EXCEPTION
  WHEN others THEN
    -- If drop fails due to dependencies, try to add new values to existing enum
    BEGIN
      ALTER TYPE security_event_type ADD VALUE IF NOT EXISTS 'role_assignment_change';
      ALTER TYPE security_event_type ADD VALUE IF NOT EXISTS 'authentication_failure';
      ALTER TYPE security_event_type ADD VALUE IF NOT EXISTS 'session_hijack_attempt';
      ALTER TYPE security_event_type ADD VALUE IF NOT EXISTS 'brute_force_attempt';
    EXCEPTION
      WHEN others THEN
        -- If enum doesn't exist, create it
        CREATE TYPE security_event_type AS ENUM (
          'login_success',
          'login_failed', 
          'logout',
          'unauthorized_access_attempt',
          'permission_denied',
          'role_escalation_attempt',
          'role_assignment_change',
          'suspicious_activity',
          'password_reset_request',
          'password_change',
          'session_expired',
          'multiple_login_attempts',
          'authentication_failure',
          'session_hijack_attempt',
          'brute_force_attempt'
        );
    END;
END $$;

-- Create security_audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type security_event_type NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  resource TEXT,
  action TEXT,
  attempted_role TEXT,
  user_role TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_type ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_email ON security_audit_logs(email);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_timestamp ON security_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_ip_address ON security_audit_logs(ip_address);

-- Create composite index for failed login tracking
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_failed_logins ON security_audit_logs(email, ip_address, timestamp) 
WHERE event_type = 'login_failed';

-- Create view for security audit logs with user information
CREATE OR REPLACE VIEW vw_security_audit_logs AS
SELECT 
  sal.id,
  sal.event_type,
  sal.user_id,
  COALESCE(up.name, sal.email) as user_name,
  sal.email,
  sal.ip_address,
  sal.user_agent,
  sal.resource,
  sal.action,
  sal.attempted_role,
  sal.user_role,
  sal.error_message,
  sal.metadata,
  sal.timestamp,
  sal.created_at
FROM security_audit_logs sal
LEFT JOIN user_profiles up ON sal.user_id = up.id;

-- Enable RLS on security_audit_logs table
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for security_audit_logs
CREATE POLICY "Admins can view all security audit logs" ON security_audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their own security audit logs" ON security_audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert security audit logs" ON security_audit_logs
  FOR INSERT WITH CHECK (true);

-- Create function to get security event statistics
CREATE OR REPLACE FUNCTION get_security_event_stats(
  time_range_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  event_type TEXT,
  event_count BIGINT,
  unique_users BIGINT,
  unique_ips BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sal.event_type::TEXT,
    COUNT(*)::BIGINT as event_count,
    COUNT(DISTINCT sal.user_id)::BIGINT as unique_users,
    COUNT(DISTINCT sal.ip_address)::BIGINT as unique_ips
  FROM 
    security_audit_logs sal
  WHERE 
    sal.timestamp >= NOW() - (time_range_hours || ' hours')::INTERVAL
  GROUP BY 
    sal.event_type
  ORDER BY 
    event_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get failed login attempts for an email/IP
CREATE OR REPLACE FUNCTION get_failed_login_attempts(
  p_email TEXT,
  p_ip_address TEXT DEFAULT NULL,
  time_window_minutes INTEGER DEFAULT 15
)
RETURNS TABLE (
  attempt_count BIGINT,
  last_attempt TIMESTAMP WITH TIME ZONE,
  is_locked BOOLEAN
) AS $$
DECLARE
  max_attempts INTEGER := 5;
  attempt_count_result BIGINT;
  last_attempt_result TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT 
    COUNT(*),
    MAX(timestamp)
  INTO 
    attempt_count_result,
    last_attempt_result
  FROM 
    security_audit_logs
  WHERE 
    event_type = 'login_failed'
    AND email = p_email
    AND (p_ip_address IS NULL OR ip_address = p_ip_address)
    AND timestamp >= NOW() - (time_window_minutes || ' minutes')::INTERVAL;

  RETURN QUERY
  SELECT 
    COALESCE(attempt_count_result, 0)::BIGINT,
    last_attempt_result,
    (COALESCE(attempt_count_result, 0) >= max_attempts)::BOOLEAN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old security audit logs (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_security_logs(
  retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM security_audit_logs
  WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add security_event action to audit_log_action enum
ALTER TYPE audit_log_action ADD VALUE IF NOT EXISTS 'security_event';

-- Create trigger function to log critical security events to main audit log
CREATE OR REPLACE FUNCTION log_critical_security_event()
RETURNS TRIGGER AS $$
DECLARE
  critical_events security_event_type[] := ARRAY[
    'unauthorized_access_attempt',
    'role_escalation_attempt', 
    'role_assignment_change',
    'multiple_login_attempts',
    'suspicious_activity',
    'session_hijack_attempt',
    'brute_force_attempt'
  ];
BEGIN
  -- Only log critical events to main audit log
  IF NEW.event_type = ANY(critical_events) AND NEW.user_id IS NOT NULL THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      old_values,
      new_values,
      performed_by,
      metadata
    ) VALUES (
      NEW.user_id,
      'security_event',
      '{}'::jsonb,
      jsonb_build_object(
        'event_type', NEW.event_type,
        'resource', NEW.resource,
        'action', NEW.action,
        'severity', 'CRITICAL'
      ),
      NEW.user_id,
      NEW.metadata || jsonb_build_object('security_audit_log_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for critical security events
CREATE TRIGGER log_critical_security_event_trigger
  AFTER INSERT ON security_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION log_critical_security_event();

-- Grant necessary permissions
GRANT SELECT ON security_audit_logs TO authenticated;
GRANT SELECT ON vw_security_audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_security_event_stats(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_failed_login_attempts(TEXT, TEXT, INTEGER) TO authenticated;

-- Create rollback script
COMMENT ON TABLE security_audit_logs IS 'Table for tracking security events and authentication attempts';