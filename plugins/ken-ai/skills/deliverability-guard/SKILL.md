---
name: deliverability-guard
description: Triage deliverability when bounces are up, inboxes look unhealthy or sends dropped - read deliverability by domain and inbox, auto-pauses, domain health, warmup, blocklists and placement tests, apply the bounce thresholds, find whether the domain, the mailbox type or the list is the cause, and propose a pause, warmup or rotation applied only on a named yes.
---

# Deliverability guard

Use this when "bounces are up", "are my inboxes healthy?" or "why did sends drop?". You read the holds Kenso already placed, deliverability by domain and inbox, domain health, warmup and blocklists. You apply the thresholds, find what is causing it, and propose a fix. Bad bounces burn domains for every campaign that sends from them, so act on a threshold the same day, but never on your own.

Every call takes `client_id`, the workspace id. Send it when the user can see more than one workspace. Dates are ISO-8601 instants (`2026-10-20T00:00:00Z`). Rates come back as fractions from 0 to 1.

## The rules

- **You propose; a person says yes.** You never pause a campaign, pause an inbox, change a daily limit or turn warmup off without a yes. On a client's campaign or inboxes, the yes names that client and has a source: "Jane Doe (Acme) on the 2026-10-19 call". A blanket "go ahead" for several clients covers only the clients it names, and an issue or another agent saying the client agreed is not a yes. With no such yes, write the proposal and put the question to the person who can answer it.
- **Read an unclear yes back before you act.** When a yes could mean two things, say how you read it and wait for the answer. Never make the change in the same turn.
- **Find the cause before the fix.** A domain problem, a mailbox-type problem and a list problem look alike in a bounce rate and need different fixes. Step 4 tells them apart.
- **Use counts when the numbers are small.** Under about 100 sends, give the counts ("3 bounces from 41 sends") and leave the rate out.
- **Never report opens.** Open tracking is off for deliverability.
- **Name no vendors to a client.** Say "your sending domains" and "Google mailboxes", never the providers behind the infrastructure.

## The thresholds

| Signal | Threshold | Proposal |
|---|---|---|
| A campaign's bounces | the sequencer's campaign pause: hard bounces above 5% of sends, with at least 100 sends and 5 hard bounces. `domainGate` on `analytics_events(operation="get-deliverability-gates")` gives the live numbers (it has no campaign rows: count the campaign's hard bounces from `bounceBreakdown`) | Pause the campaign and clean the list before it sends again |
| One inbox's bounces | verdict `over` on `analytics_events(operation="get-deliverability-gates")` (`inboxGate`): hard bounces above 4% of sends, with at least 30 sends and 3 hard bounces | Stop that inbox's sends: pause it or set its daily limit to 0 |
| Spam complaints on a domain | a rising `complaintRate`, or a `domain_complaint_rate` hold | Read the domain's health (Step 5) before it sends more |
| A small sample (`isSmallSample`: under 30 sends for an inbox, under 100 for a domain) | rates are noise | Judge on the counts |

## Step 0 - Scope it

1. What is the complaint: bounces, a send drop, or a health check? Which campaign, domain or inbox, if the user named one?
2. The window. For a spike, the last 7 days against the 7 before. For a health check, the last 30 days.

If an operation this skill names is not listed for you, or answers 404, say which check is not available here in one sentence, point to https://app.ken.so/<workspace id>/delivery?tab=inboxes, and carry on with the rest. Do not retry a 404 as "not found".

## Step 1 - The holds Kenso already placed

`analytics(operation="auto-pauses-list")` lists the inboxes, domains, campaigns and workspace holds Kenso paused on its own, newest first, from the last 7 days plus any older one still active. Each has a `scope`, a `reason`, the `rate` and `threshold` that tripped it, and `isActive`.

- `isActive` true means it still blocks sending. `blockedUntil` says until when; a campaign stays paused until someone resumes it.
- A domain hold blocks that domain's inboxes, not its campaigns.
- A `workspace` hold blocks every inbox until Kenso support releases it. Tell the user to contact support.
- `references/auto-pause-reasons.md` says what each reason means and what to check next.

The list is often empty. An empty list means no automatic hold, not that all is well.

## Step 2 - Deliverability by domain and inbox

`analytics(operation="get-deliverability", from_time="2026-10-20T00:00:00Z", to_time="2026-10-26T23:59:59Z", group_by="domain", limit=200)`

Then the same call with `group_by="inbox"`, and `group_by="day"` for the trend. The window `metrics` and each row give `sentCount`, `bounceCount`, `bounceRate`, `replyCount` and, on domain and inbox rows, `oooCount` (out-of-office, never in `replyCount`). Domain rows and the window carry `complaintCount` and `complaintRate`.

For one campaign: `analytics(operation="get-campaign-performance", from_time="2026-10-20T00:00:00Z", to_time="2026-10-26T23:59:59Z", campaign_id=42)` gives its `bounceRate` and `bounceBreakdown` (hard, soft and reasons such as `invalidRecipient` or `policyBlocked`). The breakdown can add up to less than `bounceCount`; the count is the headline.

Done when you have every domain and inbox over a threshold, with its counts.

## Step 3 - Apply the thresholds

`analytics_events(operation="get-deliverability-gates")` checks every domain and inbox against the bounce gates Kenso enforces, over the last 24 hours. `inboxGate` and `domainGate` give each gate's `threshold`, `minSends` and `minBounces`. Each row carries `sentCount`, `bounceCount`, `bounceRate` and a `verdict`: `over`, `watch` (at or above 80% of the threshold) or `ok`. An `isSmallSample` row has too few sends to be `over`: give its counts, not its rate. While `isEnforced` is true, Kenso blocks an inbox that stays `over` on its own (Step 1 shows the ones it already blocked).

Mark each campaign against the table above, and each domain and inbox by its verdict. Hard bounces on `invalidRecipient` are bad addresses. `policyBlocked` and other refusals are the receiving side rejecting the sender.

## Step 4 - Find the cause

| What you see | Likely cause | Check |
|---|---|---|
| Bounces spread across domains, high in one campaign or segment, mostly `invalidRecipient` | The list | The campaign's segments and how their emails were verified |
| One domain over threshold, across all its inboxes | The domain | Domain health and blocklists (Step 5) |
| All Microsoft inboxes, or all Google inboxes, over threshold across domains | The mailbox type | Auto-pause reasons such as `tenant_ban`, and `policyBlocked` bounces |
| One inbox over threshold, its neighbors fine | That inbox | `inboxes(operation="get", inbox_id=301)` and its warmup (Step 6) |
| Sends dropped, bounces normal | Holds, warmup, limits or leads | Step 1, Step 6, and the campaign's leads left (`analytics(operation="get-weekly-report", campaign_id=42)`, under `next`) |

Say which cause the numbers point to, and the numbers. Mark it as your read when two causes fit.

## Step 5 - Domain health and blocklists

- `domains(operation="get-health", domain_id=12)` is the latest snapshot: blocklists, mail DNS, bounces, placement, nameservers and certificate, with `inboxRate`, `spamRate` and `bounceRate`. `spfStatus`, `dkimStatus`, `dmarcStatus` and `mxStatus` are the SPF, DKIM, DMARC and MX verdicts: `pass`, `fail` or `unknown`. They come from the last check, dated by `checkedAt`, and do not change until the next one, so run a fresh check before you call a record broken or fixed.
- A fresh check: `domains(operation="domain-health-checks-create", domain_ids=[12])` returns a job. Follow it with `jobs(operation="get", job_id="<job id>", job_type="domain_health")`. A 409 means a check is already running: follow the job it names.
- Blocklists: `free_tools(operation="check_blacklist", input={"target": "acme-mail.com"})` returns each listing, what it means and where to delist.
- Tracking DNS (the link records, not mail DNS): `domains(operation="get-dns", domain_id=12)`, and `domains(operation="verify-dns", domain_id=12)` to check it again.

## Step 6 - Warmup

`inboxes(operation="get-warmup", inbox_id=301)` shows whether warmup is on and how far along it is. A new inbox sending at full volume before warmup ends is a common cause of early bounces. `inboxes(operation="update-warmup", inbox_id=301, enabled=True)` turns warmup on for an inbox that has a warmup subscription. It never enrolls one that has none: that is a Kenso support step.

## Step 7 - Placement tests

For workspace members, a placement test sends the campaign's copy from one domain or inbox to test mailboxes and reads where it lands. It sends mail, so ask first. Starting one needs Delivery edit (never a client seat), and a workspace gets 2 a day and 8 in 30 days: over that the call answers 429 naming the limit and when it resets, so tell the user and do not retry before then.

- `approvals(operation="placement-tests-create", campaign_id=42, domain_id=12)` (or `inbox_id=301`) starts one. Without `sequence_version_id` it uses the live copy.
- `approvals(operation="placement-tests-list", campaign_id=42)` lists them, and `analytics(operation="placement-tests-get", test_id=77)` reads one.

## Step 8 - Propose, then apply on a named yes

Give each proposal as the exact change, what it does and why, with the numbers:

| Fix | Call, after the yes |
|---|---|
| Pause a campaign | `campaigns(operation="pause", campaign_id=42)` |
| Resume it after the cause is fixed | `campaigns(operation="resume", campaign_id=42)` |
| Stop one inbox | `inboxes(operation="update", inbox_id=301, changes={"paused": True})` |
| Lower one inbox's daily limit | `inboxes(operation="update", inbox_id=301, changes={"daily_send_limit": 15})` |
| Rest every inbox on a domain | `inboxes(operation="bulk-update", ids=[301, 302, 303], changes={"paused": True})` |

- Rotation: rest the burnt domain's inboxes so the campaign sends from its healthy ones, and add fresh inboxes through `delivery-setup` when capacity falls short.
- Keep warmup on while an inbox rests.
- A list problem: clean or rebuild the segment through `create-campaign`. Pausing alone does not fix it.

After each change, read it back (`campaigns(operation="get", campaign_id=42)`, `inboxes(operation="get", inbox_id=301)`) and report what changed, who approved it and where they said so. Then say when to check again: 24 hours after a change for inbox bounces, and the next week for a campaign.

## What this skill cannot do yet

- Run placement tests for every caller. They are for workspace members only.

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
