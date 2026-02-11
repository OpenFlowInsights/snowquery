# CMS Data Files → Snowflake Schema Mapping

**Complete mapping of CMS public use files to Snowflake schemas**
**Generated:** 2026-02-11
**Total Files:** 153 CMS datasets

---

## Overview

All CMS data files are loaded from S3 stage (`@DEV_DB.RAW.S3_BCDA_STAGE/cms-data/`) into Snowflake RAW schemas with standardized table naming.

### Naming Convention
```
Source Path: cms-data/{category}/{filename}.csv
Target Table: DEV_DB.{SCHEMA}.CMS_{CATEGORY}_{NORMALIZED_NAME}
```

---

## Schema Breakdown

| Category | File Count | Target Schema | Table Prefix | Description |
|----------|-----------|---------------|--------------|-------------|
| **ACO** | 91 files | `RAW` | `CMS_ACO_*` | Medicare Shared Savings Program (MSSP) data |
| **Claims** | 6 files | `RAW` | `CMS_CLAIMS_*` | Innovation models, demonstrations |
| **MA** | 2 files | `RAW` | `CMS_MA_*` | Medicare Advantage data |
| **Part D** | 11 files | `RAW_CMS_PARTD` | Various | Part D formularies, pricing, networks |
| **Providers** | ~43 files | `RAW` | `RAW_*` | Provider utilization, prescribers |

**Total Approximate Files:** 153+

---

## 1. ACO Data (91 files) → `DEV_DB.RAW`

### Category: Medicare Shared Savings Program (MSSP)

#### 1.1 Beneficiary Assignment (6 files)
**Purpose:** ACO-assigned beneficiary data by performance year

| Source File | Target Table | Years Available |
|-------------|--------------|-----------------|
| `py3_algn_bene_puf_rdx.csv` | `CMS_ACO_PY3_ALGN_BENE_PUF_RDX` | PY3 |
| `py2_ALGN_BENE_PUF_REDACT.csv` | `CMS_ACO_PY2_ALGN_BENE_PUF_REDACT` | PY2 |
| `py1_ALGN_BENE_PUF_REDACT_UPDATE.csv` | `CMS_ACO_PY1_ALGN_BENE_PUF_REDACT_UPDATE` | PY1 |
| `py3_elig_bene_puf_rdx.csv` | `CMS_ACO_PY3_ELIG_BENE_PUF_RDX` | PY3 |
| `py2_ELIG_BENE_PUF.csv` | `CMS_ACO_PY2_ELIG_BENE_PUF` | PY2 |
| `ELIG_BENE_PUF_REDACT.csv` | `CMS_ACO_ELIG_BENE_PUF_REDACT` | PY1 |

**Key Columns:** Beneficiary ID (redacted), ACO assignment, eligibility dates
**Grain:** One row per beneficiary per ACO

---

#### 1.2 Financial & Quality Results (3 files)
**Purpose:** Financial and quality performance by performance year

| Source File | Target Table |
|-------------|--------------|
| `py3_fncl_qltypuf_rdx.csv` | `CMS_ACO_PY3_FNCL_QLTYPUF_RDX` |
| `PY2_FNCL_QLTY_CORE_EXP_PUF_REDACT_FINAL...csv` | `CMS_ACO_PY2_FNCL_QLTY_CORE_EXP_PUF_REDACT_FINAL_*` |
| `PY1_EXPND_FNCL_QLTY_PUF_REDACT_UPDATE.csv` | `CMS_ACO_PY1_EXPND_FNCL_QLTY_PUF_REDACT_UPDATE` |

**Key Columns:** ACO ID, quality scores, financial metrics, savings/losses
**Grain:** One row per ACO per performance year

---

#### 1.3 Provider Lists (3 files)
**Purpose:** Providers participating in each ACO

| Source File | Target Table |
|-------------|--------------|
| `py3_prvdr_puf.csv` | `CMS_ACO_PY3_PRVDR_PUF` |
| `py2_PRVDR_PUF.csv` | `CMS_ACO_PY2_PRVDR_PUF` |
| `PROVIDER_PUF.csv` | `CMS_ACO_PROVIDER_PUF` |

**Key Columns:** ACO ID, NPI, provider name, specialty
**Grain:** One row per provider per ACO

---

#### 1.4 Participant Lists (13 files, yearly 2014-2026)
**Purpose:** List of participating ACOs by year

| Source Files | Target Tables |
|--------------|---------------|
| `PY2026_Medicare_Shared_Savings_Program_Participants.csv` | `CMS_ACO_PY2026_MEDICARE_SHARED_SAVINGS_PROGRAM_PARTICIPANTS` |
| `py2025_medicare_shared_savings_program_participants.csv` | `CMS_ACO_PY2025_MEDICARE_SHARED_SAVINGS_PROGRAM_PARTICIPANTS` |
| `PY2024_Medicare_Shared_Savings_Program_Participants.csv` | `CMS_ACO_PY2024_MEDICARE_SHARED_SAVINGS_PROGRAM_PARTICIPANTS` |
| `SSP_ACO_Participants_YYYY_MM_DD.csv` | `CMS_ACO_SSP_ACO_PARTICIPANTS_YYYY_MM_DD` |

**Years:** 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026
**Key Columns:** ACO ID, ACO name, participation status
**Grain:** One row per ACO per year

---

#### 1.5 SNF Affiliates (10 files, yearly 2017-2026)
**Purpose:** Skilled nursing facilities affiliated with ACOs

| Source Files | Target Tables |
|--------------|---------------|
| `PY2026_Medicare_Shared_Savings_Program_ACO_SNF_Affiliates.csv` | `CMS_ACO_PY2026_MEDICARE_SHARED_SAVINGS_PROGRAM_ACO_SNF_AFFILIATES` |
| `py2025_medicare_shared_savings_program_snf_affiliates.csv` | `CMS_ACO_PY2025_MEDICARE_SHARED_SAVINGS_PROGRAM_SNF_AFFILIATES` |
| `SSP_ACO_SNF_Affiliates_YYYY_MM_DD.csv` | `CMS_ACO_SSP_ACO_SNF_AFFILIATES_YYYY_MM_DD` |

**Years:** 2017-2026
**Key Columns:** ACO ID, facility NPI, facility name
**Grain:** One row per SNF per ACO

---

#### 1.6 Organization Lists (11 files, yearly 2014-2026)
**Purpose:** ACO organization details

| Source Files | Target Tables |
|--------------|---------------|
| `PY2026_Medicare_Shared_Savings_Program_Organizations_no extra space.csv` | `CMS_ACO_PY2026_MEDICARE_SHARED_SAVINGS_PROGRAM_ORGANIZATIONS_*` |
| `py2025_medicare_shared_savings_program_organizations.csv` | `CMS_ACO_PY2025_MEDICARE_SHARED_SAVINGS_PROGRAM_ORGANIZATIONS` |
| `SSP_ACOs_YYYY_MM_DD.csv` | `CMS_ACO_SSP_ACOS_YYYY_MM_DD` |

**Years:** 2014-2026
**Key Columns:** ACO ID, organization name, type, track, state
**Grain:** One row per ACO per year

---

#### 1.7 Advance Investment Payments (2 files)
**Purpose:** AIP spending data

| Source File | Target Table |
|-------------|--------------|
| `Advance_Investment_Payment_Spend_PUF_March 2025.csv` | `CMS_ACO_ADVANCE_INVESTMENT_PAYMENT_SPEND_PUF_MARCH_202025` |
| `AIP_PUF_12_13_2023.csv` | `CMS_ACO_AIP_PUF_12_13_2023` |

---

#### 1.8 County-Level FFS Data (8 files)
**Purpose:** County-level fee-for-service benchmarking data

| Source Files | Target Tables |
|--------------|---------------|
| `County_Level_FFS_Data_for_Shared_Savings_Program_Benchmark_PUF_YYYY_MM_DD...csv` | `CMS_ACO_COUNTY_LEVEL_FFS_DATA_FOR_SHARED_SAVINGS_PROGRAM_BENCHMARK_PUF_*` |

**Years:** 2016-2024
**Key Columns:** County FIPS, per capita costs, risk scores
**Grain:** One row per county per year

---

#### 1.9 Assigned Beneficiaries by County (10 files)
**Purpose:** Number of assigned beneficiaries by county

| Source Files | Target Tables |
|--------------|---------------|
| `Number_Of_ACO_Assigned_Beneficiaries_by_County_PUF_YYYY_MM_DD.csv` | `CMS_ACO_NUMBER_OF_ACO_ASSIGNED_BENEFICIARIES_BY_COUNTY_PUF_*` |

**Years:** 2016-2024
**Grain:** One row per ACO per county per year

---

#### 1.10 Performance Results (13 files, yearly 2013-2024)
**Purpose:** Annual financial and quality performance results

| Source Files | Target Tables |
|--------------|---------------|
| `PY 2024 ACO Results PUF_Rerun_20250925.csv` | `CMS_ACO_PY_202024_20ACO_20RESULTS_20PUF_RERUN_20250925` |
| `PY 2023 ACO Results PUF.csv` | `CMS_ACO_PY_202023_20ACO_20RESULTS_20PUF` |
| `Performance_Year_Financial_and_Quality_Results_PUF_YYYY...csv` | `CMS_ACO_PERFORMANCE_YEAR_FINANCIAL_AND_QUALITY_RESULTS_*` |

**Years:** 2013-2024
**Key Columns:** ACO ID, total savings/losses, quality score, shared savings payment
**Grain:** One row per ACO per performance year

---

#### 1.11 Pioneer ACO Model (5 files)
**Purpose:** Pioneer ACO demonstration results (discontinued model)

| Source File | Target Table |
|-------------|--------------|
| `PIONEER_PY5_PUF1.csv` | `CMS_ACO_PIONEER_PY5_PUF1` |
| `PIONEER_PY4_PUF1.csv` | `CMS_ACO_PIONEER_PY4_PUF1` |
| `PIONEER_PY3PUF1.csv` | `CMS_ACO_PIONEER_PY3PUF1` |
| `PIONEER_PY2PUF1.csv` | `CMS_ACO_PIONEER_PY2PUF1` |
| `PIONEER_PY1PUF1.csv` | `CMS_ACO_PIONEER_PY1PUF1` |

**Years:** PY1-PY5 (2012-2016)
**Status:** Discontinued model

---

#### 1.12 ACO REACH Model (5 files)
**Purpose:** ACO Realizing Equity, Access, and Community Health model

| Source File | Target Table |
|-------------|--------------|
| `ACO_REACH_PUF Dataset_20260203.csv` | `CMS_ACO_ACO_REACH_PUF_20DATASET_20260203` |
| `ACO_REACH_PUF Dataset_03_10_2025.csv` | `CMS_ACO_ACO_REACH_PUF_20DATASET_03_10_2025` |
| `ACO_REACH_Dataset_01_18_2024.csv` | `CMS_ACO_ACO_REACH_DATASET_01_18_2024` |
| `ACO_REACH_Dataset_05_03_2023_v2.csv` | `CMS_ACO_ACO_REACH_DATASET_05_03_2023_V2` |
| `ACO_REACH_2022_03_24_2023.csv` | `CMS_ACO_ACO_REACH_2022_03_24_2023` |

**Key Columns:** DCE (Direct Contracting Entity) ID, performance metrics
**Grain:** One row per participating organization

---

#### 1.13 General ACO PUF (1 file)
**Purpose:** Comprehensive ACO public use file

| Source File | Target Table |
|-------------|--------------|
| `ACO_PUF.csv` | `CMS_ACO_ACO_PUF` |

---

## 2. Claims/Innovation Models (6 files) → `DEV_DB.RAW`

### Category: CMS Innovation Center Models

| Source File | Target Table | Description |
|-------------|--------------|-------------|
| `CPC_Initiative__Participating_Primary_Care_Practices.csv` | `CMS_CLAIMS_CPC_INITIATIVE_PARTICIPATING_PRIMARY_CARE_PRACTICES` | Comprehensive Primary Care practices |
| `Comprehensive_Care_for_Joint_Replacement_Model__Metropolitan_Statistical_Areas__MSAs_.csv` | `CMS_CLAIMS_COMPREHENSIVE_CARE_FOR_JOINT_REPLACEMENT_MODEL_*` | CJR model MSAs |
| `cms_innovation_advisors.csv` | `CMS_CLAIMS_CMS_INNOVATION_ADVISORS` | Innovation advisors list |
| `Socrata-ModelAwardees_6_22_21-1.csv` | `CMS_CLAIMS_SOCRATA_MODELAWARDEES_6_22_21_1` | Innovation model awardees |
| `WDDSE_Medicare_Demonstrations-Fixes-04-12-2024.csv` | `CMS_CLAIMS_WDDSE_MEDICARE_DEMONSTRATIONS_FIXES_*` | Medicare demonstrations |
| `Socrata-StrongStartAwardees_05-12-23-Fix-1.csv` | `CMS_CLAIMS_SOCRATA_STRONGSTARTAWARDEES_*` | Strong Start awardees |

**Purpose:** Innovation models, demonstrations, special programs
**Grain:** Varies by file (organizations, practices, MSAs)

---

## 3. Medicare Advantage (2 files) → `DEV_DB.RAW`

| Source File | Target Table | Description |
|-------------|--------------|-------------|
| `WDDSE_DataReports-ACO-RTC_01_14_26.csv` | `CMS_MA_WDDSE_DATAREPORTS_ACO_RTC_01_14_26` | ACO RTC data reports |
| `Milestones and Updates-BALANCE_12_23_25.csv` | `CMS_MA_MILESTONES_20AND_20UPDATES_BALANCE_12_23_25` | BALANCE model milestones |

---

## 4. Part D Data (11 files) → `DEV_DB.RAW_CMS_PARTD`

### Category: Medicare Part D Public Use Files

**Source:** CMS Part D monthly data releases
**Update Frequency:** Monthly
**Target Schema:** `RAW_CMS_PARTD` (separate schema for Part D)

| Data Type | Target Table | Source | Rows | Description |
|-----------|--------------|--------|------|-------------|
| **Drug Pricing** | `DRUG_PRICING` | Monthly pricing files | 53M | Drug costs by plan |
| **Pharmacy Networks** | `PHARMACY_NETWORKS` | Monthly network files | 34M | Pharmacy participation |
| **Formulary** | `FORMULARY` | Monthly formulary files | Varies | Drug coverage by plan |
| **Plan Information** | `PLAN_INFORMATION` | Monthly plan files | ~5,500 | Plan attributes |
| **Beneficiary Cost** | `BENEFICIARY_COST` | Monthly cost files | Varies | Member cost sharing |
| **Utilization** | `UTILIZATION` | Monthly utilization | Varies | Drug utilization stats |

**Key Columns:**
- `contract_id` - Plan contract identifier
- `plan_id` - Plan identifier
- `ndc` - National Drug Code
- `source_vintage` - Data vintage (YYYY-MM format, e.g., "2024-01")

**Critical:** Always include `source_vintage` for historical tracking!

**dbt Models:**
These raw tables feed into staging models:
- `stg_cms__formulary` → `STAGING_STAGING` (view)
- `stg_cms__plan_information` → `STAGING_STAGING` (view)
- `stg_cms__beneficiary_cost` → `STAGING_STAGING` (view)
- `stg_cms__spending_quarterly` → `STAGING_STAGING` (view)
- `stg_cms__spending_annual` → `STAGING_STAGING` (view)

---

## 5. Provider Data (~43 files) → `DEV_DB.RAW`

### Category: Provider Utilization Files

**Currently loaded:** Part D prescriber data is the largest (276M rows)

| Data Type | Target Table Example | Description |
|-----------|---------------------|-------------|
| **Part D Prescribers** | `RAW_PARTD_PRESCRIBERS_BY_DRUG` | Prescriber-level drug utilization |
| **Provider Enrollment** | `RAW_PROVIDER_ENROLLMENT_*` | Provider enrollment files |
| **Physician Compare** | `RAW_PHYSICIAN_COMPARE_*` | Physician quality metrics |
| **Hospital Compare** | `RAW_HOSPITAL_COMPARE_*` | Hospital quality metrics |
| **Nursing Home Compare** | `RAW_NURSING_HOME_*` | Nursing home quality |

**Note:** Full provider file inventory not shown - approximately 43 additional files

---

## Loading Patterns

### Pattern 1: Initial Load (One-Time)
```sql
-- Load from S3 stage
COPY INTO DEV_DB.RAW.CMS_ACO_PY2026_MEDICARE_SHARED_SAVINGS_PROGRAM_PARTICIPANTS
FROM @DEV_DB.RAW.S3_BCDA_STAGE/cms-data/aco/PY2026_Medicare_Shared_Savings_Program_Participants.csv
FILE_FORMAT = (FORMAT_NAME = 'DEV_DB.RAW.CSV_FORMAT')
ON_ERROR = CONTINUE;
```

### Pattern 2: Part D Monthly Refresh
```sql
-- Monthly Part D data with vintage tracking
COPY INTO DEV_DB.RAW_CMS_PARTD.DRUG_PRICING
FROM (
    SELECT
        $1::VARCHAR as contract_id,
        $2::VARCHAR as plan_id,
        $3::VARCHAR(11) as ndc,
        $4::NUMBER(10,2) as cost,
        '2024-01' as source_vintage,  -- Current month
        CURRENT_TIMESTAMP() as _loaded_at
    FROM @cms_stage/partd/pricing_202401.txt
)
FILE_FORMAT = (TYPE = 'CSV' FIELD_DELIMITER = '|')
ON_ERROR = CONTINUE;
```

### Pattern 3: Annual ACO Refresh
```sql
-- Annual ACO performance results (new file each year)
COPY INTO DEV_DB.RAW.CMS_ACO_PY_2024_ACO_RESULTS_PUF
FROM @DEV_DB.RAW.S3_BCDA_STAGE/cms-data/aco/PY_2024_ACO_Results_PUF.csv
FILE_FORMAT = (FORMAT_NAME = 'DEV_DB.RAW.CSV_FORMAT')
ON_ERROR = CONTINUE;
```

---

## Data Flow Architecture

```
CMS Data Sources
│
├─ ACO Data (91 files)
│  └─> S3: cms-data/aco/*.csv
│      └─> DEV_DB.RAW.CMS_ACO_*
│          └─> STAGING (dbt: stg_cms__mssp_aco_puf)
│              └─> STAGING_INTERMEDIATE (enriched)
│                  └─> STAGING_MARTS (marts)
│
├─ Part D Data (11 files)
│  └─> S3: cms-data/partd/*.txt
│      └─> DEV_DB.RAW_CMS_PARTD.*
│          └─> STAGING_STAGING (dbt: stg_cms__formulary, stg_cms__plan_information)
│              └─> STAGING_INTERMEDIATE (int_formulary_enriched)
│                  └─> STAGING_MARTS (mart_formulary_by_ndc) - 322M rows!
│
├─ Provider Data (~43 files)
│  └─> S3: cms-data/providers/*.csv
│      └─> DEV_DB.RAW.RAW_PARTD_PRESCRIBERS_BY_DRUG - 276M rows!
│          └─> STAGING (dbt: stg_cms__partd_prescribers_by_drug)
│              └─> STAGING_ANALYTICS (analytics_prescriber_summary)
│
└─ Claims/MA Data (8 files)
   └─> S3: cms-data/claims/*.csv, cms-data/ma/*.csv
       └─> DEV_DB.RAW.CMS_CLAIMS_*, CMS_MA_*
           └─> STAGING (as needed)
```

---

## Summary Table

| Schema | File Category | File Count | Naming Pattern | Update Frequency |
|--------|--------------|-----------|----------------|------------------|
| **RAW** | ACO | 91 | `CMS_ACO_*` | Annual (new files) |
| **RAW** | Claims/Innovation | 6 | `CMS_CLAIMS_*` | Periodic |
| **RAW** | Medicare Advantage | 2 | `CMS_MA_*` | Periodic |
| **RAW** | Providers | ~43 | `RAW_*` | Annual |
| **RAW_CMS_PARTD** | Part D | 11 | Various | **Monthly** |
| **RAW_CLAIMS** | BCDA Claims | 1 | `RAW_BCDA_*` | API extract |
| **RAW_RXNORM** | Drug Reference | 3 | Various | Quarterly |

**Total Files: 153+**

---

## Quick Reference: Finding Your Data

**Q: Where is ACO participant data?**
A: `DEV_DB.RAW.CMS_ACO_PY2026_MEDICARE_SHARED_SAVINGS_PROGRAM_PARTICIPANTS`

**Q: Where is Part D formulary data?**
A: `DEV_DB.RAW_CMS_PARTD.FORMULARY`

**Q: Where is prescriber drug utilization?**
A: `DEV_DB.RAW.RAW_PARTD_PRESCRIBERS_BY_DRUG` (276M rows)

**Q: Where is financial performance for ACOs?**
A: `DEV_DB.RAW.CMS_ACO_PY_2024_ACO_RESULTS_PUF` (latest year)

**Q: Where is plan information?**
A: `DEV_DB.RAW_CMS_PARTD.PLAN_INFORMATION`

---

## Loading Scripts

**Primary Script:** `/home/ubuntu/projects/healthcare-analytics/load_cms_p1_full.sql`
- Contains all 153 COPY INTO statements
- Loads from S3 stage
- Includes row count verification

**Test Script:** `/home/ubuntu/projects/healthcare-analytics/load_cms_p1.sql`
- Sample of 13 tables for testing

---

**Maintained By:** Platform Team
**Last Updated:** 2026-02-11
**Source:** CMS data catalog analysis + load script inventory
