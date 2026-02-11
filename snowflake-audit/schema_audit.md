# Snowflake Schema Audit Report

**Generated:** 2026-02-11 03:30:44
**Account:** rrispxq-juc46944
**Database:** DEV_DB

---

## Executive Summary

- **Total Databases:** 4
- **Total Schemas:** 14
- **Total Tables:** 114
- **Total Views:** 18
- **Columns Cataloged:** 863
- **Storage:** 14.00 GB
- **Total Rows:** 727,157,052

**Issues Found:** 10
- 🔴 CRITICAL: 5
- 🟡 RECOMMENDED: 4
- 🟢 NICE-TO-HAVE: 1

## Databases

| Database | Owner | Created | Comment |
|----------|-------|---------|---------|
| DEV_DB |  | 2026-02-08 | ACCOUNTADMIN |
| SNOWFLAKE | SNOWFLAKE.ACCOUNT_USAGE | 2026-02-07 |  |
| SNOWFLAKE_LEARNING_DB |  | 2026-02-07 | ACCOUNTADMIN |
| SNOWFLAKE_SAMPLE_DATA | SFSALESSHARED.SFC_SAMPLES_VA4.SAMPLE_DATA | 2026-02-07 | ACCOUNTADMIN |

## Schema Organization

### By Layer

- **Raw Layer:** 91 tables
- **Staging Layer:** 23 tables
- **Marts Layer:** 8 tables

### Schema Inventory

| Schema | Database | Tables | Views | Purpose |
|--------|----------|--------|-------|---------|
| INFORMATION_SCHEMA | DEV_DB | 0 | 0 |  |
| MARTS | DEV_DB | 0 | 0 | Analytics marts |
| PUBLIC | DEV_DB | 0 | 0 | Public schema |
| RAW | DEV_DB | 76 | 0 | Raw data ingestion |
| RAW_CLAIMS | DEV_DB | 1 | 0 | Raw data ingestion |
| RAW_CMS_PARTD | DEV_DB | 11 | 0 | Raw data ingestion |
| RAW_RXNORM | DEV_DB | 3 | 0 | Raw data ingestion |
| REFERENCE | DEV_DB | 0 | 0 | Reference data |
| STAGING | DEV_DB | 0 | 0 | Staged/transformed data |
| STAGING_ANALYTICS | DEV_DB | 9 | 0 | Staged/transformed data |
| STAGING_DBT_TEST__AUDIT | DEV_DB | 1 | 0 | Staged/transformed data |
| STAGING_INTERMEDIATE | DEV_DB | 5 | 0 | Staged/transformed data |
| STAGING_MARTS | DEV_DB | 8 | 0 | Staged/transformed data |
| STAGING_STAGING | DEV_DB | 0 | 18 | Staged/transformed data |

## Warehouse Configuration

| Warehouse | Size | State | Auto-Suspend | Auto-Resume | Comment |
|-----------|------|-------|--------------|-------------|---------|
| COMPUTE_WH | X-Small | SUSPENDED | 0s | 0 | N |
| DEV_WH | X-Small | STARTED | 1s | 0 | Y |
| SNOWFLAKE_LEARNING_WH | X-Small | SUSPENDED | 0s | 0 | N |
| SYSTEM$STREAMLIT_NOTEBOOK_WH | X-Small | SUSPENDED | 0s | 0 | N |

## Storage Analysis

**Total Storage:** 14.00 GB

**Largest Table:** `STAGING_MARTS.MART_FORMULARY_BY_NDC`
- Rows: 322,051,523
- Size: 6.75 GB

### Top Tables by Size

| Schema | Table | Rows | Size (GB) |
|--------|-------|------|-----------|
| STAGING_MARTS | MART_FORMULARY_BY_NDC | 322,051,523 | 6.75 |
| RAW | RAW_PARTD_PRESCRIBERS_BY_DRUG | 276,284,275 | 6.00 |
| RAW | RAW_BCDA_EXPLANATION_OF_BENEFIT | 1,458,413 | 0.36 |
| RAW_CMS_PARTD | PHARMACY_NETWORKS | 34,101,960 | 0.28 |
| RAW_CMS_PARTD | DRUG_PRICING | 53,249,171 | 0.20 |
| STAGING_INTERMEDIATE | INT_FORMULARY_ENRICHED | 18,888,355 | 0.18 |
| RAW_RXNORM | RXNSAT | 7,579,072 | 0.10 |
| RAW_RXNORM | RXNREL | 7,304,910 | 0.07 |
| RAW_RXNORM | RXNCONSO | 1,188,222 | 0.03 |
| STAGING_INTERMEDIATE | INT_RXCUI_NDC_CROSSWALK | 1,013,369 | 0.02 |

## Roles and Security

**Total Roles:** 11

| Role | Comment |
|------|---------|
| ACCOUNTADMIN | N |
| ORGADMIN | N |
| PLATFORM_ADMIN | N |
| PLATFORM_ANALYST | N |
| PLATFORM_DEVELOPER | N |
| PLATFORM_SERVICE | N |
| PUBLIC | Y |
| SECURITYADMIN | Y |
| SNOWFLAKE_LEARNING_ROLE | Y |
| SYSADMIN | Y |
| USERADMIN | Y |

## Data Type Analysis

- **VARCHAR columns:** 0
- **Numeric columns:** 0
- **Date/Timestamp columns:** 27
- **VARIANT columns:** 3

## Constraints and Keys

**Total Constraints:** 0

### Clustering Keys

⚠️ **No clustering keys found.** Large tables should have clustering keys for optimal query performance.

## Sample Table Definitions

### `RAW.BCDA_COVERAGE`

**Rows:** RAW | **Size:** 0.00 GB

| Column | Data Type | Nullable | Comment |
|--------|-----------|----------|---------|
| DATA | {"type":"VARIANT","nullable":true} | False |  |
| LOADED_AT | {"type":"TIMESTAMP_NTZ","precision":0,"scale":9,"nullable":true} | False |  |
| SOURCE_FILE | {"type":"TEXT","length":16777216,"byteLength":16777216,"nullable":true,"fixed":false} | False |  |

### `RAW.BCDA_EOB`

**Rows:** RAW | **Size:** 0.00 GB

| Column | Data Type | Nullable | Comment |
|--------|-----------|----------|---------|
| DATA | {"type":"VARIANT","nullable":true} | False |  |
| LOADED_AT | {"type":"TIMESTAMP_NTZ","precision":0,"scale":9,"nullable":true} | False |  |
| SOURCE_FILE | {"type":"TEXT","length":16777216,"byteLength":16777216,"nullable":true,"fixed":false} | False |  |

### `RAW.BCDA_PATIENTS`

**Rows:** RAW | **Size:** 0.00 GB

| Column | Data Type | Nullable | Comment |
|--------|-----------|----------|---------|
| DATA | {"type":"VARIANT","nullable":true} | False |  |
| LOADED_AT | {"type":"TIMESTAMP_NTZ","precision":0,"scale":9,"nullable":true} | False |  |
| SOURCE_FILE | {"type":"TEXT","length":16777216,"byteLength":16777216,"nullable":true,"fixed":false} | False |  |

### `RAW.CMS_ACO_ADVANCE_INVESTMENT_PAYMENT_SPEND_PUF_MARCHPCT202025`

**Rows:** RAW | **Size:** 0.00 GB

| Column | Data Type | Nullable | Comment |
|--------|-----------|----------|---------|
| ACO_ID | {"type":"TEXT","length":16777216,"byteLength":16777216,"nullable":true,"fixed":false} | False |  |
| ACO_NAME | {"type":"TEXT","length":16777216,"byteLength":16777216,"nullable":true,"fixed":false} | False |  |
| PAYMENT_USE | {"type":"TEXT","length":16777216,"byteLength":16777216,"nullable":true,"fixed":false} | False |  |
| GENERAL_SPEND_CATEGORY | {"type":"TEXT","length":16777216,"byteLength":16777216,"nullable":true,"fixed":false} | False |  |
| GENERAL_SPEND_SUBCATEGORY | {"type":"TEXT","length":16777216,"byteLength":16777216,"nullable":true,"fixed":false} | False |  |
| TOTAL_AIP_FUNDING_RECEIVED_THROUGH_DECEMBER_2024 | {"type":"TEXT","length":16777216,"byteLength":16777216,"nullable":true,"fixed":false} | False |  |
| PROJECTED_SPENDING_2024 | {"type":"TEXT","length":16777216,"byteLength":16777216,"nullable":true,"fixed":false} | False |  |
| ACTUAL_SPENDING_2024 | {"type":"TEXT","length":16777216,"byteLength":16777216,"nullable":true,"fixed":false} | False |  |
| PROJECTED_SPENDING_2025 | {"type":"TEXT","length":16777216,"byteLength":16777216,"nullable":true,"fixed":false} | False |  |
| ACTUAL_SPENDING_2025 | {"type":"TEXT","length":16777216,"byteLength":16777216,"nullable":true,"fixed":false} | False |  |

### `RAW.CMS_ACO_AIP_PUF_12_13_2023`

**Rows:** RAW | **Size:** 0.00 GB

| Column | Data Type | Nullable | Comment |
|--------|-----------|----------|---------|
| ACO_ID | {"type":"TEXT","length":500,"byteLength":2000,"nullable":true,"fixed":false} | False |  |
| ACO_NAME | {"type":"TEXT","length":500,"byteLength":2000,"nullable":true,"fixed":false} | False |  |
| PAYMENT_USE | {"type":"TEXT","length":2000,"byteLength":8000,"nullable":true,"fixed":false} | False |  |
| GENERAL_SPEND_CATEGORY | {"type":"TEXT","length":500,"byteLength":2000,"nullable":true,"fixed":false} | False |  |
| GENERAL_SPEND_SUBCATEGORY | {"type":"TEXT","length":500,"byteLength":2000,"nullable":true,"fixed":false} | False |  |
| PROJECTED_SPENDING_2024 | {"type":"REAL","nullable":true} | False |  |
| ACTUAL_SPENDING_2024 | {"type":"REAL","nullable":true} | False |  |
| LOADED_AT | {"type":"TIMESTAMP_NTZ","precision":0,"scale":9,"nullable":true} | False |  |

---

*This audit was generated automatically. Review recommendations.md for prioritized improvements.*