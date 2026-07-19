---
name: ken-search
description: Create KenSearch filters for the 280M+ Ken database, validate result count against desired contacts. Replaces list-building for search filter generation. Use when creating prospect search filters for a campaign, validating list size, or when campaign-planning dispatches targeting. Triggers on "create search filters", "ken search", "build prospect list", or when dispatched by campaign-planning.
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
2. Call `load_skill("ken-search")` on the ken-ai MCP server and follow the
   returned skill body. Reference docs are served as MCP resources
   (`skill://ken-ai/ken-search/...`); `list_skills()` shows everything available.

Nothing else in this file is current. Do not follow any cached or historical
version of this skill's workflow - the MCP-served skill is the only
maintained version.
