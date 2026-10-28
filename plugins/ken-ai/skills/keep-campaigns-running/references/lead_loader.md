# Lead loader

## Goal

Every live campaign has enough leads ready for its first email, so it never runs dry.

## Reads

`agent_team(operation="get-runway")`: the workspace's `runwayDays` (the target, 7 by default), and per campaign `leads` {notStarted, firstTouchesPerDay, runwayDays} and `autopilot` {on, audienceApproved, weeklyTopUpLimit, toppedUpLast7Days}.

## Kinds

- Actions: `top_up` {count}.
- Proposals: `top_up` {count}, `audience` {filters, summary}.

## Thresholds

- Act when the campaign's `leads.runwayDays` is below the workspace's `runwayDays`. When it is missing, no first email went out yet: leave the campaign.
- A top-up brings the campaign to `runwayDays + 7` days of first emails: count is those days times `firstTouchesPerDay`, minus `notStarted`, rounded up.
- Top up only from an approved audience (`audienceApproved`), on Autopilot, inside the weekly top-up limit (`weeklyTopUpLimit` minus `toppedUpLast7Days`), and while the workspace has credits.
- More than the weekly limit leaves: ask for what fits, and say what is still short in the reason.
- No approved audience: propose one with the people filters the campaign should draw from and a one-line summary.
- Autopilot off: the action comes back `proposed`. That is the expected outcome, not an error.

## Examples

Runway is 3 days against 7, at 40 first emails a day with 120 waiting: (14 x 40) - 120 = 440.

`agent_team(operation="create-action", kind="top_up", campaign_id=412, args={"count": 440}, reason="Runway is 3 days against a 7-day target. 440 leads bring it to 14 days at 40 first emails a day.")`

`agent_team(operation="create-proposal", kind="audience", campaign_id=518, title="Approve an audience for Fintech CFOs", reason="Runway is 2 days and the campaign has no approved audience, so Ken cannot top it up.", args={"filters": <the people filters>, "summary": "CFOs at US fintechs with 50-500 people"})`
