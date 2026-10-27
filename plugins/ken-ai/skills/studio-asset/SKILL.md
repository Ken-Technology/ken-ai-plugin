---
name: studio-asset
description: Fill one Studio template for an account, a prospect or a candidate - pick the template, check the data its fields need, run the fill with Ken or your own model, gate the page, create each person's link and put it in a touch. Includes the sample campaign for a prospect.
---

# Studio assets

A Studio asset is one template filled for one account (or, on a recruiting campaign, one candidate): a page on the workspace's own link host, with one link per person (`https://{host}/{account-slug}/{page-slug}-for-{first-name}`), human-confirmed view tracking and account signals. This skill fills a specific template: it picks the template, checks the data each field needs, runs the fill, gates the page, creates the links and hands them to a touch.

Building or editing the template itself is the `studio-template` skill.

Every call takes `client_id`, the workspace id. Send it on every call when the user can see more than one workspace.

## The rules

- **Nothing sends.** You fill pages, create links and write drafts. A person approves every touch and every send.
- **Never invent.** A field you cannot fill from real data falls back; it is never made up. No invented customers, numbers, prices, dates, times or offers, and every number on a page traces to its source.
- **Gate before the first link.** A page in review, on its fallbacks or failing the confidentiality check never gets a link.
- **Costs are said out loud.** Estimate before a `"ken"` run, and say before you create first links on many pages that each costs 1 credit.
- **Vendor names never reach a reader**, and prospects never read "demo" or "reverse demo".
- Changing a template that live client campaigns use, or pinning one to a sending campaign, needs a yes that names that client: that is the `studio-template` skill's job.

## Step 0 - Check Studio is on

Studio is in beta behind the workspace's `studio` flag, and its operations are staff exposure until the flag is on for the workspace.

- If `studio_pages` is not in your tool list, or `studio_templates(operation="list")` answers 404, Studio is not on for this workspace. Say so in one sentence and point to https://app.ken.so/demo/studio. Do not retry, and never read the 404 as "not found".
- A 404 on one id while other calls work means another workspace's id or a deleted one.
- Recruiting pages need `recruiting`; Google Drive and OneDrive doc exports need `rd_docs`; research refreshes need `accounts_research`. Tell the user which part is off and carry on with the rest.

## Where to start

| The user says | Start at |
|---|---|
| "Fill the audit template for Northwind." | Step 1 |
| "Fill the pages waiting for your agent on Ken Studio template 41." | `studio_pages(operation="run-list", template_id=41)`, take the runs with `executor` `"agent"`, read each with `studio_pages(operation="run-get", run_id=77)` for its pages, then Step 4 |
| "They asked to see the work." / "Send each target a sample campaign." | "Sample campaign for a prospect" below |
| "Is anyone reading the page?" | Step 8 |

## Step 1 - Pick the template and open its fill guide

List the templates: `studio_templates(operation="list")` (filter with `template_type`). Runs need a published version; `studio_templates(operation="get", template_id=41)` shows it. With no template that fits, building one is the `studio-template` skill.

Read the template's files with `studio_templates(operation="pull", template_id=41)` and match its `studio.json` to a starter by its slug and recipe steps. Then open that starter's fill guide with `load_skill("studio-asset", reference="references/<file>")`. Each guide says what every field needs, where its data comes from, what to set up before a run, and what to check before the first link:

| Starter | Page slug | Fill guide |
|---|---|---|
| `rd-doc`, sample outbound campaign doc | `outbound-campaign` | `rd-doc.md` |
| `rd-ken-native`, we built you a campaign | `campaign-preview` | `rd-ken-native.md` |
| `rd-your-product`, your product on their data | `what-we-found` | `rd-your-product.md` |
| `audit-rewrites`, website audit with rewrites | `site-notes` | `audit-rewrites.md` |
| `benchmark-report`, peer benchmark report | `peer-benchmark` | `benchmark-report.md` |
| `case-study`, built for you case study | `customer-story` | `case-study.md` |
| `event-invite`, dinner or webinar invite | `invite` | `event-invite.md` |
| `roi-calculator`, ROI calculator | `prospecting-roi` | `roi-calculator.md` |
| `role-pitch`, role pitch for one candidate | `role` | `role-pitch.md` |
| `roles-for-you`, roles for you | `roles` | `roles-for-you.md` |

`studio_templates(operation="starters-list")` lists the gallery's current starters. The workspace's own `studio.json` always wins over a guide: a copy may have changed slots or steps. For a template that matches no starter, build the same table yourself from `slots` (required, limits, fallback) and `recipe` (which step fills each slot, and from what).

## Step 2 - Pick the accounts and check their data

Find the accounts with `accounts(operation="list", q="Northwind")`, `accounts(operation="list", stage="engaged")` or `accounts(operation="list", domain="northwind.com")`. A recruiting template runs on a campaign's leads instead (Step 3).

Then check what the fill guide says the fields read, before you spend anything:

- **Research.** Most starters read the account's dossier (`account.dossier.summary`, `why_now`): `accounts(operation="get", account_id=3101, expand="research")`. A refresh is `committee(operation="research", account_id=3101)`: charged, so ask first.
- **The homepage** for starters that scrape it: the account needs a primary domain that loads without a login.
- **Datasets** for `benchmark-report` and `case-study`: `studio_templates(operation="datasets-list", template_id=41)`.
- **Template settings** such as the event details or a webhook endpoint: a template still holding a starter's example values is not ready to run.
- **Ken Search** finds people only in the United States, the United Kingdom, Canada, Australia, Ireland and New Zealand.

Recipes cannot read Knowledge yet (`knowledge.*` is empty at fill time), so the fill never uses the workspace's Knowledge files.

## Step 3 - Choose who writes, estimate, run

| `executor` | Who writes the `prompt` and `grade` steps | Cost | Use it for |
|---|---|---|---|
| `"ken"` (default) | Ken AI | model tokens at 2x cost, plus data steps | many accounts, unattended |
| `"agent"` | you, with your own model | no token charge for the steps you write; data steps at rate card; a `ken.copy` step still runs on Ken AI | a few accounts, on your own subscription |

With `"ken"`, estimate first and show the user the number: `studio_pages(operation="run-estimate", template_id=41, account_count=25, executor="ken")` returns `credits` and a per-account `breakdown`. Run only after a yes:

`studio_pages(operation="run-create", template_id=41, account_ids=[3101, 3102], executor="ken")`

- One template has one page per account: a second run reuses it. A live or building page is left out with its reason in `skipped`.
- Refill existing pages with `asset_ids=[901, 902]`. A run takes at most 500 ids; a workspace fills 5,000 pages a day.
- A recruiting campaign builds one page per lead: `studio_pages(operation="run-create", template_id=41, campaign_id=55, contact_ids=[9001, 9002])`. The template must be the one pinned on that campaign.

## Step 4 - Fill with your own model (executor `"agent"`)

Create the run with `executor="agent"`; its pages wait in `draft`. Then open the fill guide for this path, `load_skill("studio-asset", reference="references/studio-fill.md")`, and fill one page at a time: `studio_pages(operation="prepare", asset_id=901)` runs the data steps and returns your instructions, you write the prompt slots from the inputs only, grade them yourself in a separate call, and `studio_pages(operation="submit", asset_id=901, data={...}, grade_results=[...], version_id=57)`. Report every grade verdict truthfully: a failed one sends the page to review.

## Step 5 - Follow the run and gate each page

Follow it with `studio_pages(operation="run-get", run_id=77)`: `state` (`queued`, `running`, `completed`, `failed`, `cancelled`), counts, and each page's state. A fill takes minutes: check back with gaps, not in a loop. List the results with `studio_pages(operation="list", template_id=41, state="ready,needs_review,failed")`.

Read each page with `studio_pages(operation="get", asset_id=901)`: `data`, `slotStatus` (`filled`, `fallback` or `failed` per slot) and `previewUrl` (a private preview that counts no view). A page passes only when:

1. Its `state` is `ready` and its latest grade passed.
2. Every slot the page shows is `filled`, except the ones its fill guide says may fall back.
3. Every number traces to its source (site, dataset, endpoint, search result), and the guide's own checks hold.
4. Confidentiality: no email address or phone number except the sender's own, no other client's names or data, no vendor or tool names, no "demo".
5. You read it once through `previewUrl`, on desktop and mobile.

A `needs_review` page failed a grade after its retries or holds data that broke a rule. Refill it once (`studio_pages(operation="refill", asset_id=901)`, charged like a fill), or ask a person to review it on its Customize screen (https://app.ken.so/demo/studio/pages/901/customize): their save there moves it to `ready`; your own `customize` edit does not.

## Step 6 - Create the links

`studio_pages(operation="create-link", asset_id=901, person_id=5521)` returns the person's link. Get person ids from `accounts(operation="stakeholders-list", account_id=3101)`. `shared=True` makes the shared link (`person.*` is null there); `contact_id=` links a lead of a campaign.

- The first link publishes the page, charges 1 credit, sets it `live` and freezes its URL. More links are free; asking again for the same person returns the existing link.
- Change the `{page-slug}` part only before the first link: `studio_pages(operation="update", asset_id=901, page_slug="churn-plan")`.
- List a page's links with `studio_pages(operation="list-links", asset_id=901)`. A `publishedAt` of null is still publishing: create the same link again to retry.
- A doc page can also go out as a file in the member's Google Drive or OneDrive (flag `rd_docs`): `studio_docs(operation="create-doc-export", asset_id=901, provider="google_drive")`.

| Error | Do |
|---|---|
| 402 | not enough credits; nothing was created: tell the user |
| 409 `studio_no_host` | the workspace has no link host: set up link tracking on a sending domain, then retry |
| 409 `studio_page_not_ready` | not filled with no fallback, or in review: Step 5 |
| 409 `studio_page_retired` | `studio_pages(operation="republish", asset_id=901)` first (1 credit) |
| 429 | 2,000 link creates a day: wait until tomorrow |

## Step 7 - Use it in a touch

- **Accounts:** put the person's link in the next touch you draft for them (the `accounts` skill), or use "Use in next touch" on the account's Assets tab. The touch waits for a person in Today, and it can be approved only once the page is ready.
- **Campaigns:** a step carries the merge tag `asset_link`, written in double curly braces, and Ken AI builds each company's page one step ahead from the campaign's pinned template; slot fallbacks cover anything not filled yet. Pinning is the `studio-template` skill.

## Step 8 - Read engagement

`studio_pages(operation="engagement", asset_id=901)`:

- `views`: `human`, `scanner` and `pending`. Only human views are reads; scanners are mail-security bots. Never report scanner or pending views as reads.
- `people`: each person or lead with a human view (`visits`, `visibleMs`, `lastViewAt`, `likelyForwarded`).
- `sections`: time per section, longest first. `events`: CTA clicks, PDF downloads, form submits.
- `attribution.meetings`: meetings booked after a booking click or within 14 days of a human view.

For a campaign's pages, `studio_pages(operation="asset-engagement-get", campaign_id=55)` sums them per company.

## After it ships

- **Hand edits:** `studio_pages(operation="customize", asset_id=901, overrides={"headline": "Six people who should hear about Fernway first"})`. Overrides merge over the fill; a null value removes one; `reset=True` drops them all. A live page is republished with the edit.
- **Refill:** `studio_pages(operation="refill", asset_id=901)` reruns the recipe with Ken AI's executor, charged like a fill. A live page keeps its links.
- **New template version:** `studio_pages(operation="update-version", asset_id=901)` moves one page to the latest published version and refills only what changed. Ask first: it is charged.
- **Retired** pages (30 days after the account's last activity) come back with `republish` for 1 credit.

## Sample campaign for a prospect

When a prospect asks to see the work, build them a real sample: their campaign, aimed at their buyers, never a campaign that sells your product. Open `references/sample-campaign-for-prospect.md` and follow it. In short:

1. Find the reply (`threads(operation="list", q="mitch@events.com")`) and check it is a real ask, not an out-of-office, a referral or a no.
2. Make the prospect an account and research their buyers from a real source. Stop when you cannot name them.
3. Fill the `rd-doc` (or `rd-ken-native`) template on that one account, as in Steps 3 to 5.
4. Gate the page: grade passed, every shown slot filled, every number real, no lead email addresses, no other client's data, no lead at the prospect itself.
5. Create their link and leave a draft reply on the thread. Nothing sends: a person reads and sends it.

## Credits

| What | Cost |
|---|---|
| A page, on its first link (shared or person) | 1 credit |
| More links on the same page | free |
| Republishing a retired page | 1 credit |
| Ken AI writing `prompt` and `grade` steps (executor `"ken"`, refill, update-version) | model tokens at 2x cost |
| Your own agent writing them (executor `"agent"`) | no token charge |
| A `ken.copy` step, on any path | model tokens at 2x cost |
| Data steps | rate card; today's (`bind`, Ken Search, `chart.data`, scraping, `webhook`, `dataset`) cost nothing |
| Previews, hosting, PDFs | free |

## What this skill cannot do yet

- Studio fills cannot read Knowledge, so the offer and proof come from the template, its datasets or its endpoint.
- No tool checks a page for leaked data or poached leads: you read the page's `data` yourself (Step 5).
- No tool sets a new workspace's plan, so a separate sample workspace needs a person to confirm it is on the Free plan.

## References

Open with `load_skill("studio-asset", reference="references/<file>")`:

- One fill guide per starter: `rd-doc.md`, `rd-ken-native.md`, `rd-your-product.md`, `audit-rewrites.md`, `benchmark-report.md`, `case-study.md`, `event-invite.md`, `roi-calculator.md`, `role-pitch.md`, `roles-for-you.md`.
- `studio-fill.md`: filling a page with your own model, from prepare to submit, with a worked example.
- `sample-campaign-for-prospect.md`: the whole sample-campaign recipe, from the reply to the draft.

## No Ken account yet

These steps run on the Ken MCP server, which signs in with a Ken account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
