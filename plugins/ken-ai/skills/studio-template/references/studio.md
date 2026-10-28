# Studio

Studio is Library > Studio in the app. You build a template once (a reverse demo, landing page, audit, report, event invite, calculator or, for recruiting, a candidate page) and the platform fills it for each account. Each filled copy is a Studio page on the workspace's own link host, with one natural link per person (`https://{host}/{account-slug}/{page-slug}-for-{first-name}`), human-confirmed view tracking and account signals.

This guide is the loop from a brief to a link in a touch. Two guides go with it:

- The bundle reference: the bundle format, slot schema, Liquid, Ken variables, kit snippets, CSP, recipe steps and every validation rule id. Open it at step 3 with `load_skill("studio-template", reference="references/studio-template-builder.md")`. One playbook per template type sits next to it in the same `references/` folder.
- The fill guide for your own model (executor `"agent"`): `load_skill("studio-asset", reference="references/studio-fill.md")`. Open it at step 7 when you take that path. The `studio-asset` skill also has one file per starter that says what each field needs and where its data comes from.

Every call takes `client_id`, the workspace id. Send it on every call when the user can see more than one workspace.

Studio is in beta behind the `studio` flag. A 404 on every Studio call means this workspace does not have Studio yet: stop and tell the user.

## Where to start

Studio's "Build with your agent", "Edit with your agent" and "Fill with your agent" buttons give the user one line to paste into you:

| The user's line | Start at |
|---|---|
| "Build a new Ken Studio template." | Step 1 |
| "Build Ken Studio template 41." or "Edit Ken Studio template 41." | `studio_templates(operation="get", template_id=41)` and `pull`, then Step 3. Ask what to change when the user has not said |
| "Fill the pages waiting for your agent on Ken Studio template 41." | Step 7, the `"agent"` path |

Work through to the end of the user's ask without stopping between steps: a build ends with a pushed draft that validates and 3 previews (Step 5). Publish (Step 6) only when the user asked for it.

## Step 1 - Brief

Ask, or read from the conversation:

1. Who reads the page: role and kind of company.
2. What the reader should do after reading it: book a call, reply, save a seat, run the numbers.
3. Which accounts it runs on: named accounts in the app, a stage, or a campaign's companies.

Pick the type from the answers:

| `template_type` | Pick it when the page | Starter |
|---|---|---|
| `reverse_demo` | shows the account a campaign or result you already built for them | `rd-ken-native`, `rd-doc` (doc with PDF), `rd-your-product` (your own endpoint) |
| `audit` | lists what gets in a buyer's way on their own site, with fixes | `audit-rewrites` |
| `report` | puts the account next to its peers, from your data | `benchmark-report` |
| `landing_page` | retells your closest customer story for them | `case-study` |
| `event` | invites them to a dinner or webinar and saves the seat | `event-invite` |
| `calculator` | lets them run the numbers, then book | none for now, see `calculator.md` |
| `recruiting` | pitches a role to one candidate, or shows them the open roles that fit; needs the `recruiting` flag (see "Recruiting pages") | `role-pitch`, `roles-for-you` |
| `other` | fits none of these | none, start blank |

`template_format` is `page` (web only) or `doc` (web plus a PDF download).

Done when you can say in one sentence who the page is for, what they do next, and which accounts it runs on.

## Step 2 - Start a template

Check what exists first: `studio_templates(operation="list", template_type="audit")`. Reuse a template that already fits.

To copy a starter, list them with `studio_templates(operation="starters-list")` (each has `slug`, `name`, `type`, `format`, `description`, `showcases`), pick the closest to the brief, and copy it:

`studio_templates(operation="create", starter_slug="rd-ken-native", name="Campaign we built for you")`

The starter's files become draft version 1. To start blank instead:

`studio_templates(operation="create", name="Pipeline teardown", template_type="audit", template_format="page")`

Then read the files: `studio_templates(operation="pull", template_id=41)`. Text files come back inline. Binaries come back as a `downloadUrl` that works for 15 minutes. Write them into a working folder in your own environment.

## Step 3 - Build the bundle

Open the bundle reference with `load_skill("studio-template", reference="references/studio-template-builder.md")`, and the playbook for your type with `load_skill("studio-template", reference="references/<type>.md")` (`reverse-demo.md`, `audit.md`, `report.md`, `landing-page.md`, `event.md`, `calculator.md`, `recruiting.md`, `email.md`). Edit the bundle in your working folder: `studio.json`, `template.liquid`, `fallback.liquid`, `assets/`, `samples/`.

Keep three samples in `samples/`: a full one, a shared one (`person` is null) and a partial one (some slots missing). Step 5 renders them with `sample`, on real accounts.

Images, fonts and PDFs go in `assets/`. Reference them as `{{ asset_url | append: '/logo.png' }}`: `asset_url` already points at `assets/`. A relative `assets/logo.png` does not load on the page; the validator warns with `asset-relative-url`.

With no shell or file access (Claude Desktop, claude.ai, ChatGPT), keep the bundle in the conversation and send every text file inline in `text_files`. Push a logo or image from a public URL with `files={"assets/logo.png": {"fromUrl": "https://example.com/logo.png"}}` (at most 5 MB). The hosted preview in Step 5 is your render check.

## Step 4 - Validate until it passes

Validate your files without storing them:

`studio_templates(operation="validate", template_id=41, text_files={"studio.json": "...", "template.liquid": "..."})`

The files are laid over the stored draft, as a push would. `delete_missing=True` validates exactly the files you send. With no files, validate checks the stored draft.

The result is `ok`, `errorCount`, `warningCount` and `issues`. Each issue has:

| Field | Meaning |
|---|---|
| `file`, `line`, `column` | where: `template.liquid` line 42, or a data path such as `data.leads[2].linkedin_url` |
| `rule` | the stable rule id, for example `section-mismatch` |
| `severity` | `error` blocks publishing; `warning` never does |
| `message` | what is wrong |
| `fix` | one sentence on what to change |

Fix by `rule`, using the rule table in the bundle reference. Fix every error in one pass, then validate again. Read each warning too: `liquid-unknown-variable` means something renders empty, and `asset-relative-url` means an image or file does not load.

Done when `ok` is true and you have read every warning. Then store the draft:

`studio_templates(operation="push", template_id=41, text_files={"studio.json": "...", "template.liquid": "..."}, message="Hero, shortlist and first emails")`

Push returns the draft `version` and its `validation`. It stores the files even when they have errors; publish refuses them. When the latest version is already published, a push starts the next draft. Binary files (logos, fonts) go up through `create-upload-url`; the bundle reference shows how.

## Step 5 - Preview on 3 accounts

Preview renders the stored draft on the workspace's own link host, the way a reader will see it. Push first: preview reads the stored version, not your working folder.

`studio_templates(operation="preview", template_id=41, account_ids=[3101, 3102, 3103])`

Pick 3 accounts from the brief with `accounts(operation="list", ...)`. Without `account_ids` it takes the 3 most recently touched accounts, else your `samples/`. A preview writes nothing, charges nothing, and takes up to a minute per account.

Preview in both modes before you call the build done:

- **Filled layout:** add `sample` to render a bundle sample's `data` on each account, with that account's own Ken variables (`account.*`, `person.*`, `sender.*`, `brand.*`). This is how the page looks after the fill, before any page exists: `studio_templates(operation="preview", template_id=41, account_ids=[3101, 3102, 3103], sample="samples/full.json")`. Each preview's `sample.name` says which sample rendered. With no account to render on, the sample renders alone.
- **Fallback:** leave `sample` out. An account that has no page on this template yet renders its Ken variables with every slot on its `fallback`: that is what the reader sees before the fill. An account that already has a page renders its filled data.

Do not push a throwaway draft with sample data baked in to see the filled layout: `sample` does that without a push.

Each entry in `previews` has:

| Field | What to do with it |
|---|---|
| `url` | the hosted page, signed for 24 hours. Give it to the user. Null with `reason` `no_workspace_host` (the workspace has no link host: screenshots still come back) or `link_safety_flagged` |
| `screenshots.desktop`, `screenshots.mobile` | PNG URLs valid for 1 hour. Open both when your environment can show an image, and check that long names wrap, tables and charts fit, and the call to action is visible |
| `consoleErrors` | must be empty. A Liquid or script error shows here |

`linkIssues` lists links that block a publish (`link-domain-blocked`, `link-domain-new`). For a calculator or a form, add `interact` steps (`click`, `type`, `wait`) to drive the page, then read `interact.finalScreenshot`.

Fix what you see, then validate, push and preview again. A 429 means the workspace used its 200 previews for the day.

Done when the 3 previews in each mode have no console errors and no link issues, both screenshots look right, and you have given the user the 3 filled-layout preview URLs.

If the `studio_templates` tool does not list `preview`, render locally instead, as the bundle reference describes under "Samples for local preview".

## Step 6 - Publish

`studio_templates(operation="publish", template_id=41)`

This publishes the draft (or `version_id=`). New pages use it, and pages that have no link yet move to it. Live pages (a link went out) stay where they are unless you pick them with `update_live`:

| `update_live` | What happens |
|---|---|
| `"none"` (default) | Live pages stay on their version. |
| `"all"` | Every live page is refilled on the new version, as a run (`updateRunId`). URLs and links stay. |
| `[812, 813]` | Only these live pages are refilled. |

Refilling live pages runs Ken's executor: only the slots the new version added or changed are refilled, and tokens are charged at 2x model cost. The page credit is not charged again. Ask the user before sending `"all"` or a list.

The response has `version`, `followedCount` (pages that moved with it), `liveCount` (live pages still on an older version) and `updateRunId`.

Publish refuses with 409 `invalid_state`:

- Validation errors: each entry in the error details has `field` = `file:line` and `code` = the rule. Fix, push, validate, publish again.
- A flagged link (`link_safety_flagged`): each detail is a URL with code `link-domain-blocked`. Remove the link or point it at a domain you trust.
- `already_published`: push a change to start a new draft. `no_draft`: push a bundle first.

A workspace can publish 50 times a day (429 past that). A 503 means nothing changed: retry in a minute.

## Step 7 - Run on accounts

Find the account ids with the `accounts` tool: `accounts(operation="list", q="Fernway")` matches a name or domain, and `accounts(operation="list", stage="engaged")` filters by stage.

Pick who writes the `prompt` and `grade` steps:

| `executor` | Who writes | Cost | Use it for |
|---|---|---|---|
| `"ken"` (default) | The platform's executor | model tokens at 2x cost, plus data steps | many accounts, unattended |
| `"agent"` | you, with your own model | no token charge for the steps you write; data steps still at rate card, and a `ken.copy` tool step still runs on the platform's model | a few accounts, on your own subscription |

When the user wants the fill to cost no tokens, build the template without `ken.copy`: write that copy in a `prompt` step, which your own model then writes.

With `"ken"`, always estimate first and show the user the number:

`studio_pages(operation="run-estimate", template_id=41, account_count=25, executor="ken")`

It returns `credits` and a per-account `breakdown` (`page_link`, `data_steps`, `model_tokens`). Run only after the user says yes:

`studio_pages(operation="run-create", template_id=41, account_ids=[3101, 3102], executor="ken")`

With `"agent"`, create the run the same way with `executor="agent"`, then open the fill guide (`load_skill("studio-asset", reference="references/studio-fill.md")`) and fill each page.

When the user asks you to "fill the pages waiting for your agent" on a template, the platform already created the run. List the runs with `studio_pages(operation="run-list", template_id=41)` and take those with `executor` `"agent"`. A listed run carries no pages, so read each one with `studio_pages(operation="run-get", run_id=77)` for its `assets`, then fill each page in `draft` with the fill guide.

The run comes back with `assets` (`assetId`, `accountId`, `state` per page) and `skipped` (a page that is live or building, with the reason). One template has one page per account: a second run on the same account reuses its page. A run takes at most 500 ids.

Follow it with `studio_pages(operation="run-get", run_id=77)`: `state` (`queued`, `running`, `completed`, `failed`, `cancelled`), counts, and each page's state and steps. A fill takes minutes, so check back with gaps. List the results with `studio_pages(operation="list", template_id=41, state="ready,needs_review,failed")`.

A `needs_review` page had a grade fail after its retries, or its data could not be validated. Read it with `studio_pages(operation="get", asset_id=901)` (`data`, `slotStatus`), then refill it, or prepare and submit corrected data. A person can also review it on the page's Customize screen in Ken: their save there moves it to `ready`. An agent's `customize` edit leaves it in review.

## Step 8 - Create the link

`studio_pages(operation="create-link", asset_id=901, person_id=5521)` returns the person's link: `https://{host}/{account-slug}/{page-slug}-for-{first-name}`. Get person ids from the account's stakeholders: `accounts(operation="stakeholders-list", account_id=3101)`.

- `shared=True` makes the shared link, `https://{host}/{account-slug}/{page-slug}`, where `person.*` is null.
- `contact_id=` makes a link for a lead on a campaign page.

The first link publishes the page and charges 1 credit. The page goes `live` and its URL freezes. More links on that page are free, and asking again for the same person returns the existing link. Say so before you create first links on many pages.

To change the `{page-slug}` part, do it before the first link: `studio_pages(operation="update", asset_id=901, page_slug="churn-plan")`.

| Error | Meaning | Do |
|---|---|---|
| 402 | not enough credits; nothing was created | tell the user to add credits |
| 409 `studio_no_host` | the workspace has no link host of its own | set up link tracking on a sending domain in the app, then retry |
| 409 `studio_page_not_ready` | not filled and the template has no fallback, or the page needs review | wait for the fill, refill, or prepare and submit |
| 409 `studio_page_retired` | the page retired | republish it first (1 credit) |
| 429 | 2,000 link creates a day per workspace | wait until tomorrow |

A link whose `publishedAt` is null is still being published to the host. Create the same link again to retry.

A doc page (template format `doc`) can also go out as a file the prospect can comment on, when the workspace has the `rd_docs` flag: `studio_docs(operation="create-doc-export", asset_id=901, provider="google_drive")` (or `"onedrive"`) puts it in the calling member's own Google Drive or OneDrive and shares it by link. On a campaign page it also writes `rd_link` on that company's leads. If the account's admin blocks public sharing, you get the shared Studio link instead (`status: studio_page`). Read existing exports with `studio_docs(operation="list-doc-exports", asset_id=901)`.

## Step 9 - Use it in a touch

- **Accounts:** put the person's link in the next touch you draft for them, or use "Use in next touch" on the account's Assets tab in the app. A touch that uses a page can be approved in Today only once the page is ready.
- **Campaigns:** a sequence step takes the merge tag `asset_link`, written in double curly braces. The platform builds the page one step ahead and the email always sends on schedule; slot fallbacks cover anything not filled yet. A step can use a template only when every required slot has a fallback or the bundle ships `fallback.liquid`.

Views, sections read, CTA clicks and form submissions show on the account in the app. Read them for one page with `studio_pages(operation="engagement", asset_id=901)`:

- `views`: `human`, `scanner` and `pending` counts. Only human views are reads; scanners are mail-security bots that open links first.
- `people`: each person or lead with a human view (`visits`, `visibleMs`, `lastViewAt`, and `likelyForwarded` when someone else opened their link).
- `sections`: time spent per section, longest first. `events`: the latest CTA clicks, PDF downloads and form submits.
- `attribution.meetings`: meetings booked on the account after a booking CTA click or within 14 days of a human view.

For a campaign's pages, `studio_pages(operation="asset-engagement-get", campaign_id=55)` sums them per company.

## Recruiting pages

A recruiting page is for one candidate, not for an account. It needs the workspace's `recruiting` flag: without it `studio_templates(operation="starters-list")` leaves the recruiting starters out, and `studio_templates(operation="create", template_type="recruiting")` answers 400 `validation_failed` with `feature_disabled`.

- **Who it belongs to.** One page per lead of a recruiting campaign, keyed by the lead (`contactId`), with no company: a lead without a company still gets a page. The link is `https://{host}/{first-last}/{page-slug}-for-{first-name}`, for example `https://go.acme.com/maya-chen/role-for-maya`.
- **What it reads.** `person.*` with the candidate's `current_title`, `current_company`, `location`, `skills`, `experience_summary` and `linkedin_url`, set while the page fills as well as on the page, so a `prompt` step can write from them. `role.*` is the campaign's role (`title`, `company`, `location`, `remote_policy`, `pay_range`, `description`, `highlights`, `job_url`, `booking_url`), and `roles` is the campaign's primary role and its open extra roles, primary first, at most 4. `account` is empty: never read it on a recruiting page.
- **Starters.** `role-pitch`: why their background fits, the role, the team, the pay range and the process, with a booking button and an optional hiring-manager video. `roles-for-you`: the open roles that fit them, each with a "why you" line and a book or apply button. Build with the bundle reference and the `recruiting.md` playbook.
- **How pages get made.** Pin the template on the recruiting campaign with `studio_pages(operation="asset-template-put", campaign_id=55, template_id=41)` and put the `asset_link` merge tag in a step. The platform builds each candidate's page one step ahead, in email steps and in LinkedIn messages and InMails alike. To build pages before the first send, run the template on the campaign's leads: `studio_pages(operation="run-create", template_id=41, campaign_id=55, contact_ids=[9001, 9002])`; each page comes back with its `contactId`. Step 7's account runs do not apply.
- **A link by hand.** `studio_pages(operation="create-link", asset_id=901, contact_id=9001)`.
- **What counts.** A booking made from the page counts as a meeting with rule `page_booking` in `studio_pages(operation="engagement", asset_id=901)`, and the candidate's views, CTA clicks and form submits show on their card in the role's pipeline.

## Step 10 - After it ships

- **Hand edits:** `studio_pages(operation="customize", asset_id=901, overrides={"headline": "Six people who should hear about Fernway first"})`. Overrides merge over the fill; a null value removes one. `studio_pages(operation="customize", asset_id=901, reset=True)` drops them all. A live page is republished with the edit. Errors: 400 `unknown_slot`, `link-domain-blocked`, or a value that breaks its slot schema.
- **Refill:** `studio_pages(operation="refill", asset_id=901)` reruns the recipe with Ken's executor on the page's pinned version, charged like a fill. A live page stays live and keeps its links. A page that follows the latest version and is not live or retired refills on the latest published version, so a filled page a publish left on its version (because the new version reruns its steps) catches up.
- **Republish a retired page:** `studio_pages(operation="republish", asset_id=901)` brings back the same URLs for 1 credit.
- **Change the template:** pull, edit, validate, push, then publish with the `update_live` you want.
- **Delete:** only when the user asks. `studio_templates(operation="delete", template_id=41)` fails while pages are live; `force=True` retires them first, so ask before sending it.

## Credits

| What | Cost |
|---|---|
| A Studio page, on its first link (shared or person) | 1 credit |
| More person links on the same page | free |
| Republishing a retired page | 1 credit |
| The platform writing the `prompt` and `grade` steps (executor `"ken"`, refill, `update_live`) | model tokens at 2x cost |
| Your own agent writing the `prompt` and `grade` steps over MCP (executor `"agent"`) | no token charge |
| A `ken.copy` tool step, on any path | model tokens at 2x cost |
| Data steps the platform runs | rate card: email found 1 credit, qualification 0.05, personalization 0.3. Today's data steps (`bind`, Ken Search, `chart.data`) cost nothing |
| Scraping | free until the rate card prices it |
| `webhook` and `dataset` steps, PDF, hosting, previews | free |

## Who did what

Every write you make is recorded as the connected user through your client, for example "Cristian via Claude Code". The MCP takes your client's name from the MCP handshake.

- A version you push has `builtBy: "customer_agent"` and `agentClient` set to your client's name. It shows in the template's version history (`studio_templates(operation="list-versions", template_id=41)`) and in Settings > API & MCP.
- Templates, pages, runs and links carry `createdBy` and `updatedBy` with `kind` (`agent` for your writes) and `via` (your client's name).
- A script you run that sends HTTP requests to the MCP endpoint itself, instead of calling the tools through your client, carries no handshake. Send the header `X-Ken-Mcp-Client` with your client's name on every one of its requests, for example `X-Ken-Mcp-Client: cursor` or `X-Ken-Mcp-Client: claude-code`. Without it, the write is recorded under the API key's name instead of your client.

## Page states

- `draft`: created, not filled yet. Agent runs leave pages here until you submit.
- `building`: The platform's executor is filling it.
- `ready`: filled; every required slot has a value or a fallback.
- `needs_review`: a grade failed after its retries, or the data could not be validated. It cannot get a first link.
- `failed`: a required slot has no value and no fallback.
- `live`: a link went out. The URL is frozen.
- `retired`: 30 days after the last activity on its account (a touch sent, a reply, a human view). Its link shows "This page has expired" with a "Request a fresh copy" button.

## Troubleshooting

| Symptom | Meaning | Do |
|---|---|---|
| 404 on every Studio call | Studio is not on for this workspace yet | stop and tell the user |
| 404 on one id | another workspace's id, or deleted | check `client_id` and the id |
| 409 on publish with rule codes | validation errors | fix by rule, push, publish |
| 409 `link_safety_flagged` | a link points at a blocked domain | remove or replace that link |
| 409 `studio_template_not_published` or `studio_version_not_published` | runs need a published version | publish first |
| 409 `studio_nothing_to_run` | every page is live or building | refill live pages, or publish with `update_live` |
| 409 `studio_page_building` | a fill is running | wait; follow it with `run-get` |
| 409 `studio_slug_frozen` | the page already has a link | keep the slug |
| 409 `studio_page_invalid_state` on prepare or submit | the page is building or retired | wait, or republish |
| 409 `studio_version_changed` on submit | the page moved to another template version after your prepare; nothing was saved | prepare again and submit with its `versionId` |
| 402 | not enough credits | tell the user to add credits |
| 429 `quota_exceeded` | daily limit per workspace: 50 publishes, 2,000 link creates, 5,000 run pages | wait until tomorrow; do not retry in a loop |
| 503 | the page host, the link check, the starter gallery or fills were unavailable; nothing changed | retry in a minute |
