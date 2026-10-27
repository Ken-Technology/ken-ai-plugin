# Fill guide: `roles-for-you`, Roles for you

Starter `roles-for-you` 1.0.0. Type `recruiting`, format `page`. Needs the workspace's `recruiting` flag. Page slug `roles`: one page per candidate, `https://{host}/priya-shah/roles-for-priya`. Sections: `intro`, `roles`, `book`. The ask is a booking button, "Book a 15-minute intro".

One page per lead of a recruiting campaign, listing the campaign's open roles that fit them: the primary role and its open extra roles, up to four. Each role shows its company, location, remote policy, pay and must-haves, a short "why you" line, a booking button and a link to the job. There is no company on the page: it reads the candidate (`person.*`) and the roles (`roles`). `account` is empty.

Read the template's own `studio.json` first (`studio_templates(operation="pull", template_id=41)`): a workspace copy may differ, and its file wins. You recognize this starter by the slug `roles` and the single step `fits`.

## Before you run it

- **A recruiting campaign with a primary role, and open extra roles worth showing**, with this template pinned: `studio_pages(operation="asset-template-get", campaign_id=55)`. With one role, `role-pitch` is the better page.
- **Each role is complete**: title, company, location, remote policy, pay range, description and must-haves. The page prints them from the role, never from the fill.
- **The candidates' profiles**: current title, employer, skills and experience summary.

## What each field needs

| Slot | Required | Limits | Filled by | From |
|---|---|---|---|---|
| `intro` | yes | 20 to 400 | `fits` | a short personal opening. Falls back to "We are hiring for a few roles right now..." |
| `fits` | no | up to 4 `{title (2 to 200), why (20 to 320)}` | `fits` | the roles that fit this person, best first. `title` is copied from the role exactly, because the page matches each fit to its role by title; `why` is one or two sentences from the candidate's profile and that role's must-haves |

## How it fills

`fits` (prompt) reads `roles` and the candidate's profile and writes `intro` and `fits`. It never sees the candidate's name or any dates. When it finds fits, only those roles show. When it finds none, or has not run yet, every role shows without a "why you" line and `intro` falls back.

No grade step.

## Run it

`studio_pages(operation="run-create", template_id=41, campaign_id=55, contact_ids=[9001, 9002])` builds one page per lead before the first send. Link one by hand with `studio_pages(operation="create-link", asset_id=901, contact_id=9001)`.

## Your own model (executor `"agent"`)

`prepare` gives you `fits` with `roles` and `person` set. Copy each `title` exactly from `roles`, write `why` from the profile and the role's must-haves only, and submit with no grade results. `references/studio-fill.md` has the loop.

## Check before the first link

- Every `fits[].title` equals a role title exactly; a mismatch hides that role's "why you" line.
- Each `why` traces to the profile and the role. Nothing touches a protected trait.
- A page with no fits still lists every role: fine to send, but tell the user which candidates got no match.
