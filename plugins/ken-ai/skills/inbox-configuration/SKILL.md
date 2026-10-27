---
name: inbox-configuration
description: Use when tuning existing sending inboxes (daily limits, display names, signatures, reply forwarding, warmup pause/resume). New domains go through infra-planning and domain-selection.
---

# Inbox configuration

Tune existing sending inboxes with the `inboxes` facade. New domains and inboxes are sized in `infra-planning` and ordered in `domain-selection`.

Never call inbox create, disconnect, or username rename. Restate any update / bulk-update / rename / warmup change as a short summary and get a yes before mutating. Writes need the admin role.

## 1. Read state

- `inboxes(operation="list", client_id=...)` - inventory (optional `status`)
- `inboxes(operation="get", inbox_id=...)` - one inbox

Summarize per inbox: address, domain, daily limit, display name. The inboxes page is https://app.ken.so/delivery?tab=inboxes.

## 2. Daily limits

- Healthy, warmed inboxes: **30-50/day**
- New or still warming: **5-10/day**, ramp over 2-3 weeks
- Never suggest **more than 100/day** per inbox
- `0` pauses that inbox. No explicit limit means the provider default (Google/Microsoft 25, Azure 5)

Leave create-time limits unless the user asks. Do not raise limits on a domain that is still setting up.

After the user approves a number:
`inboxes(operation="update", inbox_id=..., changes={"daily_send_limit": 40})`.
For many: `inboxes(operation="bulk-update", ids=[...], changes={"daily_send_limit": 40})`. Only fields in `changes` are sent.

Give one sentence on why the limit protects deliverability. Warmup shares the same provider budget, so leave room for it.

## 3. Display names

`inboxes(operation="rename_display_name", inbox_id=..., display_name=...)`. Needs at least one of first_name / last_name / display_name. Instant and safe. Bulk-update cannot set display names.

## 4. Signatures

- `inboxes(operation="signature-set", inbox_id=..., signature=...)`
- `inboxes(operation="signature-set_bulk", inbox_ids=[...], signature=...)`

Use the documented double-brace sender tokens in the HTML (substituted at send time). Preview the HTML first.

## 5. Reply forwarding and warmup

Forward to the client's own external email only:
`inboxes(operation="forwarding-set", inbox_id=..., forwarding_type=2, destination=...)` or `forwarding-set_bulk` with `inbox_ids`. Details, plus warmup status and pause/resume: `references/forwarding-and-warmup.md`.

## 6. Boundaries

- **Tuning existing inboxes**: this skill.
- **New inboxes / domains**: `infra-planning`, then `domain-selection`. Do not promise a free domain.
- **Connecting external inboxes / OAuth**: dashboard only.
- **Username changes**: in place on the same mailbox, never a replacement purchase. Not done from this skill.

## Refusal handling

`INBOX_LIMIT_REACHED` is the most common here.

| Code | What to tell the user |
|------|------------------------|
| `PLAN_FEATURE_NOT_AVAILABLE` | Managed sending infrastructure is on paid plans - upgrade at https://app.ken.so/settings/billing. Show `error.recovery.summary` when present. |
| `INBOX_LIMIT_REACHED` | Show `used` / `limit` / `remaining`. Offer: stay within remaining allocation (or rebalance limits), or upgrade. |

If they need more daily send than they have, load `infra-planning`. When headroom is zero, help them get more from existing inboxes instead of framing it as a system error.

## No Ken account yet

These steps run on the Ken MCP server, which signs in with a Ken account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
