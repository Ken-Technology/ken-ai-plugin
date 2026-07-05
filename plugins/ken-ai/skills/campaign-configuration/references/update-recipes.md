# Update Recipes

Loaded when performing targeted updates on an already-configured campaign. Each section gives the exact MCP call, the preconditions, the update-safe fields, and a post-verify step.

**Rule of thumb**: Updates use the resource IDs stored in `<plan_folder>/configuration.json`. Never hit the backend without first reading that file and confirming the ID is non-null. If an ID is missing, fall through to the create path instead.

**Order of safety (least → most destructive)**:
1. Campaign settings patch (non-sending fields)
2. Prompt text edits (qualification, rewriting)
3. Segment metadata (name, description, filter_criteria)
4. Redirect link metadata (name, text_value, original_url)
5. AI variables reconcile (missing names get deleted)
6. Email sequence step replacement

When a sync run produces both creates and updates in the same batch, apply updates first so downstream creates see consistent state.

---

## 1. Campaign

### MCP-supported update
```python
api_campaign_manage(
    operation="update",
    campaign_id=<campaign_id>,
    # any of:
    name=<new_name>,
    status=<int>,                # CampaignStatus: 0=Draft, 1=Building, 2=Ready, 3=Sending, 4=Paused, 5=Completed, 6=Error. See references/campaign-status-enums.md.
    contact_limit=<int>,
    duplication_scope=<int|null>,
    allow_personal_emails=<bool>,
    campaign_data_sources=<int[]>,
    campaign_ai_workflows=<int[]>,
    campaign_data_enrichments=<int[]>,
    campaign_email_enrichments=<int[]>,
    campaign_email_verifications=<int[]>,
)
```
Only pass the fields you want to change.

### Schedule / EmailBison settings
Fields: `sending_days`, `sending_start_time`, `sending_end_time`, `sending_timezone`, `max_emails_per_day`, `campaign_website_page_selections`.

All are first-class `api_campaign_manage` parameters - update them directly (no HTTP fallback, ever):
```python
api_campaign_manage(operation="update", campaign_id=<id>, client_id=<client_id>,
                    name=<current name>,  # API requires name on update
                    sending_days=..., sending_start_time=..., sending_end_time=...,
                    sending_timezone=..., max_emails_per_day=...,
                    auto_sync_schedule=True)  # auto-syncs the EmailBison schedule after the update
```
A 400 mentioning "No EmailBison campaigns" from the schedule sync is benign pre-launch.

### Post-verify
`api_campaign_manage(operation="get", campaign_id=<id>)` - confirm changed fields are present.

---

## 2. Qualification prompt (flow=1, campaign-level)

### Preconditions
- `configuration.json` SHOULD have non-null `qualification_prompt_id`. If missing, the per-flow save tool auto-looks it up from the campaign - no manual lookup required.

### Update
```python
api_qualification_prompt_save(
    campaign_id=<campaign_id>,
    persona=<str>,              # was audience_description
    qualifiers=<str>,           # was qualification_criteria
    disqualifiers=<str>,        # was disqualification_criteria
    prompt_id=<qualification_prompt_id>,  # optional - auto-upserts from campaign if omitted
)
```

Why the per-flow tool: it always sends the correct `flow=1`, `promptType`, `name="Qualification"`, `toOutput=false`, `toRewrite=0`, `order=1`, and keeps the `campaignId` binding intact. The generic `api_prompt_library_manage(operation="update", ...)` is the soft-deprecated path and the footgun where omitting `flow` silently reset it to `0` and unbound the prompt from the campaign (dashboard UI went blank).

The backend still rebuilds the canonical prompt via `QualificationPromptTemplate` from the three structured fields - unchanged.

### Post-verify
`api_prompt_library_manage(operation="get", prompt_id=<id>)` - confirm the three structured fields match AND that `campaignId` in the response matches the target campaign. (Read-path still uses the generic tool.)

---

## 3. Segment (non-default and `0 - default`)

### Preconditions
- Any segment: `per_segment[<folder>].segment_id` non-null.
- If `per_segment["0 - default"].segment_id` is missing on an already-deployed campaign, look it up once via `api_campaign_segment_manage(operation="list", campaign_id=<id>)` and take the `isDefault=true` entry.

### Update
```python
api_campaign_segment_manage(
    operation="update",
    segment_id=<segment_id>,
    name=<new_name>,                 # optional, IGNORED on the `0 - default` segment (backend name stays "Default")
    description=<new_description>,   # optional
    filter_criteria=<dict>,          # optional
    ab_test_percentage=<int>,        # optional - the arm's weight in a percentage / sequence-A/B campaign
    sort_order=<int>,                # optional
)
```
**To clear description**: pass `clear_description=True` (null won't clear it).

**Sequence A/B weight changes**: when the plan is in `percentage` mode (`parsed.segmentation_mode == "percentage"`), push each arm's `ab_test_percentage` from the parsed segment on update - this is how a weight edit in segmentation.md reaches the backend (the diff's `update` list carries the full parsed segment, so no extra diffing is needed; the update is idempotent). **Push the Default's `ab_test_percentage` too** - in percentage mode the Default is one of the arms, the baseline/control (`segmentation_type=3`), whose weight is part of the sum-to-100; the parser emits it under `parsed["0 - default"].ab_test_percentage`. A/B-test arms are `segmentation_type=3` (AbTest); AI-mode segments are `segmentation_type=2` (AI) (enum: `1=Manual, 2=AI, 3=AbTest`). The campaign-level `segmentationMode` is AbTest and is set **at create time** (see SKILL.md Step 4) - do not re-send it on segment-weight updates. All weights (arms + Default) must sum to exactly 100 or launch/export 400s. To convert an arm back to a non-A/B segment, pass `clear_ab_test_percentage=True` (passing `null` won't clear it).

**Default segment constraints**:
- Cannot be renamed - the backend always displays it as "Default".
- Cannot be deleted - the backend auto-recreates it if removed; use the cascade in `delete-cascades.md` to reset its children (sequence, AI variables, redirect links) without touching the segment row itself.

### Post-verify
`api_campaign_segment_manage(operation="get", segment_id=<id>)`.

---

## 4. Redirect link

Redirect links are rarely edited in-place. The common pattern is "URL in a sequence changed" - which is handled by creating a new link and updating the sequence body, not by editing the existing link. Edit the link only when renaming for organization or fixing a typo in `text_value`.

### Preconditions
- `per_segment[<folder>].redirect_link_ids[]` has the ID (the default segment lives at `per_segment["0 - default"]` with the same shape).
- If you only have the URL, look up via `api_redirect_link_manage(operation="get_by_campaign", campaign_id=<id>)` and filter by `original_url`.

### Update
```python
api_redirect_link_manage(
    operation="update",
    link_id=<link_id>,
    name=<str>,             # optional - internal label
    original_url=<url>,     # optional
    variable_name=<str>,    # optional
    text_value=<str>,       # optional - display text rendered in the anchor tag
)
```

### Post-verify
`api_redirect_link_manage(operation="get", link_id=<id>)`.

---

## 5. Email sequence (per-segment and default)

### Preconditions
- `per_segment[<folder>].email_sequence_id` non-null (the default segment uses `per_segment["0 - default"].email_sequence_id`).
- For segment sequences, you must pass `campaign_segment_id` or you will hit the campaign-level row.

> **The controller is non-standard: `PUT` = create, `POST` = update.** Creating a segment auto-creates an empty sequence, so this update recipe is also what the *initial* push runs - `api_email_sequence_manage` GETs the sequence and updates it in place rather than blind-creating (a blind create 400s with "Email sequence already exists for this segment"). First-push and later syncs share these semantics. The MCP tool handles the controller's non-standard PUT/POST semantics internally.

### Generalized update recipe

Step arrays **replace the set**: steps without `id` are created, existing `id`s missing from the array are deleted, present `id`s are updated. Include `id` and `sequenceId` on every step you want to preserve.

```python
# 1. Fetch current sequence to learn step IDs
current = api_email_sequence_manage(
    operation="get",
    campaign_id=<campaign_id>,
    campaign_segment_id=<segment_id>,
)
sequence_id = current["data"]["id"]
existing_steps = current["data"]["steps"]

# 2. Build new steps array - for steps you want to keep or update, include id + sequenceId.
#    For new steps, omit id. To delete a step, leave it out entirely.
steps = [
    {
        "id": existing_step["id"],         # omit for new steps
        "sequenceId": sequence_id,          # required when id is present
        "stepOrder": step.stepOrder,
        "versionType": step.versionType,    # 1=A, 2=B, 3=C, 4=D
        "name": step.name,
        "subjectLine": step.subjectLine,
        "bodyContent": step.bodyContent,    # HTML, matches ken-frontend serializer
        "bodyFormat": 1,                    # always 1 (Plain) per enums.md
        "waitDays": step.waitDays,
    },
    # ... all steps in final desired order
]

# 3. Push the update
api_email_sequence_manage(
    operation="update",
    campaign_id=<campaign_id>,
    campaign_segment_id=<segment_id>,
    sequence_id=sequence_id,
    steps=steps,
)
```

### Body content source
Serialize the emails_v2.md bodies to HTML per `references/html-serializer.md`, with `{{tracking_link:url_N}}` placeholders for each unique URL, then resolve the placeholders to real IDs. For an update, substitute against the existing redirect link map in `configuration.json` instead of creating new links.

### When tracking link IDs change
If a URL in a body is new (not in `configuration.json`'s `redirect_links` map), create it first via `api_redirect_link_manage(operation="create", ...)`, append to `redirect_link_ids[]`, then substitute its ID into the body before the sequence update. See `references/html-serializer.md` for the retrofitting-specific variant of this recipe.

### Post-verify
Fetch the sequence again and count steps; spot-check one `bodyContent` for the expected changes.

---

## 6. AI personalization variables

### Preconditions
- `per_segment[<folder>].segment_id` non-null.
- Desired state: the full list of variables for that segment (names, prompt text, order).

### Update via reconcile
```python
api_ai_variables_save(
    campaign_id=<campaign_id>,
    segment_id=<segment_id>,
    variables=[
        {"name": "First Line", "prompt": "<prompt text>", "order": 1},
        {"name": "PS Line",    "prompt": "<prompt text>", "order": 2},
        # ... every variable the segment should have
    ],
    # model=<optional, only if changing the AI model for this segment>
)
```

**Reconcile semantics**:
- Names in the payload with an existing row: updated in place.
- Names not in the payload that previously existed: **deleted**.
- New names: created.
- The `variables` list must be non-empty. To remove every variable from a segment, you must delete each flow=2 prompt individually via `api_prompt_library_manage(operation="delete", prompt_id=...)`.

> **`to_rewrite` is NOT settable here.** The bulk save hard-codes `ToRewrite=0` for new variables and only *preserves* the existing value for same-name survivors (`SaveAiVariablesCommand`). To set the flag, update each prompt individually after saving: `api_prompt_library_manage(operation="update", prompt_id=<id>, flow=2, to_rewrite=1)` (or `POST /v1/prompt-library/{id}` with body `{"toRewrite":1}` - the controller only touches keys present in the body). The campaign-configuration skill does this on the initial push (Step 6) for every variable except `Subject Line`.

### Side effects (non-cosmetic)
- Personalization (flow=2) workflow is auto-enabled. **Rewriting (3) is NOT** - and re-saving variables will *disable* an already-enabled Rewriting workflow unless at least one surviving same-name variable still has `to_rewrite>0`. So set `to_rewrite` first (per-prompt), then enable workflow 3, and avoid a bulk re-save afterward.
- `AiPre*` statuses on existing contacts are cleared so personalization re-runs on the next AI pass.
- If `model` is passed, `AiFlowModelConfiguration` is updated.

### Ordering warning
If you also plan to edit the rewriting prompt (section 7), save variables FIRST - the variable save auto-syncs the rewriting workflow and can race with a subsequent rewriting prompt edit.

### Post-verify
Fetch the campaign's segment variables via the same endpoint (GET form) or list flow=2 prompts filtered by `campaign_segment_id`.

---

## 7. Rewriting prompt (flow=3, per-segment)

### Preconditions
- `per_segment[<folder>].rewriting_prompt_id` SHOULD be non-null. If missing, the per-flow save tool auto-looks it up from the campaign + segment - no manual lookup required.

### Create / update
```python
api_rewriting_prompt_save(
    campaign_id=<campaign_id>,
    instructions=<new_prompt_text>,
    campaign_segment_id=<segment_id>,             # omit for campaign-level rewriting prompts
    prompt_id=<rewriting_prompt_id>,              # optional - auto-upserts if omitted
)
```
Rewriting uses freeform `instructions` - no structured fields. Same tool handles create and update (auto-upsert).

### Delete via clear-out
Passing `instructions=""` deletes the existing rewriting prompt for that campaign + segment. Convenient when the user wants to fall back to `Constants.DefaultRewritingPrompt`. Don't confuse this with `api_prompt_library_manage(operation="delete", ...)` - both work, but the clear-out form doesn't need the prompt_id.

### Why the per-flow tool
It always sends `flow=3`, `promptType`, `name`, `toOutput`, `toRewrite`, `order` correctly. The generic `api_prompt_library_manage(operation="update", prompt_id=..., prompt_text=...)` path silently reset `flow` to `0` when omitted - the same footgun that unbound qualification prompts.

### Post-verify
`api_prompt_library_manage(operation="get", prompt_id=<id>)` - read path still uses the generic tool.

---

## 8. Versioning & rollback (sequences, prompt bundles, segments)

Version history is **opt-in** on the backend: `create` / `update` / the per-flow `*_save` tools
mutate the **live** working copy and write **no** version row. To capture a restorable snapshot
you must call `save_new_version` explicitly. Reverts are **forward-only** - `revert_version`
restores a snapshot to live AND writes a new (revert-flagged) version; history is never destroyed.

Three version-capable tools, all segment-scoped:

| Resource | Tool | `save_new_version*` | `revert_version` |
|---|---|---|---|
| Email sequence | `api_email_sequence_manage` | `save_new_version` (needs `campaign_segment_id` + `steps`) | `revert_version` |
| Prompt bundle (all prompts + AI vars for a campaign+segment) | `api_prompt_bundle_manage` | `save_new_version_from_prompts` / `save_new_version_from_variables` | `revert_version` |
| Segment | `api_campaign_segment_manage` | `save_new_version` (payload optional → snapshots live) | `revert_version` |

> There is **no server-side label** on a version - only number, timestamp, author, `isRevert`.
> The human-facing round note lives in `configuration.json.version_log` (see configuration-schema.md).

### 8a. Before-snapshot (capture the pre-edit live state, drift-conditional)

Run this **before** applying a feedback edit to a resource, so the client-approved copy stays
restorable. Skip it when the live copy already equals the latest version (no need to duplicate a row).

```python
# 1. Check drift. page_index=0 enriches the response with a `data.live` block.
hist = api_email_sequence_manage(operation="list_versions", campaign_id=cid,
                                 campaign_segment_id=sid, page_index=0)
live = hist["data"].get("live") or {}
needs_before = (not hist["data"].get("items")) or live.get("hasDrifted", True)

# 2. Only snapshot if there's something new to capture.
if needs_before:
    current = api_email_sequence_manage(operation="get", campaign_id=cid, campaign_segment_id=sid)
    api_email_sequence_manage(operation="save_new_version", campaign_id=cid,
                              campaign_segment_id=sid, steps=current["data"]["steps"])
```

Prompt bundle equivalent: `api_prompt_bundle_manage(operation="list_versions", ...)`, then if drifted
`save_new_version_from_prompts(prompts=<live prompt library for the segment>)`. Segment equivalent:
`api_campaign_segment_manage(operation="list_versions", ...)`, then if drifted
`save_new_version` with **no payload** (the backend snapshots the live segment as-is).

### 8b. After-snapshot (always, sourced from live)

Run this **after** the edit lands. Source the payload from the now-live state (GET first) rather
than the parsed plan - the parsed copy still has `{{tracking_link:url_N}}` placeholders, whereas
live has the resolved IDs, so a live-sourced snapshot is faithful to what actually sends.

```python
# Sequence
current = api_email_sequence_manage(operation="get", campaign_id=cid, campaign_segment_id=sid)
res = api_email_sequence_manage(operation="save_new_version", campaign_id=cid,
                                campaign_segment_id=sid, steps=current["data"]["steps"])
seq_version = res["data"]["versionNumber"]   # record in configuration.json

# Prompt bundle (full fidelity): source the live prompts for this segment
prompts = api_prompt_library_manage(operation="list", campaign_id=cid, campaign_segment_id=sid)["data"]
res = api_prompt_bundle_manage(operation="save_new_version_from_prompts", campaign_id=cid,
                               segment_id=sid, prompts=prompts)
bundle_version = res["data"]["versionNumber"]
# Lighter fallback when you only changed AI vars:
#   api_prompt_bundle_manage(operation="save_new_version_from_variables", campaign_id=cid,
#                            segment_id=sid, variables=<the list you just saved>)

# Segment (payload omitted → snapshots live)
res = api_campaign_segment_manage(operation="save_new_version", campaign_id=cid, segment_id=sid)
seg_version = res["data"]["versionNumber"]
```

Record `{sequence, prompt_bundle, segment}` version numbers under `per_segment[<folder>].versions`
and append a `version_log` round entry (note + per-segment versions). See configuration-schema.md.

### 8c. Rollback - whole round (segment-cascade revert)

Reverting a **segment** version cascades: the backend also reverts that segment's sequence and
prompt bundle to the child version that existed **at-or-before** the segment version's timestamp.
This is the one-call "undo round N" - and it works precisely because 8a/8b kept child versions in
step with segment versions.

```python
res = api_campaign_segment_manage(operation="revert_version", campaign_id=cid,
                                  segment_id=sid, version_id=<chosen segment version id>)
# res["data"]["cascade"] lists each child (EmailSequence / PromptBundle) with a status:
#   Reverted | NoBaselineYet | EvictedByRetention | ChildNewerThanTarget
```

Check the `cascade` array - a child reported as `NoBaselineYet` / `EvictedByRetention` /
`ChildNewerThanTarget` was NOT reverted; fall back to a single-resource revert (8d) for it.

### 8d. Rollback - single resource

When only one resource should move (e.g. revert just the sequence, leave prompts alone):

```python
api_email_sequence_manage(operation="revert_version", campaign_id=cid,
                          campaign_segment_id=sid, version_id=<version id>)
api_prompt_bundle_manage(operation="revert_version", campaign_id=cid,
                         segment_id=sid, version_id=<version id>)
```

### Post-verify (8a-8d)
Re-run `list_versions` and confirm: the new (highest) version row is present, `data.live.hasDrifted`
is false (live now matches the latest version), and for reverts the new row's `isRevert` is true.
Append the revert to `version_log` with a note like `"revert round 3 → round 1"`.

---

## Writing results back to configuration.json

After any update batch, merge the updated IDs into `{plan_folder}/configuration.json` under the appropriate path (`per_segment.<folder>.<field>` for any segment including `0 - default`, or top-level fields). Edit the file in place - preserve every field you did not touch.

For updates that create new IDs (e.g. a new redirect link), append to the list in `redirect_link_ids[]` and add the new URL → ID mapping in `redirect_links{}`. For updates that change an ID (rare - usually re-creates), just overwrite.

For updates that remove entries locally (e.g. a URL no longer used), delete those keys from configuration.json in the same editing pass - see `references/configuration-schema.md` for the shape.
