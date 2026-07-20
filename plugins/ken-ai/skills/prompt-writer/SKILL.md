---
name: prompt-writer
description: Generate AI personalization prompts for cold email campaigns. Reads AI variables from campaign strategy and outputs detailed prompts for Ken AI. Use when the workflow needs personalization prompts after campaign strategy is complete, or when manually creating prompts for an existing campaign. Triggers on requests like "write prompts for this campaign", "generate personalization prompts", or when invoked by the campaign-planning workflow.
model: sonnet
thinking: true
---

# This skill has moved to the Ken MCP

This workflow now lives in the Ken MCP server and no longer runs from this
plugin. The plugin version you are reading is a deprecation shim and receives
no updates.

**To run it now:**

1. Make sure the `ken-ai` MCP server is connected (this plugin already bundles
   it: `https://mcp.getken.ai/ken-ai/mcp` - your client opens a browser OAuth
   flow; create an API key at app.ken.so under Settings - API Keys).
2. Call `load_skill("prompt-writer")` on the ken-ai MCP server and follow the
   returned skill body. Reference docs are served as MCP resources
   (`skill://ken-ai/prompt-writer/...`); `list_skills()` shows everything available.

Nothing else in this file is current. Do not follow any cached or historical
version of this skill's workflow - the MCP-served skill is the only
maintained version.
