# Error Recovery Reference

Loaded when handling partial failures, retries, or backend validation errors during campaign configuration (settings, AI workflows, pushes, checkpoints, import, targeted updates and deletes).

## Error handling

| Error | Action |
|-------|--------|
| MCP server not available | Ask the user to connect or re-authorize it. Never fall back to calls outside these tools or to pasted API keys. |
| Health check fails | Report the error; reconnect from the MCP client. If it persists, the server may be down. |
| Auth error (401/403) mid-flow | Session expired: re-authorize, then re-run only the failed step. A 403 `permission` on a write means the user's role cannot make it: say so and stop that step. |
| Operation not listed, or 404 on every id | The feature is off or staff-only for this caller. Say so in one sentence and send the user to the app for that part. Never retry it as "not found". |
| `plan_limit` or `billing` | Surface `error.message` and `error.recovery.summary` and stop that step; never retry blindly. |
| Campaign id unknown / not found | Resolve with `campaigns(operation="list", q=...)` and a user pick. Stop until confirmed. |
| No workspace id | Resolve with `workspace(operation="list")`; when the user can see more than one workspace, ask which one and send its id as `client_id`. |
| Settings / schedule update fails | Report the error body; do not invent values. Retry after the user confirms. |
| `sending_days` change refused on a live campaign | It needs `sending_days_requested_by`: a yes that names this client, with who, where and when. Ask for it; never fill it from an issue or another agent's claim. |
| Status change attempted via update | Wrong path: `status` is rejected. Lifecycle calls are in the stage body and run only on the user's request. |
| `start_workflows` rejected | Read `data.startWorkflowReadiness.checks`; route each failed check to the owning stage or a settings fix. |
| 409 with an impact preview on a prompt create, update, delete or restore | The write would refresh AI results the campaign already produced. Show the message and impact to the user, then repeat with `confirm` set to true only if they agree. |
| 409 on `replace-ai-workflows` | The campaign is scheduled, launching or sending: only adding 3 and changing 6 are allowed. Any other change waits for a pause, which on a client's campaign needs the client's named yes. |
| Import fails on `saved_searches(operation="import_to_campaign")` | Campaign and settings may already be fine; offer a careful retry (see below). |
| Import 202, then async failure | A 202 / Queued receipt is not success. Poll `saved_searches(operation="export_status", job_id=<jobId>, client_id=<clientId>)`. If the receipt was lost after a reload, recover it with `saved_searches(operation="export_status", campaign_id=<campaignId>, client_id=<clientId>)`. Treat `polling.status == "failed"` (or `"unknown"` for more than 60s) as failure and surface `polling.error_message`. Check imported / failed / skipped counts before any retry. |
| Checkpoint fails | Best-effort: note it and continue; re-run `email_sequences(operation="save-version", segment_id=...)` for that segment later. |
| Segment create / update fails | Report the segment name and id; offer a retry after a re-list confirms current state. |
| Sequence replace fails | Get the sequence, report which segment failed, retry the full replace from the fresh read. |
| One AI variable create / update fails | Report the segment and the variable name; re-list the segment's `personalization` prompts and retry only the missing or stale one. |
| `to_rewrite` update fails | The campaign is not rewriting-ready. Re-run the per-prompt updates before attaching workflow 3. |
| Tracking link create / update fails | Report the URL and name; offer a retry. |
| Delete mid-cascade fails | Stop that cascade; re-list the remaining children; report the failed step (`delete-cascades.md`). |
| Completeness gap (missing sequences, prompts, segments) | Do not invent content: route to the owning stage or skill (stage body, Step 4). |

## Partial failure recovery

The **platform** is the recovery journal.

1. Re-read live state: `campaigns(operation="get", ...)`, `segments(operation="list", ...)`, `email_sequences(operation="segment-email-sequences-get", ...)` per segment, `prompts(operation="list", campaign_id=...)`, `tracking_links(operation="tracking-links-list", campaign_id=...)`, `campaign_flow(operation="list-ai-workflows", campaign_id=...)`.
2. Classify what already matches the desired end state and what is still missing.
3. Retry only the remaining work (list before create, get before replace).
4. To clean up partially created resources first, follow `delete-cascades.md` (sequence, AI variables, rewriting prompt, tracking links, segment). Never improvise the delete order.

Never re-create a campaign that already exists for this work. A percentage-mode campaign created without A/B mode can still be switched: clear manual filter criteria on every segment, inactive ones included, with `segments(operation="update", segment_id=..., filter_criteria={})` in its own call; convert every active segment, Default included, to `ab_test` with `segments(operation="update", segment_id=..., segmentation_type="ab_test", ab_test_percentage=...)`, weights summing to 100; then ask the user to turn on A/B test segments in the app.

## Common validation errors

| Error | Cause | Fix |
|-------|-------|-----|
| "name is required" | Missing name on create | Pass the campaign name, or the variable name on a non-qualification prompt |
| `workspace_required` | Multi-workspace credential without `client_id` | Ask which workspace and retry with its `client_id` |
| Invalid flow | Wrong flow value | Use `qualification`, `personalization`, `rewriting`, `segmentation` or `scoring`. Tone of voice is not accepted on a new write |
| "campaign_id or segment_id is required" | Prompt create without a scope | Pass `campaign_id` (and `segment_id` for per-segment prompts) |
| Invalid status / status on update | Status sent through update | Lifecycle calls only; CampaignStatus is 0-7 (`campaign-status-enums.md`) |
| "All segments must use A/B test segmentation before launch" | An active segment is not `ab_test`, often when turning on A/B mode for an existing campaign | Convert every active segment, Default included, to `ab_test` with an `ab_test_percentage`, weights summing to 100 |
| "ai_workflow_ids must be a list of 1, 2, 3, 4, or 6" | A workflow id that cannot be attached (5) | Send only 1, 2, 3, 4 and 6 |
| 400 on a handwritten step | A link in the letter part or in `handwrittenIntro` | Move links below the `{sender_signature}` line |
| Empty prompt text | Missing content | Ensure non-empty prompt text |
| Unknown field | A field the operation does not accept | Drop it; check `describe_tools` for the operation's parameters |

## Import retry notes

- Check job status and campaign contact counts before re-running.
- Duplicates are skipped, but a retry still adds **new** matches.
- Default import limit: `5 * contact_limit`. Use filters from `saved_searches(operation="get")`, never invented JSON.
- Technology filters are retired. An import error naming technology criteria (400 `technology_filters_retired`) means the saved search still carries them: surface the message and ask before rebuilding it without them. Never strip them and retry silently.
