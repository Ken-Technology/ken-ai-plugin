# ken-ai - Campaign Creation Plugin for Claude Code

End-to-end cold-email campaign creation on the [Ken AI platform](https://app.getken.ai), packaged as a Claude Code plugin. Plan a campaign, build the prospect targeting, write and review the copy, generate AI personalization prompts, and push everything to Ken AI - all through the ken-ai MCP server's OAuth session. No API keys to paste, no local scripts, no `.env`.

## Install

```
/plugin marketplace add Ken-Technology/ken-ai-plugin
/plugin install ken-ai@ken-ai-plugin
```

The plugin bundles the ken-ai MCP server (`https://mcp.getken.ai/ken-ai`). On first use your MCP client opens a browser OAuth flow: create an API key at app.getken.ai - Settings - API Keys, paste it once, done. If you already have the ken-ai server connected at user level, both entries point at the same server - you can remove the user-level one or keep both.

## Prerequisites

- A Ken AI account with at least one client/workspace
- An API key (created during the OAuth flow above)

## Usage

Start here:

```
/ken-ai:new-campaign [client name]
```

This sets up a campaign workspace (default `./ken-campaigns/{client-slug}/`), confirms the Ken client, gathers research, and runs the full pipeline:

```
campaign-planning (orchestrator)
├── ken-search          -> filters.json        (KenSearch targeting, 280M+ contacts)
├── qualification       -> qualification.md    (AI qualification prompt)
├── segmentation        -> segmentation.md     (segments + folders)
├── per segment (parallel):
│   ├── campaign-strategy   -> strategy.md
│   ├── email-copywriting   -> emails.md
│   ├── email-review        -> emails_v2.md    (loops until score >= 4.5)
│   └── prompt-writer       -> prompts.md      (AI personalization prompts)
└── campaign-configuration                     (pushes everything to Ken AI via MCP,
                                                with a hard approval stop first)
```

Supporting skills you can also invoke directly: `website-scraping` (scrape a client site into the workspace), `client-research` (synthesize sources into `research.md`), `lead-magnet` (offer ideation), `verify-campaign` (44-point post-push check).

Other commands:

```
/ken-ai:campaign-status <id|name|path>    # enrichment pipeline stats
/ken-ai:export-campaign <id|name|path>    # export contacts to CSV
```

## Workspace layout

Everything lives in a per-client workspace folder (no repo required):

```
./ken-campaigns/{client-slug}/
├── research.md              # client research (client-research skill or your own)
├── notes.md                 # optional client preferences
├── research/website/        # scraped site content (website-scraping skill)
└── {mm-dd} - plan {n}/      # one folder per campaign
    ├── plan.md              # the campaign plan (H1 = Ken campaign name)
    ├── filters.json         # KenSearch filters
    ├── qualification.md     # qualification criteria
    ├── segmentation.md      # segment definitions
    ├── configuration.json   # state file - campaign/segment IDs, versions, sync status
    ├── 0 - default/         # default segment: strategy.md, emails_v2.md, prompts.md
    └── 1 - {segment}/       # one folder per segment
```

`configuration.json` is written incrementally during the push and doubles as the recovery journal - re-running campaign-configuration after a failure skips what already landed.

## Safety model

- **Nothing is pushed without approval.** campaign-configuration shows a full summary and hard-stops for a Yes before the first platform write.
- **Campaigns are created in Draft.** Starting AI workflows and launching sending are explicit, separate lifecycle steps.
- **All writes go through MCP tools** under your OAuth session - the plugin never asks for an API key in chat and never calls the API over raw HTTP.

## Troubleshooting

| Problem | Fix |
|---|---|
| Tools missing / 401 / 403 | Run `/mcp`, select ken-ai, complete (or redo) the OAuth flow |
| `health_check` fails | Server-side issue - check with the Ken AI team |
| Push failed partway | Re-run campaign-configuration on the same plan folder - configuration.json knows what landed |
| Campaign misconfigured | Run the verify-campaign skill - it checks 44+ points against the live platform |
