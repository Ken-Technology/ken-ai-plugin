---
name: verify-campaign
description: Verify campaign configuration in Ken AI platform. Use when user wants to check if a campaign is properly set up, validate configuration, or troubleshoot campaign issues. Triggers on "verify campaign", "check campaign setup", "validate campaign", "is this campaign configured correctly".
model: sonnet
thinking: true
---

# Verify Campaign Skill

Verify that a campaign is fully and correctly configured in Ken AI platform. Checks campaign settings, campaign lists, segments, AI model configs, and prompts against expected configuration.

> **Platform reference**: current enums, config knobs, AI model defaults, and the 6 supported KenSearch
> countries live in `../../reference/platform-capabilities.md`.

## Required Context

Accept any of:
- **Plan folder path** (e.g., `{workspace}/01-28 - plan 2/`)
- **Segment folder path** (e.g., `{workspace}/01-28 - plan 2/1 - agency-performance-pay`)
- **Campaign ID** (numeric Ken AI campaign ID)
- **Campaign name** (searches Ken AI by name)

**Directory Structure:**
```
{workspace}/
├── {date} - plan {n}/
│   ├── plan.md                    # Campaign plan overview
│   ├── filters.json               # KenSearch filters (plan-level)
│   ├── qualification.md           # Qualification criteria (plan-level)
│   ├── segmentation.md            # Segment definitions (plan-level)
│   ├── configuration.json         # Ken AI/EmailBison IDs (plan-level)
│   ├── 1 - {segment-slug}/
│   │   ├── strategy.md            # Segment strategy
│   │   ├── emails_v2.md           # Email copy (preferred) OR emails.md (legacy)
│   │   └── prompts.md             # AI personalization prompts
│   ├── 2 - {segment-slug}/
│   │   └── ... (same structure)
```

## Workflow

### Step 1: Resolve Campaign ID

**If plan folder provided:**
1. Read `{plan_folder}/configuration.json`
2. Extract `campaign.id`
3. If `campaign.id` is null - check if `campaign` object exists at all
4. If no campaign ID found in configuration.json, read `plan.md` for campaign name and search Ken AI

**If segment folder provided:**
1. Read `{segment_parent}/configuration.json` (go up to the plan folder)
2. Extract `campaign.id`
3. If no campaign ID, read `{segment_folder}/strategy.md` for campaign name and search Ken AI

**If campaign name provided:**
1. Call `api_campaign_manage(operation="list")` with appropriate page size
2. Match by name (case-insensitive substring match)
3. If multiple matches, ask user to pick

**If campaign ID provided:**
1. Use directly

**If nothing resolved:**
1. Glob for `**/configuration.json` under the current directory (campaign workspaces live at `./ken-campaigns/{client-slug}/` by default); if exactly one match has a `campaign.id`, confirm it with the user
2. Otherwise:
> "Could not find campaign ID. Provide a plan folder path, campaign ID, or campaign name."

### Step 2: Gather Data

**Phase A - Parallel MCP calls** (campaign-level):

1. `api_campaign_manage(operation="get", campaign_id=X)` - campaign details (includes `sendingDays`, `sendingStartTime`, `sendingEndTime`, `sendingTimezone`, `emailBisonCampaign.maxEmailsPerDay`, `campaignWebsitePageSelections`)
2. `api_campaign_list_manage(operation="list", campaign_id=X)` - campaign lists (data sources)
3. `api_campaign_segment_manage(operation="list", campaign_id=X)` - segments with `description`, `isDefault`, `emailBisonCampaignId`. **Config-sharded clients:** since ken-backend PR #1110 a segment can map to **N EmailBison campaigns** (one per inbox/domain config, via sender groups); a legacy `emailBisonCampaignId` is still exposed for default groups (the platform mirrors the default group's id back for legacy readers); its exact value for a config client's segment should be confirmed against the merged backend. If the campaign GET / segment list surface a sender-group or `emailBisonCampaignIds` collection (or the campaign read DTO's `selectedSenderConfigTagIds`), capture it too.
4. `api_prompt_library_manage(operation="get_by_campaign", campaign_id=X)` - qualification + rewriting prompts
5. `api_ai_model_config_manage(operation="list", campaign_id=X)` - AI model configs (only non-empty if user set overrides)
6. `api_redirect_link_manage(operation="get_by_campaign", campaign_id=X)` - redirect links

**Phase B - Per-segment AI variables** (after Phase A returns segment IDs):

For each segment, fetch AI variables (Personalization prompts are now stored here, not in PromptLibrary):

```python
# Prefer MCP if available, else direct HTTP GET
# GET /api/v1/campaigns/{campaign_id}/ai-variables?segmentId={segment_id}
for segment in segments:
    ai_variables[segment.id] = fetch_ai_variables(campaign_id, segment.id)
```

Each AI variable response contains `{name, prompt, order, toRewrite}`. The `workflowsEnabled` field confirms whether `[2, 3]` were auto-enabled on the campaign.

**Phase C - Per-segment email sequences** (after Phase A):

```python
for segment in segments:
    sequences[segment.id] = api_email_sequence_manage(
        operation="get", campaign_id=X, campaign_segment_id=segment.id
    )
```

Check each sequence's `steps[].bodyContent` for `{{tracking_link:ID}}` tokens.

### Step 3: Read Local Files (if plan/segment folder provided)

Read these files if they exist (in parallel):

**From plan folder:**
- `{plan_folder}/configuration.json` - IDs and settings written by /campaign-configuration (new schema: `campaign_id`, `settings`, `data`, `default_segment`, `segmentation`, `per_segment`, `emailbison`, `sync_status`). Compare against Ken AI state.
- `{plan_folder}/qualification.md` - qualification criteria reference
- `{plan_folder}/segmentation.md` - segment definitions reference

**From each segment folder:**
- `{segment_folder}/prompts.md` - parse user prompts for comparison
- `{segment_folder}/strategy.md` - campaign name reference
- `{segment_folder}/emails_v2.md` preferred, fall back to `emails.md` - parse email steps, variants, and links for tracking link checks. If both files exist, use `emails_v2.md` unless the user explicitly asks to verify against `emails.md`.

### Step 4: Run Check Matrix

Execute ALL applicable checks from the matrix below. Track each check result as:
- **PASS** - condition met
- **FAIL** - critical issue, campaign won't work correctly
- **WARN** - non-critical issue, campaign may work but suboptimally
- **SKIP** - check not applicable (e.g., rewriting checks when rewriting not enabled)

---

## Check Matrix

### Campaign Level Checks

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 1 | Has campaign segments | segments list not empty | FAIL | "No campaign segments configured. Create with api_campaign_segment_manage." |
| 2 | Campaign status | status in [1, 2, 3] (Building / Ready / Sending) OR warn if Draft / Paused / Completed / Error | WARN | "Status is {name} ({n}). Flip to Sending (3) when ready to send." See `references/campaign-status-enums.md` in campaign-configuration for the canonical enum. |
| 3 | Data sources | campaign_data_sources includes 17 (KenSearch) | FAIL | "No KenSearch data source. Expected [17]." |
| 4 | Data enrichments | campaign_data_enrichments includes [3, 4] (WebsiteContent + WebsiteMetadata) | WARN | "Missing website enrichments. Expected [3, 4] = WebsiteContent + WebsiteMetadata. Found: {list}." |
| 5 | Email enrichments | campaign_email_enrichments includes [8, 3] (Findymail + LeadMagicBusiness) | FAIL | "Missing email enrichments. Expected at minimum Findymail (8) + LeadMagicBusiness (3)." |
| 6 | Email verification | campaign_email_verifications includes 1 (MailTester) | FAIL | "Missing email verification. Expected MailTester (1)." |
| 7 | AI workflows (create-time) | campaign_ai_workflows includes [1, 4] | FAIL | "Missing create-time workflows. Expected at least Qualification (1) + Segmentation (4)." |
| 8 | AI workflows (auto-enabled) | If any segment has AI variables, campaign_ai_workflows includes [2, 3] | FAIL | "AI variables exist but Personalization (2) / Rewriting (3) not enabled. The ai-variables endpoint should auto-enable these - sync drift detected." |
| 9 | Contact limit | contact_limit > 0 | FAIL | "Contact limit is 0 or not set." |
| 10 | Duplication scope | duplication_scope is not null (default 1 = CampaignSegment) | WARN | "Duplication scope not set." |
| 11 | Allow personal emails | allow_personal_emails is false | WARN | "allow_personal_emails=true - campaign will send to gmail/yahoo etc. Intended?" |
| 11b | Recently-emailed dedup | INFO only - report `recentlyEmailedDedupDays` (off if null) | INFO | "Recently-emailed dedup: {n} days / off. For reactivation/winback this should usually be ON; for fresh cold lists, off is fine." |

### Campaign Settings Checks (new fields - post-create patch)

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 12 | Sending days | sendingDays is non-empty array | FAIL | "sendingDays not set. Campaign won't send. Default: [0,1,2,3,4,5,6]." |
| 13 | Sending start time | sendingStartTime is non-empty string (HH:MM) | FAIL | "sendingStartTime not set. Default: '09:30'." |
| 14 | Sending end time | sendingEndTime is non-empty string (HH:MM) | FAIL | "sendingEndTime not set. Default: '18:00'." |
| 15 | Sending timezone | sendingTimezone is non-empty | FAIL | "sendingTimezone not set. Default: 'America/New_York'." |
| 16 | Max emails/day | emailBisonCampaign.maxEmailsPerDay > 0 | FAIL | "emailBisonCampaign.maxEmailsPerDay not set. Expected min(1000, ceil(contact_limit * 4 / 30))." |
| 17 | Website page selections | If [3, 4] in data enrichments: campaignWebsitePageSelections has at least 1 enabled page | FAIL | "Website enrichments enabled but no campaignWebsitePageSelections. Default: Home (pageType=1)." |

### Campaign List & Contact Checks

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 18 | Campaign lists exist | At least 1 campaign list OR ken_search_imported=false in configuration.json (import not yet run) | WARN | "No campaign lists found. If import wasn't run, run /campaign-configuration Step 9 (KenSearch import via search_import_to_campaign)." |
| 19 | Lists have contacts | If lists exist, at least 1 has contactCount > 0 | WARN | "Lists exist but have no contacts. Export may still be processing." |

### Segmentation Checks (description-based, NOT prompt_library)

Segmentation is configured via the `description` field on each campaign segment. The Default segment's description = general audience. Non-default segments' descriptions = per-segment matching criteria. **Do NOT look for flow=4 prompts in PromptLibrary - that is not how segmentation works anymore.**

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 20 | Default segment exists | At least 1 segment with isDefault=true | FAIL | "No Default segment. Required as catchall when AI Segmentation is enabled." |
| 21 | Default segment description | Default segment `description` is non-empty and length > 20 | FAIL | "Default segment has no description. The Default segment's description defines the general audience for AI Segmentation." |
| 22 | Default segment has sequence | Default segment has an email sequence with at least 1 step | FAIL | "Default segment has no email sequence. Contacts assigned to Default will have nothing to send. Copy a fallback segment's sequence into Default." |
| 23 | Non-default segment descriptions | Every non-default segment has non-empty `description` (matching criteria) | FAIL | "Segment '{name}' has no description. Without it, AI Segmentation cannot assign contacts to this segment." |
| 24 | Segment count matches segmentation.md | Count of non-default segments in Ken AI == count of segment blocks in segmentation.md | WARN | "segmentation.md defines {local_count} segments, Ken AI has {ken_count}." |
| 25 | Active segments have EB IDs | Active non-default segments have **at least one** EB campaign id: `emailBisonCampaignId` set (default/no-config clients) OR a non-empty sender-group / `emailBisonCampaignIds` set (config-sharded clients). Do **not** WARN when `emailBisonCampaignId` is populated by the default group. | WARN | "Segment '{name}' has no EB campaign id (neither `emailBisonCampaignId` nor any sender-group EB id). EmailBison sync required before sending." |

### AI Qualification Checks (if workflow 1 enabled)

Model configs are SKIPPED by default - the backend auto-selects models unless the user explicitly created an override. Only check model quality if a config exists.

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 26 | Qualification prompt exists | At least 1 PromptLibrary record with flow=1 | FAIL | "No Qualification prompt found in PromptLibrary." |
| 27 | Qualification fields populated | At least 2 of {audience_description, qualification_criteria, disqualification_criteria} populated | FAIL | "Qualification requires at least 2 of 3 structured fields to be populated." |
| 28 | Qualification model (if override) | If a flow=1 model_config override exists, the model id is one returned by `api_ai_supported_models(flow=1)` | WARN | "Using {model} for Qualification override. The default is a cheap model (currently gpt-oss-20b); only override for a reason. Confirm it's still in the allowed list - the catalog is dynamic." |

### AI Personalization Checks (per segment, via AI Variables endpoint)

Personalization prompts are stored as **AI variables** per segment, fetched from `GET /campaigns/{id}/ai-variables?segmentId={id}`. They are NOT flow=2 PromptLibrary records (the old path). Run these per segment, including the Default segment.

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 29 | Email sequence per segment | Each active segment has an email sequence | FAIL | "Segment '{name}' has no email sequence." |
| 29b | Active version per step | (If the sequence GET exposes per-version `isActive`) For each step, at least one version (A/B/C/D) has `isActive=true`. If the field isn't present in the response, SKIP this check. | FAIL | "Segment '{name}' Email {N}: every version is inactive - nothing will send for this step. Reactivate at least one variant (variants can be toggled active/inactive; a fully-inactive step sends nothing)." |
| 30 | AI variables per segment | Each active segment has at least 1 AI variable | FAIL | "Segment '{name}' has no AI variables. Push via /campaign-configuration Step 12c." |
| 31 | Variable names valid | Each variable has a non-empty `name`, length <= 30 chars | FAIL | "Segment '{name}' variable has missing/oversized name: '{name}'." |
| 32 | Variable prompts valid | Each variable has a non-empty `prompt`, length > 10 and <= 4096 chars | FAIL | "Segment '{name}' variable '{var}' has empty or oversized prompt." |
| 33 | Names unique per segment | Variable names are unique (case-insensitive) within a segment | FAIL | "Segment '{name}' has duplicate variable name: '{var}'." |
| 34 | Orders positive | All variable `order` values are positive integers | FAIL | "Segment '{name}' has variable with invalid order." |
| 35 | Placeholders covered | Every `[Variable Name]` / `{{Variable Name}}` placeholder in the segment's emails matches an AI variable by name | FAIL | "Segment '{name}' email copy references variables without matching prompts: {missing}." |
| 36 | Personalization model (if override) | If a flow=2 model_config override exists, the model id is one returned by `api_ai_supported_models(flow=2)` | WARN | "Using {model} for Personalization override. Default is currently kimi-k2.5 (Fireworks); claude-sonnet-4-6 is also available for higher quality. Confirm the id is still in the allowed list." |
| 37 | Client CompanyContext populated | Campaign GET -> client lookup has non-empty CompanyContext | WARN | "Client CompanyContext is empty. Backend auto-generates system prompts from this field - without it, personalization will lack client context." |

### AI Rewriting Checks (if workflow 3 enabled)

Rewriting prompt is optional - backend applies `Constants.DefaultRewritingPrompt` when none is set.

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 38 | Custom rewriting prompt | Custom flow=3 prompt exists OR backend default in use | PASS (info) | Display which path is active |
| 39 | Custom prompt quality | If custom exists, length > 10 and <= 4096 | WARN | "Custom rewriting prompt is empty or too short. Delete to use backend default, or fill it in." |
| 40 | Rewriting model (if override) | If a flow=3 model_config override exists, the model id is one returned by `api_ai_supported_models(flow=3)` | WARN | "Using {model} for Rewriting override. Rewriting tracks personalization-class models; confirm the id is still in the allowed list (catalog is dynamic)." |

### Tracking Link Checks (per segment, per link - strict 1:1)

Redirect links are **per-segment, per-link**. Every `<a href>` in every segment's email body gets its own unique redirect link - never reused across segments, emails, variants, or occurrences. A link in Email 1 Variant A and the same URL in Email 1 Variant B are two separate redirect links. A link in segment "growth" and the same URL in segment "early" are two separate redirect links.

**Run these checks per segment.** If a segment has no email file (emails_v2.md / emails.md), SKIP link checks for that segment with message: "No emails file found for segment '{name}' - cannot verify tracking links."

**Link detection logic** (read from emails_v2.md preferred, else emails.md):

1. Split by `## Email {N}` headers to identify email step numbers
2. Within each email, detect `### Variant {A|B|C|D}` sub-headers (variant = null if none)
3. For each (step, variant) section, scan the body content for:
   - Raw URLs: `https?://[^\s)]+` (skip LinkedIn profile URLs - not CTAs)
   - Markdown links: `[text](url)`
   - Skip template variables like `{{case_study_link}}` - only real URLs
4. Build the expected-links list per segment: `[(step, variant, url_occurrence_index), ...]`. Each entry is a unique tuple - do not deduplicate by URL (same URL twice in the same variant = two entries)
5. Compare against `api_redirect_link_manage(operation="get_by_campaign")` results, filtered to this segment's redirect links (from `configuration.json` `per_segment.{folder}.redirect_link_ids` or matched by name convention `Email {N}{variant} - {segment_name} - {description}`)

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 41 | Redirect links exist (segment) | If segment's emails have any links, segment has at least 1 redirect link | FAIL | "Segment '{name}': email copy contains links but no redirect links created. Run /campaign-configuration Step 12a." |
| 42 | Per-link uniqueness | Every (step, variant, url-occurrence) tuple has its own unique redirect link ID. No ID is reused across tuples within the segment | FAIL | "Segment '{name}': redirect link ID {id} is reused across {locations}. Each link occurrence needs its own ID." |
| 43 | Per-link coverage | Every detected link tuple in the segment has a matching redirect link | FAIL | "Segment '{name}': missing redirect links for: {list}. Create one per occurrence." |
| 44 | No cross-segment reuse | No redirect link ID used by this segment appears in any other segment's redirect_link_ids | FAIL | "Segment '{name}' reuses redirect link IDs from segment '{other}': {ids}. Each segment needs its own link set." |
| 45 | Link name filled | Every redirect link has a non-empty `name` (convention: "Email {N}{variant} - {segment} - {description}") | FAIL | "Redirect link ID {id} has no name." |
| 46 | Link URL filled | Every redirect link has a non-empty `original_url` | FAIL | "Redirect link '{name}' has no original_url." |
| 48 | Link text_value filled | Every redirect link has a non-empty `text_value` (display text the backend uses when rendering the anchor) | FAIL | "Redirect link '{name}' has no text_value. Set to the link's display text (cleaned URL for raw URLs, or the markdown link text)." |
| 49 | Sequence uses tracking tokens | For each tracked link, the segment's pushed sequence `bodyContent` contains a matching `{{tracking_link:ID}}` standalone token (not wrapped in `<a>`) | FAIL | "Segment '{name}' Email {N}{variant}: redirect link {id} exists but `{{tracking_link:{id}}}` not found in pushed sequence body. Sequence may still contain raw URLs - re-push or retrofit." |

### Per-Segment Sync Checks

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 50 | Email sequence pushed | Each segment folder has an `email_sequence_id` in configuration.json AND the sequence exists in Ken AI | FAIL | "Segment '{name}' has no email sequence pushed." |
| 51 | AI variables pushed | Each segment folder has `ai_variable_ids` in configuration.json matching variables in Ken AI | FAIL | "Segment '{name}' has no AI variables pushed." |

### Local vs Ken App Comparison (if plan folder provided)

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 52 | AI variable count match | Per segment: count of `## User Prompts` entries in local prompts.md == count of AI variables in Ken AI | WARN | "Segment '{name}': local has {local_count} user prompts, Ken AI has {ken_count} AI variables. Re-sync needed." |
| 53 | Segment descriptions match | Per segment: Ken AI segment `description` contains or semantically matches the criteria block in local segmentation.md | WARN | "Segment '{name}' description differs between local segmentation.md and Ken AI. Update via /campaign-configuration Step 11b." |
| 54 | Segment count match | Number of segment subfolders == count of non-default segments in Ken AI | WARN | "Local has {local_count} segment folders, Ken AI has {ken_count} non-default segments." |
| 55 | Configuration.json schema | configuration.json has new-schema keys (`settings`, `default_segment`, `segmentation`, `per_segment.{folder}.ai_variable_ids`) | WARN | "configuration.json uses legacy schema. Re-run /campaign-configuration to migrate." |
| 55a | A/B weights sum (percentage mode) | If segmentation.md declares `percentage` mode: all `- **Weight**: N` values (including the Default arm) are integers summing to exactly 100, AND the live `ab_test_percentage` values across segments sum to 100 | FAIL | "A/B arm weights sum to {sum}, expected 100 (local: {local_sum}, Ken AI: {ken_sum})." |
| 55b | Subject Line output prompt exists | Per segment: an AI variable named "Subject Line" exists in Ken AI with to_output=true and to_rewrite=0 | FAIL | "Segment '{name}' has no Subject Line output variable - workflow start will fail. Re-run campaign-configuration Step 6 for this segment." |
| 55c | Rewriting workflow matches usage | If any segment has a rewriting prompt or any non-Subject-Line variable with to_rewrite>=1: campaign_ai_workflows includes 3. If nothing uses rewriting: 3 absent is fine | WARN | "Rewriting usage and workflow 3 enablement disagree for segment '{name}'. Fix via api_campaign_manage(update, campaign_ai_workflows=[...])." |

### Quality Checks

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 56 | Campaign name | Not generic (not matching: test, campaign 1, untitled, draft, new campaign) | WARN | "Campaign name '{name}' looks generic. Consider a descriptive name." |

---

## Output Format

Present results as a verification table:

```
## Campaign Verification: {campaign_name}

**Campaign ID:** {id} | **Client ID:** {client_id} | **Status:** {status_name} ({status_num})
**Segments:** {segment_count} segments configured

### Results

| # | Category | Check | Status | Details |
|---|----------|-------|--------|---------|
| 1 | Campaign | Has segments | PASS | 3 segments (+ Default) |
| 2 | Campaign | Status | WARN | Draft (0) - won't send until flipped to Sending (3) |
| 3 | Campaign | Data sources | PASS | KenSearch (17) |
| 4 | Campaign | Data enrichments | PASS | WebsiteContent (3), WebsiteMetadata (4) |
| 5 | Campaign | Email enrichments | PASS | Findymail (8), LeadMagicBusiness (3) |
| 6 | Campaign | Email verification | PASS | MailTester (1) |
| 7 | Campaign | Workflows at create-time | PASS | Qualification (1), Segmentation (4) |
| 8 | Campaign | Workflows auto-enabled | PASS | Personalization (2), Rewriting (3) |
| ... | ... | ... | ... | ... |
| 12-16 | Settings | Schedule + EB + pages | PASS | Mon-Sun 09:30-18:00 America/New_York, 134/day, Home page |
| 20 | Segmentation | Default segment exists | PASS | 1 Default segment |
| 21 | Segmentation | Default description | PASS | 120 chars |
| 22 | Segmentation | Default sequence | PASS | 5 steps copied from "growth-stage" |
| 23 | Segmentation | Non-default descriptions | PASS | 3/3 segments described |
| 26 | Qualification | Prompt exists | PASS | 1 qualification prompt in PromptLibrary |
| 29 | Personalization | Sequences per segment | PASS | 4/4 segments have sequences (Default + 3) |
| 30 | Personalization | AI variables per segment | PASS | 4/4 segments have variables (avg 3 per segment) |
| 35 | Personalization | Placeholders covered | PASS | All [Variable] tokens matched in each segment |
| 41 | Tracking Links (seg 1) | Links exist | PASS | 6 redirect links |
| 42 | Tracking Links (seg 1) | Per-link uniqueness | PASS | 6 unique IDs, no reuse |
| 43 | Tracking Links (seg 1) | Per-link coverage | FAIL | Missing for: (Email 1, variant B, pos 0) |
| 49 | Tracking Links (seg 1) | Sequence uses tokens | FAIL | Email 2 still contains raw URL |
| ... | ... | ... | ... | ... |
| 56 | Quality | Campaign name | PASS | "Acme - Series A SaaS founders" |

**Summary:** {pass_count} passed, {fail_count} failed, {warn_count} warnings

### Issues Found

**CRITICAL (must fix before processing):**
1. Segment "early-stage" missing redirect link for Email 1 Variant B - create via `api_redirect_link_manage(operation="create", campaign_id={id}, name="Email 1B - early-stage - Home page", ...)`, then re-push sequence with `{{tracking_link:NEW_ID}}`
2. Segment "growth-stage" Email 2 body still contains raw URL - retrofit with `{{tracking_link:ID}}` via `api_email_sequence_manage(operation="update", ...)`

**WARNINGS (recommended fixes):**
1. Status is Draft - Flip to Sending when ready: `api_campaign_manage(operation="update", campaign_id={id}, name="{name}", status=3, ...)` (include ALL campaign fields - the API does not support partial updates)
2. Segment "enterprise" description differs from local segmentation.md - re-push via /campaign-configuration Step 11b

Want me to apply the critical fixes?
```

### Status Label Map

Use these labels for campaign status display. See `../campaign-configuration/references/campaign-status-enums.md` for the canonical reference and lifecycle.

- 0 = Draft
- 1 = Building
- 2 = Ready
- 3 = Sending
- 4 = Paused
- 5 = Completed
- 6 = Error

Display format: `{Name} ({n})` (e.g., "Draft (0)", "Sending (3)").

> Do NOT use the legacy `Status` enum (`0=ToScrape...5=Draft`) or the pseudo-state "To Do". Those came from a deprecated DTO field and are not what the backend lifecycle validates.

### Workflow Label Map

Use these labels for AI workflow display:
- 1 = Qualification
- 2 = Personalization
- 3 = Rewriting
- 4 = Segmentation

### Enrichment Label Maps

**Data Sources:** 1=LinkedInSalesNavigator, 14=Apollo (obsolete), 15=LinkedInCompanyEmployees, 16=FileUpload, **17=KenSearch** (default)
**Data Enrichments:** 1=LinkedInProfile, 2=LinkedInCompany, **3=WebsiteContent**, **4=WebsiteMetadata** (default: [3, 4]), 6=TechnologyEnrichment, 7=LinkedInPosts, 8=LinkedInArticle, 9=LinkedInRecommendations, 10=GoogleSearchEnrichment
**Email Enrichments:** 2=Icypeas, **3=LeadMagicBusiness**, 4=LeadMagicPersonal, 5=Prospeo, 6=Enrow, 7=Kitt, **8=Findymail** (default: [8, 3])
**Email Verifications:** **1=MailTester** (default), 4=IcypeasCatchAll, 5=LeadMagicCatchAll, 7=FindymailCatchAll
**Website Page Types:** 1=Home (default), 2=About, 3=Pricing, 4=Contact, 5=Blog, 6=BlogArticles, 7=Services, 8=Products, 9=Testimonials, 10=CaseStudies, 11=Results
**Campaign List Types:** 1=SalesNavigator, 2=KenSearch, 3=CampaignImport, 4=CsvUpload
**Segment Types:** 1=Manual, **2=AI** (default; the dashboard calls these "AI Segments", formerly "Auto Segments"), 3=AbTest (percentage A/B arm, pairs with `ab_test_percentage`)
**PromptType:** **1=system** (user-authored prompts - qualification, rewriting), 2=user, 3=assistant
**Duplication Scope:** 0=Campaign (cross-client), **1=CampaignSegment** (same-campaign only, default), null=None
**EB Sync Status:** 0=None, 1=Pending, 2=Syncing, 3=Synced, 4=Error

---

## Fix Application

When user approves fixes:

1. Apply fixes one at a time, reporting each result
2. For qualification prompts, use `api_qualification_prompt_save(campaign_id=X, persona=..., qualifiers=..., disqualifiers=..., prompt_id=<optional>)`. The per-flow tool auto-upserts and always sets `flow=1` correctly, avoiding the generic-tool footgun where omitting `flow` silently reset it to `0` and unbound the prompt from the campaign. The generic `api_prompt_library_manage(operation="update", ...)` is soft-deprecated for qualification.
3. For AI variables, use `api_ai_variables_save(campaign_id=X, segment_id=Y, variables=[...])` - one bulk upsert per segment. Never fall back to curl or raw HTTP.
4. For segment descriptions, use `api_campaign_segment_manage(operation="update", segment_id=X, name=..., description=...)`
5. For campaign updates, include `name` field (API requires it for updates)
6. For campaign settings (sending_days, sending_start_time, sending_end_time, sending_timezone, max_emails_per_day, campaign_website_page_selections), use `api_campaign_manage(operation="update", ...)` - it covers the full schedule surface and auto-syncs the EmailBison schedule (`auto_sync_schedule=True`). Never fall back to curl or raw HTTP.
7. For model config creation (only when user requested an override), use `api_ai_model_config_manage(operation="create", ...)`
8. For redirect links, use `api_redirect_link_manage(operation="create", ...)` per link. Never reuse a redirect link across segments or across (step, variant, occurrence) tuples.
9. For retrofitting tracking tokens in an existing sequence, use `api_email_sequence_manage(operation="update", ...)` with modified `bodyContent` containing `{{tracking_link:ID}}` standalone tokens
10. After all fixes applied, re-run verification to confirm

**Do NOT auto-apply fixes without user approval.** Always present the fix list and wait for confirmation.

---

## Local File Comparison Logic

When a plan folder is provided:

### Counting Local User Prompts (per segment)

For each segment subfolder, if `prompts.md` exists:
1. Parse `## User Prompts` section - count `### {name}` headers
2. Ignore any legacy `## System Prompts` section - system prompts are auto-generated by the backend
3. Total local user prompts = `## User Prompts` `### {name}` header count

### Counting Ken AI AI Variables (per segment)

1. Fetch via `GET /api/v1/campaigns/{campaign_id}/ai-variables?segmentId={segment_id}` for each segment
2. Count entries in `data.variables`
3. Do NOT count flow=2 `prompt_type=1` records in PromptLibrary - that was the legacy path, superseded by the AI variables endpoint

### Comparison (per segment)

- If counts differ: WARN with both counts
- If local has variable names not present in Ken AI (case-insensitive match on `name`): WARN listing missing
- If Ken AI has names not present in local prompts.md: WARN listing extra
- For names that match, compare prompt text length as a sanity check (WARN if one is empty when the other is not)

### configuration.json Field Mapping

Expected new-schema fields in `configuration.json` (written by /campaign-configuration):

| Local Config Field | Ken AI Check |
|-------------------|--------------|
| `campaign_id` | Matches verified campaign ID |
| `client_id` | Matches campaign's `client.id` |
| `qualification_prompt_id` | PromptLibrary entry with flow=1 and this ID exists |
| `settings.contact_limit` | Campaign `contactLimit` matches |
| `settings.duplication_scope` | Campaign `duplicationScope` matches |
| `settings.allow_personal_emails` | Campaign `allowPersonalEmails` matches |
| `settings.sending_days` | Campaign `sendingDays` matches |
| `settings.sending_start_time` | Campaign `sendingStartTime` matches |
| `settings.sending_end_time` | Campaign `sendingEndTime` matches |
| `settings.sending_timezone` | Campaign `sendingTimezone` matches |
| `settings.max_emails_per_day` | Campaign `emailBisonCampaign.maxEmailsPerDay` matches |
| `data.sources` | Campaign `campaignDataSources` matches |
| `data.enrichments` | Campaign `campaignDataEnrichments` matches (expect [3, 4]) |
| `data.email_enrichments` | Campaign `campaignEmailEnrichments` matches |
| `data.email_verifications` | Campaign `campaignEmailVerifications` matches |
| `data.website_page_selections` | Campaign `campaignWebsitePageSelections` matches |
| `default_segment.segment_id` | Segment exists with isDefault=true |
| `default_segment.email_sequence_id` | Email sequence exists under Default segment |
| `default_segment.ai_variable_ids` | AI variables exist on Default segment with these IDs |
| `segmentation.segments.{folder}.segment_id` | Non-default segment exists with matching `description` |
| `per_segment.{folder}.email_sequence_id` | Email sequence exists under that segment |
| `per_segment.{folder}.ai_variable_ids` | AI variables exist under that segment with these IDs |
| `per_segment.{folder}.redirect_link_ids` | Every ID exists and is unique to this segment (not reused elsewhere) |
| `per_segment.{folder}.redirect_links` | URL-to-ID map matches pushed sequence tracking tokens |
| `emailbison.campaign_ids.{folder}` | Matches the segment's EB id - `emailBisonCampaignId` for default/no-config clients, or the set of sender-group EB ids for config-sharded clients (a segment can have N) |

**Legacy schema** (`configuration.json` with `workflow_steps` key instead of `settings`/`segmentation`/`per_segment` keys) - still supported but indicates the campaign was configured before the current schema. WARN and suggest re-running /campaign-configuration to migrate.

---

## Error Handling

| Error | Response |
|-------|----------|
| Campaign not found | "Campaign ID {X} not found in Ken AI. Check the ID or provide a name to search." |
| Ken AI MCP unavailable | "Ken AI MCP not responding. Check connection with `health_check`." |
| Auth errors (401/403) | "Authentication expired. Reconnect the ken-ai MCP server (run `/mcp` and re-authorize) and try again." |
| Partial data (some calls fail) | Run available checks, mark failed sections as "Unable to verify - {error}" |
| No plan folder + no ID | "Provide a plan folder path, campaign ID, or campaign name to verify." |
| configuration.json has no campaign.id | "Campaign not yet pushed to Ken AI. Run /campaign-configuration first, or provide the Ken AI campaign ID directly." |
