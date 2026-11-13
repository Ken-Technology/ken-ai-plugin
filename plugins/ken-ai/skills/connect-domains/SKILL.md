---
name: connect-domains
description: Connect customer-owned sending domains by changing their nameservers at the registrar (no transfer). Plan, paste names, preview with the registrar and its steps, MX/site confirm, import, registrar NS change, then nameserver check.
---

# Connect domains

Connect domains the user already owns to Kenso. Connecting means changing the domain's nameservers at its registrar, and nothing else: no transfer, no new registrar, and the domain's renewal stays where it is. Kenso creates the Cloudflare zone and returns **Kenso Cloudflare nameservers**. The user changes nameservers at their registrar. Kenso owns the zone. Customer Cloudflare API tokens are not supported. A domain registered at Cloudflare Registrar cannot change its nameservers, so it cannot be connected: recommend a new domain from Kenso (`domain-selection`) instead.

Use the import operations and billing reads below. Buying new domains (search, checkout) belongs to `domain-selection`.

Preview and import need Delivery edit access (owners, admins and editors by default). Capacity and import-list reads need Delivery view. Confirm the cart with the user before the create call.

Imported domains get Kenso inboxes, so import is paid like any Kenso inbox. Credit plans pay in credits: 200 credits ($4) per Google / Outlook inbox a month and 2,500 credits ($50) per Azure domain a month (up to 50 inboxes). There is no registration charge. Exempt workspaces (VIP) have mailboxes on the plan.

Import onto the mailbox types of deliverability rule 6, in the `deliverability-guard` skill's `rules.md` reference. SMTP inboxes cannot be ordered yet, so an import takes Google or Outlook mailboxes; Azure is not offered for new inboxes, and the plan you size with carries no Azure line (`infra-planning`).

## 1. Plan and capacity

Size the import with the sending plan, as `infra-planning` says: `inboxes(operation="sending-plans-create", emails_per_day=500, domains=[{"name": "acme.io", "provider": "google", "kind": "import"}], senders=[...])`. Quote its numbers, and use its `importCart` as the import body in step 5. `cost.dueOnConnect` is the first month of the imported inboxes: nothing is charged at import, but the import is refused unless the credits cover it, and it is charged as each domain is set up. `balance.shortfallCredits` is the credits to buy before the import. With `balance.creditsExempt` true the inboxes are on the plan: quote no credits and ask for no packs. Read `domain_setup(operation="delivery-defaults-get")` first for the senders, forwarding URL and website answer. New payers are limited to 3 domains and 10 inboxes (Azure inboxes count) until 14 days of paid history: the plan shows what fits.

Call `domain_orders(operation="domain_import-capacity", client_id=...)`. Then `billing(operation="billing_subscription", client_id=...)`: if `managedByWorkspace` is set (white-label child), record `caps.mailboxes` and `caps.domains`; its credits are run by the parent workspace. Then `billing(operation="credits-get", client_id=...)`: record `exempt` and `display.available`.

Done when you have `remaining` daily send, `planDailyEnforced`, existing Google / Microsoft / Azure counts, available credits, and the white-label caps when they apply.

Daily-send math:

- `planDaily` is emails/day. Do not compute `emailLimit / 30`.
- `planDailyEnforced` true, or the field is missing: `planDaily` is a hard cap. `planDailyEnforced` false (credit plans): `planDaily` is a planning figure, and credits are the limit.
- Planning rate, which the plan sizes with: Google and Outlook (MICROSOFT) = 25/day each, Azure = 5/day. A mailbox's own sending ceiling is higher (50 for Google and Outlook, 30 for Azure and SMTP): see `infra-planning`.
- Daily send is the plan limit: `kenMailboxSlots` does not cap mailbox count, so never clamp to it.

The plan, not you, turns the goal into inboxes and domains per provider (`lines`). Do not work out counts by hand. The facts it works within: Google / Outlook take 1-5 inboxes per domain, Azure takes 1-50, every imported domain gets at least one mailbox, and an import takes at most 50 domains.

White-label child only: the parent's caps count every inbox and domain in the workspace, connected ones included (count with `inboxes(operation="list", client_id=...)` and `domains(operation="list", client_id=...)`; follow `cursor` while `pagination.hasMore` is true), so `current + cart` must stay within `caps.mailboxes` and `caps.domains`. Preview counts only one mailbox of daily per domain, so a cart that previews clean can still fail OverCapacity on import.

On a hard cap or a white-label child: if the cart would exceed `remaining` daily send or a white-label cap, shrink the goal and plan again before preview. Shrink on either overflow. Do not submit an over-capacity cart. On a hard cap, remaining daily send is the plan cap, not a domain-count allowance. Capacity does not paid-gate; preview and import do.

## 2. Paste names

Collect apex names into platform pools (Google, Outlook). Lowercase, no subdomains.

Done when each pool has enough apexes for the inbox counts from step 1.

## 3. Preview

`domain_orders(operation="domain-imports-preview", client_id=..., domains=[{"name": "acme.io", "platform": "GOOGLE"}])`

`platform` is `GOOGLE`, `MICROSOFT`, or `AZURE`. Outlook names use `MICROSOFT`. Rows come back with `name`, `platform`, `eligibility`, `requiresConfirm`, `platformAllowed`; the result has `canSubmit`.

Each row also names the registrar, from public RDAP: `registrar` (`name`, `ianaId` and `guide`, the key of that registrar's nameserver steps), `currentNameservers` (what the domain has now) and `nameserversChangeable`. `nameserversChangeable` is false for Cloudflare Registrar (that domain cannot connect: tell the user and recommend a new domain from Kenso, never a transfer), null when the registrar is unknown, and true otherwise. A failed or late lookup leaves all three null and does not fail the preview: carry on and ask the user which registrar the domain is with.

| `eligibility` | What to do |
|-------|------------|
| Eligible | Include. `risk_confirmed=false` |
| InUseMx | Warning. Ask the user to Continue on that name. If yes, `risk_confirmed=true`. If no, drop it |
| LiveWebsite | Same as InUseMx |
| LookupFailed | Cannot submit. Retry preview later. Keep it off the cart |

If `platformAllowed` is false (Google needs Google Workspace availability, Outlook needs Microsoft 365), drop that name or move it to the other of Google and Outlook. Azure is allowed unless LookupFailed, but it is not offered for new inboxes (rule 6).

A row whose `errorCode` is DomainBlocklisted is on Spamhaus DBL or SURBL. Drop that name and pick another: the import refuses it, and `risk_confirmed` does not lift it.

`requiresConfirm` is a warning, not a hard fail. If a pool falls below packing minimum after drops, go back to step 1 or 2.

Paid-plan errors (`PLAN_FEATURE_NOT_AVAILABLE`, Forbidden, "A paid plan is required") and OverCapacity are hard stops. Import needs Platform (`planType` Platform), Dfy, VIP (`planType` Premium), or a grandfathered Starter / Growth / Core plan, with billing Active or Trialing. Free cannot import onto Kenso inboxes: it connects its own inboxes in the app, or upgrades to Platform at https://app.ken.so/<workspace id>/settings/billing. Relay the envelope `message` and `error.recovery.summary` when present. OverCapacity comes only from a hard cap.

Done when every remaining name is Eligible, InUseMx, or LiveWebsite, warnings are confirmed or dropped, packing holds, and `canSubmit` is true (or the only failures are names you dropped).

## 4. Identities and forwarding

Forwarding URL is required (`http://` or `https://`). Prefill from the workspace website; otherwise ask. A Kenso brand site other than getken.ai (ken.so, getken.dev and the rest) is never a forwarding URL: Kenso's own workspaces use the cold root `https://getken.ai`, and the backend stores any other Kenso brand URL as `https://getken.ai`. The workspace owner email becomes the catch-all; import fails without it.

Per mailbox: `first_name`, `last_name`, `username` (local-part only), optional `profile_picture_url` for Google/Outlook (omit for Azure). Username order and charset: `references/usernames.md`.

On a credit plan, price the cart: `billing(operation="credit-estimates-create", client_id=..., kind="infra", items=[{"action": "ken_inbox_monthly", "quantity": <Google + Outlook mailboxes>}, {"action": "azure_domain_monthly", "quantity": <Azure domains>}])` (drop a zero item). Import needs the first month in available credits. If `sufficient` is false, show `display.availability` and shrink the cart or buy credits first.

**Website question (workspaces with domain pages).** Before you import domains, ask the person: "What should people see when they open these domains? A rebuild of your website (recommended) or a redirect to your website?" A rebuild shows a copy of their home page on every one of these domains; a redirect sends visitors to their website, as today. Never choose for them. Pass the answer as `website_mode`: `page` for the rebuild, `redirect` for the redirect. Where domain pages are on, the import is refused without it; in any other workspace, do not ask and leave `website_mode` out. For a workspace member, the operation `outbound-site-get` is listed only where domain pages are on. When `domain_setup(operation="delivery-defaults-get")` returns a `websiteMode` with `source` `stored`, do not ask again: state it as "your saved choice" ("your saved choice is a rebuild of your website") and use it unless the person changes it. `websiteMode` is never derived, so without a stored answer you ask.

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

Give the steps for that registrar.

Read the `registrar.guide` key from the preview row and load `references/registrar-steps.md`: it has the steps for each key (`godaddy`, `namecheap`, `porkbun`, `squarespace`, `google`, `ionos`, `ovh`, `gandi`, `hover`, `namecom`, `dynadot`, `enom`, `networksolutions`, `cloudflare`, `other`). Give only that registrar's section.

For a registrar with no guide, or a lookup that failed, ask which registrar it is and use the general steps:

1. Open the domain at their registrar.
2. Replace the current nameservers with the pair you showed.
3. Save. DNS can take minutes to hours.

If the domain sits on someone else's Cloudflare account, they still point NS at the Kenso pair and leave the old account.

Done when the user says they updated nameservers, or they want to wait.

## 7. Check nameservers

After they confirm, call `domains(operation="check-nameservers", domain_id=..., client_id=...)` once per imported domain still setting up. Show `status`, `zoneStatus`, and `activated`.

Kenso checks the nameservers every 15 minutes on its own. After 24 hours without an active zone the status becomes action required (still waiting: nameservers do not expire, so fix them at the registrar and it clears). After 14 more days the import is given up (`failed`).

Do not loop the check on a timer. One shot on user request, then `domain-imports-list` if they want a table.

`check-nameservers` re-checks one domain right away. A domain read (`domains(operation="get", domain_id=...)`) shows its `nameservers` (`expected`, `current` and `status`: `active`, `action_required` or `pending`) and the registrar as `registrarInfo`.

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
