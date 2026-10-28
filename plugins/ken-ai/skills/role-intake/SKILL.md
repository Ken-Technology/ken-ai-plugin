---
name: role-intake
description: Turn a job link, pasted job text or a few answers into a saved role, then hand it to the campaign builder. Use when the user wants to fill a role or hire for a job. Needs recruiting turned on for the workspace.
---

# Role Intake

Turns the job the user wants to fill into a saved role in Ken AI, then sends them to the campaign builder for that role. A role holds the title, the hiring company, the place, the pay, and what a candidate must and should have. The recruiting campaign's search, qualification, segments and copy are all built from it.

Recruiting must be on for the workspace. When a roles call answers 404 `not_found` without naming a role id, recruiting is off: say so, and offer a campaign that finds customers instead.

## 1. Get the job

Ask for one of three things: a link to the job post, the job text pasted in, or a few answers.

- A link: `roles(operation="extract", url="https://...")`.
- Pasted text: `roles(operation="extract", text="...")`.
- Neither: ask the questions in step 2 yourself.

`extract` saves nothing. It answers a draft role plus `missing` (the fields the page did not give) and `questions` (one plain question per missing field). A page it cannot read answers 400 with detail `page_unreadable`: ask the user to paste the text. A 503 with detail `extraction_unavailable`: ask the questions yourself.

## 2. Fill the gaps

Ask the draft's `questions` in one message, in order. Without a draft, ask in one message: the job title; which company is hiring (the workspace's own company unless they say otherwise); where the role is based, and whether it is onsite, hybrid or remote; what it pays, and per year, month, day or hour (they may skip it); what a candidate must have to be considered (three to five lines); the level, such as Senior or Lead.

Never invent pay, must-haves or a location. When the user skips pay, leave it out.

Rewrite a must-have about age, gender, race, religion, disability, family status or nationality into what the job needs, or drop it: "young and energetic" is not a requirement, and "native English speaker" becomes "Fluent English". Say once, plainly, what you changed and why.

## 3. Confirm and save

Show the role as a short list (title, company, place and remote policy, pay, must-haves, nice-to-haves) and ask for changes. When they confirm:

- A new role: `roles(operation="create", title="...", fields={...})`, with `fields` holding `company_name`, `job_url`, `description`, `must_haves`, `nice_to_haves`, `pay` (`min`, `max`, `currency`, `period`), `location`, `remote_policy` (`onsite`, `hybrid` or `remote`) and `seniority`, each only when known.
- A role they already have: ask for its id (the role's page in the app shows it), read it with `roles(operation="get", role_id=<role id>)`, and save only what changes with `roles(operation="update", role_id=<role id>, changes={...})`.

The user approves each save. Then say what was saved, for example "Saved the role Senior Backend Engineer."

## 4. Hand off to the builder

Share the builder link for the saved role and stop there: https://app.ken.so/demo/campaigns/build?kind=recruiting&roleId=<role id>. The builder plans the candidate search, the LinkedIn-first sequence and the copy from the role. Never start a campaign build for customers in its place.

## Errors

Tools return a normalized error envelope (`success: false`, `error.category`). A 400 `validation_failed` names the field: fix that field and save again. A 404 `not_found` on every roles call means recruiting is off for the workspace. On `plan_limit` or `billing`, surface `error.message` and `error.recovery.summary`; never retry blindly.

## No Ken account yet

These steps run on the Ken MCP server, which signs in with a Ken account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
