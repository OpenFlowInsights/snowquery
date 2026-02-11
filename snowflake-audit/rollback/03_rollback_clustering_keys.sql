-- ============================================================================
-- ROLLBACK: Remove Clustering Keys
-- ============================================================================
-- Removes clustering keys from tables
-- Note: This will not immediately degrade performance, but new data won't
--       be clustered and existing clustering will gradually degrade
-- ============================================================================

USE ROLE ACCOUNTADMIN;
USE DATABASE DEV_DB;

-- ============================================================================
-- Suspend Automatic Clustering
-- ============================================================================

ALTER TABLE STAGING_MARTS.MART_FORMULARY_BY_NDC
SUSPEND RECLUSTER;

ALTER TABLE RAW.RAW_PARTD_PRESCRIBERS_BY_DRUG
SUSPEND RECLUSTER;

ALTER TABLE RAW.RAW_BCDA_EXPLANATION_OF_BENEFIT
SUSPEND RECLUSTER;

ALTER TABLE RAW_CMS_PARTD.PHARMACY_NETWORKS
SUSPEND RECLUSTER;

ALTER TABLE RAW_CMS_PARTD.DRUG_PRICING
SUSPEND RECLUSTER;

-- ============================================================================
-- Remove Clustering Keys
-- ============================================================================

ALTER TABLE STAGING_MARTS.MART_FORMULARY_BY_NDC
CLUSTER BY ();  -- Empty clustering key removes clustering

ALTER TABLE RAW.RAW_PARTD_PRESCRIBERS_BY_DRUG
CLUSTER BY ();

ALTER TABLE RAW.RAW_BCDA_EXPLANATION_OF_BENEFIT
CLUSTER BY ();

ALTER TABLE RAW_CMS_PARTD.PHARMACY_NETWORKS
CLUSTER BY ();

ALTER TABLE RAW_CMS_PARTD.DRUG_PRICING
CLUSTER BY ();

-- ============================================================================
-- Verification
-- ============================================================================

SELECT
    table_schema,
    table_name,
    clustering_key,
    'Clustering removed' as status
FROM DEV_DB.INFORMATION_SCHEMA.TABLES
WHERE table_name IN (
    'MART_FORMULARY_BY_NDC',
    'RAW_PARTD_PRESCRIBERS_BY_DRUG',
    'RAW_BCDA_EXPLANATION_OF_BENEFIT',
    'PHARMACY_NETWORKS',
    'DRUG_PRICING'
)
ORDER BY table_schema, table_name;

-- NOTE: Rolling back clustering is NOT recommended
--       Clustering significantly improves query performance with minimal cost
