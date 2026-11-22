# Power features

Part of the `workflows` skill. `SKILL.md` builds a workflow and takes it live, and `definition-format.md` is the format. This file is what the `workflows_power` feature adds: workspace variables, computed values, tables, connections to outside tools, workflows that call workflows, approvals by a person, a wait for an outside system, an engagement trigger, richer schedules, reports, team steps, a one-step test and the plain summary. Calls to Apollo, Instantly, Smartlead, Attio and Close are in `api-recipes.md`.

## Is it on

Everything here needs the `workflows_power` feature next to `workflows`. Only Kenso turns a feature on. Two things every workspace has: the `plain.assumptions` list and the `changes` list of a version diff. Without the feature the operations on this page are not available, and a step type, a `{{vars.NAME}}` reference or a call to a function under "More formula functions" is a `feature_disabled` issue: an error at publish, nothing in a draft.

The operations sit on two facades: `workflow_data` (variables, tables, rows) and `workflow_tools` (formulas, calls, approvals, connections, schedules, step tests, summaries). `describe_tools` lists each operation's fields.

When the feature is turned off again for a workspace, three published steps stop with `feature_disabled` instead of half-running. `webhook.wait@1` fails where it would open a new wait, because the run has no resume address then. `human.approve@1` fails where it would open an approval, because nobody could decide it then, and an approval opened earlier that times out fails the step instead of applying `onTimeout`. A `flow.subworkflow@1` step fails when the called workflow has an interface, its `inputs` hold a computed value, or the step has a `record` input; a called workflow with no interface, plain inputs and no `record` starts as before.

## Variables

A workspace variable is a named value every workflow of the workspace reads as `{{vars.NAME}}`, in a `with` value or in a formula: a score cutoff, a team channel, a list of blocked domains. A value that is an object reads by key as `{{vars.NAME.key}}`.

- List: `workflow_data(operation="workflow-variables-list", client_id=...)`
- Set (create or replace): `workflow_data(operation="workflow-variables-set", client_id=..., variable_name="MIN_SCORE", value=70)`
- Delete: `workflow_data(operation="workflow-variables-delete", client_id=..., variable_name="MIN_SCORE")`

A name is a capital letter followed by up to 63 capitals, digits or underscores (`invalid_variable_name`). A value is any JSON value except null, up to 16 KB (`variable_too_large`). A workspace holds up to 200 variables and 256 KB in all (`variable_limit_reached`). A running workflow reads a new value within 15 seconds. Publish refuses a name the workspace does not have (`unknown_variable`; its `fix` names the closest one when there is one), and a variable deleted after publish renders empty. A variable is not a secret: a key or a token goes in a secret, behind a connection.

## Computed values

A `with` value written `{"$formula": "<formula>"}` is computed when the step runs and keeps its JSON type, so a number stays a number and a list stays a list:

```json
{ "id": "tell_sales", "type": "slack.message@1", "with": { "channel": "#sales-alerts", "text": { "$formula": "join(pluck({{fetch.items}}, 'email'), ', ')" } } }
```

It works in the `with` of every step that is not a `logic.*` or `flow.*` step or a trigger, and in the `inputs` of `flow.subworkflow@1`. A logic step, a trigger, an input with a fixed list of values, a `secrets` list, `code.run@1`'s `code`, `campaign.refill@1`'s `filters`, `http.request@1`'s `connection`, and the `subject`, `body`, `text` and `voiceNote` of a step that sends (`send.*`, `campaign.enroll@1`, `campaign.send_step@1`, `reply.draft_in_thread@1`) are read as written (`invalid_formula_value`). To compute what a send says, put a `logic.formula@1` step before it and reference its output in the text. The object holds the `$formula` key and nothing else, the formula is at most 4,000 characters, it cannot read `secrets`, and its result must fit the input's type (`formula_type_mismatch`).

A formula's result holds lists and objects nested at most 32 levels deep. A deeper result is `formula_too_deep`, the code a formula nested more than 256 levels gets when it is parsed. This holds wherever a formula is evaluated: a step, `workflow-formulas-evaluate`, a step test and a called workflow's `outputs`.

## More formula functions

These need the `workflows_power` feature: with it off, publish refuses a formula that calls one (`feature_disabled`). With it on, they work wherever a formula goes. Names are case-sensitive.

| Group | Functions |
|---|---|
| text | `replace(text, search, replacement)`, `substring(text, start, length)`, `join(list, separator)`, `matches(text, pattern)`, `extract(text, pattern, group)`, `titleCase(text)`, `emailDomain(email)`, `urlDomain(url)` |
| lists | `pluck(list, key)`, `where(list, key, op, value)`, `sum`, `min`, `max` and `avg` (a list and an optional key), `sort(list, key, direction)`, `unique(list, key)`, `slice(list, start, end)`, `concat`, `last`, `flatten` |
| objects | `get(value, path, default)`, `keys`, `merge`, `pick`, `object(key, value, ...)` |
| dates | `formatDate(date, format, timezone)`, `parseDate(text, format)`, `dateDiff(from, to, unit)` with the unit `minutes`, `hours` or `days`, `addHours`, `addMinutes`, `startOfDay(date, timezone)`, `weekday(date, timezone)` |
| numbers | `abs`, `floor`, `ceil` |
| other | `toJson`, `parseJson`, `hash` |

`where` takes the operators `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `contains`, `in`, `is_empty` and `is_not_empty`. A pattern in `matches` and `extract` is a regular expression read in linear time: no lookaround, no backreference, at most 200 characters, case-sensitive unless it starts with `(?i)`.

To look for a phrase in a long reply, scraped page or transcript, use `contains(text, 'pricing')` (exact case, any length) or `matches(text, '(?i)pricing')` (any case, up to 262,144 characters, the most a step output holds; longer text is `formula_too_large`, as it is for `extract`). `contains(lower(text), ...)` fails on text over 64 KB, because `lower` builds a copy and a built value is capped at 64 KB. `extract` reads text over 4,096 characters only with a pattern whose every repetition has an upper count: write `{0,50}` for `*`, `{1,50}` for `+` and `{n,m}` for `{n,}`, as in `extract(text, '(?i)budget:? {0,3}([0-9,$]{1,12})', 1)`; with a `*`, `+` or `{n,}` it is `formula_too_large` there, so either count the repetitions or cut the text first with `substring(text, 0, 4096)`.

With the feature on, two operations help you write one. `workflow_tools(operation="workflow-formula-functions-list", client_id=...)` returns every function with its `category`, `arguments`, `returns`, `description` and `examples`. To try a formula on sample data before it goes into a step:

`workflow_tools(operation="workflow-formulas-evaluate", client_id=..., formula="join(pluck(where({{trigger.payload.people}}, 'seniority', 'eq', 'vp'), 'email'), ', ')", scope={"trigger": {"payload": {"people": [{"email": "a@x.com", "seniority": "vp"}, {"email": "b@x.com", "seniority": "manager"}]}}})`

It returns `ok`, `value`, `type`, `issues` (each with a `code`, a `message` and a 0-based `position`, which is null for an error found while evaluating) and the `references` the formula reads. The codes include `syntax_error`, `unknown_function`, `unknown_reference`, `type_mismatch` and `division_by_zero`. `scope` is keyed by root (`trigger`, a step id, `vars`) and holds up to 256 KB.

## Tables

A table is the workspace's own small store for workflows: leads already seen, a routing list, a daily tally. A workspace holds up to 50 tables of up to 100,000 rows each, and 500,000 rows across all its tables (`limits` on the tables list shows how many are used; a write past it is 409 `workspace_row_limit_reached`).

Create the table before a step names it:

`workflow_data(operation="workflow-tables-create", client_id=..., name="inbound_leads", columns=[{"name": "email", "type": "text", "required": true}, {"name": "company", "type": "text"}, {"name": "score", "type": "number"}], key=["email"])`

- A table or column name is a lowercase letter followed by up to 62 lowercase letters, digits or underscores (`invalid_table_name`, `invalid_column`).
- A table has 1 to 50 columns (`invalid_column` for none, `too_many_columns` above 50) of type `text`, `number`, `boolean`, `date` or `json`.
- `key` is one to three required columns, none of type `json` (`invalid_key`). Rows with the same key are the same row. The key cannot change later. A table with no key adds a row on every upsert.
- `workflow_data(operation="workflow-tables-update", client_id=..., table_name="inbound_leads", add_columns=[{"name": "source", "type": "text"}])` adds columns. A column is never removed, renamed or made required.
- `workflow-tables-list` lists the tables, and `workflow-tables-get` and `workflow-tables-delete` read and remove one by `table_name`.

Rows, from the agent side:

- `workflow_data(operation="workflow-table-rows-list", client_id=..., table_name="inbound_leads", where=[{"column": "score", "op": "gte", "value": 70}], sort="-score", limit=50)` returns `data` (each row has `id`, `values`, `createdAt`, `modifiedAt`) and `pagination`.
- `workflow_data(operation="workflow-table-rows-upsert", client_id=..., table_name="inbound_leads", rows=[{"email": "ada@example.com", "score": 82}], dry_run=true)` takes 1 to 500 rows, all or nothing, and answers `created`, `updated` and `unchanged`. A row is at most 16,384 bytes (`row_too_large`).
- `workflow_data(operation="workflow-table-rows-delete", client_id=..., table_name="inbound_leads", keys=[{"email": "ada@example.com"}], dry_run=true)` takes `keys` or `where`, never both, and answers `deleted`.

`where` is up to 10 conditions `{column, op, value}`, all of which must hold, with the operators `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `contains`, `in` (1 to 100 values), `is_empty` and `is_not_empty`. `dry_run=true` reports what would change and writes nothing: use it before a delete.

Three steps use a table inside a workflow:

```json
{ "id": "seen", "type": "table.find@1", "with": { "table": "inbound_leads", "where": [{ "column": "email", "op": "eq", "value": "{{trigger.fields.email}}" }], "limit": 1 } }
```

```json
{ "id": "remember", "type": "table.upsert@1", "when": "{{seen.found}} == false", "with": { "table": "inbound_leads", "row": { "email": "{{trigger.fields.email}}", "company": "{{trigger.fields.company_name}}" } } }
```

```json
{ "id": "forget", "type": "table.delete@1", "with": { "table": "inbound_leads", "key": { "email": "{{trigger.fields.email}}" } } }
```

| Step | Inputs | Outputs |
|---|---|---|
| `table.upsert@1` | `table`, `row` (every key column and any others) | `result` (`created`, `updated` or `unchanged`), `created`, `updated`, `unchanged`, `rowId`, `row` |
| `table.find@1` | `table`, optional `where`, `sort` (`column` or `-column`), `limit` (1 to 200, 50 by default), `aggregate` (`{function, column}` with `count`, `sum`, `min`, `max` or `avg`, over every matching row) | `rows`, `count`, `found`, `first`, `aggregate`, `truncated` |
| `table.delete@1` | `table`, and `key` (one row) or `where` (never both, never an empty `where`) | `deleted` |

Publish refuses a table or a column the workspace does not have (`unknown_table`, `unknown_table_column`). In a test run these steps write and delete test rows only: a real run never reads them, a table's `rowCount` leaves them out, and they are removed after 24 hours. A test run reads its test rows plus every real row no test row with the same key replaces, and its `table.delete@1` removes test rows only: a real row it matches stays, and is not counted in `deleted`.

A workflow that remembers each record first and stops when it already knows it (a `table.upsert@1` step, then a filter on `{{dedupe.created}} == true`) gets past its filter only on the first test: the test row stays for 24 hours, so every later test of the same key answers `created: false` and ends at the filter. To test the steps after it again, pin the upsert step: `workflow_builder(operation="test", client_id=..., workflow_id=..., pinned_outputs={"dedupe": {"result": "created", "created": true, "updated": false, "unchanged": false}})`. In a workflow with an interface you can send `inputs` with a key no test has used instead. A pinned step counts as untested, so the first test, before the row exists, is the one that tests the upsert itself.

`table.find@1` returns at most 200 KB of `rows`. When the rows it found are more than that, it returns the first ones that fit, `count` is how many it returned, and `truncated` is `true` (it is left out otherwise). `first` and `aggregate` are not affected. Ask for fewer rows with `limit`, or narrow `where`. The 200 KB is counted as a run stores a step's output: a non-ASCII character, or one of `<>&'"+`, takes 6 bytes there, and the copy of the first row in `first` counts too.

`table.upsert@1` can report a row it created itself as not created. When a worker stops after the row is written and before the step's result is stored (a deploy, a lost claim), the step runs again, finds its own row and answers `created: false` with `result: "unchanged"`. So a workflow that stops at a filter on `{{dedupe.created}} == true` can, rarely, stop a new record there, and the run ends as a success. Where a missed record matters, look the row up with `table.find@1` first and filter on its `found`, as in the example above: a step that already succeeded keeps its output when a later step runs again. The upsert's `created` is still the one check that holds when two runs for the same key start at the same moment.

## Connections

A connection holds how to reach one outside tool: its base address, the hosts a step may call, and the name of the secret that signs the call. A step names the connection and Kenso sends the credential itself, so no step holds a key.

`workflow_tools(operation="workflow-connections-create", client_id=..., name="crm", type="bearer", secret_name="CRM_TOKEN", base_url="https://api.example.com")`

| `type` | What Kenso sends | `auth_name` |
|---|---|---|
| `bearer` | the header `Authorization: Bearer <secret>` | leave it out |
| `header` | the header named by `auth_name`, with the secret as its value | the header's name, e.g. `X-Api-Key` |
| `query` | the query parameter named by `auth_name`, with the secret as its value | the parameter's name |
| `basic` | HTTP Basic, with `auth_name` as the user name and the secret as the password | the user name |

- `name` is a lowercase letter followed by up to 62 lowercase letters, digits or underscores. The name and the `type` never change.
- `secret_name` is a secret's name: a capital letter followed by capitals, digits or underscores, 2 to 64 characters. The secret need not exist yet.
- `base_url` is the https address a step's path is joined to: a public host, no query string. Give one: a connection test needs it.
- `allowed_hosts` lists up to 20 hosts a step may call through the connection, each exact or `*.example.com` (one label). Left out, it is the host of `base_url`.
- A workspace holds up to 50 connections (`connection_limit_reached`). Creating, changing, testing and deleting one needs the Integrations permission.

The answer carries `secretSet` and `setupUrl`. When `secretSet` is false, give the person `setupUrl` so they enter the value themselves. Never ask for a key in the chat and never write one into a definition.

Then check it: `workflow_tools(operation="workflow-connections-test", client_id=..., connection_name="crm", method="GET", path="/v1/me", expect_status=200)` makes one GET or HEAD call and returns `ok`, `status`, `expectStatus`, `durationMs`, `testedAt` and `failure`. It answers `secret_not_set` while the secret has no value, and its outcome is the connection's `lastTest` until an update changes `base_url`, `allowed_hosts` or `secret_name`. `workflow-connections-list` lists them, and `workflow-connections-get`, `workflow-connections-update` and `workflow-connections-delete` manage one by `connection_name`.

A secret with no value shows up in three places, each with its own form: the connection test answers 400 `secret_not_set` (field `secretName`), a run's step stops with the setup error `secret_missing:NAME` (the run waits in Needs attention), and the workflow's summary lists the need `connection_secret_missing`. All three mean the same thing: a person sets the value at the connection's `setupUrl`. `unknown_secret` is only for a `secret_name` that is not a valid name.

### In a step

`http.request@1` takes the connection by name. With one, `url` may be a path that starts with `/`:

```json
{ "id": "fetch", "type": "http.request@1", "with": { "connection": "crm", "url": "/v2/contacts", "method": "GET", "query": { "updated_since": "{{trigger.scheduledFor}}" }, "pagination": { "mode": "cursor", "itemsPath": "data", "cursorPath": "next", "cursorParam": "after", "maxPages": 5 } } }
```

| Input | Rule |
|---|---|
| `connection` | the connection's name, written in the step. Set no secret header beside it. An absolute `url` must be https on one of its allowed hosts (`connection_host_not_allowed`). Publish refuses an unknown name (`unknown_connection`) and needs the Integrations permission. |
| `query` | query parameters as text values, URL-encoded for you |
| `form` | form fields, sent as the body. Set `form` or `body`, never both. |
| `neverError` | `true`: the step succeeds on any HTTP status and the output `ok` says whether it was 2xx, so a later step can branch on `status`. A timeout or a blocked address still fails. |
| `pagination` | follows a GET API's pages and returns every item in `items`, with `pages` and `stopReason` (`no_more`, `max_pages`, `max_items`, `repeated_page`, `empty_page`) |

`pagination.mode` picks how the next page is asked for: `cursor` (needs `cursorPath`, where the answer holds the next cursor, and `cursorParam`, the query parameter that sends it), `offset` (needs `offsetParam` and `pageSize`; `limitParam` sends the page size) or `next_url` (needs `nextUrlPath`, where the answer holds the next page's address). `itemsPath` is where the list sits in the answer; without it the answer itself is the list. `pageSize` is 1 to 1,000 and `maxPages` 1 to 20 (5 by default). A paginated step is GET only, stops at 1,000 items (or 200 KB of them, counted as for `table.find@1`'s rows, with `stopReason` `max_items`) and at 120 seconds in all, and a wrong block is `invalid_pagination`. Its output has no `json`: read `items`. `status` and `headers` are the last page's.

## A workflow that calls a workflow

A workflow says what it takes and what it gives back with a top-level `interface`: typed inputs, and outputs written as formulas.

```json
{
  "interface": {
    "inputs": { "domain": { "type": "text", "required": true, "description": "The company's website domain" } },
    "outputs": { "score": "{{qualify.score}}" }
  }
}
```

An input's type is `text`, `number`, `boolean`, `list` or `object`. A name is a lowercase letter followed by up to 62 letters, digits or underscores, and an interface holds up to 30 inputs and 30 outputs (`invalid_interface`). Inside the workflow an input reads as `{{trigger.domain}}`. An output is a formula over `trigger`, the top-level steps, `run` and `vars`, and its references are checked like a step's when the workflow is saved (`unknown_reference`, `unknown_variable`, `unknown_error_step`).

Another workflow calls it with `flow.subworkflow@1`:

```json
{ "id": "score_account", "type": "flow.subworkflow@1", "with": { "workflowId": 812, "inputs": { "domain": "{{account.primaryDomain}}" }, "wait": true } }
```

`inputs` may hold references and computed values, and is checked against the interface when the caller is published and again when it runs (`subworkflow_input_missing`, `subworkflow_input_unknown`, `subworkflow_input_type`). When the step waits, the called workflow's outputs come back as `{{score_account.outputs.score}}`, next to `runId` and `status`. An optional `record` (`{"type": "person", "id": "{{item.id}}"}`) makes the called run about that record instead of the caller's, which is how a for each runs a workflow per item. A called workflow with no interface gets its `inputs` filled in the same way, references and computed values included, but unchecked and with no `outputs` back; a calling version last saved or published before this change keeps handing them as written until the workflow is published again. Every called workflow, with an interface or not, starts at most five levels below the first run (`subworkflow_too_deep`).

To call one from outside a workflow: `workflow_tools(operation="workflow-calls-create", client_id=..., workflow_id=812, inputs={"domain": "acme.com"}, wait_seconds=30)`. It starts a real run, waits up to `wait_seconds` (0 to 50; left out, it does not wait) and returns `runId`, `status` (`succeeded`, `failed`, `cancelled`, `needs_attention`, `over_limit` or `running`) and, for a run that succeeded within the wait, `outputs`. For a run that was still `running`, read it later: `workflow_runs(operation="get", client_id=..., run_id=<runId>)` carries the same `outputs` once the run has succeeded. A workflow that is not published and on, one in a workspace whose workflow runs are off, or one whose trigger runs on places answers `workflow_not_callable`. One whose trigger runs on account, person or lead records needs `record_type` and `record_id` of that type (`record_required`). One with no interface takes `inputs` as written and returns no `outputs`.

To test a workflow with an interface, give the test sample values: `workflow_builder(operation="test", client_id=..., workflow_id=812, inputs={"domain": "acme.com"})`. Left out, each input gets a sample of its type. A test that succeeded returns `outputs`, the interface outputs as a call would return them, so check the output formulas there before you publish.

## Approvals

`human.approve@1` stops the run until a person decides.

```json
{ "id": "approve", "type": "human.approve@1", "with": { "title": "Send the proposal to {{account.name}}?", "summary": "Fit score {{qualify.score}}", "assignee": "owner", "fields": [{ "name": "discount", "type": "number", "required": false, "label": "Discount in percent" }], "notify": ["email", "slack:#sales-ops"], "timeoutHours": 24, "onTimeout": "reject" } }
```

- `assignee` is `owner` (who published the workflow), `anyone` (any member who can edit workflows) or a member id as text or as a reference. A named member decides their own approval whatever their Workflows access, so a view-only rep can be the approver; a member on a Client or Network member seat cannot, and is `unknown_assignee`, at publish for an id written in the step and when the step runs for a reference. A `team.pick_member@1` that feeds the assignee may pick view-only members (`roles: ["member"]` or their ids); with no `members` and no `roles` it picks among the members who can edit workflows.
- `fields` collects up to 10 values with the decision, each `{name, type, required, label}` with the type `text`, `number` or `boolean`.
- `notify` lists `email` and `slack:#channel` (`invalid_notify_target`). A notification that fails never fails the step. The email counts toward the workspace's daily limit of workflow emails (5,000 a day on most plans), shared with `notify.email@1`: past it the email is not sent and the approval still opens.
- `timeoutHours` is 1 to 720 (72 by default). `onTimeout` is `reject` (the default), `approve` or `fail`.

Its output is `decision` (`approved` or `rejected`), `decidedBy`, `decidedAt`, `note`, `fields`, `timedOut`, `simulated` and `approvalId`. Guard what follows: `"when": "{{approve.decision}} == 'approved'"`. A test run does not wait: the step is simulated as approved, with `simulated` true. When a run is restarted, its cancelled approval, or one that timed out under `"onTimeout": "fail"`, opens again; one that timed out under `reject` or `approve` keeps that decision. If the feature is turned off for the workspace, nobody can decide, so the step fails with `feature_disabled` instead of opening an approval, and an approval that was already open fails the step the same way when it times out, whatever `onTimeout` says.

The waiting approvals are a queue: `workflow_tools(operation="workflow-approvals-list", client_id=..., status="pending", assignee="me")` (`status` is `pending`, `approved`, `rejected`, `timed_out` or `cancelled`; `assignee="me"` is the queue of the person you act for, their own approvals and the ones for `anyone`, while a member id lists only the approvals assigned to that member), then `workflow_tools(operation="workflow-approvals-get", client_id=..., approval_id=31)`. An approval for a member or the owner belongs to that person, whatever their Workflows access, or an Admin, and one for `anyone` to any member who can edit workflows, so decide only when that person tells you to: `workflow_tools(operation="workflow-approvals-decide", client_id=..., approval_id=31, decision="approve", note="Agreed on the call", fields={"discount": 10})`. `decision` is `approve` or `reject` and `note` is up to 2,000 characters. The same decision again returns the stored approval; the other decision, or one on an approval that timed out or was cancelled, answers `approval_already_decided`.

## Wait for an outside system

`webhook.wait@1` stops the run until another system posts to the run's resume address, `{{run.resumeUrl}}`. Hand that address to the other system in an earlier step, then wait:

```json
{ "id": "ask_signature", "type": "http.request@1", "with": { "connection": "esign", "url": "/v1/envelopes", "method": "POST", "body": { "email": "{{person.email}}", "callbackUrl": "{{run.resumeUrl}}" } } }
```

```json
{ "id": "signed", "type": "webhook.wait@1", "with": { "timeoutSeconds": 259200, "onTimeout": "continue" } }
```

The address is signed and belongs to one run. Each POST, with a body of up to 256 KB, resumes the run's oldest waiting `webhook.wait@1` step, and a post that arrives while no step waits is kept for one hour for the next one. `timeoutSeconds` is 60 to 2,592,000 (one day by default) and `onTimeout` is `continue` or `fail`; any other value is `invalid_input` when the workflow is saved. The output is `timedOut`, `body` (the posted JSON, or `{"raw": "..."}` for anything else) and `receivedAt`. It is for systems. For a person, use `human.approve@1`.

Use one `webhook.wait@1` for each time the outside system posts to the address. A post is not matched to a step: it resumes the oldest step that waits, or is kept for the next one. So a sender that retries a post it already delivered answers the run's next `webhook.wait@1` with the repeat. In a run that waits more than once, have each wait check the body (an event id, a `type` field) before it trusts it. A workspace keeps early posts for at most 100 runs at a time; past that a post is answered 503 with `Retry-After`, and the sender should send it again. A wait whose rerun after the timeout is retried still follows `onTimeout`; it does not wait a second time.

## Engagement trigger

`trigger.engagement@1` starts a lead run when a lead opens, clicks, accepts or unsubscribes:

```json
{ "trigger": { "type": "trigger.engagement@1", "with": { "event": "link_clicked", "campaignId": 4411, "minCount": 2, "oncePerRecordDays": 7 } } }
```

`event` is `email_opened`, `link_clicked`, `linkedin_invite_accepted` or `unsubscribed`. `campaignId` narrows it to one campaign. `minCount` (1 to 20) starts the run once the lead has done it that many times in one campaign; only opens and clicks repeat, and machine opens and bot clicks never count. The tally lasts 30 days after the lead's latest counted one, so a lead whose opens or clicks are further apart starts again at 1. `oncePerRecordDays` (1 to 365, 7 by default) starts at most one run per lead and event in that many days. The run reads `{{trigger.event}}`, `{{trigger.count}}`, `{{trigger.contactId}}`, `{{trigger.campaignId}}`, `{{trigger.occurredAt}}` and, for a click, `{{trigger.url}}`. A `minCount` outside 1 to 20, or above 1 for `linkedin_invite_accepted` or `unsubscribed`, is `invalid_engagement_trigger`, and so is an `oncePerRecordDays` outside 1 to 365.

## Schedules

`trigger.schedule@1` takes two more shapes. Chosen days:

```json
{ "trigger": { "type": "trigger.schedule@1", "with": { "every": "day", "at": "09:00", "weekdays": ["monday", "wednesday", "friday"], "timezone": "Europe/Berlin" } } }
```

Or a five-field cron (minute, hour, day of month, month, day of week), read in `timezone`:

```json
{ "trigger": { "type": "trigger.schedule@1", "with": { "every": "cron", "cron": "30 8 1 * *", "timezone": "America/New_York" } } }
```

`weekdays` is 1 to 7 English day names and goes with `every: "day"`. A cron's fire times are at least 15 minutes apart. A schedule runs in UTC unless it names a `timezone`. A wrong `weekdays` is `invalid_weekdays`, a wrong `cron` is `invalid_cron`, and a cron that fires more often is `cron_too_frequent`. To show the person when it fires next: `workflow_tools(operation="workflow-schedules-get", client_id=..., workflow_id=12, version="draft")` returns each schedule source with its next five fire times in UTC (`version` is `draft` or `published`).

## For each: results and failures

`logic.for_each@1` takes two more inputs. `collect: true` adds `items` to its output, one `{index, status, outputs}` per item in order (up to 200 entries and 200 KB, `truncated` beyond that), so a later step can read what each item produced. `maxItems` (1 to 5,000) runs only the first items of a longer list and reports how many it left out as `skippedItems`.

```json
{ "id": "each_lead", "type": "logic.for_each@1", "with": { "items": "{{fetch.items}}", "collect": true, "maxItems": 100, "steps": [{ "id": "check", "type": "data.verify_email@1", "with": { "email": "{{item.email}}" } }] } }
```

After a step failed under `onFailure: continue` or `branch:<step id>`, a later step reads why: `{{run.errors.fetch.class}}`, `{{run.errors.fetch.message}}` (cut at 500 characters) and `{{run.errors.fetch.attempts}}`. They are null for a step that did not fail. The errors of steps inside a for each are read inside it, by a step of the same body: read from anywhere else they are always empty, so saving refuses that (`unknown_reference`).

`class` is one of four values: `temporary` (the cause was transient, such as a time limit or a provider that was briefly unavailable: a step the executor runs was retried before it failed with it, and a sub-workflow's start is not retried), `permanent` (it cannot work as written, or the other side refused), `setup` (something a person must connect or fix first) and `budget` (a spending or run limit was reached). `message` is the step's own error text. Most start with a code and a colon, so compare the start in a formula: `startsWith({{run.errors.wait.message}}, 'webhook_wait_timed_out')`. The forms a workflow can meet from these steps:

| `message` | Step and cause |
|---|---|
| `approval timed out` | `human.approve@1`: nobody decided in time under `"onTimeout": "fail"` (no code, the whole text) |
| `approval cancelled` | `human.approve@1`: the approval was closed without a decision (the whole text) |
| `unknown_assignee: ...` | `human.approve@1`: the assignee is not an active member, or is on a Client or Network member seat |
| `approval_limit_reached: ...` | `human.approve@1`: the workspace already has 1,000 approvals waiting for a decision, so none opened. Decide them or cancel the runs that wait on them, then restart the run |
| `feature_disabled: ...` | `human.approve@1`, `webhook.wait@1`, or `flow.subworkflow@1` with a called workflow that has an interface, a computed input or a `record` input: the feature is off for the workspace |
| `webhook_wait_timed_out: ...` | `webhook.wait@1`: nothing was posted in time under `"onTimeout": "fail"` |
| `webhook_wait_limit_reached: ...` | `webhook.wait@1`: the workspace already has 5,000 webhook waits open, so none opened. Post to their resume URLs or cancel the runs that wait, then restart the run |
| `unexpected_error: <type>` | any step: something failed on Kenso's side (`temporary`) |

## Reports and team steps

```json
{ "id": "week", "type": "report.query@1", "with": { "dataset": "replies", "windowDays": 7, "filters": { "campaignId": 4411 }, "groupBy": "classification", "limit": 50 } }
```

`report.query@1` reads the workspace's own numbers for a digest: `dataset` is `workflow_runs` (`filters` object keys `workflowId`, `status` and `isTest`, false by default; `groupBy` `status`, `workflow` or `day`) or `replies` (`filters` object keys `campaignId` and `classification`; `groupBy` `classification`, `campaign` or `day`). A filter written beside `filters` instead of inside it is not read. `windowDays` is 1 to 90 whole UTC days ending at the start of today. The output is `dataset`, `from`, `to`, `total`, `rows` and `truncated`. Saving checks these names: a `dataset` that is neither is `invalid_input`, a `groupBy` the dataset does not group by is `unknown_group_by`, and a `filters` key it does not take is `unknown_filter`. `dataset` is written in the step, never a reference. A `groupBy` that is a reference, or a computed `filters`, is checked when the step runs and fails with the same two codes (`unknown_dataset` is the run-time code for a dataset the save did not check).

```json
{ "id": "owner", "type": "team.pick_member@1", "with": { "strategy": "round_robin", "roles": ["editor"], "key": "inbound" } }
```

`team.pick_member@1` picks one active member: `strategy` is `round_robin`, `least_loaded` (fewest picks in the last 7 days) or `random`, from `members` (ids) and `roles` (`admin`, `editor`, `member`, `client`, `network_member`), up to 50 candidates; with neither, from every member who can edit workflows. Steps of one workflow with the same `key` share one rotation. The output is `memberId`, `name` and `email`. At publish, a member id written here or in a `notify.email@1` `to` that is not an active member is `unknown_member`.

```json
{ "id": "tell_owner", "type": "notify.email@1", "with": { "to": ["{{owner.memberId}}"], "subject": "New inbound lead: {{trigger.fields.company_name}}", "body": "Fit score {{qualify.score}}. Reply within a day." } }
```

`notify.email@1` emails workspace members, never a lead: `to` is a member id, `owner`, or a list of up to 20; `subject` is up to 200 characters and `body` up to 10,000 of plain text. The output is `sent` and `memberIds`. A test run simulates it. A workspace sends up to 5,000 workflow emails a day on most plans, one per recipient, approval emails included: a step past the limit mails nobody and waits for the limit to reset.

## Try one step

`workflow_tools(operation="workflow-step-tests-create", client_id=..., type="logic.formula@1", with_={"outputs": {"domain": "emailDomain({{trigger.email}})"}}, scope={"trigger": {"email": "ada@example.com"}})`

It runs one step by itself, with no workflow and no run. The step's input goes in `with_` (with the underscore). The answer has `status`, `output`, `rendered`, `wouldSend` and `issues`:

| `status` | Meaning |
|---|---|
| `evaluated` | a `logic.formula@1`, `logic.filter@1` or `logic.branch@1` step, computed for real |
| `simulated` | a step that sends, calls an outside tool or writes a table: nothing left Kenso, and `wouldSend` shows what would have, with each secret as `[secret NAME]` |
| `sample` | any other step: the step type's sample output |
| `invalid` | the input does not fit, or a feature the step needs is off: read `issues` |

`scope` is keyed by root and holds up to 256 KB. `{{vars.NAME}}` reads the workspace's variables unless `scope` has its own `vars`. A step test loads no record: put the record's sample values in `scope` (`{"person": {"firstName": "Ana"}}`); the route answers `record_not_supported` for a `record`. Use it to check one formula or one outside call before testing the whole workflow.

Every issue is `{path, code, message, fix}`: `path` says where (`$.with.<field>` or `$.scope.<path>`), `code` is the code alone, and `fix` says what to do. A value that cannot be computed from `scope` is its formula code (`division_by_zero`, `type_mismatch`) at its field. A column the table lacks is `unknown_table_column` at `$.with.row.<column>`, and a `connection` that is not a name written in the step is `unknown_connection`, as publish reports both. A `flow.subworkflow@1` test fills `inputs` from `scope` and, when the step waits, lists the called workflow's declared output names under `output.outputs`, each null. `workflow-formulas-evaluate` reads `{{vars.NAME}}` the same way, so one formula gives one answer in both tools.

## Assumptions, titles, summary, changes

- **Assumptions.** When you had to guess, say so in the draft: `plain.assumptions` is a list of `{id, text, stepIds, status, why}` with the status `open` or `confirmed`, up to 50 entries of up to 300 characters. Every workspace has it. Ask the person about each open one, then save the draft with `status: "confirmed"`. An id is never reused: give a new one the next `a<n>` past both the highest id in the list and `plain.assumptionsIssued` (the highest number the workflow has given; leave it as it is). An id used twice is the error `plain_assumption_duplicate_id`, which publish refuses. Warnings: `plain_assumption_unknown_step`, `plain_assumption_invalid_status`.
- **Titles.** With the feature on, a save rewrites the title of a filter, branch, wait, for each, approval, report, pick member, email or table step from its settings, and `plain.when.summary` from the trigger, so the words always match what runs. Set `titlePinned` on a step to keep your own title.
- **Summary.** `workflow_tools(operation="workflow-summaries-get", client_id=..., workflow_id=12)` is the workflow in plain words: `status` (`draft`, `off`, `problem`, `needs_you` or `working`), `headline`, `when`, `does` (up to six lines), `allSteps` (every step in the same shape as a `does` line, up to 100: read it to say what a later step does), `needs` (what a person must do: `approval_pending`, `assumption_open`, `secret_missing`, `connection_secret_missing`, `setup_missing`, `draft_unpublished`, and what turning it on would be refused for: `approval_required`, `voice_notes_off`, `voice_note_channel_mismatch`, `imessage_line_required`, `plan_required`, `linkedin_limit`, `publish_blocked`), `outcome` (the last 7 days), `problems` (`step_failing`, `invalid`, each with a fix) and `assumptions`. Read it to the person instead of the JSON, and say "turn on", never "publish". `approval_pending` carries `count`, how many approvals wait for the caller. A need's `action` of kind `ask_ken` carries `prompt`, a sentence the person could send you: on a `setup_missing` need for a table or a saved connection the workspace lacks, create the table or save the connection. `draft_unpublished` has no action while turning the workflow on would be refused (an error, a refusal need, or no test passed on the draft yet), and its `detail` says what to do first. Do not turn on an off workflow that has a refusal need: do what its action says first.
- **Changes.** `workflows(operation="versions-diff", client_id=..., workflow_id=12, number=3)` also returns `changes`, a list of `{path, before, after}` that names steps by id (`steps[score].with.formula`), up to 200 entries, with `changesTruncated` beyond that. Every workspace has it.
