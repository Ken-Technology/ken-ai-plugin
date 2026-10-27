# Stale signals: thresholds and how to read them

Reference for the pipeline-review skill, Step 2. The thresholds below are starting defaults, not facts about the workspace. Say which ones you used, and use the user's numbers when they give them.

## Days in stage

Measured from `stageChangedAt` to today. Without stage history, this is the time since the deal's latest stage change.

| Stage (default keys) | Flag after |
|---|---|
| `interested` | 7 days |
| `meeting_booked` | the meeting's date plus 2 days |
| `meeting_held` | 7 days |
| `qualified` | 14 days |
| `proposal` | 14 days |
| a nurture stage | 60 days |
| any other open stage | 21 days |

A workspace can rename and add stages. Map each live stage to the nearest row by its label and position, and say so.

## Close date passed

`closeDate` before today on an open deal. Always flag it, on its own: the forecast is wrong until someone moves the date or closes the deal.

## No next step

`nextStep` empty. Most stuck deals have none. Propose one from the latest activity, or `fill-details` when the deal has context.

## No recent activity

Nothing on the account in the last 14 days. Activity is any of:

- a touch sent, or a person's touch approved (`account_touches` list),
- an email or LinkedIn message either way (`threads` list, `direction` and the newest message time),
- a meeting held or booked (`meetings` list),
- an entry on the account's timeline (`accounts` activity).

Who wrote last matters. When the contact wrote last and nobody answered, the next action is a reply, not a nudge.

## Stage does not match what happened

| Stage | Mismatch |
|---|---|
| `meeting_booked` | no upcoming meeting on the account, or the meeting was cancelled |
| `meeting_held` | the only meeting was cancelled, or is still in the future |
| `qualified`, `proposal` | no meeting ever held on the account |
| any open stage | the contact asked not to be contacted, or the account is paused or not a fit |

## Late stage with no amount

`amount` empty at `proposal` or later, or on any stage the user treats as forecast. Never fill it in yourself: ask the owner, or let `fill-details` set it only if the context states it.

## Stale or watch

- **Stale**: the close date passed, or two or more signals.
- **Watch**: one signal.

Order the stale list by amount, largest first, then by days in stage.

## Lessons from real pipelines

- A pipeline where most deals were created in one backfill and then never touched looks full and is mostly dead. Report the deals with no activity since creation as their own line.
- A nurture pile that nobody touches for two months is not nurture. Propose closing or re-engaging each one, never leaving it.
- Commitments made on calls that were never written down are the most common lost deal. A deal with a meeting held and no next step is the first to flag.
