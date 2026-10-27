# Studio fill: the agent path

On this path the platform runs a template's data steps (`bind`, `tool`, `webhook`, `dataset`) and you write its `prompt` and `grade` steps with your own model. The steps you write carry no token charge. Use it for a handful of accounts on your own subscription. For many accounts, unattended, run with executor `"ken"` instead (see the `studio-asset` skill). What each starter's slots need, and where their data comes from, is in that skill's references, one file per starter.

Fill one page at a time, from prepare to submit. Every call takes `client_id`, the workspace id. A 404 on every Studio call means the workspace does not have Studio (the `studio` flag): stop and say so, and never retry it as a missing page.

## 1. Get the pages

The template needs a published version. Create a run with executor `"agent"`:

`studio_pages(operation="run-create", template_id=41, account_ids=[3101, 3102], executor="agent")`

The run's `assets` list each page's `assetId` and `accountId`, in state `draft`. Find them again later with `studio_pages(operation="run-get", run_id=77)` or `studio_pages(operation="list", template_id=41, state="draft")`.

## 2. Prepare

`studio_pages(operation="prepare", asset_id=901)`

The platform runs the data steps now (data steps are charged at rate card) and answers with `recipe`:

| Field | What it holds |
|---|---|
| `assetId`, `versionId` | the page and the template version this recipe fills. Send `versionId` back as `version_id` on submit |
| `variables` | Ken variables: `account`, `sender`, `brand`, `link`, `knowledge`. `person` is null: one page serves everyone at the account, and person fields bind per link when the page renders |
| `data` | the slots filled so far: data step outputs plus any slots you sent |
| `instructions` | the `prompt` and `grade` steps for you, in recipe order |
| `deferred` | `{stepId, kind, waitsFor}`: steps that wait for a slot an earlier instruction writes (a slot they read or `require`) |
| `skipped` | `{stepId, kind, reason}`: steps that failed, could not be built, or did not run because a slot in their `requires` is empty or failed (the reason names it, as in `requires data.candidates, which is empty`); their slots render their fallback |
| `expiresAt` | 24 hours ahead. A data step run in this window is reused, not run or charged again |

A `prompt` instruction has `stepId`, `kind`, `prompt` (the step's prompt rendered for this account, followed by its inputs as JSON and the exact keys and schema to return), `system` (the writer's rules), `to` (the slots it writes, such as `data.headline`), `schema` and `model` (the model the platform would use; yours writes instead).

A `grade` instruction has `stepId`, `kind`, `rubric`, `system` (the judge's rules), `on` (the slots it grades), `retries` (rewrites allowed after a fail, default 2), `passScore` (default 7 of 10), `schema` (the verdict shape: `score`, `pass`, `reasons`, `fix`) and, when the step has them, `checks`: string rules the graded slots must pass, which the platform runs again when you submit (step 5).

## 3. Write the prompt slots

For each `prompt` instruction, use `system` as the system prompt and `prompt` as the task. Answer with one JSON object holding exactly the keys in `to` (without `data.`), and make every value match `schema`: types, `minLength` and `maxLength` (in characters), `minItems` and `maxItems`, `enum` values and required keys. A `format: "uri"` value is an absolute https URL.

Use only facts in the inputs and `data`. When an input is null, write around it; never invent customers, numbers, quotes or people.

A step in `skipped` is not an instruction: leave its slots out of `submit`, even when you could write them. A step lands there with a `requires` reason when the search or tool result it writes from came back empty, and anything you wrote for it would be made up. The same happens on a later prepare when you send an empty value (`[]`, `{}`, `""`) for a slot a step requires.

Every value you write also passes these rules, or its slot fails:

- No `{{`, `{%`, `[[` or `${` left in any string.
- No email address or phone number except the sender's own.
- None of the workspace's banned phrases.
- HTML values hold formatting only: paragraphs, line breaks, headings, lists, tables, `a`, `img`, inline text tags. No script, style, form, iframe, SVG, `on*` handler or Alpine attribute.
- Links are `https:`, with no shortener, IP address, port or `user@` before the host.

Write short instead of cutting: a value over its `maxLength` fails.

## 4. Deferred steps

While `deferred` is not empty, call prepare again with every slot you have written so far:

`studio_pages(operation="prepare", asset_id=901, data={"search": {"currentTitles": ["Owner"]}, "brief": "...", "audience": {"summary": "..."}})`

The platform runs the data steps that were waiting. Prompt steps whose slots you already sent drop out of `instructions`, and the steps that were deferred show up. Repeat until `deferred` is empty.

## 5. Grade your own work

Run each `grade` instruction once every slot in its `on` is written. Judge in a separate model call from the one that wrote the slots: `system` as the system prompt, then the `rubric`, the pass score, the account and the graded slot values. The answer is `{score, pass, reasons, fix}`, and `pass` is true only when the rubric is met and `score` is at least `passScore`.

On a fail, send the writing step its own answer back with `fix` ("Fix this and keep everything else that was right: ..."), rewrite those slots, and grade again. Stop after `retries` rewrites.

### Checks

A grade with `checks` lists string rules its slots must pass, the same rules the platform runs before its own judge. Run them first: a hit fails the grade without a judge call, and the `fix` is each rule and the phrase it caught. A rule is off unless the step turns it on:

| Check | Fails on |
|---|---|
| `banned` | each listed word or phrase on word edges, with its -s, -es, -ed, -d or -ing forms: `demo` fails `demos`, not `demonstrate` |
| `no_placeholders` | `{{`, `{%`, `[[` or `${` left in the text, and `Your name` |
| `no_dashes` | em and en dashes and their entities; the simple hyphen `-` passes |
| `no_prices` | `$`, `€` or `£` before a number, or a number next to USD, EUR or GBP; `40%` passes |
| `no_test_noun` | "test" as a noun (`a quick test`, `test campaign`); the verb passes |
| `no_real_emphasis` | the word "real"; `real estate`, `real time` and `really` pass |
| `no_signoff` | a `body` field whose last paragraph is a sign-off (Best, Thanks, Cheers, ...) or a bare name |

The checks read every string in the graded slots, nested ones included, except under the field names in `skip`: values copied as given, such as a person's `name` or `title`.

Submit runs the checks again on the graded slots, data step outputs included (a grade in `skipped` is not checked). When a grade you report as passing (or do not report) fails one, the submit is refused and nothing is saved: a 400 with one detail per phrase, code `studio.grade_checks`, field the path (`data.emails[0].body`) and message the rule and what to do (`banned: "demo" in data.emails[0].body. Reword it without that word.`). Rewrite those phrases and submit again. When a check still fails after `retries` rewrites (a name the copy must quote holds a banned word), report that grade with `"pass": false`: the page goes to `needs_review` with your copy, as it does when the platform grades it.

Record the last verdict of each grade step as a list:

`[{"stepId": "grade", "score": 8.2, "pass": true, "reasons": ["Each first line names one fact about the recipient"]}]`

Report the real verdict. A `"pass": false` puts the page in `needs_review`, and a page in review cannot get a first link.

## 6. Submit

`studio_pages(operation="submit", asset_id=901, data={...}, grade_results=[...], version_id=57)`

`data` holds every slot your prompt steps wrote, from every round, keyed by slot name (`headline` or `data.headline`). Data step outputs are already on the page; leave them out. A key that is not a slot is ignored. `version_id` is the recipe's `versionId` from your last prepare.

Submit returns the page. Read `state` and `slotStatus` (`filled`, `fallback` or `failed` per slot):

| You see | Meaning | Do |
|---|---|---|
| `state: "ready"` | done | create links (step 7) |
| a slot you sent is `failed` | The platform dropped the value: it broke its schema, a rule in step 3, or links to a blocked domain. The page shows that slot's fallback | check the value against `schema` and the rules, fix it, submit again |
| `state: "needs_review"` | a grade verdict failed, or the data could not be validated | rewrite and resubmit with a passing verdict, or ask the user to review it on the page's Customize screen in Ken: their save there marks it ready (your own customize does not) |
| `state: "failed"` | a required slot has no value and no fallback | write that slot and submit again |
| a slot stays `fallback` | no step wrote it, or its step was skipped | fine when the fallback reads well; tell the user which slots fell back and why |

Submitting again is safe: each submit merges your slots over the page and checks it again. A 400 with code `studio.grade_checks` is a grade's `checks` (step 5): nothing was saved, so rewrite the quoted phrases and submit again. A 409 `studio_version_changed` means the page moved to another template version after your prepare (a publish or another run) and nothing was saved: prepare again, write the slots it returns, and submit with its `versionId`. A 409 `studio_page_invalid_state` means the page is building or retired; a 503 means fills are unavailable, so retry later.

## 7. Create links

Link the page as the `studio-asset` skill describes: `studio_pages(operation="create-link", asset_id=901, person_id=5521)`. The first link publishes the page and charges 1 credit, so say so before you link many pages.

## Costs

- No token charge for the `prompt` and `grade` steps: your own model wrote and graded the copy.
- Data steps the platform ran during prepare are charged at rate card: email found 1 credit, qualification 0.05, personalization 0.3. Today's data steps (`bind`, Ken Search, `chart.data`) cost nothing, scraping is free until the rate card prices it, and `webhook` and `dataset` steps are free. A `ken.copy` tool step is a model call the platform runs, so it costs tokens at 2x model cost on this path too.
- Prepare needs the Ask permission. Before it runs a paid step, it checks the balance (402), your monthly credit limit (402 `member_credit_limit_reached`) and takes one unit of the daily page quota (429). On any of these, stop and tell the user; calling prepare again does not help.
- The page credit comes with its first link, as on every path.

## Worked example: the `rd-ken-native` starter

Its recipe: `dossier` and `why_now` (bind), `target` (prompt: `search`, `brief`, `audience`), `find` (tool `ken_search.people` with the filters in `data.search`), `write` (tool `ken.copy` from `brief` and `audience`), `pick` (prompt: `headline`, `intro`, `shortlist`, `emails`), and `grade` on `data.emails` (1 retry, pass score 7.5).

The first prepare runs the two binds, gives you `target` and `grade`, and defers the rest. Its `recipe`, with values shortened:

```json
{
  "assetId": 901,
  "versionId": 57,
  "data": {"dossier": "Fernway sells scheduling software to home care agencies...", "why_now": "Opened a Texas office in August..."},
  "instructions": [
    {"stepId": "target", "kind": "prompt", "to": ["data.search", "data.brief", "data.audience"],
     "prompt": "You are planning who Fernway (fernway.example) should email first... Return one JSON object with exactly these keys: search, brief, audience...",
     "schema": {"type": "object", "properties": {"...": "..."}}, "model": "cheap"},
    {"stepId": "grade", "kind": "grade", "on": ["data.emails"], "retries": 1, "passScore": 7.5, "rubric": "Grade each email the way its recipient reads it..."}
  ],
  "deferred": [
    {"stepId": "find", "kind": "tool", "waitsFor": ["data.search"]},
    {"stepId": "write", "kind": "tool", "waitsFor": ["data.audience", "data.brief"]},
    {"stepId": "pick", "kind": "prompt", "waitsFor": ["data.audience", "data.brief", "data.draft", "data.people"]}
  ],
  "skipped": [],
  "expiresAt": "2026-10-16T09:12:00Z"
}
```

You write `search`, `brief` and `audience`, then prepare again with them (step 4). The platform runs `find` and `write`, and the answer holds `data.people`, `data.draft` and the `pick` instruction. You write `pick`'s four slots, grade `emails`, and submit:

`studio_pages(operation="submit", asset_id=901, data={"search": {"currentTitles": ["Owner", "Director of Operations"]}, "brief": "Fernway sells shift scheduling to home care agencies...", "audience": {"summary": "Owners and operations leads at home care agencies in Texas...", "chips": ["Agency owners"]}, "headline": "Six people who should hear about Fernway first", "intro": "I looked for the people who get the call when a visit has no caregiver...", "shortlist": [{"name": "...", "title": "...", "company": "...", "why": "..."}], "emails": [{"name": "...", "subject": "...", "body": ["Hi Maria,", "...", "..."]}]}, grade_results=[{"stepId": "grade", "score": 8.2, "pass": true, "reasons": ["Specific first lines, one soft ask"]}], version_id=57)`

The page comes back with `state: "ready"` and every slot `filled`.
