# Landing page playbook

A Studio landing page is one page per account on your own link host, so it can do what a generic download page cannot: name their company, pick the proof closest to them, and say what carries over. The `case-study` starter is the worked example. `studio-template-builder.md` (in this folder) holds the bundle format, the kit and every validation rule; this file covers what to build.

## What it is for

The buyer moment: the account fits, but they are cold and have no reason to trust you yet. They need to see that someone like them got a result, or get something useful before any call. The page gives them that, made for them, and asks for a short call.

Pick it when your proof is customer stories, a method or a guide, and you cannot produce a sample of the work per account (if you can, build a reverse demo). For an interactive tool, read `calculator.md`.

### Give away the secrets, sell the implementation

The page should give enough that the reader would pay for it if they did not know you. On a per-account page that means showing the whole method on their situation: what the customer changed, step by step, and what happened. Sell doing it for them. A page that hides the useful part reads as a brochure, and brochures do not get booked.

### Score the idea before you build it

Score every concept 1 to 5 on each quality and build only at an average of 3 or more.

| Quality | A 5 looks like | Where it lives on a Studio page |
|---|---|---|
| Solves a narrow problem | A daily pain with a cost they can name | One problem per template; the prompt picks the story by problem, not by logo |
| Scalable | Fills with no manual work per account | Every slot comes from a recipe step or a fallback |
| Quick to consume | Useful in under 5 minutes, on a phone | One screen to the result, mobile-first CSS |
| Reveals a bigger problem | The fix points at your core offer | The "why it applies" section and the CTA name the next step |
| Data-driven | Their own facts and your real numbers | `dataset` rows and `account.dossier`, never invented numbers |

Studio gives you "scalable" and much of "data-driven" for free, because each page is filled from your data and the account's. The other three depend on the idea. Case studies rate 3 stars of 5 in the rankings of create-campaign's `lead-magnet` stage; matching one to the account's industry and size and saying what is different for them is what lifts it.

### Pick the tier

| Tier | What it does | Build it as |
|---|---|---|
| Problem revealers | Show a problem they do not fully see | `audit.md`, `report.md` |
| One-step solutions | Solve one step of a bigger job | `calculator.md`, or a landing page that hands over a filled template or plan |
| Samples and trials | Do a small piece of the core offer for them | `reverse-demo.md` |

Proof pages like `case-study` sit beside these: they borrow trust from a customer instead of giving the work away.

### The hook

The hook sits in the email that carries the link and in the page headline. Five formulas work: the shocking stat, the comparison, the hidden cost, the competitive intelligence, the compliance urgency. On a per-account page, fill the brackets from the account and your dataset row, never from invention: "How a builder your size cut invoice approvals from 19 days to 4" copies `19 to 4` from the row's `result_value`. A stat you cannot point to in your data does not go on the page.

## Sections that work

`case-study`, top to bottom:

| `data-section` | What it holds | Reads |
|---|---|---|
| `hero` | The headline, the dek, who the customer is | `data.headline`, `data.dek`, `data.customer`, `data.customer_about` |
| `story` | "Why this story": 2 or 3 rows of them vs you, then where they started and what changed | `data.parallel`, `data.before`, `data.after` |
| `result` | The result value printed large, the metric, the timeframe, the quote with the speaker's title only | `data.result`, `data.quote` |
| `fit` | Why it applies to them, and one honest line on what is different | `data.fit` |
| `cta` | The booking button | `ken/cta` |

## Required slots

| Slot | Type and limits | Filled by | Fallback |
|---|---|---|---|
| `headline` | string, 20 to 90 | `story` (prompt) | Liquid: `"A customer story picked for {{ account.name }}"` |
| `dek` | string, 40 to 240 | `story` | Liquid: a general line on why the story is worth two minutes |
| `fit` | string, 60 to 700 | `story` | Liquid: a general line offering to say what carries over |

Optional: `customer` (max 80), `customer_about` (max 140), `parallel` (2 or 3 `{label (max 28), them (max 200), you (max 200)}`), `before` and `after` (40 to 600), `result` (`{metric, value, timeframe}`), `quote` (`{text (max 320), author_title}`). Working slots: `stories` and `size_matches`, the dataset rows.

Only three slots are required and all have Liquid fallbacks, so every page renders. The story slots stay optional: a missing quote hides the quote block, and a thin dossier shrinks the "Why this story" table rather than guessing. `fallback.liquid` shows before the first fill ("still matching a story", then the booking button).

## The recipe that fills them

| id | kind | What it does | Writes |
|---|---|---|---|
| `same_industry` | dataset | Rows of `case-studies` where `industry` equals the account's, up to 5 | `stories` |
| `same_size` | dataset | Rows where `size_band` equals the account's, up to 8, the backup | `size_matches` |
| `story` | prompt | Picks one row, same industry first, then closest size and problem, and retells it | 10 slots |

The key steps from the starter, prompt shortened:

```json
{ "id": "same_industry", "kind": "dataset", "dataset": "case-studies",
  "where": [{ "column": "industry", "op": "eq", "value": "account.industry" }],
  "limit": 5, "to": "data.stories" },
{ "id": "story", "kind": "prompt", "model": "cheap",
  "inputs": ["account.name", "account.domain", "account.industry", "account.size_band", "account.dossier.summary", "account.dossier.why_now", "brand.name", "data.stories", "data.size_matches"],
  "to": ["data.headline", "data.dek", "data.customer", "data.customer_about", "data.parallel", "data.before", "data.after", "data.result", "data.quote", "data.fit"],
  "prompt": "... Step 1, pick one story. ... If both lists are empty, return {} and nothing else. ... result: {metric, value, timeframe}, copied exactly ... quote: copied word for word ... Leave out any line where we know nothing about {{ account.name }}; never guess. ... Never invent customers, people, names, numbers, tools or results ..." }
```

The CSV, uploaded as the dataset `case-studies` (`create-upload-url`, PUT the bytes to `url` with exactly the returned `headers`, then `studio_templates(operation="datasets-create", template_id=41, name="case-studies", upload_id="...")`): one row per story with `customer`, `industry`, `size_band`, `problem`, `approach`, `result_metric`, `result_value`, `timeframe`, `quote`, `quote_author_title`. Only customers who agreed to be named. Quotes word for word, or empty. `result_value` under 20 characters, because it prints large. No email addresses, phone numbers, em dashes or en dashes in any cell.

Credits, in plain words: both `dataset` steps are free. The prompt costs its tokens at 2x model cost when Studio runs it (`executor="ken"`) and nothing when your agent fills the page. The page costs 1 credit when its first link is published.

## The CTA

`{% render 'ken/cta', label: 'Book 20 minutes', kind: 'booking' %}` after the fit section, whose fallback already sets it up: "On a short call I can tell you which parts would carry over to you, and which would not." When the sender has no booking URL the snippet renders nothing, so the sentence before it should work alone.

If the lead magnet is a file (a guide, a checklist, a template), put it in `assets/` and give it a second button. Render args take a quoted string or a variable, not a filter, so assign the URL first:

```liquid
{%- assign guide_url = asset_url | append: '/checklist.pdf' -%}
{% render 'ken/cta', label: 'Download the checklist', href: guide_url, id: 'checklist' %}
```

`id` names the button in click tracking. Keep the booking button as the primary ask.

## Common failure modes

- **No story matches.** No row in the account's industry and none in its size band: both lists come back empty, the prompt returns `{}`, and the page shows the generic headline, dek and fit with the story sections hidden. Cover the industries you sell into, and check the CSV with `studio_templates(operation="datasets-list", template_id=41)`.
- **A number the row does not hold.** The retelling rounds "19 to 4" into "about 80 percent faster". The prompt forbids new numbers; if they still appear, add a `grade` step on `data.headline` and `data.after` that fails any number not in `data.stories` or `data.size_matches` (copy the `check` step from `rd-your-product`).
- **An invented hook stat.** "78% of companies lose $50K a year" is a formula example, not a fact. Only numbers from your dataset go on the page.
- **A person's name or contact in the quote.** The template shows the title and company only, and the prompt drops the speaker's name. An email address or phone number in a quote fails `data-third-party-contact` and the optional quote slot hides.
- **A comparison label over 28 characters.** `data-length` fails `parallel`, which is optional, so the whole "Why this story" table disappears. Keep "label is at most 28 characters" in the prompt.
- **A link that hides where it goes.** A download behind bit.ly fails `link-shortener`; button text that names a domain other than the link's fails `link-text-mismatch`; a non-https link fails `link-scheme`. Host files in `assets/` or link the real https URL.
- **A teaser instead of the method.** Nothing fails validation, but the page reads like marketing. Check the "before" and "after" text: a reader should be able to copy what the customer did.

## Starter

`studio_templates(operation="create", starter_slug="case-study")`

Then upload your `case-studies` CSV and replace the samples' made-up stories before the first run.
