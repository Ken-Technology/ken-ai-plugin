# Fill guide: `case-study`, Built for you case study

Starter `case-study` 1.0.2. Type `landing_page`, format `page`. Page slug `customer-story`: `https://{host}/harborview/customer-story-for-sam`. Sections: `hero`, `story`, `result`, `fit`, `cta`. The ask is a booking button, "Book 20 minutes".

One customer story per account: The platform picks the story from the workspace's own case studies that sits closest to the account and retells it so the reader sees their own situation in it: what the customer and the account have in common, where the customer started, what changed, the result, the quote, and why it applies.

Read the template's own `studio.json` first (`studio_templates(operation="pull", template_id=41)`): a workspace copy may filter on other columns, and its file wins. You recognize this starter by the slug `customer-story` and the steps `same_industry`, `same_size`, `story`.

## Before you run it

- **The `case-studies` dataset.** Check it with `studio_templates(operation="datasets-list", template_id=41)`. One row per story. Columns: `customer`, `industry`, `problem`, `approach`, `result_metric`, `result_value` (required), `size_band`, `timeframe`, `quote`, `quote_author_title`. Only customers who agreed to be named, only approved quotes, no email addresses or phone numbers, no dashes. Uploading it is template work (the `studio-template` skill). Never fill it with made-up stories.
- **The account's `industry` and `size_band`**, written the way the platform writes them (lowercase LinkedIn industries, bands such as `51-200`). Check with `accounts(operation="get", account_id=3101)`.
- **Research on the account.** The account side of the comparison comes only from `industry`, `size_band` and the dossier (`summary`, `why_now`). A thin dossier shrinks the "Why this story" table rather than guessing. Read it with `accounts(operation="get", account_id=3101, expand="research")`.

## What each field needs

| Slot | Required | Limits | Filled by | From |
|---|---|---|---|---|
| `stories` | no | up to 10 rows | `same_industry` (dataset) | rows whose `industry` equals the account's, up to 5 |
| `size_matches` | no | up to 10 rows | `same_size` (dataset) | rows whose `size_band` equals the account's, up to 8: the backup when no story shares the industry |
| `headline` | yes | 20 to 90 | `story` | what the customer got, said so it speaks to the account, with `result_value` exactly as written. Has a fallback |
| `dek` | yes | 40 to 240 | `story` | why the story is worth two minutes of their time. Has a fallback |
| `customer`, `customer_about` | no | 80, 140 | `story` | the customer name copied exactly; who they are from industry and size only |
| `parallel` | no | 2 to 3 `{label (28), them (200), you (200)}` | `story` | what the customer and the account share: `them` from the row, `you` from what is known about the account. A line with nothing known about the account is left out |
| `before`, `after` | no | 40 to 600 each | `story` | the problem, then what they changed with you, retold from the row |
| `result` | no | `metric` (80), `value` (40), `timeframe` (40) | `story` | copied exactly from the row |
| `quote` | no | `text` (320), `author_title` (80) | `story` | copied word for word; the title only, never the person's name. Absent when the row has none |
| `fit` | yes | 60 to 700 | `story` | why the story applies, plus one honest line on what is different for them. Has a fallback |

## How it fills

1. `same_industry` and `same_size` pick rows from `case-studies`.
2. `story` (prompt) picks one row (same industry first, then closest size and problem) and writes the page. With both lists empty it returns nothing, and the page shows its fallbacks: a generic headline and intro, a short "the story isn't on this page yet" note, and the booking button.

There is no grade step: check the copied fields yourself.

## Your own model (executor `"agent"`)

`prepare` runs both dataset steps (free) and gives you `story`. Pick one row, copy `customer`, `result` and `quote` exactly, write the rest from that row and the account's fields only, and submit with no grade results. `references/studio-fill.md` has the loop.

## Check before the first link

- `headline`, `dek` and `fit` are `filled`, not on their fallbacks. A page on its fallbacks has no story: do not send it.
- `result` and `quote` match the CSV row word for word. No number appears that is not in the row.
- When the story came from `size_matches` (another industry), `fit` says plainly what is different.

## When it goes wrong

| You see | Why | Do |
|---|---|---|
| Fallback copy everywhere | no row matches the industry or the size band | add stories for the industries you sell into, or skip the account |
| A guessed parallel | the dossier is thin | refresh the account's research (ask first, it is charged), then refill |
| A person's name under the quote | the row carried it in `quote_author_title` | fix the CSV: the title only |
