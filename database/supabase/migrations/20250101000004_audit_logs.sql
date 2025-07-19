-- Audit Logs Migration for GSR Operations
-- This migration creates the audit_logs table and related functions

-- Create audit_log_action type
CREATE TYPE audit_log_action AS ENUM ('profile_update', 'role_change', 'permission_change', 'designation_change', 'login', 'logout', 'failed_login');

-- Create audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action audit_log_action NOT NULL,
  old_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  new_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB
);

-- Create indexes for performance optimization
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by);

-- Create view for audit log with user information
CREATE OR REPLACE VIEW vw_audit_logs AS
SELECT 
  al.id,
  al.user_id,
  up.name as user_name,
  al.action,
  al.old_values,
  al.new_values,
  al.performed_by,
  admin_up.name as performed_by_name,
  al.timestamp,
  al.ip_address,
  al.user_agent,
  al.metadata
FROM audit_logs al
JOIN user_profiles up ON al.user_id = up.id
JOIN user_profiles admin_up ON al.performed_by = admin_up.id;

-- Enable RLS on audit_logs table
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit_logs
CREATE POLICY "Users can view their own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Create function to automatically add audit log entry for role changes
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER AS $
BEGIN
  IF OLD.role <> NEW.role THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      old_values,
      new_values,
      performed_by
    ) VALUES (
      NEW.id,
      'role_change',
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role),
      COALESCE(NEW.updated_by, auth.uid())
    );
  END IF;
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role changes
CREATE TRIGGER log_role_change_trigger
  AFTER UPDATE OF role ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_role_change();

-- Create function to automatically add audit log entry for profile updates
CREATE OR REPLACE FUNCTION log_profile_update()
RETURNS TRIGGER AS $
DECLARE
  changed_fields jsonb := '{}'::jsonb;
  old_values jsonb := '{}'::jsonb;
  new_values jsonb := '{}'::jsonb;
BEGIN
  -- Check which fields have changed
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    old_values := old_values || jsonb_build_object('name', OLD.name);
    new_values := new_values || jsonb_build_object('name', NEW.name);
    changed_fields := changed_fields || jsonb_build_object('name', true);
  END IF;
  
  IF OLD.designation IS DISTINCT FROM NEW.designation THEN
    old_values := old_values || jsonb_build_object('designation', OLD.designation);
    new_values := new_values || jsonb_build_object('designation', NEW.designation);
    changed_fields := changed_fields || jsonb_build_object('designation', true);
  END IF;
  
  IF OLD.custom_settings IS DISTINCT FROM NEW.custom_settings THEN
    old_values := old_values || jsonb_build_object('custom_settings', OLD.custom_settings);
    new_values := new_values || jsonb_build_object('custom_settings', NEW.custom_settings);
    changed_fields := changed_fields || jsonb_build_object('custom_settings', true);
  END IF;
  
  IF OLD.active IS DISTINCT FROM NEW.active THEN
    old_values := old_values || jsonb_build_object('active', OLD.active);
    new_values := new_values || jsonb_build_object('active', NEW.active);
    changed_fields := changed_fields || jsonb_build_object('active', true);
  END IF;
  
  -- Only create audit log if something changed (and it's not just a role change, which is handled by log_role_change)
  IF changed_fields <> '{}'::jsonb AND OLD.role = NEW.role THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      old_values,
      new_values,
      performed_by,
      metadata
    ) VALUES (
      NEW.id,
      'profile_update',
      old_values,
      new_values,
      COALESCE(NEW.updated_by, auth.uid()),
      jsonb_build_object('changed_fields', changed_fields)
    );
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for profile updates
CREATE TRIGGER log_profile_update_trigger
  AFTER UPDATE ON user_profiles
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION log_profile_update();

-- Create rollback script
COMMENT ON TABLE audit_logs IS 'Table for tracking user management actions';