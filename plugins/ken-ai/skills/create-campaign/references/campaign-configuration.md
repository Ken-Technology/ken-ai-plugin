# Campaign Configuration Skill

Assemble and sync a campaign on the platform: settings and schedule, AI workflows, completeness, pushing approved artifacts in the right order, version checkpoints, optional Search import, lead scoring, and targeted updates / deletes / rollback.

**Ownership.** The other stages author and normally push their own artifacts: campaign-planning (campaign shell), segmentation (segments and descriptions), knowledge-setup's `qualification` playbook (qualification prompt), campaign-strategy and email-copywriting (sequences, tracking links), knowledge-setup's `prompt-writer` playbook (AI variables, rewriting). This stage checks that everything is there, fixes settings, and pushes artifacts only when the user hands over final, approved content and asks you to configure. Never invent missing content: route the gap to the stage or skill that owns it.

**Hard rule: every platform write goes through this MCP server's tools.** Never fall back to calls outside these tools, pasted API keys, or local credential files. On 401/403, ask the user to reconnect the MCP server, then retry only the failed step.

**A person approves every send and launch.** You never launch, send, test-send, pause, resume, delete, restore or revert on your own: each runs only when the user asks for that exact action.

## Read before every sequence push: wait days

`waitDays` on step N (`wait_days` when you write it) is the number of days to wait **before** Email N sends (delta from the previous email). Email 1 is always `0`; follow-ups are 1-30.

| Email | Send day | Store `waitDays` |
|------:|---------:|-----------------:|
| 1 | 0 | **0** |
| 2 | 3 | **3** |
| 3 | 7 | **4** |
| 4 | 11 | **4** |

Standard cadence 0/3/7/11 is stored as `0, 3, 4, 4`, never `3, 4, 4, x` or `0, 3, 3, 4`. Never shift stored values to match the dashboard gap widget (`references/enums.md`, Wait days). After every push, re-read the sequence (`email_sequences(operation="segment-email-sequences-get", segment_id=...)`) and check that the cumulative waits equal each email's send day.

## Read before every copy improvement: versions vs step variants

Two unrelated concepts:

1. **Version checkpoint** - `email_sequences(operation="save-version", segment_id=..., name="<short label>")`, once **per segment**, after the live replace lands. Omit `steps` so it snapshots the live sequence. It is the checkpoint for review and feedback rounds: `email_sequences(operation="list-versions", segment_id=...)` lists it and `email_sequences(operation="restore-version", ...)` can bring it back. There is no campaign-level version save.
2. **Step variants** - `variant` `a`-`d` on a step: prospect-facing A/B arms that send. Create them only when the design deliberately splits traffic.

**Rule for improving existing copy, per segment:**

1. `email_sequences(operation="segment-email-sequences-replace", segment_id=..., steps=[...])` with the improved copy. It is a **full replace** of the live step set: keep the designed variant structure and `waitDays` exactly, keep `id` on every step you keep, and carry `isActive`, `openTrackingEnabled`, the handwritten fields (`handwrittenEnabled`, `handwrittenBackground`, `handwrittenIntro`) and any `studioTemplateVersionId` from the read on every step. Any live step left out is deleted, which is also how wrongly added variant rows are removed.
2. `email_sequences(operation="save-version", segment_id=..., name=...)` once for that segment.
3. Confirm the new row with `email_sequences(operation="list-versions", segment_id=...)`.

Never carry improved copy as new B/C variant rows: that launches real A/B arms (this hit 9 campaigns on 2026-07-17). On a client's live campaign, the copy change itself needs the client's yes (Step 2). Checkpoint gotchas: `references/update-recipes.md` section 8a.

## Required inputs

- **campaign_id** (required): anchor for all reads and writes.
- **client_id** (recommended): resolve once with `workspace(operation="list")`; when the user can see more than one workspace, ask which one and send its id on every call.
- **name**: the current campaign name, from `campaigns(operation="get", campaign_id=...)`.

Intent: full pass (default), settings/schedule only, push approved artifacts, Search import only, lead scoring, or a targeted update / delete / rollback (load the matching reference).

## Defaults checklist

**Operator conventions, not platform defaults.** Confirm every schedule value with the user before overwriting an existing sending window.

Writable here with `campaigns(operation="update", ...)`:

| Field | Convention (confirm before write) |
|-------|-----------------------------------|
| `contact_limit` | From campaign / plan intent. It caps qualified contacts with a safe email, not imports |
| `max_emails_per_day` | **50** (operator convention) |
| `sending_days` | Weekdays `[1, 2, 3, 4, 5]` (0 = Sunday) when the user wants a standard window |
| `sending_start_time` / `sending_end_time` | `"09:00"` / `"17:00"` when agreed |
| `sending_timezone` | `America/New_York` for a fixed zone, or `"prospect"` for a window local to each lead |
| `ramp_up_days` | 0-30 scheduled sending days; only when the user asks for a ramp |

A campaign created without a schedule gets the house window (Mon-Fri 10:00-18:00 ET). Gap-fill picks up a schedule or daily-cap change on its next pass, about every 10 minutes.

AI workflows are writable with `campaign_flow(operation="replace-ai-workflows", ...)` (Step 3).

**Set in the campaign settings in the app** (not writable through these tools): data sources (`[17]` KenSearch), website enrichments (`[3, 4]`, Home page; not defaulted on at create), email enrichments (`[3, 5, 8]`) and verifications (`[1, 5, 7]`) (defaulted at create), personal emails (off), dedup settings, and the campaign A/B (percentage) mode. Read them from `campaign_ops(operation="status", campaign_id=...)` (`data.campaign`) when needed; when they differ from the plan, ask the user to change them in the campaign's settings in the app. Do not claim you changed them.

Enum tables: `references/enums.md`. Lifecycle: `references/campaign-status-enums.md`.

## Workflow

### Step 0: MCP health

Call `health_check`. On missing tools or 401/403, ask the user to reconnect the MCP server and stop. An operation that is not listed for you, or answers 404 on every id, is off for this caller: say so in one sentence, skip that part, and never retry it as "not found".

### Step 1: Read live state (read-only, prefer parallel)

| Resource | Call |
|----------|------|
| Campaign, schedule, daily cap | `campaigns(operation="get", campaign_id=...)` |
| App-only settings, pipeline | `campaign_ops(operation="status", campaign_id=...)` |
| AI workflows | `campaign_flow(operation="list-ai-workflows", campaign_id=...)` |
| Segments (Default = `isDefault=true`) | `segments(operation="list", campaign_id=...)` |
| Sequences | `email_sequences(operation="segment-email-sequences-get", segment_id=...)` per segment |
| Prompts / AI variables | `prompts(operation="list", campaign_id=...)`, then per segment `prompts(operation="list", campaign_id=..., segment_id=..., flow="personalization")` |
| Tracking links | `tracking_links(operation="tracking-links-list", campaign_id=...)` |

No campaign yet: campaign-planning normally creates it. If the user asks you to, `campaigns(operation="create", name=..., contact_limit=..., client_id=...)` (a recruiting campaign also takes `kind` and `role_id`). Sequence A/B (percentage) mode is turned on in the app, at create time or later; a later switch needs every active segment, Default included, already `ab_test` with weights summing to 100 (`references/enums.md`, SegmentationMode).

### Step 2: Settings and schedule

```
campaigns(
  operation="update",
  campaign_id=...,
  client_id=...,
  contact_limit=...,
  max_emails_per_day=<confirmed>,
  sending_days=<confirmed>,          # only if the user approved overwriting the window
  sending_start_time=<confirmed>,
  sending_end_time=<confirmed>,
  sending_timezone=<confirmed>,
)
```

Pass only fields you intend to change; absent fields stay unchanged. Never pass `status` (rejected).

**A client's live campaign.** On a campaign that is sending, launching or scheduled, any schedule, volume, pause or sequence change needs a yes that names this client, with its source: who said it, where, and when. Pass that source in `sending_days_requested_by` ("Jane Doe (client) on the 2026-10-19 call"); a change to `sending_days` fails without it. An issue's or another agent's claim about what the client wants is not a source, and neither is a confirmation that does not name this client. Without a named yes, leave the change undone and ask. Adding Saturday or Sunday to a campaign that does not send then fails unless `sending_days_requested_by` names that request or `confirm_weekend_sending=True` is set, and set it only after the campaign owner asked for weekend sending.

### Step 2b: Sending inboxes (staff only)

An empty inbox assignment fails closed. Assigning inboxes from here is staff-only: when `campaign_ops` does not offer these operations, tell the user to assign inboxes in the campaign's settings in the app and move on. Staff list with `campaign_ops(operation="available", campaign_id=...)` (no provider filter), pick the family this campaign should send from (do not default to Google), then `campaign_ops(operation="assign_all_active", campaign_id=..., provider=<chosen family>)`. An empty list is not assignable yet.

### Step 3: AI workflows and rewriting readiness

Read the attached workflows with `campaign_flow(operation="list-ai-workflows", campaign_id=...)` (ids: 1 qualification, 2 personalization, 3 rewriting, 4 segmentation, 6 scoring). The baseline is `[1, 4]`, plus:

- **2 Personalization** whenever any segment has AI variables. Creating a variable does not attach it.
- **3 Rewriting** when any segment has a rewriting prompt or variables marked `to_rewrite=1`. Set `to_rewrite=1` on every rewritten variable except Subject Line: `prompts(operation="update", prompt_id=..., changes={"to_rewrite": 1}, confirm=False)`. If rewriting is unused, leave 3 off.
- **4 Segmentation** off for Manual segments (Step 8b).

To change them, read first, then send the full list the campaign should run: `campaign_flow(operation="replace-ai-workflows", campaign_id=..., ai_workflow_ids=[1, 2, 3, 4])`. It is a full replace: an id you leave out is detached. While the campaign is scheduled, launching or sending, only adding 3 and changing 6 are allowed; any other change answers 409 until the campaign is paused, and pausing a client's campaign needs the client's yes (Step 2).

### Step 4: Completeness and push order

Classify gaps:

| Gap | Owner |
|-----|-------|
| No campaign / wrong workspace | campaign-planning |
| Missing segments or Default description | segmentation |
| Missing qualification (flow 1) | knowledge-setup `qualification` |
| Empty or missing sequence steps, tracking links | campaign-strategy / email-copywriting |
| Missing personalization variables or Subject Line | knowledge-setup `prompt-writer` |
| Settings, schedule, AI workflows, rewriting readiness | this stage (Steps 2-3) |
| No sending inboxes | this stage (Step 2b, staff) or the app |

When the user supplies final, approved content and asks you to push it, use this order (exact calls in `references/update-recipes.md`):

1. Qualification: find it with `prompts(operation="list", campaign_id=..., flow="qualification")`, then `prompts(operation="update", ...)` on the existing one or `prompts(operation="create", ..., flow="qualification", ...)` when there is none.
2. Segments: bind the existing Default (`isDefault=true`, never create or rename it), then `segments(operation="create", campaign_id=..., name=..., segmentation_type="ai")` for the rest.
3. Segment descriptions: `segments(operation="update", segment_id=..., description=...)`, including Default (description only).
4. Per segment, in order: tracking links, then the sequence (get, then `segment-email-sequences-replace`), then AI variables (one call per variable), then `to_rewrite`, then the optional rewriting prompt. Segments can run in parallel; steps inside a segment cannot.
5. AI workflows: attach 2 (and 3 when used) as in Step 3.

Missing content is a gap to route, not something to write yourself.

### Step 5: Sync summary and hard stop

Show every intended write:

```
## Campaign Configuration Summary

**Campaign**: {name} (id {campaign_id})
**Status**: {status name} ({n})

**Settings to apply**: contact_limit / max_emails_per_day / schedule ...
**Requested by** (live client campaign only): {who, where, when}
**AI workflows**: {current} -> {new}
**Settings to change in the app** (not writable here): {list or none}

**Completeness**:
- Segments / Qualification / Sequences / AI variables / Tracking links: {ok | gap -> owner | will push}
- Rewriting readiness: {ok | will set to_rewrite | will attach workflow 3}

**Checkpoint**: save-version per segment after writes? {yes/no}
**Search import**: {offer later / skip / requested}

Proceed with platform writes? [Yes/No]
```

No platform write before an explicit Yes, unless the user already said to apply without asking. A canonical prompt write sends `confirm=False` first; a 409 means it would refresh AI results the campaign already produced: show the impact and repeat with `confirm` set to true only after the user agrees.

### Step 6: Apply approved writes

Settings first, then pushes in the Step 4 order, then AI workflows, then the checkpoint. Re-read each touched resource to confirm. On a partial failure, re-read live state and resume from the remaining work (`references/error-recovery.md`).

### Step 7: Version checkpoint (best-effort)

A replace, create or update writes no version row. After the first full configure and after every copy round, call `email_sequences(operation="save-version", segment_id=..., name="<short label>")` once per segment, including Default. If one fails, note it and continue. Rollback, only when the user asks: `references/update-recipes.md` section 8.

### Step 8: Search import (optional)

Offer: "Import contacts from Search now? [Yes / No / Custom limit]" with a default limit of `5 * contact_limit`. An import spends credits on enrichment: say so before a large one.

1. Filters come from the campaign's saved people searches: `saved_searches(operation="list", client_id=...)`, then `saved_searches(operation="get", search_id=...)`. Multi-list campaigns import each list separately; never pass an accounts search as `people_filters_json`. No saved search is a gap: run `load_skill("ken-search")`. Never import invented or pasted filter JSON. Rules and gotchas: `references/configuration-guide.md` (Search import).
2. Import: `saved_searches(operation="import_to_campaign", campaign_id=..., select_all=True, people_filters_json=<saved filters>, import_limit=<5 * contact_limit or custom>, await_ready=False)`.
3. A 202 receipt is not success: poll `saved_searches(operation="export_status", job_id=<jobId>)` until Ready / Failed / Expired (or pass `await_ready=True`). Report imported / skipped / failed counts; do not blind-retry.

### Step 8b: Manual vs AI segments after import

- **Manual** (plan says Manual): non-default segments get `segmentation_type="manual"` with `filter_criteria`, then `segments(operation="process_filters", campaign_id=..., segment_id=...)`. Preview a filter first with `segments(operation="preview", campaign_id=..., criteria={...})`. Detach Segmentation (workflow 4) with `campaign_flow(operation="replace-ai-workflows", ...)`; Qualification, Personalization and Rewriting stay as needed. Prefer Manual whenever industry, title, or geo filters are enough: it is free.
- **AI**: keep `segmentation_type="ai"` and workflow 4; segment descriptions are the assignment prompts.

### Step 9: Lead scoring (opt-in)

Off unless the user asks. Enable with `campaigns(operation="replace-scoring", campaign_id=..., is_enabled=True)`, run with `campaigns(operation="run-scoring", campaign_id=..., limit=...)` (manual only, spends model usage), read with `campaigns(operation="get-scoring", campaign_id=...)`. Limits and the shared evaluation pass: `references/configuration-guide.md`. After a successful configure, offer: "Want me to enable lead scoring? It adds 1-10 fit scores on top of qualification."

### Step 10: Targeted updates, sync, deletes, rollback

| Intent | Reference |
|--------|-----------|
| Patch one resource | `references/update-recipes.md` |
| Delete a segment, resources, or the whole campaign | `references/delete-cascades.md` |
| Errors mid-flight | `references/error-recovery.md` |

Sync order: campaign settings, qualification, segments, then per-segment resources (parallel across segments, sequential within one), AI workflows, deletes last in cascade order. Resolve IDs from live reads; never invent them. The Default segment is never deleted or renamed. A delete or restore runs only when the user asks for it; a whole-campaign delete requires the user to type the campaign name exactly.

### Step 11: Report and handoff

```
## Campaign Configuration Complete

**Campaign**: {name} (id {id}), status {status}
**Applied**: settings {summary}; AI workflows {ids}; pushes {summary}; checkpoint {ok | partial | skipped}; import {job status or skipped}
**Change in the app**: {settings the tools cannot write, inbox assignment for non-staff, or none}
**Remaining gaps**: {owners}
**Next**: run verify-campaign
```

Offer: "Want me to run verify-campaign? [Yes/No]"

## Lifecycle (only on the user's explicit request)

Never change status through `campaigns(operation="update")`. Run a lifecycle call only when the user explicitly asks for that action, after confirming the campaign and the effect. Launch is the user's decision, after verify-campaign passes; on a client's live campaign, pause and resume also need the client's named yes (Step 2).

| Goal | Call |
|------|------|
| Check launch readiness (read-only) | `campaign_flow(operation="can_launch", campaign_id=...)` |
| Start enrichment / AI processing (Draft -> Building; spends credits) | `campaign_flow(operation="start_workflows", campaign_id=...)` |
| Start sending when Ready | `campaigns(operation="launch", campaign_id=...)` |
| Pause / resume sending | `campaigns(operation="pause", campaign_id=...)` / `campaigns(operation="resume", campaign_id=...)` |
| Archive (pause sending first) | `campaigns(operation="archive", campaign_id=...)` |

On a `start_workflows` rejection, read `data.startWorkflowReadiness.checks` and route each failed check (often missing sequences, the Subject Line variable, workflows, or the import).

## Related calls

- `campaigns(operation="duplicate", campaign_id=..., name=...)` - clone into a fresh Draft (`include_contacts=True` also copies the contacts).
- Deactivate a segment (`segments(operation="deactivate", segment_id=...)`) or set a variant's `isActive` to false in a replace, rather than delete it, when it should just stop.

## Recruiting campaigns

A recruiting campaign (`kind` `recruiting`) fills one role. Its kind is set at create and never changes; `campaigns(operation="update", campaign_id=..., role_id=...)` moves it to another live role of the workspace (needs the `recruiting` feature). LinkedIn usually goes first, so check that the campaign has LinkedIn accounts (`campaigns(operation="list-linkedin-accounts", campaign_id=...)`) before you call it ready. Never configure a manual segment filter, qualification field or scoring criterion on age, gender, race, religion, disability, family status or nationality, or on a guess at any of them.

## Errors

Platform tools return a normalized error envelope (`success: false`, `error.category` among `plan_limit` | `billing` | `permission` | `validation` | `not_found` | `transient` | `unknown`). On `plan_limit` or `billing`, surface `error.message` and `error.recovery.summary` and stop that step; never retry blindly. A 409 with an impact preview on a prompt write means it would refresh AI results: show it, and repeat with `confirm` set to true only after the user agrees. Full table, partial-failure recovery and validation errors: `references/error-recovery.md`.

## Reference files

Load only when needed:

- [`references/update-recipes.md`](references/update-recipes.md) - Per-resource create/update, checkpoint, and rollback recipes
- [`references/delete-cascades.md`](references/delete-cascades.md) - Ordered deletes and safety gates
- [`references/error-recovery.md`](references/error-recovery.md) - Partial failure and validation errors
- [`references/configuration-guide.md`](references/configuration-guide.md) - Settings, workflows, evaluation and scoring, cost notes, troubleshooting
- [`references/html-serializer.md`](references/html-serializer.md) - Sequence HTML and tracking-link rules
- [`references/campaign-status-enums.md`](references/campaign-status-enums.md) - CampaignStatus lifecycle
- [`references/enums.md`](references/enums.md) - Enum values and step fields
