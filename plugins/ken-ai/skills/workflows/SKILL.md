---
name: workflows
description: Build the workflow the user meant over MCP - ask for the gaps, check what the workspace can run, map every requirement to a step, fill it in step by step and test it to the last step - then publish it and watch and recover its runs; workflow files, CSV runs, results files.
---

# Workflows

A workflow is automation in Kenso (Workflows, https://app.ken.so/<workspace id>/workflows): one trigger (a signal, a new lead, a webhook, a schedule, or a run on records someone picks), a list of steps (find people, enrich, qualify with AI, branch, promote to Accounts, draft an email, post to Slack) and limits (credits per month and per run, runs per day). A `general` workflow runs on the workspace's accounts, people or leads. A `campaign` workflow belongs to one campaign and runs on its leads. A `system` workflow is Kenso's own and read-only: Kenso keeps one for each Knowledge skill (edit the skill instead), and the ones it seeds for its own jobs are a 404 for anyone but staff (`references/ops-console.md`).

**The hub's rules.** Before the real `kenso workflows run`, show the approval block of the hub skill `kenso` (section 5) with the dry run's numbers and wait for the person's yes, also when its `credits.needed` is 0; after it, end with the hub's final reply (section 9), all five lines. Read the hub in full: load the `kenso` skill, or run `kenso skill show kenso` and read the whole output.

You edit a draft, and nothing runs until you publish it. A published workflow is `live`: its trigger starts runs. `draft` means it was never published. `off` means it was unpublished, or the engine paused it at a limit (`pausedReason`).

The job is the workflow the user meant. A **requirement** is one thing the user's words ask of the workflow: what starts it, who it lets through, who it contacts, what it does. Every requirement ends as a step that enforces it with the user's own values, or is reported to the user as not built. A draft that runs but drops, swaps or rewrites a requirement is a failed build.

Open a reference with `load_skill(name="workflows", reference="references/examples.md")` (or `name="workflows/references/examples.md"`):

| Reference | Open it when |
|---|---|
| `references/plain-steps.md` | you write the workflow yourself (the default writer): the plain block, the shapes to use, pinning, judgment and secrets |
| `references/definition-format.md` | you write or fix a definition: keep it open the whole time |
| `references/examples.md` | you want a complete workflow to copy: three of them, one with a `code.run@1` step |
| `references/lead-source-workflows.md` | the user wants leads or accounts to come in by themselves (Sales Navigator, forms, website visitors, hiring signals, imports), or picks a template: every template, what it needs, and the template loop with a spend limit |
| `references/test-and-publish.md` | a validate issue code to fix, a test that needs pins, live steps or a wait, a test result you cannot read, a publish refusal |
| `references/runs.md` | the workflow is live: run-on-records results, reading a run, retry, restart, replay, a send step that waits, why a workflow fails |
| `references/power-features.md` | the workspace has `workflows_power` and the workflow needs a workspace variable, a computed value, a table, a connection to an outside tool, an approval by a person, a wait for an outside system, a call to another workflow, an engagement trigger, a report or a one-step test |
| `references/api-recipes.md` | a step calls Apollo, Instantly, Smartlead, Attio or Close: the connection to create and the `http.request@1` step to write |
| `references/files.md` | the person works with the Kenso CLI (`kenso`): a workflow kept as a file with `kenso.json`, check, push, test and publish from the file, a run on ids or a CSV with a credit cap, a results file |
| `references/ops-console.md` | the caller is Kenso staff and the question is fleet-wide: queues, provider breakers, stuck runs, spenders, kill switches, system and shadow workflows. Never for anyone else |

Every call takes `client_id`, the workspace id. Send it on every call when the user can see more than one workspace.

## Can it run here

Workflows are in beta: they open where Kenso turns them on for the workspace. Three flags decide what works:

| Flag | Without it |
|---|---|
| `workflows` | the workflow tools are not listed, or every workflows call answers 404 |
| `workflows_plain` | `workflows(operation="brief")` is not listed: read the catalog with `workflows(operation="step-types-list", client_id=...)` and write from `references/definition-format.md` |
| `workflows_runtime` | you can build, validate and estimate, but nothing runs: a test answers 404 and live runs stay `queued` |

- The tools are not listed, or every call answers 404: Workflows is not on for this workspace yet. Stop, tell the user in one sentence, and link https://app.ken.so/<workspace id>/workflows. Do not retry, and do not read that 404 as "this workflow does not exist".
- A 404 on one id while other calls work: another workspace's id or a deleted workflow.
- 403: the caller's role lacks Workflows view (reads) or edit (writes). Spend limits also need the billing permission, which an admin has.

## Build a workflow

List what exists first: `workflows(operation="list", client_id=..., q="funding")`. When a workflow already does what the user wants, change it (Change a workflow) instead of creating another. Then take steps 1 to 5 in order. A template (`workflows(operation="templates-list", client_id=...)`, `references/lead-source-workflows.md`) or a definition the user hands you still goes through steps 1 to 3: the requirements are the user's, not the template's.

### 1. Interview: ask only for the gaps

Hold what the user already said against the six decisions that make a workflow:

| Decision | Settled when you know |
|---|---|
| Start | the event, source or schedule that starts a run |
| Who qualifies | industry, company size and geography: each one a value the user gave, or said is not a filter |
| Who to contact | the titles or roles, and how many people per company |
| Action | what to do or send, and on which channel |
| Approval | a person approves every send (the default), or sends go out by themselves |
| Limits | runs per day and a credit cap |

- A decision the user stated is a requirement. Copy its values **verbatim**: "20 to 500 employees" is 20 and 500, "the US, UK and Ireland" is those three countries, "finance, ops, tech and AI leaders" is those four. A range, list or title the user gave is never rounded, widened or swapped for a default.
- A decision their words do not settle is a **gap**. Ask about gaps only: at most 3 questions in one message, each with 2 to 4 concrete options and one marked recommended. Order: Start, then who qualifies, then who to contact and the action. Read the brief (step 2) before you write the options, so every option is one this workspace can run.
- Approval and Limits take their defaults unless the user raised them (every send waits for approval; limits you propose with the estimate): name the default in the map instead of asking.
- No gaps: ask nothing and go on.

Done when every decision is stated, answered or on a default you named. A guess is not an answer.

### 2. Availability: check before you propose

A trigger or step exists for this user only when this workspace can run it.

1. `workflows(operation="brief", client_id=...)`: `triggers` and `stepTypes` are what this workspace can use, and `workspace` its campaigns, Slack connection and secret names. A type that is not listed is not available here.
2. An option can need more than its type does. Ask for the types you will use (`types=["trigger.linkedin_post_engagement@2"]`) and read each `description` and `requires`. That trigger reads the posts of the workspace's own LinkedIn seats, its company pages and pasted post URLs with `linkedin_signals`; finding posts by `topics` or `watchedProfileUrls` needs `linkedin_topic_signals` as well.
3. Publish-mode validate is the call that reads the workspace's flags, apps and secrets: `workflows(operation="validate", client_id=..., workflow_id=12, mode="publish", definition={...})`, with the trigger and steps you plan in `definition`. It saves nothing. `workflow_id` is any workflow of the workspace of the same kind (the one you are changing, or one from `list`). An issue with code `feature_disabled` or `app_not_connected` names what is off; ignore the other codes of an unfinished definition. In a workspace with no workflow yet, run it on the outline right after you save it (step 4), before you fill anything.

**Never substitute.** When what the user described is not available, say so in one sentence, then ask one question whose options are the closest available ways to get it plus asking Kenso to turn the feature on. Only Kenso turns a feature on: the user asks their Kenso contact or support, and you never claim it is on. Mark one option recommended and wait for the answer. A trigger other than the one the user described is the user's pick, never yours.

Done when every trigger and step in your plan is in this workspace's catalog and passed the publish-mode check, or the user picked what replaces it.

### 3. Requirement map: show what enforces what

Show the map before the first save or build, and again before publish: one row per requirement, in the user's words, with the step that enforces it in plain words.

| Requirement (their words) | Enforced by |
|---|---|
| "when someone comments on one of our LinkedIn posts" | When: a comment or reply on a post of your LinkedIn seats |
| "20 to 500 employees" | Step 2: continues only when the company's employee count is 20 to 500 (step 1 reads it) |
| "in the US, UK or Ireland" | Step 3: continues only when the company's country is one of those three (step 1 reads it) |
| "send them a LinkedIn message" | Step 5: a LinkedIn message to each person, waiting for your approval |
| "only companies that use Salesforce" | Not built: no step here reads which tools a company uses. Options: an AI qualify step that judges it from the website, or leave it out |

- Every requirement has a row. A requirement that filters (size, country, industry, title) names the step that checks that value and the step that produces the value it reads: a country requirement means a step that checks country, fed by a step that returns it.
- A requirement no step enforces is a Not built row with the reason and the options. Never drop it, and never fold it into a description or a title.
- Send the map and keep building in the same turn. Wait for an answer only where a row is Not built or rests on a default the user may not expect.
- After a build, an answer that carries `requirements` (each one's words, the step ids that enforce it, or not built with its reason) replaces your map: show it as it came. One that carries `questions` found more gaps: ask them as they came, with their options and the recommended one, and build again with the answers.

Done when every requirement has a row, and every Not built row is in front of the user.

### 4. Outline

The **outline** is the When line and the numbered steps in the user's words, one line each: the map's steps in order. It goes to the user first, so they see the whole shape in seconds. Then pick the writer, once:

- **You write it (the default).** Your own model writes the definition, so nothing costs Kenso AI credits and every save lands at once. Call `workflows(operation="create", client_id=..., definition={...})` with the `name` and `description` (the user's values in them verbatim too), the trigger and its settings, `limits`, the `plain` block holding the When line and every step's text, and the engine steps of step 1 only (a definition needs at least one step): the When line and step 1 carry `compiledTo`, the other plain steps none yet. `references/plain-steps.md` has the plain block and the shapes to use. A campaign workflow takes `kind="campaign"` and `campaign_id`. A definition that does not parse answers 400 `invalid_definition`, one `error.details` entry per problem.
- **Ken's builder writes it.** For a user who wants Kenso to write it, or a caller that cannot write definitions. The outline stays in your message, and the first build writes only the trigger and step 1: `workflow_builder(operation="build", client_id=..., goal="When <the start, in the user's words>. First step: <step 1, with the user's values>. Build only the trigger and this step.")`. `goal` is 10 to 4,000 characters, and the builder has 50 seconds. It returns `workflow` (a draft, never live), `issues`, `notes` and `timedOut`. For a campaign, add `kind="campaign", campaign_id=87`.

Done when the draft exists and you have its `id` and `draftVersion`. `draftVersion` is the draft's revision (its save counter), not the version `number` that `versions-list` shows: send it as `base_version` on the next save.

### 5. Fill, one step per save

A **fill** builds one step of the outline, with its settings and its title, in one save. Fill the steps in order and tell the user each one as it lands. One long build of everything is the slow path: the user waits a minute for a draft they cannot check until the end, and a big rewrite can run out of time.

- **You write it:** `workflows(operation="update", client_id=..., workflow_id=12, base_version=3, patch=[...])`, one RFC 6902 patch that adds the step's engine steps, links the step before it through `next`, and sets the plain step's `compiledTo` and `summary`.
- **Ken's builder:** `workflow_builder(operation="build", client_id=..., workflow_id=12, base_version=3, goal="Add one step after `size_gate`: <the step, with the user's values>. Keep every other step as it is.")`. The builder returns the whole workflow each time, so a build takes as long as a full one: what a fill buys there is a step the user sees and you can check, one at a time. Each build is a Kenso-paid model call (10 a minute and 200 a day for a workspace; past it, 429). `timedOut` true means it saved its best draft so far: fix its `issues` or build that step again. 400 with detail code `build_failed`: spell out the step in the goal, or write the definition yourself.

For every fill, whoever writes:

- The patch or goal names one step and carries the user's values verbatim.
- The step's `title` is written in the same save as its settings and says only what those settings do: a filter that checks 20 to 500 employees is titled "20 to 500 employees", never with a country it does not check.
- Read the step back, from the save's answer or `workflows(operation="get", client_id=..., workflow_id=12)`: its settings hold the user's values, its title and plain text match them, and every other step is unchanged.
- Tell the user the step that landed in one line, then fill the next.

A stale `base_version` answers 409 `version_conflict` with `currentVersion`: read the workflow again, reapply the change, send `currentVersion`. A template's `<fill in: ...>` placeholders and the `campaignId` an `account.add_to_campaign@1` step leaves at 0 are fills too: publish refuses them with `placeholder_not_filled`. A CRM field whose value is missing for a record is skipped, not cleared. An `ai.agent@1` step uses only the read-only tools its `with.tools` names (`references/definition-format.md`, Step types).

Done when every row of the map names a real step id or is Not built, and `workflows(operation="validate", client_id=..., workflow_id=12, mode="draft")` is `valid`.

## Change a workflow

Read it first: `workflows(operation="get", client_id=..., workflow_id=12)`. Its `draftVersion` is the `base_version` for the next save (null when there is no draft: send 0, and the first save copies the published version). The live version keeps running until the new draft is published.

- **Change what the request names, everywhere the workflow states it, and nothing else.** A value lives in more places than one step: search the definition for the old value before you save. The same save changes the step's settings and `title`, its plain step's `text` and `summary`, the workflow's `name` and `description`, and every other step that repeats the value (an AI qualify step whose audience text still says the old range). Every step that does not state it stays byte for byte as it was.
- **You write it:** one patch with every one of those places: `workflows(operation="update", client_id=..., workflow_id=12, base_version=3, patch=[{"op": "replace", "path": "/steps/1/with/when", "value": "<the condition, with the user's 20 and 500>"}, {"op": "replace", "path": "/steps/1/title", "value": "20 to 500 employees"}, {"op": "replace", "path": "/plain/steps/1/text", "value": "Keep companies with 20 to 500 employees"}, {"op": "replace", "path": "/steps/2/with/audienceDescription", "value": "<the audience, with 20 to 500>"}, {"op": "replace", "path": "/description", "value": "<the description, with 20 to 500>"}])`.
- **Ken's builder:** `focus` lists every step that states the value (`focus=["size_gate", "qualify"]`), and the goal says the change and names the description: the builder keeps every step outside `focus` exactly as it is, so a step left out keeps the old value. `save=False` previews it without saving.
- **A change to what starts the workflow is a change to `trigger`** (`focus=["trigger"]`) and to the When line (`/plain/when/text`), never a new filter step. It goes through Availability first, like any new trigger or step type, and a missing value is a gap to ask about.
- Read it back: `workflows(operation="get", ...)`, then search the definition for the old value once more. Tell the user what changed, from what to what, in which places, and that the other steps are as they were. Then validate, test and publish again.
- **Stop it:** `workflows(operation="unpublish", client_id=..., workflow_id=12)` retires its triggers and sets it `off`. To turn it back on, publish it again.
- **Versions:** `workflows(operation="versions-list", client_id=..., workflow_id=12)`, `workflows(operation="versions-get", client_id=..., workflow_id=12, number=4)`, `workflows(operation="versions-diff", client_id=..., workflow_id=12, number=4, against=3)` (steps added, removed and changed). `workflows(operation="versions-restore", client_id=..., workflow_id=12, number=3)` copies an old version into the draft; test and publish it to make it live. `workflow_runs(operation="activity", client_id=..., workflow_id=12)` lists the audit log.
- **Delete:** only when the user asks: `workflows(operation="delete", client_id=..., workflow_id=12)`.

## Validate

`workflows(operation="validate", client_id=..., workflow_id=12, mode="publish")`

`mode="draft"` checks shape, step types, inputs, graph, references and formulas; `mode="publish"` also checks limits, secrets, connected apps and flags. Each issue has `severity`, `path`, `code`, `message` and `fix`: apply `fix`, save, validate again. `references/test-and-publish.md` has the codes. A missing secret is one the user adds in Kenso under Settings > Integrations > Secrets and names to you: never ask for a value.

Done when `valid` is true in `mode="publish"` and you have read every warning.

## Estimate

`workflows(operation="estimate-create", client_id=..., workflow_id=12, records=500)`

`records` is how many records will run (1 to 100,000): the list size for a run on records, or the expected runs a month for a trigger. It charges nothing. Read `quote` first:

- `quote.credits`: the expected cost (`expectedMillicredits`), the range it usually lands in (`lowMillicredits` to `highMillicredits`) and the same three in US cents. Divide millicredits by 1,000 for credits.
- `quote.aiLimit`: the share of the AI limit the run uses (`expectedPercent`) and whether it fits (`fits`). Where the workspace pays AI work in credits its `applies` is false (or `aiLimit` is null): that work is then in `quote.credits`. AI work is a percent of the limit, never dollars.
- `quote.balance`: the credits left after (`afterMillicredits`) and whether there are enough (`sufficient`).
- `quote.basis.source`: `workspace` (this workspace's own history), `kenso` (typical Kenso usage), `pilot` (this workflow's own first runs) or `preset` (no history yet: call it a first estimate).
- `quote.per`: what the numbers are for, such as 500 records.
- `quote.savings`: ways to spend less (Spend less).

Say the cost as one line, credits first, each part filled from the quote: `About <credits> credits · $<dollars> · usually <low> to <high> · <percent>% of your AI limit`. Work the AI limit pays in full reads `About <percent>% of your AI limit · no credits`, and where `quote.aiLimit.applies` is not true that part is left out. Round to whole credits, dollars and percents, as the app does.

When `quote` is null or missing, the server does not quote workflows yet, or the AI limit pays for a step and could not be read or is 0: tell the user `expectedCredits` and `maxCredits` (every record reaching and paying at every step) instead. Either way the answer lists the cost per step. A step line with `chargedBy` `campaign` is a `campaign.sequence@1` step: the campaign charges its copy per lead written, outside the workflow's `limits`; estimate a campaign workflow by `workflow_id`, or that line stays out of the totals (`variable: true`) and you add it yourself. That line is an upper bound: a lead that already has copy, a campaign without personalization prompts, or a workspace on its own AI key is not charged for it.

Tell the user the cost, and the `limits` that cap it, before anything runs.

## Spend less

Build the cheap shape first. These eight hold for every workflow, whatever the amounts. The code after each is the `code` the server gives a saving of that kind:

1. **Qualify before you pay** (`cost_qualify_first`). An `ai.qualify@1` with a `logic.filter@1` on its result goes before the first paid step, so a find, an enrichment or research runs only on records that passed. A workflow that starts from a signal the person already gave (a reply, a booked meeting, a form fill) needs no such gate.
2. **A gate must stop the run** (`cost_gate_does_not_stop`). Only `logic.filter@1` ends a run. A step's `when` skips that one step, and the steps after it still run and still charge. To stop on a condition, use `logic.filter@1`, or a `logic.branch@1` arm with `"next": []`.
3. **No verify after find** (`cost_verify_after_find`). `data.find_email@1` returns an email it already verified. A verify step on that email pays for the same answer twice.
4. **No agent without tools** (`cost_agent_without_tools`). An `ai.agent@1` with no `tools` is a prompt that costs more: use `ai.prompt@1`.
5. **The cheap tier for simple work** (`cost_tier_for_simple_task`). An `ai.prompt@1` that classifies, extracts or picks from a list runs on the cheap tier. Keep balanced or smart for writing and judgment. `ai.qualify@1`, `ai.condition@1` and `ai.research@1` cost the same at every tier, so leave their tier alone.
6. **Find only the people later steps use** (`cost_find_people_limit`). Set `limit` on `data.find_people@1` (5 by default) to the number of people the next steps act on.
7. **No phones nobody calls** (`cost_phones_unused`). `account.map_committee@1` finds signers' phones unless `signerPhones` is false: set it to false unless a later step calls or texts.
8. **Do not pay twice for the same records** (`cost_rerun_overlap`). Before a run on records, leave out the records this workflow already processed. `restart` and `retry` do not charge a step that succeeded again.

Never make a step cheaper in a way that changes what the user asked for, and never recommend a pricier option to save somewhere else.

The server checks these too, for a workspace that has cost estimates on. The estimate's `quote.savings` lists what it finds, largest first, at most three: each has a `code`, a `title`, a `detail`, what it saves (`savesMillicredits`, or `savesAiLimitPercent` for AI-limit work) for `per` records, and `fixDefinition`, the definition with the fix applied. `workflows(operation="validate", ...)` returns the same savings as warnings whose `code` starts with `cost_`, with the saving in `message` and the same `fixDefinition`. The estimate of a run on records (`estimate_only=True`) adds `cost_rerun_overlap` when some of its records already ran. Show at most three, one line each (`Qualify before the first paid step: saves about <credits> credits per <per> records`), and say what a `detail` says the fix adds, such as more AI-limit use. Apply one only on the user's yes: save its `fixDefinition` as the draft with `workflows(operation="update", ...)`, validate, and estimate again. A saving the server did not return has no amount: state none of your own.

## Test to the end

`workflow_builder(operation="test", client_id=..., workflow_id=12, record_type="account", record_id=812)`

It runs the draft once on one record: AI and data steps run for real and are charged, every send is simulated. It needs `workflows_runtime` (404 without it: tell the user Kenso has to turn workflow runs on). Leave out the record to use the newest of the trigger's type (for a campaign workflow, the newest live lead of its campaign; with none, 400 `record_required` names the campaign: add a lead first); `workflow_builder(operation="test-records", client_id=..., workflow_id=12)` lists candidates with `type`, `id` and `label`.

A test proves the workflow only when the record reaches the last step:

1. Pick a record that should pass every filter in the map: for a 20 to 500 employee, US, UK or Ireland gate, a 93-person US company. Ask the user for one when you cannot tell.
2. Read the run: `workflow_runs(operation="get", client_id=..., run_id=5531)`. It reached the end when the last step's `status` is `succeeded` (a simulated send succeeds too).
3. A run that `succeeded` while a `logic.filter@1` step's `output` is `{"passed": false}` and the steps after it are `skipped` **stopped** at that filter. A stop is not a pass, whatever `testPassed` and `publishPassRecorded` say. Compare the filter's `input` with the value the record should have. A record that should pass and did not means the filter reads a wrong field or value (a misspelled output name renders empty): fix that step. A record that rightly fails: test another one.
4. A branch: reach every arm that ends in an action once. Steer with `pinned_outputs` on the deciding step only, then finish with one test without pins (`references/test-and-publish.md`).

`timedOut` true means the run is still going: poll `workflow_runs(operation="get", ...)` until it is `succeeded`, `failed` or `cancelled`, then call the test again with `run_id=5531` to record the pass. A pass is tied to the draft's `definitionHash`, so any edit means test again, and never edit the draft while a test runs.

Done when `publishPassRecorded` is true on the current draft and the run you read reached the last step.

## Publish

Before you publish, show the user three things: the requirement map with each row's real step, the estimate, and the workflow's spend limit. Read the limit with `billing(operation="workflow-spend-limits-get", client_id=..., workflow_id=12)`: a workflow with no limits of its own reads as the workspace defaults (`isDefault` true), and `display` gives each limit in credits and dollars. Quote those numbers only, never your own. When the user names a cap, set it: `billing(operation="workflow-spend-limits-update", client_id=..., workflow_id=12, changes={"monthly_limit_millicredits": 200000, "at_limit": "pause"})` (1 credit is 1,000 millicredits; a null limit means no limit). The definition's `limits` fill these in only for a workflow that has none, so a limit you set stays. Then, on the user's yes:

`workflows(operation="publish", client_id=..., workflow_id=12, note="Qualify funding signals")`

Publish refuses, first failure first: a draft that does not validate in publish mode (400 `invalid_definition`), a send step whose `approval` is not `"required"` in a workspace without `workflows_auto_send` (`approval_required`), and a draft with no passed test (409 `A test run must pass on this draft before publishing.`). 409 `Workflow has no draft to publish.` means it is live with no draft: save one first. `references/test-and-publish.md` has the whole gate and every refusal.

Done when the workflow is `live`: its trigger is registered and new runs use the published version.

## Run on records, then watch the runs

The workflow must be live (409 `Workflow is not live.` otherwise). Estimate first, then send the same call without `estimate_only` on the user's yes:

`workflow_runs(operation="run-on-records", client_id=..., workflow_id=12, records=[{"type": "account", "id": 812}, {"type": "account", "id": 813}], estimate_only=True)`

Up to 1,000 records per call; `type` is `account`, `person` or `lead` and must match the trigger's record type (400 `record_type_mismatch`).

`references/runs.md` has the rest: each result status, `workflow_runs(operation="list", ...)` and `get`, what every run status means and what to do (`retry`, `restart`, `replay`, `cancel`, `skip-step`, `set-step-output`, `bulk`), how a send step waits for approval in Today, the outcome codes, and the pass over failed runs (`workflow_runs(operation="step-overview", client_id=..., workflow_id=12)` first).

## Rules

- Never build on a guess: a gap is a question, and an unavailable trigger or step is a question with options.
- The user's numbers, ranges, countries, titles and names go into settings, the workflow's name and its description verbatim, and a title says only what its settings do.
- One step per save. A change touches the step it names and every title, text and description that states the value it changes, and nothing else.
- A test that stops at a filter is not a pass.
- Show the cost before every publish and every run on records, and set or confirm a spend limit before you publish. Say it from the estimate's `quote`; state only credits, dollars and AI-limit percent the tools return.
- Keep every send step (`send.email@1`, `send.linkedin@1`, `send.whatsapp@1`, `send.imessage@1`, `send.facebook@1`, `send.instagram@1`), and every `browser.run@1` step with `canSubmit: true`, at `approval: "required"`. Set `"auto"` on `send.linkedin@1`, `send.whatsapp@1` or `send.imessage@1` only when the user asks for automatic sends and the workspace has the `workflows_auto_send` flag; `send.email@1`, `send.facebook@1` and `send.instagram@1` always wait for a person, and so does an iMessage text that would answer the person in a conversation or go to a person who said no on any channel.
- `logic.wait_for_event@1` on `reply.received` also resolves on a 1:1 email, LinkedIn, WhatsApp or iMessage reply from the person in a person run, with `channel` in the event (`"match": {"channel": "whatsapp"}` waits for one channel). An iMessage reply carries `classification`: `unclassified` for a photo, voice memo or file with no words (or a text Kenso could not class), so a wait that matches a class (`"match": {"classification": "interested"}`) does not resolve on one.
- One workflow per goal: list first, and change the one that fits instead of creating a duplicate.
- A campaign workflow on a client's campaign decides who that campaign sends to. Publishing, unpublishing or bulk-cancelling one needs a yes that names that client, with its source (who said it, where and when).
- Never retry a call that answered 404 on every id (Can it run here).
- Never ask for a secret's value or write one into a definition: reference it by name and let the user set it in the app.

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
