---
name: infra-planning
description: Use when sizing sending domains and inboxes against daily send and credits on a paid plan, or when the user asks how much infrastructure they need.
---

# Infra planning

Size sending infrastructure with the sending plan: the Kenso app and this skill read the same numbers from one calculation. Never invent domains or inboxes that are not already in Kenso. Never say domain registration or Kenso inboxes are free. New domains and Kenso inboxes are paid: in credits on credit plans, through Stripe checkout on exempt workspaces. To connect domains the user already owns, load `connect-domains` (BYOD is live); it connects by nameservers only, with no transfer.

Offer the mailbox types of deliverability rule 6, in the `deliverability-guard` skill's `rules.md` reference: Google, Outlook and SMTP (rule 5 holds the SMTP inbox numbers). SMTP inboxes cannot be ordered yet, so plan and order Google and Outlook. Azure is not one of those types: never propose new Azure domains, and plan around the Azure inboxes a workspace already has.

## 1. Preflight

`billing(operation="billing_subscription", client_id=...)` for planType. If `managedByWorkspace` is set, this is a white-label child: record `caps.mailboxes` and `caps.domains`. Its plan and credits are run by the parent workspace, so send purchase and credit questions there.

Plans that buy Kenso infrastructure, with billing Active or Trialing:

- Credit plans pay in credits: Platform (`planType` Platform, the public plan: 200,000 sends and 5,000 credits a month), Dfy (the Kenso team adds its credits), and grandfathered Starter / Growth / Core.
- VIP (`planType` Premium) is exempt and staff-sold: it pays new domains through Stripe checkout, and mailboxes are on the plan.

Free (or `PLAN_FEATURE_NOT_AVAILABLE`): Free cannot buy Kenso domains or inboxes. It connects its own inboxes in the app, or upgrades to Platform at https://app.ken.so/<workspace id>/settings/billing (surface `error.recovery.summary` when present). **STOP** any request to add Kenso capacity. You may still list what they have.

## 2. Read current state

- `domains(operation="list", client_id=...)` - domains in this workspace
- `inboxes(operation="list", client_id=...)` - inboxes and daily limits

Both lists page: follow `cursor` while `pagination.hasMore` is true, so the counts cover the whole workspace. Summarize: domain count and names, inbox count and limits. The plan already counts what the workspace has (`emailsPerDay.existing`), so this read is for the summary and for a white-label child's caps. Domains and inboxes page: https://app.ken.so/<workspace id>/delivery?tab=inboxes.

## 3. Size it with the plan

Ask for the goal in one of two terms, then call the plan once per sizing:

- `inboxes(operation="sending-plans-create", people_per_month=1500, emails_per_person=3)` - people to reach a month (`emails_per_person` defaults to 3).
- `inboxes(operation="sending-plans-create", emails_per_day=500)` - emails a day.

Give people or emails a day, not both. The plan adds only what the workspace's current inboxes do not cover (`emailsPerDay.toAdd`). Optional fields: `mix` (shares of `google`, `microsoft`, `azure` that add up to 1), which you pass as `mix={"google": 0.67, "microsoft": 0.33}` when the goal is 2,000 new emails a day or more, so the plan adds no Azure (Google and Outlook 2:1, as rule 6's 50% Google to 25% Outlook), and otherwise only when the user asks; and, only when the user asks, `inboxes_per_domain`, `domains` (names already picked, with `provider`, `kind` `register` or `import`, and `quote_usd_cents` from the domain search) and `senders` (`first_name`, `last_name`, `nickname`). Change the goal or the mix and call it again: never adjust a plan's numbers by hand, and never size in prose. Compute only: a plan buys nothing.

White-label child only (`managedByWorkspace` set): the parent's caps count every inbox and domain in the workspace, connected ones included. Require `currentInboxes + cart inboxes <= caps.mailboxes` and `currentDomains + cart domains <= caps.domains`, with counts from step 2, and pass a `mix` and `inboxes_per_domain` that keep new mailboxes within `caps.mailboxes - currentInboxes` and new domains within `caps.domains - currentDomains`, and call the plan again.

Which rate is which:

- **Planning rate, for sizing:** 25 emails a day per Google or Outlook inbox and 5 a day per Azure inbox. The plan turns the goal into inboxes with these.
- **Sending ceiling, for caps:** the most one inbox may send in a day is 50 for Google and Outlook and 30 for Azure and SMTP. Set an inbox's daily limit up to its ceiling and no higher; never size from a ceiling. An SMTP inbox, Azure included, still sends 5 to 10 a day by rule 5.

Defaults the plan uses without `mix`: below 2,000 new emails a day, Google and Outlook 2:1 and no Azure; at 2,000 or more, 40% Azure, 40% Google, 20% Outlook, which is why you pass `mix` there. Google and Outlook domains take 3 inboxes (1-5 allowed) and every Azure domain is filled to 50 (1-50 allowed, Azure is priced per domain). Checkout `platform` is `GOOGLE` | `MICROSOFT` | `AZURE` and the plan's `cart` carries it.

Daily send is the only plan limit on Kenso mailboxes: `kenMailboxSlots` is a display figure and does not cap mailbox count, so never clamp to it. Do not compute `emailLimit / 30`.

Plan caps: `limits.planDailyEnforced` true, or the field is missing: the plan's daily send is a hard cap, which the plan itself does not check. Read `remaining`, the daily send left, from `triggers(operation="sending-capacity-get", client_id=...)` (a read, like the plan): with `remaining` 0 add nothing, and keep `emailsPerDay.toAdd` within `remaining` (plan again with `emails_per_day` at `emailsPerDay.existing` plus `remaining`). `planDailyEnforced` false (credit plans): the plan's daily send is a planning figure and credits are the limit. Hard-block a cart that the plan says exceeds the daily send or a white-label cap (checkout refuses it with "exceeds your daily send capacity"); on a credit plan only a white-label cap and credits block.

## 4. Quote the plan

Read these fields from the response and quote them as the plan gives them:

| Say | Field |
|---|---|
| Emails a day, now and after | `emailsPerDay` (`target`, `existing`, `toAdd`) |
| The lines | `lines`: domains, inboxes and emails a day per provider |
| Cost a month | `cost.monthly`: `credits` and dollars (`usd`) |
| Due today | `cost.dueToday`: `credits` and dollars (`usd`), the Kenso domains' first year (`cost.registration`) and their inboxes' first month. When `dueTodayIsEstimate` is true the registrar quotes are estimated: say so, and give exact figures after the domain search |
| Due on connect | `cost.dueOnConnect`: `credits` and dollars (`usd`), the first month of the inboxes on domains the user owns. Nothing is charged at import, but the import is refused unless the balance covers it, and it is charged when each domain is set up |
| Credits short | `balance.shortfallCredits` (`cost.dueToday` plus `cost.dueOnConnect`, less the paid credits; with domains chosen, only for the domains the carts hold); `balance.packsToBuy` packs at `balance.packsUsd` dollars |
| Exempt from credits | `balance.creditsExempt`: when true, quote only `cost.registration` (see below) |
| What the order costs | `cartCost`, the same fields as `cost` for the domains in `cart` and `importCart`. With `unfilled_slots` in `warnings`, the carts hold `unfilledSlots` fewer domains than the plan's `totals.domains` |
| When | `timeline.startsSendingAt` and `timeline.fullVolumeAt` |
| Cut by the limits | `capped`: when true the new-payer limits trimmed the plan; show `warnings` |
| Would checkout refuse it now | `limits.refusal` (`code`, `message`), and `limits.canBuy` |

Show credits and dollars together ("2,200 credits, $44"), as the plan returns them. Dollars are each amount's `usd` (`"44.00"` is $44) and `balance.packsUsd`. `usdCents` and `packsUsdCents` are US cents (`4400` is $44, divide by 100), never dollars: never quote them as dollars. Credits are 50 to the dollar, so an amount's `usd` is its `credits` divided by 50. Read the timeline from `timeline`: warmup is not a fixed number of weeks. Full volume is mailboxes ramping at 5 a day, plus 2 per sending day, up to 30: about 13 sending days after sending starts.

Once domains are chosen, quote the order at `cartCost`, not `cost`: `cost` prices every domain the plan needs, `cartCost` only the domains the carts hold. With `unfilled_slots` in `warnings`, say the order covers fewer domains than the goal needs (`unfilledSlots` of `totals.domains`) and so sends less, and offer more names (plan again with them) before the order.

`canBuy` reflects the workspace, not the caller's seat: a Viewer or Client seat can read the plan and is refused at checkout. The plan does not repeat the member monthly credit limit, the Premium daily limit or a white-label child's caps, so handle a checkout refusal after a plan said `canBuy`. `canBuy` is true with refusal `INSUFFICIENT_CREDITS` or `FREE_CREDITS_NOT_ELIGIBLE`: a credit pack clears both.

Credit prices, for reference only (the plan already applies them; 50 credits per dollar):

| Item | Credits |
|------|---------|
| Google / Outlook inbox | 200 credits ($4) per inbox a month |
| Azure domain already in the workspace (up to 50 inboxes; not offered for new orders) | 2,500 credits ($50) per domain a month |
| Domain registration | (ceil(registrar quote x 1.03) + 1) x 50 credits, first year upfront (a $10.40 quote is $12, 600 credits) |
| Credit pack | 1,000 credits for $20; at most 10 packs per checkout (fewer while the new-payer checkout cap applies, see section 5) |

Exempt workspaces skip credits: they pay each domain's price as the domain search shows it (it already includes Kenso's markup) for one year at Stripe checkout, and mailboxes are on the plan.
The plan marks them with `balance.creditsExempt` true. For them quote only what the order charges today, the registrations (`cost.registration`, or `cartCost.registration` once domains are chosen). Never quote the inboxes' monthly credits (`cost.monthly`, `cost.dueOnConnect`) and never ask them to buy credit packs: `balance.shortfallCredits` is always 0 for them.

## 5. Limits for new payers

State these when the plan is `capped`, when `limits.refusal` is a new-payer code, or when the user asks how much they can order:

- Until a workspace has 14 days of paid history, it can have at most **3 domains and 10 inboxes**, and Azure inboxes count toward the 10.
- Until it has 30 days of paid history, it can order at most **$2,400 a week**, and a checkout is capped (5,000 credits at the current setting: quote `limits.maxCreditsPerCheckout` and the refusal message from the plan, not this number).
- The rest is never ordered automatically. The plan shows what fits today; the user orders the next part once the limit lifts, or asks the Kenso team.

Do not move, waive or work around these limits: read them from the plan and report them.

## 6. Hand off

- Build the order from the plan's `cart`, or inspect names and search: load `domain-selection`.
- Connect domains the user already owns, with the plan's `importCart`: load `connect-domains` (BYOD is live).
- Connect mailboxes the user already has: `delivery-setup`.
- In a workspace with domain pages, buying or importing asks the website question first (`domain-selection`, `connect-domains`): "What should people see when they open these domains? A rebuild of your website (recommended) or a redirect to your website?" The answer is the person's, never yours.
- Limits, display names, signatures on existing inboxes: load `inbox-configuration`.

## Refusal handling

Surface the normalized envelope fields (`refusal` object + message).

| Code | What to tell the user |
|------|------------------------|
| `PLAN_FEATURE_NOT_AVAILABLE` | Free cannot buy Kenso infrastructure. Connect your own inboxes in the app, or upgrade to Platform at https://app.ken.so/<workspace id>/settings/billing. Show `error.recovery.summary` when present. |
| `INSUFFICIENT_CREDITS` | Not enough credits for the order. Show the message (it carries the credits needed and available). Shrink the cart, or buy credits at https://app.ken.so/<workspace id>/settings/billing and retry. Dfy: the Kenso team adds credits. White-label child: ask the parent workspace. |
| `FREE_CREDITS_NOT_ELIGIBLE` | Free and bonus credits can't pay for domains or inboxes, and the bought credits fall short. Show the message (it carries the credits needed, the credits that can pay, and the free part). Buy credits at https://app.ken.so/<workspace id>/settings/billing and retry. Dfy: the Kenso team adds credits. White-label child: ask the parent workspace. |
| `NEW_PAYER_DOMAIN_LIMIT` / `NEW_PAYER_MAILBOX_LIMIT` | The new-payer limit (3 domains and 10 inboxes until 14 days of paid history). Show the message, order what fits and leave the rest for later. |
| `UPGRADE_REQUIRED` / `PAID_PLAN_REQUIRED` | Same as the Free plan: Free cannot buy Kenso infrastructure. Connect your own inboxes in the app, or upgrade to Platform at https://app.ken.so/<workspace id>/settings/billing. |
| `DISPUTE_HOLD` | The workspace has a payment dispute on hold. Do not order: the Kenso team resolves it. |
| `FIRST_PAYMENT_PENDING` | The first payment has not cleared yet. Wait for it to clear, then plan again. |
| `INBOX_LIMIT_REACHED` | Show metrics. Offer upgrade or rebalance limits on existing inboxes. |
| "exceeds your daily send capacity" | The cart exceeds remaining daily send on a plan with a hard cap. Shrink it. It is not a mailbox-slot limit. |
| "workspace mailbox cap" / "workspace domain cap" | White-label child at its parent's cap. Shrink the cart or ask the parent workspace to raise it. |

If no daily send is left on a hard cap, say so from the plan. Offer to work with existing infrastructure.

## Boundaries

- `domains` writes here: `update` / `delete` only after explicit user approval (needs Delivery edit access). Search and checkout live in `domain-selection`. Import is `connect-domains`.
- Connecting mailboxes the user already has is `delivery-setup`, not this skill.

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
