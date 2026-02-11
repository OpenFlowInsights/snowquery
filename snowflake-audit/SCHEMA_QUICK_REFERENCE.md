# Snowflake Schema Quick Reference

**Quick lookup guide for data loading decisions**

---

## 🎯 Where Does My Data Go?

### **CMS Part D Files** → `RAW_CMS_PARTD`
- Formulary files
- Drug pricing
- Pharmacy networks
- Plan information

```sql
COPY INTO DEV_DB.RAW_CMS_PARTD.DRUG_PRICING
FROM @cms_stage/pricing_202401.txt
FILE_FORMAT = (TYPE = 'CSV' FIELD_DELIMITER = '|');
```

### **Claims/EOB Data** → `RAW_CLAIMS`
- BCDA extracts
- Explanation of benefits
- Claims details

```sql
COPY INTO DEV_DB.RAW_CLAIMS.RAW_BCDA_EXPLANATION_OF_BENEFIT
FROM @bcda_stage/claims.json
FILE_FORMAT = (TYPE = 'JSON');
```

### **Provider/Prescriber Data** → `RAW`
- Part D prescriber files
- Provider enrollment
- Medicare utilization
- Quality metrics

```sql
COPY INTO DEV_DB.RAW.RAW_PARTD_PRESCRIBERS_BY_DRUG
FROM @public_use_files/partd_prescriber.csv;
```

### **Drug Reference Data** → `RAW_RXNORM`
- RxNorm concepts
- Drug names
- NDC mappings

```sql
COPY INTO DEV_DB.RAW_RXNORM.RXNCONSO
FROM @rxnorm_stage/RXNCONSO.RRF
FILE_FORMAT = (TYPE = 'CSV' FIELD_DELIMITER = '|');
```

---

## 📋 Schema Purposes

| Schema | Purpose | You Load Here If... |
|--------|---------|-------------------|
| **RAW** | General raw data | Provider files, enrollment, quality metrics |
| **RAW_CLAIMS** | Claims data | BCDA claims, EOB data |
| **RAW_CMS_PARTD** | Part D public files | CMS formularies, pricing, networks |
| **RAW_RXNORM** | Drug reference | RxNorm terminology data |
| **STAGING** | Cleaned data | Never load directly - populated by transformations |
| **STAGING_INTERMEDIATE** | Joined data | Never load directly - populated by dbt/transformations |
| **STAGING_MARTS** | Development marts | Never load directly - populated by mart builds |
| **MARTS** | Production marts | Never load directly - promoted from STAGING_MARTS |
| **REFERENCE** | Lookup tables | State codes, plan types, static mappings |

---

## 🔄 Data Flow

```
External Source
    ↓
RAW_* (load here!)
    ↓
STAGING (clean & type)
    ↓
STAGING_INTERMEDIATE (join & enrich)
    ↓
STAGING_MARTS (aggregate)
    ↓
MARTS (production)
```

---

## 🚀 Common Load Commands

### CSV with header
```sql
COPY INTO DEV_DB.RAW.table_name
FROM @stage/file.csv
FILE_FORMAT = (TYPE = 'CSV' SKIP_HEADER = 1);
```

### Pipe-delimited (CMS format)
```sql
COPY INTO DEV_DB.RAW_CMS_PARTD.table_name
FROM @stage/file.txt
FILE_FORMAT = (TYPE = 'CSV' FIELD_DELIMITER = '|');
```

### JSON
```sql
COPY INTO DEV_DB.RAW_CLAIMS.table_name
FROM @stage/file.json
FILE_FORMAT = (TYPE = 'JSON');
```

### With transformations
```sql
COPY INTO DEV_DB.RAW.table_name
FROM (
    SELECT
        $1::VARCHAR as col1,
        $2::DATE as col2,
        CURRENT_TIMESTAMP() as _loaded_at
    FROM @stage/file.csv
)
FILE_FORMAT = (TYPE = 'CSV');
```

---

## ⚠️ Key Rules

**DO:**
- ✅ Always load raw data to RAW_* schemas
- ✅ Include `source_vintage` for CMS data (e.g., '2024-01')
- ✅ Add `_loaded_at` timestamp
- ✅ Use original source column names in RAW
- ✅ Document grain and primary keys

**DON'T:**
- ❌ Don't transform in RAW layer - load as-is
- ❌ Don't load directly to STAGING/MARTS
- ❌ Don't mix different data vintages in same table
- ❌ Don't skip metadata columns (_loaded_at, source_vintage)

---

## 📊 Check Your Loads

```sql
-- See recent loads
SELECT
    table_schema,
    table_name,
    row_count,
    bytes / 1024 / 1024 / 1024 as size_gb
FROM DEV_DB.INFORMATION_SCHEMA.TABLES
WHERE table_schema LIKE 'RAW%'
ORDER BY row_count DESC;

-- Check freshness
SELECT
    table_name,
    MAX(_loaded_at) as last_load
FROM DEV_DB.RAW.table_name
GROUP BY table_name;
```

---

## 🆘 Need Help?

**Detailed documentation:**
- See `schema-guide-skill.md` for complete details
- See `schema_audit.md` for current inventory

**Questions:**
- Where does X data go? → Check the decision tree in schema-guide-skill.md
- How do I load Y format? → See loading examples in schema-guide-skill.md
- What's the grain of this table? → Check schema_audit.md

---

**Last Updated:** 2026-02-11
**Maintained By:** Platform Team
