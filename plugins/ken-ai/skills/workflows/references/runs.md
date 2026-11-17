# Runs: start, watch and recover

Part of the `workflows` skill. `SKILL.md` builds the workflow and takes it live; this file is for its runs after that.

## Run on records: result statuses

Each entry in `results` has `recordType`, `recordId`, `status` and `runId`:

| `status` | Meaning |
|---|---|
| `started` | a run started |
| `deduplicated` | an existing run already covers this record; `runId` is that run |
| `over_limit` | the run was created but parked over a limit; restart it later (Watch and recover) |
| `not_live` | the workflow is not live any more |
| `not_found` | the workflow was not found |
| `failed` | the start failed; try again |

Records are not checked up front: a run on a missing record fails, and its trace says `record not found`.

## Watch and recover

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

## A send step that waits

Instagram workflow steps are not available yet.

A send step (`send.email@1`, `send.linkedin@1`, `send.whatsapp@1`) with a body (or LinkedIn or WhatsApp `text`) creates a touch that waits for approval in Today, unless it is a LinkedIn or WhatsApp send on `"auto"`, which Ken approves once its text is final and passed review. Without one, the touch is created planned and is not in Today until Ken's writer drafts it (workspaces with the `accounts_writer` flag) or a person writes it on the account. The run stays `waiting` meanwhile. Once a person approves it, the Accounts send pass sends it where sending is on for the workspace, and the step succeeds with status `sent` and charges one send credit. A touch a person skips or deletes ends the step with status `skipped` or `deleted` and charges nothing. When the workspace's Contact limits refuse the touch (the same check an agent's `POST /v1/touches` gets: weeks between touches to a person, new people a day, the send window's days, open opportunity), no touch is created: the step succeeds at once with status `skipped`, `reason` `contact_limit`, the `rule`, the guardrail's `message` and `nextAllowedAt`, charges nothing, and the run goes on. Its output then has no `touchId`. A refusal by the send window's day rule (`agent_send_window`), the new-people cap (`agent_new_people_per_day`) or both, and by no other rule, is deferred instead, because a workflow has no agent to retry and a run fires once per record: the touch is created due at the window's start time (America/New_York; Monday to Friday at 08:00 by default) on the first later day every rule allows, so a weekend run whose Monday is full goes to Tuesday. That is at most a week out, the output's `deferredUntil` says so, the run log names the rules that moved it, and the step waits with its 14 days counted from then. Refused again at that time, the step skips as above. Spacing and open opportunity are never deferred, alone or with the others, so a skip on a day outside the window can still name `rule` `agent_send_window` when spacing fails at the same time (the verdict names the rule that clears last). A touch the send pass gives up on (status `failed`) stays in Today for a retry, and the step keeps waiting. With no send, the wait times out after 14 days: the step then fails with `wait timed out: touch.sent` and charges nothing.

## Outcome codes

These codes start a failed step's `errorMessage`. The step fails as `permanent` and Kenso never runs it again on its own: the first three because running it twice could act twice, `draft_changed` because the run no longer tests one draft.

| Code | Meaning | Do |
|---|---|---|
| `unknown_outcome` | An earlier attempt started the step and never finished (a worker restart or a lost lease), and the step is not safe to run twice: a send, a step that is not retry-safe, or an `http.request` that is not a GET or HEAD | check the target system (the API, Slack, the CRM, Today). If it acted, skip the step or set its output; if not, restart the run |
| `crm_unknown_outcome` | A `crm.create_opportunity@1` create was sent and the CRM did not confirm it, so the deal may exist | check the CRM. If the deal is there, skip the step or set its output to the deal's id; if not, restart the run |
| `code_unknown_outcome` | A `code.run@1` record may have run, so its calls to your hosts may have gone out | check what the code calls, then skip the step or restart the run |
| `draft_changed` | The draft was saved while a test run (or a replay of one) ran, so the run no longer tests one definition | read the workflow again (`workflows(operation="get", client_id=..., workflow_id=12)`), then test the current draft. Do not edit the draft while a test runs |

Restart re-runs only the failed steps: `workflow_runs(operation="restart", client_id=..., run_id=5531)`. Skip: `workflow_runs(operation="skip-step", client_id=..., run_id=5531, node_id="push")`.

## Failed runs, in one pass

When the user asks why a workflow fails, or for a daily check:

1. `workflow_runs(operation="step-overview", client_id=..., workflow_id=12)`: which step fails, how often, and its last error.
2. `workflow_runs(operation="list", client_id=..., workflow_id=12, status="failed,needs_attention", is_test=False)`, then read one run per failing step with `get` for each step's `errorClass` and `errorMessage`.
3. Group the runs by `errorClass` and fix each group's cause before you recover anything:

| `errorClass` | Cause | Do |
|---|---|---|
| `setup` | a missing app, secret or permission; the run waits in Needs attention | the user fixes it in Settings, then `retry` the runs (`bulk` with `action="retry"` for many) |
| `budget` | a credit or spend limit; `atLimit` decided pause, ask or hold | raise the limit on the user's yes (`SKILL.md`, Publish), or wait for the limit to reset, then `retry` |
| `temporary` | a provider error Kenso retries with backoff by itself | wait; `retry` only to skip the backoff |
| `permanent` | bad input on the record, or a definition bug | a bad record: skip the step or set its output. A definition bug: fix the draft, test and publish (`SKILL.md`), then start new runs. `restart` and `replay` keep the run's version, so they repeat the bug |

4. Say what the recovery costs before you start it: `restart` charges again only the steps it re-runs and keeps the paid outputs, `replay` charges every step from `from_node_id` on (every step without it), `retry` charges the released step when it runs, and skip and set-output charge nothing. For a bulk action, give the run count and an upper bound from `workflows(operation="estimate-create", client_id=..., workflow_id=12, records=40)`, and wait for a yes.
5. Report per group: how many runs, the cause in plain words, what you did, and what still waits on the user.
