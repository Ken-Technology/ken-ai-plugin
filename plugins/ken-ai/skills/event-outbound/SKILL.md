---
name: event-outbound
description: Plan outreach around a conference or trade show - pick or add the event, build its attendee, speaker, exhibitor and sponsor list, match it to target accounts, find people likely there, and plan Event touches a person approves in Today.
---

# Event outbound

"Plan outreach around this conference." An event is a reason to meet in person: a target account's people are speaking, exhibiting or attending, and a short note before the event books a coffee or a booth visit. In Kenso each event holds its list of attendees, exhibitors, speakers and sponsors, and every row is matched to your target accounts by company domain.

This skill picks or adds the event, builds its list, matches it to your accounts, finds people likely to be there, and plans Event touches that wait for a person in Today. People who are not on a target account can go into a campaign.

## Rules

- **A person approves every touch and launches every campaign.** Planned touches wait in Today; nothing here sends.
- **Likely is not going.** People found at an exhibiting company or on last year's list are likely there, not confirmed. Write "your team is exhibiting at <event>" or "you spoke at <event> last year", never "saw you're attending". Only a person who said so (`find-people-going`, an attendee list, a LinkedIn event read) is going.
- **A LinkedIn event read risks the seat.** Show the person the warning and wait for their yes before every read.
- **Delete only on request.** Removing an event, a row or a suggestion is the user's call.
- **Never invent** a booth number, a session time, a venue or a meeting slot. Use what the event page or the person gave you.
- Adding event people to a client's live campaign is a volume change: it needs a yes that names that client, with its source.

## Step 0 - Check what is on

Event outbound needs the Accounts and Event outbound flags. If `outbound_events(operation="list")` is not in your tools or answers 404, tell the user in one sentence that Event outbound is not switched on for their workspace yet, link `https://app.ken.so/<workspace id>`, and stop. Never retry a 404 as "not found".

Planning touches also uses the `accounts` skill's tools (`accounts`, `account_touches`). Importing people into a campaign uses `contacts`.

## Step 1 - Pick the event

- The workspace's events: `outbound_events(operation="list", status="upcoming")`. Each has its dates, city, `attendance` (`going`, `not_going` or not decided) and `counts` (attendees, speakers, exhibitors, sponsors, companies, and `accounts`: how many of your target accounts are on its list).
- Events Kenso suggests: `outbound_events(operation="suggestions-list")`. Each has a `relevance` (0 to 100), a `reason` and the target `accounts` seen on it. Add one with `outbound_events(operation="suggestions-accept", suggestion_id=31, attendance="going")`; drop one with `suggestions-dismiss` only when the user says so.
- From a link (Luma, Eventbrite, Sched or the event's own site): `outbound_events(operation="preview-from-link", url="https://example.com/summit")` reads the page and saves nothing. Ask the user for every field in `missing`, then create it:

`outbound_events(operation="create", name="RevOps Summit 2026", starts_on="2026-11-18", ends_on="2026-11-19", timezone="America/Chicago", format="in_person", city="Austin", url="https://example.com/summit", attendance="going")`

Ask whether the team is going: it changes the touches (meet in person, or follow up on the talks). Set it with `outbound_events(operation="update", event_id=12, changes={"attendance": "going"})`.

## Step 2 - Build the list

Add rows from what the event publishes first, then what Kenso can find. Every source below but a list file returns rows to review and saves nothing: add the rows you keep with `attendees-bulk-create` and their source.

**The event's own pages.** `preview-from-link` returns `pages`, the site's speaker, exhibitor and sponsor pages. Read each one:

`outbound_events(operation="extract-attendees", event_id=12, url="https://example.com/summit/speakers", role="speaker")`

- Pasted text works too: `text="..."` instead of `url`.
- A sponsorship prospectus or "who attends" page: `mode="prospectus"`. It returns the companies it names, the job titles attendees hold (`titleMix`) and how many attend (`attendeeCount`).
- `note` says what to tell the person (a host-only guest list, a page closed to crawlers). `truncated` means a cap cut the list.

Add what you keep, up to 500 rows a call:

`outbound_events(operation="attendees-bulk-create", event_id=12, source="url", source_url="https://example.com/summit/speakers", items=[{"role": "speaker", "full_name": "Maya Chen", "title": "VP Revenue Operations", "company_name": "Acme", "company_domain": "acme.com"}])`

Each result is `created`, `duplicate` (already on the event: it fills a blank title or domain) or `validation_failed`. A row with no domain is matched in Kenso Search during the call.

**A list file the user has.** A CSV, an Excel sheet, a PDF, or a photo of a badge, a card or a list. Ask whether they have permission to use the list, as the app does, then add it in one call:

`outbound_events(operation="attendees-upload", event_id=12, role="attendee", file_name="attendees.csv", file_content_base64="...")`

- Kenso reads it the way the app does: a CSV or sheet maps its columns by name (`columns={"Org": "company_name"}` fixes one), a PDF's text and each photo go to the model. One file a call.
- A model can misread a photo or a PDF. For those, and for free text, call with `preview=True`, show the person the rows, then add the ones they keep with `attendees-bulk-create` and the returned `source`. A CSV or sheet maps the same way every time, so add it directly (`preview=True` checks the columns first).
- A CSV's text works as `text="..."` with its `file_name`. Text alone is a pasted list: a copied table maps the same way, other text is read by the model.
- `file.reason` says why a file added nothing (`no_text`: a scan, so send photos of its pages; `oversized_image`: crop it into parts). HEIC is not read: send it as JPEG. `added` has the counts and the first failures.

**Find with Kenso.** Three previews, each for a different kind of "likely":

- People at the exhibiting and sponsoring companies: `outbound_events(operation="find-company-people", event_id=12, titles=["VP Sales", "Head of Partnerships"], per_company=3)`. Use the prospectus `titleMix` as titles when you have it. They work there and may not go: source `company_people`.
- People who say they are going: `outbound_events(operation="find-people-going", event_id=12)`. Replies in the workspace's inbox that name the event (`inbox_mention`) and profiles that name it (`profile_mention`). Add each source in its own call.
- Last year's speakers, sponsors and exhibitors: `outbound_events(operation="find-last-year", event_id=12)`. Source `last_year`; companies come back more often than people.

`find-company-people` and `find-people-going` count each profile they return against the workspace's Search browse quota (429 `quota_exceeded` past it).

**A LinkedIn event's attendees.** Only when the user asks, and only through their own seat:

1. `outbound_events(operation="linkedin-attendees", event_id=12)` returns `enabled`, the `warning`, the limits and the caller's seats with `canRead`.
2. Show the person the warning word for word: automated reads break LinkedIn's User Agreement and can get the seat restricted, the read uses the seat's search budget, and the seat must already be attending (no one clicks Attend for them).
3. Only after they accept: `outbound_events(operation="read-linkedin-attendees", event_id=12, url="https://www.linkedin.com/events/123/", linkedin_account_id=5, accept_warning=True)`.
4. Poll `linkedin-attendees` until the read is `done`, then add the rows the person keeps with `source="url"` and the event link as `source_url`.

Limits and refusal codes are in `references/linkedin-event-read.md`.

## Step 3 - Match the list to your accounts

`outbound_events(operation="attendees-list", event_id=12, account="matched")` lists the rows on your target accounts, each with its `account` (name, stage, `eventTouch`), `personId` and `stakeholderId`.

- An attendee who is on an account but not on its committee: add them with `accounts(operation="stakeholders-create", account_id=101, person={"full_name": "Maya Chen", "title": "VP Revenue Operations", "linkedin_url": "https://www.linkedin.com/in/mayachen"}, fields={"role": "unknown", "coverage": "planned"})`.
- A company on the list that should be a target account: suggest it to the user, and add it only on their yes with `accounts(operation="bulk-create", items=[{"domains": ["globex.com"]}])`.
- `account="unmatched"` lists the rest.

## Step 4 - Plan the touches

`outbound_events(operation="plan-touches", event_id=12, due_at="2026-11-04T15:00:00Z")`

It plans one Event touch per target account on the list ("Meet at <event>"), to the person on the list who is a stakeholder (speakers first), with a body naming the event, its dates and city and that account's people on the list. The touches wait for approval in Today. The default due time is 09:00 UTC fourteen days before the event.

- `touchesExisting` counts accounts that already have this event's touch: it is safe to call again after you add rows.
- `skipped` lists accounts left out: stage `paused`, `not_a_fit` or `lost`, or a Contact limits rule.
- Speakers on the list also become event signals on their accounts.
- A past event is 409 `invalid_state`.

For a written email before the event, add your own touch with the `accounts` skill: `account_touches(operation="create", account_id=101, stakeholder_id=301, channel="email", due_at="2026-11-10T14:00:00Z", reason="signal", title="Coffee at RevOps Summit", subject="RevOps Summit in Austin", body="Hi Maya, ...", rationale="Maya speaks at RevOps Summit on Nov 18 (speaker page); our team is going.")`. Then send the person to Today: `https://app.ken.so/<workspace id>/today`.

## Step 5 - People not on an account

Rows whose company is not a target account can go into a campaign. Build or reuse a Draft campaign with copy about the event (the `create-campaign` skill), then:

`contacts(operation="contact-imports-create", source="event", event_id=12, campaign_id=8123, roles=["speaker", "exhibitor"])`

Rows with an email or a LinkedIn URL become contacts, at most 5,000. Rows on target accounts are left out, because the Accounts lane works them, unless `include_accounts=True`. A person launches the campaign.

## Step 6 - After the event

- Update the event with what changed: `outbound_events(operation="update", event_id=12, changes={"attendance": "not_going"})`.
- Follow up on the people you met with the `accounts` skill, and on replies with the inbox.

Report: the event, the list by role and source, the target accounts on it, the touches waiting in Today, anything imported into a campaign, and what the person has to approve.

## What this skill cannot do yet

- Confirm attendance for people found at an exhibiting company or on last year's list: they stay "likely".
- Click Attend on LinkedIn, or read a LinkedIn event without the person's accepted warning.

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
