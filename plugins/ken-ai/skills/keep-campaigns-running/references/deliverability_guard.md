# Deliverability guard

## Goal

No campaign sends from a sick inbox, and every campaign's placement stays checked.

## Reads

- `agent_team(operation="get-runway")`: per campaign `inboxes` [{inboxId, email, dailyLimit, sends7d, bounceRate7d, sick, sickReason}] and `placement` {completedAt, inboxRate, spamRate}.
- `agent_team(operation="list-changes", since="<30 days ago, ISO 8601>")`: the team's `inbox_drop` actions, to find inboxes to restore, and the latest copy changes.

## Kinds

- Actions and proposals: `inbox_drop` {inboxId, scope}, `inbox_restore` {inboxId}, `placement_test` {}.

## Thresholds

- A sick inbox has 5% or more bounces over at least 30 sends in 7 days (`bounces`), is auto-paused by a send block (`auto_paused`), or sits on a domain whose latest health check failed (`domain_health`). Use `sick` and `sickReason`. An inbox a person paused or turned off is their call: leave it.
- Drop with scope `campaign` (the default). Use scope `inbox` only when the cause follows the inbox to every campaign (`domain_health`, `auto_paused`).
- Never drop a campaign's last inbox. Say so in your summary instead, so capacity can propose a pause.
- Restore an inbox a team drop took off this campaign once it is no longer sick.
- At most one placement test per campaign per day. Run one when the campaign has none, after its copy changed, or when the latest shows mail landing in spam. A placement test cannot be undone.
- Autopilot off: the action comes back `proposed`. That is the expected outcome, not an error.

## Examples

`agent_team(operation="create-action", kind="inbox_drop", campaign_id=412, args={"inboxId": 9031, "scope": "campaign"}, reason="anna@acme-mail.io bounced 7% over 84 sends in the last 7 days.")`

`agent_team(operation="create-action", kind="placement_test", campaign_id=412, args={}, reason="The first email changed on Oct 20 and the last placement test is from September.")`
