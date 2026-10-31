---
name: workflows
description: Build, validate, test, publish and run a workflow over MCP, from a plain-words goal or a template to a live workflow, then watch and recover its runs.
---

# Workflows

A workflow is automation in Kenso (Workflows, https://app.ken.so/<workspace id>/demo/workflows). It has one trigger (a signal, a new lead, a webhook, a schedule, or a run on records someone picks), a list of steps (find people, enrich, qualify with AI, branch, promote to Accounts, draft an email, post to Slack) and limits (credits per month and per run, runs per day). A `general` workflow runs on the workspace's accounts, people or leads. A `campaign` workflow belongs to one campaign and runs on its leads. A `system` workflow is Kenso's own and read-only. Kenso keeps one for each Knowledge skill (edit the skill instead), and the ones Kenso seeds for its own jobs are hidden: a 404 for anyone but staff (`references/ops-console.md`).

You edit a draft, and nothing runs until you publish it. A published workflow is `live`: its trigger starts runs. `draft` means it was never published. `off` means it was unpublished, or the engine paused it at a limit (`pausedReason`). Every run records the version it ran, each step with its attempts, and the credits charged. This skill is the loop from a goal to a live workflow, then running it on records and recovering runs.

Open a reference with `load_skill(name="workflows", reference="references/examples.md")` (or `name="workflows/references/examples.md"`):

| Reference | Open it when |
|---|---|
| `references/definition-format.md` | you write or fix a definition: keep it open the whole time |
| `references/examples.md` | you want a complete workflow to copy: three of them, one with a `code.run@1` step |
| `references/lead-source-workflows.md` | the user wants leads or accounts to come in by themselves (Sales Navigator, forms, website visitors, hiring signals, imports), or picks a template: every template, what it needs, and the template loop with a spend limit |
| `references/ops-console.md` | the caller is Kenso staff and the question is fleet-wide: queues, provider breakers, stuck runs, spenders, kill switches, system and shadow workflows. Never for anyone else |

Every call takes `client_id`, the workspace id. Send it on every call when the user can see more than one workspace.

## Step 0 - Check that it can run

Workflows are in beta and staff-only for now. Two flags decide what works for a workspace:

| Flag | Without it |
|---|---|
| `workflows` | the workflow tools are not listed, or every workflows call answers 404 |
| `workflows_runtime` | you can build, validate and estimate, but nothing runs: a test answers 404 (step 4) and live runs stay `queued` |

- The tools are not listed, or every call answers 404: Workflows is not on for this workspace yet. Stop, tell the user in one sentence, and link https://app.ken.so/<workspace id>/demo/workflows. Do not retry, and do not read that 404 as "this workflow does not exist".
- A 404 on one id while other calls work: another workspace's id or a deleted workflow.
- 403: the caller's role lacks Workflows view (reads) or edit (writes). Spend limits also need the billing permission, which an admin has.

## Step 1 - Start

List what exists first: `workflows(operation="list", client_id=..., q="funding")`. When a workflow already does what the user wants, change it (step 8) instead of creating another.

| Start from | Pick it when |
|---|---|
| A template | one of the templates below fits the goal |
| The builder | the user describes the goal in plain words and no template fits |
| Your own definition | you know the trigger and the steps |

**Template.** `workflows(operation="templates-list", client_id=...)` lists them with `requires` (`app:slack`, `secret:NAME`, `flag:x`: what the workspace needs before publishing). `references/lead-source-workflows.md` says what each template is for and what it needs. Read one with `workflows(operation="templates-get", client_id=..., template_key="signals-to-pipeline")`, then create a draft from it:

`workflows(operation="create", client_id=..., template_key="signals-to-pipeline")`

A template has placeholders such as `<fill in: your ICP in two sentences>`. Read the draft with `workflows(operation="get", client_id=..., workflow_id=12)` and replace each one with an update (step 8) before you test.

Replace every `<fill in: ...>` value before you publish; publish refuses them with `placeholder_not_filled`. A CRM field whose value is missing for a record is skipped, not cleared.

**Builder.** Describe the goal in plain words, 10 to 4,000 characters, with the trigger and what should happen:

`workflow_builder(operation="build", client_id=..., goal="When a lead's company raises a round, qualify it against our ICP, promote the fits to Accounts and draft a first email to the economic buyer.")`

It returns `workflow` (a new draft, never live), `issues` still to fix, `attempts`, `notes` and `timedOut`. The builder has 50 seconds: `timedOut` true means it saved its best draft so far, so fix its issues or build again on it. For a campaign, add `kind="campaign", campaign_id=87`. To rebuild an existing draft instead, add `workflow_id=12, base_version=3`. A 400 with detail code `build_failed` means the builder could not produce a definition that parses in time: spell out the trigger and the steps in the goal, or write the definition yourself.

**Your own definition.** Write it with `references/definition-format.md` open, then:

`workflows(operation="create", client_id=..., definition={...})`

A campaign workflow takes `kind="campaign"` and `campaign_id`. A definition that does not parse answers 400 `invalid_definition`, with one `error.details` entry per problem.

Done when the draft exists and you have its `id` and `draftVersion`. `draftVersion` is the draft's revision (its save counter), not the version `number` that `versions-list` shows: send it as `base_version` on the next save.

## Step 2 - Validate

`workflows(operation="validate", client_id=..., workflow_id=12, mode="draft")`

Use `mode="draft"` while editing: shape, step types, inputs, graph, references and formulas. Use `mode="publish"` before publishing: it also checks limits, secrets, connected apps and flags. Pass `definition={...}` to check a definition without saving it; omit it to check the saved draft.

The result is `valid`, `mode` and `issues`, each with `severity`, `path` (a JSON path such as `$.steps[2].with.prompt`), `code`, `message` and `fix`. `fix` is the instruction to follow: apply it, save the draft, validate again. `valid` is true when no issue has severity `error`; warnings never block, but read them.

| `code` | Fix |
|---|---|
| `limits_required` | Add `limits` with `creditsPerMonth`, `creditsPerRun`, `runsPerDay` and `atLimit`. Publish mode. |
| `missing_secret` | Ask the user for the value and create it: `workflow_builder(operation="workflow-secrets-create", client_id=..., name="CRM_TOKEN", secret_value=...)`; `workflow-secrets-rotate` replaces the value of one that exists. The value stays in the chat, so a user who would rather not paste it adds it in Kenso under Settings > Integrations > Secrets instead. Never repeat it back. `workflows(operation="workflow-secrets-list", client_id=...)` lists the names that exist. |
| `secret_header_only` | A step other than `code.run@1` names a header-only secret, which only a Run code step can use. Use a plain secret there. A secret stays header-only until the user deletes it and creates it again without the mark. |
| `secret_host_not_listed` | A `code.run@1` step names a header-only secret whose host its `allowedHosts` does not cover. Add the host `fix` names to `allowedHosts`. |
| `secret_header_conflict` | Two header-only secrets of one `code.run@1` step set the same header on the same host. Keep one of them in `secrets`. |
| `too_many_hosts` | A `code.run@1` step's `allowedHosts` plus the hosts its wildcards cover for header-only secrets pass 20. Replace the wildcard with the exact host, or remove a host. |
| `app_not_connected` | The user connects Slack (for `slack.message@1`) or a CRM, HubSpot or Salesforce (for `crm.*` steps), under Settings > Integrations, or removes the step. `workflows(operation="workflow-slack-connection-get", client_id=...)` checks Slack; the CRM connection is on Settings > Integrations > CRM. |
| `feature_disabled` | The step needs a flag that is off for this workspace: remove the step, or ask Kenso to turn the flag on. |
| `unknown_reference` | A reference names a step, root or output field that does not exist. Use the step's `exampleOutput` from `workflows(operation="step-types-get", client_id=..., type="ai.qualify@1")`. |
| `unknown_record_field` | A warning, so it still publishes, but the reference renders empty: `account`, `person` or `lead` followed by a field the record does not have, such as `account.domain`. Use the field `fix` names (`account.primaryDomain`, `lead.companyDomain`); `references/definition-format.md` lists each record's fields. |
| `unknown_step_type` | Use the type `fix` suggests, or find one with `workflows(operation="step-types-list", client_id=...)`. |
| `invalid_formula` | A `when` or formula does not parse or check. The message starts with the formula's own code (`syntax_error`, `unknown_function`, `type_mismatch`). |
| `approval_required` | Comes only from publish: a send step has `approval` other than `"required"`. Set it to `"required"`. |
| Parser codes: `invalid_json`, `invalid_type`, `missing_property`, `unsupported_format`, `invalid_name`, `missing_trigger`, `invalid_step_type`, `no_steps`, `invalid_id`, `reserved_id`, `invalid_on_failure`, `unknown_property` (a warning) | The definition's shape is wrong at `path`: fix it as `fix` says. `references/definition-format.md` lists every other code. |

Done when `valid` is true in `mode="publish"` and you have read every warning.

## Step 3 - Estimate

`workflows(operation="estimate-create", client_id=..., workflow_id=12, records=500)`

`records` is how many records will run (1 to 100,000): the list size for a run on records, or the expected runs a month for a trigger. It returns `expectedCredits`, `maxCredits` and the cost per step. `maxCredits` assumes every record reaches and pays at every step. It charges nothing.

Each step line has `chargedBy`. `workflow` lines are charged on the run's credits. A `campaign` line is a `campaign.sequence@1` step: the campaign charges its copy as AI personalization per lead written, at the campaign's price, so it counts in the totals but shows in the campaign's usage, not the run's credits or the workflow's `limits`. Estimate a campaign workflow by `workflow_id`: with a bare `definition` the estimate has no campaign, so that line says `variable: true`, keeps its per-lead price and stays out of the totals. Add it yourself when you tell the user. The copy line is an upper bound: a lead that already has copy, a campaign without personalization prompts, or a workspace on its own AI key is not charged for it.

Tell the user both numbers, and the `limits` that cap them (only the `workflow` lines), before anything runs.

## Step 4 - Test

`workflow_builder(operation="test", client_id=..., workflow_id=12, record_type="account", record_id=812)`

This runs the draft once as a test run on one record. Leave out the record to use the newest record of the trigger's type. For a campaign workflow, that is the newest live lead of its campaign; when the campaign has none, the call answers 400 `record_required` and names the campaign: add a lead to that campaign first.

A test run calls real providers, so it needs the workspace's `workflows_runtime` flag like any run. While that flag is off, the call answers 404 `Workflow runs are not enabled for this workspace (workflows_runtime is off).` and starts nothing: stop and tell the user that Kenso has to turn workflow runs on for this workspace. A test run that was already queued when the flag went off fails with the same message on its step. What a step does in a test depends on its type's `test` field (`workflows(operation="step-types-get", ...)`):

| `test` | In a test run |
|---|---|
| `simulate` or `sample` | returns the type's static example output, calls nothing and costs nothing. The output is the same on every test, not built from the record: `send.email@1` returns `touchId` 48213, `campaign.promote@1` returns `accountId` 1042. To check what the step would have done, read its rendered `input` in the run's steps. Every send is simulated: a test never sends. |
| `live` | runs for real and is charged. AI and data steps are live, and so are `campaign.protect@1`, `campaign.sequence@1`, the two segment steps and the A/B test step. `code.run@1` is live too, once the workspace has `workflows_code`: a test runs the code for real (free in credits), except a code step with `allowedHosts`, which is simulated (output `{}`) unless you name it in `live_steps`, since its code can call outside Kenso. While the feature is off, a test of a draft with a code step answers `feature_disabled` unless you pin the step's output. For any other type, read its `test` field. |

The trigger's output (what steps read as `trigger.<field>`) comes from the record under test, for the fields the trigger declares: a lead gives `leadId`, `campaignId`, `campaignSegmentId` and `createdAt`, an account `accountId` and `stage`, a person `personId` and its first account link. A field the record cannot supply, such as a signal's `signal`, `payload` and `occurredAt`, keeps the trigger type's example value, and the result's `exampleFields` lists those names: steps that read them ran on made-up values.

To force a branch, pin a step's output: `pinned_outputs={"qualify": {"score": 85}}` records that output for `qualify` without running it, so the branch after it takes the qualified arm. Keys are step ids. Pinned steps count as untested: when pins stand in for every action step that ran (branches, filters, formulas, waits and for-each do not count), the run can succeed but records no pass. Pin only what you need to steer the run.

A test run never waits: `logic.wait@1` goes on at once, and `logic.wait_for_event@1` goes on as if the event arrived (`timedOut` false), with no `event` payload. To test the timeout path, pin the wait step: `pinned_outputs={"reengaged": {"timedOut": true}}`. When a later step reads the event (such as `reengaged.event.reason`), pin one: `{"reengaged": {"timedOut": false, "event": {"reason": "reply"}}}`.

To check a webhook or HTTP step, or a code step with `allowedHosts`, for real, pass `live_steps=["notify"]`; sends never run live in a test.

The call waits up to `wait_seconds` (default 50, at most 50, so it answers within a minute) and returns `run`, `testPassed`, `timedOut`, `hint`, `definitionHash`, `versionStatus`, `publishPassRecorded`, `publishPassReason`, `exampleFields` and `liveSteps`:

- `publishPassRecorded` true: the pass is recorded on this draft. `testPassed` only says the run succeeded.
- `publishPassRecorded` false: `publishPassReason` says why. `all_steps_pinned`: test again with fewer pins. `draft_changed`: the draft was saved during or after the run, so test the current draft again. Do not edit the draft while a test runs: the run fails, and so does a replay of a test run after the draft changed. `not_passed`: see the bullets below. `published_version`: the run tested the published version.
- `timedOut` true: the run is still going, and `hint` names the two calls. Poll `workflow_runs(operation="get", client_id=..., run_id=5531)` until its status is `succeeded`, `failed` or `cancelled`, then call `workflow_builder(operation="test", client_id=..., workflow_id=12, run_id=5531)` to record the pass.
- The run ended `failed` or `needs_attention`: read its trace (step 7), fix the draft, test again.

A pass is tied to the draft's `definitionHash`, so any edit to the draft means test again.

Done when `publishPassRecorded` is true on the current draft.

## Step 5 - Publish

Before you publish, show the user the estimate (step 3) and the workflow's spend limit. Read it with `billing(operation="workflow-spend-limits-get", client_id=..., workflow_id=12)`: a workflow with no limits of its own reads as the workspace defaults (`isDefault` true), and `display` gives each limit in credits and dollars. Quote those numbers only, never your own. When the user names a cap, set it: `billing(operation="workflow-spend-limits-update", client_id=..., workflow_id=12, changes={"monthly_limit_millicredits": 200000, "at_limit": "pause"})` (1 credit is 1,000 millicredits; a null limit means no limit). The definition's `limits` fill these in only for a workflow that has none, so a limit you set stays. Then:

`workflows(operation="publish", client_id=..., workflow_id=12, note="Qualify funding signals")`

The gate, in order; the first failure wins:

1. The draft validates in publish mode. Otherwise 400 `invalid_definition`, one `error.details` entry per issue with its code and fix.
2. Every send step keeps `approval: "required"`. `"auto"` passes the gate only when the workspace has the `workflows_auto_send` flag, and even then every send still waits for approval in Today for now. Otherwise `approval_required`.
3. A test passed on the current draft.

A workflow that is off and has no draft (turned off, or a default workflow Kenso set up off) is turned back on instead: the same call puts its published version live through gates 1 and 2, with no new test and no new version.

| 409 | Do |
|---|---|
| `Workflow has no draft to publish.` | The workflow is live with no draft. To change it, save a draft first (step 8). |
| `The workflow could not be turned on with its published version. Open it, test it and publish it again.` | Its trigger no longer binds. Save a draft (step 8), test it (step 4), then publish. |
| `A test run must pass on this draft before publishing. Call POST /v1/workflows/{workflowId}/test, then publish again.` | Test this draft (step 4), then publish again. |
| `version_conflict` | Someone saved the draft during the publish. Re-read it with `workflows(operation="get", ...)`, test again if it changed, and retry. |

On success the workflow is `live`, its trigger is registered, and new runs use the published version. Runs already going keep the version they started on.

## Step 6 - Run on records

The workflow must be live (409 `Workflow is not live.` otherwise). Estimate first:

`workflow_runs(operation="run-on-records", client_id=..., workflow_id=12, records=[{"type": "account", "id": 812}, {"type": "account", "id": 813}], estimate_only=True)`

Show the user the credits in `estimate`. When they agree, send the same call without `estimate_only`. Up to 1,000 records per call. `type` is `account`, `person` or `lead`, and must match the trigger's record type (400 `record_type_mismatch`).

Each entry in `results` has `recordType`, `recordId`, `status` and `runId`:

| `status` | Meaning |
|---|---|
| `started` | a run started |
| `deduplicated` | an existing run already covers this record; `runId` is that run |
| `over_limit` | the run was created but parked over a limit; restart it later (step 7) |
| `not_live` | the workflow is not live any more |
| `not_found` | the workflow was not found |
| `failed` | the start failed; try again |

Records are not checked up front: a run on a missing record fails, and its trace says `record not found`.

## Step 7 - Watch and recover

List runs: `workflow_runs(operation="list", client_id=..., workflow_id=12, status="failed,needs_attention", is_test=False, created_after="2026-10-01T00:00:00Z")`. Filters: `workflow_id`, `status` (comma-separated, any of them), `record_type`, `record_id`, `is_test`, `created_after`, `created_before`. Newest first; pass `pagination.nextCursor` back as `cursor`.

Read one run: `workflow_runs(operation="get", client_id=..., run_id=5531)`. The trace has every step with its `status`, `input`, `output`, `errorClass`, `errorMessage`, credits and `attempts`. `errorClass` is `temporary` (retried with backoff on its own), `permanent` (failed now), `setup` (missing app, secret or permission: the run waits in Needs attention) or `budget` (credits or limits: the workflow's `atLimit` decides).

| Run `status` | Meaning | Do |
|---|---|---|
| `queued` | waiting for a worker | wait. Live runs do not move while the workspace's `workflows_runtime` flag is off (a test run fails instead): tell the user |
| `running` | a step is running | wait |
| `waiting` | on a wait step, an event, or a send waiting for approval | see below |
| `needs_attention` | parked by a setup problem, or a limit with `atLimit: "ask"` | fix the setup problem, then `workflow_runs(operation="retry", client_id=..., run_id=5531)`, or skip the step: `workflow_runs(operation="skip-step", client_id=..., run_id=5531, node_id="email")` (it continues as `failed_safely`), or give it an output: `workflow_runs(operation="set-step-output", client_id=..., run_id=5531, node_id="qualify", output={"score": 80})` |
| `succeeded` | done | nothing |
| `failed` | a step failed for good | `workflow_runs(operation="restart", client_id=..., run_id=5531)` re-runs the failed steps in place and keeps the paid outputs, or skip the failed step |
| `cancelled` | someone cancelled it | replay it for a fresh run |
| `over_limit` | over Kenso's hourly cap on runs an event trigger may start for one workflow (an engine limit staff can change per workspace, not part of the definition) | restart it once under the limit (409 `Workflow is still over its event limit; try again later.` until then) |

- **Retry** also releases a step waiting on a backoff right away. It returns `stepsReleased` and the new `status`.
- **Restart** works on `failed`, `needs_attention` and `over_limit` runs.
- **Replay** makes a fresh run linked to the old one, on the same version, from one step: `workflow_runs(operation="replay", client_id=..., run_id=5531, from_node_id="research")`. Leave out `from_node_id` to replay from the start. It works on a run in any status.
- **Cancel** stops a run that is not finished: `workflow_runs(operation="cancel", client_id=..., run_id=5531)`.
- **Skip** and **Set output** resolve one top-level step by hand and let the run continue; a hand-entered output runs no Save to field.
- **Bulk:** `workflow_runs(operation="bulk", client_id=..., action="restart", workflow_id=12, status="failed")` acts on a filter, or pass `run_ids=[5531, 5532]` instead. `action` is `cancel`, `restart`, `retry` or `skip` (`skip` needs `node_id`, the step to skip in every run). A filter stops at the newest 1,000 runs and says `truncated: true` with a `nextCursor`: call again with the same filter and `cursor=<nextCursor>` until `truncated` is false. Each result has its own `status`.
- **Where a workflow fails:** `workflow_runs(operation="step-overview", client_id=..., workflow_id=12)` counts each step's statuses over the last 30 days (or `created_after` / `created_before`), with average duration, credits and the last error.

A send step with a body (or LinkedIn `text`) creates a touch that waits for approval in Today. Without one, the touch is created planned and is not in Today until Ken's writer drafts it (workspaces with the `accounts_writer` flag) or a person writes it on the account. The run stays `waiting` meanwhile. Once a person approves it, the Accounts send pass sends it where sending is on for the workspace, and the step succeeds with status `sent` and charges one send credit. A touch a person skips or deletes ends the step with status `skipped` or `deleted` and charges nothing. When the workspace's Contact limits refuse the touch (the same check an agent's `POST /v1/touches` gets: weeks between touches to a person, new people a day, the send window's days, open opportunity), no touch is created: the step succeeds at once with status `skipped`, `reason` `contact_limit`, the `rule`, the guardrail's `message` and `nextAllowedAt`, charges nothing, and the run goes on. Its output then has no `touchId`. A refusal by the send window's day rule alone (`agent_send_window`) is deferred instead, because a workflow has no agent to retry: the touch is created due at the window's start time on its next day (America/New_York; Monday to Friday at 08:00 by default), at most a week out, the output's `deferredUntil` says so, and the step waits with its 14 days counted from then. Refused again on that day (the new-people cap, for example), the step skips as above. The new-people cap, spacing and open opportunity are never deferred, so a skip on a day outside the window can still name `rule` `agent_send_window` when another rule fails at the same time (the verdict names the rule that clears last). A touch the send pass gives up on (status `failed`) stays in Today for a retry, and the step keeps waiting. With no send, the wait times out after 14 days: the step then fails with `wait timed out: touch.sent` and charges nothing.

### Outcome codes

These codes start a failed step's `errorMessage`. The step fails as `permanent` and Kenso never runs it again on its own: the first three because running it twice could act twice, `draft_changed` because the run no longer tests one draft.

| Code | Meaning | Do |
|---|---|---|
| `unknown_outcome` | An earlier attempt started the step and never finished (a worker restart or a lost lease), and the step is not safe to run twice: a send, a step that is not retry-safe, or an `http.request` that is not a GET or HEAD | check the target system (the API, Slack, the CRM, Today). If it acted, skip the step or set its output; if not, restart the run |
| `crm_unknown_outcome` | A `crm.create_opportunity@1` create was sent and the CRM did not confirm it, so the deal may exist | check the CRM. If the deal is there, skip the step or set its output to the deal's id; if not, restart the run |
| `code_unknown_outcome` | A `code.run@1` record may have run, so its calls to your hosts may have gone out | check what the code calls, then skip the step or restart the run |
| `draft_changed` | The draft was saved while a test run (or a replay of one) ran, so the run no longer tests one definition | read the workflow again (`workflows(operation="get", client_id=..., workflow_id=12)`), then test the current draft. Do not edit the draft while a test runs |

Restart re-runs only the failed steps: `workflow_runs(operation="restart", client_id=..., run_id=5531)`. Skip: `workflow_runs(operation="skip-step", client_id=..., run_id=5531, node_id="push")`.

### Failed runs, in one pass

When the user asks why a workflow fails, or for a daily check:

1. `workflow_runs(operation="step-overview", client_id=..., workflow_id=12)`: which step fails, how often, and its last error.
2. `workflow_runs(operation="list", client_id=..., workflow_id=12, status="failed,needs_attention", is_test=False)`, then read one run per failing step with `get` for each step's `errorClass` and `errorMessage`.
3. Group the runs by `errorClass` and fix each group's cause before you recover anything:

| `errorClass` | Cause | Do |
|---|---|---|
| `setup` | a missing app, secret or permission; the run waits in Needs attention | the user fixes it in Settings, then `retry` the runs (`bulk` with `action="retry"` for many) |
| `budget` | a credit or spend limit; `atLimit` decided pause, ask or hold | raise the limit on the user's yes (step 5), or wait for the limit to reset, then `retry` |
| `temporary` | a provider error Kenso retries with backoff by itself | wait; `retry` only to skip the backoff |
| `permanent` | bad input on the record, or a definition bug | a bad record: skip the step or set its output. A definition bug: fix the draft, test and publish (steps 2 to 5), then start new runs (step 6). `restart` and `replay` keep the run's version, so they repeat the bug |

4. Say what the recovery costs before you start it: `restart` charges again only the steps it re-runs and keeps the paid outputs, `replay` charges every step from `from_node_id` on (every step without it), `retry` charges the released step when it runs, and skip and set-output charge nothing. For a bulk action, give the run count and an upper bound from `workflows(operation="estimate-create", client_id=..., workflow_id=12, records=40)`, and wait for a yes.
5. Report per group: how many runs, the cause in plain words, what you did, and what still waits on the user.

## Step 8 - Change it

Read the workflow: `workflows(operation="get", client_id=..., workflow_id=12)`. Its `draftVersion` is the draft's revision and the `base_version` for the next save (null when there is no draft: send 0, and the first save copies the published version). It is not the version `number`: a draft saved five times on version 2 has `draftVersion` 5.

`workflows(operation="update", client_id=..., workflow_id=12, base_version=3, patch=[{"op": "replace", "path": "/steps/0/with/criteria", "value": "B2B SaaS, 50 to 500 people"}])`

Send `patch` (RFC 6902 operations) or the whole `definition`. A stale `base_version` answers 409 `version_conflict` with `currentVersion`: read the workflow again, reapply your change, send `currentVersion` as `base_version`. Then validate, test and publish again (steps 2 to 5). The live version keeps running until the new one is published.

- **Stop it:** `workflows(operation="unpublish", client_id=..., workflow_id=12)` retires its triggers and sets it `off`. To turn it back on, save a draft, test it and publish.
- **Versions:** `workflows(operation="versions-list", client_id=..., workflow_id=12)`, `workflows(operation="versions-get", client_id=..., workflow_id=12, number=4)`, `workflows(operation="versions-diff", client_id=..., workflow_id=12, number=4, against=3)` (steps added, removed and changed). `workflows(operation="versions-restore", client_id=..., workflow_id=12, number=3)` copies an old version into the draft; test and publish it to make it live. `workflow_runs(operation="activity", client_id=..., workflow_id=12)` lists the audit log.
- **Delete:** only when the user asks: `workflows(operation="delete", client_id=..., workflow_id=12)`.

## Rules

- Show the estimate before every publish and every run on records.
- Keep every send step at `approval: "required"`. Set anything else only when the user asks for automatic sends and the workspace has the `workflows_auto_send` flag.
- One workflow per goal: list first, and change the one that fits instead of creating a duplicate.
- Set or confirm a spend limit before you publish (step 5), and quote only the credits and dollars the tools return.
- A campaign workflow on a client's campaign decides who that campaign sends to. Publishing, unpublishing or bulk-cancelling one needs a yes that names that client, with its source (who said it, where and when).
- Never retry a call that answered 404 on every id (step 0).

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
