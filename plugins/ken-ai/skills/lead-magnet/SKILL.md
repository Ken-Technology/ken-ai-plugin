---
name: lead-magnet
description: Ideate and design lead magnets for cold email campaigns. Covers both click-based (downloads, tools, signups) and reply-based (free trials, guarantees, done-for-you samples) campaign types. Use when a client needs a new lead magnet, when campaign-planning identifies a weak offer, or when the user wants to brainstorm offers for a specific ICP. Triggers on requests like "create a lead magnet for [client]", "brainstorm offers", "what lead magnet should we use", or when campaign-planning detects no strong lead magnet exists.
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
2. Call `load_skill("lead-magnet")` on the ken-ai MCP server and follow the
   returned skill body. Reference docs are served as MCP resources
   (`skill://ken-ai/lead-magnet/...`); `list_skills()` shows everything available.

Nothing else in this file is current. Do not follow any cached or historical
version of this skill's workflow - the MCP-served skill is the only
maintained version.
