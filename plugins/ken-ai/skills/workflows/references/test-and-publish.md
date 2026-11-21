# Validate, test and publish: issue codes, test controls and refusals

Part of the `workflows` skill. `SKILL.md` has each call and what makes its step done. Read this file when a call answers something else: an issue code, a test that needs steering, a publish refusal.

## Validate issues

The result is `valid`, `mode` and `issues`, each with `severity`, `path` (a JSON path such as `$.steps[2].with.prompt`), `code`, `message` and `fix`. `fix` is the instruction to follow: apply it, save the draft, validate again. `valid` is true when no issue has severity `error`; warnings never block, but read them.

| `code` | Fix |
|---|---|
| `limits_required` | Add `limits` with `creditsPerMonth`, `creditsPerRun`, `runsPerDay` and `atLimit`. Publish mode. |
| `missing_secret` | Ask the user to add it in Kenso under Settings > Integrations > Secrets and tell you only its name; the definition references it by that name (`references/plain-steps.md`, Secrets). Never ask for a value or put one in a definition: a value pasted here lands in the chat transcript. `workflows(operation="workflow-secrets-list", client_id=...)` lists the names that exist. |
| `secret_header_only` | A step other than `code.run@1` names a header-only secret, which only a Run code step can use. Use a plain secret there. A secret stays header-only until the user deletes it and creates it again without the mark. |
| `secret_host_not_listed` | A `code.run@1` step names a header-only secret whose host its `allowedHosts` does not cover. Add the host `fix` names to `allowedHosts`. |
| `secret_header_conflict` | Two header-only secrets of one `code.run@1` step set the same header on the same host. Keep one of them in `secrets`. |
| `too_many_hosts` | A `code.run@1` step's `allowedHosts` plus the hosts its wildcards cover for header-only secrets pass 20. Replace the wildcard with the exact host, or remove a host. |
| `app_not_connected` | The user connects Slack (for `slack.message@1`) or a CRM (for `crm.*` steps), under Settings > Integrations, or removes the step. `workflows(operation="workflow-slack-connection-get", client_id=...)` checks Slack; the CRM connection is on Settings > Integrations > CRM. |
| `feature_disabled` | The step needs a flag that is off for this workspace: remove the step, or ask Kenso to turn the flag on. |
| `unknown_reference` | A reference names a step, root or output field that does not exist. Use the step's `exampleOutput` from `workflows(operation="step-types-get", client_id=..., type="ai.qualify@1")`. |
| `unknown_record_field` | A warning, so it still publishes, but the reference renders empty: `account`, `person` or `lead` followed by a field the record does not have, such as `account.domain`. Use the field `fix` names (`account.primaryDomain`, `lead.companyDomain`); `references/definition-format.md` lists each record's fields. |
| `unknown_step_type` | Use the type `fix` suggests, or find one with `workflows(operation="step-types-list", client_id=...)`. |
| `invalid_formula` | A `when` or formula does not parse or check. The message starts with the formula's own code (`syntax_error`, `unknown_function`, `type_mismatch`). |
| `approval_required` | Comes only from publish: a send step (`send.email@1`, `send.linkedin@1`, `send.whatsapp@1`, `send.imessage@1`) has `approval` other than `"required"` and the workspace does not have the `workflows_auto_send` flag. Set it to `"required"`. |
| Parser codes: `invalid_json`, `invalid_type`, `missing_property`, `unsupported_format`, `invalid_name`, `missing_trigger`, `invalid_step_type`, `no_steps`, `invalid_id`, `reserved_id`, `invalid_on_failure`, `unknown_property` (a warning) | The definition's shape is wrong at `path`: fix it as `fix` says. `references/definition-format.md` lists every other code. |

## What a test run does

A test run calls real providers, so it needs the workspace's `workflows_runtime` flag like any run. While that flag is off, the call answers 404 `Workflow runs are not enabled for this workspace (workflows_runtime is off).` and starts nothing: stop and tell the user that Kenso has to turn workflow runs on for this workspace. A test run that was already queued when the flag went off fails with the same message on its step. What a step does in a test depends on its type's `test` field (`workflows(operation="step-types-get", ...)`):

| `test` | In a test run |
|---|---|
| `simulate` or `sample` | returns the type's static example output, calls nothing and costs nothing. The output is the same on every test, not built from the record: `send.email@1` returns `touchId` 48213, `campaign.promote@1` returns `accountId` 1042. To check what the step would have done, read its rendered `input` in the run's steps. Every send is simulated: a test never sends. |
| `live` | runs for real and is charged. AI and data steps are live, and so are `campaign.protect@1`, `campaign.sequence@1`, the segment steps (`campaign.segment@1`, and the older `campaign.manual_segments@1` and `campaign.ai_segments@1`) and the A/B test step. `code.run@1` is live too, once the workspace has `workflows_code`: a test runs the code for real (free in credits), except a code step with `allowedHosts`, which is simulated (output `{}`) unless you name it in `live_steps`, since its code can call outside Kenso. While the feature is off, a test of a draft with a code step answers `feature_disabled` unless you pin the step's output. For any other type, read its `test` field. |

The trigger's output (what steps read as `trigger.<field>`) comes from the record under test, for the fields the trigger declares: a lead gives `leadId`, `campaignId`, `campaignSegmentId` and `createdAt`, an account `accountId` and `stage`, a person `personId` and its first account link. A field the record cannot supply, such as a signal's `signal`, `payload` and `occurredAt`, keeps the trigger type's example value, and the result's `exampleFields` lists those names: steps that read them ran on made-up values.

To force a branch, pin a step's output: `pinned_outputs={"qualify": {"score": 85}}` records that output for `qualify` without running it, so the branch after it takes the qualified arm. A pinned step costs nothing, so pin the steps you already checked and re-run the rest while you fix them. Keys are step ids. Pinned steps count as untested: when pins stand in for every action step that ran (branches, filters, formulas, waits and for-each do not count), the run can succeed but records no pass. Pin only what you need to steer the run.

A test run never waits: `logic.wait@1` goes on at once, and `logic.wait_for_event@1` goes on as if the event arrived (`timedOut` false), with no `event` payload. To test the timeout path, pin the wait step: `pinned_outputs={"reengaged": {"timedOut": true}}`. When a later step reads the event (such as `reengaged.event.reason`), pin one: `{"reengaged": {"timedOut": false, "event": {"reason": "reply"}}}`.

To check a webhook or HTTP step, or a code step with `allowedHosts`, for real, pass `live_steps=["notify"]`; sends never run live in a test.

The call waits up to `wait_seconds` (default 50, at most 50, so it answers within a minute) and returns `run`, `testPassed`, `timedOut`, `hint`, `definitionHash`, `versionStatus`, `publishPassRecorded`, `publishPassReason`, `exampleFields` and `liveSteps`:

- `publishPassRecorded` true: the pass is recorded on this draft. `testPassed` only says the run succeeded.
- `publishPassRecorded` false: `publishPassReason` says why. `all_steps_pinned`: test again with fewer pins. `draft_changed`: the draft was saved during or after the run, so test the current draft again. Do not edit the draft while a test runs: the run fails, and so does a replay of a test run after the draft changed. `not_passed`: see the bullets below. `published_version`: the run tested the published version.
- `timedOut` true: the run is still going, and `hint` names the two calls. Poll `workflow_runs(operation="get", client_id=..., run_id=5531)` until its status is `succeeded`, `failed` or `cancelled`, then call `workflow_builder(operation="test", client_id=..., workflow_id=12, run_id=5531)` to record the pass.
- The run ended `failed` or `needs_attention`: read its trace (`references/runs.md`), fix the draft, test again.

A pass is tied to the draft's `definitionHash`, so any edit to the draft means test again.

## The publish gate

The gate, in order; the first failure wins:

1. The draft validates in publish mode. Otherwise 400 `invalid_definition`, one `error.details` entry per issue with its code and fix. With only the `imessage` feature on, a voice note a `send.linkedin@1`, `send.whatsapp@1`, `send.facebook@1` or `send.instagram@1` step sends is one of those issues: `voice_notes_off` on that step's `voiceNote` (such a note needs `linkedin_voice_notes` or `whatsapp`; an Instagram one needs `instagram` and `linkedin_voice_notes`). Whatever the features, a voice note step with `channel` `instagram` that a send step other than `send.instagram@1` carries is one too: `voice_note_channel_mismatch` on that note step's `channel`.
2. Every send step keeps `approval: "required"`, and so does every `browser.run@1` step with `canSubmit: true` (it fills a form with the inbox's name and email). `"auto"` passes the gate only when the workspace has the `workflows_auto_send` flag. Then Ken approves a `send.linkedin@1`, `send.whatsapp@1` or `send.imessage@1` touch itself once its text is final and passed review and, for WhatsApp and iMessage, its number is found and its voice note (if any) is ready. An iMessage voice note goes only once the person has replied on an iMessage thread: until then its voice note step fails at once with `recipient_must_reply` or `sms_thread`, unwritten and uncharged (branch on that step's `status`), and the text goes alone. It fails the same way with `imessage_line_owner_left` (the line's owner can't send from it), `imessage_line_gone` (the thread's line can no longer send) or `person_refused` (the person said no). Before any of those, once the person has a number to text, it fails with `phone_opt_out` (the number texted STOP, or the person opted out of texts), `do_not_call` (a provider the workspace's own key asked flagged the person do not call) or `suppressed:<reason>` (blocklisted, do-not-contact or unsubscribed). An iMessage text that would answer the person in a conversation or go to a person who said no on any channel, or a first text with a link, email address, phone number or money amount, still waits for a person. `send.email@1` always waits for approval in Today, and so does a browser step that submits: its plan waits for the inbox owner. A read-only browser step never waits. Otherwise `approval_required`.
3. A test passed on the current draft.

A workflow that is off and has no draft (turned off, or a default workflow Kenso set up off) is turned back on instead: the same call puts its published version live through gates 1 and 2, with no new test and no new version.

| 409 | Do |
|---|---|
| `Workflow has no draft to publish.` | The workflow is live with no draft. To change it, save a draft first (`SKILL.md`, Change a workflow). |
| `The workflow could not be turned on with its published version. Open it, test it and publish it again.` | Its trigger no longer binds. Save a draft, test it, then publish. |
| `A test run must pass on this draft before publishing. Call POST /v1/workflows/{workflowId}/test, then publish again.` | Test this draft, then publish again. |
| `version_conflict` | Someone saved the draft during the publish. Re-read it with `workflows(operation="get", ...)`, test again if it changed, and retry. |

On success the workflow is `live`, its trigger is registered, and new runs use the published version. Runs already going keep the version they started on.
