---
name: domain-selection
description: Use when reviewing sending domains or ordering new ones on a paid workspace, paid in credits or through Stripe checkout.
---

# Domain selection

Review live sending domains. On a paid plan, size the order with the sending plan, then search names and order them from the plan's cart. Credit plans pay registration and inboxes in credits; exempt workspaces pay the search hit `price` for one year through Stripe checkout. Never present names as ordered before the order is paid. To import domains the user already owns, load `connect-domains` (BYOD is live).

## 1. Paid plan, credits, and capacity

Before any search or order:

1. `billing(operation="billing_subscription", client_id=...)`. Plans that buy Kenso domains, with billing Active or Trialing: Platform (`planType` Platform), Dfy, grandfathered Starter / Growth / Core (all credit plans), and VIP (`planType` Premium, exempt). If Free, or `PLAN_FEATURE_NOT_AVAILABLE`, stop adds: Free cannot buy Kenso domains or inboxes and connects its own inboxes in the app, or upgrades to Platform at https://app.ken.so/<workspace id>/settings/billing; show `error.recovery.summary` when present. If `managedByWorkspace` is set (white-label child), record `caps.mailboxes` and `caps.domains`; its credits are run by the parent workspace.
2. `billing(operation="credits-get", client_id=...)`. Record `exempt` and `display.available`.
3. The sending plan (section 2) carries the capacity: make no separate capacity read. From `inboxes(operation="sending-plans-create", ...)` read `emailsPerDay.existing` (emails a day the workspace's inboxes send now, at the planning rate), `emailsPerDay.toAdd` (what the goal still needs) and `limits` (`planDailyEnforced`, `canBuy`, `refusal`). Sizing is a read: the plan buys nothing. The plan does not check the daily send left on a hard cap: for that, step 4 reads `triggers(operation="sending-capacity-get", client_id=...)`, also a read.
4. `limits.planDailyEnforced` true, or missing: daily send is a hard cap. Read `remaining`, the daily send left, from `triggers(operation="sending-capacity-get", client_id=...)`. If `remaining` is 0, stop new orders and work with existing domains. If `emailsPerDay.toAdd` is above `remaining`, plan again with `emails_per_day` at `emailsPerDay.existing` plus `remaining`. When `limits.canBuy` is false, or `limits.refusal` is set with a code other than `INSUFFICIENT_CREDITS` or `FREE_CREDITS_NOT_ELIGIBLE`, relay `limits.refusal.message`, stop new orders and work with existing domains. `limits.planDailyEnforced` false (credit plans): daily send is a planning figure, and credits are the limit.

The plan (next section) turns a goal into mailboxes at the planning rate of 25 emails a day per Google or Outlook inbox and 5 per Azure inbox; never size by hand. Daily send is the plan limit: `kenMailboxSlots` does not cap mailbox count, so never clamp to it. White-label child only: the caps count every inbox and domain in the workspace, connected ones included. Count them with `inboxes(operation="list", client_id=...)` and `domains(operation="list", client_id=...)` (follow `cursor` while `pagination.hasMore` is true), then require `current + cart` within `caps.mailboxes` and `caps.domains`. Otherwise there is no domain-count allowance.

## 2. Plan first

Every order starts from the sending plan, so the app, `infra-planning` and this skill agree on the numbers. Read `domain_setup(operation="delivery-defaults-get")` first and use its values: `senders` for the mailbox names, `redirectUrl` for the forwarding URL, `websiteMode` for the website answer. Then:

1. `inboxes(operation="sending-plans-create", people_per_month=1500, emails_per_person=3)` (or `emails_per_day=500`). Quote it as `infra-planning` says: emails a day, lines, cost a month and due today in credits with dollars (each amount's `usd`; `usdCents` is US cents, never dollars), timeline, `capped` and `limits.refusal`.
2. Search names (section 5), pick the ones the plan needs, and call the plan again with `domains=[{"name": "tryacme.com", "provider": "google", "kind": "register", "quote_usd_cents": 1040}]` and `senders=[{"first_name": "Jane", "last_name": "Doe"}]`. With `domains` and `senders` the plan returns `cart`: the exact body for `domain_orders(operation="domain-orders-create")`. With no domains it estimates each at $10.40 and `cost.dueTodayIsEstimate` is true, so say the registration part is an estimate until the search quotes are in.
3. A plan with the warning `senders_required` returns no `cart`: ask for sender names, save them with `domain_setup(operation="delivery-defaults-update", senders=[...])` when the person wants them as the default, and plan again with `senders`.
4. Build the order from `cart` (section 6). Do not rebuild it by hand from the table in the plan.

Order the mailbox types of deliverability rule 6, in the `deliverability-guard` skill's `rules.md` reference. SMTP inboxes cannot be ordered yet, so every new domain takes Google or Outlook mailboxes; plan as `infra-planning` says, with no Azure line. Azure is not offered for new orders.

## 3. Naming rules (advice only)

- Never use the bare brand (`acme.com`) or the primary company domain for cold sending, and never offer either as a name to buy.
- Build names from the brand in these patterns: `get{brand}`, `try{brand}`, `{brand}hq`, `use{brand}`, `join{brand}`, `meet{brand}`, `{brand}mail`, `{brand}team`, `go{brand}`, `{brand}app`. Short, pronounceable, no hyphens or numbers.
- Search offers `.com`, `.net`, `.org`, `.shop`; prefer `.com`.

Advice is not an order. Search before claiming a name is free.

Setup defaults: sender names, the forwarding URL the domain's root redirects to, the website answer, the profile photo, the reply forwarding address and the signature.
The plan and `delivery-defaults-get` carry them. Use the saved value and say where it came from; ask only for what has none.

## 4. Read existing domains

- `domains(operation="list", client_id=..., limit=...)` - inventory
- `domains(operation="get", domain_id=...)` - one domain
- Its `tagIds` are the mailbox tags (`tags(operation="list")` names them)
- `domains(operation="verify-dns", domain_id=...)` - only when the user asks to recheck the domain's tracking DNS now. It checks the apex record, not the `link.{apex}` click host

Summarize names, status, tracking posture. Domains and inboxes page: https://app.ken.so/<workspace id>/delivery?tab=inboxes.

## 5. Search

Needs a paid plan, Delivery edit access (owners, admins and editors by default), a plan whose `limits.canBuy` is true, and `remaining` > 0 when daily send is a hard cap. Members can read the plan, capacity and orders.

`domain_orders(operation="domain-orders-search", client_id=..., keyword=..., tlds=[...], limit=...)`, or `domain=` for an exact FQDN.

Each hit has `price` and a registrar quote, both money objects in minor units: each `amount` is US cents (`1200` is $12.00). Quote dollars as `amount` / 100, never the amount itself. Copy the registrar quote, in dollars, into checkout `registrar_price_usd`, or its `amount` as is into the plan's `quote_usd_cents`. Never send `price` as the registrar quote: the markup would apply twice. Banned names are omitted. Premium is allowed if they pay it.

What the user pays for the first year:

- Credit plans, when the hit has `priceMillicredits`: that many millicredits ((ceil(registrar quote x 1.03) + 1) x 50 credits, first year, in whole dollars at 50 credits per dollar: a $10.40 quote is $12, 600 credits). `renewalPriceMillicredits`, when present, is the yearly renewal.
- Exempt workspaces, or a hit without `priceMillicredits`: `price` at Stripe checkout, in dollars (`price.amount` / 100). It already includes Kenso's markup, so add nothing to it.

Show name, the first-year price, and Google/Microsoft availability flags. Do not put Google inboxes on a name that is not Google-available.

## 6. Checkout

Requires Delivery edit access and the billing permission (admins by default). After the user confirms names, platforms, mailbox identities, forwarding URL, and the total:

On a credit plan, the plan's `cost` already prices the cart; re-plan after any change. To check a cart the plan does not hold, price it with `billing(operation="credit-estimates-create", client_id=..., kind="infra", items=[...])` with one `domain_registration` item per distinct registrar quote (`registrarPriceUsd`), `ken_inbox_monthly` for Google/Microsoft mailboxes, and `azure_domain_monthly` for Azure domains. Show `display.summary`. The order needs the registration plus the first month of its inboxes in available credits. If `sufficient` is false, show `display.availability` and shrink the cart or buy credits first.

**Website question (workspaces with domain pages).** Before you order domains, ask the person: "What should people see when they open these domains? A rebuild of your website (recommended) or a redirect to your website?" A rebuild shows a copy of their home page on every one of these domains; a redirect sends visitors to their website, as today. Never choose for them. Pass the answer as `website_mode`: `page` for the rebuild, `redirect` for the redirect. Where domain pages are on, the order is refused without it; in any other workspace, do not ask and leave `website_mode` out. For a workspace member, the operation `outbound-site-get` is listed only where domain pages are on. When `domain_setup(operation="delivery-defaults-get")` returns a `websiteMode` with `source` `stored`, do not ask again: state it as "your saved choice" ("your saved choice is a rebuild of your website") and use it unless the person changes it. `websiteMode` is never derived, so without a stored answer you ask.

Build the order from the plan's `cart` (pass `domains` and `senders` to the plan to get it), and send it as it is: `domain_orders(operation="domain-orders-create", client_id=..., ...)` with the `cart` fields. The cart's platform values are lowercase (`google`, `microsoft`, `azure`); the create operation's full docs list its fields. In a workspace with domain pages, `checkout` is refused because it cannot carry the website answer, so order with `domain-orders-create` there, with `website_mode` from the person's answer or `savedWebsiteMode` (state a saved answer as "your saved choice").

The `checkout` call below is the older path, for a workspace without domain pages when you have no plan `cart`; the field list under it is its shape (uppercase `platform`, `registrar_price_usd`). With a plan `cart`, use `domain-orders-create` above and its fields. Its answer carries `orderId`, `paidWithCredits` and a Stripe link as `url` and `sessionId` (no link when paid with credits). Poll a `checkout` order with `domain_orders(operation="orders_get", order_id=<orderId>)`: `items[].userFacingStatus` until every item is `active`, `actionRequired` or `failed` (in flight: `pending`, `settingUp`, `awaitingClientApproval`), and order `status` 1=Processing, 2=Completed, 3=CompletedWithIssues, 4=ActionRequired. `orders_list` lists those orders (`active_only` defaults true):

`domain_orders(operation="checkout", client_id=..., forwarding_url=..., domains=[...])`

Each domain:

- `name`, `platform` (`GOOGLE` | `MICROSOFT` | `AZURE`; a new order takes `GOOGLE` or `MICROSOFT`, rule 6)
- `registrar_price_usd` from the search registrar quote
- `mailboxes`: `{first_name, last_name, username, profile_picture_url?}`. Google/Microsoft 1-5, Azure 1-50, one platform per domain. Usernames: real name, `first.last` first, no role names

Forwarding URL defaults to the workspace website (add `https://` if missing). A Kenso brand site other than getken.ai (ken.so, getken.dev and the rest) is never a forwarding URL: Kenso's own workspaces use the cold root `https://getken.ai`, and the backend stores any other Kenso brand URL as `https://getken.ai`. The workspace owner email is the catch-all; checkout fails without it.

`domain-orders-create` returns the order as `id`, `status`, `paidWithCredits`, `paidByKenso` and `checkoutUrl`. When `paidWithCredits` is true the order is already paid from credits and has no checkout link. When `paidByKenso` is true (a Kenso staff order for an active Performance workspace, while Kenso-paid Performance orders are on) Kenso paid it, the client is charged nothing and there is no checkout link; an item whose price rose above the quote is not bought and fails. Otherwise `checkoutUrl` is a Stripe checkout link: give them the link. Then poll `domain_orders(operation="get", order_id=<id>)`: each `items[].status` until every item is `active`, `action_required` or `failed` (in flight: `pending`, `setting_up`, `awaiting_client_approval`: paid, waiting for the client to approve in External approvals; the sweep skips it), with `items[].progress.step` for where each domain is in its setup. Order `status`: `processing`, `completed`, `completed_with_issues` or `action_required`. `domain_orders(operation="domain-orders-list")` lists the workspace's orders.

Mailboxes on credit plans: 200 credits ($4) per Google/Microsoft inbox a month; an Azure domain already in the workspace bills 2,500 credits ($50) a month (up to 50 inboxes). On exempt workspaces they are on the plan.

## 7. Present live inventory

| Domain | Status | Notes |
|--------|--------|-------|
| send.example.com | Active | tags / tracking host |

## 8. Mutations on existing domains

Never call `domains(operation="update")` or `delete` until the user confirmed the exact domain_id and fields here. Site redirect: `changes={"redirect_url_404": "https://..."}`; leave MX/SPF/DKIM/DMARC alone. Turning on `click_rate_tracking_enabled` does not publish the click host; that provisioning is a staff step. Every sending domain gets its own click-tracking host, `link.<sending domain>` (deliverability rule 2): on Kenso's nameservers it is set up on its own, and for any other domain the Kenso team sets it up.

## 9. Refusal handling

Surface the envelope `message` plus `refusal.code`, metrics, and `remedy`.

| Code | What to tell the user |
|------|------------------------|
| `PLAN_FEATURE_NOT_AVAILABLE` | Free cannot buy Kenso infrastructure. Connect your own inboxes in the app, or upgrade to Platform at https://app.ken.so/<workspace id>/settings/billing. Show `error.recovery.summary` when present. |
| `INSUFFICIENT_CREDITS` | Not enough credits for the registration plus the first month of the order's inboxes. Show the message (it carries the credits needed and available). Shrink the cart, or buy credits at https://app.ken.so/<workspace id>/settings/billing and retry. Dfy: the Kenso team adds credits. White-label child: ask the parent workspace. |
| `FREE_CREDITS_NOT_ELIGIBLE` | Free and bonus credits can't pay for domains or inboxes, and the bought credits fall short. Show the message (it carries the credits needed, the credits that can pay, and the free part). Buy credits at https://app.ken.so/<workspace id>/settings/billing and retry. Dfy: the Kenso team adds credits. White-label child: ask the parent workspace. |
| `INBOX_LIMIT_REACHED` | Show `used` / `limit` / `remaining`. Rebalance existing mailboxes, or upgrade. |
| "exceeds your daily send capacity" | The cart exceeds remaining daily send on a plan with a hard cap. Shrink it. It is not a mailbox-slot limit. |
| "workspace mailbox cap" / "workspace domain cap" | White-label child at its parent's cap. Shrink the cart or ask the parent workspace to raise it. |

If checkout fails because the cart exceeds the daily send left on a hard cap, show `remaining` from `triggers(operation="sending-capacity-get", client_id=...)`, plan again with `emails_per_day` at `emailsPerDay.existing` plus `remaining`, and order from the new `cart`.

## Boundaries

- Inbox tuning belongs in `inbox-configuration`.
- Sizing against daily send and credits belongs in `infra-planning`.
- Importing owned domains belongs in `connect-domains`.

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
