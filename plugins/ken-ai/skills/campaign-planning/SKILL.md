---
name: campaign-planning
description: Create comprehensive campaign plans for cold email outreach. A campaign plan is 1 broad ICP + 1 offer + multiple segments that divide the list into sub-ICP groups for more relevant messaging. Use when starting a new campaign planning cycle or when the user wants to plan segments. Triggers on requests like "plan campaigns for [client]", "create a campaign plan", "what campaigns should we test", or when referenced by the campaign-planning command.
model: opus
thinking: true
---

# Campaign Plan Skill

Generate strategic campaign plans that define a broad ICP and offer, then split the prospect list into sub-ICP segments for more relevant, targeted messaging.

## Parser Contract

The folder layout this skill creates is consumed by the `campaign-configuration` skill's plan parser. See [parser-contract.md](../campaign-configuration/references/parser-contract.md) for the full spec. Hard rules this skill must honor:

- Plan folder: `{workspace}/{mm-dd} - plan {n}/`.
- Audience segment folders: `N - {slug}/` where `N` starts at 1 and slug is lowercase-hyphen (`re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")`).
- Default segment folder is literal `0 - default/` (no variation). Always scaffolded alongside the audience segments.
- The segment folder slug must match what segmentation.md's `### Segment N: Name` slugifies to - decide the name and slug together.
- `plan.md` has a single top-level `# {Campaign Name}` H1 that the parser uses as the Ken AI campaign name.

## Campaign Model

A campaign plan is:
- **1 broad ICP** + **1 offer** + **multiple segments**
- Different broad ICPs or different products = different plan folders
- 1 plan folder = 1 campaign on Ken AI

A plan runs in one of two **mutually-exclusive segmentation modes** (see the Campaign Modes section below):
- **`ai` (default)** - segments divide the list into sub-ICP groups (by industry, title, company stage, etc.), each with tailored messaging. Contacts are assigned by AI criteria.
- **`percentage`** - a **sequence A/B test**: segments are random %-distribution arms, each running a totally different email sequence, to test entire sequences against each other.

## Campaign Modes

There are three distinct kinds of "A/B testing" in this system. Pick the right one:

| Kind | What it tests | How | When |
|------|---------------|-----|------|
| **Sub-ICP segmentation** (`ai` mode) | Relevance, not a test - which sub-group responds | AI assigns contacts to segments by criteria; each segment has tailored messaging | Default. The broad ICP splits into meaningfully different sub-groups |
| **Sequence A/B test** (`percentage` mode) | Entire email sequences against each other | Random % distribution across arms (weights sum to 100); each arm a totally different sequence | Testing fundamentally different sequences, structures, or offers on the same audience |
| **Email-step A/B** (variants) | One element inside a step (subject, hook, CTA, PS) | `### Variant A/B` within an email step in `emails_v2.md` (handled by campaign-strategy / email-copywriting) | Refining HOW a single step is delivered - lightweight, works inside any mode |

Rules:
- A plan is **either** `ai` **or** `percentage`, never both. Different broad ICPs/offers still go in separate plan folders.
- In `percentage` mode the segments are A/B arms, not sub-ICPs - they get **weights**, not criteria, and the messaging difference is the whole point of the test.
- Email-step A/B (variants) is orthogonal and can be used inside either mode.

## Workspace

All campaign work happens inside a client workspace folder. `{workspace}` = the client's campaign workspace, default `./ken-campaigns/{client-slug}/` under the current directory (the `/ken-ai:new-campaign` command creates or confirms it). It holds `research.md`, optional `notes.md`, any supporting files the user drops in, and one plan folder per campaign.

## Required Context

Before creating a plan, load ALL available client data:

1. **Read `{workspace}/research.md`** - Client research: ICP, value prop, pain points, angles, case studies (produced by the client-research skill or provided by the user)
2. **Read `{workspace}/notes.md`** (if it exists) - Client-specific preferences and feedback
3. **Read any files the user provided** - Briefs, transcripts, lead magnets, case studies
4. **Read past plan folders in `{workspace}/`** - Past strategies, what worked/didn't work
5. **Confirm the Ken client** - call the ken-ai MCP tool `api_client_manage` (operation="list"), have the user confirm which client this campaign belongs to, and carry the `client_id` forward (campaign-configuration stores it in configuration.json)

If `research.md` is missing and the user provided no context, offer to run the client-research skill (optionally preceded by website-scraping) before planning.

## Planning Principles

### 1. Minimum Viable Campaign Size
Each campaign MUST target at least 5,000 contacts. Don't create campaigns for smaller segments - combine them or broaden targeting.

### 2. In `ai` Mode, Segments Are Sub-ICP Groups (Not A/B Tests)

**This principle applies to the default `ai` mode.** If you are intentionally running a **sequence A/B test**, use `percentage` mode instead (see Campaign Modes above) - there the segments ARE the test arms, by design.

**CRITICAL (ai mode)**: Segments divide the prospect list into sub-ICP groups so each group gets more relevant messaging. They are NOT for accidentally testing different messaging angles against each other.

**Segments split the list by:**
- **Sub-industry/vertical**: e.g., "Healthcare SaaS founders" vs "FinTech SaaS founders"
- **Title/role**: e.g., "CEOs" vs "VP Marketing" vs "Head of Growth"
- **Company stage**: e.g., "Seed-stage" vs "Series A-B" vs "Growth-stage"
- **Behavior/signal**: e.g., "Currently hiring SDRs" vs "Using competitor tools"

**Each segment gets:**
- Messaging tailored to that sub-group's specific pain points and language
- Relevant case studies and proof points that match their context
- CTAs that resonate with their buying process

**For testing in `ai` mode, use email-step A/B**, not the segments:
- The email-copywriting skill creates A/B variants within each segment
- Different subject lines, hooks, or CTAs can be tested per email
- This keeps segment-level analytics clean (you know which sub-ICP responds best)

**Good ai-mode segments:**
- Segment 1: DevTools/Infrastructure SaaS founders - case study from Zenarmor
- Segment 2: HR/Recruiting SaaS founders - case study from Emissary
- Segment 3: Healthcare SaaS founders - case study from Performance Health Partners

**These are NOT ai-mode segments - if you want this, switch to `percentage` mode (a deliberate sequence A/B test):**
- Arm 1: "Guarantee hook" sequence
- Arm 2: "Pain agitation" sequence
- Arm 3: "Social proof" sequence

### 3. What Requires Separate Plan Folders

Things that require separate plan folders (separate campaigns on Ken AI):
- **Different broad ICPs**: Different titles, industries, company sizes, personas
- **Different offers**: Different products, lead magnets (demo, PDF, audit, webinar, etc.)

### 4. Vertical Separation

When the client's prospects span fundamentally different industries (e.g., healthcare vs fintech vs ecommerce), there are two approaches:

**Option A: Separate plan folders** - when verticals need completely different offers, value props, or buying processes
- Healthcare vs Insurance vs Financial Services
- E-commerce DTC vs B2B SaaS vs EdTech
- Enterprise vs Mid-market vs SMB

**Option B: Segments within one plan** - when the broad ICP is the same type of person (e.g., "B2B SaaS founders") but they serve different end-markets. Use segments to:
- Match industry-relevant case studies and proof points
- Tailor pain points and language to each sub-vertical
- Reference similar companies in their space

**Rule of thumb**: If the person you're emailing is fundamentally different (different title, different buying process), use separate plans. If it's the same type of person in different contexts, use segments.

### 5. Default Segment Catchall
Ken AI auto-creates a "Default" segment as a catchall for contacts that don't match any segment criteria. Planning must always include a Default segment with its own authored copy: it gets the `0 - default/` subfolder (strategy.md, emails_v2.md, prompts.md) like any other segment, but it binds to the backend's auto-created Default segment (`isDefault=true`) rather than creating a new row. Never leave it with an empty sequence - contacts that fall through segmentation still need to receive emails.

### 6. Campaign Goals
Every plan needs two goals to optimize against:

- **Email Goal**: What success looks like in the inbox - positive replies, clicks, or both
- **End Goal**: The business outcome we're driving toward - meetings, free trials, sign-ups, demos, etc.

Examples:
- Email Goal: Positive replies -> End Goal: Meetings booked
- Email Goal: Clicks -> End Goal: Free trial sign-ups
- Email Goal: Positive replies + clicks -> End Goal: Demo requests

### 7. Analytics-Driven
Campaigns can be used not just for conversion but for:
- Market research (which segments engage?)
- Message testing (which hooks resonate?)
- Offer validation (what do they want?)

### 8. Copy & CTA Conventions (carry into every segment)
State these in the plan so they flow down to campaign-strategy, email-copywriting, and email-review for every segment and the offer/CTA stay consistent:
- **The offer drives every email.** Every email closes by asking for the actual offer (demo, walkthrough, call, sample), **including Email 1**, which leads with the strongest version of that ask. Never open the sequence with a soft diagnostic question ("do you have a system for X?", "a quick look") - that is not a CTA.
- **Short and punchy.** Static email bodies stay at or under ~80 words (follow-ups well under). Concise always wins; email-review enforces a hard ceiling.
- **No salesy follow-up endings.** The final email never announces itself ("Last note from me", "just following up").
- **Variable + signature format.** AI variables use double braces `{{Title Case}}`; signatures use `{sender_signature}` on every email. See [parser-contract.md](../campaign-configuration/references/parser-contract.md).

## Output Format

Generate `plan.md` with this structure:

```markdown
# Campaign Plan: {Client Name}
**Date**: [mm/dd/yyyy]
**CSM**: [Name - ask the user for the sign-off name if unknown]

## Executive Summary
[1-2 sentence overview - what broad ICP, what offer, what segments we're testing]

## Client Context
- **Primary ICP**: [from research.md]
- **Main Value Prop**: [from research]
- **Available Lead Magnets**: [list]
- **Past Learnings**: [from campaigns/]

## Broad ICP
[Description of the overarching ICP - titles, seniority, industries, company size, geography]

## Offer
[The single product/service/lead magnet being offered]

## Segmentation Mode
[`ai` (sub-ICP segmentation, default) or `percentage` (sequence A/B test). Must match `## Segmentation Mode` in segmentation.md.]

## Segments

### Default Segment
- **Folder**: `0 - default/`
- **Sub-ICP**: Catch-all for qualified contacts that don't fit any numbered segment.
- **Tailored Messaging**: {Broadest framing of the offer - no segment-specific hooks}
- **Relevant Proof**: {Most universal case studies or data points}

### Segment 1: {Name}
- **Folder**: `1 - {slug}/`
- **Sub-ICP**: {Who is in this segment - industry, title, company stage, etc.}
- **Tailored Messaging**: {How messaging is customized for this sub-group}
- **Relevant Proof**: {Case studies, references, or data points that resonate with this group}

### Segment 2: {Name}
- **Folder**: `2 - {slug}/`
- **Sub-ICP**: {Who}
- **Tailored Messaging**: {How}
- **Relevant Proof**: {What proof}

### Segment 3: {Name}
- **Folder**: `3 - {slug}/`
- **Sub-ICP**: {Who}
- **Tailored Messaging**: {How}
- **Relevant Proof**: {What proof}

```

**Percentage mode (sequence A/B test)** - replace the Segments section with weighted arms instead of sub-ICPs. The Default is **one of the test arms - use it as the baseline / control** (put the variant the others are measured against in `0 - default/`). It carries its own weight like any arm, so ALL arm weights including the Default must sum to exactly 100:

```markdown
## Segmentation Mode
percentage

## Segments

### Default Segment (baseline / control arm)
- **Folder**: `0 - default/`
- **Weight**: 34
- **Role**: Baseline / control arm - the variant the other arms are measured against. Carries real weight and gets that share of A/B traffic. Runs its own sequence.

### Arm 1: {Name}
- **Folder**: `1 - {slug}/`
- **Weight**: 33
- **Sequence hypothesis**: {What this entire sequence tests - structure, angle, or offer}

### Arm 2: {Name}
- **Folder**: `2 - {slug}/`
- **Weight**: 33
- **Sequence hypothesis**: {...}
```

All weights (the numbered arms **plus** the Default control arm) must be integers summing to exactly 100 - the backend rejects any other total at launch. (If you leave the Default's weight off, the parser back-fills it as the remainder `100 - sum(arms)`, so arms summing to ≤99 also work, with the Default absorbing the rest.) Each arm, the Default included, still gets its own `strategy.md` / `emails_v2.md` / `prompts.md` - the whole point is that each arm runs a totally different sequence. The `- **Weight**: N` lines must be mirrored in segmentation.md (that's the file the parser reads weights from).

## Folder Structure

```
{workspace}/
└── {mm-dd} - plan {n}/
    ├── plan.md
    ├── filters.json         # From ken-search
    ├── qualification.md     # From qualification
    ├── segmentation.md      # From segmentation
    ├── configuration.json   # From campaign-configuration
    ├── 0 - default/         # Default segment (always scaffolded)
    │   ├── strategy.md
    │   ├── emails.md
    │   ├── emails_v2.md
    │   └── prompts.md
    ├── 1 - {segment-slug}/
    │   ├── strategy.md
    │   ├── emails.md
    │   ├── emails_v2.md
    │   └── prompts.md
    ├── 2 - {segment-slug}/
    └── 3 - {segment-slug}/
```

**Default segment note**: `0 - default/` always exists. It gets authored copy like any other segment and is dispatched to `campaign-strategy`, `email-copywriting`, `email-review`, and `prompt-writer` subagents alongside the numbered segments.

## Workflow

1. **Gather Context**: Read all client files to understand ICP, past performance, available assets
2. **Identify Opportunities**: What haven't we tested? What might work better?
3. **Size the Market**: Ensure the broad ICP can hit 5k contacts minimum
4. **Design Segments**: Create 2-5 segments based on sub-ICP characteristics (industry, title, company stage, etc.)
5. **Document Plan**: Write plan.md to the plan folder

## Campaign Folder Naming

**Plan folders**: `mm-dd - plan [n]`
- mm-dd = current date (e.g., 01-08)
- [n] = auto-increment by checking existing folders

**Segment folders**: `{n} - {segment-slug}`
- {n} = segment number (1, 2, 3...)
- {segment-slug} = descriptive slug representing the sub-ICP group
  - Examples: `healthcare-saas`, `fintech-founders`, `vp-marketing`, `series-a-stage`

## Integration with Downstream Skills

The plan.md serves as the master reference. Files are split between plan-level and segment-level:

**Plan-level files** (shared across all segments):
- `filters.json` - From ken-search skill
- `qualification.md` - From qualification skill
- `segmentation.md` - From segmentation skill
- `configuration.json` - From campaign-configuration skill

**Segment-level files** (unique per segment):
- `strategy.md` - From campaign-strategy skill
- `emails.md` - From email-copywriting skill (draft)
- `emails_v2.md` - From email-review skill (reviewed final version)
- `prompts.md` - From prompt-writer skill

## Subagent Execution Model

### Plan-Level Skills (Sequential, Main Context)

Plan-level skills run sequentially in the main context:

```
1. ken-search {plan_folder}     -> filters.json
2. qualification {plan_folder}  -> qualification.md
3. segmentation {plan_folder}   -> segmentation.md + segment folders
```

### Segment-Level Skills (Parallel Subagents)

Then per-segment skills run as parallel subagents:

**Subagent Prompt Template:**
```
Execute segment: {segment_name}
Segment folder: {segment_folder_path}
Plan folder: {plan_folder_path}
Client: {client_slug}

1. Read plan.md from plan folder for strategic context
2. Read client context ({workspace}/research.md, plus {workspace}/notes.md if present)
3. Execute sequentially:

   Step 1: campaign-strategy {segment_folder}
   → VALIDATE: strategy.md exists

   Step 2: email-copywriting {segment_folder}
   → VALIDATE: emails.md exists

   Step 3: email-review {segment_folder} (LOOP max 3 iterations)
   → CHECK: emails_v2.md exists? YES → continue, NO → re-run copywriting+review

   Step 4: prompt-writer {segment_folder}
   → VALIDATE: prompts.md exists
```

### Post-Segment Configuration

After all segment subagents complete:
```
campaign-configuration {plan_folder}
→ VALIDATE: configuration.json exists
```

### Execution Modes

**Parallel Execution (Auto Mode):**
Launch all segment subagents simultaneously - dispatch them in parallel in a single step so they run concurrently. This maximizes throughput.

**Sequential Execution (Approval Mode):**
Run one segment at a time, pausing between segments for user approval.

## Improvement Context Integration

When invoked with prior campaign learnings, incorporate analytics insights into new plan design.

### Detecting Improvement Context

Check for improvement context in the conversation:
- `mode: "create"` with `prior_learnings` indicates improvement-driven planning
- `trigger: "analytics"` indicates data-driven iteration
- `analytics_context` contains performance data from previous campaigns

### Improvement Context Object

```json
{
  "mode": "create",
  "trigger": "analytics",
  "source_skill": "manual",
  "prior_learnings": {
    "winning_angle": "Guarantee messaging with gift incentive",
    "winning_metrics": {
      "open_rate": 45.2,
      "click_rate": 12.3,
      "reply_rate": 4.1
    },
    "failed_angles": ["ROI focus", "Cost savings"],
    "weak_spots": ["Email 3 opens", "Email 4 replies"],
    "successful_icp": "CEO, Founder, VP Marketing at B2B SaaS 51-500 employees",
    "recommendation": "Test guarantee angle with new ICPs or variations"
  },
  "source_plan": {
    "plan_folder": "{workspace}/01-12 - plan 1",
    "test_variable": "Messaging Angle",
    "hypothesis": "Guarantee messaging reduces perceived risk"
  }
}
```

### Incorporating Learnings into New Plans

When improvement context is provided:

1. **Reference prior learnings in Executive Summary**
   ```markdown
   ## Executive Summary
   Building on learnings from Plan 1 (01-12), where guarantee messaging outperformed ROI focus
   (45% vs 38% open rate, 4.1% vs 2.3% reply rate). This plan tests the winning angle with
   new segments to find the best messaging variation.
   ```

2. **Update Client Context with Learnings**
   ```markdown
   ## Client Context
   - **Past Learnings**:
     - Guarantee messaging outperformed ROI focus (+1.8% reply rate)
     - Gift incentive creates curiosity and memorability
     - Email 3 subject lines need improvement (15% drop-off)
   ```

3. **Design Segments that Build on Winners**
   - If winning sub-ICP found: Double down with more granular sub-segments within that group
   - If a sub-ICP underperformed: Consider excluding or adjusting messaging for that group
   - Apply winning messaging patterns across all segments while tailoring proof points


### Planning Modes with Improvement Context

**Mode A: Refine Sub-ICP Segments**
- Keep offer constant
- Add, remove, or adjust sub-ICP segments based on which groups responded best
- Goal: Better targeting and more relevant messaging per group

**Mode B: Expand to New Sub-ICPs**
- Keep offer constant
- Add new sub-ICP segments not previously targeted (new industries, titles, company stages)
- Goal: Find new responsive audiences

**Mode C: New Offer or Variable**
- Keep winning sub-ICP segments
- Test new offer, lead magnet, or campaign element - may require a new plan folder
- Goal: Improve conversion with proven audiences

### Linking Plans

When creating a new plan based on improvement context:

1. **Reference source plan** in plan.md metadata
   ```markdown
   **Based On**: Plan 1 (01-12) - Messaging Angle Test
   **Source Learnings**: Guarantee angle won, ROI angle lost
   ```

2. **Create cross-reference** in source plan's improvement-log.md
   ```markdown
   ## 2026-01-17: New Plan Created Based on Learnings

   **Trigger**: Performance analysis showed clear winner
   **Decision**: Iterate on winning angle with new segment variations
   **New Plan**: {workspace}/01-17 - plan 2/
   **Test Variable**: Messaging refinement
   ```

### Workflow with Improvement Context

1. **Load improvement context** (prior campaign learnings, if provided)
2. **Read source plan** (plan.md from prior_learnings.source_plan)
3. **Analyze what was learned** (winning patterns, failed patterns)
4. **Design new plan** with segments that build on learnings
5. **Reference source** in new plan documentation
6. **Log cross-reference** in source plan's improvement-log.md
7. **Execute segments** as normal (parallel or sequential)

### Avoiding Repeated Mistakes

When `failed_angles` provided:
- Do NOT repeat failed messaging unless significantly modified
- Document why approach is different if revisiting similar territory
- Set clear hypothesis for why this iteration will work

### Improvement-Driven Plan Template

```markdown
# Campaign Plan: [Client Name] - Iteration [N]
**Date**: [mm/dd/yyyy]
**CSM**: [Name - ask the user for the sign-off name if unknown]
**Based On**: [Source Plan Reference]

## Executive Summary
Building on learnings from [source plan], this plan tests [what we're testing].

## Prior Learnings
- **What Worked**: [winning patterns]
- **What Failed**: [losing patterns]
- **Key Insight**: [main takeaway]

## Broad ICP
[Same ICP or expanded ICP based on learnings]

## Offer
[Same or refined offer]

## Segments
[New segments designed based on learnings]

```

## Output Handling

After generating the plan:

1. **Create plan folder**: `{workspace}/{mm-dd} - plan {n}/`
2. **Write plan.md**: Save to the plan folder
3. **Create segment folders**: Create empty folders for each segment
4. **Report**: Tell the user the plan is ready and show the segments to be created
5. **Mode check**: If approval mode, wait for user approval before launching subagents
6. **Launch subagents**: Execute segments according to mode (parallel/sequential)
