---
name: kenso-triage
description: Diagnose Kenso work that failed, stalled or came out wrong - a campaign not sending, an import with failed rows, a workflow run that stopped, replies not arriving - when nothing names the cause, or when the person asks what needs their attention.
---

# Triage

Use this when work in Kenso failed, stalled or came out wrong and nothing names the cause, or when the person asks what needs their attention. You find the failing work, trace each cause from evidence, route the fix to the skill that owns it, propose it and wait. You change nothing.

Every command below is a read. Run each one with `KENSO_READ_ONLY=1` in front of it, for the whole diagnosis: the Kenso CLI then refuses any command that is not a read before it sends a request, so a slip cannot change the workspace. A `read_only` refusal means you reached for a fix: stop, and put that fix in your proposal instead.

## 1. Check the setup and the workspace

```bash
KENSO_READ_ONLY=1 kenso doctor
KENSO_READ_ONLY=1 kenso whoami
```

`doctor` checks the CLI, the key and the API, and names the next command when a check fails. `whoami` names the workspace: say it to the person before you report on it.

## 2. Find the failing work

Read every source, newest first. A source that answers 404 on every call is a feature this workspace does not have: note it, go on, and never retry it.

| Where work fails | What failed looks like |
|---|---|
| Campaigns | `error`, or `paused` when nobody paused it |
| Imports run with the CLI | a run whose summary counts failed rows |
| Imports run in the app or the API | a `failed` import job |
| Workflow runs (the `workflows` feature) | `failed`, or `needs_attention`: waiting for a person |
| API calls (the API request log, where the workspace has it) | `4xx` and `5xx` answers, with their error codes |

```bash
KENSO_READ_ONLY=1 kenso campaigns list --status error,paused
KENSO_READ_ONLY=1 kenso runs list
KENSO_READ_ONLY=1 kenso jobs list --type contact_import --status failed
KENSO_READ_ONLY=1 kenso workflow-runs list --status failed,needs_attention
KENSO_READ_ONLY=1 kenso api-requests list --status 4xx,5xx --limit 50
```

To watch new API errors as they arrive, `KENSO_READ_ONLY=1 kenso logs tail --status 4xx,5xx` prints each one. It polls until it is stopped, so give it a time limit.

## 3. Trace each cause from evidence

Open each failure before you name a cause:

```bash
KENSO_READ_ONLY=1 kenso workflow-runs logs <runId>
KENSO_READ_ONLY=1 kenso workflow-runs logs <runId> --step <nodeId> --full
KENSO_READ_ONLY=1 kenso workflow-runs get --run-id <runId>
KENSO_READ_ONLY=1 kenso campaigns get --campaign-id <campaignId>
KENSO_READ_ONLY=1 kenso runs show <runId>
```

- A workflow run: `logs` prints one row per step with its status, credits and error. The first step that failed, or the filter that stopped the run, is the place to look; `--full` shows that step's input and output.
- A campaign: its status, its sending state and why it stopped.
- A CLI import: the run's summary and its results file, one row per input row with its error.
- An API error: the row's error code and request id.

Name a cause only when a record shows it, and quote that record: a step's error, a row's error code, a campaign's state. When the evidence does not settle it, say what you read and what would settle it. Many failures with one error are one cause: group them and count them.

## 4. Route the fix

| The cause is in | Skill |
|---|---|
| A campaign's sending, copy, leads, steps or schedule | `campaign-diagnosis` |
| Bounces, spam placement, blocklists, inbox or domain health, replies not arriving | `deliverability-guard` |
| A workflow's definition or steps, or runs to recover | `workflows` |

Load the skill (`kenso skill show campaign-diagnosis` with the CLI, `load_skill("campaign-diagnosis")` over the MCP, and the same for the other two) and read deeper with it. Keep `KENSO_READ_ONLY=1` on while you do.

## 5. Propose and wait

Report in one message:

1. What needs attention, grouped by cause, with counts and ids.
2. Each cause, and the record that shows it.
3. The fix for each: the command it would run, what it changes, and whether it charges credits or sends.

Then wait for the person's yes on each fix. Never resend, relaunch, retry, restart, replay or spend to reproduce a failure: a call that would change, charge or send is a fix, and it waits for the yes like any other. When nothing failed, say so, and list what you checked.

## Rules

- Reads only, with `KENSO_READ_ONLY=1`, until the person says yes to a fix.
- Name the workspace before you report.
- A cause comes from a record you read and quote, never from a guess.
- A source that answers 404 on every call is a feature the workspace lacks: note it and never retry it.

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
