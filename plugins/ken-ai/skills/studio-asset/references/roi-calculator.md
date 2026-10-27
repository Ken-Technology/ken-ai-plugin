# Fill guide: `roi-calculator`, ROI calculator

Starter `roi-calculator` 1.0.0. Type `calculator`, format `page`. Page slug `prospecting-roi`: `https://{host}/brightwave/prospecting-roi-for-leo`. Sections: `hero`, `calculator`, `result`, `booking`. The ask is the sender's booking calendar under the result.

An interactive calculator prefilled with a fair estimate of the account's own numbers, which the reader can change. The starter is written for one claim: the sender takes over the manual prospecting a sales team does by hand. It estimates the number of people who prospect, the hours each spends a week and the yearly cost of one rep, then shows what that costs and what the reader gets back.

Read the template's own `studio.json` first (`studio_templates(operation="pull", template_id=41)`): a workspace selling something other than outbound must have rewritten the `estimate` prompt and the inputs, and its file wins over this guide. You recognize this starter by the slug `prospecting-roi` and the steps `dossier`, `why_now`, `site`, `estimate`.

## Before you run it

- **The calculator matches what the workspace sells.** If the user's product is not prospecting work, the starter's claim is wrong for their buyers: the template needs its prompt, inputs and copy changed first (the `studio-template` skill and its `calculator.md` playbook).
- **The share it takes over** is the workspace's own claim. The starter defaults it to 60 percent and the reader can lower it. Never raise it without the user's say-so, and never promise a result: the page calls every figure an estimate.
- **Research and the homepage** make the estimate fair: open sales roles or a team size on the site change `reps` and `hours`. Read the dossier with `accounts(operation="get", account_id=3101, expand="research")`.
- **The sender's booking link**: the booking section embeds it, or shows a button, or nothing when there is none.

## What each field needs

| Slot | Required | Limits | Filled by | From |
|---|---|---|---|---|
| `dossier`, `why_now` | no | 4,000, 1,000 | binds | the research dossier |
| `site` | no | object | `site` (scrape) | the homepage |
| `reps` | yes | a whole number, 1 to 50 in the prompt | `estimate` | people who find their own new business. A team size or open sales roles on the inputs win; otherwise from the size band: 1-10 is 1, 11-50 is 3, 51-200 is 6, 201-500 is 12, 501-1000 is 20, larger is 30. Fallback 6 |
| `hours` | yes | 2 to 20 | `estimate` | hours a week each spends prospecting by hand: 8 by default, 10 to 12 for a team hiring reps or new to outbound, 5 for a mostly inbound team. Fallback 8 |
| `rep_cost` | yes | 40,000 to 250,000, a multiple of 5,000 | `estimate` | yearly cost of one rep in US dollars: 90,000 by default, 110,000 to 140,000 for software, finance or enterprise sales, 60,000 to 75,000 outside North America and Western Europe. Fallback 90,000 |
| `basis` | no | `reps`, `hours`, `rep_cost`, 120 each | `estimate` | where each number came from, or "A typical figure for a team this size." |
| `headline` | yes | 10 to 90 | `estimate` | names the account and the cost of prospecting by hand, with no numbers. Has a fallback |
| `intro` | yes | 20 to 300 | `estimate` | says the figures are an estimate for them to change, plus why now when there is one. Has a fallback |

## How it fills

1. `dossier` and `why_now` bind; `site` scrapes the homepage.
2. `estimate` (prompt) writes the three numbers, their basis, the headline and the intro, clamped to their ranges.

No grade step. The template computes the results from the three numbers; no model does that arithmetic.

## Your own model (executor `"agent"`)

`prepare` runs the binds and the scrape and gives you `estimate`. Return whole numbers inside the ranges, a `basis` line for each that names its real source, and submit with no grade results. `references/studio-fill.md` has the loop.

## Check before the first link

- `reps`, `hours` and `rep_cost` are `filled` and each `basis` line names a real source or says it is a typical figure. A number the inputs do not support with a basis that claims they do is an invented fact.
- The headline holds no numbers and promises no result.
- Open the page's `previewUrl` (`studio_pages(operation="get", asset_id=901)`) and change one input: the result updates.

## When it goes wrong

| You see | Why | Do |
|---|---|---|
| Every account gets 6, 8 and 90,000 | the estimate fell back, or no input supported a change | read `basis`; a thin dossier gives typical figures, which is honest |
| The calculator does not respond | a template change broke the Alpine CSP build | template work: the `studio-template` skill's `calculator.md` |
| The claim does not fit the workspace's product | the starter was published unchanged | stop and rework the template first |
