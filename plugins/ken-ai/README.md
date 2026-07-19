# ken-ai (DEPRECATED)

**This plugin is retired.** All Ken AI agent workflows are served natively by the Ken MCP server. This version ships only deprecation shims plus the bundled MCP server config, and receives no updates.

## What to use instead

Connect the Ken MCP server in any MCP client (Claude, ChatGPT, Cursor, Gemini, Grok, Manus):

```
https://mcp.getken.ai/ken-ai/mcp
```

On first use your client opens a browser OAuth flow - create an API key at [app.ken.so](https://app.ken.so) under Settings - API Keys and paste it once. Then:

- `list_skills()` shows every workflow the MCP serves.
- `load_skill("<name>")` returns the skill body and its reference resources.
- The typed `api_campaign_status` and `api_campaign_export` tools replace the old `/ken-ai:campaign-status` and `/ken-ai:export-campaign` commands (the former raw-SQL flows are removed - they required database credentials client principals do not have).

Or follow the in-app guide at [app.ken.so](https://app.ken.so) under Settings - Integrations - AI Agents.

The bundled MCP server config in this plugin (`.mcp.json` and `.codex-plugin/mcp.json`) already points at `https://mcp.getken.ai/ken-ai/mcp` - that is the one artifact here that keeps working value.
