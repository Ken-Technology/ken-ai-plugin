# Campaign Status Enum (Canonical Reference)

The single source of truth for the `status` field on a Ken AI campaign. Every other skill that displays, filters, or sets a campaign status MUST cite this file - never re-document the values inline.

## CampaignStatus

| Value | Name | Meaning |
|-------|------|---------|
| 0 | Draft | Campaign is being configured. Initial state on create. No processing. |
| 1 | Building | Backend is preparing the campaign (enrichment, qualification, segmentation). |
| 2 | Ready | Configuration complete, contacts enriched, awaiting send. |
| 3 | Sending | Active outreach. Email sequences are being delivered through EmailBison. |
| 4 | Paused | Sending temporarily halted. Resume returns the campaign to Sending. |
| 5 | Completed | All contacts processed and the sequence has finished for everyone. |
| 6 | Error | Backend hit a fatal error and stopped. Requires manual intervention. |

## Lifecycle

```
Draft (0) -> Building (1) -> Ready (2) -> Sending (3) <-> Paused (4)
                                                |
                                                v
                                            Completed (5)

Any state -> Error (6) on fatal failure
```

- New campaigns are always created in `Draft (0)`.
- Backend transitions `Draft -> Building -> Ready` automatically as enrichment and AI workflows finish.
- The CSM (or backend trigger) flips `Ready -> Sending` to start outreach.
- `Sending <-> Paused` is the only operator-controlled toggle while a campaign is live.
- `Completed` is terminal in the happy path. `Error` is terminal until a human resets it.

## Do not use

- The legacy `Status` enum (`0=ToScrape, 1=InProgress, 2=Scraped, 3=Error, 4=Done, 5=Draft`) - that came from a deprecated DTO field and is not what the backend lifecycle validates.
- `ToScrape` - never existed in `CampaignStatus`.
- `To Do` - not a real status. Older docs used it as shorthand for "flip to Sending"; the correct status is `Sending (3)`.

## How to display a status

When rendering campaign status to the user, show both the name and the numeric value: `Draft (0)`, `Sending (3)`, etc. This avoids ambiguity with the legacy enum where the same number meant something different.

## Validation

`status` is an integer in `0..6`. Any value outside that range is invalid. Always pass an integer (not a string) when calling `api_campaign_manage`.

## Setting status on update

The campaign API does NOT support partial updates - every `api_campaign_manage(operation="update", ...)` call must include all campaign fields, not just `status`. See `update-recipes.md` section 1 for the full field list.
