---
name: inbox-configuration
description: Use when tuning existing sending inboxes (daily limits, display names, signatures, reply forwarding, warmup pause/resume). New domains go through infra-planning and domain-selection.
---

# Inbox configuration

Tune existing sending inboxes with the `inboxes` facade. New domains and inboxes are sized in `infra-planning` and ordered in `domain-selection`.

Never call inbox create or disconnect. Restate any update / bulk-update / rename / warmup change as a short summary and get a yes before mutating. Writes need Delivery edit access (owners, admins and editors by default).

## 1. Read state

- `inboxes(operation="list", client_id=...)` - inventory (optional `status`)
- `inboxes(operation="get", inbox_id=...)` - one inbox

Summarize per inbox: address, domain, daily limit, display name. The inboxes page is https://app.ken.so/<workspace id>/delivery?tab=inboxes.

## 2. Daily limits

- Healthy, warmed Google and Outlook inboxes: **30-50/day**
- SMTP inboxes, Azure inboxes included, follow deliverability rule 5 (the `deliverability-guard` skill's `rules.md` reference): **5-10/day**, and a new one starts at 5. Never suggest more than 10, though the product lets them go to 30
- New or still warming: **5-10/day**, ramp over 2-3 weeks
- Never suggest **more than an inbox's ceiling**: 50/day for Google and Outlook, 30/day for Azure and SMTP. A higher value is capped at the ceiling
- `0` pauses that inbox. No explicit limit means the planning rate (Google and Outlook 25, Azure 5): that is what capacity is sized with, not the ceiling

Leave create-time limits unless the user asks. Do not raise limits on a domain that is still setting up.

After the user approves a number:
`inboxes(operation="update", inbox_id=..., changes={"daily_send_limit": 40})`.
For many: `inboxes(operation="bulk-update", ids=[...], changes={"daily_send_limit": 40})`. Only fields in `changes` are sent.

Give one sentence on why the limit protects deliverability. Warmup shares the same provider budget, so leave room for it.

## 3. Display names

`inboxes(operation="update", inbox_id=..., changes={"first_name": ..., "last_name": ..., "display_name": ...})`, with only the names you change. Instant and safe. Bulk-update cannot set display names.

## 4. Signatures

- `inboxes(operation="update", inbox_id=..., changes={"signature": ...})`
- `inboxes(operation="bulk-update", ids=[...], changes={"signature": ...})`

Use the documented double-brace sender tokens in the HTML (substituted at send time). Preview the HTML first. A signature is plain text, or HTML that is reduced on save to bold, italic, links and line breaks (at most 10,000 characters); a link to a Kenso domain is refused.

New mailboxes get the workspace signature default: read it with `domain_setup(operation="delivery-defaults-get")` (`signatureHtml`) and change it with `domain_setup(operation="delivery-defaults-update", signature_html="...")`, or empty it with `clear=["signature_html"]` (a blank value is refused). A default changes only mailboxes added after it: mailboxes that already exist keep their own signature until you update them here.

## 5. Usernames (rename)

`inboxes(operation="rename", inbox_id=..., local_part="jane.doe")` changes the part of the address before the `@` on an inbox Kenso bought, and the domain stays. Public, with Delivery edit access, and after a yes: restate the old and the new address first. `local_part` is the username only (no `@`, no domain), lowercase, built the way `connect-domains` `references/usernames.md` says.

The mail provider renames the mailbox first, then Kenso changes the inbox's address and reconnects its sending connection. The answer is `{inbox, reconnected, warnings}`: `warnings` lists follow-up steps that did not finish while the rename itself succeeded. Renaming to the current username changes nothing. Refusals: 409 `invalid_state` (not an inbox Kenso bought), 409 `conflict` with `address_in_use` (another live inbox has that address), 400 `validation_failed` on `localPart` (invalid, or `provider_rejected` with the provider's message) and 503 `service_unavailable` (the provider did not answer: nothing changed, retry later). Names and display names are `update`, not rename.

## 6. Reply forwarding and warmup

Forward to the client's own external email only:
`inboxes(operation="update", inbox_id=..., changes={"forwarding_destination": ...})`, or `bulk-update` with `ids`. Details, plus warmup status and pause/resume: `references/forwarding-and-warmup.md`.

## 7. Boundaries

- **Tuning existing inboxes**: this skill.
- **New inboxes / domains**: `infra-planning`, then `domain-selection`. Do not promise a free domain.
- **Connecting mailboxes**: `delivery-setup`. A CSV import of SMTP inboxes applies a row's `firstName`, `lastName` and `dailySendLimit` as it connects each mailbox, and an import limit above the provider ceiling is stored at the ceiling.
- **Username changes**: `inboxes` `rename`, in place on the same mailbox, never a replacement purchase.

## Refusal handling

`INBOX_LIMIT_REACHED` is the most common here.

| Code | What to tell the user |
|------|------------------------|
| `PLAN_FEATURE_NOT_AVAILABLE` | Managed sending infrastructure is on paid plans - upgrade at https://app.ken.so/<workspace id>/settings/billing. Show `error.recovery.summary` when present. |
| `INBOX_LIMIT_REACHED` | Show `used` / `limit` / `remaining`. Offer: stay within remaining allocation (or rebalance limits), or upgrade. |

If they need more daily send than they have, load `infra-planning`. When headroom is zero, help them get more from existing inboxes instead of framing it as a system error.

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
