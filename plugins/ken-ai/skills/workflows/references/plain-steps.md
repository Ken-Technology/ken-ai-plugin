# Writing a workflow in plain steps

A workflow can carry the words a person wrote: a When line and numbered steps, each mapped to the engine steps it became. You write those words with the user, turn each step into engine steps yourself, and send the definition. Your own model does the writing, so nothing here costs Kenso AI credits; Kenso only runs the workflow.

`workflows(operation="brief", client_id=...)` returns this guide with everything else you need: the step and trigger types this workspace can use (`stepTypes`, `triggers`), the plain block's JSON Schema (`plainSchema`), worked examples that validate (`examples`), and what the workspace has (`workspace`: Slack, campaigns and their segments, secret names). Pass `types=["ai.qualify@1", "logic.filter@1"]` for the full schema of each type you will use, and `workflow_id=12` to change an existing workflow (its definition comes back as `current`, its draft revision as `currentDraftVersion`). Add `"format"` to `include` for the full definition format, or open `references/definition-format.md`.

## The plain block

The definition's `plain` key holds the words. The engine never runs them, and the definition hash leaves them out, so rewording a step never forces a new test.

```json
"plain": {
  "when": { "id": "when", "text": "Every Monday, find founders of US software companies in Kenso Search", "compiledTo": ["trigger"] },
  "steps": [
    { "id": "p1", "text": "Score each person on whether their company raised a Series A", "compiledTo": ["qualify"], "summary": "Fit score 0 to 100." },
    { "id": "p2", "text": "Keep only people scoring 70 or more", "compiledTo": ["fit"] }
  ]
}
```

- `id`: `p1`, `p2`, ... in the order written, stable for the life of the workflow and never reused. The When line's id is `when`.
- `text`: the person's words. Keep them; edit only when the person changes what they want.
- `compiledTo`: the engine ids the step became. The When line maps to `trigger` (and any `additionalTriggers` ids); a step maps to `steps[].id` values. An engine id belongs to at most one plain step. Empty or absent means not compiled yet.
- `summary`: one line on what the engine steps do, in your words.
- `pinned`: `true` when the step's config was written by hand (see Pinning).
- `mode`: `compiled` (the default) or `judgment` (see Judgment).

`steps` order is the order the person reads; the engine order stays in `steps[].next`.

## The loop

1. Call `workflows(operation="brief", client_id=...)`. Read `authoring` (this guide), `examples` and `workspace`.
2. Write the plain steps with the user: one action per step, in order, in their words. Agree on them before writing any JSON.
3. Turn each step into engine steps from `stepTypes` and `triggers`; ask for `types` details for each type you use and copy its `example` input. Fill `compiledTo` and `summary`.
4. Create it with `workflows(operation="create", client_id=..., definition=...)`, or change a draft with `workflows(operation="update", client_id=..., workflow_id=..., base_version=..., definition=...)`.
5. `workflows(operation="validate", client_id=..., workflow_id=...)`. Fix every error the issues name (path, code, fix) and validate again.
6. Test on one record: `workflow_builder(operation="test", client_id=..., workflow_id=..., record_type="person", record_id=...)`. Omit the record to use the newest one of the trigger's type. `pinned_outputs={"qualify": {"score": 85, "fit": true, "reasons": ["Series A in March"]}}` stands in for a step's output, so you can re-run the later steps for free while you fix them; pinned steps count as untested, so finish with one test without pins.
7. Publish: `workflows(operation="publish", client_id=..., workflow_id=...)`.

A step Kenso cannot express in its types (or that the user wrote as code) stays a `code.run@1` step, pinned. A step the user asks Ken to decide each time is a judgment step.

## Canonical shapes

Use these shapes; validate and the app read them back as the plain steps they came from.

- **A fit filter** ("keep only good fits", "only if they score 70 or more"): an `ai.qualify@1` step, then `logic.filter@1` with `"when": "{{qualify.score}} >= 70"`, where `qualify` is the qualify step's id. Use 70 when the person names no number.
- **Segments** ("split them into technical founders and everyone else"): one `logic.branch@1` whose `branches` are the segments in the order the person listed them, each with a `label` (the segment's name) and a `when`, and an `else` arm last for everyone the others leave. Each arm's `next` lists the steps of that segment. Never chain several branches or filters for one split.
- **Adding a person to a campaign** ("add the technical founders to the Q1 campaign"): `person.add_to_campaign@1` on a person or lead run, with `campaignId` from `workspace.campaigns` and `segment` a name from that campaign's `segments[].name` (left out, the default segment). Ask which campaign when the person did not name one. A run about no record (a schedule or webhook looping over what an earlier step fetched) adds each one with `campaign.add_lead@1` instead, and `campaign.add_person@1` is only for the people `trigger.linkedin_post_engagement@2` finds. Ask for the step with `types` before you write it.
- **Only run if** ("post to Slack only if they found an email"): the step's own `when`, for example `"{{find_email.email}} != null"`. A filter ends the run; a `when` skips one step.
- **One plain step, several engine steps**: list every id in `compiledTo` (a segment step maps to its branch and each arm's steps).

## Pinning

Set `"pinned": true` on a plain step whose engine config was written by hand: in the Advanced editor, through the MCP or the CLI, as raw JSON, or as a `code.run@1` step. Kenso never recompiles a pinned step, and its text only describes it. Every plain step that maps to a `code.run@1` step is pinned. When you hand-write a step's `with` (an `http.request@1` to the customer's own API, a CRM field map), pin it.

## Judgment

`"mode": "judgment"` is a step the agent decides on each run instead of fixed config: one `ai.agent@1` step whose `instructions` are the step's text. Give it a `returns` JSON schema when a later step reads its answer (`{{judge.result.likely}}`), and only the `tools` it needs (reading web pages, Kenso Search companies or people: `types=["ai.agent@1"]` lists their names). It costs per run like any agent step (its tier), so prefer compiled steps when the rule is fixed.

## Secrets

Never put a secret value in a definition, in a step's text or in this chat. A definition names a secret as `{{secrets.NAME}}`: in `http.request@1` headers, and in the `secrets` list of a `code.run@1` step (the code reads it as an environment variable). `workspace.secrets` lists the names the workspace has. When a secret is missing, ask the user to add it in the app (Settings > Integrations > Secrets) and give you only its name; the MCP cannot create, rotate or delete secrets, so a value never passes through a transcript.

## Costs

The brief, writing the definition yourself, create, update and validate cost nothing. A test runs live steps (lookups, enrichment, AI) for real and charges them like any run; simulated steps (sends, CRM writes, Slack posts) and pinned outputs cost nothing. A live workflow charges its steps on each run, within its `limits`.
