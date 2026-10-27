# Campaign Strategy Skill

Transform client research and the campaign plan into an actionable email strategy for **one segment**: a sequence blueprint and AI personalization variables for email-copywriting and prompt-writer to execute. Save it as the `## Strategy - <segment name>` section of the campaign's plan file in Knowledge.

## Workflow Position

Runs after campaign-planning and segmentation, once per segment (Default included). Then: **email-copywriting** drafts and pushes the live sequence, **email-review** scores it, **prompt-writer** pushes and tests the AI variables, **campaign-configuration** applies settings, and **verify-campaign** runs read-only launch checks. Never skip to copy without a strategy for that segment.

## Inputs

- **campaign_id** (required) - anchor for every plan and segment read and write.
- **Segment** (required) - `segment_id` or name. Resolve a name with `segments(operation="list", campaign_id=...)`; if several match, list them and ask.
- **client_id** - resolve with `workspace(operation="list")` once per conversation; on a multi-workspace error, retry with the explicit `client_id` the error lists.
- **Campaign goal** - book demos or meetings, drive landing-page clicks, get replies for qualification, or promote a lead magnet.

You need the plan (broad ICP, this segment's criteria and angle, the offer and CTA, any Testing Hypothesis) and the client research (overview, ICP, value prop, case studies, lead magnets, preferences). Use what the conversation already holds and read only what is missing:

1. **Plan** - the campaign's Knowledge file: `knowledge(operation="list", tag="campaign-<campaign id>")`, then `knowledge(operation="get", file_id=...)`. Without Knowledge, the plan is in the conversation.
2. **Research** - `knowledge(operation="context", purpose="write the email strategy for one segment")` when the workspace has Knowledge (its `stable` part holds the company files, instructions and writing style); otherwise the workspace company context (`workspace(operation="get", workspace_id=...)`). Older workspaces may hold `research.md` and `notes.md` as workspace files, which a workspace admin can read with `files(operation="list")` and `files(operation="content", file_id=...)`.
3. **Live segments** - `segments(operation="list", campaign_id=...)`, so the target segment and its exact name are right.

Stop only when there is no plan or no research anywhere; then name the stage to run first (campaign-planning or client-research). Never invent the ICP, angle, offer, case studies or metrics.

**Section name**: `Strategy - <segment name>`, with the live segment's name exactly as stored. The Default segment's section is `Strategy - Default`.

## Strategy Document

The section sits inside the plan file, so its parts are `###` headings and each email is `####`:

```markdown
## Strategy - {Segment Name}

### Segment Overview
- **ICP**: {Broad ICP from the plan}
- **Segment**: {Segment criteria from the plan / the live segment}
- **Angle**: {Messaging angle from the plan}
- **Goal**: reply-based / click-based
- **Funnel Type**: {type}

### Email Sequence
Cadence: waitDays 0/3/4/4
[One blueprint per email, each under `#### Email N` - see Per-Email Blueprint]

### AI Personalization Variables
[One entry per variable - see AI Personalization Variables]

### AI Rewriting (Optional)
Enable: [yes/no]
Tone: [description]

### Sequence Tests (Optional)
[Only when it supports the plan's Testing Hypothesis]
```

## Core Principles

1. **Building blocks** - Treat copy and campaigns as modular blocks tested in many combinations; volume of combinations is how we learn what works (`references/building-blocks.md`).
2. **Start strong, diversify, close strong** - Email 1 uses the strongest angle, middle emails try new angles, the final email uses the second-strongest.
3. **Relevance over personalization** - Not just `{firstName}`: show real understanding of their world with AI variables from LinkedIn and the website.
4. **One idea per email** - One goal, one CTA, one main point.
5. **Value-first** - Every touch gives insight, education, or genuine help.
6. **Data constraints** - AI variables can use ONLY the company website main page, the LinkedIn company page, and the LinkedIn profile. No news, events, funding, or timely triggers.
7. **A funding round is not a buying event** - When the plan names a raise, write to what the money pays for (hiring, a launch, a new market). Never "congrats on the raise".

## Sequence Structure

- **2-6 emails, usually 3-5.** Follow the step count in the plan.
- **Wait days**: the wait on Email N is the days **before Email N sends**, counted from the previous email. Email 1 is `0`; follow-ups wait 2-4 days; the final email may wait up to 5. Send days 0/3/7/11 are wait days **0/3/4/4** (not cumulative). Putting the gap after Email N onto Email N is the common off-by-one. State the cadence once (`Cadence: waitDays 0/3/4/4`) and on each email (`**Delay:** N days`).
- **CTAs**: reply-based for meetings, click-based for lead magnets. **Every email asks for the actual offer, including Email 1**, which leads with the strongest version of that ask. No soft diagnostic questions as CTAs. Never send a naked booking link; ask a direct question first.
- **Length**: static bodies at or under ~80 words, follow-ups well under. email-review enforces a hard ceiling.
- **Format**: AI variables are double-brace Title Case tokens (e.g. `{{First Line}}`). Every email signs off with `{sender_first_name} {sender_last_name}` and the linked client company; `{sender_signature}` is deprecated.
- **Lead magnets**: you may recommend an asset for the client to create, but never reference or link one in the sequence unless the research proves it exists.

### Per-Email Blueprint

You are not writing the emails; you define what each one accomplishes. Give every email: **Goal**, **Delay**, **Hook** (what the first 1-2 lines do), **Content** (which value prop, case study, or insight), **Proof** (names, metrics, methodology), **CTA** (reply or click, and the exact ask for the offer), and **Tone** (style and length).

Be specific. Not "make it relevant" but "Open by asking if they've noticed [specific trend]; curious, not salesy." Not "add social proof" but "Include the 3x metric and two recognizable customers in their industry." Proof comes only from the research: never invent a customer, a metric or a result.

- **Email 1** - the best value prop or insight, relevance immediately, the most direct offer ask.
- **Middle emails** - each makes ONE distinct point (case study, different pain, lead magnet, industry insight), distinct from Email 1 and each other.
- **Final email** - the second-best angle, then the offer ask. It never announces itself ("Just following up", "Last note from me"); urgency comes from value.

Format and a full worked example: `references/email-sequence-guide.md`.

### AI Personalization Variables

Each variable is a name plus a description.

- **Name** - Title Case with spaces, 30 characters or fewer (`Subject Line`, `First Line`, `PS Line`). It must match exactly across this strategy, the `{{...}}` tokens in the copy, and the prompt-writer variable names. Name a recurring slot uniquely (`PS Line`, `PS Line 2`).
- **Description** - states all five: what to generate, the exact data source, tone, a length limit, and a fallback ("If [data] is not available, skip").
- **Default layout** - `First Line` + `PS Line` in Email 1 and `PS Line 2` in the last email only, not a first line and PS on every email.
- **Proven templates** - Subject Line: 3-4 words (max 6), lowercase except the first letter and proper nouns, no ending punctuation or emojis, one specific detail. First Line: under 20 words, no greeting, no question, an observation about their role, company, or market. PS Line: 1-2 casual sentences starting with "PS", one small profile detail, never an invented connection.

Data fields, more variable types, and depth levels: `references/ai-variables-guide.md`.

### AI Rewriting

Include the AI Rewriting section when the campaign uses AI personalization (first lines, PS lines, body variables), higher quality or variation is wanted, and the budget allows: rewriting spends model usage on every contact. Skip it when there are no AI variables, only subject-line variables (rewriting subjects is too risky), or the budget is tight. When enabled, prompt-writer adds rewriting steering and marks the non-subject variables for rewriting. Rewriting runs only while the campaign's Rewriting workflow (3) is attached; campaign-configuration checks it.

## Sequence Tests

Two A/B levels, don't confuse them:

- **Email-step A/B** (this skill) - Variant A / Variant B inside one step: subject, hook, body length, CTA phrasing, PS line, timing, proof placement. email-copywriting builds the variants on the sequence before launch.
- **Whole-sequence A/B** - campaign-planning's `percentage` mode: each arm is its own segment with a totally different sequence. Write each arm's sequence normally and usually skip in-step variants there.

campaign-planning owns ICP, messaging-angle, offer, and whole-sequence tests; never duplicate them. Rules:

- At most **1 test per strategy**, and it must support the plan's Testing Hypothesis (refine HOW, never change WHAT).
- Hold constant the ICP, angle, offer, and AI variables; vary one delivery element only.
- State a hypothesis and one primary metric: reply rate, positive (interested) reply rate, or click rate. Never opens.
- Propose only with 5,000+ prospects and two reasonable approaches. Skip for a first campaign, under 2,000 contacts, an already complex macro test, no clear hypothesis, or when the plan tests ICP.
- Variants are live A/B arms that send. On a live campaign, a copy change is a new version of the live steps, never a new Variant B; add a variant there only when the user asks for a new test.

Testable variables, the section format, examples, and anti-patterns: `references/sequence-tests-guide.md`.

## Workflow

1. Confirm `campaign_id`, `client_id`, and the target segment.
2. List live segments and take the segment's exact name (Default -> `Strategy - Default`).
3. Load the plan and research (above).
4. Read the references as needed.
5. Check for a sequence-test opportunity (optional, rules above).
6. Draft the full strategy in chat.
7. Get the user's approval.
8. Save it (below).
9. Hand off: run **email-copywriting** for this segment, then email-review and prompt-writer.

## Save (MCP)

**With Knowledge**: find the campaign's plan file (`knowledge(operation="list", tag="campaign-<campaign id>")`), read it with `knowledge(operation="get", file_id=...)` for its `version`, then write only this segment's section:

`knowledge(operation="update", file_id=..., base_version=<version>, section={"heading": "Strategy - <segment name>", "body": <strategy markdown>})`

The section update replaces that heading's content (or appends the heading when the file lacks it) and leaves the plan and the other segments alone. A stale `base_version` answers `version_conflict`: get the file again and redo the update. When no plan file exists yet, campaign-planning creates it (one file per campaign; never a second one). Then confirm:

> Strategy saved as `## Strategy - {segment_name}` in the campaign plan file on campaign `{campaign_id}` (`segment_id={id}`). Next: run **email-copywriting** for this segment, then email-review and prompt-writer.

**Without Knowledge**: show the approved strategy in the conversation and say plainly it is not saved in the workspace; the next stages read it from the conversation.

## Alignment Checklist

- [ ] Value props from the research run through the sequence
- [ ] Segment-specific pains drive the hooks
- [ ] The plan's angle shows in the messaging
- [ ] Funnel type matches the campaign goal
- [ ] Lead magnets (only real ones) appear at the right point
- [ ] AI variables are feasible with the allowed data sources
- [ ] Each email has a distinct purpose
- [ ] Wait days follow the before-email rule
- [ ] Variable names are Title Case, 30 characters or fewer, and match the planned tokens

## Edit Mode

With improvement context (`mode: "edit"`, a `trigger` of `analytics` or `feedback`, and an `improvement_instruction`), edit only the requested parts of the segment's strategy section: preserve the ICP, data constraints, funnel type, and core value prop unless told otherwise, show a before/after diff, save only after approval, tell the user which downstream stages to re-run, and add a dated entry to the plan file's `## Improvement log`. Check reply classification and bounces before you blame the strategy. Scopes, preservation rules, the diff format, and cascade rules: `references/edit-mode.md`.

## Errors

Platform tools return a normalized error envelope (`success: false`, `error.category` among `plan_limit` | `billing` | `permission` | `validation` | `not_found` | `transient` | `unknown`).

- **Auth / permission (401/403)** - ask the user to re-authenticate the MCP connection. Never fall back to pasted keys or other transports.
- **`plan_limit` / `billing`** - surface `error.message` and `error.recovery.summary`; never retry blindly.
- **`not_found`** - say what was missing; ask for the right id or run the stage that creates it. A `knowledge` operation that is not listed for you, or answers `not_found` on every id, means the workspace has no Knowledge (it is staff-only unless the `knowledge` feature is on): keep the strategy in the conversation. Never retry it.
- **`version_conflict`** - someone saved the plan file after your read: get it again and redo the section update.
- **`validation`** - fix the inputs (names, content size) and retry once after the user confirms.
