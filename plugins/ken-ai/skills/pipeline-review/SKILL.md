---
name: pipeline-review
description: Review the deal pipeline - open opportunities by stage and age, stale deals flagged against real activity, one next action per deal, stage and next-step updates on the user's yes, and a weekly sales update.
---

# Pipeline review

Deals rarely die on a call. They die afterwards, quietly: no next step written down, a close date that passed weeks ago, a nurture pile nobody has touched in two months. This skill reads the opportunities in Kenso, flags the deals that are stuck against what actually happened on each account, proposes one next action per deal, and writes the week's update.

It ends with a short pipeline report, a list of next actions with owners, and each deal change the user approved applied.

## The rules

- **Deals change only on the user's yes.** Propose every stage, amount, close date, owner or next-step change, and apply the ones they approve. A field a person set is pinned: leave it.
- **Never invent an amount, a close date, a probability or a reason.** Use what the deal, its account and its meetings say. Missing data is reported as missing (N/A), never as 0.
- **Moving a deal to won can block the account.** When the workspace's `markCustomerOnWon` is on, a won deal marks its account a customer and blocklists its domains, so its contacts stop getting campaign email. Say that before you move a deal to a won stage.
- **Stages belong to the workspace.** You may read them. You never rename, reorder, add or remove one. Change a stage's win probability only when the user asks for that exact change.
- **Replies are distinct contacts.** Out-of-office is not a reply. Never report opens.
- **A booked meeting is not a held meeting.** Never report bookings as meetings held.
- **Held meetings are tracked only where the workspace has meeting attribution on.** `meeting_results(operation="get-meeting-attribution", group_by="campaign")` gives `held` per campaign and in `totals`. A not found answer means it is off: then held meetings are not tracked.

Every call takes `client_id`, the workspace id. Send it on every call when the user can see more than one workspace.

## Step 0 - Check what you can use

| Part | Operations | Needs |
|---|---|---|
| Deals, stages, settings | `opportunities` list, get, stages-list, settings-get, update, create, fill-details | Opportunities on |
| Activity on an account | `accounts` get, activity, `account_touches` list | Accounts on |
| Meetings on an account | `meetings` list | Meetings view and Meetings on |
| Email threads | `threads` list | every member |
| CRM sync health | `crm` connections-list, sync-get; `crm_mirror` feed-list, parity-get and `crm_sync_issues` list | every member; the `crm_mirror` reads need the CRM mirror on |
| Top-of-funnel numbers (optional) | `analytics_campaign` query | staff, or the `generative_ui` flag on for the workspace |

Opportunities is in beta. If `opportunities` is not listed for you, or `opportunities(operation="list")` answers 404 `not_found`, stop: say "Opportunities is not on for this workspace yet" and send the user to `https://app.ken.so/<workspace id>/accounts/opportunities`. Do not retry. Any other part that is missing: skip it, say which, and carry on.

Then check whether the CRM is feeding deals in:

`crm(operation="connections-list")`, then for each live connection `crm(operation="sync-get", connection_id=3)`.

If `status` is paused, `lastError` is set, `needsAttentionCount` is above 0 or `queueDepth` is large, say first that deal data may be behind, with the numbers, and point the user to `https://app.ken.so/<workspace id>/settings/integrations`. There is no "sync now" for the whole connection from here.

Read three more for each live connection:

- `crm_sync_issues(operation="list", connection_id=3)`: the writes the CRM refused. Where the workspace has the CRM mirror on, each also has `reason` (why, in plain words) and `fix` (the one fix the app shows). Name the open ones on deals.
- The two `crm_mirror` reads below need the CRM mirror on and answer 404 `not_found` while it is off: skip them then.
- `crm_mirror(operation="feed-list", connection_id=3, errors_only=true)`: the refused writes in the sync feed, newest first. `crm_mirror(operation="feed-list", connection_id=3, entity_type="opportunity", entity_id=77)` is one deal's changes in and out, with `side` (`crm` or `ken`) and `reason` (`sync`, `first_link`, `conflict_lost`, `revert`, `put_back` or `machine_fill`).
- `crm_mirror(operation="parity-get", connection_id=3)`: the deals the CRM has against the deals Kenso has, with why each difference. A gap means the pipeline you read is not the whole CRM pipeline: say so with the numbers.

Retry or dismiss an issue only on the user's yes. Editing the field map and creating a field in the CRM stay in the app, for admins: send them to `https://app.ken.so/<workspace id>/settings/integrations`.

## Step 1 - Read the pipeline

`opportunities(operation="settings-get")`: the currency and `markCustomerOnWon`.

`opportunities(operation="stages-list")`: the stages in order, each with `key`, `label`, `category` (`open`, `won`, `lost`), `opportunityCount`, `amountTotal`, `winProbability` and `weightedAmountTotal`. The weighted open pipeline is the sum of `weightedAmountTotal` over the open stages.

`opportunities(operation="list", stage_category="open", sort="-stageChangedAt", limit=200)`

Page with `cursor` while `pagination.hasMore` is true. Each deal has `stage`, `stageChangedAt` (when it entered its current stage), `amount`, `closeDate`, `nextStep`, `ownerMemberId`, `source`, `sourceCampaignId`, `account`, `primaryPerson`, `people`, `pinnedFields` and `updatedAt`. Narrow with `owner_member_id`, `stage`, `source_campaign_id`, `close_date_before` or `q` when the user asks about one rep, stage, campaign or company.

Done when you hold every open deal in scope.

## Step 2 - Flag the stuck deals

Check each open deal against these signals. `references/stale-signals.md` has the details and the default thresholds. Tell the user the thresholds you used and change them when they say so.

| Signal | How you see it |
|---|---|
| Too long in its stage | days since `stageChangedAt` above the stage's threshold |
| Close date passed | `closeDate` before today on an open deal |
| No next step | `nextStep` empty |
| No recent activity | nothing on the deal or its account in the last 14 days: `opportunities(operation="list", stale_days=14)` lists these open deals, quietest first, each with `lastActivityAt` |
| Stage does not match what happened | for example a meeting-booked stage with no meeting on the calendar, or a meeting-held stage whose meeting was cancelled |
| Late stage with no amount | `amount` empty at proposal or later |

Read activity for the deals that need it, largest amount first, at most 25 per pass (tell the user if you stopped there):

- `accounts(operation="activity", account_id=101, limit=20)`: the account's timeline.
- `account_touches(operation="list", account_id=101, sort="-createdAt", limit=10)`: touches planned, waiting or sent.
- `meetings(operation="list", account_id=101, from_time="2026-09-27T00:00:00Z")`: meetings past and upcoming.
- `threads(operation="list", q="acme.com", limit=10)`: email with the account, with `direction` showing who wrote last.

A deal is stale when it trips two or more signals, or the close date passed. One signal is a watch item.

## Step 3 - One next action per deal

For each flagged deal, propose one action with an owner and a date:

- **Follow up**: the contact wrote last and nobody answered. Hand the thread to the reply-handling skill.
- **Book the next meeting**: interest but no meeting. Draft the ask with real times (the meeting-prep-and-followup skill does this).
- **Fix the record**: a passed close date, a missing next step, a stage that does not match. Propose the new values.
- **Write the summary**: the deal has activity but no summary or next step. `opportunities(operation="fill-details", opportunity_id=77)` has Kenso write them from the deal's context. It never overwrites a value a person, an import or a CRM set, and fills each deal at most once every 2 minutes.
- **Close it**: no activity for a long time and no answer to the last two touches. Propose moving it to a lost stage, or to nurture if the workspace has one, with the reason.

Never draft or send outreach from this skill. Name the skill that does it.

## Step 4 - Apply what the user approves

Show the proposed changes as a list: the deal, the field, the current value, the new value and why. Apply each one the user approves:

`opportunities(operation="update", opportunity_id=77, changes={"next_step": "Send the security review", "close_date": "2026-11-21"})`

`opportunities(operation="update", opportunity_id=78, changes={"stage": "lost", "lost_reason": "No budget until Q3; asked us to come back in June"})`

- Stage keys differ per workspace (the defaults include `interested`, `meeting_booked`, `meeting_held`, `qualified`, `proposal`, `won` and `lost`): use the `key` values from `stages-list`. An unknown key fails with `out_of_range` and lists the live keys.
- `pinned_by_user` means a person set that field: leave it and tell the user.
- A lost deal needs `lost_reason`, from what the contact said.
- `account_id` in `changes` moves a deal to another account: only on the user's explicit request.
- Win probabilities, on the user's explicit request only: `opportunities(operation="stages-replace", win_probabilities={"proposal": 50})`. Nothing else about the stages changes.

A deal that should not exist goes to a lost stage with a reason, on the user's yes. Delete it (`opportunities(operation="delete", opportunity_id=78)`) only when the user asks for a delete by name: a deleted deal has no restore.

## Step 5 - The weekly update

Write it in this order. `references/weekly-update.md` has the layout.

1. **Pipeline now**: open deals, total and weighted amount, by stage (from `stages-list`). Amounts in the workspace currency.
2. **This week**: deals opened (`createdAt` in the week), moved, won and lost (`closedAt` in the week, with amounts and lost reasons). For moves, read `opportunities(operation="get-stage-history", opportunity_id=77)` for each deal whose `stageChangedAt` is in the week and count its entries whose `enteredAt` is in the week and whose `kind` is not `created` (opened already counts new deals), so a deal that moved twice shows both moves. A history with `isComplete` false is missing moves Kenso never recorded (a deal created or moved before it recorded every move, or moved by a data fix): say so in the update's notes rather than reading its entries as every move.
3. **Stuck**: the stale deals, with their signals and next actions.
4. **Next actions**: the list from Step 3, by owner.
5. **Top of funnel** (optional): when you can see it, `analytics_campaign(operation="query", metrics=["contacted", "replies", "interested", "meetings"], window={"preset": "last_7_days"}, compare_to="previous_period")`. Replies and interested are distinct contacts. Treat `meetings` as booked, never as held. When you cannot see this tool, write N/A for these lines.

If replies came in but `interested` is 0, the replies may not be classified yet. Say that, and do not report a 0% positive rate.

## What this skill cannot do yet

- No stale-deal or forecast report: Step 2 rebuilds staleness from activity each time.
- No stage edits beyond win probabilities.
- No "sync now" for the whole CRM connection: `sync-get` is status only.
- No held meetings where the workspace has meeting attribution off.

`references/stale-signals.md` holds the thresholds and how to read each signal. `references/weekly-update.md` holds the update layout and the metric definitions. Open one with `load_skill("pipeline-review", reference="references/stale-signals.md")`.

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
