---
name: setup-workspace
description: Set up a workspace end to end - confirm intent, research the website, propose the company profile and logo, suggest teammate invites, explain the blocklist, integrations, and sending infrastructure with links, then hand off to campaign build. The canonical response to "Please set up my workspace". Works on every plan including Free.
---

# Setup Workspace

Onboarding for a new Kenso workspace. Works on every plan, including Free.

Trigger on "Please set up my workspace", "set up my workspace", "onboard me", "get me started", or a fresh workspace with empty company settings.

## Posture

- Conversational and stepwise. Announce the steps once, then work through them in order.
- **Approval gate:** every write is shown first and made only after the user says yes. Reads never need approval. One proposed write at a time.
- Never abort the whole setup because one step failed. Mark it skipped and keep going.

Steps to announce:

1. Confirm intent and workspace
2. Research the website
3. Company profile and logo
4. Invite teammates
5. Blocklist and integrations
6. Sending infrastructure
7. Hand off to campaign build

## Tools

Use only these calls. Everything else in this flow is a link to a page in the app.

| Need | Call | Write? |
|------|------|--------|
| Workspaces this user can access | `workspace(operation="list")` | read |
| Current company profile | `workspace(operation="get", workspace_id=<client_id>)` | read |
| Plan, usage, sending status | `billing(operation="subscription-get", client_id=<client_id>)` | read |
| Save name / website / LinkedIn / company context | `workspace(operation="update", workspace_id=<client_id>, ...)` | write |
| Set the logo | `workspace(operation="set_logo_from_url", client_id=<client_id>, logo_url="https://...")` | write |
| Current members | `members(operation="list", client_id=<client_id>)` | read |
| Pending invitations | `members(operation="invitations-list", client_id=<client_id>)` | read |
| Invite a teammate | `members(operation="invite", email=..., client_id=<client_id>)` | write |

`workspace_id` is the workspace's id, the same number as `client_id`.

Research happens through your runtime's company-research tool (for example `research_company`), which maps and scrapes the site for you. This skill never calls web tools and never writes workspace files.

Never buy domains or inboxes, never provision sending infrastructure, never create API keys or webhooks, and never handle credentials (API keys, OAuth tokens, passwords) in chat. Link to the page instead.

**Role:** writes need the workspace **admin** role. If the user is a member or view-only, do the reads, explain what an admin needs to do, and skip the writes. If a call returns `category="permission"`, treat it the same way.

## Step 1 - Confirm intent and workspace

Confirm the user wants to set up this workspace now and say what you will cover.

Ask once how much cold email they have run, and match your pace to the answer:

- **New to it:** explain each step in a sentence before you act.
- **Has run campaigns before:** skip the explanations and keep each step short.
- **Expert:** offer to jump to the steps they want and skip the rest. The approval gate still applies to every write.

Resolve the workspace before any other call:

1. If the runtime already pins the workspace, or the user named a workspace or `client_id`, use that `client_id` on every call.
2. Otherwise call `workspace(operation="list")` without `client_id`. When the session works in one workspace (one membership, or a connection pinned with `?workspace=<id>`) the server fills it in; confirm the name and id with the user. A customer connection that belongs to several workspaces and names none is refused with the workspace ids in the error: show them, ask which workspace to set up, and tell the user to reconnect with `https://mcp.ken.so/mcp?workspace=<id>`. Staff pass the `client_id` they pick from then on.
3. Never retry a multi-workspace call without an explicit `client_id`.

Then preflight the plan with `billing(operation="subscription-get", client_id=...)`. Record:

- `planType`: `free`, `platform` (the self-serve plan), `core`, `premium` (VIP), or grandfathered `starter` / `growth` / `dfy`. Platform, Core / VIP and the grandfathered paid plans count as paid.
- `usage[]` meters (`{metric, used, reserved, limit, unlimited, remaining}`) and `sendingInfrastructure.status` (`not_required`, `ready`, or `pending`) for Step 6.

Report a meter's `remaining` (or a plan-limit error's `remaining`) as given; never compute it as `limit - used`, and treat `unlimited: true` as no cap. If the preflight fails (for example `category="permission"`), continue with the plan **unknown**. Never block setup on it.

On Free, say early: "You're on Free - the company profile, invites, and guidance all work. Sending domains and inboxes unlock when you upgrade."

## Step 2 - Research the website

Read the current profile with `workspace(operation="get", workspace_id=...)`: name, website, company context, LinkedIn company URL, logo. Note which are empty.

If the website is empty, ask for it. Then run the research tool on it. Use only what the research returns plus what the user tells you:

- Prefer facts from the site. A field the sources do not support stays empty - never invent customers, metrics, or product claims.
- The company name is the real company name on the site, not a product name alone.
- A logo candidate must be an absolute `https://` URL that appears in the scraped content (header logo, brand mark, or `og:image` of the logo). Never guess a URL.
- The LinkedIn company URL must be a `linkedin.com/company/...` link found on the site (usually the footer). A personal `linkedin.com/in/...` profile is not the company page.

If research fails or returns little, say so and draft from what the user tells you. For a deeper pass later, the `knowledge-setup` skill covers it.

## Step 3 - Company profile and logo

Name, website, LinkedIn company URL, and company context are all part of setup, not extras. Every downstream campaign reads them for research, qualification, and personalization. Fill each one you can and ask once for each you cannot.

Draft the company context with these exact section headers:

**Company / What we do / Who we serve / Value prop & differentiation / Voice & tone / Don'ts (optional)**

Condensed rules (full guide: `references/company-context-guide.md`):

- Extract, don't invent
- Campaign-agnostic: no filters, no numeric disqualifiers, no case studies, no offers or CTAs
- First-person plural ("we")
- Target 400-700 tokens

Show the full proposed profile (name, website, LinkedIn URL, company context) and ask for approval or edits. On approval, send one update with only the fields that changed:

```
workspace(
  operation="update",
  workspace_id=<client_id>,
  name=...,                 # if changed
  website=...,              # if changed
  linkedin_company_url=..., # if known and changed
  company_context=...       # approved draft
)
```

Only `name`, `website`, `linkedin_company_url`, and `company_context` belong to this step. An empty string clears a field other than name; never send one unless the user asked to clear it. After success, say which of the four are set and which are still empty, and offer edits to the voice and tone.

**Logo:** propose the logo candidate from research, or ask the user for a public image URL. On approval call `workspace(operation="set_logo_from_url", client_id=..., logo_url="https://...")`. The server downloads the image behind an SSRF guard; never fetch it yourself and never ask for a file upload. On a validation error, relay `error.message` and ask for another URL. Skippable.

## Step 4 - Invite teammates

List who is already in with `members(operation="list", client_id=...)` and pending invites with `members(operation="invitations-list", client_id=...)`. Do not re-invite someone who is already a member or has an invite with `status` `pending`; an `expired` invite can be sent again.

Suggest inviting the people who will review campaigns or handle replies. Collect **emails only**; do not ask for roles. Confirm the list, then call `members(operation="invite", email=..., client_id=...)` once per email. The server sends the invitation email.

- Roles are changed later by an admin in the team settings: https://app.ken.so/settings/users
- `code="USER_LIMIT_REACHED"`: relay `error.message` and `error.recovery.summary` as the upgrade path, then continue.
- If the invite fails because the workspace is not linked to an organization, do **not** invite as a staff user and do not retry. Tell the user Kenso support needs to link the workspace to its owner's organization first (give them the workspace id and the owner's email), then invites will work.

Invites are skippable.

## Step 5 - Blocklist and integrations

Pure guidance. No writes. Message shapes: `references/setup-messages.md` (unbranded; fill its `<... link>` placeholders with the links in this file).

**Blocklist (state the policy verbatim):**

> Blocklist upload stays in-platform. Do not ask the user to paste their client list or upload a CSV into this conversation - guide them to the blocklist page instead.

Explain that the blocklist keeps current clients, partners, and anyone they cannot contact from ever getting cold email, and that they upload or maintain it themselves at https://app.ken.so/settings/blocklist. Never ingest a client list, never solicit a paste, and never add entries for them.

**Integrations:** optional and low pressure. Connect when ready at https://app.ken.so/settings/integrations:

- CRM sync: https://app.ken.so/settings/integrations/crm
- Calendar: https://app.ken.so/settings/integrations/calendar
- LinkedIn accounts connect from https://app.ken.so/delivery?tab=linkedinAccounts
- API keys, when they need them: https://app.ken.so/settings/integrations/api-keys

OAuth stays in the browser. Never claim setup connected anything.

## Step 6 - Sending infrastructure

Explain, then link. Never buy, import, or provision anything in this flow.

Cold email goes out from separate sending domains (never the main company domain) with a few inboxes on each. A Google or Microsoft inbox sends about 25 emails a day, so volume comes from several inboxes, and new inboxes warm up before they reach full volume.

Branch on the Step 1 preflight:

- **Free:** "Paid plans unlock sending domains and inboxes. Upgrade anytime at https://app.ken.so/settings/billing, then set them up on the domains and inboxes page." Do not surface any plan error to a Free user; this branch is the graceful path.
- **Paid** (Platform, Core / VIP or a grandfathered paid plan): buy new sending domains, connect ones they own (BYOD), and see inboxes on the domains and inboxes page, https://app.ken.so/delivery?tab=inboxes. Use `sendingInfrastructure.status`: `ready` means sending is set up, `pending` means it is still being set up (relay `pendingReason` if present), `not_required` means nothing is expected yet. Capacity is daily emails, so do not quote `kenMailboxSlots` as a mailbox allowance.
- **Unknown plan:** give the Free line and the domains and inboxes link in one sentence each.

In an MCP chat client, a paid user who wants to size and set this up with the agent can do it later with the `infra-planning` and `connect-domains` skills.

## Step 7 - Hand off to campaign build

1. Show the steps with **done** / **skipped** for each.
2. Offer the first campaign: "You're ready to build your first campaign." If your runtime has a campaign-build handoff tool (for example `start_campaign_build`), call it when the user agrees. Otherwise load the `create-campaign` skill (`load_skill("create-campaign")`) when they ask.

## Plan limits and errors

Plan-limit codes are information, not failure. For `PLAN_FEATURE_NOT_AVAILABLE`, `DOMAIN_LIMIT_REACHED`, `INBOX_LIMIT_REACHED`, `USER_LIMIT_REACHED`, or `AI_CREDITS_LIMIT_REACHED`, relay `error.message` and `error.recovery.summary` as friendly next steps and continue.

Errors arrive as `{success: false, error: {code, category, message, recovery, ...}}` (full shape: `references/setup-messages.md`):

- `plan_limit` / `billing`: relay message and recovery, continue
- `permission`: not available to this account; continue without it
- `validation` / `not_found`: relay the message, fix the input or skip the step
- `transient`: retry once, then mark the step skipped

## Free-plan success bar

A Free user reaches the hand-off with the company profile and context written, the logo set (if they had a URL), invites sent within seats, blocklist and integrations guidance given, and an upgrade pointer for sending infrastructure, with zero error-shaped plan output.

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
