# ken-ai-plugin

Plugin marketplace for the [Ken AI platform](https://ken.so), for **Claude Code and OpenAI Codex CLI**. Ships the **ken-ai** plugin: an end-to-end cold-email campaign-creation workflow (planning, KenSearch targeting, copywriting with a review loop, AI personalization prompts, and a pure-MCP configuration push) plus the `/ken-ai:new-campaign`, `/ken-ai:campaign-status`, and `/ken-ai:export-campaign` commands. The same skills and commands run on both runtimes - see [Cross-runtime support](#cross-runtime-support).

## Install (Claude Code)

```
/plugin marketplace add Ken-Technology/ken-ai-plugin
/plugin install ken-ai@ken-ai-plugin
```

## Install (Codex CLI)

```
codex plugin add https://github.com/Ken-Technology/ken-ai-plugin
```

Point `codex plugin add` at the repo (or a local checkout path); Codex loads the plugin from `plugins/ken-ai`. The plugin's `.codex-plugin/` manifest wires up the skills, the three commands, and the ken-ai MCP server. Verify with `/plugins` in Codex.

The plugin bundles the `ken-ai` MCP server (`https://mcp.getken.ai/ken-ai/mcp`). On first use your MCP client opens a browser OAuth flow - create an API key at ken.so - Settings - API Keys, paste it once, and you're done. No `.env`, no local scripts, no pasted keys in chat.

## What's here

```
.claude-plugin/marketplace.json   # Claude Code marketplace manifest (this repo)
plugins/ken-ai/                    # the ken-ai plugin
├── .claude-plugin/plugin.json     # Claude Code plugin manifest
├── .codex-plugin/                 # Codex CLI plugin manifest + MCP config
│   ├── plugin.json
│   └── mcp.json                   # ken-ai MCP server, Codex format
├── .mcp.json                      # bundled ken-ai MCP server (Claude Code format)
├── commands/                      # /ken-ai:new-campaign, campaign-status, export-campaign
├── skills/                        # campaign-planning, ken-search, copywriting, ... (13 skills)
├── reference/                     # platform-capabilities
└── README.md                      # full usage, workspace layout, safety model
```

## Cross-runtime support

Skills, commands, and reference docs are **shared** across both runtimes - there is one source of truth. Each runtime loads it through its own manifest:

- **Claude Code** reads `.claude-plugin/plugin.json` + `.mcp.json` (auto-discovers `skills/` and `commands/`).
- **Codex CLI** reads `.codex-plugin/plugin.json`, which points at `skills/` and `.codex-plugin/mcp.json` (and auto-discovers `commands/`).

Skill content avoids runtime-specific assumptions: reference links are relative paths, and subagent steps are written as plain "dispatch a subagent" actions that each runtime maps to its own mechanism (Claude Code's `Task`, Codex's `spawn_agent`).

See [`plugins/ken-ai/README.md`](plugins/ken-ai/README.md) for the full workflow, workspace layout, and troubleshooting.
