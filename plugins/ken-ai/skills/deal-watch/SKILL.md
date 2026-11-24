---
name: deal-watch
description: Go through the open deals Ken flagged for you - why each needs you, the facts behind it with their sources, Ken's suggestion - and snooze, dismiss or act on each one on the user's word.
---

# Deal watch

Every weekday morning Kenso checks each rep's open deals and sends them the few that need them (in Slack, or by email), each with two or three facts, one suggestion and what Ken already did. Between mornings Ken pings only when a buyer on an open deal says no or pushes back. This skill reads the same items, so a rep can go through them here.

Trigger on "what deals need me?", "what did Ken flag?", "why did Ken flag this deal?", or "go through my deal watch".

## The rules

- **Only the user's own items.** `deal_watch` answers only the caller's own items, in one workspace. Never present them as the team's pipeline.
- **Never invent a fact.** Say only what an item holds: its facts, each with its source, its suggestion and what Ken did. Do not add a reason, a date, an amount or a quote that is not in the item. When you want more, read the deal or its account first and say where the new detail came from.
- **Nothing changes without the user's word.** Snooze, dismiss, a deal update or a new task happens only when the user asks for it, one item at a time unless they ask for a batch.

Every call takes `client_id`, the workspace id. Send it on every call when the user can see more than one workspace.

## Step 1 - List the open items

`deal_watch(operation="list", client_id=...)`

- Open items are the ones in front of the user now: sent or ready, and snoozed ones whose snooze ended, from the last 7 days. `state="all"` adds the ones they acted on, snoozed or dismissed. `opportunity_id=9001` keeps one deal's items ("why did Ken flag this deal?").
- No items: only when `data` is empty and `pagination.hasMore` is false, say "Ken has nothing for you on your deals right now." and stop. An empty page with `hasMore` true is not the end (an item whose deal closed drops out of its page): call again with `cursor=pagination.nextCursor`.
- `deal_watch` is not listed, or answers 404: Deal watch is not on for this workspace. Say so in one sentence and stop. Do not read the 404 as "nothing to do".

## Step 2 - Say each item

For each item, most urgent first (`tier` 1 before 2 before 3):

1. The deal: `dealName` at `accountName`, its `stageLabel`, `amount` and `currency`, and `closeDate` when set.
2. Why Ken flagged it: `reasonLabel`, then each fact's `text` with its source (`sourceType`, and a link when there is a `linkPath`: an `https` `linkPath` opens as it is; any other is `https://app.ken.so/<workspace id>` with its path replaced by `linkPath`, which already starts with the workspace id). Quote `quote` only when the item carries it.
3. Ken's `suggestion`, in Ken's words.
4. What Ken already did: each `kenDid` row's `text`, and whether it was undone (`undone`).

Keep each item to a few lines. When there are many, show the first five and ask whether to go on.

## Step 3 - Offer what the user can do

For each item, offer these, and run only the one the user picks:

- **Snooze for 7 days:** `deal_watch(operation="snooze", client_id=..., item_id=812)`.
- **Dismiss as not useful,** with the user's reason: `deal_watch(operation="dismiss", client_id=..., item_id=812, reason="not_useful", note="Already talking to their CFO")`. Ken then stops flagging that reason for them for 30 days. `reason="not_urgent"` says the deal can wait; `reason="dismiss"` just clears it.
- **Act on the deal** with the deal and task tools: read it with `opportunities(operation="get", opportunity_id=9001)`, change it with `opportunities(operation="update", opportunity_id=9001, changes={"next_step": "Send the redlines to Priya"})` on the user's yes, or add a task with `tasks(operation="create", title="Call Priya about the redlines", opportunity_id=9001)`. An item's `actions` name what Ken suggests (draft an email to `personName`, create the task `taskTitle`, move the close date to `closeDate`); offer them as ideas, never as done.

After a snooze or a dismiss, say what the answer shows (`state`, and `snoozedUntil` after a snooze). A `404` means the item is not the user's or is gone; a `409` `invalid_state` gives the reason in its message: say it.

Undo of something Ken did, a drafted email and moving the close date from an item stay in Slack and the morning email.

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
