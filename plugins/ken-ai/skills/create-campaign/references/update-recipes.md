# Update Recipes

Loaded for pushes and targeted updates on a campaign. Each section gives the exact MCP call, preconditions, update-safe fields, and a post-verify step.

**Rule of thumb**: resolve every resource ID with a live read before any write. Never invent IDs. If a resource is missing, create it only where a recipe below says so and the user supplied approved content; otherwise route to the owning stage or skill.

**Resolve IDs (always):**

| Need | Live read |
|------|-----------|
| Campaign fields / name | `campaigns(operation="get", campaign_id=...)` |
| Segment ids (Default = `isDefault=true`) | `segments(operation="list", campaign_id=...)` |
| Sequence step ids | `email_sequences(operation="segment-email-sequences-get", segment_id=...)` |
| Qualification prompt | `prompts(operation="list", campaign_id=..., flow="qualification")` |
| AI variables of a segment | `prompts(operation="list", campaign_id=..., segment_id=..., flow="personalization")` |
| Rewriting prompt of a segment | `prompts(operation="list", campaign_id=..., segment_id=..., flow="rewriting")` |
| Attached AI workflows | `campaign_flow(operation="list-ai-workflows", campaign_id=...)` |
| Tracking links | `tracking_links(operation="tracking-links-list", campaign_id=...)` |

**Order of safety (least to most destructive):**
1. Campaign settings patch
2. Prompt text edits (qualification, rewriting, one AI variable)
3. Segment metadata (name, description, filter_criteria, ab_test_percentage)
4. Tracking link metadata (name, text_value, destination URL)
5. AI workflow list (a full replace: an id left out is detached)
6. Email sequence step replacement (a full replace: a step left out is deleted)

When a batch has both creates and updates, apply updates first so later creates see consistent state. Show a summary and get `[Yes/No]` before any write (stage body, Step 5).

**Prompt writes and `confirm`.** Every `prompts` create, update and delete takes `confirm`. Send `confirm=False` first. When the change would refresh AI results the campaign already produced, the call answers 409 with the impact instead of writing: show that impact to the user and repeat with `confirm` set to true only after they agree.

**A client's live campaign.** Any schedule, volume, pause or sequence change on a campaign that is scheduled, launching or sending needs a yes that names that client, with who said it, where and when (section 1).

---

## 1. Campaign

```python
campaigns(
    operation="update",
    campaign_id=<campaign_id>,
    # any of:
    name=<str>,
    contact_limit=<int>,
    sending_days=<int[]>,          # 0 = Sunday ... 6 = Saturday, non-empty
    sending_days_requested_by=<str>,   # who asked, where, when; required to change the days of a live campaign
    sending_start_time="09:00",
    sending_end_time="17:00",
    sending_timezone="America/New_York",   # or "prospect"
    max_emails_per_day=<int>,
    ramp_up_days=<int>,            # 0-30, only when asked
)
```

Absent fields stay unchanged. `status` is rejected: use the lifecycle calls in the stage body, and only on the user's explicit request. Gap-fill picks up a schedule or daily-cap change on its next pass, about every 10 minutes.

`sending_days_requested_by` carries the client's named yes: "Jane Doe (client) on the 2026-10-19 call". An issue's or another agent's claim is not a source. Without one, leave the change undone and ask. Adding Saturday or Sunday to a campaign that does not send then fails unless `sending_days_requested_by` names that request or `confirm_weekend_sending=True` is set, and set it only after the campaign owner asked for weekend sending.

Set in the campaign settings in the app (not writable here): data sources, enrichments, verifications, personal emails, dedup settings, website page selections, and the A/B (percentage) mode. Ask the user to change them there (link in the stage body).

### Post-verify
`campaigns(operation="get", campaign_id=<id>)` - confirm the changed fields.

---

## 2. Qualification prompt (flow 1, campaign-level)

Find the existing one first:

```python
prompts(operation="list", campaign_id=<campaign_id>, flow="qualification")
```

Update it when it exists (only the fields that change):

```python
prompts(
    operation="update",
    prompt_id=<qualification prompt id>,
    changes={
        "audience_description": <str>,
        "qualification_criteria": <str>,
        "disqualification_criteria": <str>,
    },
    confirm=False,
)
```

Create it when there is none:

```python
prompts(
    operation="create",
    campaign_id=<campaign_id>,
    flow="qualification",
    prompt_type="system",
    prompt="structured",           # the backend builds the prompt text from the three fields
    audience_description=<str>,
    qualification_criteria=<str>,
    disqualification_criteria=<str>,
    order=1,
    to_output=False,
    to_rewrite=0,
    confirm=False,
)
```

Always pass `flow` and `campaign_id` on create, so the prompt is bound to this campaign. Editing qualification invalidates earlier qualification results, so a live campaign usually answers 409 first: show the impact and repeat with `confirm` set to true only after the user agrees.

### Post-verify
`prompts(operation="get", prompt_id=<id>)` - the three structured fields match, `flow` is `qualification` and `campaignId` is the target campaign.

---

## 3. Segment (Default and non-default)

### Create (non-default only)
```python
segments(
    operation="create",
    campaign_id=<campaign_id>,
    name=<str>,
    segmentation_type="ai",      # manual | ai | ab_test
    description=<str>,           # optional
)
```
Creating a segment auto-creates its empty sequence. Never create a Default: bind the existing `isDefault=true` row.

### Update
```python
segments(
    operation="update",
    segment_id=<segment_id>,
    name=<new_name>,                 # optional; ignored on Default
    description=<new_description>,   # optional
    filter_criteria=<dict>,          # optional
    segmentation_type=<str>,         # optional: manual | ai | ab_test
    ab_test_percentage=<int>,        # optional, percentage-mode arm weight
    sort_order=<int>,                # optional
)
```
To clear the description pass `clear_description=True` (null alone does not clear). To clear an arm weight pass `clear_ab_test_percentage=True`. Preview a manual filter before you save it: `segments(operation="preview", campaign_id=..., criteria={...}, segment_id=<optional>)`.

**A/B weights**: in percentage mode every active arm, Default included, needs an `ab_test_percentage`, and they must sum to exactly 100 or launch fails. The user turns the campaign's A/B mode on in the app, at create time or later. A later switch is accepted only when every active segment, Default included, is already `ab_test` with a weight, the weights sum to 100, and no segment has manual filter criteria. Until the mode is on, `create` rejects `ab_test`; convert an existing segment with `update` and `segmentation_type="ab_test"` instead, after clearing its filters with `filter_criteria={}` in a separate call (deactivating a segment does not clear them).

**Default constraints**: cannot be renamed or deleted. Clear its children with `delete-cascades.md` instead.

### Post-verify
`segments(operation="get", segment_id=<id>)`.

---

## 4. Tracking link

Prefer a new link plus a sequence body update when a URL changes. Edit in place only for a rename or a `text_value` typo.

### Create (per segment; never share links across segments)
```python
tracking_links(
    operation="tracking-links-create",
    campaign_id=<campaign_id>,
    name=<str>,
    domain_name=<destination url>,
    text_value=<display text>,
)
```
Substitute the returned id into the body as `<a href="{{tracking_link:<id>}}">display</a>` (see `html-serializer.md`).

### Update
```python
tracking_links(
    operation="tracking-links-update",
    tracking_link_id=<link_id>,
    changes={"name": <str>, "domain_name": <url>, "text_value": <str>},  # only what changes
)
```

### Post-verify
`tracking_links(operation="tracking-links-get", tracking_link_id=<id>)`.

---

## 5. Email sequence (per segment)

### Preconditions
- Read the live sequence first. Replace creates the sequence when none exists, so there is no create-or-update branch.
- Write per segment with `segment-email-sequences-replace`, Default included. `email_sequences(operation="replace", campaign_id=..., steps=[...])` is the campaign-level sequence only.

### Full-replace recipe

The step array **replaces the set**: a step without `id` is created, a present `id` is updated, and a live step you leave out is deleted. The read and the write use the same shape, so send each kept step back as you read it and change only what the edit needs.

Carry these from the read on every step you send back: `isActive`, `openTrackingEnabled`, `handwrittenEnabled`, `handwrittenBackground`, `handwrittenIntro`, and `studioTemplateVersionId` when the step has one. A step sent without `openTrackingEnabled` turns open tracking off, without `handwrittenEnabled` turns the handwritten letter off, and without `studioTemplateVersionId` unpins its Studio template. A handwritten step's body above the `{sender_signature}` line or the unsubscribe link takes no links, and neither does `handwrittenIntro` (the save fails with 400); put links after the `{sender_signature}` line. A typed sign-off without `{sender_signature}` is part of the letter.

```python
current = email_sequences(operation="segment-email-sequences-get", segment_id=<segment_id>)
# read the live steps from the response

steps = [
    {
        "id": <existing step id>,      # omit for new steps
        "stepOrder": 1,
        "variant": "a",                # a-d; prospect-facing A/B arms that send
        "name": "Email 1",
        "subject": "{{Subject Line}}",
        "body": "<p>...</p>",          # HTML per html-serializer.md
        "bodyFormat": "plain",         # plain for copy you author; html only for full HTML emails (html_steps feature)
        "waitDays": 0,                 # days BEFORE this email; standard 0/3/4/4
        "isActive": True,              # carry from the read
        "openTrackingEnabled": <bool>, # carry from the read; a new step without it is off
        "handwrittenEnabled": <bool>,  # carry from the read, with handwrittenBackground and handwrittenIntro
        "handwrittenBackground": <str or None>,
        "handwrittenIntro": <str or None>,
    },
    # ... every step in final order
]

email_sequences(
    operation="segment-email-sequences-replace",
    segment_id=<segment_id>,
    steps=steps,
)
```

snake_case names (`step_order`, `wait_days`, `is_active`, `open_tracking_enabled`, ...) are accepted too. Keep the designed variant structure. Never add B/C rows to carry improved copy (stage body, versions vs step variants); after the replace, checkpoint with section 8a.

The response may carry `data.contentWarnings` (for example more than 2 distinct links in a cold step, or link text that reads as a web address). The save still succeeds: show the warnings to the user and fix them in the copy.

### Post-verify
Get the sequence again: count steps, spot-check `body`, check `waitDays` against the intended send days, and confirm `openTrackingEnabled` and `handwrittenEnabled` did not change.

---

## 6. AI personalization variables (flow 2, per segment)

One call per variable, never a bulk reconcile. Read the segment's set first:

```python
prompts(operation="list", campaign_id=<campaign_id>, segment_id=<segment_id>, flow="personalization")
```

New variable (no variable of that name on the segment):

```python
prompts(
    operation="create",
    campaign_id=<campaign_id>,
    segment_id=<segment_id>,
    flow="personalization",
    prompt_type="system",
    name="First Line",
    prompt=<prompt text>,
    order=<n>,                       # Subject Line is usually 1
    to_output=True,
    to_rewrite=0,                    # 1 for a variable the rewriting pass rewrites; never Subject Line
    fallback_if_empty=<optional>,
    is_required_for_sending=<optional>,
    confirm=False,
)
```

Existing variable (same name):

```python
prompts(operation="update", prompt_id=<id>, changes={"prompt": <prompt text>}, confirm=False)
```

Match names case-insensitively, and treat `Subject Line` and `subject_line` as the same variable: the copy resolves both to one tag, so never create the second. A variable you do not write stays as it is. Nothing is deleted unless you call `prompts(operation="delete", prompt_id=..., confirm=False)`, and only when the user asked to remove that variable.

Variables are per segment. Campaign-level variables are only a fallback for a segment with none of its own; they never merge. Every AI variable a segment's copy uses must exist on that segment.

To mark a variable for rewriting later: `prompts(operation="update", prompt_id=<id>, changes={"to_rewrite": 1}, confirm=False)`.

### Attach the workflows
Creating a variable does not attach Personalization. Read `campaign_flow(operation="list-ai-workflows", campaign_id=...)`; when 2 is missing, send the full list with 2 added: `campaign_flow(operation="replace-ai-workflows", campaign_id=..., ai_workflow_ids=[<current ids>, 2])`. Add 3 the same way when any variable has `to_rewrite=1` or the segment has a rewriting prompt. While the campaign is scheduled, launching or sending, only adding 3 and changing 6 are allowed.

### Side effects
- A changed prompt refreshes that variable's AI results, which is why the write can answer 409 with the impact first.

### Post-verify
`prompts(operation="list", campaign_id=..., segment_id=..., flow="personalization")`, then a sample with `prompts(operation="test", campaign_id=..., flow="personalization", segment_id=..., sample_size=5)` (spends model usage; needs prompt-test access).

---

## 7. Rewriting prompt (flow 3, per segment)

Find it with `prompts(operation="list", campaign_id=..., segment_id=..., flow="rewriting")`.

Create:
```python
prompts(
    operation="create",
    campaign_id=<campaign_id>,
    segment_id=<segment_id>,         # omit for a campaign-level rewriting prompt
    flow="rewriting",
    prompt_type="system",
    name="Rewriting",
    prompt=<instructions>,
    order=1,
    to_output=False,
    to_rewrite=0,
    confirm=False,
)
```

Change: `prompts(operation="update", prompt_id=<id>, changes={"prompt": <instructions>}, confirm=False)`. Clear: `prompts(operation="delete", prompt_id=<id>, confirm=False)`; the backend's default rewriting instructions then apply. Rewriting runs only while workflow 3 is attached (section 6).

### Post-verify
`prompts(operation="get", prompt_id=<id>)`.

---

## 8. Checkpoints and rollback

A replace, create or update writes **no** version row. Checkpoints are explicit; restores are forward-only (they restore a snapshot to live and append a new version). Run a restore only when the user asks for it.

### 8a. Checkpoint (per segment)
```python
email_sequences(operation="save-version", segment_id=<segment_id>, name="<short label>")
```
Once per segment, after the replace lands (live has resolved tracking-link ids). Omit `steps` so it snapshots the live sequence. It saves the email sequence only: AI variables and segment fields are not in it. There is no campaign-level version save. A failed checkpoint is not a failed edit: note it, continue, and retry it for that segment later.

The dashboard's version history lists segment versions, which this checkpoint does not write. When the user wants the round to show there, also call `segments(operation="save_new_version", campaign_id=<campaign_id>, segment_id=<segment_id>)` once for that segment. It queues a sequencer refresh, which is not free on a live campaign.

### 8b. Find versions
```python
email_sequences(operation="list-versions", segment_id=<segment_id>)
segments(operation="list-versions", segment_id=<segment_id>)
prompts(operation="prompt-versions-list", segment_id=<segment_id>)
```
Versions carry a number, timestamp, author and, on sequence versions, the `name` you gave. With Knowledge on, record each round (date, version label, what changed, why) in the `## Improvement log` of the campaign's Knowledge file `Campaign plan - <campaign name>` (find it with `knowledge(operation="list", tag="campaign-<campaign id>")`, then `knowledge(operation="update", file_id=..., base_version=..., body=...)`). Without Knowledge, keep the round notes in the chat and say they are not saved in the workspace.

### 8c. Roll back one sequence
```python
email_sequences(operation="restore-version", segment_id=<sid>, version_id=<vid>)
```
On a client's live campaign this is a sequence change: it needs the client's named yes.

### 8d. Roll back a segment or its prompts
```python
segments(operation="restore-version", segment_id=<sid>, version_id=<vid>, dry_run=True)   # preview the cascade
segments(operation="restore-version", segment_id=<sid>, version_id=<vid>, confirm=False)  # 409 shows the impact; confirm true only after the user agrees
prompts(operation="restore", segment_id=<sid>, version_id=<vid>, dry_run=True)            # then confirm=False, as above
```
A segment restore cascades to the sequence and prompt versions at or before that segment version. Segment versions come from `save_new_version` (8a), activating or deactivating the segment, and earlier restores, not from `save-version`.

### Post-verify (8a-8d)
List versions again: a new highest version exists, and after a restore the live resource matches the chosen snapshot.

---

## After any update batch

1. Re-read the touched resources to confirm.
2. Report ids and version numbers in chat.
3. Do not keep local recovery journals: the platform is the source of truth. On partial failure, re-list what exists and resume from the remaining work (`error-recovery.md`).
