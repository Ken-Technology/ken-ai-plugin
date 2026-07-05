# Error Recovery Reference

Loaded when handling partial failures, retries, or backend validation errors.

## Error Handling

| Error | Action |
|-------|--------|
| Ken AI MCP not available | Ask the user to connect the ken-ai MCP server (run `/mcp`, complete the OAuth flow). Never fall back to curl, raw HTTP, or pasted API keys |
| Ken AI MCP health check fails | Report error, ask the user to reconnect via `/mcp`; if it persists, the server side may be down |
| Auth error (401/403) mid-flow | OAuth session expired - ask the user to re-authorize via `/mcp`, then re-run only the failed step |
| Missing required file | Stop with specific skill to run (e.g., "campaign-strategy") |
| No Ken client ID | Resolve via `api_client_manage(operation="list")` and user confirmation; store as `client_id` in configuration.json |
| Campaign creation fails | Report error, stop. No partial config to save |
| KenSearch import fails (sync error on `search_import_to_campaign` / `search_export_to_campaign`) | Campaign created; save partial config, offer retry |
| KenSearch import 202 then async failure | The 202 response is NOT success - poll `search_export_status(job_id=<jobId>)`. Treat `polling.status == "failed"` (or `"unknown"` for >60s) as failure; surface `polling.error_message`, then check the original 202 body's `imported`/`failed` counts and the campaign's contact lists before retrying so duplicates are not re-imported. |
| Qualification prompt fails | Campaign created; save partial config, offer retry |
| Segment creation fails | Save partial config, report which segments failed |
| Segmentation prompt fails | Save partial config, report which prompts failed |
| Email sequence push fails | Save partial config, report which segment failed |
| AI variables save fails | Save partial config, report which segment failed |
| to_rewrite flag update fails | Non-fatal for the push, but the campaign is not rewriting-ready - re-run the per-prompt updates for that segment before enabling workflow 3 |
| Redirect link creation fails | Save partial config, report which links failed |
| prompts.md parse error | Report which section failed to parse, ask user to fix format |
| Campaign already exists | Check Ken AI for current state, offer update vs recreate |

### Partial Failure Recovery

configuration.json is the recovery journal - the skill updates it after every successful step, so a crash at any point leaves an accurate record of what landed.

If any step fails after campaign creation:
1. Update configuration.json with the IDs that DID land
2. Update sync_status to reflect what completed
3. On retry, skip already-created resources (check for non-null IDs; list-before-create everywhere)
4. To clean up partially created resources before retry, follow `references/delete-cascades.md` (ordered cascade: sequence -> AI variables -> rewriting prompt -> redirect links -> segment). Do not improvise delete order - orphaned children break the dashboard.

Never re-create a campaign when configuration.json already has a `campaign_id` - offer a sync, or an explicit delete per `references/delete-cascades.md`. A percentage-mode campaign created without `segmentation_mode=3` cannot be flipped afterward: delete and recreate.

### Common Validation Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "name is required" | Missing campaign/prompt name | Provide name field (campaign updates always require the current name) |
| "client_id is required" | Missing client ID | Read `client_id` from configuration.json, or resolve via `api_client_manage(operation="list")` |
| "Invalid flow value" | Using string instead of number | Use 1, 2, 3, 4, or 5 instead of strings |
| "Invalid status value" | Using string instead of number, or out-of-range value | Use a CampaignStatus integer in 0-6 (0=Draft, 1=Building, 2=Ready, 3=Sending, 4=Paused, 5=Completed, 6=Error). See `references/campaign-status-enums.md`. Never pass `status` to `api_campaign_manage` - use `api_campaign_lifecycle` |
| "All segments must use A/B test segmentation before launch" | Percentage-mode campaign not created with `segmentation_mode=3`, or arm weights don't sum to 100 | segmentation_mode is create-time-only: delete and recreate the campaign in A/B mode, then ensure every arm (Default included) has `ab_test_percentage` and the weights sum to exactly 100 |
| "Email sequence already exists for this segment" | Attempted a blind create on a segment whose sequence exists (segments auto-create an empty sequence) | GET the sequence first and update it in place - `api_email_sequence_manage` handles this when you follow get-then-update |
| "prompt_text is required" | Empty prompt content | Ensure prompt text is not empty |
