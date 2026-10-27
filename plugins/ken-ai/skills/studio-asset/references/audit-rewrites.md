# Fill guide: `audit-rewrites`, Website audit with rewrites

Starter `audit-rewrites` 1.0.2. Type `audit`, format `page`. Page slug `site-notes`: `https://{host}/pennant/site-notes-for-jo`. Sections: `hero`, `findings`, `rewrites`, `next_steps`. The ask is a booking button, "Book 20 minutes".

Notes on the account's website, read as a buyer who has never heard of them: 4 to 6 lines that get in a buyer's way, quoted word for word, what each costs them, then three rewrites they could paste in today. It judges words only, never design, images or speed.

Read the template's own `studio.json` first (`studio_templates(operation="pull", template_id=41)`): a workspace copy may differ, and its file wins. You recognize this starter by the slug `site-notes` and the steps `site`, `pricing`, `findings`, `rewrites`, `grade`.

## Before you run it

- **A homepage the scraper can read**, at the account's primary domain. A pricing page at `/pricing` helps but is optional. When the homepage cannot be read, the prompts are told to say nothing about it: the findings get thin and the page often lands in review. Sites behind a login or a bot wall cannot be audited.
- **Research is optional.** `findings` reads `account.dossier.summary` for context, nothing else from research.
- **The sender's booking link** for the button.

## What each field needs

| Slot | Required | Limits | Filled by | From |
|---|---|---|---|---|
| `site`, `pricing` | no | objects | scrape steps | the homepage and `https://<domain>/pricing`. Never shown |
| `headline` | yes | 10 to 90 | `findings` | the one thing on their site that most gets in a buyer's way, as a statement. Fallback: "Notes on the {account} website" |
| `summary` | no | 600 | `findings` | 2 or 3 sentences: one thing the site does well, then the biggest problem |
| `findings` | yes | 4 to 6: `where` 3 to 40, `quote` 3 to 280, `cost` 20 to 240, `severity` `high`, `medium` or `low` | `findings` | worst first. `quote` is a line copied character for character from the homepage or pricing page, without Markdown; `cost` is what the buyer thinks or does next, not a style opinion. A finding whose line cannot be quoted exactly is dropped |
| `rewrites` | yes | exactly 3: `where` 3 to 40, `before` 2 to 400, `after` 2 to 300, `why` 10 to 140 | `rewrites` | the three findings where a rewrite helps most, usually the headline, the line under it, and a button or pricing line. `before` is verbatim; `after` is shorter or clearly easier, a button stays 2 to 5 words |
| `next_steps` | no | up to 3 | `rewrites` | small changes their team could make this week, one sentence each (160), each tied to a finding |

## How it fills

1. `site` and `pricing` scrape the two pages.
2. `findings` (prompt) writes `headline`, `summary` and `findings`.
3. `rewrites` (prompt) writes `rewrites` and `next_steps`.
4. `grade` judges `rewrites` (pass at 7, 2 retries). Each rewrite scores on verbatim (a paraphrased `before` scores 0), specific, clearer, plain and why. Automatic fails: a dash, an email address or phone number, or a customer, number or result that is not on their site.

## Your own model (executor `"agent"`)

The first `prepare` runs both scrapes and gives you `findings`, `rewrites` and `grade` in order. Copy every `quote` and `before` exactly from the scraped markdown, write the rest, grade the rewrites in a separate call, and submit. `references/studio-fill.md` has the loop.

## Check before the first link

- `state` is `ready`; `headline`, `findings` and `rewrites` are `filled`. A `headline` on its fallback means the fill had nothing to say: do not send it.
- Spot-check two quotes against the live site. A misquote is the fastest way to lose the reader.
- No hype words, no exclamation marks, no claims about design or speed.
- The grade passed.

## When it goes wrong

| You see | Why | Do |
|---|---|---|
| `needs_review` with thin findings | the homepage could not be read | check the domain loads without a login; audit another account |
| Findings about the pricing page on a site without one | none should appear: the prompt forbids it | refill; if it repeats, a person edits it on Customize |
| `rewrites` failed the grade on verbatim | `before` was paraphrased | refill; on the agent path, copy the line exactly |
