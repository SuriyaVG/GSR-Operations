-- Fix User Role Assignments Migration
-- This migration updates user_profiles table with proper role assignments and adds performance indexes

-- First, let's check if we have any existing users and update the admin user
-- Update the specific admin user role
UPDATE user_profiles 
SET role = 'admin', updated_at = NOW()
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'suriyavg834@gmail.com'
);

-- Create additional indexes for performance on user_profiles queries
-- Index on role for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_active ON user_profiles(role, active);

-- Index on active status for filtering active users
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(active);

-- Composite index for common queries (id, role, active)
CREATE INDEX IF NOT EXISTS idx_user_profiles_lookup ON user_profiles(id, role, active);

-- Index on updated_at for audit and sorting purposes
CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_at ON user_profiles(updated_at DESC);

-- Add a function to safely update user roles with validation
CREATE OR REPLACE FUNCTION update_user_role(
  user_id UUID,
  new_role user_role,
  updated_by_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $
DECLARE
  current_user_role user_role;
  target_user_exists BOOLEAN;
BEGIN
  -- Check if the user making the change is an admin
  SELECT role INTO current_user_role
  FROM user_profiles
  WHERE id = updated_by_id;
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admin users can update roles';
  END IF;
  
  -- Check if target user exists
  SELECT EXISTS(SELECT 1 FROM user_profiles WHERE id = user_id) INTO target_user_exists;
  
  IF NOT target_user_exists THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Update the user role
  UPDATE user_profiles 
  SET 
    role = new_role,
    updated_at = NOW()
  WHERE id = user_id;
  
  RETURN TRUE;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a function to get user role safely (for use in RLS policies)
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $
DECLARE
  user_role_result user_role;
BEGIN
  SELECT role INTO user_role_result
  FROM user_profiles
  WHERE id = auth.uid() AND active = true;
  
  RETURN COALESCE(user_role_result, 'viewer');
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing get_user_role function to use the safer version
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $
BEGIN
  RETURN get_current_user_role();
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a function to validate role assignments
CREATE OR REPLACE FUNCTION validate_role_assignment()
RETURNS TRIGGER AS $
BEGIN
  -- Ensure role is valid
  IF NEW.role NOT IN ('admin', 'production', 'sales_manager', 'finance', 'viewer') THEN
    RAISE EXCEPTION 'Invalid role: %', NEW.role;
  END IF;
  
  -- Ensure at least one admin exists (prevent locking out all admins)
  IF OLD.role = 'admin' AND NEW.role != 'admin' THEN
    IF (SELECT COUNT(*) FROM user_profiles WHERE role = 'admin' AND id != NEW.id AND active = true) = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last admin user';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Add trigger to validate role assignments
DROP TRIGGER IF EXISTS validate_role_assignment_trigger ON user_profiles;
CREATE TRIGGER validate_role_assignment_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION validate_role_assignment();

-- Create a view for user management that includes auth user data
CREATE OR REPLACE VIEW user_management_view AS
SELECT 
  up.id,
  au.email,
  up.name,
  up.role,
  up.active,
  up.created_at,
  up.updated_at,
  au.last_sign_in_at as last_login,
  au.email_confirmed_at,
  au.phone_confirmed_at
FROM user_profiles up
JOIN auth.users au ON up.id = au.id
WHERE up.active = true;

-- Grant appropriate permissions for the view
GRANT SELECT ON user_management_view TO authenticated;

-- Add RLS policy for the view
CREATE POLICY "Admins can view user management data" ON user_management_view
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin' AND active = true
    )
  );

-- Add a function to create user profiles with proper defaults
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  user_email TEXT,
  user_name TEXT DEFAULT NULL,
  user_role user_role DEFAULT 'viewer'
)
RETURNS user_profiles AS $
DECLARE
  new_profile user_profiles;
BEGIN
  INSERT INTO user_profiles (id, role, name, active, created_at, updated_at)
  VALUES (
    user_id,
    user_role,
    COALESCE(user_name, split_part(user_email, '@', 1)),
    true,
    NOW(),
    NOW()
  )
  RETURNING * INTO new_profile;
  
  RETURN new_profile;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the handle_new_user function to use the new create_user_profile function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $
DECLARE
  default_role user_role := 'viewer';
  user_name TEXT;
BEGIN
  -- Extract name from metadata or use email prefix
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Check if this is the admin user
  IF NEW.email = 'suriyavg834@gmail.com' THEN
    default_role := 'admin';
  END IF;
  
  -- Create the user profile
  PERFORM create_user_profile(NEW.id, NEW.email, user_name, default_role);
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION update_user_role(UUID, user_role, UUID) IS 'Safely update user role with admin validation';
COMMENT ON FUNCTION get_current_user_role() IS 'Get current authenticated user role safely';
COMMENT ON FUNCTION validate_role_assignment() IS 'Validate role assignments and prevent admin lockout';
COMMENT ON FUNCTION create_user_profile(UUID, TEXT, TEXT, user_role) IS 'Create user profile with proper defaults';
COMMENT ON VIEW user_management_view IS 'Combined view of user profiles and auth data for management';

-- Add indexes on auth.users for better join performance
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth.users(email);
CREATE INDEX IF NOT EXISTS idx_auth_users_last_sign_in ON auth.users(last_sign_in_at DESC);