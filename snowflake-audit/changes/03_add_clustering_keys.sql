-- ============================================================================
-- CRITICAL-2: Add Clustering Keys to Large Tables
-- ============================================================================
-- Category: Performance Optimization
-- Priority: CRITICAL
-- Impact: 10-100x faster queries on large tables with proper clustering
--
-- Problem: 11 tables with >1M rows have NO clustering keys
--          This causes full table scans and poor query performance
--
-- Solution: Add clustering keys based on common filter and join patterns
--          in healthcare analytics workloads
--
-- Affected Tables:
--   1. STAGING_MARTS.MART_FORMULARY_BY_NDC (322M rows, 6.75 GB)
--   2. RAW.RAW_PARTD_PRESCRIBERS_BY_DRUG (276M rows, 6.00 GB)
--   3. RAW.RAW_BCDA_EXPLANATION_OF_BENEFIT (1.5M rows, 0.36 GB)
--   4. RAW_CMS_PARTD.PHARMACY_NETWORKS (34M rows, 0.28 GB)
--   5. RAW_CMS_PARTD.DRUG_PRICING (53M rows, 0.20 GB)
--   + 6 more tables
--
-- Rollback: See rollback/03_rollback_clustering_keys.sql
-- ============================================================================

USE ROLE ACCOUNTADMIN;
USE DATABASE DEV_DB;
USE WAREHOUSE DEV_WH;

-- ============================================================================
-- Step 1: Analyze Current Clustering
-- ============================================================================

-- Check current clustering depth for large tables
-- (Higher depth = worse clustering = slower queries)
SELECT
    table_catalog,
    table_schema,
    table_name,
    clustering_key,
    row_count,
    bytes / 1024 / 1024 / 1024 as size_gb
FROM DEV_DB.INFORMATION_SCHEMA.TABLES
WHERE row_count > 1000000
ORDER BY row_count DESC;

-- ============================================================================
-- Step 2: Add Clustering Keys - MARTS Layer
-- ============================================================================

-- Table 1: MART_FORMULARY_BY_NDC (322M rows)
-- Healthcare analytics pattern: Filter by contract/plan, drug (NDC), and vintage
-- Recommended clustering: CONTRACT_PLAN_ID, NDC_NORMALIZED, SOURCE_VINTAGE

-- First, check the columns
DESC TABLE STAGING_MARTS.MART_FORMULARY_BY_NDC;

-- Add clustering key
ALTER TABLE STAGING_MARTS.MART_FORMULARY_BY_NDC
CLUSTER BY (SOURCE_VINTAGE, CONTRACT_PLAN_ID, NDC_NORMALIZED);

-- Note: Clustering is applied asynchronously by Snowflake's Automatic Clustering service
-- Monitor progress with: SELECT SYSTEM$CLUSTERING_INFORMATION('STAGING_MARTS.MART_FORMULARY_BY_NDC');

-- ============================================================================
-- Step 3: Add Clustering Keys - RAW Layer
-- ============================================================================

-- Table 2: RAW_PARTD_PRESCRIBERS_BY_DRUG (276M rows)
-- Pattern: Prescriber analysis by drug and geography
-- Recommended clustering: Year, State, NPI (if exists)

DESC TABLE RAW.RAW_PARTD_PRESCRIBERS_BY_DRUG;

-- Cluster by year and state (common filters in prescriber analytics)
-- Adjust column names based on DESC output
ALTER TABLE RAW.RAW_PARTD_PRESCRIBERS_BY_DRUG
CLUSTER BY (YEAR, STATE);  -- Adjust column names as needed

-- Table 3: RAW_BCDA_EXPLANATION_OF_BENEFIT (1.5M rows)
-- Pattern: Claims data - typically filtered by date and member
-- Recommended clustering: Service date, then member/beneficiary ID

DESC TABLE RAW.RAW_BCDA_EXPLANATION_OF_BENEFIT;

-- Cluster by service date and patient ID
-- Note: Check exact column names first
ALTER TABLE RAW.RAW_BCDA_EXPLANATION_OF_BENEFIT
CLUSTER BY (SERVICE_DATE, PATIENT_ID);  -- Adjust column names

-- ============================================================================
-- Step 4: Add Clustering Keys - Part D CMS Data
-- ============================================================================

-- Table 4: PHARMACY_NETWORKS (34M rows)
-- Pattern: Network lookup by plan, year, and pharmacy
-- Recommended clustering: Year, Contract ID

DESC TABLE RAW_CMS_PARTD.PHARMACY_NETWORKS;

ALTER TABLE RAW_CMS_PARTD.PHARMACY_NETWORKS
CLUSTER BY (YEAR, CONTRACT_ID);  -- Adjust column names

-- Table 5: DRUG_PRICING (53M rows)
-- Pattern: Drug pricing lookups by NDC and time period
-- Recommended clustering: Year, NDC

DESC TABLE RAW_CMS_PARTD.DRUG_PRICING;

ALTER TABLE RAW_CMS_PARTD.DRUG_PRICING
CLUSTER BY (YEAR, NDC);  -- Adjust column names

-- ============================================================================
-- Step 5: Enable Automatic Clustering (if not already enabled)
-- ============================================================================

-- Automatic Clustering continuously maintains clustering as data changes
-- This requires Snowflake Enterprise Edition or higher

-- Check if automatic clustering is enabled
SHOW PARAMETERS LIKE 'ENABLE_AUTOMATIC_CLUSTERING' IN ACCOUNT;

-- Enable automatic clustering for each table
-- Note: This incurs additional compute costs, but improves query performance

ALTER TABLE STAGING_MARTS.MART_FORMULARY_BY_NDC
RESUME RECLUSTER;

ALTER TABLE RAW.RAW_PARTD_PRESCRIBERS_BY_DRUG
RESUME RECLUSTER;

ALTER TABLE RAW.RAW_BCDA_EXPLANATION_OF_BENEFIT
RESUME RECLUSTER;

ALTER TABLE RAW_CMS_PARTD.PHARMACY_NETWORKS
RESUME RECLUSTER;

ALTER TABLE RAW_CMS_PARTD.DRUG_PRICING
RESUME RECLUSTER;

-- ============================================================================
-- Step 6: Verification & Monitoring
-- ============================================================================

-- Check clustering keys were applied
SELECT
    table_schema,
    table_name,
    clustering_key,
    'Clustering key added' as status
FROM DEV_DB.INFORMATION_SCHEMA.TABLES
WHERE table_name IN (
    'MART_FORMULARY_BY_NDC',
    'RAW_PARTD_PRESCRIBERS_BY_DRUG',
    'RAW_BCDA_EXPLANATION_OF_BENEFIT',
    'PHARMACY_NETWORKS',
    'DRUG_PRICING'
)
ORDER BY table_schema, table_name;

-- Check clustering depth (lower is better)
-- Values:
--   0-5: Excellent clustering
--   6-15: Good clustering
--   16+: Poor clustering (needs reclustering)

SELECT
    'MART_FORMULARY_BY_NDC' as table_name,
    SYSTEM$CLUSTERING_DEPTH('STAGING_MARTS.MART_FORMULARY_BY_NDC') as avg_depth;

SELECT
    'RAW_PARTD_PRESCRIBERS_BY_DRUG' as table_name,
    SYSTEM$CLUSTERING_DEPTH('RAW.RAW_PARTD_PRESCRIBERS_BY_DRUG') as avg_depth;

-- Monitor clustering progress (run periodically)
SELECT
    table_schema,
    table_name,
    clustering_key,
    SYSTEM$CLUSTERING_INFORMATION(table_schema || '.' || table_name) as clustering_info
FROM DEV_DB.INFORMATION_SCHEMA.TABLES
WHERE clustering_key IS NOT NULL
    AND row_count > 1000000
ORDER BY table_schema, table_name;

-- ============================================================================
-- Additional Tables to Cluster (if they exist)
-- ============================================================================

-- Check for other large tables that might need clustering
SELECT
    table_schema,
    table_name,
    row_count,
    bytes / 1024 / 1024 / 1024 as size_gb,
    clustering_key,
    CASE
        WHEN clustering_key IS NULL THEN '⚠️ No clustering key'
        ELSE '✓ Clustered'
    END as status
FROM DEV_DB.INFORMATION_SCHEMA.TABLES
WHERE table_type = 'BASE TABLE'
    AND row_count > 1000000
ORDER BY row_count DESC;

-- ============================================================================
-- Performance Testing
-- ============================================================================

-- Before/After comparison:
-- Run a typical query before clustering, note execution time
-- Wait for clustering to complete (may take hours for large tables)
-- Run same query after clustering, compare execution time

-- Example query to test (adjust to your actual queries):
/*
-- BEFORE clustering (baseline)
SELECT
    contract_plan_id,
    ndc_normalized,
    COUNT(*) as record_count
FROM STAGING_MARTS.MART_FORMULARY_BY_NDC
WHERE source_vintage = '2024'
    AND contract_plan_id = 'H1234-001'
GROUP BY contract_plan_id, ndc_normalized
LIMIT 100;

-- AFTER clustering (should be much faster)
-- Run same query and compare execution time in Query Profile
*/

-- ============================================================================
-- Cost Considerations
-- ============================================================================

-- Automatic clustering has costs:
-- - Compute credits for reclustering operations
-- - Typically 5-10% of your overall compute spend
-- - ROI is positive if you frequently query these large tables
--
-- Monitor clustering costs:
SELECT
    start_time,
    end_time,
    credits_used,
    table_name
FROM SNOWFLAKE.ACCOUNT_USAGE.AUTOMATIC_CLUSTERING_HISTORY
WHERE start_time >= DATEADD(day, -7, CURRENT_TIMESTAMP())
ORDER BY start_time DESC;

-- ============================================================================
-- Best Practices for Clustering Keys
-- ============================================================================

/*
1. Choose clustering keys based on WHERE clause filters and JOIN conditions
2. Low to medium cardinality columns are best (e.g., date, state, contract_id)
3. High cardinality columns (e.g., transaction_id) are poor clustering keys
4. Order matters: Most frequently filtered column first
5. Limit to 3-4 columns in clustering key (diminishing returns after that)
6. For healthcare data:
   - Time/vintage columns (SOURCE_VINTAGE, YEAR, CLAIM_DATE)
   - Geographic columns (STATE, COUNTY)
   - Plan/contract identifiers (CONTRACT_PLAN_ID, CONTRACT_ID)
   - Drug identifiers (NDC, RXCUI) - if medium cardinality
   - Provider identifiers (NPI) - be careful, may be too high cardinality
*/
