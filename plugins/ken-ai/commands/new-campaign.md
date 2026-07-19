---
description: DEPRECATED - the guided Ken AI campaign build now runs through the ken-ai MCP skills. Load campaign-planning on the MCP and follow the skills it names.
model: sonnet
thinking: false
---

# New Campaign (moved to the Ken MCP)

This command is a deprecation shim. The guided campaign build no longer runs
from this plugin - it now runs through the Ken MCP server's skills.

**To run it now:**

1. Make sure the `ken-ai` MCP server is connected (this plugin already bundles
   it: `https://mcp.getken.ai/ken-ai/mcp` - your client opens a browser OAuth
   flow; create an API key at app.ken.so under Settings - API Keys).
2. Call `load_skill("campaign-planning")` on the ken-ai MCP and follow it. When
   it finishes it returns an ORDERED list of downstream skill names for your
   campaign; load each named skill with `load_skill("<name>")` in that order and
   follow it before moving to the next.

`list_skills()` shows every skill the MCP serves. Nothing else in this file is
current.
