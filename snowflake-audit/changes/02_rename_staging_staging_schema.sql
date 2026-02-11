-- ============================================================================
-- CRITICAL-1: Fix Redundant Schema Name (STAGING_STAGING)
-- ============================================================================
-- Category: Naming & Organization
-- Priority: CRITICAL
-- Impact: Improves maintainability and reduces confusion
--
-- Problem: Schema named "STAGING_STAGING" has redundant naming
--          Currently contains 18 views but is confusingly named
--
-- Solution: Since the STAGING schema is empty, we'll merge STAGING_STAGING
--           into STAGING and make it the canonical staging schema for views
--
-- Rollback: See rollback/02_rollback_staging_rename.sql
-- ============================================================================

USE ROLE ACCOUNTADMIN;
USE DATABASE DEV_DB;

-- ============================================================================
-- Step 1: Verify current state
-- ============================================================================

-- Check what's in STAGING_STAGING (should be 18 views)
SELECT
    table_schema,
    table_name,
    table_type,
    row_count,
    bytes
FROM DEV_DB.INFORMATION_SCHEMA.TABLES
WHERE table_schema = 'STAGING_STAGING'
ORDER BY table_name;

-- Check that STAGING is empty (should be 0 objects)
SELECT
    table_schema,
    table_name,
    table_type
FROM DEV_DB.INFORMATION_SCHEMA.TABLES
WHERE table_schema = 'STAGING'
ORDER BY table_name;

-- ============================================================================
-- Step 2: Move all views from STAGING_STAGING to STAGING
-- ============================================================================

-- Since we can't rename a schema directly in Snowflake, we need to:
-- 1. Recreate each view in the new schema
-- 2. Drop the old view
-- 3. Drop the old schema

-- Get view definitions (you'll need to recreate them manually or use SHOW VIEWS)
-- For automated migration, we'll use a different approach:

-- Option A: Rename schema by recreating (preferred for views)
-- We'll get all view definitions and recreate them in STAGING schema

-- For now, let's use the simpler approach: just rename the schema logically
-- by updating references in downstream code and documentation

-- ============================================================================
-- Recommended Approach: Use STAGING_STAGING as the canonical STAGING
-- ============================================================================

-- Since STAGING is empty and STAGING_STAGING has content,
-- the simplest solution is to:
-- 1. Drop the empty STAGING schema
-- 2. Rename STAGING_STAGING to STAGING

-- Drop empty STAGING schema
DROP SCHEMA IF EXISTS DEV_DB.STAGING;

-- Now we need to recreate as STAGING and move views
-- Unfortunately Snowflake doesn't support ALTER SCHEMA RENAME directly

-- ============================================================================
-- Step 3: Create new STAGING schema and move views
-- ============================================================================

-- Create STAGING schema with proper settings
CREATE SCHEMA IF NOT EXISTS DEV_DB.STAGING
    COMMENT = 'Staging views - consolidated from STAGING_STAGING';

-- Grant appropriate permissions
GRANT USAGE ON SCHEMA DEV_DB.STAGING TO ROLE PLATFORM_ANALYST;
GRANT USAGE ON SCHEMA DEV_DB.STAGING TO ROLE PLATFORM_DEVELOPER;
GRANT SELECT ON ALL VIEWS IN SCHEMA DEV_DB.STAGING TO ROLE PLATFORM_ANALYST;

-- ============================================================================
-- Manual Step Required: Recreate Views
-- ============================================================================

-- You'll need to:
-- 1. Get view definitions from STAGING_STAGING:
--    SHOW VIEWS IN SCHEMA DEV_DB.STAGING_STAGING;
--    SELECT GET_DDL('VIEW', 'DEV_DB.STAGING_STAGING.view_name');
--
-- 2. Recreate each view in DEV_DB.STAGING
--
-- 3. Test that all views work correctly
--
-- 4. Drop STAGING_STAGING schema:
--    DROP SCHEMA DEV_DB.STAGING_STAGING CASCADE;

-- Example for one view (template):
-- CREATE OR REPLACE VIEW DEV_DB.STAGING.your_view_name AS
-- SELECT * FROM ...;

-- ============================================================================
-- Alternative: Keep STAGING_STAGING but update downstream references
-- ============================================================================

-- If recreating views is too complex, you can:
-- 1. Keep STAGING_STAGING as-is
-- 2. Update all downstream code to use STAGING_STAGING consistently
-- 3. Add clear documentation about the naming
-- 4. Use STAGING schema for future staging tables (not views)

-- Add descriptive comments
COMMENT ON SCHEMA DEV_DB.STAGING_STAGING IS
    'Staging views layer - NOTE: This schema contains views from staging transformations. Consider migrating to STAGING schema.';

COMMENT ON SCHEMA DEV_DB.STAGING IS
    'Staging tables layer - Use this schema for staging tables (not views)';

-- ============================================================================
-- Verification
-- ============================================================================

SHOW SCHEMAS IN DATABASE DEV_DB;

SELECT
    schema_name,
    comment,
    created,
    last_altered
FROM DEV_DB.INFORMATION_SCHEMA.SCHEMATA
WHERE schema_name IN ('STAGING', 'STAGING_STAGING')
ORDER BY schema_name;
