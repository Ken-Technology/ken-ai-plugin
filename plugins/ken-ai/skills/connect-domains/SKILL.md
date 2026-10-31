---
name: connect-domains
description: Import customer-owned sending domains onto platform-managed Cloudflare nameservers. Walk capacity, paste names, preview, MX/site confirm, import, registrar NS change, then nameserver check.
---

# Connect domains

Import domains the user already owns onto Kenso. Kenso creates the Cloudflare zone and returns **Kenso Cloudflare nameservers**. The user changes nameservers at their registrar. Kenso owns the zone. Customer Cloudflare API tokens are not supported.

Use the import operations and billing reads below. Buying new domains (search, checkout) belongs to `domain-selection`.

Every step except capacity needs the **admin** role on the workspace (backend FullAccess). Confirm the cart with the user before the create call.

Imported domains get Kenso inboxes, so import is paid like any Kenso inbox. Credit plans pay in credits: 200 credits ($4) per Google / Outlook inbox a month and 2,500 credits ($50) per Azure domain a month (up to 50 inboxes). There is no registration charge. Exempt workspaces (VIP) have mailboxes on the plan.

## 1. Capacity

Call `domain_orders(operation="domain_import-capacity", client_id=...)`. Then `billing(operation="billing_subscription", client_id=...)`: if `managedByWorkspace` is set (white-label child), record `caps.mailboxes` and `caps.domains`; its credits are run by the parent workspace. Then `billing(operation="credits-get", client_id=...)`: record `exempt` and `display.available`.

Done when you have `remaining` daily send, `planDailyEnforced`, existing Google / Microsoft / Azure counts, available credits, and the white-label caps when they apply.

Daily-send math:

- `planDaily` is emails/day. Do not compute `emailLimit / 30`.
- `planDailyEnforced` true, or the field is missing: `planDaily` is a hard cap. `planDailyEnforced` false (credit plans): `planDaily` is a planning figure, and credits are the limit.
- Google and Outlook (MICROSOFT) = 25/day each
- Azure = 5/day
- On a hard cap, mailbox count is remaining / that per-inbox daily. Daily send is the plan limit: `kenMailboxSlots` does not cap mailbox count, so never clamp to it.
- Size the cart as `sum(mailboxes * daily)`. On a hard cap, keep it within `remaining` daily send. White-label child only: the parent's caps count every inbox and domain in the workspace, connected ones included (count with `inboxes(operation="list", client_id=...)` and `domains(operation="list", client_id=...)`; follow `cursor` while `pagination.hasMore` is true), so `current + cart` must stay within `caps.mailboxes` and `caps.domains`. Preview counts only one mailbox of daily per domain, so a cart that previews clean can still fail OverCapacity on import.

On a hard cap, remaining daily send is the plan cap, not a domain-count allowance. Capacity does not paid-gate; preview and import do.

Ask how many Google, Outlook, and Azure inboxes they want. Derive domain counts:

- Google / Outlook: 1-5 inboxes per domain
- Azure: 1-50 inboxes per domain
- Domain count per platform is between `ceil(inboxes / maxPerDomain)` and `inboxes`
- Every imported domain gets at least one mailbox. Max 50 domains

On a hard cap or a white-label child: if the cart would exceed `remaining` daily send or a white-label cap, shrink inbox counts before preview. Shrink on either overflow. Do not submit an over-capacity cart.

## 2. Paste names

Collect apex names into platform pools (Google, Outlook, Azure). Lowercase, no subdomains.

Done when each pool has enough apexes for the inbox counts from step 1.

## 3. Preview

`domain_orders(operation="domain-imports-preview", client_id=..., domains=[{"name": "acme.io", "platform": "GOOGLE"}])`

`platform` is `GOOGLE`, `MICROSOFT`, or `AZURE`. Outlook names use `MICROSOFT`. Rows come back with `name`, `platform`, `eligibility`, `requiresConfirm`, `platformAllowed`; the result has `canSubmit`.

| `eligibility` | What to do |
|-------|------------|
| Eligible | Include. `risk_confirmed=false` |
| InUseMx | Warning. Ask the user to Continue on that name. If yes, `risk_confirmed=true`. If no, drop it |
| LiveWebsite | Same as InUseMx |
| LookupFailed | Cannot submit. Retry preview later. Keep it off the cart |

If `platformAllowed` is false (Google needs Google Workspace availability, Outlook needs Microsoft 365), drop that name or move it to an allowed platform. Azure is allowed unless LookupFailed.

A row whose `errorCode` is DomainBlocklisted is on Spamhaus DBL or SURBL. Drop that name and pick another: the import refuses it, and `risk_confirmed` does not lift it.

`requiresConfirm` is a warning, not a hard fail. If a pool falls below packing minimum after drops, go back to step 1 or 2.

Paid-plan errors (`PLAN_FEATURE_NOT_AVAILABLE`, Forbidden, "A paid plan is required") and OverCapacity are hard stops. Import needs Platform (`planType` Platform), Dfy, VIP (`planType` Premium), or a grandfathered Starter / Growth / Core plan, with billing Active or Trialing. Free cannot import onto Kenso inboxes: it connects its own inboxes in the app, or upgrades to Platform at https://app.ken.so/<workspace id>/settings/billing. Relay the envelope `message` and `error.recovery.summary` when present. OverCapacity comes only from a hard cap.

Done when every remaining name is Eligible, InUseMx, or LiveWebsite, warnings are confirmed or dropped, packing holds, and `canSubmit` is true (or the only failures are names you dropped).

## 4. Identities and forwarding

Forwarding URL is required (`http://` or `https://`). Prefill from the workspace website; otherwise ask. The workspace owner email becomes the catch-all; import fails without it.

Per mailbox: `first_name`, `last_name`, `username` (local-part only), optional `profile_picture_url` for Google/Outlook (omit for Azure). Username order and charset: `references/usernames.md`.

On a credit plan, price the cart: `billing(operation="credit-estimates-create", client_id=..., kind="infra", items=[{"action": "ken_inbox_monthly", "quantity": <Google + Outlook mailboxes>}, {"action": "azure_domain_monthly", "quantity": <Azure domains>}])` (drop a zero item). Import needs the first month in available credits. If `sufficient` is false, show `display.availability` and shrink the cart or buy credits first.

**Website question (workspaces with domain pages).** Before you import domains, ask the person: "What should people see when they open these domains? A rebuild of your website (recommended) or a redirect to your website?" A rebuild shows a copy of their home page on every one of these domains; a redirect sends visitors to their website, as today. Never choose for them. Pass the answer as `website_mode`: `page` for the rebuild, `redirect` for the redirect. Where domain pages are on, the import is refused without it; in any other workspace, do not ask and leave `website_mode` out. For a workspace member, the operation `outbound-site-get` is listed only where domain pages are on.

Show the cart (names, platform, mailbox count, monthly credits from `display.summary` on a credit plan, forwarding URL, website mode, nameservers come back after import). Get a yes.

## 5. Import

```
domain_orders(
  operation="domain-imports-create",
  client_id=...,
  forwarding_url="https://acme.com",
  website_mode=...,  # the person's answer: "page" or "redirect"
  domains=[{
    "name": "acme.io",
    "platform": "GOOGLE",
    "risk_confirmed": false,
    "mailboxes": [{"first_name": "Ada", "last_name": "Lovelace", "username": "ada.lovelace"}]
  }]
)
```

Partial success is normal. For each `accepted` row, show the **Kenso Cloudflare nameservers** from `nameservers` and record `domainId`. Cloudflare NS are per zone: copy them, never invent them. For a rejected row, show `errorCode` and continue.

Then `domain_orders(operation="domain-imports-list", client_id=...)`. Rows use `id` (same value as `domainId`), `status` (`setting_up` after import), and `expectedNameservers`.

## 6. Registrar nameservers

Tell the user, registrar-agnostic:

1. Open the domain at their registrar.
2. Replace the current nameservers with the pair you showed.
3. Save. DNS can take minutes to hours.

If the domain sits on someone else's Cloudflare account, they still point NS at the Kenso pair and leave the old account.

Done when the user says they updated nameservers, or they want to wait.

## 7. Check nameservers

After they confirm, call `domains(operation="check-nameservers", domain_id=..., client_id=...)` once per imported domain still setting up. Show `status`, `zoneStatus`, and `activated`.

Kenso polls about every 15 minutes. After about 24 hours without an active zone the status becomes action required (still waiting, NS do not expire). After 14 more days the import is abandoned (`failed`).

Do not loop the check on a timer. One shot on user request, then `domain-imports-list` if they want a table.

## Errors

| Signal | What to tell the user |
|--------|------------------------|
| Paid-plan / Forbidden / `PLAN_FEATURE_NOT_AVAILABLE` | Free cannot import onto Kenso inboxes. Connect your own inboxes in the app, or upgrade to Platform at https://app.ken.so/<workspace id>/settings/billing. Show `error.recovery.summary` when present |
| `INSUFFICIENT_CREDITS` | Not enough credits for the first month of the imported inboxes. Show the message (it carries the credits needed and available). Shrink the cart, or buy credits at https://app.ken.so/<workspace id>/settings/billing and retry. Dfy: the Kenso team adds credits. White-label child: ask the parent workspace |
| `FREE_CREDITS_NOT_ELIGIBLE` | Free and bonus credits can't pay for domains or inboxes, and the bought credits fall short. Show the message (it carries the credits needed, the credits that can pay, and the free part). Buy credits at https://app.ken.so/<workspace id>/settings/billing and retry. Dfy: the Kenso team adds credits. White-label child: ask the parent workspace. |
| OverCapacity / remaining too small | Hard cap only. Show remaining daily send. Shrink inbox counts so `existing + cart <= planDaily`. It is not a mailbox-slot limit |
| "workspace mailbox cap" / "workspace domain cap" | White-label child at its parent's cap. Shrink the cart or ask the parent workspace to raise it |
| LookupFailed | Cannot import until preview returns Eligible, InUseMx, or LiveWebsite. Retry later |
| DomainPendingElsewhere | Another workspace's import still holds the name and has not moved its nameservers. Show `claim.recordName` and `claim.recordValue`: the user adds that TXT record at the domain's own DNS (where they edit its records today), waits for DNS to update (it can take minutes, sometimes longer), then you retry the import. The same record comes from `domain_orders(operation="claim", domain=..., client_id=...)`. Only a workspace that controls the DNS can add it |
| ClaimLookupFailed | The TXT record could not be read right now. Retry later. Not the same as LookupFailed |
| ConfirmRequired | MX or live site. Continue or drop that name |
| DomainBlocklisted | On Spamhaus DBL or SURBL. Drop that name and pick another. Do not retry or set `risk_confirmed`: neither lifts it |
| PlatformUnavailable / `platformAllowed=false` | That name cannot take that platform. Drop or re-pool |
| Owner email missing | Set the workspace owner email, then retry |

## Boundaries

- Imports domains the user already owns. Registering new names is `domain-selection`.
- Kenso Cloudflare nameservers only. Never ask for a customer Cloudflare token.
- Existing domains (list, get, update) use `domains`, not this cart. Status lives on the domains and inboxes page, https://app.ken.so/<workspace id>/delivery?tab=inboxes.
- Inbox tuning after the domain is active belongs in `inbox-configuration`.

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
