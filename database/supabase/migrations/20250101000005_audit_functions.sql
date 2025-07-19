-- Audit Functions Migration for GSR Operations
-- This migration creates stored procedures for audit log analysis

-- Create function to get audit action counts
CREATE OR REPLACE FUNCTION get_audit_action_counts()
RETURNS TABLE (action text, count bigint) AS $
BEGIN
  RETURN QUERY
  SELECT 
    audit_logs.action::text,
    COUNT(*)::bigint
  FROM 
    audit_logs
  GROUP BY 
    audit_logs.action
  ORDER BY 
    count DESC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(user_id_param UUID)
RETURNS TABLE (
  action text,
  count bigint,
  last_activity timestamp with time zone
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    audit_logs.action::text,
    COUNT(*)::bigint,
    MAX(audit_logs.timestamp) as last_activity
  FROM 
    audit_logs
  WHERE 
    audit_logs.user_id = user_id_param OR
    audit_logs.performed_by = user_id_param
  GROUP BY 
    audit_logs.action
  ORDER BY 
    last_activity DESC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get top active users
CREATE OR REPLACE FUNCTION get_top_active_users(days_back integer DEFAULT 30)
RETURNS TABLE (
  user_id UUID,
  user_name text,
  action_count bigint
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    up.id as user_id,
    up.name as user_name,
    COUNT(al.id)::bigint as action_count
  FROM 
    user_profiles up
  LEFT JOIN 
    audit_logs al ON up.id = al.performed_by
  WHERE 
    al.timestamp > NOW() - (days_back * INTERVAL '1 day')
  GROUP BY 
    up.id, up.name
  ORDER BY 
    action_count DESC
  LIMIT 10;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to initialize audit system
CREATE OR REPLACE FUNCTION create_audit_functions()
RETURNS void AS $
BEGIN
  -- Functions already created above
  RETURN;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;