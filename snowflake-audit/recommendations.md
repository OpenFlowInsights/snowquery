# Snowflake Schema Recommendations

**Generated:** 2026-02-11 03:30:44

---

## Summary

Total issues identified: **10**

- 🔴 **CRITICAL (5)**: Immediate action required - impacts performance, cost, or data integrity
- 🟡 **RECOMMENDED (4)**: Significant improvements - should implement soon
- 🟢 **NICE-TO-HAVE (1)**: Minor improvements - implement when convenient

## 🔴 CRITICAL Issues

### CRITICAL-1: Redundant schema name: STAGING_STAGING

**Category:** Naming

**Recommendation:** Rename to STAGING or merge with existing STAGING schema

**Impact:**
- 📋 **Maintainability:** Medium - Easier to understand and navigate

---

### CRITICAL-2: 11 tables with >1M rows (check clustering)

**Category:** Performance

**Details:** Large tables should have clustering keys for query performance

**Affected Tables:**

- `STAGING_MARTS.MART_FORMULARY_BY_NDC`: 322,051,523 rows, 6.75 GB
- `RAW.RAW_PARTD_PRESCRIBERS_BY_DRUG`: 276,284,275 rows, 6.00 GB
- `RAW.RAW_BCDA_EXPLANATION_OF_BENEFIT`: 1,458,413 rows, 0.36 GB
- `RAW_CMS_PARTD.PHARMACY_NETWORKS`: 34,101,960 rows, 0.28 GB
- `RAW_CMS_PARTD.DRUG_PRICING`: 53,249,171 rows, 0.20 GB

**Recommendation:** Add clustering keys based on common filter and join columns

**Impact:**
- ⚡ **Performance:** High - Queries will be significantly faster

---

### CRITICAL-3: Warehouse COMPUTE_WH has auto_suspend disabled

**Category:** Cost

**Recommendation:** Enable auto_suspend (recommend 300-600 seconds for dev warehouses)

**Impact:**
- 💰 **Cost:** High - Could save significant $$$ on compute costs

---

### CRITICAL-4: Warehouse SNOWFLAKE_LEARNING_WH has auto_suspend disabled

**Category:** Cost

**Recommendation:** Enable auto_suspend (recommend 300-600 seconds for dev warehouses)

**Impact:**
- 💰 **Cost:** High - Could save significant $$$ on compute costs

---

### CRITICAL-5: Warehouse SYSTEM$STREAMLIT_NOTEBOOK_WH has auto_suspend disabled

**Category:** Cost

**Recommendation:** Enable auto_suspend (recommend 300-600 seconds for dev warehouses)

**Impact:**
- 💰 **Cost:** High - Could save significant $$$ on compute costs

---

## 🟡 RECOMMENDED Improvements

### REC-1: Multiple STAGING_* schemas with redundant prefixes

**Category:** Naming

**Details:** Found 5 schemas: STAGING_ANALYTICS, STAGING_DBT_TEST__AUDIT, STAGING_INTERMEDIATE, STAGING_MARTS, STAGING_STAGING

**Recommendation:** Consolidate into STAGING (raw staging) and INTERMEDIATE (transformed)

---

### REC-2: 401 NUMBER columns using default precision

**Category:** Data_Types

**Details:** NUMBER(38,0) is overkill for most integer values

**Recommendation:** Use INT/BIGINT for integers, DECIMAL(p,s) for precise decimals, or FLOAT for approximate

---

### REC-3: Marts are in STAGING_MARTS instead of MARTS schema

**Category:** Organization

**Details:** 8 tables in STAGING_MARTS, 0 in MARTS

**Recommendation:** Move production marts to MARTS schema, keep STAGING_MARTS for development

---

### REC-4: Warehouse DEV_WH auto_suspend too aggressive (1s)

**Category:** Cost

**Recommendation:** Set to 300-600 seconds to avoid frequent cold starts

---

## 🟢 NICE-TO-HAVE Improvements

### NTH-1: 5 empty schemas

**Category:** Organization

**Details:** INFORMATION_SCHEMA, MARTS, PUBLIC, REFERENCE, STAGING

**Recommendation:** Remove unused schemas or document their intended purpose

---

## Implementation Priority

### Phase 1: Critical Fixes (Week 1)

1. **Redundant schema name: STAGING_STAGING** - naming
2. **11 tables with >1M rows (check clustering)** - performance
3. **Warehouse COMPUTE_WH has auto_suspend disabled** - cost
4. **Warehouse SNOWFLAKE_LEARNING_WH has auto_suspend disabled** - cost
5. **Warehouse SYSTEM$STREAMLIT_NOTEBOOK_WH has auto_suspend disabled** - cost

### Phase 2: Recommended Improvements (Week 2-3)

1. **Multiple STAGING_* schemas with redundant prefixes** - naming
2. **401 NUMBER columns using default precision** - data_types
3. **Marts are in STAGING_MARTS instead of MARTS schema** - organization
4. **Warehouse DEV_WH auto_suspend too aggressive (1s)** - cost

### Phase 3: Nice-to-Have (Ongoing)

1. **5 empty schemas** - organization

## Next Steps

1. **Review this document** with your team/stakeholders
2. **Approve CRITICAL changes** - These require your sign-off before implementation
3. **Review SQL scripts** in the `changes/` folder
4. **Test in DEV** first, then promote to PROD
5. **Execute rollback scripts** if needed (in `rollback/` folder)
