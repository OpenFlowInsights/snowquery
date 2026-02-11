-- ============================================================================
-- ROLLBACK: Schema Rename Changes
-- ============================================================================
-- This rollback assumes you chose the "add comments" approach
-- If you moved views, you'll need to move them back manually
-- ============================================================================

USE ROLE ACCOUNTADMIN;
USE DATABASE DEV_DB;

-- Restore original comments (empty/default)
COMMENT ON SCHEMA DEV_DB.STAGING_STAGING IS '';
COMMENT ON SCHEMA DEV_DB.STAGING IS '';

-- If you dropped and recreated STAGING, restore the empty state
-- (This is low-risk since STAGING was empty to begin with)

SELECT 'Rollback complete - schemas restored to original state' AS status;
