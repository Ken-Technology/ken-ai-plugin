# Parser Contract

Authoritative format rules for the plan folder. The campaign-configuration skill validates every rule in this file (Step 1) before pushing anything to Ken AI, and every upstream skill that writes into a plan folder must follow this contract - if a file drifts from these rules, either `/campaign-configuration` hard-fails validation, or it silently emits wrong data to Ken AI.

This file is the single source of truth. Skills link here rather than duplicate rules.

## How validation runs

The campaign-configuration skill reads every plan-folder file (Read/Glob) and checks it against this contract. Violations split into:
- **Errors**: block the push until fixed (auto-fix loop, then escalate to the user)
- **Warnings**: shown in the approval summary, non-blocking

---

## Plan folder layout

```
{plan_folder}/
├── plan.md               # required
├── filters.json          # required
├── qualification.md      # required
├── segmentation.md       # required
├── configuration.json    # managed by campaign-configuration, do not hand-edit
├── 0 - default/          # default segment (always scaffolded)
│   ├── strategy.md
│   ├── emails_v2.md      # preferred over emails.md
│   └── prompts.md
└── N - {slug}/           # audience segments, N = 1..
    ├── strategy.md
    ├── emails_v2.md
    └── prompts.md
```

Segment folder name rules:
- Leading number followed by ` - ` then slug: `1 - security-it`, `10 - manufacturing-hardware-design`.
- Slug: lowercase a-z, 0-9, hyphens only. Produced via `re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")`.
- `0 - default` is literal. Never `0 - catchall` or `0 - general`.
- Numbering is contiguous from 1 for audience segments; `0` is reserved for default.
- Missing `0 - default` emits a warning but still parses. The skill will bind to the backend's `isDefault=true` segment without pushing content.

---

## File-by-file rules

### `plan.md`

| Rule | Violation severity |
|------|-------------------|
| First H1 (`# {campaign name}`) is used as the campaign name | Missing H1 → falls back to `"Untitled Campaign"` and warns |

Nothing else is parsed out of `plan.md`. It is read by downstream skills for context, not by the parser.

### `filters.json`

| Rule | Violation severity |
|------|-------------------|
| Valid JSON syntax | Hard error - parser reports line number |
| Top-level JSON object (not array or scalar) | Hard error |
| `desired_contacts` key present (top-level or nested under `filters`) | Falls back to 1000 (soft) |
| Filters body lives at top level or under `filters` key | Either shape works |

### `qualification.md`

Three H2 sections, exact wording, case-insensitive match:

- `## Audience Description`
- `## Qualification Criteria`
- `## Disqualification Criteria`

At least **2 of the 3** must be populated (non-empty after stripping whitespace). Fewer than 2 → hard error.

### `segmentation.md`

Required structure (AI mode - the default):

```markdown
## Default Segment
{description of catch-all segment}

## Segments

### Segment 1: {Name}
{criteria}

### Segment 2: {Name}
{criteria}

...
```

| Rule | Violation severity |
|------|-------------------|
| `## Default Segment` H2 present (or legacy `## General Audience`) | Description becomes empty (silent) |
| `## Segments` H2 wraps the H3 list | Required - without it, segments list is empty |
| Each `### Segment N: {Name}` H3 slugifies to match a `N - {slug}` folder | Warn - folder uses its own slug as name and blank description |
| H3 body is non-empty | Warn - pushed with empty description |
| `Segment N:` numeric prefix in H3 is organizational only - stripped from the canonical name before push | N/A |

The `## Default Segment` description is pushed as the Ken AI backend Default segment's description. The `0 - default` folder's strategy/emails/prompts are pushed as content but the segment itself is bound to the backend-created default (`isDefault=true`), not created anew.

#### Segmentation mode (AI vs percentage / sequence A/B test)

An optional `## Segmentation Mode` H2 selects how contacts are assigned to the numbered segments. Two mutually-exclusive values:

- `ai` (default; assumed when the header is absent) - contacts are assigned by the AI segmentation prompt using each segment's H3 criteria body. This is the normal sub-ICP campaign.
- `percentage` - a **sequence A/B test**. Contacts are distributed **randomly** across the arms by weight; each arm runs a totally different email sequence. There are no AI criteria.

**The Default is one of the A/B arms in percentage mode - use it as the baseline/control.** Every active segment - including the always-active Default - is an AbTest arm with a 1-100 weight, and the weights of all of them must sum to **exactly 100** (enforced at mode-flip, launch, and EmailBison export). So the Default carries its own `- **Weight**:` and gets a proportional slice of traffic; put the baseline/control sequence (the variant the other arms are measured against) in `0 - default/`. The numbered-arm weights plus the Default weight together make 100.

In `percentage` mode each `### Segment N` H3 carries a `- **Weight**: N` line instead of criteria, and `## Default Segment` carries one too:

```markdown
## Segmentation Mode
percentage

## Audience Description
{audience description - still applies via qualification}

## Segments

### Segment 1: {Name}
- **Weight**: 33

### Segment 2: {Name}
- **Weight**: 33

## Default Segment
- **Weight**: 34

{baseline / control arm copy notes - pushed as the Default's description}
```

The weights above sum to `33 + 33 + 34 = 100`. If you omit the `## Default Segment` weight line, the parser back-fills the Default with the remainder (`100 - sum(arms)`) and warns - so you can also just list arms summing to ≤99 and let the Default absorb the rest. Either way the result is a weighted control arm.

| Rule | Violation severity |
|------|-------------------|
| `## Segmentation Mode` value is `ai` or `percentage` | Unrecognized value warns and falls back to `ai` |
| Percentage mode: a `0 - default` control-arm folder exists | Hard error if missing - the mandatory backend Default needs its own sequence + weight |
| Percentage mode: every numbered arm has a `- **Weight**: N` line (int 1-100) | Hard error if missing or out of range |
| Percentage mode: Default has an explicit `- **Weight**: N` (1-100) | Optional - back-filled as `100 - sum(arms)` with a warning when omitted |
| Percentage mode: arms summing to 100 with no explicit Default weight | Hard error - leaves no room for the mandatory Default (must be ≥1) |
| Percentage mode: all weights (numbered arms + Default) sum to exactly 100 | Hard error otherwise - the backend rejects any other total at launch/export |
| `- **Weight**:` lines present (arm or Default) but mode is not `percentage` | Warn - weights ignored in AI mode |

Parser output: top-level `segmentation_mode` (`"ai"`/`"percentage"`); per segment `segmentation_type` plus `ab_test_percentage` (the weight in percentage mode, else `null`); and `campaign.segmentation_mode` (`"AbTest"` in percentage mode, else `null`). The `segmentation_type` enum is **`1 = Manual`, `2 = AI`, `3 = AbTest`** (from the ken-frontend `SegmentationType` source; the `campaign_segment` DB column comment "1=Manual, 2=AI" predates AbTest and is stale). Mapping:

- **AI-mode numbered segments** → `segmentation_type=2` (AI), no percentage. This is what the skill already creates.
- **AI-mode Default** → parsed `segmentation_type` is `null`: the skill binds to the backend's auto-created Default row (`is_default=1`) and never sends a type for it.
- **Percentage-mode A/B-test arms** → `segmentation_type=3` (AbTest) + `ab_test_percentage=<weight>`. The percentage is what distributes contacts randomly by weight.
- **Percentage-mode Default** → `segmentation_type=3` (AbTest) + `ab_test_percentage=<its weight or back-filled remainder>`. It is a real arm - the baseline/control. The skill still *binds* it (never creates it - the backend auto-creates it as `AbTest@100`), then **updates its `ab_test_percentage`** down to the parsed weight so all active segments sum to 100.

Percentage campaigns need the **campaign-level** flag `segmentationMode` set to AbTest **at create time** - the skill passes `segmentation_mode=3` to the MCP `api_campaign_manage` create, which births the Default as `AbTest@100` and is the only way into A/B mode (a post-hoc switch is impossible; see SKILL.md Step 4). They are created with `campaign_ai_workflows=[1]` (Qualification only - no AI Segmentation workflow). All weights (numbered arms + the Default control arm) must sum to exactly 100.

### `emails_v2.md` (preferred) or `emails.md` (legacy)

The per-email, per-variant format. Every rule here matters because the output becomes the EmailBison sequence.

**Email headers:**

```markdown
## Email 1: {Short Descriptive Title}
```

- `## Email N:` where `N` is the 1-based sequence position. Contiguous numbering.
- Title is required and becomes the step name (truncated to 25 chars). `## Email 1` without a title → step name falls back to `Variant A` (warn).

**Variant headers (required for A/B emails, optional otherwise):**

```markdown
### Variant A (5 positive replies)
### Variant B (10 positive replies)
```

- Literal word `Variant`. `Version` is accepted as a fallback alias but emits a warning - always prefer `Variant` for schema consistency.
- Letter in `A..D` range.
- Parenthetical description after the letter becomes the step name suffix: `{Email Title} - {Variant Description}`. Combined length must be ≤25 chars (warn on exceed; silently word-truncated).
- Variants belong immediately under their `## Email N:` header; no nested H2s in between.

**Body content within each variant:**

```markdown
**Body**:

```
Hey {firstName},

{{First Line}}

...copy...

{sender_signature}

{{PS Line}}
```
```

- Lines matching `**Goal:** ...`, `**Subject**: ...`, `**Body**:`, or ```` ``` ```` code fences are stripped - authors can use them freely for structure.
- Horizontal rules (`---`) are stripped.
- A line matching `**Variant Notes**:`, `**Version Notes**:`, `**Test Notes**:`, `**Sequence Notes**:`, `**Email Notes**:`, or `**Copy Notes**:` **terminates** the body - everything after is treated as author metadata, not copy.
- Blank lines between paragraphs serialize to the canonical EmailBison-safe separator `<p><br /></p>`. They do not serialize to bare `<p></p>`.

**Variable syntax:**

| Syntax | Meaning | Example |
|--------|---------|---------|
| `{camelCase}` (single braces) | Lead variable (from contact record) | `{firstName}`, `{company}`, `{title}` |
| `{snake_case}` (single braces) | System variable (resolved by the backend / sending inbox) | `{sender_signature}` |
| `{{Title Case With Spaces}}` (double braces) | AI variable placeholder - **canonical authoring form** | `{{First Line}}`, `{{PS Line}}`, `{{Subject Line}}` |
| `[Title Case With Spaces]` (square brackets) | AI variable placeholder - **legacy**, auto-converted to `{{...}}` | `[First Line]` → `{{First Line}}` |
| Raw URLs or `[text](url)` | Tracking links, auto-converted to `{{tracking_link:url_N}}` | `https://getken.ai/case-study` |

AI variable rules:
- **Write AI variables in double braces `{{Title Case}}`.** This is the canonical authoring form and matches exactly what Ken AI stores, renders, and pushes. `html_serialize.py` preserves `{{...}}` verbatim (no escaping), so what you write is what the app gets.
- The legacy square-bracket form `[Title Case]` is still accepted: `_bracket_to_double_brace` converts it to `{{Title Case}}` at parse time, so old files keep working. Do not introduce new `[bracket]` variables - use `{{...}}`.
- Must start with an uppercase letter: `{{First Line}}` ✓, `{{first line}}` ✗ / `[first line]` ✗ (won't convert, warn).
- Every AI variable `{{Var}}` (written directly or converted from `[Var]`) must have a matching H3 in `prompts.md`. `{{Subject Line}}` is the one you don't have to author: the parser injects it into every step subject and **auto-emits a matching Subject Line output variable** (`_ensure_subject_line_variable`, pushed `to_output=true` / `to_rewrite=0`), so it always maps to a real prompt. It is **NOT** backend-provided - a campaign that ships `{{Subject Line}}` without an output prompt passes local validation but fails the platform's start-workflow readiness gate (the bug fixed 2026-06-03). Write your own `### Subject Line` H3 only to override the generic default.
- `{sender_signature}` is a single-brace system variable that injects the sending inbox's signature block. Use it in place of any hand-written sign-off (closer + name + title). It passes through verbatim, needs no prompt, and is not cross-referenced. Place it at the end of the body, before any trailing `{{PS Line}}` / `{{Final PS Line}}`.
- Never write `{{tracking_link:...}}` in local copy. The parser inserts those tokens.

**Terminator H2 sections (at the end of the file):**

Any H2 that isn't `## Email N:` bounds the preceding email's body. Use these for author metadata so the last email doesn't eat them:

- `## Notes`
- `## AI Personalization Placeholders`
- `## Signature Block`

Without a terminator, trailing metadata gets swallowed into the last email.

### `prompts.md`

Required structure:

```markdown
# AI Personalization Prompts

## User Prompts (To output: true)

### {Prompt Name}
**Prompt**:
{full prompt text}

---

### {Next Prompt Name}
**Prompt**:
{...}

## Rewriting Instructions

{optional 2-10 sentence steering paragraph}
```

| Rule | Violation severity |
|------|-------------------|
| `## User Prompts (To output: true)` heading | `## User Prompts` (without suffix) accepted as fallback (warn) |
| Each H3 under user prompts is a variable name | Name must be Title Case, ≤30 chars |
| `**Prompt**:` marker inside each H3 | Missing → variable is silently dropped (hard error if the variable is referenced in emails; warn otherwise) |
| Prompt text ≤4096 chars | Hard error |
| Every AI variable `{{Var Name}}` used in any email body has a matching H3 | Hard error (`{{Subject Line}}` is auto-emitted by the parser, so it never errors even without an authored H3) |
| Optional `## Rewriting Instructions` H2 for the rewriting steering paragraph | N/A |

Prompt text runs from after `**Prompt**:` until the next `### `, `## `, or `---`. Do not use `---` inside prompt bodies - it cuts the prompt short.

### `strategy.md`

Not parsed. Only read by downstream skills (email-copywriting, prompt-writer) for context. The parser warns if it's missing so plans don't ship half-built.

### Segment folder missing files

| File | If missing |
|------|------------|
| `emails_v2.md` or `emails.md` | Hard error - cannot parse the sequence |
| `prompts.md` | Warns; variables referenced in emails become hard errors via the cross-ref check |
| `strategy.md` | Warns; downstream skills need it |

### `configuration.json`

Written and incrementally updated by the campaign-configuration skill. Do not hand-edit unless the full schema in [configuration-schema.md](./configuration-schema.md) is understood.

---

## Auto-fixable vs human-judgement issues

When validation flags an issue, the fixer subagent should handle it mechanically if it's in the auto-fixable column. Anything in the human-judgement column must be surfaced to the user.

| Issue | Auto-fixable? | How to fix |
|-------|---------------|------------|
| `### Version X` → `### Variant X` | Yes | String replace in emails_v2.md |
| Missing `## Email N:` title | Yes | Derive from strategy.md or use the variant description |
| Combined step name >25 chars | Yes | Shorten the variant description or email title |
| `[lowercase bracket]` AI var | Yes | Title-case the bracket text |
| Missing `**Prompt**:` marker | Yes | Insert marker before the existing prompt body |
| `## User Prompts` missing `(To output: true)` | Yes | Append suffix |
| Variable used in email but not defined in prompts.md | No | Author must either remove the reference or write the prompt |
| <2 qualification sections populated | No | Author must write the criteria |
| filters.json not an object | No | Author must fix the JSON structure |
| Segment folder slug doesn't match segmentation.md name slug | Partial | Rename either the folder or the segmentation H3 - author picks |
