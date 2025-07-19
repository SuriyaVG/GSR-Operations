-- Rollback script for audit functions migration

-- Drop functions
DROP FUNCTION IF EXISTS get_audit_action_counts();
DROP FUNCTION IF EXISTS get_user_activity_summary(UUID);
DROP FUNCTION IF EXISTS get_top_active_users(integer);
DROP FUNCTION IF EXISTS create_audit_functions();