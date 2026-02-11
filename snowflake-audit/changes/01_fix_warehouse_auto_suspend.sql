-- ============================================================================
-- CRITICAL-3, 4, 5: Fix Warehouse Auto-Suspend Settings
-- ============================================================================
-- Category: Cost Optimization
-- Priority: CRITICAL
-- Impact: Could save hundreds of dollars per month on idle compute
--
-- Problem: Three warehouses have auto_suspend disabled (0 seconds), meaning
--          they never suspend and continue consuming credits even when idle.
--
-- Solution: Enable auto_suspend with 5-minute (300 second) timeout
--          This balances cost savings with avoiding cold start penalties
--
-- Rollback: See rollback/01_rollback_warehouse_auto_suspend.sql
-- ============================================================================

USE ROLE ACCOUNTADMIN;

-- Current Settings Check
SELECT
    name,
    state,
    size,
    auto_suspend,
    auto_resume,
    'Current settings - will be updated' as status
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSES
WHERE name IN ('COMPUTE_WH', 'SNOWFLAKE_LEARNING_WH', 'SYSTEM$STREAMLIT_NOTEBOOK_WH')
ORDER BY name;

-- ============================================================================
-- Apply Changes
-- ============================================================================

-- Fix COMPUTE_WH
ALTER WAREHOUSE COMPUTE_WH SET
    AUTO_SUSPEND = 300        -- 5 minutes
    AUTO_RESUME = TRUE        -- Enable auto-resume for convenience
    COMMENT = 'General compute warehouse - Auto-suspend enabled';

-- Fix SNOWFLAKE_LEARNING_WH
ALTER WAREHOUSE SNOWFLAKE_LEARNING_WH SET
    AUTO_SUSPEND = 300
    AUTO_RESUME = TRUE
    COMMENT = 'Learning/tutorial warehouse - Auto-suspend enabled';

-- Fix SYSTEM$STREAMLIT_NOTEBOOK_WH
ALTER WAREHOUSE SYSTEM$STREAMLIT_NOTEBOOK_WH SET
    AUTO_SUSPEND = 300
    AUTO_RESUME = TRUE
    COMMENT = 'Streamlit notebook warehouse - Auto-suspend enabled';

-- Also fix DEV_WH which has overly aggressive 1-second auto-suspend
-- This causes frequent cold starts which waste time and credits
ALTER WAREHOUSE DEV_WH SET
    AUTO_SUSPEND = 300        -- Up from 1 second
    COMMENT = 'Development warehouse - Balanced auto-suspend setting';

-- ============================================================================
-- Verification
-- ============================================================================

SELECT
    name,
    state,
    size,
    auto_suspend,
    auto_resume,
    comment,
    'Updated - verify auto_suspend = 300' as status
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSES
WHERE name IN ('COMPUTE_WH', 'SNOWFLAKE_LEARNING_WH', 'SYSTEM$STREAMLIT_NOTEBOOK_WH', 'DEV_WH')
ORDER BY name;

-- Expected Cost Savings:
-- - Each X-Small warehouse costs ~$2/hour when running
-- - If warehouses were idle 50% of the time without auto-suspend:
--   3 warehouses * $2/hr * 12 hours/day * 30 days = ~$2,160/month wasted
-- - With auto-suspend: savings of $1,000-2,000/month
