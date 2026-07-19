---
name: email-review
description: Review cold email copy for quality, compliance with critical copy rules, and client preferences. Use after email-copywriting completes to validate and improve email sequences. Scores emails 1-5 and outputs emails_v2.md when score >= 4.5. If score < 4.5, provides revision feedback for email-copywriting to iterate. Triggers on "review emails", "check email copy", or when invoked by campaign-planning/campaign-strategy workflows.
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
2. Call `load_skill("email-review")` on the ken-ai MCP server and follow the
   returned skill body. Reference docs are served as MCP resources
   (`skill://ken-ai/email-review/...`); `list_skills()` shows everything available.

Nothing else in this file is current. Do not follow any cached or historical
version of this skill's workflow - the MCP-served skill is the only
maintained version.
