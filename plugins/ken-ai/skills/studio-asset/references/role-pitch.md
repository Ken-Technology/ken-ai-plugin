# Fill guide: `role-pitch`, Role pitch for one candidate

Starter `role-pitch` 1.0.0. Type `recruiting`, format `page`. Needs the workspace's `recruiting` flag. Page slug `role`: one page per candidate, `https://{host}/maya-chen/role-for-maya`. Sections: `intro`, `why`, `role`, `process`, `book`. The ask is a booking button, "Book a 15-minute intro".

One page per lead of a recruiting campaign: why their background fits the role, the role and the team, the pay range and the hiring process, with an optional video from the hiring manager. There is no company on the page: it reads the candidate (`person.*`) and the campaign's role (`role.*`). `account` is empty.

Read the template's own `studio.json` first (`studio_templates(operation="pull", template_id=41)`): a workspace copy may differ, and its file wins. You recognize this starter by the slug `role` and the steps `headline`, `pitch`.

## Before you run it

- **A recruiting campaign with its role set**, and this template pinned on it: `studio_pages(operation="asset-template-get", campaign_id=55)`. Pinning is template work (the `studio-template` skill). Pages are built per lead, so runs take the campaign and its lead ids, never account ids.
- **The role is complete.** The page prints `role.title`, `company`, `location`, `remote_policy`, `pay_range`, `highlights` (the must-haves) and `job_url` straight from the role, and the prompt reads its `description`. A role with no pay range shows none; never write one into the copy.
- **The candidates' profiles.** The prompt reads `person.current_title`, `current_company`, `skills` and `experience_summary`. A lead with an empty profile gets the fallback line.
- **`process` and `video` are template settings**, the same for every candidate: `process` is a static fallback (edit it once), and `video` shows only when the template sets one.

## What each field needs

| Slot | Required | Limits | Filled by | From |
|---|---|---|---|---|
| `headline` | yes | 3 to 120 | `headline` (bind) | `role.title`. Fallback: the role title, else "A role we think fits you" |
| `why_you` | yes | 40 to 600 | `pitch` | why this person's work fits the role's must-haves, from their profile only. Has a fallback |
| `team` | no | 500 | `pitch` | the team and the work, from the role's description |
| `process` | no | 1 to 6 `{step (2 to 60), note (200)}` | fallback only | the hiring steps, the same for everyone |
| `video` | no | `provider` `loom`, `youtube` or `vimeo`; `id` 3 to 64 | fallback only | the hiring manager's video, when the template sets one |

## How it fills

1. `headline` binds `role.title`.
2. `pitch` (prompt) writes `why_you` and `team`. It never sees the candidate's name or any dates, and says nothing about age, gender, looks, family, health, nationality, religion or school dates: only the work counts.

No grade step.

## Run it

Build pages before the first send by running the template on the campaign's leads:

`studio_pages(operation="run-create", template_id=41, campaign_id=55, contact_ids=[9001, 9002])`

Each page comes back with its `contactId`. Link one by hand with `studio_pages(operation="create-link", asset_id=901, contact_id=9001)`, or let the campaign's `asset_link` merge tag build and link pages one step ahead of each send.

## Your own model (executor `"agent"`)

`prepare` runs the bind and gives you `pitch`, with `person` and `role` set. Write `why_you` and `team` from those inputs only (no invented employers, projects, numbers or people), and submit with no grade results. `references/studio-fill.md` has the loop.

## Check before the first link

- `why_you` is `filled` and every claim in it traces to the candidate's profile and the role's must-haves.
- Nothing on the page touches a protected trait, and no salary appears other than the role's own `pay_range`.
- The process steps are the real ones for this role.

## When it goes wrong

| You see | Why | Do |
|---|---|---|
| 400 `feature_disabled`, or no recruiting starters | the `recruiting` flag is off | stop; recruiting pages are not on for this workspace |
| 409 `studio_campaign_not_pinned` | the campaign has no Studio template | pin it first (the `studio-template` skill) |
| A generic `why_you` | the lead's profile is empty | fine to send on its fallback; tell the user which candidates got it |
