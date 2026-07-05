---
description: Export campaign contacts to CSV via api_export_contacts, with qualified/validity filters and custom fields.
model: sonnet
thinking: false
---

# Export Campaign Contacts

Export campaign contacts to CSV using the Ken AI MCP.

## Arguments

- `$ARGUMENTS` - Campaign identifier with optional filters and custom fields

**Formats:**
```
/ken-ai:export-campaign 227
/ken-ai:export-campaign "Fashion & Apparel"
/ken-ai:export-campaign ./ken-campaigns/mobiloud/01-23 - plan 1/1 - fashion-apparel
/export 227 --not-qualified
/export 227 --invalid
/export 227 --not-qualified --risky
/export 227 --fields "customField1,customField2"
```

**Filters:**

| Filter | Description |
|--------|-------------|
| `--qualified` | Only qualified contacts (DEFAULT) |
| `--not-qualified` | Only not qualified contacts |
| `--all-qualification` | All contacts regardless of qualification |
| `--valid` | Only valid emails (DEFAULT) |
| `--invalid` | Only invalid emails |
| `--risky` | Only risky emails |
| `--catchall` | Only catchall emails |
| `--unknown` | Only unknown email validity |
| `--all-emails` | All contacts regardless of email validity |

**Defaults:** `--qualified --valid` (qualified contacts with valid emails)

## Execution

### Step 1: Parse Arguments

Extract from `$ARGUMENTS`:
- `campaign_ref`: Campaign ID, name, or path
- `qualification_filter`: "qualified" (default), "not_qualified", or "all"
- `email_validity_filter`: "valid" (default), "invalid", "risky", "catchall", "unknown", or "all"
- `custom_fields`: Array of field names if `--fields` specified

**Email Validity Codes:**
| Code | Status   |
|------|----------|
| 1    | Valid    |
| 2    | Invalid  |
| 3    | Risky    |
| 4    | Catchall |
| 0    | Unknown  |

### Step 2: Resolve Campaign

Determine `campaign_id`, `campaign_name`, and `client_name`.

**If numeric** - Query database for details:
```
db_execute_parameterized_query(
  query="SELECT c.id, c.name, cl.name as client_name FROM campaign c JOIN client cl ON c.client_id = cl.id WHERE c.id = %s AND c.is_deleted = 0",
  params=[campaign_ref]
)
```

**If path** - Read `configuration.json` from the campaign folder:
```
Read: {path}/configuration.json
Extract: campaign_id field
Then query database for full details using the ID
```

**If text** - Search for matching campaign:

Priority 1: Search local filesystem:
```
Glob: **/configuration.json   (campaign workspaces live at ./ken-campaigns/{client-slug}/ by default)
```
Read each config and check if `campaign_name` matches (case-insensitive, partial match OK).

Priority 2: If no local match, query database:
```
db_execute_parameterized_query(
  query="SELECT c.id, c.name, cl.name as client_name FROM campaign c JOIN client cl ON c.client_id = cl.id WHERE c.name LIKE %s AND c.is_deleted = 0 ORDER BY c.created_datetime DESC LIMIT 5",
  params=["%{search_term}%"]
)
```

If multiple matches found, present options and ask user to select.

### Step 3: Determine Export Type and Build Query

**Export Type:**
- Simple: `export_type = "csv"` (no `--fields`)
- Advanced: `export_type = "csv_custom"` (with `--fields`)

**Base fields for advanced export:**
```
contact_id, first_name, last_name, full_name, profile_url, email,
company_name, json_geo_location, company_linkedin_url, company_website,
audience_id, company_address, company_country, job_title, profile_country
```

**Qualification Filter Mapping:**
- `--qualified` → `qualified=True`
- `--not-qualified` → `qualified=False`
- `--all-qualification` → `qualified=None`

### Step 4: Execute Export

The Ken AI API `api_export_contacts` supports the `qualified` parameter directly.

For email validity filtering, use a database query to get contact IDs first, then export:

**If email validity filter is NOT "all" or "valid":**

First, get filtered contact IDs:
```sql
SELECT DISTINCT c.id
FROM contacts c
JOIN emails e ON e.contact_id = c.id
WHERE c.campaign_id = %s
  AND c.is_deleted = 0
  AND e.is_deleted = 0
  AND e.email_validity = %s
  {AND c.qualified = %s if not "all"}
```

Then use `csv_custom` export with filtered contacts.

**Standard Export (qualified + valid - the defaults):**
```
api_export_contacts(
    export_type="csv",
    campaign_id=<campaign_id>,
    qualified=True,
    include_emails=True,
    include_phones=True,
    include_company=True
)
```

Note: The API exports contacts with valid emails by default when using standard export.

**Advanced Export with custom fields:**
```
api_export_contacts(
    export_type="csv_custom",
    campaign_id=<campaign_id>,
    qualified=<True/False/None>,
    custom_fields=<merged_fields_array>
)
```

### Step 5: Save the Exported File

The CSV export is synchronous and returns a download link in `data.fileUrl`.

Destination: `{plan folder}/exports/` when the campaign folder is known, else `./exports/` under the current directory (create the folder if needed).

Filename: `[client_name] - [campaign_id] - [campaign_name].csv`

Add filter suffix if non-default filters used:
- `[client_name] - [campaign_id] - [campaign_name] (not qualified).csv`
- `[client_name] - [campaign_id] - [campaign_name] (invalid emails).csv`

**Sanitize filename** - Replace with `-`:
- `&`, `/`, `\`, `:`

Download (portable shell):
```bash
mkdir -p "<dest_dir>" && curl -L -o "<dest_dir>/<sanitized>.csv" "<fileUrl>"
```

If the download fails (network policy, expired link), give the user the `fileUrl` directly - it is the deliverable.

### Step 6: Report Results

Output:
- Full path to exported file
- Number of records exported
- Filters applied
- Fields included (for advanced export)

Example:
```
Exported 1,247 contacts to:
  ./ken-campaigns/mobiloud/01-23 - plan 1/exports/MobiLoud - 227 - Fashion - Apparel.csv

Filters: qualified=yes, email_validity=valid (defaults)
```

Example with non-default filters:
```
Exported 342 contacts to:
  ./ken-campaigns/mobiloud/01-23 - plan 1/exports/MobiLoud - 227 - Fashion - Apparel (not qualified).csv

Filters: qualified=no, email_validity=valid
```

## Error Handling

| Error | Action |
|-------|--------|
| Campaign not found locally | Search database, present matches |
| Multiple campaigns match | Present numbered list, ask user to select |
| No campaign found | Ask user to verify the campaign name/ID |
| API auth error (401/403) | Tell user: "Ken AI authentication expired. Run `claude mcp remove ken-ai` then re-add the MCP server." |
| Empty export | Warn: "No contacts found matching filters. Try `--all-qualification` or `--all-emails` to broaden search." |
| API fails after auth | Escalate to developer - do NOT attempt database export |

**CRITICAL**: Never export data directly from the database. The API handles field mapping and AI response inclusion that cannot be replicated via raw SQL.

---

**Arguments**: $ARGUMENTS
