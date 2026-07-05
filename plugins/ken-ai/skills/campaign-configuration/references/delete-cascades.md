# Delete Cascades

Loaded when removing resources from an already-configured campaign. Each flow gives the ordered MCP calls, what must be deleted from the local `configuration.json`, and the confirmation gate that must pass before any destructive call.

## Confirmation gates (required, non-skippable)

| Scope | Gate |
|-------|------|
| Single resource (one prompt, one redirect link) | `[Yes/No]` on a summary row. |
| Segment + its resources (cascade) | `[Yes/No]` on the full cascade preview. Show every child ID that will be deleted. |
| **Entire campaign** | The user must **type the campaign name exactly**. No shortcut, no `--force` bypass, no "yes" answer accepted. |

Do not prompt for a gate with `AskUserQuestion` only - print the full summary table in plain text first, then prompt. The user must see what's about to be deleted before choosing.

## Soft-delete vs hard-delete

- `api_campaign_manage(operation="delete")` - **soft delete** (row retained, flagged). A soft-deleted campaign does not appear in lists but its children remain queryable by ID.
- `api_campaign_segment_manage(operation="delete")` - treat as soft-delete too. For a segment you want kept but not sending, prefer `operation="deactivate"` instead.
- `api_email_sequence_manage(operation="delete")` - **soft delete**.
- `api_prompt_library_manage(operation="delete")` - hard delete. **Still the right tool for all flow deletes** (1/2/3/4/5) - the per-flow save tools handle create/update only.
- `api_rewriting_prompt_save(instructions="")` - hard delete for a rewriting prompt (flow=3), convenience shortcut when you don't have the prompt_id handy.
- `api_redirect_link_manage(operation="delete")` - hard delete.
- `api_ai_variables_save` with a list that omits variable names - hard delete for those rows (via name reconciliation).

## Order of cascades (locked)

Always delete children before parents so dashboards and analytics don't see orphans mid-flight.

### Single segment cascade (non-default)

Given a segment folder `<folder>` with entries in `configuration.json.per_segment[<folder>]`:

1. **Email sequence** (disables any in-flight sends first):
   ```python
   api_email_sequence_manage(
       operation="delete",
       campaign_id=<campaign_id>,
       campaign_segment_id=<segment_id>,
   )
   ```
2. **AI personalization variables** - delete each flow=2 prompt scoped to this segment. `api_ai_variables_save` can't clear all variables at once (requires non-empty list), so use the prompt library:
   ```python
   for prompt_id in per_segment[<folder>].ai_variable_ids:
       api_prompt_library_manage(operation="delete", prompt_id=prompt_id)
   ```
3. **Rewriting prompt** (flow=3, per-segment):
   ```python
   if per_segment[<folder>].rewriting_prompt_id:
       api_prompt_library_manage(
           operation="delete",
           prompt_id=per_segment[<folder>].rewriting_prompt_id,
       )
   ```
4. **Redirect links** - delete each:
   ```python
   for link_id in per_segment[<folder>].redirect_link_ids:
       api_redirect_link_manage(operation="delete", link_id=link_id)
   ```
5. **Segment** itself:
   ```python
   api_campaign_segment_manage(
       operation="delete",
       segment_id=<segment_id>,
   )
   ```
6. **Local config** - remove these paths from configuration.json when updating it:
   - `per_segment.<folder>`
   - `segmentation.segments.<folder>`
   - `emailbison.campaign_ids.<folder>` (if present)

### Default segment cascade (`0 - default`)

Same child order (sequence → AI variables → rewriting prompt → redirect links). But **never delete the Default segment itself** (segment row at `per_segment["0 - default"]`, backend `isDefault=true`) - the platform auto-creates it and will re-create it if missing, leaving you with a dangling ID in your config. Instead, after deleting its children, reset its resources to empty via updates:

- `api_email_sequence_manage(operation="update", ...)` with an empty steps list (or the minimum stub the platform requires).
- Clear `per_segment.0 - default.ai_variable_ids`, `per_segment.0 - default.rewriting_prompt_id`, `per_segment.0 - default.redirect_link_ids`, `per_segment.0 - default.redirect_links` in configuration.json (replace with empty containers).

Only clear the Default segment if the user explicitly asks; otherwise leave it populated.

**Detection**: a segment is the default one when `per_segment[<folder>].is_default == true`, or equivalently when the folder name starts with `0 - `. The diff emits `action: "bind_existing"` (not `"create"`) for this slot when it's missing from configuration.json, and NEVER emits `action: "delete"` for it.

### Full campaign cascade

Requires the typed-campaign-name gate. Then:

1. For each non-default segment in `per_segment` (skip any with `is_default=true` or folder prefix `0 - `): run the **Single segment cascade** in full (steps 1-5 above).
2. Run the Default segment cascade's children (steps 1-4, skip the segment delete).
3. **Qualification prompt** (campaign-level, flow=1):
   ```python
   api_prompt_library_manage(
       operation="delete",
       prompt_id=<qualification_prompt_id>,
   )
   ```
4. **Campaign** itself:
   ```python
   api_campaign_manage(
       operation="delete",
       campaign_id=<campaign_id>,
   )
   ```
5. **Local config** - decide with the user:
   - **Preserve for audit**: leave `configuration.json` in place and add a `deleted_at` timestamp field plus a note.
   - **Wipe**: `rm <plan_folder>/configuration.json` (outside the skill - a filesystem delete, not a script call).

Default to preserve unless the user says wipe. A campaign delete is soft on the backend anyway, so the local config remains useful for recovery.

## Parallel ordering (if you batch deletes)

Within a single cascade, steps 1-4 can run in parallel - they target distinct resource types. Steps 1 and 5 must be sequential (the segment can't be deleted while its sequence is still live). For a full-campaign cascade, segment cascades can run in parallel across segments, but each cascade's internal order must hold.

If a step fails mid-cascade, stop that cascade and record the partial state in `configuration.json` (remove the IDs that WERE deleted). Report which step failed so the user can retry from a clean partial state.

## Refuse list

| Scenario | Response |
|----------|----------|
| Campaign delete without typed name | Refuse. Print "Type the campaign name exactly to confirm." |
| Delete request targeting the `0 - default` segment (the row itself, not its children) | Refuse. Print "The Default segment cannot be deleted; clear its children instead (see Default segment cascade)." |
| `configuration.json` missing required ID for the resource being deleted | Refuse. Print "No ID tracked locally for <resource>. Look up via MCP list/get_by_campaign, add to configuration.json, then retry." |
| Subagent returned non-empty `errors` in the previous run and `fully_synced` is false | Warn. Ask the user to confirm they want to delete mid-failed-sync state. |

## Writing deletions back to configuration.json

After the cascade, remove every deleted resource's ID from configuration.json in the same editing pass (nested keys under `per_segment.<folder>.*` and top-level fields alike).

Example results JSON after deleting segment `2 - healthcare-compliance`:
```json
{
  "deletions": [
    "per_segment.2 - healthcare-compliance",
    "segmentation.segments.2 - healthcare-compliance"
  ],
  "sync_status": {"fully_synced": false}
}
```

The deep merge preserves all other segments and top-level fields untouched.
