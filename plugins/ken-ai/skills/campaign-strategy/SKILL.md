---
name: campaign-strategy
description: Create email campaign strategy for a single segment. Generates email sequence blueprints and AI personalization variables for one segment within a campaign plan. Receives a segment folder path and reads the segment's angle from the parent plan.md. Triggers on requests like 'create strategy for segment', or when dispatched by campaign-planning.
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
2. Call `load_skill("campaign-strategy")` on the ken-ai MCP server and follow the
   returned skill body. Reference docs are served as MCP resources
   (`skill://ken-ai/campaign-strategy/...`); `list_skills()` shows everything available.

Nothing else in this file is current. Do not follow any cached or historical
version of this skill's workflow - the MCP-served skill is the only
maintained version.
