# Accounts: credits and errors

The cost of each step in the Accounts loop, and what to do when a call fails. The loop itself is in the skill body.

## Credits

| What | Cost |
|---|---|
| Adding accounts | free; with research on, each new account starts a research run |
| A research run | its model tokens at 2x model cost, plus each web page or search at 2x its cost |
| A committee mapping run | its model tokens at 2x model cost |
| A touch plan | the step titles, at 2x model cost |
| Drafting or rewriting a touch (`draft`, `rewrite`) | its model tokens at 2x model cost |
| Grading a touch (`feedback`) | free |
| A signals scan | free; the news source is billed like any web search |
| An email find | 1 credit per email found |
| A hand-off brief (`handoff-brief`) | free: nothing is sent or charged |

Running out of credits is not an error for research and mapping: the run waits and resumes when credits arrive. Before research or mapping runs on more than a few accounts, tell the user what it costs.

## Errors

| Symptom | Meaning | Do |
|---|---|---|
| An operation is missing, or 404 on every id | its flag is off for this workspace | skip that step and tell the user |
| `domain_taken` | another account owns the domain | use the `accountId` it names |
| `pinned_by_user` | a person set that field | ask the user before `overwrite_pinned=True` |
| 409 `account_merged` | the account was merged | use `error.details[].mergedIntoId` |
| `committee_run_active` | a mapping run is open | follow that run with run-get |
| `run_not_finding` | the run already moved on | do not resend candidates |
| `previously_removed` | a person removed that stakeholder | ask the user before `force=True` |
| `invalid_transition` | the touch is past that status | read it with get |
| 422 `guardrail_violation` | a Contact limits guardrail | move the due time to `nextAllowedAt` |
| `channel_unavailable` on a hand-off | Slack or the CRM is not connected for it | offer email instead |
| `duplicate_handoff` | the same hand-off just went out | do not retry |
| `delivery_failed` on a hand-off | nothing recorded, but it may have gone out | ask the user before retrying |
| 402 | not enough credits | tell the user to add credits |
| 503 `context_unavailable` on draft | the account could not be read yet | retry in a minute |
| a scan source `failed` | that one source did not answer | retry the account later; the other sources stored their signals |
