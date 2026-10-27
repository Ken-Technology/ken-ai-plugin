# Three complete workflows

All three are complete `kenWorkflow: "1"` definitions. Copy the one closest to the goal, change the criteria and limits, and run the loop in the skill body (`SKILL.md`): validate, estimate, test, publish. The format rules are in `definition-format.md`.

## 1. Signals to pipeline (`general`)

This is the definition of the `signals-to-pipeline` template (`workflows(operation="templates-get", client_id=..., template_key="signals-to-pipeline")` reads it). Create it from the template, not by pasting:

`workflows(operation="create", client_id=..., template_key="signals-to-pipeline")`

Then replace the `<fill in: your ICP in two sentences>` criteria with an update before you test.

- `trigger.signal@1` starts one run per lead with a hiring, funding, job change or ICP timing signal, at most once per lead every 30 days.
- `qualify` scores the lead's company against the criteria on the cheap tier.
- `fit` sends a score of 70 or more to `promote`. The else arm ends the run.
- `promote` turns the company into an account. On a lead trigger it runs before the research and the send.
- `crm` creates or updates the company in the connected HubSpot or Salesforce by its domain. It has `"onFailure": "continue"`, so a CRM outage does not stop the research and the email. A workspace with no CRM connected sees `app_not_connected` at publish: connect one, or remove the step.
- `research` writes why now from the signal and its details (`{{trigger.payload}}`, such as the funding round), and an angle ready to paste into the email.
- `email` drafts a first email to the lead (`to: "record"`) with a body built from `{{research.angle}}`. Because it has a body, the touch waits in Today for approval and never sends on its own. Without a body it would stay planned, out of Today, until Ken's writer or a person writes it.

```json
{
  "kenWorkflow": "1",
  "name": "Signals to pipeline",
  "trigger": {
    "type": "trigger.signal@1",
    "with": { "signals": ["hiring", "funding", "job_change", "icp_timing"], "oncePerRecordDays": 30 }
  },
  "steps": [
    {
      "id": "qualify", "type": "ai.qualify@1", "title": "Qualify the account",
      "with": { "criteria": "<fill in: your ICP in two sentences>", "tier": "cheap" },
      "next": ["fit"]
    },
    {
      "id": "fit", "type": "logic.branch@1", "title": "Qualified?",
      "with": {
        "branches": [
          { "label": "Qualified", "when": "{{qualify.score}} >= 70", "next": ["promote"] },
          { "label": "Not a fit", "else": true, "next": [] }
        ]
      }
    },
    { "id": "promote", "type": "campaign.promote@1", "title": "Promote to Accounts", "next": ["crm"] },
    {
      "id": "crm", "type": "crm.upsert@1", "title": "Create or update the company in the CRM",
      "with": { "objectType": "company", "domain": "{{lead.companyDomain}}", "fields": { "account.name": "{{lead.companyName}}" } },
      "onFailure": "continue",
      "next": ["research"]
    },
    {
      "id": "research", "type": "ai.research@1", "title": "Research why now",
      "with": {
        "focus": "Why now: the {{trigger.signal}} signal. Its details: {{trigger.payload}}. Write the angle as one or two sentences to the lead, ready to paste into a first email, from facts you can source.",
        "tier": "balanced"
      },
      "next": ["email"]
    },
    {
      "id": "email", "type": "send.email@1", "title": "Draft the first email",
      "with": {
        "to": "record",
        "approval": "required",
        "subject": "Quick idea for {{lead.companyName}}",
        "body": "Hi {{lead.firstName}},\n\n{{research.angle}}\n\nWorth a short call next week to see if it fits?",
        "instructions": "Check the opening against the {{trigger.signal}} signal before you approve. If the opening is blank, research found no angle: write one from the signal."
      },
      "onFailure": "continue"
    }
  ],
  "limits": { "creditsPerMonth": 500, "creditsPerRun": 10, "runsPerDay": 50, "atLimit": "ask" }
}
```

## 2. Campaign leads: qualify, write, review, enroll (`campaign`)

A campaign workflow belongs to one campaign and runs on that campaign's leads. Create it with `kind="campaign"` and the campaign's id:

`workflows(operation="create", client_id=..., kind="campaign", campaign_id=87, definition={...})`

Its trigger is `trigger.manual@1` on leads, so it runs when you start it on leads: `workflow_runs(operation="run-on-records", client_id=..., workflow_id=12, records=[{"type": "lead", "id": 4211}], estimate_only=True)`, then again without `estimate_only`.

- `protect` comes first: it checks whether the lead, or anyone at its company (`wholeCompany`), is in an active account play. It changes nothing itself.
- `qualify` runs only when `protect` returned `protected` false, and scores the lead on the cheap tier.
- `fit` sends a score of 70 or more to `sequence`. The else arm ends the run.
- `sequence` writes the lead's personalized copy for every step of the campaign's sequence. The campaign charges it as AI personalization per lead written, so the estimate shows it as a `chargedBy: "campaign"` line.
- `review` puts the copy into the campaign's client review and waits up to 30 days for the decision.
- `enroll` goes last and runs only when `{{review.approved}} == true`: it hands the lead to the campaign's send path and, with `waitForFirstSend`, waits up to 14 days for its first email.

```json
{
  "kenWorkflow": "1",
  "name": "Campaign leads: qualify, write, review, enroll",
  "description": "Runs on one campaign's leads: skips leads in an active account play, qualifies the rest, writes the fits' sequence, puts it up for the campaign's review and enrolls the approved ones.",
  "trigger": { "type": "trigger.manual@1", "with": { "recordType": "lead" } },
  "steps": [
    {
      "id": "protect", "type": "campaign.protect@1", "title": "Skip active account plays",
      "with": { "wholeCompany": true },
      "next": ["qualify"]
    },
    {
      "id": "qualify", "type": "ai.qualify@1", "title": "Qualify the lead",
      "when": "{{protect.protected}} == false",
      "with": { "criteria": "B2B software companies with 50 to 500 employees that sell to sales teams.", "tier": "cheap" },
      "next": ["fit"]
    },
    {
      "id": "fit", "type": "logic.branch@1", "title": "Qualified?",
      "with": {
        "branches": [
          { "label": "Qualified", "when": "{{qualify.score}} >= 70", "next": ["sequence"] },
          { "label": "Not a fit", "else": true, "next": [] }
        ]
      }
    },
    {
      "id": "sequence", "type": "campaign.sequence@1", "title": "Write the personalized sequence",
      "with": { "tier": "balanced" },
      "next": ["review"]
    },
    { "id": "review", "type": "campaign.review@1", "title": "Client review", "with": {}, "next": ["enroll"] },
    {
      "id": "enroll", "type": "campaign.enroll@1", "title": "Enroll in the campaign",
      "when": "{{review.approved}} == true",
      "with": { "waitForFirstSend": true }
    }
  ],
  "limits": { "creditsPerMonth": 500, "creditsPerRun": 10, "runsPerDay": 50, "atLimit": "ask" }
}
```

## 3. Skip accounts the CRM already owns (`general`, a code step)

A `code.run@1` step between the trigger and a branch: it asks the workspace's CRM whether it already has the account, and the branch qualifies only the new ones. It needs the `workflows_code` feature and a workspace secret named `CRM_TOKEN` (without the feature, a test or publish reports `feature_disabled`; without the secret, publish reports `missing_secret`). The code steps section of `definition-format.md` has the rules.

- `trigger.manual@1` runs on the accounts you start it on.
- `crm` gets the account's domain through `inputs` (the code itself is never rendered), skips accounts without one, and calls the CRM over HTTPS. It may reach only `api.example-crm.com`, and reads the token from the `CRM_TOKEN` environment variable. `outputSchema` states what it returns: `owned` and `owner`.
- `route` sends accounts the CRM does not own to `qualify`. The else arm ends the run.
- `qualify` scores the account on the cheap tier and saves the score to `account.fitScore`.

```json
{
  "kenWorkflow": "1",
  "name": "Skip accounts the CRM already owns",
  "trigger": { "type": "trigger.manual@1", "with": { "recordType": "account" } },
  "steps": [
    {
      "id": "crm", "type": "code.run@1", "title": "Look the domain up in the CRM",
      "with": {
        "language": "javascript",
        "code": "export default async function run(inputs, ctx) {\n  if (!inputs.domain) ctx.skip('no website');\n  const url = 'https://api.example-crm.com/v1/companies?domain=' + encodeURIComponent(inputs.domain);\n  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + process.env.CRM_TOKEN } });\n  if (!res.ok) throw new Error('CRM answered ' + res.status);\n  const { results } = await res.json();\n  return { owned: results.length > 0, owner: results.length > 0 ? results[0].owner : '' };\n}",
        "inputs": { "domain": "{{account.primaryDomain}}" },
        "outputSchema": {
          "type": "object",
          "properties": { "owned": { "type": "boolean" }, "owner": { "type": "string" } },
          "required": ["owned", "owner"]
        },
        "allowedHosts": ["api.example-crm.com"],
        "secrets": ["CRM_TOKEN"]
      },
      "next": ["route"]
    },
    {
      "id": "route", "type": "logic.branch@1", "title": "New to the CRM?",
      "with": {
        "branches": [
          { "label": "New", "when": "{{crm.owned}} == false", "next": ["qualify"] },
          { "label": "Already owned", "else": true, "next": [] }
        ]
      }
    },
    {
      "id": "qualify", "type": "ai.qualify@1", "title": "Qualify the account",
      "with": { "criteria": "B2B software companies with 50 to 500 employees that sell to sales teams.", "tier": "cheap" },
      "save": [{ "from": "score", "to": "account.fitScore" }]
    }
  ],
  "limits": { "creditsPerMonth": 200, "creditsPerRun": 2, "runsPerDay": 100, "atLimit": "ask" }
}
```
