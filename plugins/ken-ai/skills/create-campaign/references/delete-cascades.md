# Delete Cascades

Loaded when removing resources from a configured campaign. Each flow gives the ordered MCP calls, how to discover IDs from live reads, and the confirmation gate that must pass before any destructive call. Run a delete only on the user's explicit request.

## Confirmation gates (required, non-skippable)

| Scope | Gate |
|-------|------|
| Single resource (one prompt, one tracking link) | `[Yes/No]` on a summary row. |
| Segment and its resources (cascade) | `[Yes/No]` on the full cascade preview. Show every child ID that will be deleted. |
| **Entire campaign** | The user must **type the campaign name exactly**. No shortcut, no force bypass, no bare "yes". |
| Anything on a client's live campaign (scheduled, launching or sending) | Also a yes that names that client, with who said it, where and when. Deleting a sequence there stops sends: it is a sequence change. |

Print the full summary table in plain text first, then ask. The user must see what will be deleted before choosing.

## Resolve IDs from the live platform (always)

```
campaigns(operation="get", campaign_id=...)
segments(operation="list", campaign_id=...)
prompts(operation="list", campaign_id=...)
tracking_links(operation="tracking-links-list", campaign_id=...)
# per segment:
email_sequences(operation="segment-email-sequences-get", segment_id=...)
prompts(operation="list", campaign_id=..., segment_id=..., flow="personalization")
prompts(operation="list", campaign_id=..., segment_id=..., flow="rewriting")
```

- Default segment: the row with `isDefault=true` (never delete this row).
- AI variables for a segment: `personalization` prompts with that `segmentId`.
- Rewriting prompt: the `rewriting` prompt with that `segmentId`.
- Qualification: the `qualification` prompt at campaign level (full-campaign cascade only).

If a required ID cannot be found, refuse the delete for that resource and say so.

## Soft vs hard delete

- `campaigns(operation="delete", campaign_id=...)` - **soft delete**. The campaign leaves lists; children may still be readable by ID.
- `segments(operation="delete", segment_id=...)` - treat as soft. To keep a segment but stop using it, prefer `segments(operation="deactivate", segment_id=...)`.
- `email_sequences(operation="segment-email-sequences-delete", segment_id=...)` - deletes a segment's sequence. `email_sequences(operation="delete", campaign_id=...)` is the campaign-level sequence only.
- `prompts(operation="delete", prompt_id=..., confirm=False)` - hard delete, right for every flow. A 409 with an impact preview means the delete would refresh cached AI results: show it and re-send with `confirm` set to true only after the user agrees.
- `tracking_links(operation="tracking-links-delete", tracking_link_id=...)` - hard delete.

AI variables are deleted one at a time, and only the ones the user asked to remove. A variable you leave alone stays.

## Order of cascades (locked)

Delete children before parents so dashboards and analytics never see orphans mid-flight.

### Single segment cascade (non-default)

1. **Email sequence** (stops in-flight sends first):
   ```python
   email_sequences(operation="segment-email-sequences-delete", segment_id=<segment_id>)
   ```
2. **AI variables** - delete each `personalization` prompt for this segment:
   ```python
   for prompt_id in personalization_prompt_ids_for_segment:
       prompts(operation="delete", prompt_id=prompt_id, confirm=False)
   ```
3. **Rewriting prompt** (per segment):
   ```python
   if rewriting_prompt_id:
       prompts(operation="delete", prompt_id=rewriting_prompt_id, confirm=False)
   ```
4. **Tracking links** used only by this segment's sequence:
   ```python
   for link_id in segment_link_ids:
       tracking_links(operation="tracking-links-delete", tracking_link_id=link_id)
   ```
5. **Segment**:
   ```python
   segments(operation="delete", segment_id=<segment_id>)
   ```
6. **Confirm** with a re-list: the segment, its prompts, and its links are gone.

### Default segment cascade (`isDefault=true`)

Same child order (sequence, AI variables, rewriting prompt, tracking links). **Never delete the Default row**: the platform re-creates it and leaves dangling references. After the children are gone, Default has no sequence until new approved copy is written with `email_sequences(operation="segment-email-sequences-replace", segment_id=..., steps=[...])`. Clear the Default's children only when the user explicitly asks.

### Full campaign cascade

Requires the typed-campaign-name gate (the exact current name from `campaigns(operation="get")`). On a campaign that is scheduled, launching or sending, the client's named yes from the gate table applies too. Then:

1. Run the single segment cascade (steps 1-5) for every non-default segment.
2. Run the Default cascade's children (steps 1-4, no segment delete).
3. **Qualification prompt**:
   ```python
   prompts(operation="delete", prompt_id=<qualification_prompt_id>, confirm=False)
   ```
4. **Campaign**:
   ```python
   campaigns(operation="delete", campaign_id=<campaign_id>)
   ```
5. **Confirm** with list/get. A soft delete may still be recoverable server-side. Keep a chat summary of deleted ids for audit.

With Knowledge on, the campaign's Knowledge file (`Campaign plan - <campaign name>`) stays: it is the record of what the campaign was. Delete it only when the user asks, in the app.

## Parallel ordering

Inside one cascade, steps 1-4 can run in parallel (distinct resource types); the segment delete waits for its sequence delete. Across segments, cascades can run in parallel, each keeping its internal order.

If a step fails, stop that cascade, re-list the remaining resources, and report which step failed so the user can retry from a clean partial state (`error-recovery.md`).

## Refuse list

| Scenario | Response |
|----------|----------|
| Campaign delete without the typed name | Refuse. "Type the campaign name exactly to confirm." |
| Delete targeting the Default segment row | Refuse. "The Default segment cannot be deleted; clear its children instead." |
| Required ID missing from live reads | Refuse. "No live ID for <resource>. Look it up first, then retry." |
| Delete on a client's live campaign without a yes that names the client | Refuse. Ask for the client's yes and its source. |
| A prior run left partial deletes | Warn. Show the remaining live inventory and ask before continuing. |
