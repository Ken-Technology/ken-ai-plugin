# Workflow files: the CLI loop

With the Kenso CLI (`kenso`) a workflow is a file in the person's folder: one JSON object in the `kenWorkflow: "1"` format (`definition-format.md`), named `<name>.workflow.json`. You edit the file, check it, push it to the draft, test the draft, publish the version you tested, and run it on records with a credit cap. Use the files when the person works in a folder or a repo, when the records come as ids or a CSV, or when a run covers more than about 50 records. Over the MCP alone, build with the calls in `SKILL.md`.

The commands are beta: they show where the workspace has the `workflows` feature, and `kenso workflows test` and `kenso workflows run` also need `workflows_runtime`. Without it `kenso workflows test` stops with `runtime_off` (exit 4), and a run `kenso workflows run` starts stays `queued` (`--wait` reports it at its timeout): tell the person their workspace cannot run workflows yet, and do not retry.

## The folder file: kenso.json

A file is **bound** when `kenso.json` maps it to a workflow id. `init`, `pull` and `push` write it.

```json
{
  "workspaceId": "3047",
  "profile": "client-a",
  "workflows": { "workflows/qualify.workflow.json": 412 }
}
```

- `workspaceId` is the workspace every command in this folder uses, unless `--workspace` or `KENSO_WORKSPACE_ID` names another; a file command run in another workspace stops with `workspace_mismatch` (exit 2). Name the workspace to the person before any change: `kenso whoami` prints it, with `workspaceSource` `folder` when it comes from this file.
- `workflows` maps each file's path, relative to `kenso.json`, to its workflow id. One file holds one workflow, and one workflow is bound to one file (`already_bound`, exit 7).
- It never holds a key or an API URL: a file with one is `folder_file_invalid` (exit 2), and nothing reads it.

## The first run

Five steps take a template to records (`kenso workflow-templates list` names the templates):

```bash
kenso workflows init qualify --template <templateKey>
kenso workflows push qualify.workflow.json
kenso workflows test qualify.workflow.json --record account:<accountId>
kenso workflows push qualify.workflow.json --publish --expected-hash <definitionHash>
kenso workflows run qualify.workflow.json --ids ids.txt --dry-run
kenso workflows run qualify.workflow.json --ids ids.txt --max-credits <n> --yes
```

1. `init` writes `qualify.workflow.json` (the template's definition; without `--template`, a blank one with `trigger.manual@1` and no steps) and, when no `kenso.json` is found from this folder up, one holding the workspace. Fill the template's `<fill in: ...>` placeholders and set `limits` in the file.
2. `push` creates the workflow from the file and binds it. It prints `workflowId`, `draftVersion` and `draftHash`; nothing runs yet. Then `kenso workflows check <file> --mode publish` lists what publish would refuse, each issue with its `fix`: apply each fix to the file and push again.
3. `test` runs the saved draft once on one record: AI and data steps run for real and are charged, every send and CRM write is simulated. It prints `testPassed` and `definitionHash`. Read the run to its last step (`SKILL.md`, Test to the end): a run that stopped at a filter is not a pass.
4. `push --publish --expected-hash <definitionHash>` publishes exactly the version you tested. An agent always passes `--expected-hash`: the CLI refuses an agent's publish without it.
5. `run --dry-run` prints the estimate for those records. Show it to the person with the cap you will set, and run with `--yes` only after their yes to that plan.

## Change a workflow

```bash
kenso workflows pull 412 --out qualify.workflow.json
kenso workflows check qualify.workflow.json --mode publish
kenso workflows push qualify.workflow.json
kenso workflows diff qualify.workflow.json --against draft
```

| Command | What it does |
|---|---|
| `kenso workflows pull <workflowId> [--out <file>] [--published]` | Writes the draft's definition (else the published one; `--published` takes the published one) and binds the file. Prints `{file, workflowId, draftVersion, draftHash, publishedHash, status}`. When the workflow is bound to another file already, the new file is an unbound copy |
| `kenso workflows check <file> [--mode draft\|publish]` | Validates the file and estimates one record, saving nothing. Prints `{valid, issues, perRecord, draftHash, inSync, next}`; each issue has `path`, `code`, `message`, `fix` and `severity`. Exit 5 when the file is not valid. An unbound file is `workflow_not_bound` (exit 2): push it first |
| `kenso workflows push <file> [--publish] [--expected-hash <hash>] [--note <text>]` | Creates the workflow (unbound file) or saves the file to the draft when it differs; an identical file saves nothing. Prints `{workflowId, saved, draftVersion, draftHash, published, status, next}`. `--dry-run` prints `wouldSend`: which of create, update and publish it would send |
| `kenso workflows test <file> [--record <type:id>] [--wait <seconds>]` | Runs the draft once on one record (`person:812`; without it, the newest record of the trigger's type). `--wait` is 0 to 50 seconds. A file that differs from the draft is `draft_out_of_sync` (exit 7). Prints `{testPassed, timedOut, definitionHash, publishPassRecorded, run, hint, next}`; exit 1 when it did not pass |
| `kenso workflows diff <file> [--against published\|draft]` | Compares the file with the published version (the draft when nothing is published). Prints `{against, same, nameChanged, triggerChanged, limitsChanged, stepsAdded, stepsRemoved, stepsChanged}` |
| `kenso workflows schema [--out <file>]` | A JSON Schema of the file for editors, offline. The server's validate stays the authority |

The CLI compares a file with a saved definition as JSON with keys sorted, so whitespace and key order never count. `inSync` false means the file differs from the saved draft: push it before you test.

**The hash rule.** A passed test is tied to the draft's `definitionHash`, and publish needs a passed test on that hash (`test_required`, exit 7). `--expected-hash` makes the CLI compare the draft's hash after the save and before the publish: a mismatch is `hash_mismatch` (exit 7) and publishes nothing. Any edit after the test means test again. A save that meets someone else's newer draft is `version_conflict` (exit 7): run `kenso workflows diff <file> --against draft`, then pull or push again. A definition the server refuses is `invalid_definition` (exit 5): run `kenso workflows check <file> --mode publish` for each issue's `fix`.

## Run it on records

```bash
kenso accounts list --limit 50 -o ids > ids.txt
kenso workflows run qualify.workflow.json --ids ids.txt --dry-run
kenso workflows run qualify.workflow.json --ids ids.txt --max-credits <n> --wait --out results.csv --yes
kenso workflows run 412 --file people.csv --record-type person --dry-run
```

- The target is a bound file, which must equal the published version (else `unpublished_changes`, exit 7: publish the tested version first), or a workflow id. A workflow that is not live is `invalid_state` (exit 7), with `next` naming `kenso workflows publish --workflow-id <id>`. Nothing publishes by itself.
- `--ids` takes one id per line (`-` reads stdin). `--file` takes a CSV: with an `id` column, those ids; without one, for a workflow on `person`, each row is matched or created as a person (the columns `kenso people import` takes, no email finding). Any other record type needs ids (`ids_required`, exit 2): `kenso contacts import` or `kenso accounts import` make them. Duplicated ids run once.
- The record type is the trigger's; `--record-type` (`account`, `person`, `lead` or `place`) overrides it.
- `--dry-run` starts nothing and prints `{dryRun, workflowId, records, recordType, credits: {needed, available, sufficient}, perRecord, expectedCredits, cap, next}`. A CSV dry run creates no person.
- `--max-credits <n>` caps the run in the CLI. The ceiling per record is the definition's `limits.creditsPerRun` when set (`cap.kind` `hard`), else the estimate's maximum per record (`cap.kind` `estimate`). The CLI starts the first records that fit and reports the rest as `not_started`; a cap below one record starts nothing (`cap_too_low`, exit 6), and `next` names the smallest cap that starts one.
- Under an agent, a run without `--yes` prints the plan and stops, with `next` naming the same command with `--yes`. Add `--yes` only after the person said yes to that plan.
- Sample on the full ids file, never on a separate file of a few ids: the full run would start those records again. Set `--max-credits` to cover 3 to 5 records (3 to 5 times the plan's `perRecord.maxCredits`; the plan's `cap.willStart` says how many start), with `--wait --out sample.csv`; the rest are `not_started`. After the person's yes to the rest, run the same command again with only `--max-credits` (and `--out`) changed: it stops with `already_started` (exit 7), writes the ids the sample did not start to `not-started.txt` in the sample's run folder, and its `next` runs only those. `run_in_progress` (exit 7) means another kenso process is running that input now: wait for it, then run again.
- `--wait` waits for every started run to finish (`--timeout`, default 30m). `--out <results.csv>` (needs `--wait`) writes one row per input record: `row, id, status, runId, runStatus, creditsCharged, missReason, error`, then one column per step id with that step's output. Write it whenever the results matter later: a succeeded run's step outputs are dropped 7 days after it finishes unless the workflow keeps success details.
- The summary holds `records`, `started`, `deduplicated`, `notStarted`, `succeeded`, `failed`, `waiting`, `missed`, `creditsCharged`, `cap`, `resultsCsv`, `appUrl` and `next`. Exit 0 when all started (and, with `--wait`, none failed); 5 when some failed, were not found or were not started; 6 when the cap or the balance started nothing; 7 on the conflicts above.
- The run folder records every chunk's answer, so `kenso runs resume <runId>` never sends a chunk twice. A chunk sent with no recorded answer stops the resume with `chunk_outcome_unknown` (exit 5): see what started with `kenso workflow-runs list --workflow-id <id> --created-after <time>` before anything else.

## Read the results

```bash
kenso workflow-runs logs <runId>
kenso workflow-runs logs <runId> --step qualify --full
```

One row per step run: `{nodeId, stepType, status, attempt, startedAt, endedAt, ms, credits, error}`, with a header line on stderr (the run's status, its record and what it charged). `--full` adds each step's `input`, `output` and `attempts`. A failed run ends with `next: kenso workflow-runs restart --run-id <id> --dry-run`: `restart` re-runs a failed run's failed steps, and `retry` refuses a run that has ended. After `run --wait`, the summary's `next` names the logs of the first run that failed.

## The generated commands for the rest

Publish, versions and server runs are generated commands, one per API route; `kenso <command> --help` shows their flags.

| Need | Command |
|---|---|
| Publish or stop a workflow | `kenso workflows publish --workflow-id <id>`, `kenso workflows unpublish --workflow-id <id>` |
| Versions | `kenso workflow-versions list --workflow-id <id>`, `kenso workflow-versions diff --workflow-id <id> --number 4 --against 3`, `kenso workflow-versions restore --workflow-id <id> --number 3` |
| Server runs | `kenso workflow-runs list --workflow-id <id> --status failed`, `kenso workflow-runs get --run-id <id>`, `kenso workflow-runs cancel --run-id <id>`, `kenso workflow-runs restart --run-id <id>`, `kenso workflow-runs retry --run-id <id>`, `kenso workflow-runs replay --run-id <id>` |

`runs.md` says when to retry, restart or replay. Run each of those with `--dry-run` first and again only on the person's yes: a retried run can charge credits and send.

## Test records are the regression fixtures

```bash
kenso workflow-builder test-records --workflow-id <id>
```

It lists candidate records with `type`, `id` and `label`. Keep a few ids that should pass every filter, and one that reaches each arm of a branch, in a file beside the workflow. After every edit, push and test each of them again before you publish:

```bash
kenso workflows test qualify.workflow.json --record account:<accountId>
```

Each test charges its AI and data steps, so keep the set small. A pass counts only for the draft it ran on: after an edit, test again.

## When code.run@1 is the right step

`code.run@1` runs your own JavaScript or Python on each record. Use it only for logic no step type or formula covers: reshaping fields, a rule with many branches, a call to the person's own API (`allowedHosts`, and `secrets` by name). Use the step types for finding emails, enriching, qualifying with AI, CRM writes and sends: they carry the approvals, retries and credit accounting that code does not. It needs the `workflows_code` feature; without it, `kenso workflows check <file> --mode publish` reports `feature_disabled`. `definition-format.md` (Code steps) has every rule, and `examples.md` a complete workflow with one.

## Credits

Never state a price from memory. `kenso workflows check` prints `perRecord` for one record, and `kenso workflows run --dry-run` prints `credits {needed, available, sufficient}` for the whole set: quote those, with the workflow's `limits` and the `--max-credits` cap you will set, and wait for the person's yes before `--yes`.
