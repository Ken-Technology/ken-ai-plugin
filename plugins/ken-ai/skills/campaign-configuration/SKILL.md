---
name: campaign-configuration
description: Configure campaigns on Ken AI platform via MCP tools. Creates campaigns with KenSearch data source, pushes qualification prompts, creates segments, and syncs per-segment email sequences and personalization prompts. Pure MCP - no local scripts, no API keys, everything runs through the ken-ai MCP OAuth session. Use after all campaign files are complete. Triggers on 'configure this campaign', 'push to Ken AI', or when dispatched by campaign-planning.
model: opus
thinking: true
---

# Campaign Configuration Skill

Push a plan folder to the Ken AI platform, entirely through ken-ai MCP tools. The skill validates the plan folder against the parser contract, gets user approval, then pushes the campaign, qualification, segments, and each segment's resources (redirect links, email sequence, AI variables, rewriting prompt) via `api_*` tool calls. `configuration.json` is written incrementally after every step and doubles as the recovery journal.

**Hard rule: every platform write goes through a ken-ai MCP tool.** Never fall back to curl, raw HTTP, `.env` files, or pasted API keys - if a tool call fails with an auth error, the fix is reconnecting the MCP server (`/mcp`), not a side channel.

> **Platform reference**: for the current MCP tool surface, config knobs, enums, AI model defaults, and the
> 6 supported KenSearch countries, see `../../reference/platform-capabilities.md`.
> That file is the single source of truth and is refreshed each platform-update cycle.

## Required Context

Before configuring, always load:

1. **Plan folder** - contains all required files (plan-level and per-segment)
2. **Ken client ID** - from an existing `configuration.json`, or resolved via `api_client_manage(operation="list")` + user confirmation

**Directory Structure** (`{workspace}` = the client campaign workspace, default `./ken-campaigns/{client-slug}/`):
```
{workspace}/
├── research.md
├── notes.md                      # optional
└── {date} - plan {n}/
    ├── plan.md
    ├── filters.json
    ├── qualification.md
    ├── segmentation.md
    ├── configuration.json        # created/updated by this skill
    ├── 0 - default/              # Default segment (catch-all audience)
    │   ├── strategy.md
    │   ├── emails_v2.md
    │   └── prompts.md
    ├── 1 - {segment-slug}/
    │   ├── strategy.md
    │   ├── emails_v2.md          # preferred over emails.md
    │   └── prompts.md
    └── ...
```

**Default segment convention**: the `0 - default` folder is a first-class segment like any other, but it binds to the backend's auto-created Default segment (`isDefault=true`) instead of creating a new one. configuration.json stores it at `per_segment["0 - default"]` alongside the audience segments.

## Workflow

### Step 0: Verify Ken AI MCP is available

Call `health_check`. If the tool is missing or errors with 401/403:
- Ask the user to connect/re-authorize the ken-ai MCP server: run `/mcp`, pick `ken-ai`, complete the browser OAuth flow (create an API key at ken.so - Settings - API Keys and paste it once).
- Stop until the connection works. Do NOT work around it with curl or raw HTTP.

### Step 1: Validate the plan folder & auto-fix

Before any network call, validate the plan folder against [`references/parser-contract.md`](references/parser-contract.md) - that's the single source of truth every upstream skill targets. Read every file with Read/Glob and check:

**Hard errors (block the push):**
- `plan.md` exists with a single top-level `# {Campaign Name}` H1 (missing H1 = name falls back to "Untitled Campaign", warn only; missing file = error)
- `filters.json` is valid JSON with a top-level object (`desired_contacts` missing = default 1000, warn)
- `qualification.md` has the three H2s (`## Audience Description`, `## Qualification Criteria`, `## Disqualification Criteria`) with at least 2 of 3 populated
- `segmentation.md` has `## Default Segment` and `## Segments` with `### Segment N: {Name}` H3s; each H3's slug matches its `N - {slug}` folder; numbering contiguous from 1; the default folder is literally `0 - default`
- **Percentage mode** (`## Segmentation Mode` = `percentage`): every arm has `- **Weight**: N` (integer 1-100); the Default's weight is explicit or back-filled as `100 - sum(arms)`; the total including the Default is exactly 100; `0 - default/` exists
- Every segment folder has `emails_v2.md` or `emails.md` (prefer `emails_v2.md`)
- Every `{{Title Case}}` AI variable used in an email body has a matching H3 in that segment's `prompts.md` - EXCEPT `{{Subject Line}}`, which is auto-emitted (see Step 6)
- `prompts.md` has `## User Prompts (To output: true)`; each H3 name is Title Case, ≤30 chars, with a `**Prompt**:` marker; each prompt ≤4096 chars
- No hand-authored `{{tracking_link:...}}` tokens anywhere

**Warnings (surface in the Step 3 summary, non-blocking):** `### Version X` instead of `### Variant X`, combined step name (email title + variant description) >25 chars (will truncate), legacy `[Title Case]` square brackets, missing `strategy.md`.

**Auto-fix loop** (max 2 iterations): for mechanical issues (the auto-fixable column in parser-contract.md), dispatch a scoped fixer subagent (`Task(subagent_type="general-purpose")`) with the plan folder path, the error/warning list, and instructions to fix **formatting only** per the contract - never change content or meaning, use Edit not Write, and stop rather than fabricate a missing file. Re-validate after each iteration. Anything requiring judgement (missing qualification criteria, a slug rename, a referenced AI variable with no prompt) escalates to the user. If validation still fails after the loop, show the remaining errors and stop - don't push a broken plan. If the fixer changed files, include a short summary of the fixes in the Step 3 approval prompt.

**Parse while validating.** As you validate, extract the working data for the rest of the flow: campaign name (plan.md H1), `desired_contacts` and filters (filters.json), the three qualification sections, segmentation mode + per-segment name/description/weight (segmentation.md), and per segment: the ordered email steps (title, variants A-D, subject/body, wait days), the unique URLs in order of first appearance, the AI variables used, the prompts (name/text/order), and the optional `## Rewriting Instructions` block. Body-stripping rules (Goal/Subject/Body markers, code fences, `---`, `**Variant Notes**:` terminators) are in parser-contract.md.

### Step 2: Handle existing configuration

Three cases:

**Case A** - No `configuration.json` or `campaign_id` is null: proceed to Step 3 (create flow).

**Case B** - `configuration.json` has a non-null `campaign_id` AND it matches the user's target (or user didn't specify one): route to **Step 10: Sync/Update/Delete**. Do not run Steps 3-9.

**Case C** - `configuration.json` has `campaign_id` but the user specified a **different** campaign (e.g. "push to campaign 311" when config tracks 313):
1. Warn: "Config tracks campaign {X}, but you asked for campaign {Y}."
2. Bind local folders to the target campaign: call `api_campaign_segment_manage(operation="list", campaign_id=<target>)`, map the `isDefault=true` row to `0 - default` and the rest to numbered folders by name match (slugified segment name vs folder slug).
3. Show the resulting folder-to-segment mapping and ask the user to confirm.
4. If confirmed, rewrite `configuration.json` fresh with the new `campaign_id` and segment ids.
5. Proceed to **Step 10: Sync/Update/Delete** with the rebound config.

If the user explicitly wants to start over on a fresh campaign ("create a new campaign", "start fresh", "ignore the existing one"), delete the old `configuration.json` first and continue with Step 3 as a normal create.

### Step 3: Show summary and get approval

Collect anything still unknown before rendering: the Ken `client_id` (from configuration.json or `api_client_manage(operation="list")` + user confirmation), `max_emails_per_day` (default 50), `sending_timezone` (default America/New_York), and the sending window/days (default Mon-Fri 09:00-17:00) - confirm defaults with the user rather than silently assuming.

Render this summary. Skip the approval question ONLY if the user said "configure directly", "push without asking", or passed `--auto`.

```
## Campaign Configuration Summary

**Campaign Name**: {name}
**Client**: {client_name} (Ken client ID {client_id})

**Settings**:
- Contact Limit: {desired_contacts}
- Max Emails/Day: {max_emails_per_day}
- Schedule: {sending_days} {sending_start_time}-{sending_end_time} {sending_timezone}
- Recently-emailed dedup: {recently_emailed_dedup_days or "off"}

**Data**: KenSearch (17), enrichments {data_enrichments}, email {email_enrichments}, verify {email_verifications}
**Segmentation mode**: {ai | percentage} {"(sequence A/B test - random % distribution)" if percentage else "(AI sub-ICP segmentation)"}
**AI Workflows**: {workflows} - Qualification (+ Segmentation in AI mode; Personalization (2) auto-enabled by the AI variables push). Rewriting (3) is NOT auto-enabled - Step 6.5 adds it when the plan uses rewriting.

**Qualification**:
- Audience: {first 80 chars}...
- Qualification: {first 80 chars}...
- Disqualification: {first 80 chars}...

**Segments** ({N}):
{per segment: folder, name, step count, AI variable count, URL count; in percentage mode also the weight % per arm INCLUDING the Default control arm (all sum to exactly 100)}

{Auto-fixes applied in Step 1, if any}
{Warnings from Step 1, if any}

Proceed with creation? [Yes/No]
```

**Hard stop.** No platform write happens before approval.

### Step 4: Create campaign

One `api_campaign_manage` call - the create accepts the full schedule surface, so there is no post-create patch:

```python
api_campaign_manage(
    operation="create",
    name=<plan.md H1>,
    client_id=<client_id>,
    # Do NOT pass status - the MCP create rejects it (KenValidationError).
    # New campaigns are always born Draft; transition later via api_campaign_lifecycle.
    contact_limit=<desired_contacts>,
    duplication_scope=1,                      # CampaignSegment (default)
    allow_personal_emails=False,              # Always false - never allow gmail/yahoo/etc.
    campaign_data_sources=[17],               # KenSearch
    campaign_ai_workflows=[1, 4] if ai_mode else [1],
    campaign_data_enrichments=[3, 4],         # WebsiteContent, WebsiteMetadata (adjust per plan)
    campaign_email_enrichments=[8, 3],        # Findymail, LeadMagic Business (adjust per plan)
    campaign_email_verifications=[1],         # MailTester (adjust per plan)
    campaign_website_page_selections=<per plan, when website enrichments are on>,
    max_emails_per_day=<from Step 3>,
    sending_days=<from Step 3>,
    sending_start_time=<from Step 3>,
    sending_end_time=<from Step 3>,
    sending_timezone=<from Step 3>,
    # Sequence A/B test (percentage mode) ONLY - set at CREATE time, numeric 3:
    segmentation_mode=(3 if percentage_mode else omit),
    # OPTIONAL: suppress contacts emailed within the last N days (1-3650). Off by
    # default. Pass a value ONLY when the plan or user asks for a recency guard -
    # prime use is reactivation / winback campaigns.
    # recently_emailed_dedup_days=<days>,
)
```

Save `campaign_id` from the response and **immediately** write it to `configuration.json` (Step 7 shape) - this is the crash journal; if anything later fails, the config knows the campaign exists.

> **Why `segmentation_mode` must be set at CREATE time (do not try to set it later).**
> The backend can only enter A/B mode at creation: the auto-created Default segment is born
> `AbTest@100` **only** when the campaign is created with `segmentationMode=3`. A post-hoc switch
> is impossible - the update validator counts the untyped Default and rejects with HTTP 400
> *"All segments must use A/B test segmentation before launch"*, and AbTest-typed arms can't be
> created until the campaign is already in A/B mode (a hard circular dependency). Pass the
> **numeric** `3` - the backend rejects the string form on updates.

Later schedule edits go through `api_campaign_manage(operation="update", ..., name=<current name>, auto_sync_schedule=True)`. A 400 mentioning "No EmailBison campaigns" from the schedule sync is benign pre-launch. Do NOT re-send `segmentation_mode` on updates.

### Step 5: Push qualification and segments

**Qualification** (flow=1) - use the per-flow save tool (auto-upserts, always sets flow/type/name correctly):
```python
api_qualification_prompt_save(
    campaign_id=campaign_id,
    persona=<audience_description>,
    qualifiers=<qualification_criteria>,
    disqualifiers=<disqualification_criteria>,
)
```
Save `qualification_prompt_id` from the returned `data.id`. Do NOT use `api_prompt_library_manage(operation="create", flow=1, ...)` for qualification - it's the soft-deprecated generic tool and silently resets `flow` to `0` if omitted.

**Segments** (bind default, create the rest). Iterate segments in folder order:

- `0 - default`: **never create.** Call `api_campaign_segment_manage(operation="list", campaign_id=...)` and pick the entry where `isDefault=true`. Record its `id` under `per_segment["0 - default"].segment_id`.
  - **Percentage mode only**: the Default is the baseline/control arm. The backend births it as `AbTest@100`, so dial its weight down: `api_campaign_segment_manage(operation="update", campaign_id=..., segment_id=<default id>, ab_test_percentage=<default weight>)`. Required - all active arms (Default included) must sum to exactly 100 or launch/export 400s.
- Numbered segments: `api_campaign_segment_manage(operation="create", campaign_id=..., name=<H3 name with the "Segment N:" prefix stripped>, segmentation_type=<2 for AI mode, 3 for percentage>, ab_test_percentage=<weight, percentage mode only>)`. Save each returned id. **Idempotent**: list first; if a segment with the same name already exists, update instead of create.

**Descriptions** (one `update` per segment; descriptions are the system of record for segmentation context):
- `0 - default`: push only the description (the campaign-wide audience context from `## Default Segment`); the backend's name is always "Default" - never rename it.
- Non-default segments: push name and description (the segment's criteria block).
- **Percentage mode**: numbered arms have no AI criteria (their description is empty after the Weight line is stripped) - skip their description update; still push the Default's if present.

Update `configuration.json` with all segment ids now.

### Step 6: Push per-segment resources

Process `0 - default` first, then each numbered segment. Segments are independent - with many segments you MAY dispatch one general-purpose subagent per segment (each gets its segment's parsed data + ids and returns a JSON of created ids), but sequential in the main context is the default. For each segment:

**6.1 Redirect links.** Collect the segment's unique URLs (raw or `[text](url)`) in order of first appearance. On re-runs, first call `api_redirect_link_manage(operation="get_by_campaign", campaign_id=...)` and reuse any link whose name matches this segment's prefix. For each new URL:
```python
api_redirect_link_manage(operation="create", campaign_id=..., name="{segment-slug} url_{n}", original_url=<url>)
```
(Links are campaign-scoped - the `{segment-slug}` name prefix is what keeps re-runs matched per segment.) Then substitute each URL with `{{tracking_link:<link_id>}}` in the email bodies in-memory.

**6.2 Serialize bodies to HTML** per [`references/html-serializer.md`](references/html-serializer.md): `<p>`-wrapped paragraphs, blank lines as `<p><br /></p>` (never bare `<p></p>`), `{{...}}` tokens verbatim and unescaped, single-brace variables (`{firstName}`, `{sender_signature}`) verbatim.

**6.3 Email sequence.** Creating a segment auto-creates an empty sequence, so get-then-update:
```python
seq = api_email_sequence_manage(operation="get", campaign_id=..., campaign_segment_id=<sid>)
# steps: one entry per (email, variant):
#   {"stepOrder": N, "versionType": 1-4 (A-D), "subjectLine": "{{Subject Line}}",
#    "bodyContent": <html>, "waitDays": <days>, "isActive": true}
# If a sequence with steps exists: operation="update" with sequence_id and the FULL step list
#   (include id + sequenceId on steps you keep - the array REPLACES the set).
# If empty/none: operation="create" with the step list.
```
Store `email_sequence_id` in configuration.json.

**6.4 AI variables.** One bulk save per segment - include every prompt from `prompts.md` PLUS the auto-emitted `Subject Line` variable (only if prompts.md doesn't define its own `### Subject Line` override). It is **not** backend-provided; skipping it breaks workflow start:
```python
api_ai_variables_save(campaign_id=..., segment_id=<sid>, variables=[
    {"name": <H3 name>, "prompt": <prompt text>, "order": <n>},
    ...
])
```
The bulk save always stores `toRewrite=0` (backend behavior), so make the campaign rewriting-ready per-prompt: re-read the variables via `api_prompt_library_manage(operation="get_by_campaign", campaign_id=...)`, take the flow=2 prompts for this segment, and for every one EXCEPT `Subject Line` call:
```python
api_prompt_library_manage(operation="update", prompt_id=<id>, flow=2, to_rewrite=1)
```
Run this unconditionally (even when Rewriting is off) - it's what makes rewriting enableable later. Store the prompt ids in `per_segment[<folder>].ai_variable_ids`.

**6.5 Rewriting prompt** (only if the segment's prompts.md has `## Rewriting Instructions`):
```python
api_rewriting_prompt_save(campaign_id=..., instructions=<the delta text>, campaign_segment_id=<sid>)
```
Store `rewriting_prompt_id`. The backend appends these instructions after its default rewriting prompt - only the delta is needed.

After each segment completes, update `configuration.json` (Step 7 shape). If a segment fails partway, record what landed and continue with the next segment; report failures at the end.

### Step 6.5: Enable the Rewriting workflow (when used)

Setting `to_rewrite=1` makes variables rewritable, but the Rewriting flow only runs when workflow `3` is in `campaign_ai_workflows`. If ANY segment has rewriting instructions (or the plan calls for rewriting):
```python
api_campaign_manage(operation="update", campaign_id=..., client_id=..., name=<current name>,
                    campaign_ai_workflows=[1, 2, 3, 4] if ai_mode else [1, 2, 3])
```

### Step 7: configuration.json

The skill writes this file itself with Write/Edit - incrementally, after every successful step (it is the recovery journal). Shape per [`references/configuration-schema.md`](references/configuration-schema.md), plus top-level `client_id`, `client_name`, `client_slug`. Key fields: `campaign_id`, `qualification_prompt_id`, `settings.{max_emails_per_day, sending_timezone, ...}`, `segmentation.mode`, `per_segment[<folder>].{segment_id, email_sequence_id, ai_variable_ids, rewriting_prompt_id, redirect_link_ids, redirect_links{url->id}, versions}`, `version_log[]`, `sync_status{}`. Merge into the existing file - never clobber fields you didn't touch.

### Step 7.5: Capture the baseline version (v1)

Version history is opt-in - the calls above mutate the **live** copy and write no version row. Snapshot a v1 baseline per segment (including `0 - default`), so later feedback rounds have a restore target and drift reference (recipes in `references/update-recipes.md` §8b):

```python
api_email_sequence_manage(operation="save_new_version", campaign_id=cid, campaign_segment_id=sid, steps=<live steps>)   # GET-then-pass
api_prompt_bundle_manage(operation="save_new_version_from_prompts", campaign_id=cid, segment_id=sid, prompts=<live prompt library>)
api_campaign_segment_manage(operation="save_new_version", campaign_id=cid, segment_id=sid)
```

Record the returned version numbers in `per_segment[<folder>].versions = {sequence, prompt_bundle, segment}` and append one `version_log` entry (`round: 1, note: "initial"`). Best-effort - if a snapshot call fails, log it and continue; the baseline can be re-captured on the next sync.

### Step 8: Report results

```
## Campaign Configured

**Campaign ID**: {campaign_id}
**Name**: {campaign_name}
**Status**: Draft

**Created**:
- Qualification prompt (id {qualification_prompt_id})
- {N} segments (including `0 - default`)
- Per-segment resources:
  - {segment_1}: {email_count} emails, {var_count} AI variables, {link_count} redirect links
  - ...
- configuration.json saved at {plan_folder}/configuration.json

**Next**:
1. Review campaign in Ken AI dashboard
2. Run the verify-campaign skill (offered below) to confirm configuration is complete
3. Once verify passes, transition out of Draft via the lifecycle tool - NEVER via api_campaign_manage(update, status=...):
   - api_campaign_lifecycle(operation="start_workflows", campaign_id={id}) - Draft -> Building; watch `campaignStatuses` (can be [Building] or [Building, Ready] in flight)
   - When Ready (2) and sending should start: api_campaign_lifecycle(operation="launch_sending", campaign_id={id})
   - On rejection, read data.startWorkflowReadiness.checks to see which prerequisites failed and route to the matching fix
```

Then offer: "Want me to run verify-campaign to confirm everything was configured correctly? [Yes/No]" - if Yes, invoke the `verify-campaign` skill with the plan folder path. Offer the same at the end of Step 10's sync flow.

### Step 8.5: (Optional) Select sender configs

**Skip by default.** Only relevant when the client has inbox/domain configs (a Tag with `IsConfig=true`) AND the operator wants this campaign to send through a **subset** of them. With no selection the platform uses all usable configs. If asked:
1. `api_campaign_sender_configs_get(campaign_id=...)` (or `api_campaign_sender_configs(operation="get", ...)`) - list the selection + capacity hints; `api_campaign_sender_configs_available` for the full catalog.
2. `api_campaign_sender_configs_set(campaign_id=..., config_tag_ids=[...])` - full replace; `[]` clears back to "all usable".
3. Optionally record `sender_config_tag_ids` in configuration.json (informational only).

If the tools error with 404, the backend feature isn't deployed for this environment - skip the step.

### Step 9: Ask about KenSearch import (optional)

```
Import contacts from Ken Search now? [Yes / No / Custom limit]
Default limit: {5 * contact_limit}
```

If Yes, call `search_import_to_campaign` (alias: `search_export_to_campaign`) with `people_filters_json = <filters.json as a JSON string>`. The 202 response is a job DTO - read `jobId` (camelCase), save it to configuration.json as `ken_search_export_id`, set `sync_status.ken_search_imported = true`, then poll `search_export_status(job_id=<jobId>)` - the 202 is not a success signal.

### Step 10: Sync / Update / Delete existing campaign

Entered from Step 2 when configuration.json has a non-null `campaign_id`. Four sub-modes by user intent:

1. **Targeted update** ("update segment X's rewriting prompt", "rename segment 3") - follow [`references/update-recipes.md`](references/update-recipes.md) for the exact MCP call. Skip the diff flow.
2. **Sync the whole plan** ("sync", "push my changes", "update the campaign") - run the diff flow below.
3. **Delete** ("delete segment X", "remove this campaign") - follow [`references/delete-cascades.md`](references/delete-cascades.md). The `0 - default` segment is NEVER deleted; the backend auto-recreates it.
4. **Rollback / restore** ("roll back", "restore the copy before round 2") - run the rollback flow below.

#### Sync flow

1. **Diff.** Re-validate + re-parse the plan folder (Step 1), then compare against configuration.json and the live platform state (`api_campaign_manage get`, `api_campaign_segment_manage list`, `api_email_sequence_manage get` per segment, `api_prompt_library_manage get_by_campaign`, `api_redirect_link_manage get_by_campaign`). Classify per resource: campaign settings (changed fields), qualification (content may have changed), segments (create / bind_existing / update / delete), and per segment: redirect links (+/-), sequence (content changed), AI variables (reconcile desired names vs deployed), rewriting prompt (noop/create/update/delete).

2. **Render the summary** (every time, never skip):
   ```
   ## Sync Summary (Campaign ID {id})

   **Campaign**: {noop | update - changes: {...}}
   **Qualification prompt**: {noop | create | content_may_have_changed (id {X})}
   **Segments**: create [{folder}...] / update [{folder}...] / delete [{folder}...]
   **Per-segment resources**: {folder}: links {action}, sequence {action}, variables reconcile ({N} desired / {M} deployed), rewriting {action}
   ```

3. **Confirm.** `[Yes/No]` - UNLESS deleting the whole campaign, which requires typing the campaign name exactly (see delete-cascades.md). Capture a one-line **round note** (e.g. "client feedback: shorten email 1") - it labels the version snapshots.

4. **Apply** in this order:
   1. Campaign updates (`api_campaign_manage update` with `auto_sync_schedule=True` for schedule fields).
   2. Qualification prompt (update-recipes §2).
   3. Segment binds + creates (bind `isDefault=true` for `0 - default`; create per Step 5).
   4. Segment updates (name/description; default keeps its name).
   5. Per-segment resource updates **with versioning** (update-recipes §8): before-snapshot when live has drifted (`list_versions` -> `save_new_version` of current live), apply the edit (links create/delete, sequence update preserving step ids, `api_ai_variables_save` full-list reconcile + re-apply per-prompt `to_rewrite`, rewriting prompt), then after-snapshot from live state (never from local copies - local bodies still hold `{{tracking_link:url_N}}` placeholders).
   6. Deletes last, in cascade order (delete-cascades.md): sequence -> AI variables -> rewriting prompt -> redirect links -> segment.

5. **Write results** into configuration.json: updated ids, `per_segment[<folder>].versions`, ONE appended `version_log` entry (round = prev max + 1, the note, version numbers), and remove deleted paths.

6. **Report** per segment, list new version numbers, note any errors, print the configuration.json path.

**Retry semantics**: the diff flow is safe to re-run - configuration.json reflects what landed, so the next diff shows only remaining work. Failures mid-cascade: stop that cascade, record partial state, report which step failed. No automatic retries.

#### Rollback flow

Restore a resource (or a whole segment-round) to a prior version. Full recipes in update-recipes.md §8c-8d.

1. **Resolve target** from the request + configuration.json's `version_log` (maps round numbers/notes to version numbers per segment).
2. **List history**: `list_versions` for the target resource(s); render version number, createdAt, author, isRevert, round note, and the `data.live` drift flag.
3. **Confirm** `[Yes/No]` on the chosen version - call out that live will be overwritten; offer a before-snapshot if `data.live` shows drift.
4. **Revert**: whole round - `api_campaign_segment_manage(operation="revert_version", ...)` (cascades to sequence + prompt bundle; inspect `data.cascade`, fall back to single-resource reverts for any child reporting `NoBaselineYet` / `EvictedByRetention` / `ChildNewerThanTarget`). Single resource - that resource's own `revert_version`.
5. **Verify + record**: re-run `list_versions` (revert row is latest, no drift), append a `version_log` entry, update `per_segment[<folder>].versions`.

## Error Handling

Brief summary (full details in [`references/error-recovery.md`](references/error-recovery.md)):

| Error | Action |
|-------|--------|
| Validation errors | Auto-fix loop; if still failing, report to user, stop. |
| MCP unavailable / auth error | Ask the user to (re)connect via `/mcp`. Never curl. |
| Campaign creation fails | Report error, stop. No partial config to save. |
| Qualification push fails | Update configuration.json, offer retry. |
| Segment creation fails | Update configuration.json, report which segments failed, offer retry. |
| Per-segment push fails | Record what landed, continue other segments, report at end. |

On retry, re-validate the plan folder, read existing ids from configuration.json, and skip completed resources (list-before-create everywhere).

## Related platform tools (recent features)

Not part of the default create flow. Full params in `../../reference/platform-capabilities.md`.

- **Duplicate a campaign** - `api_campaign_duplicate(campaign_id=<src>, new_name=..., include_leads=False)` clones the full config into a fresh Draft. Faster than re-pushing a plan for a near-identical campaign.
- **Email-sequence variant active toggle** - variants toggle active/inactive per step (`isActive`); deactivate rather than delete to stop sending a variant. At least one active version must remain per step.
- **Version history + drift** - segments, sequences, and prompt bundles support `save_new_version*` / `list_versions` / `get_version` / `revert_version`; `list_versions` reports live drift. `create`/`update` and the per-flow `*_save` tools mutate live WITHOUT a version row.
- **Per-sender signature** - `api_inbox_signature_manage(operation="set"/"set_bulk", ...)` sets each mailbox's HTML signature (double-brace sender tokens are the documented default in signature HTML specifically; sequence copy uses single-brace `{sender_*}`).

## Reference Files

Loaded only when needed:
- [`references/parser-contract.md`](references/parser-contract.md) - Single source of truth for plan folder format + the Step 1 validation rules. Upstream skills link here.
- [`references/update-recipes.md`](references/update-recipes.md) - Per-resource update recipes. Load for Step 10 sync or targeted updates.
- [`references/delete-cascades.md`](references/delete-cascades.md) - Ordered delete flows + safety gates. Load for the delete path.
- [`references/html-serializer.md`](references/html-serializer.md) - HTML conversion rules for Step 6.2 (REQUIRED before pushing sequences) + retrofitting recipe.
- [`references/campaign-status-enums.md`](references/campaign-status-enums.md) - Canonical CampaignStatus enum + lifecycle.
- [`references/enums.md`](references/enums.md) - All numeric enum values. Load on backend validation errors.
- [`references/configuration-schema.md`](references/configuration-schema.md) - Full configuration.json shape.
- [`references/error-recovery.md`](references/error-recovery.md) - Full error table + partial failure recovery.
- [`references/configuration-guide.md`](references/configuration-guide.md) - Background guide (workflow concepts, cost optimization, troubleshooting).
