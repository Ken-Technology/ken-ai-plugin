# Fill guide: `benchmark-report`, Peer benchmark report

Starter `benchmark-report` 1.1.1. Type `report`, format `doc`: a web page that also downloads as a PDF, with a blank "Yours" line next to each metric in print. Page slug `peer-benchmark`: `https://{host}/larkspur/peer-benchmark-for-ana`. Sections: `cover`, `summary`, `benchmarks`, `takeaways`, `next_steps`. The ask is a booking button, "Book 20 minutes".

A short report that puts the account next to companies in its industry and size band, from a CSV the workspace uploads to the template. No model does arithmetic: the `dataset` step picks the rows, the template draws the ranges, and the prompt only copies numbers it finds in those rows. The report never says where the account ranks, because nobody knows their own numbers.

Read the template's own `studio.json` first (`studio_templates(operation="pull", template_id=41)`): a workspace copy may filter on other columns, and its file wins. You recognize this starter by the slug `peer-benchmark` and the steps `peers`, `site`, `report`.

## Before you run it

- **The `peers` dataset.** Check it exists: `studio_templates(operation="datasets-list", template_id=41)`. Without it, or without a row for the account's group, `report` does not run and the link shows `fallback.liquid` ("the peer numbers are not there yet"). Uploading it is template work (the `studio-template` skill). Columns: `industry`, `size_band`, `metric`, `unit`, `better` (`higher` or `lower`), `p25`, `median`, `p75`, `sample_size`, `source`. Plain numbers with a dot for decimals, `p25 <= median <= p75` on every row, at most 12 metrics per group. The numbers must be real and their source true: never fill a CSV with invented benchmarks.
- **The account's `industry` and `size_band`** must match the CSV's values exactly (lowercase LinkedIn industries such as `software development`; bands such as `11-50`). Check them with `accounts(operation="get", account_id=3101)`. An account with no industry or band matches no row.
- **The homepage** is optional: it feeds one or two observations.

## What each field needs

| Slot | Required | Limits | Filled by | From |
|---|---|---|---|---|
| `benchmarks` | yes | up to 12 rows: `metric` (60), `p25`, `median`, `p75` required; `industry`, `size_band`, `unit`, `better`, `sample_size`, `source` | `peers` (dataset) | rows where `industry` and `size_band` equal the account's. Section 2 is drawn straight from them |
| `site` | no | object | `site` (scrape) | the homepage. Never shown |
| `headline` | yes | 20 to 110 | `report` | the single most useful thing in the data for this account. Has a fallback |
| `summary` | yes | 80 to 800 | `report` | what stands out and which metric to check first. Has a fallback |
| `focus` | no | `metric` (60, copied exactly from a row), `why` 40 to 400 | `report` | the row that matters most, judged from the site and dossier, quoting its numbers |
| `chart` | no | exactly 3 `{label, value}` | `report` | the focus row's 25th percentile, median and 75th percentile, in that order, as numbers |
| `observations` | no | up to 2, 200 each | `report` | something a visitor can see on the site that bears on one metric; empty when the site shows nothing |
| `takeaways` | yes | exactly 3 `{title (70), body (40 to 420)}` | `report` | each built on one or two rows, quoting their numbers. Has a fallback |
| `next_steps` | yes | 2 to 4 | `report` | actions they could take this month, never a call with the sender. Has a fallback |

## How it fills

1. `peers` (dataset, up to 12 rows) fills `benchmarks`. No match, no row, and the slot falls back.
2. `site` scrapes the homepage.
3. `report` (prompt, requires `benchmarks`) writes everything else. Every number it writes is copied from one row with its unit: no differences, ratios, averages or rounding. When `better` is `lower`, the 25th percentile is the strong end.

There is no grade step: check the numbers yourself before the first link.

## Your own model (executor `"agent"`)

`prepare` runs the dataset and the scrape (both free) and gives you `report`. Write its seven slots from the rows only, copying every number exactly, and submit with no grade results. `references/studio-fill.md` has the loop.

## Check before the first link

- `benchmarks` is `filled`. If it fell back, the page is the "numbers not there yet" fallback: do not send it.
- Every number on the page appears in one `benchmarks` row, with its unit. Nothing says or implies where the account ranks.
- `focus.metric` matches a row name exactly, and `chart` holds that row's three values.
- The CSV's `source` is printed under the list: it must be true.

## When it goes wrong

| You see | Why | Do |
|---|---|---|
| The fallback page | no dataset, or no row for this industry and size band | upload or extend the dataset (the `studio-template` skill), or skip this account |
| A number not in the rows | the prompt did arithmetic | refill; a person can fix it on Customize |
| A wrong range drawn | a row breaks `p25 <= median <= p75` | fix the CSV and upload it again |
