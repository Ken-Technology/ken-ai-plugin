---
name: email-copywriting
description: Write effective cold email copy using proven principles for hooks, body, CTAs, signatures, AI personalization, and QA processes. Use this skill when (1) writing email sequences from scratch, (2) consuming Campaign Strategy output to write email copy based on an email sequence blueprint and AI variables, or (3) reviewing and improving existing email campaigns. When a Campaign Strategy document is provided, this skill writes the actual email copy and generates AI personalization prompts.
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
2. Call `load_skill("email-copywriting")` on the ken-ai MCP server and follow the
   returned skill body. Reference docs are served as MCP resources
   (`skill://ken-ai/email-copywriting/...`); `list_skills()` shows everything available.

Nothing else in this file is current. Do not follow any cached or historical
version of this skill's workflow - the MCP-served skill is the only
maintained version.
