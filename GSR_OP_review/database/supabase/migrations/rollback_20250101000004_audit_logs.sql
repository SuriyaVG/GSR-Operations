-- Rollback script for audit_logs migration

-- Drop triggers
DROP TRIGGER IF EXISTS log_profile_update_trigger ON user_profiles;
DROP TRIGGER IF EXISTS log_role_change_trigger ON user_profiles;

-- Drop functions
DROP FUNCTION IF EXISTS log_profile_update();
DROP FUNCTION IF EXISTS log_role_change();

-- Drop view
DROP VIEW IF EXISTS vw_audit_logs;

-- Drop table
DROP TABLE IF EXISTS audit_logs;

-- Drop type
DROP TYPE IF EXISTS audit_log_action;