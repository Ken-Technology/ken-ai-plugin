# Campaign Status Enum (Canonical Reference)

The single source of truth for a campaign's lifecycle status. Every stage that displays, filters, checks or changes a campaign status cites this file instead of re-documenting the values.

## CampaignStatus

| Value | Name | Canonical string | Meaning |
|-------|------|------------------|---------|
| 0 | Draft | `draft` | Campaign is being configured. Initial state on create. No processing. |
| 1 | Building | `building` | Backend is preparing the campaign (enrichment, qualification, segmentation). |
| 2 | Ready | `ready` | Configuration complete, contacts enriched, awaiting send. |
| 3 | Sending | `active` | Active outreach. Email sequences are being delivered through the Ken sequencer. |
| 4 | Paused | `paused` | Sending temporarily halted. Resume returns the campaign to Sending. |
| 5 | Completed | `completed` | All contacts processed and the sequence has finished for everyone. |
| 6 | Error | `error` | Backend hit a fatal error and stopped. Requires manual intervention. |
| 7 | Archived | `archived` | Retired by the user. Hidden from the active list. |

## Where to read it

- `campaigns(operation="get", campaign_id=...)` returns the collapsed lifecycle as the `status` string above. When processing is both building and ready, the wire status is `ready`; a sending or launching campaign is `active`. `campaigns(operation="list", status=...)` filters on the same strings.
- `campaign_ops(operation="status", campaign_id=...)` returns the campaign DTO with `campaignStatuses`, a list of CampaignStatus numbers (for example `[1, 2]` while building and ready overlap).
- `sendingStatus` on `campaigns(operation="get")` is the sequencer state, not the lifecycle: `not_started`, `scheduled`, `launching`, `sending`, `paused`, `completed`, `error`, `archived`. A campaign whose `sendingStatus` is `scheduled`, `launching` or `sending` is live: schedule, volume, pause and sequence changes there need a yes that names the client.
- While `sendingStatus` is `paused`, `pausedReason.kind` says why (`user`, `bounce_guard`, `sending_error`, `holiday`, `client_approval`, `billing`, `workspace_locked`, `other`, `unknown`; tolerate new values). A `bounce_guard` or `sending_error` pause means something needs fixing first: report it with `pausedReason.detail` before anyone talks about resuming.
- `processingStatus` lists the processing flags (or `["none"]`).

## Lifecycle

```
Draft (0) -> Building (1) -> Ready (2) -> Sending (3) <-> Paused (4)
                                                |
                                                v
                                            Completed (5)

Any state -> Error (6) on fatal failure
Any state -> Archived (7) on archive
```

- New campaigns are always created in `Draft (0)`.
- `Draft -> Building -> Ready` advances as enrichment and AI workflows finish, after `start_workflows`.
- The user moves `Ready -> Sending` to start outreach (or an auto-launch preference the user set).
- `Sending <-> Paused` is the user-controlled toggle while a campaign is live.
- `Completed` is terminal in the happy path. `Error` stays until a human resets it.

## Do not use

- The legacy `Status` enum (`0=ToScrape, 1=InProgress, 2=Scraped, 3=Error, 4=Done, 5=Draft`). It survives as `sourceStatus` on `campaigns(operation="get")` (`to_scrape`, `in_progress`, `scraped`, `error`, `done`, `draft`): the stored pipeline source status, not the lifecycle the backend validates.
- `ToScrape` - never a CampaignStatus.
- `To Do` - not a real status. Older docs used it for "move to Sending"; the correct status is `Sending (3)`.

## How to display a status

Show the name and the number: `Draft (0)`, `Sending (3)`. When you read the canonical string, map it back to this table (`active` is `Sending (3)`). This avoids confusion with the legacy enum, where the same number meant something different.

## Changing status

**Never set `status` through `campaigns(operation="update")`** (it is rejected). Lifecycle changes go through the calls below, and only on the user's explicit request for that action. Launch is the user's decision, after verify-campaign passes. On a client's live campaign, pause and resume also need a yes that names that client, with who said it, where and when. Verification never calls any of them.

- `campaign_flow(operation="start_workflows", campaign_id=...)` - Draft -> Building (spends credits)
- `campaigns(operation="launch", campaign_id=...)` - Ready -> Sending
- `campaigns(operation="pause", campaign_id=...)` and `campaigns(operation="resume", campaign_id=...)` - while live
- `campaigns(operation="archive", campaign_id=...)` - Archived (pause sending first; a sending campaign answers 409)

Field-level updates (name, contact limit, schedule) use `campaigns(operation="update", ...)` - see `update-recipes.md` section 1.
