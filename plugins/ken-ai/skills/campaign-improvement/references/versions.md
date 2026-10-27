# Versions, full replace and rollback

The detail behind Steps 5 and 6 of `campaign-improvement`. Everything here is per segment: a campaign's email copy lives in one sequence per segment, and versions are saved per segment.

## Wording edit or structural change

| Change | Kind | What you do |
|---|---|---|
| Shorter sentences, a clearer ask, a fixed typo, a new subject line on the same angle | Wording edit | Checkpoint, replace the changed step in the full list, checkpoint |
| A new angle, offer or call to action | Structural | Checkpoint, replace the whole sequence, save it as its own named version |
| Adding or removing a step, new wait days | Structural | Same as above |
| An A/B test the user asked for by name | Variant | Add one variant on the same step, testing one thing. Never for "improved" copy |

Improved copy never goes in as variant `b`, `c` or `d`: a variant is a live arm that keeps sending next to the old copy.

## The fields to carry on a full replace

`email_sequences(operation="segment-email-sequences-replace")` replaces the segment's whole sequence. The read (`segment-email-sequences-get`) returns camelCase fields, and the replace accepts camelCase or snake_case, so send each step back with these fields as you read them, changed only where the yes says:

| Field | Why it matters |
|---|---|
| `id` | Keeps the step as the same step. A step sent with no id is a new step. |
| `stepOrder` | The step's place in the sequence. |
| `variant` | `a` to `d`. Omitted means `a`. |
| `name`, `subject`, `body`, `bodyFormat` | The copy. `bodyFormat` omitted means `plain`. |
| `waitDays` | Days after the previous step. |
| `isActive` | A paused variant stays paused only if you send `false`. |
| `openTrackingEnabled` | Leave it as read. |
| `handwrittenEnabled`, `handwrittenBackground`, `handwrittenIntro` | A step sent without them turns its handwritten letter off. |
| `studioTemplateVersionId` | A step pinned to a Studio email keeps the pin only if you send it back. Left off, the step unpins and the response warns `studio_pin_removed`. |

A step you leave out of the list leaves the live sequence.

Example, changing only step 3's body on a three-step segment:

`email_sequences(operation="segment-email-sequences-replace", segment_id=7, steps=[{"id": 901, "stepOrder": 1, "variant": "a", "subject": "<step 1 subject as read>", "body": "<step 1 as read>", "bodyFormat": "plain", "waitDays": 0, "isActive": True, "openTrackingEnabled": False, "handwrittenEnabled": False}, {"id": 902, "stepOrder": 2, "variant": "a", "subject": "", "body": "<step 2 as read>", "bodyFormat": "plain", "waitDays": 3, "isActive": True, "openTrackingEnabled": False, "handwrittenEnabled": False}, {"id": 903, "stepOrder": 3, "variant": "a", "subject": "", "body": "<the approved new step 3>", "bodyFormat": "plain", "waitDays": 4, "isActive": True, "openTrackingEnabled": False, "handwrittenEnabled": False}])`

## What the replace can refuse or warn

- `contentWarnings` on the response lists content findings per step and variant (`link_count_exceeded` for more than 2 distinct links in a cold step, `link_host_mismatch` for link text that reads as a web address). The save still succeeds; tell the user each one.
- 400 `validation_failed` with `subject_required_for_migma`: the campaign sends through a provider that cannot thread a follow-up, so every step needs a subject. Nothing was written.
- 400 naming a step and variant with a handwritten letter: the letter part takes no links. Move the link after the signature line.
- `html_steps_disabled`: the workspace cannot send HTML steps. Keep the step `plain`.

## Checkpoints

- `email_sequences(operation="save-version", segment_id=7, name="Before step 3 rewrite")` snapshots the live sequence when you send no `steps`. Save one before the replace and one after.
- `name` is the label people see in the version list. Say what changed and why, in a few words.
- There is no campaign-level version save. Repeat per segment.

### The segment version (the app's version history)

The version history a person opens on a segment in the app lists segment versions, not sequence versions. To make a change show there, save a segment version after the second checkpoint:

`segments(operation="save_new_version", campaign_id=42, segment_id=7)`

It runs a real segment update, so it is not free on a live campaign. On an active segment of an A/B campaign that is scheduled, sending or paused, it fails when the segments' percentages do not add up to 100, and it refuses a non-manual segment that has saved filter criteria. Tell the user before you run it on a live campaign, and skip it when they do not need the change in the app's history: the sequence versions are enough to roll back.

## Rollback

- Sequence: `email_sequences(operation="list-versions", segment_id=7)` lists the versions newest first, and `email_sequences(operation="get-version", segment_id=7, version_id=55)` shows one. `email_sequences(operation="restore-version", segment_id=7, version_id=55)` puts it live. The history stays.
- Segment, with its sequence and prompts: `segments(operation="list-versions", segment_id=7)`, then `segments(operation="restore-version", segment_id=7, version_id=31, dry_run=True)` to preview what it restores. A restore that would clear AI output the campaign already wrote answers 409 with the impact: show it to the user, and repeat with `confirm` set to true only after their yes.
- Prompt: `prompts(operation="prompt-versions-list", segment_id=7)`, then `prompts(operation="restore", segment_id=7, version_id=12, dry_run=True)`, and `confirm` set to true after the yes.

After any restore, read the live sequence again and tell the user what is live now.
