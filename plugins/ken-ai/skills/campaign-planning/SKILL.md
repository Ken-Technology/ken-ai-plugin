---
name: campaign-planning
description: Create comprehensive campaign plans for cold email outreach. A campaign plan is 1 broad ICP + 1 offer + multiple segments that divide the list into sub-ICP groups for more relevant messaging. Use when starting a new campaign planning cycle or when the user wants to plan segments. Triggers on requests like "plan campaigns for [client]", "create a campaign plan", "what campaigns should we test", or when referenced by the campaign-planning command.
model: opus
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
2. Call `load_skill("campaign-planning")` on the ken-ai MCP server and follow the
   returned skill body. Reference docs are served as MCP resources
   (`skill://ken-ai/campaign-planning/...`); `list_skills()` shows everything available.

Nothing else in this file is current. Do not follow any cached or historical
version of this skill's workflow - the MCP-served skill is the only
maintained version.
