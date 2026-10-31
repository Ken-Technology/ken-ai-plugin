---
name: domain-selection
description: Use when reviewing sending domains or ordering new ones on a paid workspace, paid in credits or through Stripe checkout.
---

# Domain selection

Review live sending domains. On a paid plan, search names and order them. Credit plans pay registration and inboxes in credits; exempt workspaces pay the search hit `price` for one year through Stripe checkout. Never present names as ordered before the order is paid. To import domains the user already owns, load `connect-domains` (BYOD is live).

## 1. Paid plan, credits, and capacity

Before any search or order:

1. `billing(operation="billing_subscription", client_id=...)`. Plans that buy Kenso domains, with billing Active or Trialing: Platform (`planType` Platform), Dfy, grandfathered Starter / Growth / Core (all credit plans), and VIP (`planType` Premium, exempt). If Free, or `PLAN_FEATURE_NOT_AVAILABLE`, stop adds: Free cannot buy Kenso domains or inboxes and connects its own inboxes in the app, or upgrades to Platform at https://app.ken.so/<workspace id>/settings/billing; show `error.recovery.summary` when present. If `managedByWorkspace` is set (white-label child), record `caps.mailboxes` and `caps.domains`; its credits are run by the parent workspace.
2. `billing(operation="credits-get", client_id=...)`. Record `exempt` and `display.available`.
3. `domain_orders(operation="purchase-capacity", client_id=...)`. Read `remaining`, `planDaily`, `planDailyEnforced`, `existingCapacity`, `emailLimit`. `planDaily` is emails/day. Do not compute `emailLimit / 30`.
4. `planDailyEnforced` true, or missing: daily send is a hard cap. If `remaining` is 0, stop new orders and work with existing domains. `planDailyEnforced` false (credit plans): `remaining` is a planning figure, and credits are the limit.

Mailbox count on a hard cap is `remaining` / per-inbox daily (Google/Microsoft 25, Azure 5). Daily send is the plan limit: `kenMailboxSlots` does not cap mailbox count, so never clamp to it. White-label child only: the caps count every inbox and domain in the workspace, connected ones included. Count them with `inboxes(operation="list", client_id=...)` and `domains(operation="list", client_id=...)` (follow `cursor` while `pagination.hasMore` is true), then require `current + cart` within `caps.mailboxes` and `caps.domains`. Otherwise there is no domain-count allowance.

## 2. Naming rules (advice only)

- Never cold-send from the naked brand or primary company domain.
- Prefer `get{brand}.com`, `try{brand}.com`, `{brand}hq.com`. Short, pronounceable, no hyphens or numbers.
- Search offers `.com`, `.net`, `.org`, `.shop`.

Advice is not an order. Search before claiming a name is free.

## 3. Read existing domains

- `domains(operation="list", client_id=..., limit=...)` - inventory
- `domains(operation="get", domain_id=...)` - one domain
- `domain_setup(operation="get_tags", domain_id=...)` - mailbox tags
- `domains(operation="verify_tracking_dns", domain_id=...)` - only when the user set an open-pixel hostname and asks. It checks the apex record, not the `link.{apex}` click host

Summarize names, status, tracking posture. Domains and inboxes page: https://app.ken.so/<workspace id>/delivery?tab=inboxes.

## 4. Search

Needs a paid plan, workspace admin (backend FullAccess), and `remaining` > 0 when daily send is a hard cap. Members can read capacity and orders.

`domain_orders(operation="domain-orders-search", client_id=..., keyword=..., tlds=[...], limit=...)`, or `domain=` for an exact FQDN.

Each hit has `price` and a registrar quote, both money objects in minor units (cents). Copy the registrar quote, in dollars, into checkout `registrar_price_usd`. Never send `price` as the registrar quote: the markup would apply twice. Banned names are omitted. Premium is allowed if they pay it.

What the user pays for the first year:

- Credit plans, when the hit has `priceMillicredits`: that many millicredits ((ceil(registrar quote x 1.03) + 1) x 50 credits). `renewalPriceMillicredits`, when present, is the yearly renewal.
- Exempt workspaces, or a hit without `priceMillicredits`: `price` at Stripe checkout. It already includes Kenso's markup, so show it as is.

Show name, the first-year price, and Google/Microsoft availability flags. Do not put Google inboxes on a name that is not Google-available.

## 5. Checkout

Requires workspace admin (backend FullAccess). After the user confirms names, platforms, mailbox identities, forwarding URL, and the total:

On a credit plan, price the cart first: `billing(operation="credit-estimates-create", client_id=..., kind="infra", items=[...])` with one `domain_registration` item per distinct registrar quote (`registrarPriceUsd`), `ken_inbox_monthly` for Google/Microsoft mailboxes, and `azure_domain_monthly` for Azure domains. Show `display.summary`. The order needs the registration plus the first month of its inboxes in available credits. If `sufficient` is false, show `display.availability` and shrink the cart or buy credits first.

**Website question (workspaces with domain pages).** Before you order domains, ask the person: "What should people see when they open these domains? A rebuild of your website (recommended) or a redirect to your website?" A rebuild shows a copy of their home page on every one of these domains; a redirect sends visitors to their website, as today. Never choose for them. Pass the answer as `website_mode`: `page` for the rebuild, `redirect` for the redirect. Where domain pages are on, the order is refused without it; in any other workspace, do not ask and leave `website_mode` out. For a workspace member, the operation `outbound-site-get` is listed only where domain pages are on.

In a workspace with domain pages, `checkout` is refused because it cannot carry the answer. Order there with `domain_orders(operation="domain-orders-create", client_id=..., forwarding_url=..., website_mode=..., domains=[...])`; each domain carries its name, platform, mailboxes and the search hit's registrar quote as is (the operation's full docs list the fields).

`domain_orders(operation="checkout", client_id=..., forwarding_url=..., domains=[...])`

Each domain:

- `name`, `platform` (`GOOGLE` | `MICROSOFT` | `AZURE`)
- `registrar_price_usd` from the search registrar quote
- `mailboxes`: `{first_name, last_name, username, profile_picture_url?}`. Google/Microsoft 1-5, Azure 1-50, one platform per domain. Usernames: real name, `first.last` first, no role names

Forwarding URL defaults to the workspace website (add `https://` if missing). The workspace owner email is the catch-all; checkout fails without it.

Returns `orderId`. When `paidWithCredits` is true the order is already paid from credits and has no checkout link. Otherwise it returns `url` and `sessionId`: give them `url` (Stripe checkout). Then `domain_orders(operation="orders_get", order_id=...)`. Poll `items[].userFacingStatus` until every item is `active`, `actionRequired`, or `failed` (in flight: `pending`, `settingUp`, `awaitingClientApproval`: paid, waiting for the client to approve in External approvals; the sweep skips it). Order `status`: 1=Processing, 2=Completed, 3=CompletedWithIssues, 4=ActionRequired. `orders_list` shows in-flight orders (`active_only` defaults true).

Mailboxes on credit plans: 200 credits ($4) per Google/Microsoft inbox a month and 2,500 credits ($50) per Azure domain a month (up to 50 inboxes). On exempt workspaces they are on the plan.

## 6. Present live inventory

| Domain | Status | Notes |
|--------|--------|-------|
| send.example.com | Active | tags / tracking host |

## 7. Mutations on existing domains

Never call `domains(operation="update")` or `delete` until the user confirmed the exact domain_id and fields here. Site redirect: `changes={"redirect_url_404": "https://..."}`; leave MX/SPF/DKIM/DMARC alone. Turning on `click_rate_tracking_enabled` does not publish the click host; that provisioning is a staff step.

## 8. Refusal handling

Surface the envelope `message` plus `refusal.code`, metrics, and `remedy`.

| Code | What to tell the user |
|------|------------------------|
| `PLAN_FEATURE_NOT_AVAILABLE` | Free cannot buy Kenso infrastructure. Connect your own inboxes in the app, or upgrade to Platform at https://app.ken.so/<workspace id>/settings/billing. Show `error.recovery.summary` when present. |
| `INSUFFICIENT_CREDITS` | Not enough credits for the registration plus the first month of the order's inboxes. Show the message (it carries the credits needed and available). Shrink the cart, or buy credits at https://app.ken.so/<workspace id>/settings/billing and retry. Dfy: the Kenso team adds credits. White-label child: ask the parent workspace. |
| `FREE_CREDITS_NOT_ELIGIBLE` | Free and bonus credits can't pay for domains or inboxes, and the bought credits fall short. Show the message (it carries the credits needed, the credits that can pay, and the free part). Buy credits at https://app.ken.so/<workspace id>/settings/billing and retry. Dfy: the Kenso team adds credits. White-label child: ask the parent workspace. |
| `INBOX_LIMIT_REACHED` | Show `used` / `limit` / `remaining`. Rebalance existing mailboxes, or upgrade. |
| "exceeds your daily send capacity" | The cart exceeds remaining daily send on a plan with a hard cap. Shrink it. It is not a mailbox-slot limit. |
| "workspace mailbox cap" / "workspace domain cap" | White-label child at its parent's cap. Shrink the cart or ask the parent workspace to raise it. |

If checkout fails because remaining is too small on a hard cap, show `remaining` and shrink the cart.

## Boundaries

- Inbox tuning belongs in `inbox-configuration`.
- Sizing against daily send and credits belongs in `infra-planning`.
- Importing owned domains belongs in `connect-domains`.

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
