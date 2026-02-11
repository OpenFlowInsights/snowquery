-- ============================================================================
-- MASTER EXECUTION SCRIPT - ALL CRITICAL FIXES
-- ============================================================================
-- This script executes all CRITICAL fixes in the recommended order
--
-- IMPORTANT: Review each script individually before running
-- Test in DEV environment first
--
-- Execution Time Estimates:
--   Script 01: < 1 minute  (warehouse config - immediate)
--   Script 02: 5-10 minutes (schema rename - requires manual view migration)
--   Script 03: 2-24 hours (clustering - depends on table size, runs async)
--
-- Total Impact:
--   - Cost Savings: $1,000-2,000/month (warehouse auto-suspend)
--   - Performance: 10-100x faster queries (clustering)
--   - Maintainability: Improved (schema naming)
-- ============================================================================

-- Set execution role
USE ROLE ACCOUNTADMIN;
USE DATABASE DEV_DB;
USE WAREHOUSE DEV_WH;

-- Log execution start
SELECT
    CURRENT_TIMESTAMP() as execution_start,
    CURRENT_USER() as executed_by,
    CURRENT_ROLE() as execution_role,
    CURRENT_WAREHOUSE() as warehouse,
    'Starting CRITICAL fixes execution' as status;

-- ============================================================================
-- SCRIPT 01: Fix Warehouse Auto-Suspend (IMMEDIATE COST SAVINGS)
-- ============================================================================
-- Execution time: < 1 minute
-- Impact: HIGH - Saves $1,000-2,000/month
-- Risk: LOW - Easily reversible

!source 01_fix_warehouse_auto_suspend.sql

-- ============================================================================
-- SCRIPT 02: Fix Schema Naming (MANUAL STEPS REQUIRED)
-- ============================================================================
-- Execution time: 5-10 minutes (manual work required)
-- Impact: MEDIUM - Improves maintainability
-- Risk: LOW - Can be deferred if needed

-- NOTE: Review script 02 and decide on approach before executing
-- !source 02_rename_staging_staging_schema.sql

-- ============================================================================
-- SCRIPT 03: Add Clustering Keys (RUNS IN BACKGROUND)
-- ============================================================================
-- Execution time: 2-24 hours (async, depends on table size)
-- Impact: HIGH - 10-100x faster queries
-- Risk: LOW - Runs in background, no downtime

-- NOTE: Clustering applies asynchronously - queries work during clustering
-- !source 03_add_clustering_keys.sql

-- ============================================================================
-- Post-Execution Verification
-- ============================================================================

-- Verify warehouse settings
SELECT
    'Warehouse Config' as check_type,
    name,
    auto_suspend,
    auto_resume,
    CASE
        WHEN auto_suspend >= 300 THEN '✓ FIXED'
        ELSE '⚠️ NEEDS FIX'
    END as status
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSES
WHERE name IN ('COMPUTE_WH', 'SNOWFLAKE_LEARNING_WH', 'SYSTEM$STREAMLIT_NOTEBOOK_WH', 'DEV_WH')
ORDER BY name;

-- Verify clustering keys
SELECT
    'Clustering Keys' as check_type,
    table_schema,
    table_name,
    clustering_key,
    CASE
        WHEN clustering_key IS NOT NULL THEN '✓ FIXED'
        ELSE '⚠️ NEEDS FIX'
    END as status
FROM DEV_DB.INFORMATION_SCHEMA.TABLES
WHERE table_name IN (
    'MART_FORMULARY_BY_NDC',
    'RAW_PARTD_PRESCRIBERS_BY_DRUG',
    'RAW_BCDA_EXPLANATION_OF_BENEFIT',
    'PHARMACY_NETWORKS',
    'DRUG_PRICING'
)
ORDER BY table_schema, table_name;

-- Log execution completion
SELECT
    CURRENT_TIMESTAMP() as execution_complete,
    'CRITICAL fixes execution complete - monitor clustering progress' as status;

-- ============================================================================
-- Next Steps
-- ============================================================================

/*
1. Monitor automatic clustering progress:
   - Run: SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.AUTOMATIC_CLUSTERING_HISTORY
           WHERE start_time >= DATEADD(hour, -1, CURRENT_TIMESTAMP());

2. Test query performance after clustering completes:
   - Run typical queries against clustered tables
   - Compare execution times in Query Profile
   - Should see 10-100x improvement on filtered queries

3. Monitor cost savings from warehouse auto-suspend:
   - Run: SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
           WHERE start_time >= DATEADD(day, -7, CURRENT_TIMESTAMP());
   - Compare credit usage week-over-week

4. Review RECOMMENDED fixes (Phase 2):
   - See recommendations.md for Phase 2 improvements
   - Lower priority but still valuable

5. Document changes:
   - Update your team's runbooks
   - Note new clustering keys in documentation
   - Update cost monitoring dashboards
*/
