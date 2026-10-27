# Prompt Writer Skill

Write the AI personalization prompts (AI variables) for one campaign segment, save them, set optional rewriting steering, and test the outputs on real contacts. The platform runs these prompts per lead at send time. It generates the system prompts (Instructions, Company Context, Rules, Email Sequence) and the default rewriting rules; you write only the **user prompts** (`to_output: true`) and an optional rewriting steering paragraph.

Never send, test-send, launch, delete, restore, or revert anything, and never start or enable AI workflows. Removing a variable is the one delete this playbook makes, and only after the user asks for it.

**Where this fits:** after campaign-strategy and email-copywriting have set the AI variable names and placed their `{{Title Case}}` tokens in the sequence; before verify-campaign.

## Inputs

- **campaign_id** and **segment_id**. Resolve the segment with `segments(operation="list", campaign_id=...)` when the user only named it. With several workspaces, resolve `client_id` once with `workspace(operation="list")`.
- **Strategy AI variables** (name, placement, short description): from the caller, or campaign file `strategy/<segment-slug>.md` when the `files` tool is available (`files(operation="list", campaign_id=...)`, then `files(operation="content", file_id=...)`).
- **Live sequence:** `email_sequences(operation="segment-email-sequences-get", segment_id=...)`. Every `{{Title Case}}` token in a subject or body needs a prompt.
- **Saved prompts:** `prompts(operation="list", campaign_id=..., segment_id=...)`. The segment's AI variables are its `personalization` items with `toOutput` true; note each one's `id`, `name`, `toRewrite` and `order`.
- **Company context:** `companyContext` from `workspace(operation="get", workspace_id=...)` (the workspace id is the campaign's `clientId` in `data.campaign` below), plus research and client notes from the caller or workspace files `research.md` / `notes.md` (`files(operation="list")` without `campaign_id`) when `files` is available.
- **Data enrichments:** `campaign_ops(operation="status", campaign_id=...)`, field `data.campaign.campaignDataEnrichments` (see Data Source Constraints).

Prompts live on the platform; there is no local prompts file.

When the workspace has Knowledge on, an AI variable can be linked to a personalization prompt in Knowledge > Prompts. A linked variable follows that prompt while its text is unchanged; editing its text here makes it read as edited, and it stops following. Tell the user before you edit a linked variable; `load_skill(name="knowledge-setup", reference="references/knowledge-prompts.md")` shows how to read the links.

## Live constraints (HARD)

The platform enforces these. Breaking one fails the save or silently breaks the sequence.

| Constraint | Rule |
|------------|------|
| Variable name | Title Case plain text (`First Line`, `Subject Line`), no underscores, colons or special characters, **max 30 characters** |
| Prompt text | Non-empty, **max 4096 characters**, no `---` line inside |
| Name uniqueness | Unique after lowercase snake_case normalization (`Subject Line` collides with `subject_line`) |
| Sequence match | Names match the sequence's `{{Title Case}}` tokens exactly (`{{First Line}}` needs a variable named `First Line`) |
| One value per LEAD | One prompt produces one value per lead. A token reused in Emails 1-3 sends the same sentence three times (the approval view shows it filled on Email 1 and blank later - blank means reused, not missing). Distinct openers need distinct names (`First Line`, `Bump First Line`, `Nudge First Line`). Reuse is right only for an identical value, such as `{{Subject Line}}` on every subject. If the copy reuses a body token across emails, flag it back to email-copywriting instead of writing one shared prompt. |

**Good names:** `First Line`, `Subject Line`, `PS Line`, `Role Pain Point`
**Bad names:** `personalized_first_line`, `campaign_name:company_context`, `subject_line`

Keep it to 3-5 output variables per email: each one adds processing time, and over-personalizing every email is the most common operator complaint.

## Execution Tasks

Run these in order.

### Task 1: Load context
- [ ] Confirm `campaign_id` and `segment_id`.
- [ ] Read the data enrichments (Inputs). If the read fails or the list is empty, do not stop: use the safe defaults below.
- [ ] Read the live sequence and list every `{{Title Case}}` token.
- [ ] Read the segment's saved prompts.
- [ ] Load the strategy's AI variables, the company context, research and client notes.
- [ ] Read the prompt engineering guide: `load_skill(name="knowledge-setup", reference="references/prompt-engineering.md")`.

### Task 2: Draft user prompts (in chat)
- [ ] Expand each strategy variable (and every sequence token) into a full prompt.
- [ ] Base Subject Line, First Line, PS Line, Role Pain Point, Industry Context and Company Size Context on the Standard Variable Templates.
- [ ] Apply the Prompt Customization Rules (no examples in the standard variables).
- [ ] Use only valid data sources for this campaign.
- [ ] Include a **Subject Line** variable when the sequence uses `{{Subject Line}}`, from the template unless the strategy defined it.
- [ ] For a variable whose blank output would break the email (usually First Line), plan a `fallback_if_empty`: one plain-text sentence, no `|`, `{` or `}`.
- [ ] Show the full draft to the user for approval. Do not save yet.

### Task 2b: Rewriting steering (optional, recommended)
- [ ] Pull voice and tone cues from the company context, research, the live sequence and client notes.
- [ ] Draft 2-10 sentences on voice, sentence rhythm, sequence flow or campaign-specific anti-patterns (see Rewriting Instructions).
- [ ] Do not repeat platform defaults (no em-dashes, spam words, AI-tells, formatting).

### Task 3: Self-review (REQUIRED before saving)

One inline pass in the same turn; apply fixes, then present the revised draft if anything material changed. Checklist: `load_skill(name="knowledge-setup", reference="references/review-workflow.md")`.

Priority: conversation feedback, then client notes, then the strategy's variable set, then the Prompt Customization Rules, then data source constraints (non-negotiable).

**Reject or fix any prompt that:**
- references news, press, funding, events, non-LinkedIn social media or blog content;
- adds examples to First Line, PS Line or Subject Line (unless heavily customized);
- uses a PS format other than `PS: ` (not `PS -`, `PS.` or a bare `PS`);
- adds "Quick question" or typical outreach phrasing to the subject line;
- rewrites the PS or Subject Line template wholesale (slight changes only);
- puts lead-variable syntax (`{firstName}`) inside the prompt text;
- leaves a sequence token without a prompt, or a name that does not match its token.

### Task 4: Save (after user approval)

Each AI variable is its own prompt. Save them one call at a time; a save never touches a variable you do not name.

**4a. Save each variable.** A variable that is not saved yet:
```
prompts(operation="create", campaign_id=..., segment_id=..., flow="personalization", prompt_type="user",
        name="First Line", prompt="<text>", to_output=true, to_rewrite=1, order=2,
        fallback_if_empty="<one plain sentence>", confirm=false)
```
A variable that is saved already (same name in the saved prompts), when its text changed:
```
prompts(operation="update", prompt_id=..., changes={"prompt": "<text>"}, confirm=false)
```
- Save **every** sequence token plus Subject Line. A variable you leave out stays as it is: nothing is deleted by omission.
- `to_rewrite`: 0 for Subject Line and other short keep-as-is outputs, 1 for First Line, PS Line and body variables (see Rewriting Instructions). On an existing variable whose `toRewrite` is wrong, send `changes={"to_rewrite": 1}`.
- `order` is the run order within the flow (1, 2, 3, ...). Omit `fallback_if_empty` / `is_required_for_sending` on an update to keep the stored values.
- The save takes no model. When the user wants to compare a model, test it with `model_overrides` in Task 5, with a name from `models(operation="ai_supported_models", flow="Personalization")`. Never hard-code a model id.
- Update only rows whose `segmentId` is this segment.
- A save that would clear generated AI results is refused with a 409 that says what it would clear. Show that to the user and re-call with `confirm` set to true only after they agree.

**4b. Remove a variable** only when the user asked for it, or its token left the sequence and the user agreed: `prompts(operation="delete", prompt_id=..., confirm=false)`. Handle a 409 like 4a. A rename is `changes={"name": "<New Name>"}` and must match a token the live sequence already has.

**4c. Save the rewriting steering** (if drafted). Find the segment's rewriting prompt with `prompts(operation="list", campaign_id=..., segment_id=..., flow="rewriting")`. If it exists:
```
prompts(operation="update", prompt_id=..., changes={"prompt": "<2-10 sentences>"}, confirm=false)
```
Else:
```
prompts(operation="create", campaign_id=..., segment_id=..., flow="rewriting", prompt_type="system",
        name="Rewriting", prompt="<2-10 sentences>", to_output=false, to_rewrite=0, order=1, confirm=false)
```
- Never send an empty `prompt`. Skip this step if you chose no steering.
- Handle a 409 like 4a.

**4d. Confirm:** variables saved for the campaign and segment, `to_rewrite=1` on all non-subject variables, rewriting steering saved or omitted.

### Task 5: Live test (after saving)

Gate: the segment has contacts to sample. If not, skip, say so, and stop after the save.

```
prompts(operation="test", campaign_id=..., flow="personalization", sample_size=5, segment_id=...)
```

- 5 contacts per round, **max 3 rounds**. Each call samples fresh contacts and uses model credits. The test needs the Ask permission; a refusal means the user lacks it, so say that and stop testing.
- Rewriting runs in the same call when the campaign has it enabled. Judge each sample's **`finalOutputs`** (what reaches the contact).
- Score each round: Pass 5/5, Minor 3-4/5, Major under 3/5 or systemic. On Minor or Major, fix the pattern, re-save (4a), and re-test. After round 3 still failing, leave the best version saved, warn the user and recommend a manual review.
- Summarize each round in chat; write no results file.

Response fields, criteria, issue patterns, fixes, other flows and test errors: `load_skill(name="knowledge-setup", reference="references/live-test.md")`.

## Data Source Constraints

**CRITICAL:** derive the available sources from the live campaign's `campaignDataEnrichments` (int ids), not from assumptions.

| Id | Enrichment | Data available |
|----|------------|----------------|
| 1 | LinkedIn profile | Title, company, location, previous roles, education, skills, summary |
| 2 | LinkedIn company | Industry, headcount, headquarters, description |
| 3 | Website content | Company website pages (home by default): products, services, target market, value prop |
| 4 | Website metadata | Site title and description |
| 6 | Technology enrichment | Tech stack - reference only when this id is on |
| 7 | LinkedIn posts | Recent posts - only when on; most prospects rarely post, so never rely on it |

The homepage alone is usually enough website content. Lean on product or services pages only when a prompt discusses the prospect's offerings.

**Safe defaults** (enrichments unreadable or empty): company website main page, LinkedIn company page, LinkedIn individual profile. Continue with these; no hard stop.

**Never available**, whatever the campaign: news articles or press releases, funding, recent events or triggers, social media other than LinkedIn, blog content, tech stack (unless id 6 is on), anything time-sensitive.

**Lead data is injected for you.** First name, company and the other lead fields are already in the AI's context. Never put variable syntax in prompt text; describe the data in words: "Based on their job title from LinkedIn..." not "Based on {title}...". Double-brace tokens belong only in the email sequence; a prompt's **name** is the Title Case form without braces.

## Prompt Writing Guidelines

Each prompt states:
1. **What to generate** - "Write a subject line that...", "Generate a 1-sentence opening that..."
2. **Tone and style** - conversational, professional but friendly, insightful not generic
3. **Constraints** - length, format, no questions or emojis, start with `PS: `
4. **Fallback** - "If not available, use their role instead" / "Skip if no relevant data"

## Standard Variable Templates

### Subject Line
```
Write a very short subject line that grabs attention and sparks curiosity in fewer than 6 words, ideally 3-4.
Make it relevant to a challenge, wish, hobby, or activity. Do not add emojis or punctuation. Use lowercase except for the first letter, and capitalize the first letter of company and person names.
Focus on a single, specific small detail from your research; it can be personal. The goal is to intrigue the prospect quickly and make them curious about the email's contents in just 3-4 words.
```

### First Line
```
Write the first line of the email. Refer to the template above to see where it fits in the initial message. Don't write any greeting.
The goal is to hook their attention, make the line very personalized, and lead smoothly into the rest of the email. Keep this line short, under 20 words.
It should spark curiosity, be intriguing and simple, and avoid gimmicks. Do not sound robotic. Most important: do not be boring.
Avoid emojis, exclamation marks, and questions. Don't just summarize information about them.
Aim for a pleasant, genuine tone that reflects the company: smart, concise, personalized, and straightforward, using simple language.
```

### PS Line
```
Write a PS line for this email that starts with "PS: " and continues. Keep it short: one or two sentences. The goal is to be human and to reflect your personality as a creator. This line should be casual and personal - an opportunity to add more humanity to your outreach.
Make the PS about them, not about you. Include a very small personal detail that few people notice - something hidden on their website or LinkedIn profile. Don't try too hard or make broad assumptions; if you do assume something, mention that you're assuming. Humor is good but subtle - if you see something funny in their profile, you can laugh at it or lightly develop the joke.
This is also a chance to share a small, catchy idea for them. Keep it genuine and brief. Do not invent connections, invite them to anything, or offer help you can't back up. Avoid generic compliments; instead, make them feel noticed and special.
```

### Role Pain Point
```
Based on their job title from LinkedIn, reference a pain point typical for that role. Be specific to seniority: VPs/Directors - scaling, team efficiency, cross-functional alignment. C-suite - strategy, competitive positioning, board concerns. Managers - execution, reporting, resource constraints. 1 sentence max that feels like something only someone in their role would understand.
```

### Industry Context
```
Based on company industry from LinkedIn, reference a common challenge or priority in that industry. Keep evergreen - not news or events, just general industry dynamics. Example for healthcare: 'In healthcare, compliance and patient data security are always top of mind.' 1 sentence, conversational.
```

### Company Size Context
```
Based on LinkedIn company headcount, reference challenges typical to that size. 10-50: wearing multiple hats, limited resources. 50-200: scaling pains, process gaps. 200-1000: coordination complexity, tool sprawl. 1000+: enterprise complexity, change management. 1 sentence showing you understand their scale.
```

## Prompt Customization Rules

- **Examples:** none in First Line, PS Line or Subject Line unless heavily customized - examples constrain creativity. Other custom prompts may carry examples when they need a specific structure.
- **PS Line:** start from the default template and change it only slightly; never write a PS prompt from scratch. Format is always `PS: `.
- **Subject Line:** stay close to the default formula, customize only the campaign angle, never add "Quick question" or outreach clichés.
- **You may customize:** which LinkedIn or website fields to prioritize, tone, industry context or pain points, length limits.
- **Do not customize:** the core structure of the First Line, PS Line or Subject Line templates, or the fundamental approach of the standard variables; do not add example outputs that constrain the AI.

## Rewriting Instructions

When Rewriting is enabled on the campaign, the platform composes the rewriter's prompt from its defaults (core principles, email flow, style, spam and deliverability rules, formatting, company context, audience, the email sequence) and appends your **steering paragraph** as higher-priority custom instructions. You write only that paragraph.

### `to_rewrite` per user prompt

| Value | Meaning | Typical use |
|-------|---------|-------------|
| 0 | Not rewritten | Subject Line and other short keep-as-is outputs (rewriting them is too risky), very simple or formulaic outputs where consistency matters more than variation |
| 1 | Rewritten once | First Line, PS Line, body variables |
| 2+ | Several passes | Rare |

Only prompts with `to_output: true` and `to_rewrite > 0` go through rewriting.

### What to write

Pick 1-3 angles distinctive to this client or segment: voice and tone (punchy, technical, warm, dry, founder-to-founder); sentence structure and rhythm; how personalized lines hand off into this segment's body copy; campaign-specific anti-patterns ("don't sound like a recruiter"); how much the rewrite should show research.

**Do not write:** the injected defaults (em-dashes, spam words, "I noticed", exclamation marks, formatting), long justifications, or output examples.

**Length and style:** 2-10 sentences (3-6 is the sweet spot), conversational prose, not bullets. The rewriter picks up the instruction's own tone.

**Example:**
```
Make it sound as cool as possible. Show you've researched them. Use shorter sentences like I'm doing now. Better to have 2 shorter punchy sentences instead of 1 long boring one. Use power words. Sound human.
```
Six sentences, conversational, covering voice, rhythm and research signaling, with no defaults repeated.

**When to omit:** only when the campaign has no distinctive voice or flow need. In practice most campaigns benefit from 2-3 sentences, so include them by default.

## Models (dynamic - never hard-code)

- The catalog changes; read it with `models(operation="ai_supported_models", flow="Personalization")` (or `"Rewriting"`) only when the user wants to compare a model.
- Qualification and Segmentation run on a platform-fixed model; a model choice there does nothing.
- Optional cost check: `models(operation="ai_token_analysis", campaign_id=..., flow="Personalization", segment_id=...)` shows prompt length and cache friendliness. Not needed for a normal save.

## Chat draft shape (for approval)

```markdown
# AI Personalization Prompts

Campaign: [id / name] | Segment: [id / name]

| Variable | Location | Email(s) | Rewrite | Fallback |
|----------|----------|----------|---------|----------|
| Subject Line | subject | all | no | - |
| First Line | opener | 1 | yes | "..." |

### Subject Line
**Rewrite**: no
**Prompt**:
[full text]

### First Line
...

## Rewriting Instructions
[2-10 sentences, or "omitted"]
```

## Approval points

- **Auto-proceed:** minor test fixes (length limits, small wording); a pass on the first round.
- **Pause for approval:** the first draft before saving; major rewrites (data sources, restructured variables); removing or renaming a variable; any 409 confirm prompt; a third test round with persistent issues.

## Quality checklist (before saving)

- [ ] Every strategy variable and every live-sequence `{{Title Case}}` token has a prompt; Subject Line included when used
- [ ] Names Title Case, max 30 chars, unique after snake_case normalization, matching the tokens
- [ ] No body token reused across emails (one value per lead)
- [ ] Prompt text max 4096 chars, no `---` line, no lead-variable syntax
- [ ] Valid data sources only (enrichments or safe defaults)
- [ ] Clear format and length constraints and a fallback in every prompt
- [ ] `to_rewrite` plan: 0 for Subject Line, 1 for First Line, PS Line and body variables
- [ ] Rewriting steering 2-10 sentences, no repeated defaults, or deliberately omitted
- [ ] No hard-coded model ids

## Edit mode

When asked to improve existing prompts (`mode: "edit"`, analytics or feedback):
1. Read the live prompts: `prompts(operation="list", campaign_id=..., segment_id=...)`.
2. Scope the change (subject only, first line only, all user prompts, add or remove a variable). Keep unaffected prompts, names and data-source limits intact.
3. Show a before/after with a one-line rationale and get approval.
4. A single prompt's text: `prompts(operation="update", prompt_id=..., changes={"prompt": "<new text>"}, confirm=false)` keeps its `to_rewrite`. Adding a variable is a create (4a), removing one is a delete (4b), and a rename must match a token the sequence already has.
5. Optionally re-test (Task 5).

| Cue | Response |
|-----|----------|
| "AI feels off" | Tighten constraints and fallbacks |
| "Too generic" | Name specific LinkedIn or website fields |
| "Forced connections" | Strengthen the never-assume rules |
| An underperforming email (analytics) | Check which prompts that email uses and whether personalization helps or hurts there |

Weak output usually has one of three causes: the campaign lacks the enrichment a prompt leans on, the prompt is vague, or rewriting is off. Check them in that order before rewriting prompts wholesale.

## Errors

| Error | Action |
|-------|--------|
| Enrichments unreadable or empty | Use the safe default sources; continue |
| Name or length validation on save | Fix names (Title Case, max 30) or prompt length (max 4096); re-approve if the change is material |
| 409 confirm preview | Show what it would clear; set `confirm` to true only after the user agrees |
| Auth error | Ask the user to re-authenticate their MCP connection, then retry |
| `plan_limit` / `billing` | Surface `error.message` and `error.recovery.summary`; never retry blindly |

Failures return `{"success": false, "error": {"code", "category", "message", "recovery": {...}}}`. Test-specific errors are in the live test reference.

## Resources

Open each with `load_skill(name="knowledge-setup", reference="references/<file>")`:

- `prompt-engineering.md` - prompt anatomy, what the system prompts already say, the variable fields, creative variables, complete example, common mistakes
- `review-workflow.md` - self-review checklist and priority rules
- `live-test.md` - live test response, criteria, issue patterns, revision loop, other flows, test errors

## Confirm

> Personalization variables saved for campaign `{campaign_id}` segment `{segment_id}`. `to_rewrite=1` on all non-subject variables. Rewriting steering [saved | omitted]. Live test: [PASS after N rounds | skipped - no contacts | PARTIAL - see summary].
