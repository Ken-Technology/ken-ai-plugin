# Campaign Plan Skill

Generate strategic campaign plans that define a broad ICP and offer, then split the prospect list into sub-ICP segments for more relevant, targeted messaging. After the user approves the plan in chat, create a Draft campaign and store the plan in the campaign's Knowledge file (or, without Knowledge, keep it in the conversation).

## Campaign Model

- **1 broad ICP** + **1 offer** + **multiple segments**.
- Different broad ICPs or different products = different campaigns.
- 1 approved plan = 1 Draft campaign.
- The plan keeps a single top-level `# {Campaign Name}` H1. That name is the campaign's name.

## Segmentation Modes

A plan uses exactly one mode:

| Mode | What it is | Use when |
|------|------------|----------|
| **`ai`** (default) | Segments are sub-ICP groups (industry, title, stage, signal), each with tailored messaging. AI assigns leads by segment description. | The broad ICP splits into groups that need judgment to tell apart |
| **`manual`** | Same sub-ICP idea, but leads are assigned by hard filters (industry, title, size, geo). Free. | The split is filterable. Prefer it over `ai` |
| **`percentage`** | A sequence A/B test: segments are random arms with weights, each running a totally different sequence. | Testing whole sequences, structures, or offers on one audience |

- Email-step A/B (variants of one step's subject, hook, CTA, or PS) is separate from the mode. campaign-strategy and email-copywriting handle it inside any mode.
- In `percentage` mode the arms get weights, not criteria. All weights, Default included, are integers summing to exactly 100, and Default is the control arm.

## Required Context

Load everything available before planning:

1. **Workspace** - resolve `client_id` with `workspace(operation="list")` once per conversation; on a multi-workspace error, retry with the explicit `client_id` the error lists.
2. **Company context** - when the workspace has Knowledge, `knowledge(operation="context", purpose="plan a cold email campaign")` first: its `stable` part holds the company files, instructions and writing style. Otherwise read the company context with `workspace(operation="get", workspace_id=...)`. Older workspaces may still hold research and notes as workspace files (`research.md`, `notes.md`): a workspace admin can read them with `files(operation="list")` and `files(operation="content", file_id=...)`. Read only; never save there.
3. **Offers** - the Knowledge file `Lead magnets` in the workspace's top folder, when it exists (`knowledge(operation="list", q="Lead magnets")`, match the exact name, then `knowledge(operation="get", file_id=...)`).
4. **Files the user provided** - briefs, transcripts, case studies.
5. **Past campaigns** - `campaigns(operation="list", client_id=...)`, and when relevant their plan files: `knowledge(operation="list", tag="campaign-<campaign id>")`, then `get`.

If there is no research and the user gave no context, offer to run client-research (part of knowledge-setup) first. When the client has no strong offer, run the lead-magnet stage first.

**When the offer or audience is unclear**, ask the user at most 3 questions, all in one message. Otherwise draft the plan with sensible defaults and state your assumptions.

## Planning Principles

### 1. Campaign Size
When the user or the calling agent sets a lead target, size the plan to it. Otherwise each campaign targets at least 5,000 contacts: combine small audiences or broaden targeting rather than creating tiny campaigns.

### 2. Segments Are Sub-ICP Groups, Not A/B Tests
Outside `percentage` mode, segments divide the list so each group gets more relevant messaging. They never test messaging angles against each other.

**Split by:** sub-industry ("Healthcare SaaS founders" vs "FinTech SaaS founders"), title ("CEOs" vs "VP Marketing"), company stage ("Seed" vs "Series A-B"), or behavior ("hiring SDRs" vs "using a competitor"). A funding round is not a buying event: plan to what the money pays for (hiring, a launch, a new market), never to the raise itself.

**Each segment gets** messaging tailored to its pains and language, proof points that match its context, and CTAs that fit its buying process. Test hooks with email-step A/B inside a segment, so segment analytics stay clean (you learn which sub-ICP responds).

- Good segments: DevTools SaaS founders (Zenarmor case study), HR/Recruiting SaaS founders (Emissary case study), Healthcare SaaS founders (Performance Health Partners case study).
- Not segments: "Guarantee hook", "Pain agitation", "Social proof". To test those, use `percentage` mode arms.

### 3. Separate Campaigns
Different broad ICPs (titles, industries, company sizes, personas) and different offers (products, lead magnets: demo, PDF, audit, webinar) each need their own campaign.

### 4. Vertical Separation
- **Separate campaigns** when verticals need different offers, value props, or buying processes (Healthcare vs Insurance; DTC vs B2B SaaS; Enterprise vs SMB).
- **Segments in one campaign** when it is the same type of person serving different end-markets (B2B SaaS founders by vertical): match industry case studies, pains, and similar companies per segment.

Rule of thumb: a fundamentally different person (title, buying process) means a separate campaign; the same person in a different context means a segment.

### 5. Default Segment
The backend creates a Default segment with every campaign. Plan it like any other segment: it catches every qualified lead that fits no numbered segment, gets its own angle and sequence, and later binds to the existing Default row (`isDefault=true`), never a new one. Never leave it without a sequence: leads that fall through still need email.

### 5a. Designing Segments for AI Assignment
Assignment is one choice question per lead over the segment descriptions. Make it easy:
- 1-5 audience segments plus Default, with mutually exclusive, self-contained descriptions. Each names its own observable signals (titles, company type, industry cues, size, geo) and never refers to another segment.
- The assigner lists Default last with fixed fallback text and stores it whenever confidence is below 0.6. A genuine catch-all Default keeps that safe.
- Qualification runs in the same evaluation (a lead is qualified above 0.40), and opt-in lead scoring reuses its fields. Keep the broad-ICP wording consistent across qualification, segments, and scoring.

### 5b. Multi-list Targeting and Manual Segments
A campaign can hold several search imports (campaign lists). When the broad ICP spans groups that should stay separable (e.g. SaaS founders + agency founders):
1. Plan separate filters per group in ken-search, not one OR of every industry, unless the user wants one blended list.
2. Import each list separately into the same campaign; split volume half/half by default or by the user's weights.
3. Qualification still covers the union (SaaS **or** agency); it does not replace the list split.
4. Prefer `manual` segments when the split is filterable; use `ai` only when filters cannot express it.
5. Record in the plan: `Import mode: multi_list`, the list shares, and the segmentation mode.

### 6. Campaign Goals
Every plan names an **Email Goal** (positive replies, clicks, or both) and an **End Goal** (meetings, trials, sign-ups, demos). E.g. positive replies -> meetings booked; clicks -> free-trial sign-ups. Opens are never a goal or a metric.

### 7. Analytics-Driven
Campaigns also serve market research (which segments engage), message testing (which hooks land), and offer validation (what buyers want).

### 8. Copy & CTA Conventions (carry into every segment)
State these in the plan so they flow to campaign-strategy, email-copywriting, and email-review:
- **The offer drives every email.** Every email closes by asking for the actual offer (demo, walkthrough, call, sample), **including Email 1**. Never open with a soft diagnostic question as a fake CTA.
- **Short and punchy.** Static bodies stay at or under ~80 words; follow-ups well under.
- **No salesy follow-up endings.** The final email never announces itself ("Last note from me", "just following up").
- **Variable + signature format.** AI variables use double braces around a Title Case name. Every email signs off `{sender_first_name} {sender_last_name} - [title] at [linked client company]`. `{sender_signature}` is deprecated.

## Plan Contents

The plan covers: campaign name (the H1), date, executive summary, client context, Email and End goals, the offer and the exact CTA, the broad ICP, the audience (key search filters, estimated lead count, import mode), qualify and disqualify rules (short; never restating filters), the copy conventions, the segmentation mode, and the segments. Each segment (Default first) has a sub-ICP, an angle, relevant proof, and a 2-6 step sequence outline. Percentage-mode arms carry a weight and a sequence hypothesis instead.

Every offer, price, guarantee, case study and metric in the plan comes from the research or the user. Never invent one; a lead magnet goes in the plan only when it exists or the client agreed to build it.

Full templates (AI mode, percentage mode, improvement-driven) and the plan file's layout: `references/plan-template.md`.

## Workflow

1. **Gather context** (above) and decide whether to ask questions.
2. **Identify opportunities** - what hasn't been tested, what might work better.
3. **Size the market** - estimate the audience with a count: `search(operation="search-people", body={<filters>, "page": 1, "pageSize": 1})`, reading `totalResults` (filter keys in the ken-search skill). Adjust the ICP until it fits the target.
4. **Design segments** (or arms) for the mode.
5. **Draft the plan in chat** for review (H1 = intended campaign name).
6. **Get explicit approval** before any platform write.
7. **Create the Draft campaign and store the plan** (below).
8. **Hand off** with the `campaign_id` to the next stage, ken-search, then qualification, segmentation, the per-segment loop, configuration and verify (Handoff below).

## Create the Draft Campaign (MCP)

Campaigns are always born Draft; never set a status.

```
campaigns(
  operation="create",
  name=<plan H1 campaign name>,
  contact_limit=<desired contacts>,
  client_id=<client_id>
)
```

Workflows and data sources are set later by the campaign-configuration stage. The MCP tools cannot switch a campaign into A/B (percentage) mode; the user turns on A/B test segments for the campaign in the app. The switch is accepted only once every active segment, Default included, is an `ab_test` arm with weights summing to 100, so for a percentage-mode plan the segmentation stage prepares the segments first and then asks the user to turn the mode on.

Report the `campaign_id` and where the plan is stored. The Default segment already exists; segmentation updates its description later.

## Store the Plan

The plan is campaign notes, not a file attachment. Where it lives:

- **Workspace with Knowledge** (`knowledge` feature on): ONE Knowledge file per campaign, named `Campaign plan - <campaign name>`, in the workspace's top folder (the folder named after the workspace: `knowledge(operation="folders-list")`), tagged `campaign-plan` and `campaign-<campaign id>`.
  1. Look for it first: `knowledge(operation="list", tag="campaign-<campaign id>")`. Never create a second one.
  2. None: `knowledge(operation="create", folder_id=<top folder id>, name="Campaign plan - <campaign name>", body=<plan markdown>, tags=["campaign-plan", "campaign-<campaign id>"])`.
  3. Found: `knowledge(operation="get", file_id=...)` for its `version`, then `knowledge(operation="update", file_id=..., base_version=<version>, body=<plan markdown>)`. To change one section only, send `section={"heading": "<heading text>", "body": ...}` instead of `body`: it replaces that heading's content and keeps the rest. A stale `base_version` answers `version_conflict`: get the file again and redo the edit.
- **No Knowledge**: show the plan in the conversation and say plainly it is not saved in the workspace. Do not save it anywhere else.

The same file holds the later stages' notes, each under its own `##` heading: `## Search Filters`, `## Strategy - <segment name>` per segment, `## ICP Voice Card - <segment name>`, and `## Improvement log`. The parts that run (segments, sequences, prompts, settings) are always saved on the campaign itself.

`knowledge` operations are staff-only unless the workspace has the `knowledge` feature. When the top folder's `canEdit` is false or create answers 403, keep the plan in the conversation and tell the user a workspace admin can save it in Knowledge.

## Handoff

The campaign is built by the stages of `create-campaign`, in this order, each anchored on the same `campaign_id`. ken-search is a skill of its own; qualification and prompt-writer are playbooks of `knowledge-setup` (`load_skill(name="knowledge-setup", reference="references/<playbook>.md")`, which loads in every workspace); every other stage is a reference of create-campaign, opened with `load_skill(name="create-campaign", reference="references/<stage>.md")`:

1. **ken-search** - build and save filters; adds `## Search Filters` to the plan file
2. **qualification** - save the qualification prompt
3. **segmentation** - update Default and create segments (AI, manual, or percentage arms)
4. **Per segment, Default included**: campaign-strategy (writes `## Strategy - <segment name>`) -> email-copywriting -> email-review -> prompt-writer (the AI variable prompts)
5. **campaign-configuration**, then **verify-campaign**

A person approves the launch. No stage sends, test-sends or launches on its own.

## Improvement Context

When the conversation carries prior campaign learnings (`prior_learnings`, `trigger: "analytics"`, or `analytics_context`), build the new plan on them: lead the summary with what worked and failed, refine or expand sub-ICP segments or test a new offer, never repeat a failed angle unmodified, and log the link in the `## Improvement log` of the source campaign's plan file. Check reply classification and bounces before you call an angle a failure. Detection, the context object, planning modes, and the log format: `references/improvement-context.md`.

## Recruiting campaigns

A recruiting campaign (`kind` `recruiting`, with a `roleId`) fills one role. Read the role with `roles(operation="get", role_id=<role id>)` (staff, or a workspace with the `recruiting` feature; anyone else reads the role on its page in the app). The plan has the same shape, with these changes:

- Offer: the role pitch. The title, the hiring company, the place and remote policy, the pay range when the role has one, and one concrete reason the job is good (scope, team, stack). Never invent pay or perks.
- Call to action: a reply, or a short call with the recruiter. Never a demo, a trial or a meeting about buying.
- Audience: the people who could do the job, described by what a profile shows. Search for them with the ken-search skill's Recruiting campaigns section.
- Qualification: the role's must-haves, as in the Recruiting campaigns section of knowledge-setup's `qualification` playbook. Nice-to-haves never disqualify.
- Segments: angles for why someone would move, as in the segmentation stage's Recruiting campaigns section.
- Channels: by default LinkedIn first (a connection request with a short note, then a message that goes as InMail when they did not connect), then work email only when LinkedIn did not reach them. Plan the email steps as that fallback: every email must make sense to someone who never saw the LinkedIn messages. When the user asks for one channel, plan that channel only: email only means work email steps and no LinkedIn steps, LinkedIn only means the LinkedIn steps and no email.
- Size: a candidate count the user gives ("up to 25 candidates") is the campaign's `contact_limit`. It caps what is sourced, so an audience larger than the count is fine: never narrow the audience, or a place the user named, to fit it.
- Never plan on age, gender, race, religion, disability, family status or nationality.

A recruiting draft is created from its role: the builder link the role-intake skill shares, or the role's page in the app. When you create the draft yourself, pass `kind` `recruiting` and the `role_id` to the create call above. Never plan a sales campaign for a role.

## Errors

Platform tools return a normalized error envelope (`success: false`, `error.category` among `plan_limit` | `billing` | `permission` | `validation` | `not_found` | `transient` | `unknown`). On `plan_limit` or `billing`, surface `error.message` and `error.recovery.summary`; never retry blindly. An operation that is not listed for you, or answers `not_found` on every id, is off for this workspace: say so in one sentence and carry on without it (no Knowledge means the plan stays in the conversation). Never retry it.
