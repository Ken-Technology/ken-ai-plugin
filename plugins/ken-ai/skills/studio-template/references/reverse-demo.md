# Reverse demo playbook

A reverse demo shows an account the work before they buy it: a campaign, a result or a sample built on their own company. Three starters cover it. `studio-template-builder.md` (in this folder) holds the bundle format, the kit and every validation rule; this file covers what to build.

## What it is for

The buyer moment: a founder or sales lead at the account has seen your emails and not answered. Describing what you do has not worked, so you show it, built for their company, before the first call. The page earns the call by proving you understand their market.

Pick the starter by where the work comes from:

| Starter | Format | Pick it when |
|---|---|---|
| `rd-doc` | `doc` | You sell outbound or pipeline and can show the whole plan: strategy, segments, funnel, sample leads, first emails. Template #1. Reads top to bottom and downloads as a PDF. |
| `rd-ken-native` | `page` | Same idea on one screen: the buyers people search found for them and the first emails. Fewer slots, cheaper fill. |
| `rd-your-product` | `page` | Your own product does the work (a site checker, a data audit, a scoring model). A `webhook` step sends the account to your endpoint and your answer fills the page. |

Pick `audit.md` instead when your value is fixing what they already have, and `landing-page.md` when you cannot produce a sample of the work for each account.

What the earlier reverse-demo doc pipeline (before Studio) taught:

- **The page is the cheap part.** The work is the pipeline behind it: research, a segment plan, about 30 leads from people search, copy, a grader loop, then rendering. That pipeline took 6 to 8 minutes a doc. Spend your effort on the recipe and its prompts, not the CSS.
- **The data is structured.** Segments, a leads table, emails and two charts. Plain variable replacement cannot render a table or a chart. Declare each one as an array of objects with item properties and limits, loop over it in Liquid, and draw charts with `ken/chart`.
- **The top failure was an unresolved AI variable** left on the live page. Studio now blocks it three ways: `data-unresolved` rejects any filled value holding `{{`, `{%`, `[[` or `${`; the page server refuses rendered output that still holds Liquid and serves the fallback; and every required slot has a `fallback` or the bundle ships `fallback.liquid`. Write the fallback before the prompt.

## Sections that work

`rd-doc`, top to bottom. Each row is one element with `data-section`, and the ids match `sections` in `studio.json`.

| `data-section` | What it holds | Reads |
|---|---|---|
| `cover` | Logo or brand name, "An outbound campaign for {account}", who prepared it, the greeting, a "What's inside" list | Kenso variables only |
| `strategy` | The one bet, who it targets and skips, the offer, the channels, the goal | `data.strategy` |
| `segments` | Bar chart of sends per segment, one card per segment with its A vs B tests | `data.segments`, `data.segment_notes` |
| `funnel` | Funnel chart for 1,000 sends, the sequence in three steps | `data.funnel`, `data.funnel_notes` |
| `leads` | Table: name, title, company, why them, links | `data.leads`, `data.sampling_criteria` |
| `outreach` | Email 1 and a LinkedIn note for the top 3 leads | `data.emails` |
| `next_steps` | The offer line, the booking button, the sign-off | `data.offer` |

`rd-ken-native`: `hero`, `audience`, `people`, `emails`, `cta`. `rd-your-product`: `hero` (the headline metric), `findings`, `meaning`, `cta`.

Keep the cover free of `data.*`. It renders the same whether the fill is done or not, and `fallback.liquid` reuses it.

## Required slots

`rd-doc`:

| Slot | Type and limits | Filled by | Fallback |
|---|---|---|---|
| `strategy` | object: `intro`, `audience`, `offer`, `channels`, `goal`, strings of 40 to 900 chars | `plan` (prompt) | none, `fallback.liquid` |
| `segments` | array, 2 to 4 items: `label` (2 to 24), `sub` (max 40), `value` (integer), `tests` (max 4 `{name, hypothesis}`, each max 28) | `plan` | none, `fallback.liquid` |
| `funnel` | array, 3 to 6 items: `label` (max 28), `value` (integer) | `plan` | static: People reached 1000, Opened or accepted 460, Replied 48, Positive replies 19, Meetings booked 9 |
| `leads` | array, 3 to 10 items: `name`, `title`, `company`, `linkedin_url` (uri), `website`, `why` (max 140) | `copy` (prompt over the search results) | none, `fallback.liquid` |
| `emails` | array, 1 to 3 items: `name`, `title`, `linkedin_url`, `subject` (max 60), `body` (2 to 5 strings, max 420 each), `ps` (max 240), `linkedin` (max 280) | `copy`, checked by `grade` | none, `fallback.liquid` |

Optional slots: `offer`, `segment_notes`, `funnel_notes` and `sampling_criteria` print when present. `site`, `dossier`, `why_now`, `search` and `candidates` hold working data the template never prints. Every `to` must name a declared slot, so intermediate results get optional slots too.

Why `fallback.liquid` here: a generic segment plan or a made-up lead list is worse than no page. The structured slots have no fallback, and the bundle ships `fallback.liquid`: the cover, "I'm still finishing it. This link is the right one, so check back later today", and the booking button. The funnel gets a static fallback because planning numbers are not about the account. Give a slot a fallback only when a generic value is still true for every account.

`rd-ken-native` requires `shortlist` (3 to 6 people) and `emails` (1 to 3); `headline` and `intro` have Liquid fallbacks such as `"We built {{ account.name }} a campaign"`. `rd-your-product` requires `metric` (`label`, and `value` as a 1 to 12 character string so "8.4 MB" fits) and `findings` (1 to 6, `severity` one of `high`, `medium`, `low`); `headline`, `meaning` and `chart_title` have Liquid fallbacks over `account.domain`.

## The recipe that fills them

`rd-doc`:

| id | kind | What it does | Writes |
|---|---|---|---|
| `site` | tool `scrape.page` | Their homepage as markdown, 12,000 chars | `site` |
| `dossier`, `why_now` | bind | `account.dossier.summary`, `account.dossier.why_now` | `dossier`, `why_now` |
| `offer` | bind | `knowledge.offer`, so each workspace states its own offer | `offer` |
| `plan` | prompt | Strategy, 4 segments that add up to 1,000 sends, the funnel, search filters for segment 1 | 7 slots |
| `leads` | tool `ken_search.people` | 30 people across the market that match `data.search` | `candidates` |
| `copy` | prompt | Picks the best 8 to 10 leads, writes Email 1 and a LinkedIn note for the top 3 | `leads`, `emails` |
| `grade` | grade | The outbound email rubric, pass at 7.5, one retry | checks `emails` |

The key steps from the starter, prompts shortened:

```json
{ "id": "plan", "kind": "prompt", "model": "cheap",
  "inputs": ["account.name", "account.domain", "account.industry", "data.site", "data.dossier", "data.why_now"],
  "to": ["data.strategy", "data.segments", "data.segment_notes", "data.funnel", "data.funnel_notes", "data.search", "data.sampling_criteria"],
  "prompt": "... search: people search filters in camelCase that find the first segment: currentTitles, seniorityLevels, industries, companyHeadcount {min, max} and countries. Aim for a few thousand matches. ..." },
{ "id": "leads", "kind": "tool", "tool": "ken_search.people",
  "args": { "company": "any", "filters": "{{ data.search }}", "limit": 30 },
  "to": "data.candidates" },
{ "id": "grade", "kind": "grade", "on": ["data.emails"], "retries": 1, "pass_score": 7.5,
  "rubric": "... Score quick_read, makes_sense, cta, ps from 0 to 10. Answer easy, would_reply, weird_word yes or no. Automatic fail: an em dash or en dash, the word demo, an email address or phone number, a price, a subject of 6 words or more ..." }
```

`"filters": "{{ data.search }}"` is exactly one output tag, so the filter object the `plan` prompt wrote passes through with its type. That is how a prompt steers the search. Search results carry `{name, title, company, linkedin_url}` and never an email or phone number.

`rd-ken-native` replaces the `copy` prompt with a `ken.copy` tool step that writes the email core once (`"kind": "email"`, `"maxWords": 90`) and a `pick` prompt that adds a first line per person. `rd-your-product` starts with your endpoint:

```json
{ "id": "run", "kind": "webhook", "url": "https://api.your-product.example/ken/studio",
  "to": ["data.metric", "data.findings", "data.chart", "data.chart_title", "data.scope", "data.report_url"],
  "timeout_s": 20 }
```

The webhook gets a POST of `{account, person, data, template: {id, versionId}, assetId}` and answers 200 with a JSON object (max 256 KB) whose top-level keys are the `to` slot names; other keys are ignored. A timeout, a 5xx or a dropped connection is retried twice (after 1 s, then 4 s); a 4xx is final. A good answer is cached 24 hours per template version, account and step, so publish a new version to force fresh calls. Pages fill once per account, so the answer must not depend on `person`. Every call carries Standard Webhooks signature headers; checking them is optional, and the starter's `README.md` has the verification code. Then an `explain` prompt writes `headline` and `meaning` from your result, and a `check` grade fails any number that is not in it.

Credits, in plain words:

- 1 credit per page, charged when its first link is published. More person links on that page are free.
- `bind`, `scrape.page`, `ken_search.people`, `webhook` and `dataset` cost nothing today.
- `prompt`, `grade` and the `ken.copy` tool are model calls. When Studio runs them (`executor="ken"`), they cost their tokens at 2x model cost, and a prompt answer that breaks a slot schema is retried with the reason, so each retry costs tokens too. When your own agent fills the page (`executor="agent"`, then prepare and submit), its prompt and grade steps cost nothing. `ken.copy` is a tool step, so Studio runs and charges it on both paths.

Estimate before a run and show the user the number: `studio_pages(operation="run-estimate", template_id=41, account_count=25, executor="ken")`, then `studio_pages(operation="run-create", template_id=41, account_ids=[...], executor="ken")`.

## The CTA

All three ask for a short call: `{% render 'ken/cta', label: 'Book 30 minutes', kind: 'booking' %}` in `rd-doc`, `Book 20 minutes` on the two pages. `kind: 'booking'` links to the sender's booking page (`link.booking_url`) and records a CTA click. When the sender has no booking URL the snippet renders nothing, so keep a plain ask in the text beside it ("Worth half an hour this week?").

`rd-doc` asks in `next_steps` and again in `fallback.liquid`, so an unfinished page still offers the call. A booking through the CTA, or within 14 days of a human view at that account, counts as a meeting for the template.

## Common failure modes

- **The page shows the "still finishing" version for days.** A required slot with no fallback failed. With `fallback.liquid` shipped the page still counts as `ready`, so nothing looks wrong until you open the link. Before `create-link`, read `studio_pages(operation="get", asset_id=...)`: `slotStatus` marks the failed slot, and `studio_pages(operation="run-get", run_id=...)` shows the step error. Fix the cause below, then `studio_pages(operation="refill", asset_id=...)`.
- **Invented people when the search fails.** With `data.candidates` empty, a `copy` prompt without `requires` still runs, its empty answer fails `minItems`, and the retry names real-sounding people at the account with guessed LinkedIn URLs. Give `copy` `"requires": ["data.candidates"]`: when the search fails or finds nobody, `copy` does not run or charge, `leads` and `emails` fall back, and the page shows `fallback.liquid`.
- **Fewer leads than `minItems`.** Narrow filters return 2 candidates, `copy` writes 2 leads, and `data-items` fails `leads` (minimum 3). `company: "any"` also needs at least one filter. Ask the `plan` prompt for filters that match a few thousand people, keep `limit` at 30, and pick the best 8 to 10.
- **A label over its limit.** `data-length` on `segments[].label` (24) or `funnel[].label` (28). Put the limit in the prompt in words ("write them short instead of cutting them") as well as in the schema. A chart label over 28 characters that the schema lets through is cut mid-word by `ken/chart`.
- **One `http://` LinkedIn URL fails the whole list.** `link-scheme` runs on every URL in filled data, and one bad item fails the top-level slot. The starter template also links `linkedin_url` only when it starts with `https://` and contains `linkedin.com/`.
- **A contact detail in the copy.** `data-third-party-contact` drops the slot when a PS or email body holds an email address or phone number. Only the sender's own pass. Keep the starter's "No email addresses, phone numbers or prices" line in every prompt.
- **"Demo" on the page.** Prospects should never read "reverse demo". The starter prompts and the grader ban it; also add "reverse demo" and "demo" to the workspace's banned phrases in Knowledge, so `data-banned-phrase` rejects any slot that slips.
- **The grade keeps failing.** After `retries` rewrites the page goes `needs_review` and `create-link` answers 409 `studio_page_not_ready`. Read the grade's verdict in `run-get` (it names the check and quotes the phrase), tighten the `copy` prompt, push, publish, then refill. Or fill the page yourself with `prepare` and `submit`.
- **The webhook breaks.** `timeout_s` above 30 fails `recipe-webhook-timeout`; an `http://` URL fails `recipe-webhook-url`. A number sent as a string where the slot says `number` fails `data-type`. When every attempt fails, `metric` and `findings` have no fallback, so the link shows `fallback.liquid`.
- **"Hi ," on the shared link.** `person` is null on the shared copy. Assign once at the top, `{%- assign first = person.first_name | default: 'there' -%}`, and print `first`.

## Starter

Copy one into the workspace as draft version 1:

- `studio_templates(operation="create", starter_slug="rd-doc")`
- `studio_templates(operation="create", starter_slug="rd-ken-native")`
- `studio_templates(operation="create", starter_slug="rd-your-product")`

For `rd-doc`, the `offer` bind reads `knowledge.offer`, which the Knowledge pack does not have, so it falls back and `next_steps` skips the offer line. Bind `knowledge.stable` instead if the offer should come from Knowledge. For `rd-your-product`, replace the endpoint URL in the `run` step and the copy that describes the check before you publish.
