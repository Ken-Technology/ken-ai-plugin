# Qualification Skill

Turn a campaign plan's qualify/disqualify rules into the variables the platform's lead qualifier runs on every lead: an audience description, disqualification criteria, and (rarely) qualification criteria. They are saved as the campaign's Qualification prompt (flow `qualification`).

## Inputs

- The plan's broad ICP and its qualify/disqualify rules.
- The search filters already applied (the saved search, or the `## Search Filters` section of campaign file `plan.md`). They tell you what NOT to restate.
- Workspace research (`research.md`, company context) for competitors and ICP nuances.
- A sample of sourced leads, when available, to see real edge cases.

Use what the conversation already holds. Read only what is missing: `files(operation="list", campaign_id=...)` for `plan.md`, `files(operation="list")` for workspace `research.md`, then `files(operation="content", file_id=...)`.

When the workspace has Knowledge on, a workspace-wide qualification prompt from Knowledge > Prompts is added after this one for every lead it applies to. Write only this campaign's rules here and do not repeat the workspace's.

## What the qualifier can see

The qualifier sees ONLY:
- LinkedIn profile: title, company, location, previous roles, education, skills, summary.
- Company data: industry, headcount, HQ, description.
- Website metadata: page title and meta description only.

It does NOT see full site content, tech stack, news, funding, social posts, press, events, or any time-sensitive signal. Every criterion must be checkable against the data above. Rewrite or drop any rule that depends on something else.

## Core Principles

- **Write short, trust the AI** - Give it a short, plain-language brief and let it reason. A few high-signal lines beat an exhaustive rulebook. No long lists of titles, industries, or product names.
- **Never repeat the search filters** - The filters already bound the list (headcount, geography, titles, seniority, industries). Do not restate any of it, not in the audience description and not as a criterion. Qualification only catches what the filters can't see.
- **Don't over-qualify** - Qualification is a safety net, not a precision filter. When data is incomplete or ambiguous, qualify.
- **Disqualification over qualification** - Prefer audience description + a few disqualifiers. Add qualification criteria only for a real positive signal worth confirming.
- **Always exclude competitors** - The one disqualifier that is always worth including.

Details, examples, and a disqualifier menu: `load_skill(name="knowledge-setup", reference="references/qualification-guide.md")`.

## Write the Variables

**Audience description** (required): one plain sentence on who we target, 5-20 words. No headcount, geography, title lists, or industries.

**Disqualification criteria** (strongly preferred): binary deal-breakers the filters can't see, such as competitor or wrong business model. Usually 2-4 lines, never more than 6. Always include competitor exclusion. Don't pad.

**Qualification criteria** (optional, usually empty): only a genuine positive signal visible in the data above.

At least the audience description and the disqualification criteria must be non-empty. Fewer than two substantive sections is a hard stop: revise first.

## How the Platform Runs It

- One combined evaluation call per lead covers every lane the campaign has on (qualification, segmentation, scoring).
- Qualification is one yes/no question built from the three fields plus the workspace company context. The answer is a probability; strictly above 0.40 stores qualified.
- Only a technical failure falls back to the standard model lane. Low confidence still records a verdict.
- Lead scoring reuses the same three fields, so clean qualification copy improves scoring too.
- Saving the prompt invalidates earlier verdicts; leads re-evaluate with the new copy.

## Save (MCP)

Show the three sections to the user and get approval. Then find the campaign's Qualification prompt:

`prompts(operation="list", campaign_id=<campaign_id>, flow="qualification")`

Use the item whose `type` is `system`, the lowest `order` first. If there is one, update its three fields and leave the rest as it is:

```
prompts(
  operation="update",
  prompt_id=<its id>,
  changes={
    "audience_description": <audience description>,
    "qualification_criteria": <qualification criteria or "">,
    "disqualification_criteria": <disqualification criteria>
  },
  confirm=false
)
```

If the campaign has none, create it. `prompt` is required but unused once the three fields are set; send `"structured"`, as the app does:

```
prompts(
  operation="create",
  campaign_id=<campaign_id>,
  flow="qualification",
  prompt_type="system",
  prompt="structured",
  audience_description=<audience description>,
  qualification_criteria=<qualification criteria or "">,
  disqualification_criteria=<disqualification criteria>,
  order=1,
  confirm=false
)
```

Keep one Qualification prompt per campaign: update the one that exists, never add a second. A save that would clear existing AI results is refused with a 409 that says what it would clear: show that to the user, and re-call with `confirm` set to true only after they explicitly agree. Never set it up front.

Confirm: "Qualification prompt saved to campaign {campaign_id}."

## Recruiting campaigns

A campaign with `kind` `recruiting` fills a role: `campaigns(operation="get", campaign_id=<campaign id>)` gives its `roleId`, and `roles(operation="get", role_id=<role id>)` gives the role. The leads are candidates, so the prompt decides who could take this job, not who would buy.

- Audience description: the role in one or two sentences (title, level, place or remote policy) and the kind of person who could do it.
- Qualification criteria: the role's must-haves, each written as something a profile shows (a current or past title, years of experience, a skill, a degree). Leave out what a profile never shows, such as notice period or salary expectations.
- Disqualification criteria: people who already work at the hiring company, people far more senior or junior than the role, and people whose profile shows none of the must-haves. A nice-to-have never disqualifies.
- Location: for an onsite or hybrid role, people outside the role's area do not qualify unless the role allows relocation. A remote role disqualifies no one on location.
- Never qualify or disqualify on age, gender, race, religion, disability, family status or nationality, or on a guess at any of them (a name, a photo, a graduation year). A language the job needs is a skill, and fine.

Save it exactly as above.

## Errors

Tools return a normalized error envelope (`success: false`, `error.category`). On `plan_limit` or `billing`, surface `error.message` and `error.recovery.summary`; never retry blindly.
