# Audit playbook

An audit reads something the account already has, usually their website, quotes what gets in a buyer's way, and fixes part of it for free. `studio-template-builder.md` (in this folder) holds the bundle format, the kit and every validation rule; this file covers what to build.

## What it is for

The buyer moment: the account has copy you can read from the outside, and they do not know what it costs them. The page lists the problems, worst first, each quoted word for word from their own site, then rewrites three lines they can paste in today. It reveals a problem they did not fully see and hands them a free fix, which makes the paid fix the obvious next step.

Pick it over a reverse demo when your value is fixing what they have, not building something new. Pick a report when you have numbers to set them against instead of their own words.

`audit-rewrites` judges words only. The scraped markdown shows no design, images or load speed, so its prompt says nothing about them. If your audit needs those, the numbers must come from your own checker through a `webhook` step (see `rd-your-product` in `reverse-demo.md`).

## Sections that work

| `data-section` | What it holds | Reads |
|---|---|---|
| `hero` | Logo or sender, "Notes on {domain}", the headline (the biggest problem), greeting, summary, a tally such as "2 fix first, 1 fix soon" | `data.headline`, `data.summary`, `data.findings` (counted) |
| `findings` | Numbered notes: where, the exact line highlighted, what it costs with a buyer, a severity label (Fix first, Fix soon, Small) | `data.findings` |
| `rewrites` | Three before and after cards, why the new line works, "34 words down to 12" | `data.rewrites` |
| `next_steps` | Two or three small changes, the booking button, the sign-off | `data.next_steps` |

Quote first, then the cost. The reader recognizes their own line and trusts the note that follows. A finding without a verbatim quote reads like an opinion.

What a good finding and its rewrite look like, from the starter's `pennant-partial.json` sample (an HR and tip payout tool for restaurants):

```json
{ "where": "Homepage headline",
  "quote": "People-first HR for the modern workforce.",
  "cost": "A restaurant owner with 40 hourly staff can't tell this handles shifts and tip payouts. It sounds like software for an office.",
  "severity": "high" }
{ "where": "Homepage headline",
  "before": "People-first HR for the modern workforce.",
  "after": "HR, scheduling and tip payouts for restaurants with hourly teams.",
  "why": "A restaurant owner sees their own week in the first line." }
```

The cost names a buyer and what they do next, not a style opinion. The rewrite uses only facts from their own site and could not sit on a competitor's site unchanged.

## Required slots

| Slot | Type and limits | Filled by | Fallback |
|---|---|---|---|
| `headline` | string, 10 to 90 | `findings` (prompt) | Liquid: `"Notes on the {{ account.name }} website"` |
| `findings` | array, 4 to 6 items: `where` (3 to 40), `quote` (3 to 280), `cost` (20 to 240), `severity` (enum `high`, `medium`, `low`) | `findings` | none, `fallback.liquid` |
| `rewrites` | array, exactly 3 items (`minItems` and `maxItems` 3): `where` (3 to 40), `before` (max 400), `after` (max 300), `why` (10 to 140) | `rewrites` (prompt), checked by `grade` | none, `fallback.liquid` |

Optional: `summary` (max 600), `next_steps` (up to 3 strings of 10 to 160). Working slots: `site` and `pricing` (objects from `scrape.page`).

Findings and rewrites have no honest generic value: a quote has to come from their site. So the bundle ships `fallback.liquid`, the same hero with "Still marking it up", "This link stays the same, so check back later today", and the booking button.

## The recipe that fills them

| id | kind | What it does | Writes |
|---|---|---|---|
| `site` | tool `scrape.page` | `https://{{ account.domain }}` | `site` |
| `pricing` | tool `scrape.page` | `https://{{ account.domain }}/pricing`, may be missing | `pricing` |
| `findings` | prompt | Reads both pages as a buyer, quotes 4 to 6 lines, says what each costs | `headline`, `summary`, `findings` |
| `rewrites` | prompt | Rewrites the three lines where a rewrite helps most, plus 2 or 3 next steps | `rewrites`, `next_steps` |
| `grade` | grade | Checks the rewrites: verbatim `before`, specific, clearer, plain; pass at 7, two retries | checks `rewrites` |

The key steps from the starter, prompts shortened:

```json
{ "id": "site", "kind": "tool", "tool": "scrape.page",
  "args": { "url": "https://{{ account.domain }}" }, "to": "data.site" },
{ "id": "findings", "kind": "prompt", "model": "cheap",
  "inputs": ["account.name", "account.domain", "account.industry", "account.dossier.summary", "data.site", "data.pricing"],
  "to": ["data.headline", "data.summary", "data.findings"],
  "prompt": "... quote: the exact line from data.site or data.pricing, copied character for character, at most 280 characters. Pick lines a buyer actually reads: the headline, the line under it, buttons, proof, pricing. If you cannot quote a line exactly, drop that finding. ... Only judge the words. The inputs do not show design, images or speed, so say nothing about them. ..." },
{ "id": "grade", "kind": "grade", "on": ["data.rewrites"], "retries": 2, "pass_score": 7,
  "rubric": "... verbatim: before is copied word for word from data.site or data.pricing. A paraphrase, a summary or a changed word scores 0. ... The overall score is the lowest rewrite's average. ..." }
```

The grader scores the weakest rewrite, not the average of all three, so one weak card cannot hide behind two good ones.

Credits, in plain words: `scrape.page` is free until the rate card prices it. The two prompts and the grade are model calls: when Studio runs them (`executor="ken"`) they cost their tokens at 2x model cost, and a failed grade reruns the `rewrites` prompt up to twice, which costs tokens again. Your own agent filling over prepare and submit pays nothing for them. The page costs 1 credit when its first link is published.

## The CTA

`{% render 'ken/cta', label: 'Book 20 minutes', kind: 'booking' %}` in `next_steps`, after "I have more notes than fit on one page. If you want them, grab 20 minutes and I'll go through the rest of the site with you, page by page." The ask offers more of the same work. After a free sample, that is the natural next step, and it is easy to say yes to. When the sender has no booking URL the snippet renders nothing, so the sentence before it has to work alone.

## Common failure modes

- **No domain on the account.** `scrape.page` falls back when `account.domain` is empty, the prompts have nothing to quote, `findings` fails, and the link shows `fallback.liquid` for good. Run audits only on accounts with a domain; after one is added, `studio_pages(operation="refill", asset_id=...)`.
- **`/pricing` does not exist.** A 4xx fails that scrape at once, without a retry. That is fine because `pricing` is optional, as long as the prompt says the pricing page "may be empty or missing". Every extra page you scrape needs the same treatment.
- **A paraphrased quote.** The model tidies a line while quoting it. The grade's `verbatim` check scores that rewrite 0 and retries. Keep the "If you cannot quote a line exactly, drop that finding" instruction: four true findings beat six with an invented one.
- **Too few findings on a thin site.** A one-page site may not give 4 quotable problems; 3 findings fail `data-items` and the page shows `fallback.liquid`. Lower `minItems` if you target small sites.
- **Two or four rewrites.** `rewrites` is exactly 3 (`data-items`). Say "exactly 3" in the prompt.
- **A severity outside the enum.** "critical" or "High" fails `data-enum`. The prompt names the three lowercase values and when to use each.
- **Their phone number in a quote.** A footer or contact line quoted from their site fails `data-third-party-contact`, because only the sender's own contact details may appear. Point the prompt at the headline, buttons, proof and pricing.
- **Their own dashes.** The rubric fails any rewrite holding an em dash or en dash, and a verbatim `before` copied from a site that uses them keeps them. If your accounts write that way, limit the dash rule to `after` in the rubric.
- **The grade keeps failing.** After two retries the page goes `needs_review` and gets no link. `studio_pages(operation="run-get", run_id=...)` shows the verdict: it names the rewrite by its `where`, the check, and the words to change. Fix the `rewrites` prompt, push, publish, refill.

## Starter

`studio_templates(operation="create", starter_slug="audit-rewrites")`

To audit more pages, add a `scrape.page` step per path with its own optional slot (`data.features`), list it in the prompt's `inputs`, and tell the prompt it may be missing. Keep the slot names, the severity labels in the template and the prompt in step.
