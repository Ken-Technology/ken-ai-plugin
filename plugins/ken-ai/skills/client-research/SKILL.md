---
name: client-research
description: Synthesize client research from meeting recordings, website data, and other resources into a comprehensive Markdown strategy document. Use when the user uploads meeting transcripts, call recordings, or scraped website data and needs a complete client research document for GTM strategy, list building, or email copywriting. Triggers on requests like "create a client research doc", "summarize this client", "build a strategy document from these resources", or when multiple client-related sources are provided for synthesis.
model: sonnet
thinking: false
---

# This skill has moved to the Ken MCP

This workflow now lives in the Ken MCP server and no longer runs from this
plugin. The plugin version you are reading is a deprecation shim and receives
no updates.

**To run it now:**

1. Make sure the `ken-ai` MCP server is connected (this plugin already bundles
   it: `https://mcp.getken.ai/ken-ai/mcp` - your client opens a browser OAuth
   flow; create an API key at app.ken.so under Settings - API Keys).
2. Call `load_skill("client-research")` on the ken-ai MCP server and follow the
   returned skill body. Reference docs are served as MCP resources
   (`skill://ken-ai/client-research/...`); `list_skills()` shows everything available.

Nothing else in this file is current. Do not follow any cached or historical
version of this skill's workflow - the MCP-served skill is the only
maintained version.
