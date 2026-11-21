---
name: kenso
description: "Use for any outbound work in Kenso: leads, lists, campaigns, sequences, replies, accounts, signals, workflows, Studio, sending setup, reporting. Routes to the Kenso skill for the job and sets the rules for workspace, spend, sends and the final reply."
---

# Kenso: start here

This skill comes first for any work in Kenso. It sends you to the skill for the job and sets the rules every other Kenso skill follows: the workspace, spend, sends and the final reply. When another skill says "the spend rules", it means section 5 below.

## 1. First

```bash
kenso doctor
kenso whoami
kenso workspace list
kenso credits balance
```

- `kenso doctor` checks the CLI, the key, the skills and the MCP. When a check fails, run its `next` before anything else.
- `kenso whoami` shows the workspace this folder and key use (`activeWorkspace`, with its `id` and `name`) and where it comes from (`workspaceSource`); `kenso workspace list` lists every workspace the key reaches. Before any change, tell the person: "I will work in <name> (<id>)."
- `kenso credits balance` shows the credits `available`. Read it before you plan anything that charges.

## 2. The loop

```bash
kenso discover "find work emails for a list of people"
kenso describe email-finds create
```

1. `kenso discover` with the request in plain words finds the command, doc, skill or workflow step for it, offline. Each hit has its `effect` (read, write, spend, send or destructive), its cost line and the `describe` command to run next.
2. `kenso describe <resource> <action>` prints the command's flags, body, `effect` and `cost` as JSON.
3. Run it with `--dry-run` and read the plan: what it would send and, for paid work, `credits` with `needed`, `available` and `sufficient`.
4. Run it for real only as the rules below allow, with the plan's `next`.

While you only look around, set `KENSO_READ_ONLY=1`: any command that is not a read is then refused before it sends anything, and a `--dry-run` still prints its plan.

## 3. Which skill

Load a skill with `kenso skill show` and its name, for example `kenso skill show workflows`, or with `load_skill` through the Kenso MCP. `kenso skill list` shows the ones this workspace can use.

| Need | Skill |
|---|---|
| Count my market, size it and build the list | `tam-builder` |
| People-search filters for a campaign | `ken-search` |
| Build a campaign from an ICP and an offer, to launch-ready | `create-campaign` |
| Why a campaign is up or down; my best and worst campaign | `campaign-diagnosis` |
| Fix the email that is not working in a live campaign | `campaign-improvement` |
| Go through replies, draft answers, offer meeting times | `reply-handling` |
| What needs my attention: what failed, stalled or came out wrong, and what to fix first | `kenso-triage` |
| My Today queue: the touches due today, to draft, snooze or skip | `today-review` |
| Bounces up or sends dropped | `deliverability-guard` |
| Sending setup: inboxes, domains, LinkedIn accounts, the link host | `delivery-setup` |
| Connect my own sending domains | `connect-domains` |
| Review or order sending domains | `domain-selection` |
| Inbox limits, display names, signatures, reply forwarding | `inbox-configuration` |
| How many domains and inboxes I need | `infra-planning` |
| Set up a new workspace | `setup-workspace` |
| Sign up from the agent, with no workspace yet | `onboarding-signup` |
| Company, offer and voice files in Knowledge | `knowledge-setup` |
| Edit the skills in Knowledge > Skills | `skill-editor` |
| Target accounts: add, research, map who buys, plan touches | `accounts` |
| A one-page brief on an account before a call | `account-brief` |
| Hiring, funding, job changes, website visits or replies that start outreach | `signals` |
| Outreach around a conference or trade show | `event-outbound` |
| A job opening turned into a candidate campaign | `role-intake` |
| Someone's social profiles and recent posts | `social-data` |
| Build, test and run a workflow, as a file or in the app | `workflows` |
| Build or edit a Studio template | `studio-template` |
| Fill a Studio page for an account or a candidate | `studio-asset` |
| Prep for a call, then follow it up | `meeting-prep-and-followup` |
| A MEDDIC summary of a call | `meddic-summary` |
| The objections raised on a call | `objection-log` |
| The next-steps email after a call | `next-step-email` |
| The handoff to the AE after a call | `handoff-to-ae` |
| Open deals by stage, and the stuck ones | `pipeline-review` |
| The weekly or monthly results report | `report` |
| The person asks for the start interview | `kenso-start` |

**CLI or MCP.** Use the CLI for work from a file, or on more than about 50 records: imports, updates, exports and workflow runs. The kenso-cli skill has those commands; `kenso agent setup` installs it beside this one. For one record or a question, the MCP is fine.

**What to offer.** Look first:

```bash
kenso campaigns list --limit 5
```

A workspace with campaigns: offer "Diagnose my best and worst campaign" (`campaign-diagnosis`) and "Triage today's replies" (`reply-handling`). A new workspace: offer the starter menu.

1. Count my market: how many companies and people match my ICP?
2. Check my sending setup and tell me what to fix before I launch.
3. Draft a campaign for my company from my website and show it to me before anything is sent.
4. Tell me what you want to get done.

They lead to `tam-builder`, `delivery-setup` and `create-campaign`; for the fourth, find the skill in the table or run `kenso discover` with the person's words.

## 4. Workspace

Name the workspace before the first change, and again whenever it changes. A yes that does not name the workspace is not a yes: ask again, with its name. Under a coding agent, every command that is not a read prints `workspace: <id> (<source>)` on stderr: stop when it is not the workspace the person approved. A `kenso.json` in a folder holds that folder's workspace.

## 5. Spend

These rules hold in every Kenso skill.

- A bounded request ("find emails for these 200 people") covers that scope and nothing wider. An open one ("find me leads") needs a row count and a budget from the person first.
- Sample first. When a paid step covers more than 25 records, or the estimate's `credits.needed` is over 10, run 3 to 5 records first, show the result and the projected cost of the rest, and ask before the rest. These four numbers are thresholds of this contract, not prices.
- Prices come from a `--dry-run`, `kenso credits quote` or `kenso credits rate-card`, never from memory or from a skill.
- `Effect: write.` in a command's help is not proof that it is free: not every route that charges is marked. The dry run or `kenso credits quote` is the authority.
- Ask once, with one approval block, and wait for the yes:

```text
Plan: <what will run>
Records: <how many, and from where>
Estimate: <needed> of <available> available credits (from the dry run)
Cap: --max-credits <the cap you will set>
Reply yes to run it.
```

- On `kenso workflows run`, always set `--max-credits` to the cap in the approval block.
- Out of credits (`sufficient: false` in the plan, or a run that stops because the credits ran out): stop, show what finished, and give the billing link, https://app.ken.so/<workspace id>/settings/billing. Never retry in a loop.

```bash
kenso credits quote --kind leads --count 200
kenso credits rate-card --action email_found
```

## 6. Sends

Sends, launches, CRM writes and schedule changes need a yes that names the campaign or the record set ("launch campaign 812", "update these 40 deals in the CRM"). A yes to a plan is not a yes to send. A delete, archive or remove runs with `--yes` only after the person said yes to that delete.

## 7. Workflows, signals and tools

- A **workflow** is a saved set of steps that runs on each record (an account, a person, a lead), started by hand, on a schedule or by a signal. The `workflows` skill builds one; its file loop is `kenso skill show workflows --reference files.md`.
- A **signal** is an event that starts a workflow: hiring, funding, a job change, a website visit, a reply. `kenso signals types` lists them; the `signals` skill watches for them.
- A **tool** is one command you run yourself (`kenso discover` finds it) or one MCP operation.

The first run of a workflow template is five commands: `init --template`, `push`, `test`, `push --publish --expected-hash` with the hash `test` printed, and `run`. Check the file after every edit, and dry-run the run before the paid one:

```bash
kenso workflow-templates list
kenso workflows init qualify --template <templateKey>
kenso workflows push qualify.workflow.json
kenso workflows check qualify.workflow.json --mode publish
kenso workflows test qualify.workflow.json --record account:<accountId>
kenso workflows push qualify.workflow.json --publish --expected-hash <definitionHash>
kenso workflows run qualify.workflow.json --ids ids.txt --max-credits <cap> --dry-run
kenso workflows run qualify.workflow.json --ids ids.txt --max-credits <cap> --wait --out results.csv --yes
```

## 8. Your own agent plan: kenso work

Where your workspace has it, `kenso work` runs Kenso AI steps on your own Claude or Codex plan at 0 Kenso AI credits. Check with `kenso work status`: it lists what waits for your agent, and answers `not_found` when the workspace does not have it yet. When most of an estimate is AI steps, name this to the person as an option before they approve.

```bash
kenso work status
```

## 9. The final reply

End every job with this reply, in this order:

```text
Outcome: <what ran, on how many records, what it produced>
Misses: <count and reason for each kind of miss, or none>
Links: <the app page> and <the results file>
Credits spent: <from the run summary's creditsCharged, or kenso credits usage --run <runId>>
Next: <the one next step you recommend>
```

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
