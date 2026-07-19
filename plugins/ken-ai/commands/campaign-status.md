---
description: DEPRECATED - campaign status now comes from the typed api_campaign_status tool on the ken-ai MCP. The former raw-SQL flow is removed.
model: sonnet
thinking: false
---

# Campaign Status (moved to the Ken MCP)

This command is a deprecation shim. It no longer runs from this plugin.

**To run it now:**

Call the `api_campaign_status` tool on the ken-ai MCP with the campaign id or
name. This command's former raw-SQL flow is removed - it required database
credentials client principals do not have.

Make sure the `ken-ai` MCP server is connected first (this plugin already
bundles it: `https://mcp.getken.ai/ken-ai/mcp` - your client opens a browser
OAuth flow; create an API key at app.ken.so under Settings - API Keys).

Nothing else in this file is current.
