# Schema Guide Skill - Data Loading Reference

**Purpose:** Describes the organization and purpose of each schema in DEV_DB to guide data loading decisions.

---

## Schema Architecture Overview

The database follows a **medallion architecture** pattern with three main layers:

```
┌─────────────────────────────────────────────────────────┐
│                     CONSUMPTION                          │
│  MARTS (0 tables) - Production analytics marts          │
│  STAGING_MARTS (8 tables) - Development marts           │
└─────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────┐
│                    TRANSFORMATION                        │
│  STAGING_INTERMEDIATE (5 tables) - Enriched data        │
│  STAGING_ANALYTICS (9 tables) - Analytics prep          │
│  STAGING_STAGING (18 views) - Staging views             │
└─────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────┐
│                      RAW/LANDING                         │
│  RAW (76 tables) - General raw data                     │
│  RAW_CLAIMS (1 table) - Claims data from BCDA           │
│  RAW_CMS_PARTD (11 tables) - CMS Part D public files    │
│  RAW_RXNORM (3 tables) - RxNorm drug reference          │
└─────────────────────────────────────────────────────────┘
                            ↑
                      External Sources
```

---

## 🔵 RAW Layer Schemas (Bronze) - "Just Load It"

### **RAW** (76 tables)
**Purpose:** General purpose raw data landing zone
**Data Type:** Mixed - CMS public use files, provider data, quality measures
**Loading Pattern:** Direct copy from source, no transformations

**Contents:**
- CMS Provider data (prescribers, physicians, hospitals)
- Part D prescriber drug utilization
- Medicare Advantage enrollment
- Quality measures and star ratings
- Geographic reference files

**Example Tables:**
- `RAW_PARTD_PRESCRIBERS_BY_DRUG` (276M rows) - Part D prescriber drug utilization
- `RAW_CMS_PROVIDER_*` - Various provider files
- `RAW_MEDICARE_ENROLLMENT_*` - Enrollment data

**Loading Guidance:**
```sql
-- Load raw files AS-IS, preserve original structure
COPY INTO DEV_DB.RAW.target_table
FROM @my_stage/file.csv
FILE_FORMAT = (TYPE = 'CSV' SKIP_HEADER = 1)
ON_ERROR = 'CONTINUE';  -- Log errors but continue

-- Always add metadata columns
ALTER TABLE DEV_DB.RAW.target_table
ADD COLUMN _loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP();
```

**Best Practices:**
- ✅ Keep original column names from source
- ✅ Use VARCHAR for all string fields initially
- ✅ Add `_loaded_at` timestamp
- ✅ Add `source_file` metadata column
- ❌ Don't transform data here
- ❌ Don't enforce constraints

---

### **RAW_CLAIMS** (1 table)
**Purpose:** Claims data from BCDA (Beneficiary Claims Data API)
**Data Type:** Healthcare claims - Explanation of Benefits
**Loading Pattern:** API extracts from CMS BCDA

**Contents:**
- `RAW_BCDA_EXPLANATION_OF_BENEFIT` (1.5M rows) - Claims/EOB data

**Loading Guidance:**
```sql
-- Load from BCDA API extracts
-- Typically JSON format, flatten to columns
CREATE OR REPLACE TABLE DEV_DB.RAW_CLAIMS.RAW_BCDA_EXPLANATION_OF_BENEFIT (
    claim_id VARCHAR,
    patient_id VARCHAR,
    provider_id VARCHAR,
    service_date DATE,
    claim_data VARIANT,  -- Store full JSON
    _loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Use VARIANT for complex nested structures
-- Flatten in staging layer
```

**Best Practices:**
- ✅ Use VARIANT for JSON data
- ✅ Include patient/member identifiers
- ✅ Preserve claim_id as primary key
- ⚠️ PHI data - ensure proper access controls
- ⚠️ Consider data retention policies (HIPAA)

---

### **RAW_CMS_PARTD** (11 tables)
**Purpose:** CMS Part D public use files (formularies, pricing, networks)
**Data Type:** CMS monthly/quarterly data releases
**Loading Pattern:** Download from CMS, load monthly

**Contents:**
- `DRUG_PRICING` (53M rows) - Drug pricing by plan
- `PHARMACY_NETWORKS` (34M rows) - Pharmacy network files
- `FORMULARY_*` - Formulary files by plan
- `PLAN_INFORMATION` - Plan attributes

**Example Tables:**
```
DRUG_PRICING - Monthly drug pricing data
PHARMACY_NETWORKS - Pharmacy network participation
FORMULARY - Drug formulary coverage
PLAN_INFORMATION - Plan details and attributes
```

**Loading Guidance:**
```sql
-- CMS files have standard format
-- Load with source vintage tracking
CREATE OR REPLACE TABLE DEV_DB.RAW_CMS_PARTD.DRUG_PRICING (
    contract_id VARCHAR,
    plan_id VARCHAR,
    ndc VARCHAR(11),
    drug_name VARCHAR,
    tier_level INTEGER,
    cost_sharing_amount NUMBER(10,2),
    source_vintage VARCHAR(7),  -- e.g., "2024-01"
    _loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Always include source_vintage for historical tracking
INSERT INTO DEV_DB.RAW_CMS_PARTD.DRUG_PRICING
SELECT
    *,
    '2024-01' as source_vintage,
    CURRENT_TIMESTAMP() as _loaded_at
FROM @cms_stage/formulary_jan_2024.txt;
```

**Best Practices:**
- ✅ Always include `source_vintage` column (YYYY-MM or YYYY-Q#)
- ✅ Partition by vintage for query performance
- ✅ Use standard CMS column names
- ✅ Add `contract_id` and `plan_id` for joins
- 🔄 Monthly reload - truncate/load or append new vintage

---

### **RAW_RXNORM** (3 tables)
**Purpose:** RxNorm drug reference data from NLM
**Data Type:** Drug terminology and mappings
**Loading Pattern:** Quarterly refresh from RxNorm release

**Contents:**
- `RXNCONSO` - Drug concepts and names
- `RXNSAT` - Drug attributes
- `RXNREL` - Drug relationships

**Loading Guidance:**
```sql
-- RxNorm is a reference data set
-- Load from RxNorm RRF files
COPY INTO DEV_DB.RAW_RXNORM.RXNCONSO
FROM @rxnorm_stage/RXNCONSO.RRF
FILE_FORMAT = (TYPE = 'CSV' FIELD_DELIMITER = '|');

-- Add version tracking
ALTER TABLE DEV_DB.RAW_RXNORM.RXNCONSO
ADD COLUMN rxnorm_version VARCHAR,
ADD COLUMN _loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP();
```

**Best Practices:**
- ✅ Track RxNorm release version
- ✅ Full reload on each release (not incremental)
- ✅ Keep as reference data (no updates needed between releases)
- 📅 Update quarterly when NLM releases new version

---

## 🟡 STAGING Layer Schemas (Silver) - "Clean & Enrich"

### **STAGING** (0 tables currently)
**Purpose:** Intended for cleaned/standardized staging tables
**Current Status:** Empty - being consolidated
**Recommendation:** Use this as the primary staging schema going forward

**Loading Guidance:**
```sql
-- Move cleaned/typed data from RAW
CREATE OR REPLACE TABLE DEV_DB.STAGING.cleaned_claims AS
SELECT
    claim_id,
    CAST(patient_id AS VARCHAR(50)) as patient_id,
    TRY_TO_DATE(service_date) as service_date,
    CAST(claim_amount AS DECIMAL(10,2)) as claim_amount,
    -- Add business rules
    CASE
        WHEN claim_status = 'P' THEN 'PAID'
        WHEN claim_status = 'D' THEN 'DENIED'
        ELSE 'UNKNOWN'
    END as claim_status_description
FROM DEV_DB.RAW_CLAIMS.RAW_BCDA_EXPLANATION_OF_BENEFIT
WHERE service_date IS NOT NULL;  -- Data quality filter
```

**Best Practices:**
- ✅ Apply data type conversions (VARCHAR → DATE, NUMBER, etc.)
- ✅ Standardize naming (UPPER_CASE)
- ✅ Add business logic columns
- ✅ Filter out invalid records
- ❌ Don't aggregate yet (that's for MARTS)

---

### **STAGING_STAGING** (18 views)
**Purpose:** Views on staged data (redundant naming - see schema audit)
**Current Status:** Contains transformation views
**Recommendation:** Migrate views to STAGING schema

**Contents:** Mostly dbt staging views (stg_cms__*, stg_partd__*)

**Note:** This schema will be consolidated into STAGING per recommendations.

---

### **STAGING_INTERMEDIATE** (5 tables)
**Purpose:** Enriched and joined data for analytics
**Data Type:** Business logic applied, multi-table joins
**Loading Pattern:** dbt transformations, incrementally updated

**Contents:**
- Enriched formulary data (formulary + drug names + pricing)
- Provider + prescriber joined datasets
- Claims with member demographics

**Loading Guidance:**
```sql
-- Join multiple cleaned tables
CREATE OR REPLACE TABLE DEV_DB.STAGING_INTERMEDIATE.INT_FORMULARY_ENRICHED AS
SELECT
    f.contract_plan_id,
    f.plan_name,
    f.ndc,
    r.drug_name,
    r.rxcui,
    p.unit_price,
    f.tier_level,
    f.prior_auth_required,
    f.source_vintage
FROM DEV_DB.STAGING.stg_formulary f
LEFT JOIN DEV_DB.RAW_RXNORM.RXNCONSO r
    ON f.ndc = r.ndc
LEFT JOIN DEV_DB.STAGING.stg_pricing p
    ON f.contract_plan_id = p.contract_plan_id
    AND f.ndc = p.ndc
    AND f.source_vintage = p.source_vintage;
```

**Best Practices:**
- ✅ Apply business logic and enrichment
- ✅ Join reference data (RxNorm, geography, etc.)
- ✅ Add calculated columns
- ✅ Maintain grain from source tables
- ⚠️ Document grain and join logic

---

### **STAGING_ANALYTICS** (9 tables)
**Purpose:** Pre-aggregated or analytics-ready tables
**Data Type:** Denormalized for BI tools
**Loading Pattern:** Scheduled refreshes (daily/weekly)

**Contents:**
- Analytics-ready datasets
- Denormalized for reporting
- Pre-calculated metrics

**Loading Guidance:**
```sql
-- Create analytics-ready table
CREATE OR REPLACE TABLE DEV_DB.STAGING_ANALYTICS.ANALYTICS_PRESCRIBER_SUMMARY AS
SELECT
    npi,
    prescriber_name,
    state,
    specialty,
    year,
    COUNT(DISTINCT drug_name) as unique_drugs_prescribed,
    SUM(claim_count) as total_claims,
    SUM(total_cost) as total_cost,
    AVG(cost_per_claim) as avg_cost_per_claim
FROM DEV_DB.STAGING_INTERMEDIATE.INT_PRESCRIBER_DRUG_DETAIL
GROUP BY npi, prescriber_name, state, specialty, year;
```

**Best Practices:**
- ✅ Denormalize for performance
- ✅ Pre-calculate common metrics
- ✅ Add summary/aggregate tables
- ⚠️ Balance freshness vs. compute cost

---

## 🟢 MARTS Layer Schemas (Gold) - "Analytics Ready"

### **MARTS** (0 tables currently)
**Purpose:** Production analytics marts for end users
**Current Status:** Empty - marts are in STAGING_MARTS
**Recommendation:** Move production-ready marts here

**Loading Guidance:**
```sql
-- Promote from STAGING_MARTS when validated
CREATE OR REPLACE TABLE DEV_DB.MARTS.MART_PLAN_PA_BURDEN AS
SELECT * FROM DEV_DB.STAGING_MARTS.MART_PLAN_PA_BURDEN;

-- Grant access to analyst role
GRANT SELECT ON DEV_DB.MARTS.MART_PLAN_PA_BURDEN TO ROLE PLATFORM_ANALYST;
```

---

### **STAGING_MARTS** (8 tables)
**Purpose:** Development/staging analytics marts
**Current Status:** Contains active marts (should be in MARTS)
**Recommendation:** Move to MARTS when validated

**Contents:**
- `MART_FORMULARY_BY_NDC` (322M rows) - Formulary detail mart
- `MART_PLAN_PA_BURDEN` - Prior auth burden analysis
- `MART_DRUG_UTILIZATION` - Drug utilization patterns
- Other analytics marts

**Loading Guidance:**
```sql
-- Build final analytical mart
CREATE OR REPLACE TABLE DEV_DB.STAGING_MARTS.MART_PLAN_PA_BURDEN AS
SELECT
    contract_plan_id,
    plan_name,
    plan_category,
    state,
    source_vintage,
    COUNT(*) as total_formulary_drugs,
    SUM(CASE WHEN prior_auth_required = 'Y' THEN 1 ELSE 0 END) as drugs_with_pa,
    ROUND(100.0 * drugs_with_pa / NULLIF(total_formulary_drugs, 0), 2) as pct_drugs_with_pa,
    -- More metrics...
    CURRENT_TIMESTAMP() as _refreshed_at
FROM DEV_DB.STAGING_INTERMEDIATE.INT_FORMULARY_ENRICHED
GROUP BY contract_plan_id, plan_name, plan_category, state, source_vintage;

-- Add clustering for performance
ALTER TABLE DEV_DB.STAGING_MARTS.MART_PLAN_PA_BURDEN
CLUSTER BY (source_vintage, contract_plan_id);
```

**Best Practices:**
- ✅ One row per analytical grain
- ✅ Include all dimensions needed for slicing
- ✅ Pre-calculate measures
- ✅ Add clustering keys on large marts (see audit recommendations)
- ✅ Include `_refreshed_at` timestamp
- ⚠️ Document mart grain and business logic

---

## 🔶 REFERENCE Schemas

### **REFERENCE** (0 tables currently)
**Purpose:** Reference/lookup data (states, codes, mappings)
**Current Status:** Empty
**Recommendation:** Use for static reference data

**Loading Guidance:**
```sql
-- Load reference data
CREATE OR REPLACE TABLE DEV_DB.REFERENCE.STATE_CODES (
    state_code VARCHAR(2) PRIMARY KEY,
    state_name VARCHAR(50),
    census_region VARCHAR(20),
    census_division VARCHAR(30)
);

INSERT INTO DEV_DB.REFERENCE.STATE_CODES VALUES
    ('AL', 'Alabama', 'South', 'East South Central'),
    ('AK', 'Alaska', 'West', 'Pacific'),
    -- etc...
```

**Best Practices:**
- ✅ Small, relatively static datasets
- ✅ Add primary keys
- ✅ Version control the data (check into git)
- ✅ Include effective dates if time-variant

---

## 📋 Data Loading Decision Tree

```
Start: Where should I load this data?

┌─ Is it raw/unprocessed from external source?
│  YES → Load to RAW_* schema
│  │
│  ├─ Is it CMS Part D data?
│  │  YES → RAW_CMS_PARTD
│  │
│  ├─ Is it claims/EOB data?
│  │  YES → RAW_CLAIMS
│  │
│  ├─ Is it drug reference data?
│  │  YES → RAW_RXNORM
│  │
│  └─ General healthcare data?
│     YES → RAW
│
├─ Is it cleaned/typed but not aggregated?
│  YES → STAGING (or STAGING_INTERMEDIATE if joined)
│
├─ Is it a multi-table join with business logic?
│  YES → STAGING_INTERMEDIATE
│
├─ Is it pre-aggregated for analytics?
│  YES → STAGING_ANALYTICS
│
├─ Is it a production analytics mart?
│  YES → MARTS (or STAGING_MARTS for dev)
│
└─ Is it static reference/lookup data?
   YES → REFERENCE
```

---

## 🔄 Data Flow Patterns

### Pattern 1: CMS Public File Load
```
External Source (CMS.gov)
    ↓
RAW_CMS_PARTD.DRUG_PRICING (raw CSV)
    ↓
STAGING.STG_DRUG_PRICING (cleaned, typed)
    ↓
STAGING_INTERMEDIATE.INT_FORMULARY_ENRICHED (joined with RxNorm)
    ↓
STAGING_MARTS.MART_FORMULARY_BY_NDC (analytical mart)
    ↓
MARTS.MART_FORMULARY_BY_NDC (promoted to production)
```

### Pattern 2: Claims Data Load
```
BCDA API (CMS)
    ↓
RAW_CLAIMS.RAW_BCDA_EXPLANATION_OF_BENEFIT (JSON VARIANT)
    ↓
STAGING.STG_CLAIMS (flattened, typed)
    ↓
STAGING_INTERMEDIATE.INT_CLAIMS_WITH_MEMBER (joined with member demographics)
    ↓
STAGING_ANALYTICS.ANALYTICS_CLAIMS_SUMMARY (pre-aggregated)
    ↓
MARTS.MART_CLAIMS_METRICS (production mart)
```

### Pattern 3: Reference Data Load
```
External Source (RxNorm, Census, etc.)
    ↓
RAW_RXNORM.RXNCONSO (raw reference)
    ↓
REFERENCE.DRUG_REFERENCE (cleaned, versioned)
```

---

## 🛠️ Common Loading Commands

### Load CSV file
```sql
COPY INTO DEV_DB.RAW.target_table
FROM @my_stage/file.csv
FILE_FORMAT = (
    TYPE = 'CSV'
    SKIP_HEADER = 1
    FIELD_OPTIONALLY_ENCLOSED_BY = '"'
    NULL_IF = ('NULL', 'N/A', '')
)
ON_ERROR = 'CONTINUE';
```

### Load JSON file
```sql
COPY INTO DEV_DB.RAW_CLAIMS.target_table
FROM @my_stage/file.json
FILE_FORMAT = (
    TYPE = 'JSON'
    STRIP_OUTER_ARRAY = TRUE
);
```

### Load with transformation
```sql
COPY INTO DEV_DB.RAW.target_table
FROM (
    SELECT
        $1::VARCHAR as column1,
        $2::DATE as column2,
        $3::NUMBER(10,2) as column3,
        CURRENT_TIMESTAMP() as _loaded_at
    FROM @my_stage/file.csv
)
FILE_FORMAT = (TYPE = 'CSV' SKIP_HEADER = 1);
```

### Incremental load (append new records)
```sql
-- Only load records newer than last load
INSERT INTO DEV_DB.RAW.target_table
SELECT *
FROM @my_stage/file.csv
WHERE load_date > (
    SELECT MAX(_loaded_at) FROM DEV_DB.RAW.target_table
);
```

### Full reload (truncate and load)
```sql
-- For dimension tables or full refreshes
TRUNCATE TABLE DEV_DB.RAW_CMS_PARTD.PLAN_INFORMATION;

COPY INTO DEV_DB.RAW_CMS_PARTD.PLAN_INFORMATION
FROM @cms_stage/plan_information.txt
FILE_FORMAT = (TYPE = 'CSV' FIELD_DELIMITER = '|');
```

---

## 🔐 Security & Compliance

### HIPAA Considerations
- ⚠️ PHI in RAW_CLAIMS - restrict access
- ⚠️ Member/patient IDs - consider masking
- ⚠️ Prescriber NPI - de-identify where possible

### Access Control Pattern
```sql
-- RAW layer: Limited access
GRANT SELECT ON SCHEMA DEV_DB.RAW_CLAIMS TO ROLE PLATFORM_DEVELOPER;

-- STAGING layer: Developer access
GRANT SELECT ON SCHEMA DEV_DB.STAGING TO ROLE PLATFORM_ANALYST;
GRANT SELECT ON SCHEMA DEV_DB.STAGING TO ROLE PLATFORM_DEVELOPER;

-- MARTS layer: Analyst access
GRANT SELECT ON SCHEMA DEV_DB.MARTS TO ROLE PLATFORM_ANALYST;
GRANT SELECT ON ALL TABLES IN SCHEMA DEV_DB.MARTS TO ROLE PLATFORM_ANALYST;
```

---

## 📊 Monitoring & Maintenance

### Check load status
```sql
-- Recent loads
SELECT
    table_schema,
    table_name,
    MAX(_loaded_at) as last_load,
    COUNT(*) as row_count
FROM DEV_DB.RAW.*  -- Check all RAW tables
GROUP BY table_schema, table_name
ORDER BY last_load DESC;
```

### Data freshness check
```sql
-- Tables that haven't been updated recently
SELECT
    table_catalog,
    table_schema,
    table_name,
    row_count,
    last_altered,
    DATEDIFF(day, last_altered, CURRENT_DATE()) as days_since_update
FROM DEV_DB.INFORMATION_SCHEMA.TABLES
WHERE table_type = 'BASE TABLE'
    AND days_since_update > 30  -- Flag stale tables
ORDER BY days_since_update DESC;
```

---

## 📚 Quick Reference

| Schema | Purpose | Load Pattern | Example Data |
|--------|---------|--------------|--------------|
| RAW | General raw data | As-is copy | Provider files, enrollment |
| RAW_CLAIMS | Claims data | API extract | EOB, claims |
| RAW_CMS_PARTD | Part D public files | Monthly download | Formularies, pricing |
| RAW_RXNORM | Drug reference | Quarterly refresh | Drug names, mappings |
| STAGING | Cleaned data | Typed, validated | Cleaned tables |
| STAGING_INTERMEDIATE | Joined data | Multi-table joins | Enriched datasets |
| STAGING_ANALYTICS | Analytics-ready | Pre-aggregated | Denormalized for BI |
| STAGING_MARTS | Dev marts | Aggregated | Analytical marts (dev) |
| MARTS | Prod marts | Promoted | Analytical marts (prod) |
| REFERENCE | Lookup data | Static | State codes, mappings |

---

**Created:** 2026-02-11
**Source:** Snowflake Architecture Review
**Maintained By:** Platform Team
