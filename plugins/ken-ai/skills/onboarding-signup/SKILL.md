---
name: onboarding-signup
description: Sign a new person up from their agent - create their workspace, start their first account plans from their website, ask the setup questions as choices, and hand them a preview link that opens the plans in the app. The first launch always waits for their approval in the app.
---

# Sign up from your agent

Signs a new person up for Kenso from their agent. You create their workspace, start their first account plans from their website, ask them the setup questions as choices, and give them a preview link that opens the plans in the app. The first launch waits for their approval in the app.

Use it when someone with no workspace yet asks to sign up, to try Kenso, or to get account plans for their company from here. When `list_skills` shows only this skill, the person has no workspace yet: start at step 1. When they already have a workspace, start at step 2.

## Rules

- Ask only what the steps below ask. Offer the choices you get, and never pick an answer for the person.
- One question at a time, in the order the build asks them.
- Never launch, approve, connect a mailbox, pick a paid plan or pay for the person. The app asks them for each of those.
- Never ask for or send a prospect's email address. The plans carry names and titles only.
- Show what the build returns. Do not rewrite plans or invent accounts.
- Every onboarding write replaces the whole `answers` object. Always start from the `answers` you just read with `onboarding(operation="get")`, keep every key in it, and add yours.

## If the account is not ready yet

Right after someone signs up, their account takes about a minute to reach Kenso. Until it does, every tool answers with an authentication error. Tell the person: "Your account is still being set up. Give it a minute, then reconnect." Then wait for them. Do not retry in a loop.

## Step 1: create the workspace

Ask for the company name if you do not know it (50 characters at most, no link). Then:

`workspace(operation="create", name="<company name>")`

- `201` or `200`: the workspace exists. Every later call runs in it. If your tool list does not show the onboarding tools yet, refresh it (reconnect), then go on.
- `400 validation_failed` on `turnstileToken`, or `Missing scope workspace:admin`: creating a workspace from here needs a browser (a quick security check, or a permission this connection was not given). Do not ask them to reconnect for it. Give the person the sign-up link and ask them to open it and sign in with the same account they use here:

  https://app.ken.so/start

  After the check the app creates their workspace from what it read at sign-up and opens their setup chat. The app reads nothing from the link, so do not tell them it starts from what they told you here. Ask them to tell you once the chat shows. Then reconnect (or refresh your tool list) and continue at step 2: it picks up the plans the app already started.
- `400 validation_failed` on `name`: ask for a shorter name without a link.
- `403 work_email_required`: this account needs a work email. Ask them to sign up again with their work address.
- `403 invitation_pending`: a teammate already invited them to a workspace. Tell them to verify their email and accept the invitation, then come back. Stop here.
- Any other error: send them to https://app.ken.so/start and continue at step 2 once their workspace shows.

The next call can take a few seconds to see the new workspace. If step 2 answers with an authentication or workspace error right after step 1, wait 5 seconds and try again, at most 3 times.

## Step 2: start the build

Read their onboarding first:

`onboarding(operation="get")`

Keep `answers`, `step`, `buildId` and `prefill` from it.

- `buildId` is set: plans are already being built for this workspace (the app started them). Keep that id as the build id, do not create another, and go to step 3.
- No `buildId`: ask for the company website if `prefill.websiteUrl` is empty or the person says it is wrong. If the person already told you what they sell or who they sell to, keep their words as the brief (at most 8,000 characters when they are hiring, a recruiting build created with `mode="recruiting"`; at most 4,000 otherwise). Then:

  `onboarding_builds(operation="create", source="mcp", website="<website>", brief="<their words, or leave brief out>")`

  - `201` or `200`: keep the build `id` (it starts with `obd_`).
  - `404`: sign-up from an agent is not open for this account yet. Send them to https://app.ken.so/start.

Then save where they came from and their build, the way the app does, so their next step and Today read the same state:

`onboarding(operation="update", step="chat", answers={...the answers you read, "version": 2, "entry": {"source": "mcp", "website": "<website>"}, "buildId": "<obd_id>"})`

- Keep an `entry` the answers already have instead of writing a new one. In a new `entry`, add `website` only when `prefill.websiteUrl` was empty and the person typed one.
- Leave `step` out when the `step` you read is already one of `chat`, `read`, `wow`, `connect`, `paywall` or `launched`.
- A failed save does not stop the sign-up: go on to step 3.

## Step 3: answer the build's questions

Read the build every 5 to 10 seconds while it runs:

`onboarding_builds(operation="get", build_id="<obd_id>")`

- `status` is `queued` or `running`: tell the person in a few words which stage runs (`stage`), then read again.
- `openQuestions` is not empty: ask the first one. Show its `prompt`, its `context` when there is one, and its `choices` as a short list, marking the choice with `guess: true` as the suggested answer. A `kind: "multi"` question takes several choices. When `somethingElse` is true, offer "Something else" last and take a short text. Send the answer, one per call:

  `onboarding_builds(operation="inputs-create", build_id="<obd_id>", kind="answer", question_id="<questionId>", choice_ids=["<choice id>"], text="<only for Something else>")`

  A `202` means it was taken. Read the build again for the next question. references/questions.md lists the fixed questions and their choice ids.
- After the person answers `read` with only `looks_right` and no text, save that they confirmed who they are: read their onboarding again with `onboarding(operation="get")` and send `onboarding(operation="update", answers={...the answers you just read, "persona": "<the build's read.persona>", "personaConfirmed": true})`. Skip this on a hiring build: the build or `answers` has `mode: "recruiting"`, `answers.entry.mode` is `recruiting`, or the build's `read.source` is `role`. Their experience, goal and deal size answers are saved for you: do not write those.
- `409 build_closed` on an answer: the build moved past that question. Read the build again.
- `status` is `succeeded`: go to step 4.
- `status` is `failed`: tell the person what `error.message` says. When `error.retryable` is true, read again in a minute; otherwise send them to https://app.ken.so/start.
- `status` is `canceled`: stop reading and send them to https://app.ken.so/start.

If nothing changes for 10 minutes, stop reading and tell the person the plans will be waiting in the app.

## Step 4: the first plan and the preview link

From the build, show `plans[0]` in a few lines: the account, why it fits, and the first touch. Then say how many more accounts were scored (`accountsTotal` minus the number of plans).

Give them the link:

https://app.ken.so/start?build=<obd_id>

Tell them: "Open this link and sign in with the same account to see every plan. Your first launch waits for your approval there."

## Step 5: their next step

`onboarding(operation="next-step-get")`

Show its `title` and `action.label`. Right after a build it is "Approve the first launch your agent prepared": the person approves it in the app at the link above. You cannot approve it for them.

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
