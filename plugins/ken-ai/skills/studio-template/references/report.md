# Report playbook

A report sets one account next to data you own: peer benchmarks, survey results, an index you maintain. `studio-template-builder.md` (in this folder) holds the bundle format, the kit and every validation rule; this file covers what to build.

## What it is for

The buyer moment: a sales, finance or operations lead who measures their team and wants to know whether their number is normal. The page puts the spread across companies like theirs (same industry, same size band) next to them and lets them drop their own figure in. It reveals a gap with numbers, which is more persuasive than any claim you make about it.

Pick it when you have the data. Without a dataset, build an audit instead: a report with invented numbers is worse than none, and the starter's prompt forbids them.

`benchmark-report` is `format: "doc"`. It reads top to bottom on the web and is meant to download as a PDF, with a blank "Yours" line next to each metric in print. A doc template is a full HTML document written only as HTML blocks, with print CSS (`break-before: page` per section); `studio-template-builder.md` has the doc rules. The PDF is rendered from the page's own print CSS once the download route is live, so write the print rules now.

The design rule that keeps it right: no model does arithmetic. The `dataset` step picks the rows, the template draws the ranges from those rows with Liquid math, and the prompt only copies numbers it finds in them.

## Sections that work

| `data-section` | What it holds | Reads |
|---|---|---|
| `cover` | "{account} next to its peers", prepared for, peer group, prepared by, greeting, "What's inside" | Ken variables, the industry and size band |
| `summary` | The headline, the short version, what the site shows, the one metric to look at first with a bar chart (25th percentile, median, 75th) | `data.headline`, `data.summary`, `data.observations`, `data.focus`, `data.chart` |
| `benchmarks` | One row per metric: name, unit, which direction is better, a band from p25 to p75 with a median mark, the three numbers, a "Yours" line in print | `data.benchmarks`, straight from the CSV |
| `takeaways` | Three titled points, each built on one or two rows | `data.takeaways` |
| `next_steps` | Two to four actions, the booking button, the sign-off | `data.next_steps` |

The bands in `benchmarks` are inline `style` widths computed in Liquid with `times`, `divided_by`, `at_least` and `at_most`. No chart library and no model touch those numbers.

## Required slots

| Slot | Type and limits | Filled by | Fallback |
|---|---|---|---|
| `benchmarks` | array, max 12 items: `metric` (max 60), `unit`, `better`, `p25`, `median`, `p75` (numbers), `sample_size` (integer), `source`, `industry`, `size_band`; `metric`, `p25`, `median`, `p75` required | `peers` (dataset) | `[]`: the section says there is no peer data for that group yet |
| `headline` | string, 20 to 110 | `report` (prompt) | Liquid: `"How companies like {{ account.name }} compare on the numbers that matter"` |
| `summary` | string, 80 to 800 | `report` | Liquid, a general paragraph about the peer ranges |
| `takeaways` | array, exactly 3: `title` (max 70), `body` (40 to 420) | `report` | static: three general takeaways |
| `next_steps` | array, 2 to 4 strings, max 260 each | `report` | static: three general steps |

Optional: `focus` (`{metric, why}`), `chart` (exactly 3 `{label, value}`), `observations` (max 2 strings), and the working slot `site`.

Every required slot has a fallback, because the general text is still true for every account. A page whose peer group has no rows still renders: ranges replaced by "no peer data yet", general takeaways, and the call. `fallback.liquid` covers only the time before the first fill ("I'm still pulling the numbers").

## The recipe that fills them

| id | kind | What it does | Writes |
|---|---|---|---|
| `peers` | dataset | Rows of `peers` where `industry` and `size_band` equal the account's, up to 12 | `benchmarks` |
| `site` | tool `scrape.page` | Their homepage, for one or two observations | `site` |
| `report` | prompt | Headline, summary, the focus metric and its chart, observations, takeaways, next steps | 7 slots |

The key steps from the starter, prompt shortened:

```json
{ "id": "peers", "kind": "dataset", "dataset": "peers",
  "where": [
    { "column": "industry", "op": "eq", "value": "account.industry" },
    { "column": "size_band", "op": "eq", "value": "account.size_band" }
  ],
  "limit": 12, "to": "data.benchmarks" },
{ "id": "report", "kind": "prompt", "model": "cheap",
  "inputs": ["account.name", "account.domain", "account.industry", "account.size_band", "account.dossier.summary", "data.benchmarks", "data.site"],
  "to": ["data.headline", "data.summary", "data.focus", "data.chart", "data.observations", "data.takeaways", "data.next_steps"],
  "prompt": "... We do not know {{ account.name }}'s own numbers. Never say or imply where they rank. ... every number you write must be copied exactly from one row of data.benchmarks, with its unit. Do no arithmetic. ... If data.benchmarks is empty, return {} and nothing else. ..." }
```

`where` is a list of `{column, op, value}`. `eq` ignores case, `in` takes a list, `between` takes two numbers. `value` is a Ken variable (`account.industry`) or a literal. To compare against the whole industry, drop the `size_band` filter and raise `limit`.

Upload the CSV before the first fill:

1. `studio_templates(operation="create-upload-url", template_id=41, path="peers.csv", content_type="text/csv", size_bytes=6120)`
2. PUT the bytes to `url` with exactly the returned `headers`, within 15 minutes.
3. `studio_templates(operation="datasets-create", template_id=41, name="peers", upload_id="...")`
4. Check the header columns and row count with `studio_templates(operation="datasets-list", template_id=41)`.

CSV rules: a header row whose column names equal the slot's item properties (`industry`, `size_band`, `metric`, `unit`, `better`, `p25`, `median`, `p75`, `sample_size`, `source`). Plain numbers (`3.4`, not `3.4%` or `3,4`). `p25 <= median <= p75` on every row, even when lower is better. `industry` in the lowercase LinkedIn form accounts carry (`software development`), `size_band` the way accounts write it (`11-50`, `51-200`). Quote any value with a comma. At most 12 metrics per peer group (the step's `limit`); 6 to 8 read best. 5 MB and 50,000 rows at most.

Credits, in plain words: `dataset`, `scrape.page`, the PDF and hosting are free. The one prompt costs its tokens at 2x model cost when Studio runs it (`executor="ken"`) and nothing when your agent fills the page. The page costs 1 credit when its first link is published.

## The CTA

`{% render 'ken/cta', label: 'Book 20 minutes', kind: 'booking' %}` in `next_steps`, after "If it would help, grab 20 minutes and I'll go through the numbers with you, along with what I would check first at {account}." The ask is to read the numbers together, not to buy. The prompt keeps calls and meetings out of `next_steps`, so the page asks once.

## Common failure modes

- **An empty peer group.** "Software" in the CSV against `software development` on the account, or `11 to 50` against `11-50`: the dataset returns 0 rows, the prompt returns `{}`, and every slot falls back to the general page. Match the CSV values to how accounts carry them, check `datasets-list`, or loosen the filter.
- **Numbers written as text.** `3.4%` in a number column fails `data-type` on `benchmarks`, which then falls back to `[]` and the section says there is no data. Strip units into the `unit` column.
- **The model does math.** "Your reply rate is twice the median" invents both a comparison and their number. The prompt forbids arithmetic and ranking; keep those lines. If it slips through, add a `grade` step on `data.summary` and `data.takeaways` that fails any number not found in `data.benchmarks`.
- **The focus metric does not match a row.** The template highlights the row whose `metric` equals `data.focus.metric` exactly. A reworded name highlights nothing. The prompt says "copied exactly from the row".
- **Chart labels.** `chart` is exactly 3 items with fixed labels ("25th percentile", "Median", "75th percentile"), all under the 28-character limit of `ken/chart`. Two or four items fail `data-items` and the focus box hides.
- **Division by zero.** A row with `p75` of 0 breaks the band math. The starter guards it with `at_least: 0.001` before dividing; keep the guard.
- **An unknown filter.** The page server runs Liquid with strict filters: a filter it does not know makes the render fail and the reader gets the fallback. Use standard filters only, and run a local render against the samples before you push.
- **Publishing the sample data.** `samples/peers.csv` holds made-up numbers for previews. Upload your own CSV as the `peers` dataset before the first run.

## Starter

`studio_templates(operation="create", starter_slug="benchmark-report")`

Then upload your CSV as `peers` (or rename it and change `"dataset"` in the `peers` step), and rewrite the cover lines that describe the peer data.
