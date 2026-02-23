# Document API Configuration Guide

## Overview

This document provides the configuration details needed to set up Document API configurations for fetching shipment documents (POD and BOL) from the Synergize Document Service.

**Authentication:** The application already has authentication configured. Select "Synergize" from the Authentication dropdown.

---

## Configuration 1: POD (Proof of Delivery)

### Basic Settings

| Field | Value |
|-------|-------|
| Configuration Name | `POD` |
| Authentication | Select "Synergize" from dropdown |

### Search API URL (API #1)

```
https://honsyn.tmwcloud.com/SynergizeServices/DocumentService/api/Repositories/XPSARDOCS/Documents
```

### $filter Parameters for Search API URL

Create the following filter parameters:

| # | Field Name | Value Type | Variable Name / Static Value |
|---|------------|------------|------------------------------|
| 1 | `FBNumber` | Variable (from shipment) | Bill Number (billNumber) |
| 2 | `In_DocTypeName` | Static Value | `POD` |

### Response Field Mappings

| Field | API Response Property |
|-------|----------------------|
| Document ID Field | `In_DocID` |
| Document Name Field | `fileName` |

---

## Configuration 2: BOL (Bill of Lading)

### Basic Settings

| Field | Value |
|-------|-------|
| Configuration Name | `BOL` |
| Authentication | Select "Synergize" from dropdown |

### Search API URL (API #1)

```
https://honsyn.tmwcloud.com/SynergizeServices/DocumentService/api/Repositories/XPSARDOCS/Documents
```

### $filter Parameters for Search API URL

Create the following filter parameters:

| # | Field Name | Value Type | Variable Name / Static Value |
|---|------------|------------|------------------------------|
| 1 | `FBNumber` | Variable (from shipment) | Bill Number (billNumber) |
| 2 | `In_DocTypeName` | Static Value | `BOL` |

### Response Field Mappings

| Field | API Response Property |
|-------|----------------------|
| Document ID Field | `In_DocID` |
| Document Name Field | `fileName` |

---

## Step-by-Step Instructions

### Creating a New Document Configuration

1. Click "+ Add Document Configuration"
2. Enter the **Configuration Name** (e.g., "POD" or "BOL")
3. Select **Authentication** from the dropdown - choose "Synergize"
4. Enter the **Search API URL**:
   ```
   https://honsyn.tmwcloud.com/SynergizeServices/DocumentService/api/Repositories/XPSARDOCS/Documents
   ```

### Adding Filter Parameters

5. Click **"+ Add Filter"** to add the first filter parameter
6. Configure the FBNumber filter:
   - Field Name: `FBNumber`
   - Value Type: Select "Variable (from shipment)"
   - Variable Name: Select "Bill Number (billNumber)"

7. Click **"+ Add Filter"** again for the document type filter
8. Configure the Document Type filter:
   - Field Name: `In_DocTypeName`
   - Value Type: Select "Static Value"
   - Static Value: Enter `POD` (or `BOL` for the BOL configuration)

### Configuring Response Field Mappings

9. In the **Response Field Mappings** section:
   - Document ID Field: Enter `In_DocID`
   - Document Name Field: Enter `fileName`

### Save Configuration

10. Click **"Save Configuration"** to save

---

## Summary of Configurations to Create

| Config Name | Document Type Filter | Purpose |
|-------------|---------------------|---------|
| POD | `In_DocTypeName = 'POD'` | Fetch Proof of Delivery documents |
| BOL | `In_DocTypeName = 'BOL'` | Fetch Bill of Lading documents |

Both configurations use:
- Same Search API URL
- Same FBNumber variable filter (using billNumber from shipment)
- Same response field mappings (In_DocID, fileName)
- Same authentication (Synergize)

The only difference between them is:
- Configuration Name
- The static value for `In_DocTypeName` filter (POD vs BOL)
