---
name: infra-planning
description: Use when sizing sending domains and inboxes against daily send and credits on a paid plan, or when the user asks how much infrastructure they need.
---

# Infra planning

Review existing sending domains and inboxes, then size a cart against daily send and credits. New domains and Kenso inboxes are paid: in credits on credit plans, through Stripe checkout on exempt workspaces. Never invent domains or inboxes that are not already in Kenso. Never say domain registration or Kenso inboxes are free. To import domains the user already owns, load `connect-domains` (BYOD is live).

## 1. Preflight

`billing(operation="billing_subscription", client_id=...)` for planType. If `managedByWorkspace` is set, this is a white-label child: record `caps.mailboxes` and `caps.domains`. Its plan and credits are run by the parent workspace, so send purchase and credit questions there.

Plans that buy Kenso infrastructure, with billing Active or Trialing:

- Credit plans pay in credits: Platform (`planType` Platform, the public plan: 200,000 sends and 5,000 credits a month), Dfy (the Kenso team adds its credits), and grandfathered Starter / Growth / Core.
- VIP (`planType` Premium) is exempt and staff-sold: it pays new domains through Stripe checkout, and mailboxes are on the plan.

Free (or `PLAN_FEATURE_NOT_AVAILABLE`): Free cannot buy Kenso domains or inboxes. It connects its own inboxes in the app, or upgrades to Platform at https://app.ken.so/<workspace id>/settings/billing (surface `error.recovery.summary` when present). **STOP** any request to add Kenso capacity. You may still list what they have.

Then `billing(operation="credits-get", client_id=...)`. Record `exempt` and `display.available`. An exempt workspace (VIP, or one Kenso exempts) does not pay credits.

Then `domain_orders(operation="purchase-capacity", client_id=...)`. Record `planDaily`, `planDailyEnforced`, `existingCapacity`, `remaining`, `emailLimit`, and per-platform counts.

- `planDailyEnforced` true, or the field is missing: `planDaily` is a hard cap. If `remaining` is 0, stop new orders.
- `planDailyEnforced` false (credit plans): `planDaily` is a planning figure. A cart may go above it; credits are the limit.

There is no domain-count allowance.

## 2. Read current state

- `domains(operation="list", client_id=...)` - domains in this workspace
- `inboxes(operation="list", client_id=...)` - inboxes and daily limits

Both lists page: follow `cursor` while `pagination.hasMore` is true, so the counts cover the whole workspace. Summarize: domain count and names, inbox count and limits, remaining daily emails. Domains and inboxes page: https://app.ken.so/<workspace id>/delivery?tab=inboxes.

## 3. Size a cart

`planDaily` is emails/day; read it from capacity. Do not compute `emailLimit / 30`.

New-inbox daily: Google (`GOOGLE`) or Microsoft (`MICROSOFT`) **25/day**, Azure (`AZURE`) **5/day**.

`cartCapacity = googleCount*25 + microsoftCount*25 + azureCount*5`

Hard cap (`planDailyEnforced` true or missing):

- Google/Microsoft: `floor(remaining / 25)`
- Azure: `floor(remaining / 5)`
- Require `existingCapacity + cartCapacity <= planDaily`.

Credit plans (`planDailyEnforced` false): size from the daily volume the user wants. `remaining` is guidance; the credit estimate below is the gate.

Daily send is the only plan limit on Kenso mailboxes. `kenMailboxSlots` is a display figure and does not cap mailbox count, so never clamp to it.

White-label child only (`managedByWorkspace` set): the parent's caps count every inbox and domain in the workspace, connected ones included. Require `currentInboxes + cart inboxes <= caps.mailboxes` and `currentDomains + cart domains <= caps.domains`, with counts from step 2.

Hard-block carts that exceed remaining daily send or a white-label cap. On a credit plan, only the white-label cap and credits block.

Starting mix (easy to change): about 40% Azure / 40% Google / 20% Microsoft of daily volume. On a white-label child, clamp that mix to `caps.mailboxes - currentInboxes` and pack so new domains stay within `caps.domains - currentDomains`. Then 3 inboxes per Google/Microsoft domain (clamp 1-5) and 50 per Azure domain (clamp 1-50; Azure is priced per domain, so fill each one). Checkout `platform` is `GOOGLE` | `MICROSOFT` | `AZURE`.

Steady-state caps: healthy inboxes 30-50/day, new or warming 5-10/day, never above 100/day. Warmup shares the same provider budget as cold. If the target does not fit even at healthy caps, the answer is more mailboxes, not higher caps. Capacity from the API is the source of truth.

## 4. Price the cart (credit plans)

Credit prices:

| Item | Credits |
|------|---------|
| Google / Microsoft inbox | 200 credits ($4) per inbox a month |
| Azure domain (up to 50 inboxes) | 2,500 credits ($50) per domain a month |
| Domain registration | (ceil(registrar quote x 1.03) + 1) x 50 credits, first year upfront |

`billing(operation="credit-estimates-create", client_id=..., kind="infra", items=[{"action": "ken_inbox_monthly", "quantity": 12}, {"action": "azure_domain_monthly", "quantity": 1}, {"action": "domain_registration", "registrarPriceUsd": 10.40, "quantity": 4}])`

Use one `domain_registration` item per distinct registrar quote (from `domain-selection` search). Show `display.summary` and `display.lines`. Buying needs the registration plus the first month of the order's inboxes in available credits. If `sufficient` is false, show `display.availability` and shrink the cart, or buy credits at https://app.ken.so/<workspace id>/settings/billing (Dfy: the Kenso team adds credits; white-label child: ask the parent workspace).

Exempt workspaces skip this step: they pay the search hit `price` (in cents; show dollars) per domain at Stripe for one year (it already includes Kenso's markup), and mailboxes are on the plan.

## 5. Hand off

- Inspect names or tags, search, or buy: load `domain-selection`.
- Import owned domains: load `connect-domains` (BYOD is live).
- In a workspace with domain pages, buying or importing asks the website question first (`domain-selection`, `connect-domains`): "What should people see when they open these domains? A rebuild of your website (recommended) or a redirect to your website?" The answer is the person's, never yours.
- Limits, display names, signatures on existing inboxes: load `inbox-configuration`.

## Refusal handling

Surface the normalized envelope fields (`refusal` object + message).

| Code | What to tell the user |
|------|------------------------|
| `PLAN_FEATURE_NOT_AVAILABLE` | Free cannot buy Kenso infrastructure. Connect your own inboxes in the app, or upgrade to Platform at https://app.ken.so/<workspace id>/settings/billing. Show `error.recovery.summary` when present. |
| `INSUFFICIENT_CREDITS` | Not enough credits for the order. Show the message (it carries the credits needed and available). Shrink the cart, or buy credits at https://app.ken.so/<workspace id>/settings/billing and retry. Dfy: the Kenso team adds credits. White-label child: ask the parent workspace. |
| `FREE_CREDITS_NOT_ELIGIBLE` | Free and bonus credits can't pay for domains or inboxes, and the bought credits fall short. Show the message (it carries the credits needed, the credits that can pay, and the free part). Buy credits at https://app.ken.so/<workspace id>/settings/billing and retry. Dfy: the Kenso team adds credits. White-label child: ask the parent workspace. |
| `INBOX_LIMIT_REACHED` | Show metrics. Offer upgrade or rebalance limits on existing inboxes. |
| "exceeds your daily send capacity" | The cart exceeds remaining daily send on a plan with a hard cap. Shrink it. It is not a mailbox-slot limit. |
| "workspace mailbox cap" / "workspace domain cap" | White-label child at its parent's cap. Shrink the cart or ask the parent workspace to raise it. |

If remaining is 0 on a hard cap, say so from the capacity payload. Offer to work with existing infrastructure.

## Boundaries

- `domains` writes here: `update` / `delete` only after explicit user approval (admin). Search and checkout live in `domain-selection`. Import is `connect-domains`.
- Connecting external inboxes / OAuth is a dashboard flow, not this skill.

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
