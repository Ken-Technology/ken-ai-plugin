# ken-ai-plugin

**DEPRECATED** - this plugin is retired. All Ken AI agent workflows are served natively by the Ken MCP server.

This repository is archived and receives no updates. The final published version ships only thin deprecation shims plus the bundled MCP server config.

## What to use instead

Connect the Ken MCP server in any MCP client (Claude, ChatGPT, Cursor, Gemini, Grok, Manus):

```
https://mcp.getken.ai/ken-ai/mcp
```

Your client opens a browser OAuth flow on first use - create an API key at [app.ken.so](https://app.ken.so) under Settings - API Keys and paste it once. Once connected, call `list_skills()` to see every workflow the MCP serves (campaign planning, targeting, copywriting, review, personalization, workspace setup, and infrastructure), and `load_skill("<name>")` to run one.

Or follow the in-app guide at [app.ken.so](https://app.ken.so) under Settings - Integrations - AI Agents.

## What this final version contains

- **Deprecation shims** - every skill and command now points you at the Ken MCP instead of running locally.
- **The bundled MCP server config** (`plugins/ken-ai/.mcp.json` and `plugins/ken-ai/.codex-plugin/mcp.json`) - this is the one part that keeps working value: it wires your client to `https://mcp.getken.ai/ken-ai/mcp`.

Nothing else here is maintained. Do not follow any cached or historical version of a skill or command in this repo - the MCP-served versions are the only maintained ones.

## Free, platform-independent skills

If you want the cold-email planning and writing skills with no Ken account, no MCP, and no API keys (files-only, MIT licensed), use the free open-source repo:

```
Ken-Technology/cold-email-skills
```

```bash
npx skills add Ken-Technology/cold-email-skills
```
