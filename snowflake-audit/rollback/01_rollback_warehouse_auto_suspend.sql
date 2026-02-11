-- ============================================================================
-- ROLLBACK: Warehouse Auto-Suspend Changes
-- ============================================================================
-- Restores warehouses to their original settings (before fix)
-- ============================================================================

USE ROLE ACCOUNTADMIN;

-- Restore original settings
ALTER WAREHOUSE COMPUTE_WH SET
    AUTO_SUSPEND = 0          -- Original: disabled
    AUTO_RESUME = FALSE       -- Original: disabled
    COMMENT = 'N';            -- Original comment

ALTER WAREHOUSE SNOWFLAKE_LEARNING_WH SET
    AUTO_SUSPEND = 0          -- Original: disabled
    AUTO_RESUME = FALSE       -- Original: disabled
    COMMENT = 'N';            -- Original comment

ALTER WAREHOUSE SYSTEM$STREAMLIT_NOTEBOOK_WH SET
    AUTO_SUSPEND = 0          -- Original: disabled
    AUTO_RESUME = FALSE       -- Original: disabled
    COMMENT = 'N';            -- Original comment

ALTER WAREHOUSE DEV_WH SET
    AUTO_SUSPEND = 1          -- Original: 1 second
    COMMENT = 'Y';            -- Original comment

-- Verify rollback
SELECT
    name,
    auto_suspend,
    auto_resume,
    comment
FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSES
WHERE name IN ('COMPUTE_WH', 'SNOWFLAKE_LEARNING_WH', 'SYSTEM$STREAMLIT_NOTEBOOK_WH', 'DEV_WH')
ORDER BY name;

-- NOTE: Rolling back is NOT recommended as it will resume wasting compute credits
