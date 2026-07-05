# Campaign Configuration Guide

**Last Updated:** April 15, 2026
**Purpose:** Comprehensive guide for configuring cold email campaigns in the Ken App using the segment-based workflow with KenSearch.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Campaign Workflow Overview](#campaign-workflow-overview)
3. [Directory Structure](#directory-structure)
4. [Configuration Steps](#configuration-steps)
5. [configuration.json Schema](#configurationjson-schema)
6. [AI Workflows](#ai-workflows)
7. [Cost Optimization Strategies](#cost-optimization-strategies)
8. [Quick Reference: Pricing Table](#quick-reference-pricing-table)
9. [Common Patterns](#common-patterns)
10. [Troubleshooting](#troubleshooting)
11. [Related Resources](#related-resources)

---

## Quick Start

**Before You Begin:**
1. Complete client research using `/client-research`
2. Use `/campaign-planning` to create plan.md
3. Use `/ken-search` to build filters.json
4. Use `/qualification` to create qualification.md
5. Use `/segmentation` to create segmentation.md
6. For each segment: `/campaign-strategy`, `/email-copywriting`, `/prompt-writer`

**Basic Flow:**
```
Plan Folder Complete -> /campaign-configuration -> Campaign on Ken AI
```

**Typical Setup Time:** All files must be complete before running campaign-configuration. The skill pushes everything in one pass.

---

## Campaign Workflow Overview

The campaign-configuration skill pushes a complete plan folder to Ken AI in a single workflow:

```
Step 1-4:  Validate files, parse content, read client ID
Step 5:    Show configuration summary for approval
Step 6:    Create campaign via MCP (name, client_id, status, data sources, etc.)
Step 6b:   PATCH schedule + maxEmailsPerDay + websitePageSelections via direct HTTP
           (MCP gap, tracked in ken-ai-mcp issues)
Step 7:    [SKIP BY DEFAULT] Configure AI model overrides
           Only runs if user explicitly asked for a specific model per flow.
           Empty config = backend auto-defaults (what we want).
Step 8:    Push qualification prompt (structured fields, at least 2 of 3)
Step 9:    Create campaign segments
Step 10:   Set segment descriptions (general + per-segment matching criteria)
Step 11:   Populate default segment's email sequence
Step 12:   For each segment:
           - 12a: Create per-segment redirect links
           - 12b: Push email sequence (HTML, waitDays >= 1)
           - 12c: Push AI personalization variables (direct HTTP bulk endpoint)
           - 12d: Push optional rewriting prompt
Step 13:   Write configuration.json
Step 14:   Report results
Step 15:   Ask user about Ken Search import (optional)
```

### Key Architecture Changes (April 2026)

- **KenSearch is the dedicated data source** (`DataSource.KenSearch = 17`), replacing the old `[]` empty-array convention
- **Schedule is a first-class campaign field**: `sendingDays`, `sendingStartTime`, `sendingEndTime`, `sendingTimezone`
- **Website scraping uses explicit page selections**: `campaignWebsitePageSelections` array with page type enum
- **AI personalization uses a bulk endpoint**: `PUT /v1/campaigns/{id}/ai-variables?segmentId={id}` replaces per-prompt creation. Backend auto-enables Personalization + Rewriting workflows.
- **AI model configs are NOT created by default**: the backend auto-selects models for all 4 flows (Qualification, Segmentation, Personalization, Rewriting). The skill only creates `AiFlowModelConfiguration` rows when the user explicitly asks for an override.
- **Qualification uses structured fields**: one prompt with `audienceDescription`, `qualificationCriteria`, `disqualificationCriteria`. Backend validates at least 2 of 3 are populated.
- **Wait days minimum is 1**: EmailBison v1.1 rejects `waitDays < 1` on every step. Default is 3.
- **Ken Search import is opt-in**: the skill asks at the end instead of triggering automatically.

---

## Directory Structure

```
{workspace}/
└── {date} - plan {n}/
    ├── plan.md               # Campaign overview, broad ICP, goal
    ├── filters.json          # KenSearch people filters + desired_contacts
    ├── qualification.md      # Qualification/disqualification criteria
    ├── segmentation.md       # Segment names and criteria
    ├── configuration.json    # Written by campaign-configuration skill
    ├── 1 - {segment-slug}/
    │   ├── strategy.md       # Segment-specific strategy
    │   ├── emails.md         # Email copy (v1) or emails_v2.md (v2, preferred)
    │   └── prompts.md        # AI personalization user prompts
    ├── 2 - {segment-slug}/
    │   ├── strategy.md
    │   ├── emails_v2.md
    │   └── prompts.md
    └── 3 - {segment-slug}/
        ├── strategy.md
        ├── emails_v2.md
        └── prompts.md
```

### File Purposes

| File | Level | Purpose |
|------|-------|---------|
| plan.md | Plan | Campaign name, broad ICP, overarching goal |
| filters.json | Plan | KenSearch people filters, desired_contacts count |
| qualification.md | Plan | Audience description, qualification/disqualification criteria |
| segmentation.md | Plan | General audience description, segment names, per-segment criteria |
| strategy.md | Segment | Segment-specific strategy, value proposition, angles |
| emails.md / emails_v2.md | Segment | Email sequence with personalization placeholders |
| prompts.md | Segment | AI personalization user prompts (to_output: true) |
| configuration.json | Plan | All Ken AI resource IDs (written by this skill) |

---

## Configuration Steps

### Step-by-Step Reference

| Step | Resource | MCP Tool / Method | Key Parameters |
|------|----------|-------------------|---------------|
| Create Campaign | Campaign | `api_campaign_manage` (MCP) | name, client_id, campaign_data_sources=[17], campaign_ai_workflows=[1,4] (or `[1]` in percentage mode), duplication_scope=1. Do NOT pass `status` (create rejects it - born Draft). Percentage/A-B campaigns: pass `segmentation_mode=3` to set A/B mode at create time (only path in - see SKILL.md Step 4). |
| Patch Schedule | Campaign | Direct HTTP `POST /v1/campaigns` | sendingDays, sendingStartTime, sendingEndTime, sendingTimezone, emailBisonCampaign.maxEmailsPerDay, campaignWebsitePageSelections |
| AI Model Overrides (OPTIONAL) | Model Config x? | `api_ai_model_config_manage` | Only if user explicitly requests per-flow model override. Default: SKIP. |
| Qualification Prompt | Prompt | `api_qualification_prompt_save` | campaign_id, persona, qualifiers, disqualifiers (prompt_id optional - auto-upserts) |
| Create Segments | Segment xN | `api_campaign_segment_manage` | name, segmentation_type=2 (AI) |
| Segment Descriptions | Segment xN (update) | `api_campaign_segment_manage` | segment_id, description |
| Default Segment Sequence | Sequence | `api_email_sequence_manage` | campaign_segment_id (default) |
| Per-Segment Redirect Links | Link xL | `api_redirect_link_manage` | campaign_id, original_url, variable_name |
| Per-Segment Email Sequences | Sequence xN | `api_email_sequence_manage` | campaign_segment_id |
| Per-Segment AI Variables | AI Variables xN | Direct HTTP `PUT /v1/campaigns/{id}/ai-variables?segmentId={id}` | variables[] (omit `model` by default; backend auto-picks) |
| Per-Segment Rewriting (opt) | Prompt | `api_rewriting_prompt_save` | campaign_id, instructions, campaign_segment_id (prompt_id optional - auto-upserts; empty instructions deletes) |
| Ken Search Import (opt) | Import | `search_import_to_campaign` (alias: `search_export_to_campaign`) | people_filters_json, import_limit. Async (202) - returns `jobId`; poll with `search_export_status`. |

### Campaign Settings

| Setting | Value | Notes |
|---------|-------|-------|
| `status` | (do not send) | The MCP create rejects `status` (KenValidationError); campaigns are always born Draft. Transition later via `api_campaign_lifecycle`. See [`campaign-status-enums.md`](campaign-status-enums.md) for the enum. |
| `segmentation_mode` | `3` (AbTest) in percentage mode, else omit | Sequence A/B test only. MUST be set at create time - births the Default as `AbTest@100`; a post-hoc switch is impossible. Pass numeric `3` (string `"AbTest"` is rejected by the update DTO). |
| `contact_limit` | 1000 | User-specified; default 1000 if not given |
| `max_emails_per_day` | min(1000, ceil(contact_limit * 4 / 30)) | Assuming 4 emails/contact over 30 days |
| `duplication_scope` | 1 (CampaignSegment) | Same-campaign dedup only; no cross-campaign |
| `campaign_data_sources` | [17] | KenSearch |
| `campaign_ai_workflows` | [1, 4] | Qualification + Segmentation; Personalization (2) auto-added by AI variables endpoint. Rewriting (3) is NOT auto-added - add it explicitly (`[1,2,3,4]`) when the plan uses rewriting. The skill always flags variables `to_rewrite=1` (all but Subject Line) after the bulk save so the campaign is rewriting-ready. |
| `campaign_data_enrichments` | [3, 4] | WebsiteContent + WebsiteMetadata |
| `campaign_website_page_selections` | [{pageType: 1, pageTypeDisplayName: "Home", isEnabled: true, maxPagesLimit: 10}] | Homepage only by default; user can add more pages |
| `campaign_email_enrichments` | [8, 3] | Findymail + LeadMagicBusiness |
| `campaign_email_verifications` | [1] | MailTester |
| `sending_days` | [0, 1, 2, 3, 4, 5, 6] | All 7 days (0=Sunday) |
| `sending_start_time` | "09:30" | |
| `sending_end_time` | "18:00" | |
| `sending_timezone` | "America/New_York" | EST |
| `allow_personal_emails` | false | Reject gmail/yahoo/etc. |

---

## configuration.json Schema

```json
{
  "campaign_id": 123,
  "campaign_name": "Client - Broad ICP",
  "client_id": 24,
  "ken_search_export_id": null,
  "ken_search_import_asked": false,
  "qualification_prompt_id": 456,
  "settings": {
    "contact_limit": 1000,
    "max_emails_per_day": 134,
    "duplication_scope": 1,
    "allow_personal_emails": false,
    "sending_days": [0, 1, 2, 3, 4, 5, 6],
    "sending_start_time": "09:30",
    "sending_end_time": "18:00",
    "sending_timezone": "America/New_York"
  },
  "data": {
    "sources": [17],
    "enrichments": [3, 4],
    "website_page_selections": [
      {"pageType": 1, "pageTypeDisplayName": "Home", "isEnabled": true, "maxPagesLimit": 10}
    ],
    "email_enrichments": [8, 3],
    "email_verifications": [1]
  },
  "segmentation": {
    "method": "segment_description",
    "segments": {
      "0 - default": {"segment_id": 100, "name": "Default"},
      "1 - early-stage-saas": {"segment_id": 101},
      "2 - growth-stage-saas": {"segment_id": 102}
    }
  },
  "ai_model_configs": [],
  "per_segment": {
    "0 - default": {
      "segment_id": 100,
      "email_sequence_id": 500,
      "ai_variable_ids": [601, 602, 603],
      "rewriting_prompt_id": null,
      "name": "Default",
      "is_default": true
    },
    "1 - early-stage-saas": {
      "email_sequence_id": 501,
      "ai_variable_ids": [701, 702, 703],
      "rewriting_prompt_id": null,
      "redirect_link_ids": [801, 802],
      "redirect_links": {
        "1:null:https://example.com/page": 801,
        "2:null:https://example.com/page": 802
      }
    }
  },
  "sync_status": {
    "campaign_created": true,
    "campaign_settings_patched": true,
    "ai_models_configured": true,
    "qualification_pushed": true,
    "segments_created": true,
    "segment_descriptions_set": true,
    "per_segment_sequences_pushed": true,
    "per_segment_ai_variables_pushed": true,
    "per_segment_rewriting_pushed": true,
    "ken_search_imported": false,
    "fully_synced": true
  }
}
```

---

## AI Workflows

### Flow Reference

| Flow | ID | Purpose | Enabled By |
|------|----|---------|------------|
| Qualification | 1 | Qualify/disqualify contacts | Campaign create (`campaign_ai_workflows=[1, 4]`) |
| Personalization | 2 | Generate personalized email content | AUTO-enabled by AI variables endpoint |
| Rewriting | 3 | Rewrite AI-generated content | AUTO-enabled by AI variables endpoint |
| Segmentation | 4 | Sort contacts into segments | Campaign create (`campaign_ai_workflows=[1, 4]`) |
| ToneOfVoice | 5 | Analyze and adapt tone of voice | Not used in standard flow |

### AI Model Config: Auto-Selected by Default

The skill does NOT create `AiFlowModelConfiguration` rows by default. The backend falls back to its own auto-selected models when no config exists for a flow + campaign combination, and those defaults are well-tuned - we use them as-is.

**Only create model configs when the user explicitly asks** for an override on a specific flow. Examples of triggers:
- "use claude-sonnet-4-6 for qualification"
- "override the personalization model to claude-sonnet-4-6"
- "use gpt-5.4 for segmentation"

Without such a request, leave `ai_model_configs: []` in configuration.json and skip the `api_ai_model_config_manage` step entirely. This matches what the backend expects and what the ken-frontend does when a user creates a campaign through the UI without touching model settings.

### What Gets Auto-Generated by Backend

| Component | Source | Notes |
|-----------|--------|-------|
| Personalization system prompts (flow=2, type=system) | `Constants.*` templates + campaign data | Instructions, Rules, Company Context, Email Sequence, Output Format |
| Rewriting default prompt (flow=3) | `Constants.DefaultRewritingPrompt` | Fallback when no user-defined rewriting prompt is set |
| Model selection for all 4 flows | Backend auto-defaults | Applied when `AiFlowModelConfiguration` rows are absent - do NOT create them unless user asks |

### What CSMs Must Create

| Component | Source File | Flow | Type (backend enum) |
|-----------|------------|------|---------------------|
| Qualification structured fields | qualification.md | 1 | 1 (system) |
| Segment descriptions | segmentation.md | - (not a prompt; stored on segment) | - |
| Personalization AI variables | prompts.md (per segment) | 2 | 1 (system) |
| Rewriting instructions (optional) | prompts.md rewriting section | 3 | 1 (system) |

> **PromptType enum note**: The backend enum is `system=1, user=2, assistant=3`. All user-authored prompts in this flow use type=1 (system). The old docs labeled this "User Prompt" which was a misnomer - numerically unchanged.

### Campaign-Level vs Segment-Level AI Variables

AI variables are **per-segment**. The bulk endpoint (`PUT /v1/campaigns/{id}/ai-variables?segmentId={id}`) scopes variables to a specific segment. The skill pushes a separate set of variables for every segment including the default.

Campaign-level variables (no `segmentId`) exist as a fallback for segments that have zero variables of their own. They do NOT merge with segment-level variables - once a segment has any variables, the system uses ONLY that segment's variables.

**Every `{{AI Variable}}` referenced in a segment's email templates MUST have a corresponding per-segment variable.** If a variable like `{{Final PS Line}}` appears in email copy but exists only at campaign level, it will never be generated for contacts in segments with their own variable set.

---

## Cost Optimization Strategies

### 1. Right-Size Contact Import

Use `desired_contacts` in filters.json to control how many contacts are exported from KenSearch. Factor in:
- Expected qualification rate (typically 40-60%)
- Expected email find rate (typically 40-60%)
- Target: 2-3x more than your final desired valid emails

### 2. Choose Cost-Effective Vendors

**Email Finding (default):**
- Findymail + LeadMagicBusiness ([8, 3])
- Good find rate (~40-50%)
- Cost-effective

**Email Verification (default):**
- MailTester ([1]) - $200/month flat fee
- Add catch-all if needed: [1, 5, 7] (MailTester + LeadMagic + Findymail)

### 3. Limit Segments

- 2-4 segments is optimal
- More segments = more email sequences to write and maintain
- Each segment needs its own prompts and strategy

---

## Quick Reference: Pricing Table

### Email Enrichment

| Vendor | ID | Cost per 1k | Recommendation |
|--------|-----|-------------|----------------|
| Findymail | 8 | $3.50 | Default |
| LeadMagicBusiness | 3 | $3.20 | Default |
| Icypeas | 2 | $4.20 | Optional |
| Prospeo | 5 | $5.50 | Optional |

### Email Verification

| Vendor | ID | Cost | Recommendation |
|--------|-----|------|----------------|
| MailTester | 1 | $200/mo flat | Required |
| LeadMagicCatchAll | 5 | 1/20 enrichment cost | Optional |
| FindymailCatchAll | 7 | 1/5 enrichment cost | Optional |

### AI Processing

The model catalog is dynamic and multi-vendor (OpenAI / Anthropic / OpenRouter / Fireworks AI). The backend
auto-picks a cheap default per flow; **read `api_ai_supported_models(flow=<n>)` for the live default + allowed
list - do not hardcode**. Current defaults (verified 2026-06-06):

| Step | Default model | Notes |
|------|---------------|-------|
| Qualification | `accounts/fireworks/models/gpt-oss-20b` | cheap; `gpt-5.4-nano` / `gpt-oss-120b` also allowed |
| Segmentation | (qualification-class, cheap) | tracks the qualification catalog |
| Personalization | `accounts/fireworks/models/kimi-k2p5` (kimi-k2.5) | `claude-sonnet-4-6` available for higher quality |
| Rewriting | (personalization-class) | tracks the personalization catalog |

Prompt caching is on for all four flows (~90% input-token savings), so per-1k costs are far lower than the
list price of the model. See [`../../../reference/platform-capabilities.md`](../../../reference/platform-capabilities.md).

---

## Common Patterns

### Pattern 1: Standard Segmented Campaign (Most Common)

**Use Case:** Targeting a broad ICP, segmenting into 3 verticals.

**Plan structure:**
```
03-15 - plan 1/
├── plan.md              # "Acme - B2B SaaS CTOs"
├── filters.json         # KenSearch filters, desired_contacts: 5000
├── qualification.md     # Exclude competitors, agencies
├── segmentation.md      # 3 segments: early/growth/established SaaS
├── 1 - early-stage-saas/
├── 2 - growth-stage-saas/
└── 3 - established-saas/
```

**Campaign settings:**
- data_sources: [17] (KenSearch)
- ai_workflows: [1, 4] (Personalization auto-added by AI variables; add Rewriting (3) explicitly when used)
- data_enrichments: [3, 4] (Website Content + Metadata)
- email_enrichments: [8, 3]
- email_verifications: [1]

### Pattern 2: Simple 2-Segment Campaign

**Use Case:** Testing two angles for the same ICP.

**Plan structure:**
```
03-15 - plan 1/
├── plan.md
├── filters.json
├── qualification.md
├── segmentation.md      # 2 segments: pain-focused vs aspiration-focused
├── 1 - pain-focused/
└── 2 - aspiration-focused/
```

---

## Troubleshooting

### KenSearch Export Fails

**Possible Causes:**
- Invalid filters in filters.json
- KenSearch API unavailable
- Campaign ID not found

**Solutions:**
1. Validate filters.json format
2. Check KenSearch MCP connectivity
3. Verify campaign was created successfully

### Low Qualification Rate (<25%)

**Solutions:**
1. Review qualification.md criteria - may be too strict
2. Broaden KenSearch filters to better match ICP
3. Test qualification on sample data

### Segment Creation Fails

**Possible Causes:**
- Duplicate segment names
- Campaign not found

**Solutions:**
1. Ensure unique segment names in segmentation.md
2. Verify campaign_id is valid

### Prompt Push Fails

**Possible Causes:**
- Empty prompt text
- Invalid flow/type values
- Segment ID not found

**Solutions:**
1. Check prompts.md formatting
2. Ensure all enum values are numeric
3. Verify segment was created successfully

---

## Related Resources

### Skills

- **`/campaign-planning`** - Create plan.md with campaign strategy
- **`/ken-search`** - Build filters.json with KenSearch filters
- **`/qualification`** - Create qualification.md
- **`/segmentation`** - Create segmentation.md
- **`/campaign-strategy`** - Create per-segment strategy.md
- **`/email-copywriting`** - Write per-segment email sequences
- **`/prompt-writer`** - Create per-segment AI personalization prompts
- **`/verify-campaign`** - Verify campaign configuration after setup

### Key Files

- **`{plan_folder}/configuration.json`** - Ken client ID (`client_id`) plus every pushed resource ID
- **`{workspace}/research.md`** - Client research and overview
- **[`campaign-status-enums.md`](campaign-status-enums.md)** - Canonical CampaignStatus enum + lifecycle (Draft/Building/Ready/Sending/Paused/Completed/Error)

---

## Appendix: Configuration Checklist

### Pre-Configuration
- [ ] Client research complete (`/client-research`)
- [ ] Plan created (`/campaign-planning`) - plan.md exists
- [ ] KenSearch filters built (`/ken-search`) - filters.json exists
- [ ] Qualification defined (`/qualification`) - qualification.md exists
- [ ] Segmentation defined (`/segmentation`) - segmentation.md exists

### Per-Segment Files
- [ ] Strategy created (`/campaign-strategy`) - strategy.md per segment
- [ ] Email copy written (`/email-copywriting`) - emails.md / emails_v2.md per segment
- [ ] Prompts created (`/prompt-writer`) - prompts.md per segment

### Configuration Run
- [ ] Ken AI MCP enabled and healthy
- [ ] Client profile has integrations.ken_app.client_id
- [ ] Campaign created (CampaignStatus: Draft = 0)
- [ ] AI models configured (4 flows)
- [ ] KenSearch results exported
- [ ] Qualification prompt pushed
- [ ] Segments created
- [ ] Segmentation prompts pushed (general + per-segment)
- [ ] Per-segment redirect links created (before email sequences, with display text in `text_value`)
- [ ] Per-segment email sequences pushed (with standalone `{{tracking_link:ID}}` tokens, not `<a href>` wrapped)
- [ ] Per-segment personalization prompts pushed
- [ ] configuration.json saved

### Post-Configuration
- [ ] Review campaign in Ken AI dashboard
- [ ] Verify all segments appear correctly
- [ ] Test AI personalization on sample contacts
- [ ] Flip campaign status to Sending (3) when ready (CampaignStatus - see `references/campaign-status-enums.md`)

---

**End of Campaign Configuration Guide v3**

For questions, improvements, or feedback, use `/feedback` command.
