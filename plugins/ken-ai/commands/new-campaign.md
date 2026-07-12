---
description: Start a new Ken AI cold-email campaign - sets up the client workspace, gathers context, and runs the full planning-to-configuration pipeline.
---

# New Campaign

Entry point for the Ken AI campaign-creation workflow. Sets up the client workspace, confirms the Ken client, gathers research context, then hands off to the `campaign-planning` skill (which orchestrates targeting, qualification, segmentation, per-segment strategy/copy/review/prompts, and finally `campaign-configuration`).

## Arguments

- `$ARGUMENTS` - optional: client name or slug, and/or a website URL, and/or a workspace path. All can also be gathered interactively.

## Execution

### Step 1: Verify the Ken AI MCP connection

Call `health_check`. If the tool is missing or returns an auth error:
- Tell the user to connect the ken-ai MCP server: run `/mcp`, select `ken-ai`, and complete the browser OAuth flow (create an API key at ken.so - Settings - API Keys, paste it once).
- Stop until the connection works. Never ask for an API key in chat and never fall back to raw HTTP.

### Step 2: Pick the Ken client

1. Call `api_client_manage(operation="list")`.
2. If `$ARGUMENTS` names a client, match it (case-insensitive); otherwise show the list and ask.
3. Confirm the choice with the user. Derive `client_slug` = lowercase-hyphen of the client name (`re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")`).
4. Carry `client_id`, `client_name`, `client_slug` forward - campaign-configuration stores them in `configuration.json`.

If the user is planning for a client that doesn't exist on the platform yet, ask them to create it in the Ken AI dashboard first (or proceed in draft-only mode: plan files can be authored now and pushed once the client exists).

### Step 3: Set up the workspace

1. Default workspace: `./ken-campaigns/{client_slug}/` under the current directory. Confirm or let the user override.
2. Create it if missing.
3. Create the plan folder inside it: `{workspace}/{mm-dd} - plan {n}/` (mm-dd = today, n = auto-increment by checking existing folders).

### Step 4: Gather client context

In priority order:
1. **Files the user provided** in the conversation (briefs, transcripts, research docs).
2. **`{workspace}/research.md`** if it exists.
3. If neither exists, offer:
   - Run the `website-scraping` skill on the client's website (saves to `{workspace}/research/website/`), then
   - Run the `client-research` skill to synthesize everything into `{workspace}/research.md`.
   A campaign plan without client research is weak - push for at least a short brief before planning.

### Step 5: Run the pipeline

Invoke the `campaign-planning` skill with:
- The plan folder path
- The workspace path
- `client_id` / `client_name` / `client_slug`
- Execution mode: ask the user - **auto** (segments run as parallel subagents, no pauses) or **approval** (pause between stages).

campaign-planning drives the rest: ken-search -> qualification -> segmentation -> per-segment (campaign-strategy -> email-copywriting -> email-review loop -> prompt-writer) -> campaign-configuration (which asks for final approval before any platform write).

### Step 6: After configuration

Point the user at the follow-ups:
- `/ken-ai:campaign-status {campaign_id}` - enrichment pipeline stats
- verify-campaign skill - 44-point configuration check
- `/ken-ai:export-campaign {campaign_id}` - export contacts to CSV
