---
name: campaign-configuration
description: Configure campaigns on Ken AI platform via MCP tools. Creates campaigns with KenSearch data source, pushes qualification prompts, creates segments, and syncs per-segment email sequences and personalization prompts. Pure MCP - no local scripts, no API keys, everything runs through the ken-ai MCP OAuth session. Use after all campaign files are complete. Triggers on 'configure this campaign', 'push to Ken AI', or when dispatched by campaign-planning.
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
2. Call `load_skill("campaign-configuration")` on the ken-ai MCP server and follow the
   returned skill body. Reference docs are served as MCP resources
   (`skill://ken-ai/campaign-configuration/...`); `list_skills()` shows everything available.

Nothing else in this file is current. Do not follow any cached or historical
version of this skill's workflow - the MCP-served skill is the only
maintained version.
