# Campaign Configuration Guide

**Purpose:** Background for assembling and syncing cold email campaigns on the platform. The source of truth is **live platform state** read through MCP tools.

---

## Contents

1. [Quick start](#quick-start)
2. [What this stage owns](#what-this-stage-owns)
3. [Campaign settings](#campaign-settings)
4. [AI workflows](#ai-workflows)
5. [Evaluation and lead scoring](#evaluation-and-lead-scoring)
6. [Search import](#search-import)
7. [Cost optimization](#cost-optimization)
8. [What spends credits](#what-spends-credits)
9. [Common patterns](#common-patterns)
10. [Troubleshooting](#troubleshooting)
11. [Related stages and skills](#related-stages-and-skills)

---

## Quick start

**Before this stage:**

1. Workspace context and the campaign plan (campaign-planning; the plan lives in the campaign's Knowledge file when Knowledge is on, otherwise in the chat)
2. Saved search with the people filters (ken-search skill)
3. Qualification prompt (knowledge-setup `qualification`)
4. Segments (segmentation)
5. Per-segment strategy, sequences, AI variables (campaign-strategy, email-copywriting, knowledge-setup `prompt-writer`)

**This stage:**

```
Live campaign with segments + copy + prompts
  -> campaign-configuration (settings, schedule, AI workflows, completeness, pushes, checkpoints, optional import)
  -> verify-campaign
  -> lifecycle calls, only when the user asks
```

---

## What this stage owns

| Owns | Routes away |
|------|-------------|
| Contact limit, schedule, daily cap | Campaign shell (campaign-planning) and A/B mode (the app) |
| AI workflows (`campaign_flow(operation="replace-ai-workflows")`) and rewriting readiness (`to_rewrite`) | Segment design and criteria (segmentation) |
| Completeness report | Qualification text (knowledge-setup `qualification`) |
| Pushing approved artifacts in order | Sequence copy and HTML (email-copywriting) |
| Version checkpoints (`email_sequences(operation="save-version")`) | AI variable authoring (knowledge-setup `prompt-writer`) |
| Search import job | Launch checklist (verify-campaign) |
| Lead scoring toggle and runs | Inbox assignment for non-staff (the app) |
| Targeted update / delete / rollback recipes | |

---

## Campaign settings

Writable through `campaigns(operation="update", ...)`: `name`, `contact_limit`, `sending_days`, `sending_start_time`, `sending_end_time`, `sending_timezone`, `max_emails_per_day`, `ramp_up_days`, and the campaign options its full docs list (`describe_tools(['campaigns'])`). Gap-fill picks up a schedule or daily-cap change on its next pass, about every 10 minutes. On a client's live campaign, any schedule or volume change needs a yes that names that client, carried in `sending_days_requested_by`.

AI workflows are writable through `campaign_flow(operation="replace-ai-workflows", ...)` (next section).

Read through `campaign_ops(operation="status")` and set in the campaign settings in the app (link in the stage body): data sources, enrichments, website page selections, email enrichments and verifications, personal emails, dedup settings, A/B mode.

| Setting | Convention | Notes |
|---------|-----------|-------|
| `status` | (never sent) | Create always births Draft. Lifecycle calls only. See `campaign-status-enums.md` |
| A/B (percentage) mode | app setting | The user turns it on in the app, at create time or later; a later switch needs every active segment, Default included, already `ab_test` with weights summing to 100 and no manual filter criteria |
| `contact_limit` | confirm | From plan intent / live campaign |
| `max_emails_per_day` | **50** | Operator convention; user override allowed |
| `sending_days` | Mon-Fri | Weekday ints, 0 = Sunday |
| `sending_start_time` / `sending_end_time` | `"09:00"` / `"17:00"` | Without any schedule, create stamps Mon-Fri 10:00-18:00 ET |
| `sending_timezone` | `"America/New_York"` | Or `"prospect"` for a window local to each lead |
| `duplication_scope` | 1 (CampaignSegment) | App setting |
| `campaign_data_sources` | `[17]` | App setting |
| AI workflows | `[1, 4]` | Plus 2 once AI variables exist, plus 3 when rewriting is used; written with `replace-ai-workflows` |
| `campaign_data_enrichments` | `[3, 4]` | Not defaulted on at create; Home page selection when on. App setting |
| `campaign_email_enrichments` | `[3, 5, 8]` | Defaulted at create when omitted. App setting |
| `campaign_email_verifications` | `[1, 5, 7]` | Defaulted at create when omitted. App setting |
| `allow_personal_emails` | `false` | Reject gmail / yahoo / etc. App setting |

---

## AI workflows

Read: `campaign_flow(operation="list-ai-workflows", campaign_id=...)`. Write: `campaign_flow(operation="replace-ai-workflows", campaign_id=..., ai_workflow_ids=[...])`, a full replace: read first, then send every id the campaign should run. While the campaign is scheduled, launching or sending, only adding 3 and changing 6 are allowed; anything else answers 409 until it is paused.

| Flow | ID | Purpose | Attached by |
|------|----|---------|-----------|
| Qualification | 1 | Qualify / disqualify contacts | Campaign baseline `[1, 4]` |
| Personalization | 2 | Generate personalized content | **You**, with `replace-ai-workflows`, once the segments have AI variables (creating a variable does not attach it) |
| Rewriting | 3 | Rewrite AI-generated content | **You**, when a rewriting prompt or `to_rewrite=1` variables exist |
| Segmentation | 4 | Sort contacts into segments | Campaign baseline `[1, 4]`; detach for Manual segments |
| ToneOfVoice | 5 | Tone analysis | Retired: not attachable, and new prompts cannot use it |
| Scoring | 6 | 1-10 lead fit score | `campaigns(operation="replace-scoring")`, opt-in |

### Models: auto-selected by default

Do not create per-flow model configurations unless the user asks for an override on a specific flow ("use model X for qualification"). Without one, the backend picks a well-tuned default per flow. Read the live catalog and default with `models(operation="ai_supported_models", flow=<n>)`; never hardcode model ids. Prompt caching is on for the standard flows. The model configuration operations (`models(operation="create"|"update"|"delete", ...)`) are for workspace admins; anyone else changes the model in the campaign's AI settings in the app.

### What the backend generates

| Component | Notes |
|-----------|-------|
| Personalization system prompts | Templates plus campaign and company context |
| Default rewriting instructions | Used when no custom rewriting prompt exists |
| Model selection for each flow | When no override exists |

### What other stages push

| Component | Owner | Flow |
|-----------|-------|------|
| Qualification structured fields | knowledge-setup `qualification` | `qualification` |
| Segment descriptions | segmentation | (segment fields, not prompts) |
| Personalization AI variables, one prompt each | knowledge-setup `prompt-writer` | `personalization` |
| Rewriting instructions (optional) | knowledge-setup `prompt-writer` | `rewriting` |
| Email sequences and tracking links | email-copywriting | - |

AI variables are **per segment**. Campaign-level variables are a fallback only for a segment with none of its own; they never merge. Every AI variable a segment's copy references must exist on that segment, or it is never generated for those contacts.

---

## Evaluation and lead scoring

Qualification, segmentation, and lead scoring share one evaluation-only model pass per contact:

- The first qualification, segmentation, or scoring pass that finds a contact not yet evaluated makes one call covering every lane the campaign has on. Later lanes skip already-evaluated contacts.
- **Qualification** (workflow 1 on): one yes/no "qualified" question built from the audience, qualification, and disqualification fields. A probability above 0.40 stores qualified.
- **Segmentation** (workflow 4 on, at least two buildable segments): one choice over the segment descriptions, with Default listed last. Confidence at or above 0.6 stores the chosen segment; below that, or on an unrecognized choice, the contact goes to Default.
- **Lead score**: included whenever either lane runs, and always in manual scoring runs. Scores persist 1-10 (1 = no fit, 10 = perfect fit) and do not change qualification.

**Scoring is opt-in per campaign:**
- Enable: `campaigns(operation="replace-scoring", campaign_id=..., is_enabled=True)`. Idempotent.
- Run (manual only, no automatic pass): `campaigns(operation="run-scoring", campaign_id=..., contact_ids=..., limit=...)`. Only qualified, non-deleted contacts; default limit 100, max 1000; ineligible ids count as skipped.
- Read: `campaigns(operation="get-scoring", campaign_id=...)` returns whether scoring is on. Scores are on each contact as `qualityScore`.
- The scoring prompt is built from the qualification fields plus company context. An optional `scoring` prompt with `scoring_criteria` adds tuning ("what makes a lead good or bad").

Editing the qualification prompt invalidates prior qualification results and resets flags, so contacts re-evaluate on the next pass (which is why that write answers 409 with the impact first on a campaign that already has results).

---

## Search import

Every search built for a campaign is saved (the ken-search skill makes that mandatory). Load filters with `saved_searches(operation="list", client_id=...)`, then `saved_searches(operation="get", search_id=...)`.

- **Single list**: use the campaign's people search as `people_filters_json`.
- **Multi-list**: import each list's own people search separately, with its share of the target (equal split unless the plan weights them). Never merge them into one import.
- **Never** pass an account search (`search_type="account"`) as `people_filters_json`. Account searches resolve companies; they seed `search(operation="people_in_accounts", account_ids=...)`, not the import.
- No saved search for this campaign is a gap: run the ken-search skill or ask for a saved-search id.

Get multi-list right the first time: `lists(operation="delete", list_id=...)` fails while a list still has contacts, and there is no bulk contact wipe. To fix a mixed import, convert segments to Manual filters on the existing contacts instead of planning a clean re-import.

---

## Cost optimization

### 1. Right-size the import

Default import limit in this stage: `5 * contact_limit`. Factor in:

- Expected qualification rate (about 40-60%)
- Expected email find rate (about 40-60%)
- Target: 2-3x more raw imports than the valid emails you need

### 2. Keep the default email finding and verification

The create defaults (finding `[3, 5, 8]`, verification `[1, 5, 7]`) are the cost-effective set. Change them in the app only when the user asks. Never name the providers behind these ids to a client (`enums.md`).

### 3. Prefer Manual segments when filters are enough

Manual segments (industry, title, geo filters) cost nothing; AI segmentation spends model usage per contact.

### 4. Limit segments

2-4 segments is typical. Each adds a sequence and a variable set to maintain.

---

## What spends credits

Say what a step costs before you run it on more than a handful of contacts. Never quote a price you did not read from the workspace's own billing.

| Step | Spends |
|------|--------|
| Search import, then enrichment (email finding and verification) | Credits per contact |
| `campaign_flow(operation="start_workflows")` and the AI workflows it runs | Credits / model usage per contact |
| `prompts(operation="test", ...)` | Model usage per sample |
| `campaigns(operation="run-scoring", ...)` | Model usage per contact |

The model catalog is dynamic. Read `models(operation="ai_supported_models", flow=<n>)` for the live default and allowed list.

---

## Common patterns

### Pattern 1: Standard segmented campaign

- Workflows `[1, 4]`, plus 2 once AI variables exist, plus 3 when rewriting is used
- Several AI segments with criteria descriptions; Default holds the general audience description
- Checkpoint each segment with `email_sequences(operation="save-version")` after the first full configure

### Pattern 2: Sequence A/B (percentage mode)

- A/B mode turned on in the app (at create time, or later once every active segment is an `ab_test` arm)
- Arms are AbTest weights summing to 100, Default included
- No AI criteria on arms: only the sequences differ

### Pattern 3: Settings-only pass

1. Get the campaign
2. Show the diff against conventions or requested values
3. Approve (with the client's named yes on a live client campaign), then `campaigns(operation="update", ...)`
4. Optional import

### Pattern 4: Copy review round

1. `email_sequences(operation="segment-email-sequences-replace", segment_id=..., steps=[...])` with improved copy, keeping variants, wait days and every carried step field
2. `email_sequences(operation="save-version", segment_id=..., name=...)` per segment
3. Confirm with `email_sequences(operation="list-versions", segment_id=...)`

---

## Troubleshooting

### Search import fails

1. Confirm filters come from `saved_searches(operation="get")` (valid people filter JSON, not an accounts search)
2. Check connectivity with `health_check`
3. Verify the campaign id exists
4. Poll `saved_searches(operation="export_status")`; a 202 is not success
5. Technology-filter error (400 `technology_filters_retired`): the filters still carry retired technology criteria. Surface it and ask before rebuilding without them; never strip and retry silently.

### Low qualification rate (under 25%)

1. Review the criteria with knowledge-setup's `qualification` playbook (may be too strict)
2. Broaden the search filters with the ken-search skill
3. Sample-test qualification on imported contacts (`prompts(operation="test", campaign_id=..., flow="qualification")`, which spends model usage)

### Segment issues

1. Unique segment names; Default is never renamed or deleted
2. AI mode: non-empty descriptions; percentage mode: weights sum to 100
3. Fix with the segmentation stage or `segments(operation="update", ...)`

### Prompt / variable issues

1. Empty prompt text fails validation
2. Pass `flow` and `campaign_id` (plus `segment_id` for per-segment prompts) on every prompt create
3. A Subject Line variable is required before workflows can start (knowledge-setup `prompt-writer`)
4. A 409 with an impact preview means the write would refresh AI results: show it, then repeat with `confirm` set to true only if the user agrees
5. Variables exist but nothing generates: workflow 2 is not attached (`campaign_flow(operation="list-ai-workflows")`)

### Wait days look wrong in the dashboard

Check the stored `waitDays` first (`0, 3, 4, 4` for 0/3/7/11). The dashboard gap widget can look off by one for a correct sequence. Never shift stored values to match the UI.

### Lifecycle / status

- Never set status through `campaigns(operation="update")`
- Lifecycle calls run only on the user's explicit request; launch is the user's decision after verify passes
- On a `start_workflows` rejection: `data.startWorkflowReadiness.checks`

Full recovery table: `error-recovery.md`. Status enum: `campaign-status-enums.md`.

---

## Related stages and skills

| Stage or skill | Role |
|-------|------|
| campaign-planning | Campaign shell, the plan |
| ken-search skill | Saved search / people filters |
| knowledge-setup `qualification` | Qualification prompt |
| segmentation | Segment rows, descriptions, weights |
| campaign-strategy / email-copywriting | Sequences, tracking links |
| knowledge-setup `prompt-writer` | Personalization variables, rewriting |
| campaign-configuration (this) | Settings, schedule, AI workflows, completeness, pushes, checkpoints, import, scoring, delete / rollback |
| verify-campaign | Read-only launch checklist |

### Operator checklist (live platform)

**Before**
- [ ] Campaign exists (Draft)
- [ ] Segments present (Default + arms)
- [ ] Qualification prompt present
- [ ] Sequences and AI variables per segment
- [ ] Tracking links where CTAs exist

**This stage**
- [ ] MCP healthy
- [ ] Settings and schedule aligned with conventions or user overrides (named client yes on a live client campaign)
- [ ] App-only settings checked and flagged to the user
- [ ] AI workflows match the content (2 with variables, 3 with rewriting)
- [ ] Completeness gaps routed or pushed from approved content
- [ ] User approved the writes
- [ ] Wait days verified after each sequence push
- [ ] Checkpoint per segment attempted
- [ ] Optional import polled to a terminal state
- [ ] Inboxes assigned (staff here, everyone else in the app)

**After**
- [ ] verify-campaign
- [ ] Lifecycle calls only when the user asks
