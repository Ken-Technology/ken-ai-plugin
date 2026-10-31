---
name: create-campaign
description: Build a cold email campaign from plan to launch-ready - plan, audience, segments, strategy, copy, review, AI variable prompts, settings and prelaunch checks - with a person approving every gate.
---

# Create a campaign

This skill takes one campaign from "build a campaign for this ICP and offer" to a Draft campaign in Kenso that is ready to launch: a plan, the audience, segments, a sequence per segment, reviewed copy, AI variable prompts, settings and a prelaunch check. It ends with a report that says PASS or FAIL per check and a link where the user launches the campaign themselves.

The work runs in stages. Each stage produces one thing, ends at a gate where a person says yes, and has a stage reference that holds its full rules. This body is the map: open the stage reference when you reach the stage, and follow it.

## The rules

- **A person approves every gate.** You draft in the chat, show it, and write to the platform only after an explicit yes. You never launch, send, test-send, pause, resume, delete or restore anything on your own. Launch is the user's button, after verify passes.
- **A client's live campaign needs that client's yes.** Any schedule, volume, pause or sequence change on a client's campaign that is already sending needs a yes that names that client, with its source (who said it, where, when). Pass the source in `sending_days_requested_by` on `campaigns(operation="update", ...)`. Without it, leave the change undone and say what you need.
- **Never invent.** No prices, times, offers, pay, case studies, metrics or lead magnets that the workspace's own material does not show. Ask, or leave it out.
- **Replies, not opens.** Goals and results are replies, positive (interested) replies and clicks. Replies are distinct contacts; an out-of-office is not a reply; opens are never a goal or a reported number.
- **No vendor names to clients.** Never name the email-finding, verification or sending providers behind Kenso.
- **A structural copy change is a new version.** On a live campaign, improved copy replaces the live steps and is checkpointed as a version. Never add it as a Variant B: variants are live A/B arms that send.
- **A funding round is not a buying event.** Write to the plan the money pays for, never "congrats on the raise".

## Step 0 - Preflight

1. **Workspace.** `workspace(operation="list")` once. When the user can see more than one workspace, ask which one and send its id as `client_id` on every call.
2. **Can this caller build campaigns?** The skill needs `campaigns(operation="create")`. If the campaigns tools are missing, or a write answers 403 `permission`, the user's role cannot build campaigns: stop with one sentence and send them to https://app.ken.so/<workspace id>/campaigns. A 404 on every id means a feature is off or hidden for this caller, not that the data is missing: stop that part, never retry it as "not found".
3. **What is on.** These parts are optional and depend on the workspace:

| Part | Needs | When it is off |
|---|---|---|
| Campaign notes saved in Knowledge (plan, strategies, voice cards) | the `knowledge` feature | keep the notes in the chat and say they are not saved |
| A recruiting campaign for a role | the `recruiting` feature (`roles`) | build a normal campaign or stop |
| LinkedIn steps | LinkedIn accounts connected | email-only campaign |
| Assigning inboxes from here | staff only | the user assigns inboxes at https://app.ken.so/<workspace id>/campaigns/<campaign id> |
| Placement tests | Delivery view to read them, Delivery edit to start one (never a client seat); 2 a day and 8 in 30 days per workspace | the check reports "not checked" |
| HTML steps | the `html_steps` feature | plain steps (the default) |

4. **New or existing.** If the user names an existing campaign, read it with `campaigns(operation="get", campaign_id=...)`, then `segments(operation="list", campaign_id=...)`, and start at the first stage whose output is missing (see "Picking up a campaign" below).
5. **Credits.** Imports, enrichment and AI workflows spend credits, and prompt tests spend model usage. Say what a step costs before you run it on more than a handful of contacts. On `plan_limit` or `billing` errors, show `error.message` and `error.recovery.summary` and stop that step; never retry blindly.

## Opening a stage reference

Each stage's rules are in a reference of this skill:

`load_skill(name="create-campaign", reference="references/<stage>.md")`

`<stage>` is the name in the table below (for example `campaign-planning`). Each stage reference is a complete playbook. The stage names were skills of their own before; open them as references of this skill, as above. The stage references name their own supporting references (enums, copy rules, templates); open those from this skill the same way.

Three stages use other skills: search is the `ken-search` skill, and qualification and AI variable prompts are the `qualification` and `prompt-writer` playbooks of the `knowledge-setup` skill: `load_skill(name="knowledge-setup", reference="references/qualification.md")`, and the same with `references/prompt-writer.md`. They load in every workspace, also one without the Knowledge feature, where `knowledge-setup` is not listed. For a workspace with no company research yet, its `references/client-research.md` builds it before stage 1.

## The stages

| # | Stage | Open | Produces | Gate |
|---|---|---|---|---|
| 1 | Plan | `campaign-planning` | One ICP, one offer and CTA, the segment mode and segments; a Draft campaign | The user approves the plan before `campaigns(operation="create")` |
| 1a | Offer (optional) | `lead-magnet` | Lead magnet ideas when the offer is weak or missing | The user picks one, or keeps the offer |
| 2 | Audience | `ken-search` skill, then knowledge-setup's `qualification` | A saved search with a count, and the qualification prompt | The user approves the filters and the count |
| 3 | Segments | `segmentation` | The Default description and the segments (AI, manual or A/B arms) | The user approves the descriptions before any write |
| 4 | Strategy, per segment | `campaign-strategy` | The sequence blueprint and the AI variable list | The user approves the strategy |
| 5 | Copy, per segment | `email-copywriting` | The segment's live sequence with tracking links | The user approves the copy before the push |
| 6 | Review, per segment | `email-review` | A score and fixes; pass is 4.5 or more | At most 3 rounds, then the user decides |
| 7 | AI variable prompts, per segment | knowledge-setup's `prompt-writer` | One personalization prompt per AI variable (`{{First Line}}` and the like), tested on sample leads | The user approves the samples |
| 8 | Configuration | `campaign-configuration` | Settings, schedule, AI workflows, the import, inboxes | The user approves each setting change and the import |
| 9 | Verify | `verify-campaign` | A read-only PASS or FAIL report, with the prelaunch checks and a list audit | The user launches, or asks for fixes |

Run stages 4 to 7 for every segment, Default included: leads that fit no other segment land in Default and still get email.

### 1. Plan

Gather the workspace context first. With Knowledge on, `knowledge(operation="context", purpose="plan a cold email campaign")` returns the company files, instructions and writing style in one call; otherwise read the company context from `workspace(operation="get", workspace_id=...)`. Ask at most 3 questions, in one message, only when the offer or audience is unclear.

The plan is 1 broad ICP + 1 offer + segments. A different person (title, buying process) or a different offer is a different campaign. Segments are sub-ICP groups that get tailored messaging, never messaging tests; testing whole sequences is the A/B (percentage) mode. Every email asks for the real offer, Email 1 included.

After the yes: `campaigns(operation="create", name=..., contact_limit=...)`. A campaign is always born Draft, with a Default segment. With Knowledge on, save the plan as the campaign's Knowledge file (`Campaign plan - <campaign name>`); the stage reference has the steps.

Done when the user has the `campaign_id` and the approved plan.

### 1a. Offer (optional)

Open `lead-magnet` when the user has no clear offer, or the offer is a demo nobody asked for. It proposes lead magnets the client can actually deliver. Copy names a lead magnet only once it exists.

### 2. Audience

Load the `ken-search` skill to build the filters, check the count against the plan's size (5,000+ contacts unless the user set a target) and save the search. Then open knowledge-setup's `qualification` playbook to write who qualifies and who does not; it never restates a search filter. The import itself happens in configuration (stage 8), after the copy is ready.

Done when the search is saved with its count and the qualification prompt is saved.

### 3. Segments

Open `segmentation`. Prefer manual segments when the split is a hard filter (free); AI segments when it needs judgment; A/B arms only for a whole-sequence test. Update the existing Default, never create one. The user turns on A/B mode in the app; the reference says when.

Done when every planned segment exists with its id, and Default has its description.

### 4. Strategy (per segment)

Open `campaign-strategy`. It turns the plan into a blueprint for each email (goal, wait days, hook, proof, CTA) and the AI variable list (name, source, length, fallback). AI variables may use only the company website's main page, the LinkedIn company page and the LinkedIn profile. Wait days are the days before an email sends: send days 0/3/7/11 are wait days 0/3/4/4.

Done when the user approves the strategy for that segment.

### 5. Copy (per segment)

Open `email-copywriting`. Draft in the chat, against its lint contract and its supporting references (gold standard, spam words, sound human). After the yes, it creates the tracking links and writes the live sequence with `email_sequences(operation="segment-email-sequences-replace", segment_id=..., steps=[...])`.

Done when the segment's live sequence matches the approved copy.

### 6. Review (per segment)

Open `email-review`. It scores the copy 1 to 5 against the rubric (word bands, four first-line checks, the bridge rule, spam-word tiers, merge fields, a prompt for every AI variable) and lists each failure with its fix. Below 4.5, rewrite with stage 5 and review again, at most 3 rounds. Fixes on a live sequence are a full replace of the live steps, then one `email_sequences(operation="save-version", segment_id=..., name=...)` per segment. The app's version history lists segment versions: when the user wants the round to show there, also call `segments(operation="save_new_version", campaign_id=..., segment_id=...)`, which queues a sequencer refresh on a live campaign (the configuration stage's `update-recipes.md`, section 8a).

Done when the copy scores 4.5 or more and the user approves it.

### 7. AI variable prompts (per segment)

Open knowledge-setup's `prompt-writer` playbook. Every AI variable in the copy (`{{Subject Line}}`, `{{First Line}}`, `{{PS Line}}` and the rest) needs its own personalization prompt, saved one call per variable, and tested on sample leads with `prompts(operation="test", campaign_id=..., flow="personalization", segment_id=...)`. A variable you do not touch stays as it is: nothing is removed unless the user asks to remove it.

Done when each variable's samples read well to the user.

### 8. Configuration

Open `campaign-configuration`. It applies the settings the plan needs (contact limit, schedule, daily cap, AI workflows), runs the search import into the campaign, and checks what can only be set in the app. Inbox assignment from here is staff-only; everyone else assigns inboxes at https://app.ken.so/<workspace id>/campaigns/<campaign id>. Starting the AI workflows (`campaign_flow(operation="start_workflows", ...)`) spends credits: run it only on the user's yes.

Done when every setting matches the plan, or the user has the list of what to change in the app.

### 9. Verify

Open `verify-campaign`. It is read-only: `campaign_flow(operation="can_launch", campaign_id=...)`, the full checklist (segments, sequences, prompts, workflows, settings, tracking links), the prelaunch gate (domain authentication, warmup, placement, schedule and caps, merge fields render, a 50 to 200 lead canary) and a list audit (duplicates, blocklist, free mail, unverified emails). Each check reports PASS, FAIL or "not checked" with the reason. Fixes go back to the stage that owns them, after a yes.

Done when the report is in the chat. Hand the user the campaign at https://app.ken.so/<workspace id>/campaigns/<campaign id> to launch it themselves.

## Picking up a campaign

| What you find | Start at |
|---|---|
| No campaign, or no approved plan | 1. Plan |
| A Draft with only Default, no saved search | 2. Audience |
| Search and qualification done, segments missing | 3. Segments |
| A segment with no sequence | 4. Strategy for that segment |
| A sequence never reviewed | 6. Review |
| AI variables in the copy without a personalization prompt (`prompts(operation="list", campaign_id=..., segment_id=..., flow="personalization")`) | 7. AI variable prompts |
| Everything written, never verified | 9. Verify |

A campaign that is already sending is not a build: copy changes there are a new version of the live steps (stage 6 rules), and any schedule, volume or pause change needs the client's named yes.

## Recruiting campaigns

A recruiting campaign fills one role, needs the `recruiting` feature, and is created from the role (`kind` `recruiting` and the `role_id` on the create call). The plan, segments, copy, review, configuration and verify stage references each have a Recruiting campaigns section: follow it at that stage. The offer is the role, the ask is a reply or a short call, LinkedIn goes first unless the user names one channel, and nothing is ever planned, segmented or written on age, gender, race, religion, disability, family status or nationality.

## What this skill cannot do yet

- Domain authentication is read from the last stored DNS snapshot (`domain_setup(operation="list")`), not checked per message.
- No tool answers "do we already hold these people" for a whole list across the workspace; only one email at a time. Verify reports the overlap as "not checked".
- A workspace can start 2 placement tests a day and 8 in 30 days, and a client seat cannot start one. Inbox assignment from here is staff-only.

## Report back

After each gate, one short status: the stage, what was written (ids), what waits on the user. At the end: the campaign id and name, each segment with its sequence and review score, the AI variables per segment, the settings applied and the ones left for the app, the verify report, and the link to launch.

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
