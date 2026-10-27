# Fill guide: `rd-your-product`, Your product, run on their data

Starter `rd-your-product` 1.1.1. Type `reverse_demo`, format `page`. Page slug `what-we-found`: `https://{host}/harborline/what-we-found-for-dana`. Sections: `hero`, `findings`, `meaning`, `cta`. The ask is a booking button, "Book 20 minutes".

Your own product runs on the account's data and the page shows the result: one headline metric, up to six findings, a chart, the scope of the check and a link to a full report, then what it means for them. Your endpoint does the work through a `webhook` step; the platform only explains the result.

Read the template's own `studio.json` first (`studio_templates(operation="pull", template_id=41)`): a workspace copy has its own endpoint and may have renamed slots. You recognize this starter by the slug `what-we-found` and the steps `run`, `explain`, `check`.

## Before you run it

- **A live endpoint.** The `run` step's `url` must be your product's https endpoint, not the starter's `https://api.your-product.example/ken/studio`. A template still pointing at the example URL fills nothing: every page shows `fallback.liquid`. Building that endpoint is template work: the `studio-template` skill's `references/reverse-demo.md` and the starter's `README.md` (pull the template) have the request, the answer and the signature.
- **The account's domain**, since most products check a domain. The endpoint gets `account` with `name`, `domain`, `industry`, `size_band` and `dossier`; any field but `name` can be null.
- **The signing secret** stays with the endpoint: `studio_templates(operation="get-webhook-secret", template_id=41)`. Never paste it into the chat or the bundle.

## What each field needs

| Slot | Required | Limits | Filled by | From |
|---|---|---|---|---|
| `metric` | yes | `label` 2 to 48, `value` 1 to 12 (text), `unit` 12, `status` `good`, `fair` or `poor`, `context` 160 | `run` (your endpoint) | the main result |
| `findings` | yes | 1 to 6: `title` 3 to 80, `severity` `high`, `medium` or `low` required; `detail` 280, `where` 80 | `run` | what it found, most important first. The first `high` one shows as "Where I would start" |
| `chart` | no | 2 to 8 `{label (28), value (a number)}` | `run` | the breakdown; hidden when missing |
| `chart_title` | no | 60 | `run` | falls back to "What we measured on {domain}" |
| `scope` | no | 200 | `run` | what was checked and when |
| `report_url` | no | an https URL | `run` | an "Open the full report" link. It passes the link rules: no shortener, no IP host, no port, and a domain older than 30 days |
| `headline` | no | 10 to 90 | `explain` | the main result in plain words with the number from `metric`. Fallback: "What we found on {domain}" |
| `meaning` | no | 900 | `explain` | 2 or 3 short paragraphs on what the result means for this account, every number from the result. Has a fallback |

## How it fills

1. `run` POSTs the account to your endpoint and takes the slots in its `to` list from the JSON answer. A good answer is cached 24 hours per template version, account and step; a timeout, 5xx or dropped connection is retried twice; a 4xx is final.
2. `explain` (prompt, requires `metric` and `findings`) writes `headline` and `meaning` from your result and the account's dossier.
3. `check` (grade, requires `headline` and `meaning`, pass at 7, 1 retry) fails any number or claim that is not in your result.

When the endpoint fails, `explain` and `check` do not run, the page ends `ready` rather than in review, and the link shows `fallback.liquid` ("the results are on their way") until a refill succeeds.

## Your own model (executor `"agent"`)

`prepare` calls your endpoint (free) and gives you `explain` and `check`. Write `headline` and `meaning` from the result only, grade them in a separate call, and submit. `references/studio-fill.md` has the loop.

## Check before the first link

- `metric` and `findings` are `filled`. If they fell back, the page tells the reader results are coming: do not link it until a refill fills them.
- Every number in `headline` and `meaning` appears in the result. The grade passed.
- `report_url`, when present, opens and belongs to your product.
- No email address or phone number of anyone in any value.

## When it goes wrong

| You see | Why | Do |
|---|---|---|
| Every page on the fallback | the endpoint is the example URL, unreachable, or answered 4xx | fix the endpoint in the template (the `studio-template` skill), publish, refill |
| A slot `failed` | the answer broke its schema: a number sent as text, a label over its limit, an unknown `severity` | fix the endpoint's answer; the README's table has every limit |
| The same old result after a fix | the 24-hour cache | publish a new template version to force fresh calls |
