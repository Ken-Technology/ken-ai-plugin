---
name: studio-template
description: Build, edit and manage Studio templates - start one from the Kenso template library or blank, write the bundle, validate, preview on real accounts, publish, manage versions and datasets, and pin a template to a campaign.
---

# Studio templates

Studio is Library > Studio in Kenso. A template is built once (a reverse demo, audit, report, landing page, event invite, calculator, recruiting page or cold email) and Kenso fills a copy of it for each account: a Studio page on the workspace's own link host. This skill covers the template itself: start it, write its files, check them, preview them on real accounts, publish, and manage versions, datasets and campaign pins.

Filling a template for one account, prospect or candidate, and sending each person their link, is the `studio-asset` skill.

Every call takes `client_id`, the workspace id. Send it on every call when the user can see more than one workspace.

## Step 0 - Check Studio is on

Studio is in beta behind the workspace's `studio` flag, and its operations are staff exposure until the flag is on for the workspace.

- If `studio_templates` is not in your tool list, or `studio_templates(operation="list")` answers 404, Studio is not on for this workspace. Say so in one sentence and point to https://app.ken.so/<workspace id>/demo/studio. Do not retry, and never read the 404 as "no templates".
- A 404 on one id while other calls work means the id belongs to another workspace or was deleted. Check `client_id` and the id.
- Extra flags: `recruiting` for recruiting templates, `studio_email` for the email format, `rd_docs` for Google Drive and OneDrive doc exports. Without one, that part answers 400 `feature_disabled` or is left out of the list: tell the user which part is off and carry on with the rest.

## Where to start

The "Build with your agent" and "Edit with your agent" buttons in Studio hand the user one line to paste:

| The user says | Start at |
|---|---|
| "Build a new Kenso Studio template." | Step 1 |
| "Build Kenso Studio template 41." or "Edit Kenso Studio template 41." | `studio_templates(operation="get", template_id=41)`, `studio_templates(operation="pull", template_id=41)`, then Step 3. Ask what to change when the user has not said |
| "Which templates do we have?" | `studio_templates(operation="list")`, then "Manage templates" |
| "Fill the pages waiting for your agent on template 41." | The `studio-asset` skill |

Work through to the end of the ask without stopping between steps. A build ends with a pushed draft that validates and 3 previews (Step 5). Publish (Step 6) only when the user asked for it.

## Step 1 - Brief

Ask, or read from the conversation:

1. Who reads the page: role and kind of company.
2. What the reader should do next: book a call, reply, save a seat, run the numbers.
3. Which accounts it runs on: named accounts, a stage, or a campaign's companies or candidates.

Pick the type and the closest starter:

| `template_type` | Pick it when the page | Starter |
|---|---|---|
| `reverse_demo` | shows the account work you already did for them | `rd-doc` (doc with PDF), `rd-ken-native`, `rd-your-product` (your own endpoint) |
| `audit` | lists what gets in a buyer's way on their own site, with fixes | `audit-rewrites` |
| `report` | puts the account next to its peers, from your data | `benchmark-report` |
| `landing_page` | retells your closest customer story for them | `case-study` |
| `event` | invites them to a dinner or webinar and saves the seat | `event-invite` |
| `calculator` | lets them run the numbers, then book | none for now, see `references/calculator.md` |
| `recruiting` | pitches a role to one candidate, or shows the roles that fit them (flag `recruiting`) | `role-pitch`, `roles-for-you` |
| `other` | fits none of these, or is a cold email (`template_format="email"`, flag `studio_email`) | none, start blank |

`template_format` is `page` (web only), `doc` (web plus a PDF download) or `email`.

Done when you can say in one sentence who the page is for, what they do next, and which accounts it runs on.

## Step 2 - Start the template

Check what exists first: `studio_templates(operation="list", template_type="audit")`. Reuse or copy a template that already fits:

`studio_templates(operation="duplicate", template_id=41, name="Site notes for agencies")`

The copy gets the source's latest published files (else its draft) and its datasets as draft version 1. Pages and links are not copied.

To start from the Kenso template library, search it with `studio_templates(operation="starters-list", q="deal room")` (filters `type`, `category`, `needs` and `featured`; each template has `slug`, `name`, `type`, `format`, `description`, `category`, `tags`, `needs`, `coverUrl` and `samples` with a preview `url`). Read one's sections and recipe with `studio_docs(operation="starters-get", slug="deal-room")`, then copy it:

`studio_templates(operation="create", starter_slug="deal-room", name="Deal room for Brightwave")`

To start blank: `studio_templates(operation="create", name="Pipeline teardown", template_type="audit", template_format="page")`.

Then read the files with `studio_templates(operation="pull", template_id=41)`. Text comes back inline; binaries come back as a `downloadUrl` valid for 15 minutes.

## Step 3 - Write the bundle

Open the bundle reference before you write or fix any file: `load_skill("studio-template", reference="references/studio-template-builder.md")`. It holds `studio.json`, the slot schema subset, fallbacks, Liquid, Kenso variables, the four kit snippets, the Content Security Policy, links, recipe steps and every validation rule id with its fix. Then open the playbook for your type: `references/reverse-demo.md`, `audit.md`, `report.md`, `landing-page.md`, `event.md`, `calculator.md`, `recruiting.md` or `email.md`.

The bundle is `studio.json`, `template.liquid`, an optional `fallback.liquid`, `assets/` and `samples/`. Keep three samples: a full one, a shared one (`"person": null`) and a partial one (some slots missing).

- With no shell (Claude Desktop, claude.ai, ChatGPT), keep the files in the conversation and send them inline in `text_files`. Add an image from a public URL with `files={"assets/logo.png": {"fromUrl": "https://example.com/logo.png"}}` (5 MB at most).
- Reference assets as `{{ asset_url | append: '/logo.png' }}`, never as a relative `assets/logo.png`.
- Recipe prompts use facts from their inputs only. Put a `requires` on every prompt that writes from a search or tool result, so an empty result falls back instead of inventing people.
- Recipes read Knowledge through the `knowledge.context` pack: bind `knowledge.stable` (instructions, company files, the same for every account) or `knowledge.scoped` (the page's account's files, signals and facts). There is no flat `knowledge.offer`, so that bind falls back. With the `knowledge` flag off the pack is empty and a `knowledge.*` bind falls back too.

**Brand kit.** Style the page from the workspace brand kit, never from a color or font you pick: `brand.colors.primary`, `brand.colors.accent`, `brand.fonts.heading`, `brand.fonts.body`, `brand.logo_url`, `brand.icon_url` and `brand.name`. Any of them can be null, so give each a `| default:`, assigned once at the top of `template.liquid`: `{%- assign accent = brand.colors.primary | default: '#4f00d0' -%}`. Never hard-code a brand color or font the kit has. Read the kit with `studio_docs(operation="brand-kit-get")` (flag `brand_kit`). When it is empty, offer `studio_docs(operation="brand-kit-suggest")`, which reads the workspace's website and saves nothing, and save only what the user agrees to with `studio_docs(operation="brand-kit-update", fill_empty_only=True, ...)`.

## Step 4 - Validate, then push

Validate without storing:

`studio_templates(operation="validate", template_id=41, text_files={"studio.json": "...", "template.liquid": "..."})`

The files are laid over the stored draft, as a push would. `delete_missing=True` validates exactly what you send. The answer is `ok`, `errorCount`, `warningCount` and `issues`, each with `file`, `line`, `rule`, `severity`, `message` and `fix`. Fix every error by its rule id in one pass (the rule table is in the bundle reference), then validate again. Read every warning: `liquid-unknown-variable` renders empty and `asset-relative-url` does not load.

When `ok` is true, store the draft:

`studio_templates(operation="push", template_id=41, text_files={"studio.json": "...", "template.liquid": "..."}, message="Hero, shortlist and first emails")`

Push returns the draft `version` and its `validation`. It stores files even with errors; publish refuses them. A push after the latest version is published starts the next draft. Binaries go up through `studio_templates(operation="create-upload-url", ...)`, as the bundle reference shows.

## Step 5 - Preview on 3 accounts

Preview renders the stored draft on the workspace's own link host. Push first: preview reads the stored version, not your working copy.

`studio_templates(operation="preview", template_id=41, account_ids=[3101, 3102, 3103], sample="samples/full.json")`

Pick 3 accounts that match the brief with `accounts(operation="list", q="Fernway")` or `accounts(operation="list", stage="engaged")`. A preview writes nothing and charges nothing, takes up to a minute per account, and the workspace gets 200 a day (429 past that).

Preview in both modes before you call the build done:

- **Filled layout:** with `sample`, each account renders that sample's `data` with its own Kenso variables.
- **Fallback:** without `sample`, an account with no page renders every slot on its fallback, which is what a reader sees before the fill.

Each entry in `previews` has `url` (signed for 24 hours; give it to the user), `screenshots.desktop` and `screenshots.mobile` (open both when you can show images), and `consoleErrors` (must be empty). `linkIssues` lists links that block a publish. For a calculator or form, add `interact` steps and read `interact.finalScreenshot`. An email template returns `emailPreviews` instead.

Done when the 3 previews in each mode have no console errors and no link issues, the screenshots look right on desktop and mobile, and the user has the 3 filled-layout URLs.

## Step 6 - Publish

Publish only when the user asks or agrees:

`studio_templates(operation="publish", template_id=41)`

New pages use the published version, and pages with no link yet move to it. Live pages (a link went out) stay on their version unless `update_live` picks them:

| `update_live` | What happens |
|---|---|
| `"none"` (default) | Live pages stay on their version |
| `"all"` | Every live page is refilled on the new version as a run (`updateRunId`). URLs and links stay |
| `[812, 813]` | Only these live pages are refilled |

Refilling live pages runs Kenso's executor on the slots the new version changed, at 2x model cost. Ask the user before you send `"all"` or a list, and say what it costs.

Publish refuses with 409 `invalid_state` on validation errors (each detail names `file:line` and the rule), a flagged link (`link-domain-blocked`, `link-domain-new`), `already_published` (push a change first) or `no_draft`. 50 publishes a day per workspace; a 503 changed nothing, so retry in a minute.

## Manage templates

| Ask | Do |
|---|---|
| Which templates exist | `studio_templates(operation="list")`, filter with `template_type` |
| One template | `studio_templates(operation="get", template_id=41)` |
| Rename, retype, change format, slug or description | `studio_templates(operation="update", template_id=41, changes={"name": "Site notes"})`. Files change only through push |
| Version history | `studio_templates(operation="list-versions", template_id=41)`: status, `builtBy` (`ken` or `customer_agent`) and validation per version |
| One version | `studio_templates(operation="get-version", template_id=41, version_id=57)` for its file list and manifest; `studio_templates(operation="pull", template_id=41, version=57)` for its files |
| Go back to an older version | `studio_templates(operation="restore-version", template_id=41, version_id=57)` copies that published version's files, binaries included, into the draft as a new version. It does not publish: validate, preview, then publish. Live pages move only with `update_live` |
| Move one page to the new version | `studio_pages(operation="update-version", asset_id=901)`: a live page refills only the changed steps and stays on its links. Costs like a refill, so ask first |
| Copy a template | `studio_templates(operation="duplicate", template_id=41)` |
| Delete | only when the user asks. `studio_templates(operation="delete", template_id=41)` fails while pages are live; `force=True` retires them first, so ask before you send it |

**Datasets** (CSV rows a `dataset` recipe step picks from, such as `peers` or `case-studies`): upload with `studio_templates(operation="create-upload-url", template_id=41, path="peers.csv", content_type="text/csv", size_bytes=48210)`, PUT the bytes with the returned headers, then `studio_templates(operation="datasets-create", template_id=41, name="peers", upload_id="<uploadId>")`. List them with `studio_templates(operation="datasets-list", template_id=41)`. `studio_templates(operation="datasets-delete", dataset_id=12)` removes one: pages that pick from it fall back, so ask first.

**Webhook steps** (your own endpoint fills slots, as in `rd-your-product`): read the signing secret with `studio_templates(operation="get-webhook-secret", template_id=41)`. Never paste it into a chat, a file in the bundle or the page.

**Campaign pins.** A campaign's sequence can carry the merge tag `asset_link`, written in double curly braces, and Kenso builds each page one step ahead from the pinned template:

- Read the pin: `studio_pages(operation="asset-template-get", campaign_id=55)`.
- Set it: `studio_pages(operation="asset-template-put", campaign_id=55, template_id=41)`. A step can use a template only when every required slot has a fallback or the bundle ships `fallback.liquid`.
- Remove it: `studio_pages(operation="asset-template-delete", campaign_id=55)`.
- How a campaign's pages perform: `studio_pages(operation="asset-engagement-get", campaign_id=55)`.

Pinning, unpinning or pinning an email template to a sequence step changes what a live campaign sends. On a client's campaign, ask first, name the campaign, and wait for that person's yes. An email template is pinned through the sequence step: `references/email.md` has the call.

## Rules

- Nothing you do here sends. A page reaches a person only through a link someone puts in a touch or a sequence, and a person approves every send.
- Publish, `update_live`, `update-version`, `force=True` and dataset deletes change live pages: ask first and say the cost.
- Never invent prices, customers, numbers or quotes in fallbacks, samples or prompts. Fallbacks read only Kenso variables.
- Vendor names (the scraper, the search provider, the model) never appear on a page a prospect reads.
- Prospects never read "reverse demo" or "demo": the Kenso template library bans both in its grade checks; keep that.
- A structural change to a live template (new sections, new slots, a new recipe) is a new version and a publish, never a hand edit on single pages.
- Every write is recorded as the connected user through your client, for example "Maya via Claude Code". A script that calls the MCP endpoint directly sends the header `X-Ken-Mcp-Client` with its client name.

## Credits

Previews, validation, pushes, hosting and PDFs are free. Publishing is free. Pages cost 1 credit on their first link, and fills cost model tokens at 2x model cost when Kenso writes them: the `studio-asset` skill has the full table.

## What this skill cannot do yet

- No email template is in the Kenso template library; email templates start blank.
- `enrich.email` is not available as a recipe tool: its slot always falls back.

## References

Open with `load_skill("studio-template", reference="references/<file>")`:

- `studio-template-builder.md`: the bundle reference (format, schema, Liquid, kit, CSP, recipe steps, every validation rule).
- `studio.md`: the whole Studio loop in one guide, from brief to link, runs, credits and troubleshooting.
- Type playbooks: `reverse-demo.md`, `audit.md`, `report.md`, `landing-page.md`, `event.md`, `calculator.md`, `recruiting.md`, `email.md`.

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
