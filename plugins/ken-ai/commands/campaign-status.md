---
description: Show a campaign's enrichment pipeline stats - contacts, email validity, AI workflow progress, sending status - resolved by ID, name, or plan folder path.
model: sonnet
thinking: false
---

# Campaign Status - Enrichment Pipeline Stats

Display comprehensive statistics for a campaign's enrichment pipeline.

## Arguments
- `$ARGUMENTS` - Campaign ID (number), campaign folder path, or campaign name (text)

## Execution

### Step 1: Resolve Campaign

**If numeric** - Use directly as campaign ID:
```
db_execute_parameterized_query(
  query="SELECT id, name, client_id FROM campaign WHERE id = %s AND is_deleted = 0",
  params=[campaign_id]
)
```

**If path** - Read `configuration.json` from the campaign folder:
```
Read: {path}/configuration.json
Extract: campaign_id
```

**If text** - Search by name:
```
db_execute_parameterized_query(
  query="SELECT id, name, client_id FROM campaign WHERE name LIKE %s AND is_deleted = 0 ORDER BY created_datetime DESC LIMIT 5",
  params=["%{name}%"]
)
```

If multiple matches, show options and ask user to specify.

### Step 2: Pull Campaign Segments

```sql
SELECT id, name, is_default, is_active, segmentation_type, contact_count,
       emailbison_campaign_id, emailbison_sync_status
FROM campaign_segment
WHERE campaign_id = %s AND is_deleted = 0
ORDER BY sort_order, name
```

### Step 3: Gather Stats (run IN PARALLEL)

All queries filter by `contacts.campaign_id = ? AND contacts.is_deleted = 0`.

**Total contacts:**
```sql
SELECT COUNT(*) AS total
FROM contacts
WHERE campaign_id = %s AND is_deleted = 0
```

**Email validity distribution (campaign-wide):**
```sql
SELECT e.email_validity, COUNT(DISTINCT e.contact_id) AS cnt
FROM emails e
JOIN contacts c ON c.id = e.contact_id
WHERE c.campaign_id = %s AND c.is_deleted = 0 AND e.is_deleted = 0
GROUP BY e.email_validity
```

Map codes: 0=Unknown, 1=Invalid, 2=Risky, 3=Verified, 4=Safe, 5=CatchAll.

**Contacts with no email** (for "No Email" row):
```sql
SELECT COUNT(*) AS no_email
FROM contacts c
WHERE c.campaign_id = %s AND c.is_deleted = 0
  AND NOT EXISTS (
    SELECT 1 FROM emails e
    WHERE e.contact_id = c.id AND e.is_deleted = 0
  )
```

**Website enrichment - companies + pages:**
```sql
SELECT COUNT(DISTINCT wd.contact_company_id) AS companies_enriched,
       COUNT(*) AS pages_enriched
FROM website_data wd
WHERE wd.contact_company_id IN (
  SELECT DISTINCT contact_company_id
  FROM contacts
  WHERE campaign_id = %s AND is_deleted = 0 AND contact_company_id IS NOT NULL
)
```

**Total unique companies in campaign** (for % context):
```sql
SELECT COUNT(DISTINCT contact_company_id) AS total_companies
FROM contacts
WHERE campaign_id = %s AND is_deleted = 0 AND contact_company_id IS NOT NULL
```

**AI workflow processing** (uses `contact_oureach_statuses` - note table name is misspelled "oureach"):

> ⚠️ **Qualified vs. qualification-processed - do NOT conflate these.**
> - `contact_oureach_statuses.outreach_id = 11` (AiQualification) means the qualification workflow *completed* for the contact. It does NOT mean the contact qualified.
> - The authoritative qualified/unqualified flag is `contacts.qualified` (tinyint: 1 = qualified, 0 = unqualified). The boolean is persisted separately from the completion marker (see `QualificationBatchProcessingService.cs:160` in ken-scraping).
> - Always use `contacts.qualified` for "qualified" counts. Use outreach_id 11 only to show how many contacts finished the qualification flow.

Run one query per outreach status in parallel:

```sql
-- Qualification flow completed (outreach_id 11 = AiQualification = workflow finished, does NOT mean passed)
SELECT COUNT(DISTINCT cos.contact_id) AS cnt
FROM contact_oureach_statuses cos
JOIN contacts c ON c.id = cos.contact_id
WHERE c.campaign_id = %s AND c.is_deleted = 0 AND cos.outreach_id = 11
```

**Qualified / unqualified (authoritative) - query `contacts.qualified` directly:**
```sql
SELECT c.qualified, COUNT(*) AS cnt
FROM contacts c
WHERE c.campaign_id = %s AND c.is_deleted = 0
GROUP BY c.qualified
```

Map: `qualified = 1` → Qualified, `qualified = 0` → Unqualified.

```sql
-- Personalization processed (outreach_id 12)
SELECT COUNT(DISTINCT cos.contact_id) AS cnt
FROM contact_oureach_statuses cos
JOIN contacts c ON c.id = cos.contact_id
WHERE c.campaign_id = %s AND c.is_deleted = 0 AND cos.outreach_id = 12
```

```sql
-- Rewriting processed (outreach_id 13)
SELECT COUNT(DISTINCT cos.contact_id) AS cnt
FROM contact_oureach_statuses cos
JOIN contacts c ON c.id = cos.contact_id
WHERE c.campaign_id = %s AND c.is_deleted = 0 AND cos.outreach_id = 13
```

```sql
-- Segmentation processed (outreach_id 26)
SELECT COUNT(DISTINCT cos.contact_id) AS cnt
FROM contact_oureach_statuses cos
JOIN contacts c ON c.id = cos.contact_id
WHERE c.campaign_id = %s AND c.is_deleted = 0 AND cos.outreach_id = 26
```

```sql
-- Launched to EmailBison (outreach_id 34)
SELECT COUNT(DISTINCT cos.contact_id) AS cnt
FROM contact_oureach_statuses cos
JOIN contacts c ON c.id = cos.contact_id
WHERE c.campaign_id = %s AND c.is_deleted = 0 AND cos.outreach_id = 34
```

Derive:
- qualified = count where `contacts.qualified = 1` (from the authoritative query above - NOT count(outreach 11))
- unqualified = count where `contacts.qualified = 0`
- qualification_completed = count(outreach 11) - how many finished the flow
- unprocessed (qualification) = total − count(outreach 11)
- unprocessed (personalization) = total − count(outreach 12)
- unprocessed (rewriting) = total − count(outreach 13)
- unprocessed (segmentation) = total − count(outreach 26)

Sanity check: `qualified + unqualified == total` (every contact has a qualified flag, default 0). If `qualification_completed < qualified + unqualified`, some contacts haven't been run through the workflow yet but still have the default flag value - mention this in the output so the reader doesn't mistake defaults for results.

**Qualification-mode adjustment for the Default segment:**

When qualification has been run for this campaign (i.e. `count(outreach_id = 11) > 0`), unqualified contacts (`contacts.qualified = 0`) are noise in the Default segment row - they're filtered out of outreach and inflate Default's totals. In that case, exclude unqualified contacts from the Default segment ONLY in the per-segment queries below.

- Let `:default_segment_id` = the `id` of the segment with `is_default = 1` from Step 2.
- Let `:qualification_on` = true if `count(outreach_id = 11) > 0`, else false.

When `:qualification_on` is true, add this predicate to each per-segment query:
```sql
AND (c.campaign_segment_id != :default_segment_id OR c.qualified = 1)
```

When `:qualification_on` is false, omit the predicate (run the queries as written).

The campaign-wide queries in Step 3 (totals, validity distribution, AI workflow counts) are NOT adjusted - only the per-segment breakdown is.

**Per-segment totals + final (safe) contacts:**
```sql
SELECT
  c.campaign_segment_id,
  COUNT(*) AS total_contacts,
  COUNT(DISTINCT CASE WHEN e.email_validity = 4 THEN c.id END) AS final_contacts
FROM contacts c
LEFT JOIN emails e ON e.contact_id = c.id AND e.is_deleted = 0
WHERE c.campaign_id = %s AND c.is_deleted = 0
  -- if qualification_on: AND (c.campaign_segment_id != :default_segment_id OR c.qualified = 1)
GROUP BY c.campaign_segment_id
```

**Per-segment email validity distribution:**
```sql
SELECT c.campaign_segment_id, e.email_validity, COUNT(DISTINCT e.contact_id) AS cnt
FROM emails e
JOIN contacts c ON c.id = e.contact_id
WHERE c.campaign_id = %s AND c.is_deleted = 0 AND e.is_deleted = 0
  -- if qualification_on: AND (c.campaign_segment_id != :default_segment_id OR c.qualified = 1)
GROUP BY c.campaign_segment_id, e.email_validity
```

**Per-segment personalization + rewriting:**
```sql
SELECT c.campaign_segment_id, cos.outreach_id, COUNT(DISTINCT cos.contact_id) AS cnt
FROM contact_oureach_statuses cos
JOIN contacts c ON c.id = cos.contact_id
WHERE c.campaign_id = %s AND c.is_deleted = 0 AND cos.outreach_id IN (12, 13)
  -- if qualification_on: AND (c.campaign_segment_id != :default_segment_id OR c.qualified = 1)
GROUP BY c.campaign_segment_id, cos.outreach_id
```

### Step 4: Display Results

```markdown
## Campaign: {name} (ID: {id})

### Summary
| Metric                 | Count                |
|------------------------|----------------------|
| Total Contacts         | X,XXX                |
| Segments               | N                    |
| Launched to EmailBison | X,XXX (XX.X%)        |

### Email Validity Distribution
| Status    | Count   | % of Total |
|-----------|---------|------------|
| Safe      | X,XXX   | XX.X%      |
| Verified  | X,XXX   | XX.X%      |
| CatchAll  | X,XXX   | XX.X%      |
| Risky     | X,XXX   | XX.X%      |
| Invalid   | X,XXX   | XX.X%      |
| Unknown   | X,XXX   | XX.X%      |
| No Email  | X,XXX   | XX.X%      |

### Website Enrichment
| Metric             | Count              |
|--------------------|--------------------|
| Companies Enriched | X / Y (XX.X%)      |
| Pages Scraped      | X,XXX              |

### AI Workflow Results
| Flow            | Processed | Unprocessed | Notes                                                               |
|-----------------|-----------|-------------|---------------------------------------------------------------------|
| Qualification   | X,XXX     | X,XXX       | Qualified: X,XXX / Unqualified: X,XXX (from `contacts.qualified`)   |
| Personalization | X,XXX     | X,XXX       |                                                                     |
| Rewriting       | X,XXX     | X,XXX       |                                                                     |
| Segmentation    | X,XXX     | X,XXX       |                                                                     |

"Processed" for Qualification = count(outreach 11) (workflow completed). The Qualified/Unqualified split comes from `contacts.qualified`, NOT from outreach_id. Never describe outreach_id 11 as "qualified".

### Per-Segment Breakdown

For each segment, show:

| Segment | Total | Safe | Verified | CatchAll | Risky | Invalid | Unknown | No Email | Final | Pers. | Rewr. |
|---------|-------|------|----------|----------|-------|---------|---------|----------|-------|-------|-------|

Where:
- Final = contacts with at least one Safe (email_validity=4) email
- Pers. = personalization processed count (outreach 12)
- Rewr. = rewriting processed count (outreach 13)
- "No Email" per segment = segment total − sum of validity buckets

If qualification has been run, the Default segment row shows only `qualified = 1` contacts (unqualified ones are filtered from outreach and would otherwise inflate Default). Add a footnote: `Default segment filtered to qualified contacts only (qualification is enabled).`
```

Only render sections that have data. If no AI workflows were run, still show the table with zeros - keeps output predictable.

## Reference: ID Mappings

### Email Validity Codes
| Code | Status   |
|------|----------|
| 0    | Unknown  |
| 1    | Invalid  |
| 2    | Risky    |
| 3    | Verified |
| 4    | Safe     |
| 5    | CatchAll |

### Contact Outreach Status (AI workflow tracking)
| ID | Status                | Meaning                                              |
|----|-----------------------|------------------------------------------------------|
| 11 | AiQualification       | Qualification workflow *completed* (NOT "qualified") |
| 12 | AiPersonalization     | Personalization workflow completed                   |
| 13 | AiRewriting           | Rewriting workflow completed                         |
| 14 | AiPreQualification    | Qualification workflow queued/starting               |
| 21 | AiPrePersonalization  | Personalization workflow queued/starting             |
| 22 | AiPreRewriting        | Rewriting workflow queued/starting                   |
| 25 | AiPreSegmentation     | Segmentation workflow queued/starting                |
| 26 | AiSegmentation        | Segmentation workflow completed                      |
| 34 | EmailBisonExported    | Pushed to EmailBison                                 |

> All rows in this table are workflow-completion markers. For actual outcomes (was the contact qualified? what segment did AI assign?), read the boolean/FK on `contacts` itself:
> - Qualified outcome → `contacts.qualified` (tinyint, 1=qualified, 0=not)
> - Segmentation outcome → `contacts.campaign_segment_id` (non-default segment = assigned by AI)

### Company Outreach Status (enrichment tracking)
| ID | Status              |
|----|---------------------|
| 1  | LinkedinCompany     |
| 2  | WebsiteContent      |
| 3  | WebsiteMetadata     |
| 5  | WebsiteContactInfo  |
| 6  | DataEnrichment      |
| 7  | GoogleSearchEnrich  |
| 8  | LinkedInUrlDiscovery|
| 9  | CompanyDomainDiscov |

### Flow (AI workflow)
| ID | Flow            |
|----|-----------------|
| 1  | Qualification   |
| 2  | Personalization |
| 3  | Rewriting       |
| 4  | Segmentation    |
| 5  | ToneOfVoice     |

### Data Enrichment IDs
| ID | Provider                 |
|----|--------------------------|
| 1  | LinkedIn Profile         |
| 2  | LinkedIn Company         |
| 3  | Website Content          |
| 4  | Website Metadata         |
| 6  | Technology Enrichment    |
| 7  | LinkedIn Posts           |
| 8  | LinkedIn Article         |
| 9  | LinkedIn Recommendations |
| 10 | Google Search Enrichment |
| 11 | LinkedIn URL Discovery   |
| 12 | Company Domain Discovery |

### Email Enrichment IDs
| ID | Provider           |
|----|--------------------|
| 2  | Icypeas            |
| 3  | LeadMagic Business |
| 4  | LeadMagic Personal |
| 5  | Prospeo            |
| 6  | Enrow              |
| 7  | Kitt               |
| 8  | Findymail          |

### Email Verification IDs
| ID | Provider                    |
|----|-----------------------------|
| 1  | MailTester                  |
| 2  | Instantly Email Verification|
| 3  | Bulk Email Checker          |
| 4  | Icypeas CatchAll            |
| 5  | LeadMagic CatchAll          |
| 6  | Prospeo CatchAll            |
| 7  | Findymail                   |

### Campaign List Type IDs
| ID | Type           |
|----|----------------|
| 1  | CSV            |
| 2  | KenSearch      |
| 3  | CampaignImport |

### Segmentation Type IDs
| ID | Type    |
|----|---------|
| 1  | Manual  |
| 2  | AI      |

### EmailBison Sync Status IDs
| ID | Status   |
|----|----------|
| 0  | None     |
| 1  | Pending  |
| 2  | Syncing  |
| 3  | Synced   |
| 4  | Error    |

---

**Campaign identifier**: $ARGUMENTS
