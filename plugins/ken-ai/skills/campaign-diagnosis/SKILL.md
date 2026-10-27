---
name: campaign-diagnosis
description: Diagnose a campaign - how it is doing, why replies dropped, or how two campaigns compare. Checks reply classification first, then sending, bounces, human clicks, steps and segments, and proposes one change. Also reads experiment findings.
---

# Campaign diagnosis

This skill answers the three questions people ask most about a campaign: how is it doing, why did replies drop, and how do two campaigns compare. You read the numbers in a fixed order, prove each one is real before you lean on it, and end with one change to try and the reason for it.

This skill only reads. When the fix is a copy change, hand it to `campaign-improvement`. When it is a sending, bounce or inbox problem, hand it to `deliverability-guard`. Both ask the user before they write anything.

Every call takes `client_id`, the workspace id. Send it when the user can see more than one workspace. Dates are ISO-8601 instants (`2026-10-01T00:00:00Z`). Rates come back as fractions from 0 to 1.

## The rules for numbers

- A reply is a person, not a message: every count here is distinct contacts. Out-of-office is not a reply.
- Never report opens. Open tracking is off for deliverability, so open numbers mean nothing.
- Put the counts next to every rate: "2.1% reply rate (21 of 1,004 contacted)". With fewer than about 100 contacted, give the counts and leave the rate out.
- Missing data is N/A, never 0. A metric that did not load is unknown, not zero.
- Clicks are human clicks. Use `clickCount` and the returned `clickRate`. `botClickCount` counts scanners and never shows interest.
- Say what the numbers show first. Then say what you think caused it, and mark that part as your read.

## Step 0 - Find the campaign and the window

1. `campaigns(operation="list", q="Acme")` finds the campaign by name. `campaigns(operation="get", campaign_id=42)` gives its status, schedule and launch date.
2. Pick the window. The default is the last 30 days. For "why did replies drop", compare two windows of the same length: the last 14 days against the 14 days before.

If an operation this skill names is not listed for you, or a campaign the user named answers 404, stop and say: "I can't read that campaign's analytics from here. You can see it in Ken AI at https://app.ken.so/campaigns/<id>." A 404 means the campaign is not in this workspace or the read is not on for you. Do not retry it, and do not tell the user the campaign does not exist.

## Step 1 - Check reply classification first

The interested count is only as good as the classifier behind it, and the classifier has failed silently before: replies arrived for weeks without being classified, so interested counts read near zero while real interest sat in the inbox. Check it before you blame copy or targeting.

`analytics(operation="get-reply-classifications", from_time="2026-10-01T00:00:00Z", to_time="2026-10-27T23:59:59Z", campaign_id=42, by_segment=True)`

`totalCount` is the people who replied and `interestedCount` the positive ones. `counts` splits them by class (`interested`, `not_interested`, `out_of_office`, `automated`, `unclassified` and others), and each person counts once.

- Replies are `totalCount` minus the `out_of_office` count.
- Classification is behind when `unclassified` holds a large share of the replies, or when a campaign that had interested replies shows none for several days while replies keep arriving. Spot-check with `threads(operation="list", campaign_id=42, interest="unclassified", limit=20)` and read a few.
- If classification is behind, stop the diagnosis there. Tell the user the positive-reply numbers for this window are not reliable, give the reply count, and say the Ken AI team needs to look at classification. Do not explain a drop the classifier made.

Done when you know whether the interested count can be trusted.

## Step 2 - Did it send?

`analytics(operation="get-campaign-performance", from_time="2026-10-01T00:00:00Z", to_time="2026-10-27T23:59:59Z", campaign_id=42, group_by="day")`

Read `sentCount` and `contactedCount` by day. Fewer sends come before fewer replies, so a reply drop that follows a send drop is a sending question, not a copy question.

- Status: a paused, completed or errored campaign stops sending. `campaigns(operation="get", campaign_id=42)` says which.
- Holds: `analytics(operation="auto-pauses-list")` lists the inboxes, domains and campaigns Ken AI paused on its own, with the reason and the rate that tripped it. `isActive` true means the hold still blocks sending.
- Leads: `analytics(operation="get-weekly-report", campaign_id=42)` returns `next`, which says how many leads are left and when the last one starts. A campaign with no leads left stops sending.

Hand any sending, hold or inbox problem to `deliverability-guard`.

## Step 3 - Bounces

The same performance read carries `bounceCount`, `bounceRate` and `bounceBreakdown` (hard, soft and the reasons). A bounce rate near 3%, or near 100 bounces, is a list or domain problem that hurts every later send. Take it to `deliverability-guard` before you judge the copy. `analytics(operation="get-deliverability", from_time="2026-10-01T00:00:00Z", to_time="2026-10-27T23:59:59Z", group_by="domain")` shows whether one domain carries the bounces.

## Step 4 - Human clicks

Clicks show that people read past the first lines. Many clicks with few replies points at the call to action or the page behind the link. No clicks on a campaign with links points at the opening or at tracking. Step rows carry raw click volume but no unique clickers, so compare clicks between steps only as volume.

## Step 5 - Steps and segments

- By step: the same performance call with `group_by="step"` shows which email gets the replies. A step with no replies after a few hundred sends is a candidate for `campaign-improvement`.
- By segment: `group_by="segment"`, and the classification read's `bySegment`, show which audience answers. Different segments are different people, so a gap between segments is a targeting finding, not a copy finding.
- By variant (optional): when `analytics_campaign(operation="query")` is listed for you (staff, or the workspace's `generative_ui` flag), `analytics_campaign(operation="query", metrics=["contacted", "replies", "interested", "reply_rate"], group_by=["step", "variant"], filters={"campaignId": [42]}, window={"preset": "last_30_days"})` splits each step by variant. The diagnosis works without it.

## Step 6 - What already changed

Read what was tried before you suggest anything.

- The weekly report's `changed` lists the newest sequence versions, paused or resumed variants and added segments, with their dates.
- When the workspace has experiments on, `analytics(operation="experiments-list", campaign_id=42)` lists findings, including the ones in the `not_working` bucket.

Never suggest an angle the record shows already failed. If the drop lines up with a change, name the change and its date, and keep it a read, not a proof: the leads and the weeks changed too.

## Step 7 - One change, with a hypothesis

Propose one change: what to change, the numbers behind it, and the result that would prove it right ("If the step 2 rewrite works, step 2 gets at least 4 interested replies in the next 600 sends, against 1 in the last 600"). One change at a time, so the next read can credit it.

| Finding | Hand to |
|---|---|
| A weak step, opening or call to action | `campaign-improvement` |
| Sends, bounces, holds, inbox health | `deliverability-guard` |
| One audience answers and another does not | a new segment through `create-campaign` |

A pause, volume or schedule change on a client campaign needs a yes that names that client. Report the order you checked, each finding with its numbers, the change, and when to read the result again.

## Compare two campaigns

When the user names two or three campaigns:

- With experiments on: `analytics(operation="experiments-compare", campaign_ids=[12, 9])`. It returns a readout in proof words. Quote it.
- Otherwise read each one with `get-campaign-performance` over the same window and set them side by side. Their leads differ, so any gap is a hunch: say which campaign got more interested replies per person contacted, with the counts, and never say one won.

## Answer cards

When `answers_show` is listed for you (the workspace's `generative_ui` flag), it shows the diagnosis as a card with charts. Otherwise answer in text from the reads above. It takes a playbook:

- `answers_show(playbook="health_check", campaign_id=42, window={"preset": "last_30_days"})`
- `answers_show(playbook="drop_investigation", campaign_id=42, window={"preset": "last_30_days"})`
- `answers_show(playbook="compare", campaign_ids=[12, 9])` with 2 or 3 ids, the first one the baseline.

It also returns a text summary. Quote its figures as they are. Run Step 1 anyway: the card does not check classification for you.

## Experiments

Every night Ken AI reads what changed in the workspace's campaigns and what the numbers did after, and files each change as a finding with a proof level. When the user asks about tests, findings, a winning version or making a version the default, load `load_skill("campaign-diagnosis", reference="references/experiments.md")` and follow it. Findings need the workspace's `experiments` flag. While it is off, say Experiments are not on for this workspace yet.

The proof level sets your words: below `proven`, never say won, beat, proven or caused about a finding.

## What this skill cannot do yet

- Test significance between two arms. There is no significance helper, so only an experiments finding at `proven` is a winner.
- Count held meetings. Meetings booked are on the performance rows. Meetings held are not tracked yet.
- Split steps by variant for every caller. That read is staff or `generative_ui` only.

## No Ken account yet

These steps run on the Ken MCP server, which signs in with a Ken account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
