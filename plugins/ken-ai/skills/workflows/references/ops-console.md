# Workflow ops console (staff only)

Part of the `workflows` skill, for Ken staff only. Open it only when the caller is staff: the `admin_workflows` facade is listed for staff and nobody else. A customer who asks about stuck or failed runs gets `SKILL.md` step 7 on their own workspace, never this page.

The console is fleet-wide. Every `admin_workflows` operation needs super_admin, sends no workspace header and takes no `client_id`: a target workspace travels as `workspace_id`. Writes are recorded as agent writes with an audit row, so give every write a `reason`.

## Read

| Question | Call | Read |
|---|---|---|
| Is work piling up? | `admin_workflows(operation="queues")` | per pool, lane and provider: `due`, `deferred`, `inFlight`, `expiredLease`, `oldestDueAt`, `oldestDueAgeSeconds`. The oldest due item counts only unleased items, so it reads null when every worker in a pool died mid-lease: read `expiredLease` too |
| Is a provider failing? | `admin_workflows(operation="providers")` | each breaker's state, whether it is forced, 5-minute ok and fail counts, success rate, latency, and the token bucket. `unavailable` true means Redis could not be read: the numbers are defaults, so treat them as unknown, never healthy |
| Which runs are stuck? | `admin_workflows(operation="runs-stuck", limit=50)` | oldest first, every class and workspace, with the stuck class and its age |
| Who spends the most? | `admin_workflows(operation="spenders", period="month", limit=10)` | workspaces ranked by workflow credits, `today` or `month` |
| Which workflows run where? | `admin_workflows(operation="workflows", kind="system", workspace_id=24)` | run counts and auto-pause state, across workspaces or for one |
| Did a scheduled job stop? | `admin_workflows(operation="jobs", host="Ken.Sequencer")`, then `admin_workflows(operation="job-runs", host="Ken.Sequencer", job_name="KenSequencerLaunchJob", status="failed")` | the newest run and the failures in the last 24 hours per job, then one job's runs with errors. `errorMessage` is raw exception text and can carry tenant data: keep it in staff channels. The log does not say whether a job is enabled or when it fires next |
| Does a workspace have an override? | `admin_workflows(operation="limits-get", workspace_id=24)` | 404 `not_found` means no override (the global limits apply); 503 means Redis is down, never "no override" |
| What is blocked? | `admin_workflows(operation="workflow_kill_switches", action="list")` | every switch that is on, oldest first, with who set it and why |
| Code step minutes | `admin_ai(operation="workflow_code_minutes", action="get", workspace_id=24)` | a workspace's `code.run@1` sandbox seconds this UTC month against its limit |

## Act

Every write here changes live work for one or more workspaces. Say what you will change and why, and wait for a staff person's yes. When the target is one client's workspace (its runs, its admission limits, a workspace kill switch), the yes must name that client, with its source.

| Do | Call | Notes |
|---|---|---|
| Release a stuck run | `admin_workflows(operation="runs-retry", run_id=7, workspace_id=24)` | waiting steps become due now and a needs-attention run goes back to running. A finished run, or one with nothing to release, is 409 `invalid_state`; a run in another workspace is 404 |
| Stop a stuck run | `admin_workflows(operation="runs-cancel", run_id=7, workspace_id=24)` | queued and waiting steps do not run. A finished run is 409 `invalid_state` |
| Force a provider breaker | `admin_workflows(operation="breaker-set", provider_key="leadmagic", state="open", reason="429s since 09:00")` | `open` reschedules every step on that provider and `closed` lets them all through, both for 24 hours by default; `auto` lifts the force. Use a key `providers` lists: another key answers 409 `unknown_provider` unless `force=True`, which you set only after checking it is not a typo |
| Raise a workspace's admission limits | `admin_workflows(operation="limits-set", workspace_id=24, soft_runs_per_minute=6000, ttl_hours=6, reason="launch")` | `soft_runs_per_minute` and `hard_event_runs_per_hour`: omit one to keep the global value, 0 turns it off for that workspace. `ttl_hours` 1 to 168 (24 by default). Setting it again replaces the override; undo with `admin_workflows(operation="limits-clear", workspace_id=24)` |
| Block a step type, provider or workspace | `admin_workflows(operation="workflow_kill_switches", action="set", scope="provider", key="leadmagic", reason="Provider outage")` | blocked steps are rescheduled, not failed, and go on once you clear the switch with `action="clear"` and the same `scope` and `key`. Workers see a change within 5 seconds. A `step_type` key is `ai.qualify@1`, or `ai.qualify` for every version; a `workspace` key is the numeric workspace id |
| Cap code step minutes | `admin_ai(operation="workflow_code_minutes", action="set_limit", workspace_id=24, limit_seconds=3600)` | `action="clear_limit"` returns the workspace to the fleet default |

Read after every write: `providers` after a breaker, `limits-get` after a limit, `workflow_kill_switches` with `action="list"` after a switch, and the run after a retry or cancel.

## Playbooks

- **A queue grows.** `queues`, then `providers`: one provider failing or rate-limited explains most backlogs. Force its breaker open with a reason, tell the team, and set it back to `auto` once its success rate recovers. High `expiredLease` with no due items moving means the workers of that pool are down: that is a host problem, so check the host, not the runs.
- **Runs are stuck.** `runs-stuck`, grouped by class and workspace. Retry the ones a fixed cause was holding; cancel only those the workspace owner agreed to stop.
- **A workspace spends far more than usual.** `spenders` with `period="today"`, then `workflows` with that `workspace_id` to see which workflow. The workflow's own spend limit is the customer's setting (`SKILL.md` step 5) and changes only on the customer's yes. The staff brakes are a workspace kill switch or a lower admission override, both on a yes that names that client.
- **A step type misbehaves after a release.** A `step_type` kill switch on that type holds its steps everywhere without failing them. Clear it once the fix ships.

## System workflows and shadow runs

The seeded keys are `system.email_pipeline` and, as phase 2 moves the AI flows, LinkedIn actions and send planning, `system.ai_qualification`, `system.ai_personalization`, `system.ai_segmentation`, `system.linkedin_actions` and `system.send_plan`. All of them are staff-only. `workflows(operation="list", client_id=..., kind="system")` lists them for staff.

The three AI flow workflows run `system.ai_flow@1` (asks the model what the old job would ask; in a live run it spools the request into the job's AI batch and waits for it, and the batch poller writes the answer) then `system.ai_save@1` (writes any other answer). Both are system-only step types: a workspace workflow that names either fails validation.

`system.linkedin_actions` starts one run per due LinkedIn state of a lead and runs `system.linkedin_action@1` on it. A shadow run only decides (the action, the seat, or why not) and writes nothing. Staff compare its decisions with the LinkedIn scheduler's actions in `admin_misc(operation="admin-workflow-shadow-reports-list", system_key="system.linkedin_actions")`.

Shadow runs are staff-only engine runs that write nothing. Lists hide them unless `is_shadow=true` is passed, and to anyone but Ken staff a shadow run is not found by id either. A shadow run calls the live providers on Ken's keys, reserves and charges no credits, saves no field, skips every step that would send or change data, writes no activity and notifies nobody. It does not count toward the event run cap, auto-pause, bulk actions or the step overview.

## Rules

- Staff only. Never show this page's numbers, workspace lists or provider keys to a customer.
- Provider names (`leadmagic` and the rest) are vendor names: they never reach a client. To a client, say "a data provider".
- Every write carries a `reason`, which lands on its audit row.
- Use the narrowest switch that stops the harm: one step type or provider before a whole workspace.
