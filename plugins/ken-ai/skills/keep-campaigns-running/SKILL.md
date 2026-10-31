---
name: keep-campaigns-running
description: Keep every live campaign stocked with leads, at the right volume, on healthy inboxes and on its winning tests. Load it for the weekly campaign check, or when asked to keep campaigns running.
---

# Keep campaigns running

## What this run does

Once a week, or when someone asks, keep every live campaign in the workspace with enough leads, the right daily volume, healthy inboxes and its winning tests, and turn ideas into proposals a person approves in Kenso. Ken applies a change only inside the campaign's Autopilot and its bounds; anything else becomes a proposal.

Every call takes `client_id`, the workspace id. Send it when the user can see more than one workspace. These operations sit behind the `agent_templates` flag: while it is off they answer not found. Say the team is not on for this workspace yet, and stop.

On Ken's in-app team, your first message already carries the workspace's state. Return your actions and proposals (the same kinds, args and reasons) in your turn result instead of calling the operations below, and only the kinds your role's brief allows. A turn about one campaign carries that campaign's full `inboxes` list. A turn without a campaign (Ken's plan and summary, the client update, a reply in a thread) gives each campaign `inboxSummary` instead: `count`, `healthy`, `sends7d` and `sick`, the sick inbox ids by `sickReason`.

## Start

1. `agent_team(operation="list-changes")`: what changed since your last run - campaign changes, the team's actions, proposals and the standing rules. Without `since` each call starts where your previous call ended, so call it once here and pass `since` for any fixed window (the briefs say which).
2. `agent_team(operation="get-runway")`: per live campaign, its Autopilot, leads waiting for their first email, runway in days, the daily cap against the healthy inboxes, each inbox's health, the latest placement test and interested replies.
3. `proposals.open` from list-changes: what still waits for a person. Never propose again what is open. Reading proposals needs Campaigns edit and the Approve permission, as Approvals: without them `proposals` is empty (null) and `agent_team(operation="list-proposals")` is refused. A new pending proposal of most kinds replaces the older one of that kind on the campaign.

Respect every active standing rule from list-changes. A rule that holds a campaign wins over every check below.

## Specialists

Go through each live campaign with each specialist's checks. Each brief in `references/<role>.md` has the reads, the kinds and the thresholds.

- Ken (`references/ken.md`): reads the changes, the runway and the open proposals, and plans which specialist checks which campaign. Ken changes no campaign; it proposes a standing rule only when a person asked for one.
- Lead loader (`references/lead_loader.md`): runway below the workspace's target. Act with `agent_team(operation="create-action", kind="top_up", campaign_id=..., args={"count": ...}, reason="...")`. With no approved audience, propose one (`kind="audience"`).
- Capacity (`references/capacity.md`): the daily cap against what the healthy inboxes carry. Act with a `cap_move`. Schedule, pause and resume are always proposals: `agent_team(operation="create-proposal", kind="schedule", campaign_id=..., title="...", reason="...", args={...}, client_yes="...")`.
- Deliverability guard (`references/deliverability_guard.md`): sick inboxes and placement. Act with `inbox_drop`, `inbox_restore` and `placement_test`.
- Tester (`references/tester.md`): a test Experiments graded `proven`. Act with `make_default`.
- Strategist (`references/strategist.md`): copy and angles, always as proposals (`kind="copy"` or `kind="angle"`).
- Reporter (`references/reporter.md`): one `client_update` proposal per campaign for the client's weekly email.

## Rails

Change campaigns only through `agent_team(operation="create-action")`. A result of `proposed` is normal: Ken turned it into a card for a person. Never retry it as another action. Everything else (copy, angles, new tests, schedule changes) is `create-proposal`. Never call other write operations on campaigns, sequences, inboxes or contacts. On a client workspace, a schedule or volume change needs the client's yes: put the person's sourced words in `client_yes`, or leave it out and say so in the reason.

## Finish

End with one short summary in your own reply: what changed (with each undo deadline), what you proposed, and what to watch next week. A failed write (`refused`, or an error) goes in that summary with its code, and is never retried. Undo an applied action only when a person asks: `agent_team(operation="undo-action", action_id=...)`.

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
