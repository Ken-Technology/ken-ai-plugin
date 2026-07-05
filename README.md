# ken-ai-plugin

Claude Code plugin marketplace for the [Ken AI platform](https://app.getken.ai). Ships the **ken-ai** plugin: an end-to-end cold-email campaign-creation workflow (planning, KenSearch targeting, copywriting with a review loop, AI personalization prompts, and a pure-MCP configuration push) plus the `/ken-ai:new-campaign`, `/ken-ai:campaign-status`, and `/ken-ai:export-campaign` commands.

## Install

```
/plugin marketplace add Ken-Technology/ken-ai-plugin
/plugin install ken-ai@ken-ai-plugin
```

The plugin bundles the `ken-ai` MCP server (`https://mcp.getken.ai/ken-ai`). On first use your MCP client opens a browser OAuth flow - create an API key at app.getken.ai - Settings - API Keys, paste it once, and you're done. No `.env`, no local scripts, no pasted keys in chat.

## What's here

```
.claude-plugin/marketplace.json   # marketplace manifest (this repo)
plugins/ken-ai/                    # the ken-ai plugin
├── .claude-plugin/plugin.json     # plugin manifest
├── .mcp.json                      # bundled ken-ai MCP server
├── commands/                      # /ken-ai:new-campaign, campaign-status, export-campaign
├── skills/                        # campaign-planning, ken-search, copywriting, ... (13 skills)
├── reference/                     # platform-capabilities
└── README.md                      # full usage, workspace layout, safety model
```

See [`plugins/ken-ai/README.md`](plugins/ken-ai/README.md) for the full workflow, workspace layout, and troubleshooting.
