---
name: email-review
description: Review cold email copy for quality, compliance with critical copy rules, and client preferences. Use after email-copywriting completes to validate and improve email sequences. Scores emails 1-5 and outputs emails_v2.md when score >= 4.5. If score < 4.5, provides revision feedback for email-copywriting to iterate. Triggers on "review emails", "check email copy", or when invoked by campaign-planning/campaign-strategy workflows.
model: opus
thinking: true
---

# Email Review Skill

Review email copy against critical copy rules, QA checklists, and client preferences. Output a scored review and, if quality is sufficient, produce `emails_v2.md` as the final reviewed version.

## Execution Tasks

**Execute these tasks in order. Do NOT skip any task unless noted.**

### Task 1: Load Context
- [ ] Read `{segment_folder}/emails.md` - The email copy to review
- [ ] Read `{segment_folder}/strategy.md` - Campaign strategy and goals
- [ ] Read `{workspace}/research.md` - ICP, value proposition, messaging themes, product info, case studies (`{workspace}` = the client campaign workspace, default `./ken-campaigns/{client-slug}/` under the current directory)
- [ ] Read `{workspace}/notes.md` (if exists) - Client-specific preferences (HIGHEST PRIORITY)

### Task 2: Load Review Reference Material
- [ ] Read `qa.md` from this skill folder - QA checklists and scoring criteria
- [ ] Read `extra_info.md` from this skill folder - Exercises, tips, common mistakes

### Task 3: Review Against Critical Copy Rules Checklist

**MANDATORY**: Check EVERY email against these non-negotiable rules.

#### Transitions & Flow (CRITICAL - top failure mode)
- [ ] **No abrupt transitions** from {{First Line}} to body - personalized opening flows naturally into next sentence
- [ ] **FLAG** any email where the static body's first sentence ignores the personalized line and jumps into a generic statement (e.g. straight into "Scaling a SaaS company..."). The body's opening must read as the next beat of the `{{First Line}}`, not a topic change.
- [ ] **Transitional context** provided or first line topic connects to body

#### Language to Avoid (REJECT if found)
- [ ] No "Quick followup", "quick question", "touching base"
- [ ] No "No worries if timing isn't right" or apologetic/defensive language
- [ ] No "Quick insight:" prefix - state insights directly
- [ ] No typical sales clichés that scream "cold email"
- [ ] **Final-email salesy endings (REJECT)** - the last email must NOT announce itself as a follow-up or last attempt. REJECT "Last note from me", "Last email", "Just following up", "Following up", "Circling back", "Checking in", "Wanted to follow up", "Bumping this", "One last try". This is the salesy ending operators flag most - check the final email specifically, every time.

#### Spam Words & False Claims (REJECT if found)
- [ ] **No "free"** anywhere in body copy - hurts deliverability (reframe: "trial", "no-cost look")
- [ ] **No "credit card"** anywhere in body copy
- [ ] **No false/unverifiable offer claims** - e.g. "no credit card" when a card is actually required, or implying a trial is unlimited when it isn't. Cross-check every offer claim against `{workspace}/research.md`; FLAG anything you cannot verify.
- [ ] Other spam words from `qa.md` (marketing, investment, money, guarantee, etc.) avoided

#### Greetings (Check EVERY email, including follow-ups)
- [ ] **Every email opens with a greeting** - `Hey {firstName},` followed by an empty line
- [ ] **FLAG follow-ups that jump straight into the body with no greeting** - threading off Email 1 does not excuse a missing greeting

#### Variables & Signature (Format - REJECT)
- [ ] **AI variables use double braces `{{Title Case}}`** - REJECT any `[square bracket]` AI variable (`[First Line]`, `[PS Line]`, `[Subject Line]`). The double-brace form is what renders correctly in the app on push.
- [ ] **Every email signs off with `{sender_signature}`** - REJECT any hand-written sign-off (a typed closer + name + title + tagline). The signature must be the `{sender_signature}` variable on every email.
- [ ] **Lead variables use `{camelCase}`** - `{firstName}`, not `{first_name}`.
- [ ] PS variable (`{{PS Line}}` / `{{Final PS Line}}`) sits on its own line after `{sender_signature}`.

#### Formatting Requirements
- [ ] **Short paragraphs only**: 1-3 sentences max per paragraph
- [ ] **Adequate spacing** between thoughts (remember: AI adds 1-2 sentences)
- [ ] **Never ALL CAPS** for emphasis (use structure or italics only)

#### Brevity & Punch (HARD - cold emails are almost always too long; the #1 operator complaint)
- [ ] **Count the static body words of every email** (body = prose + CTA, excluding the `Hey {firstName},` greeting, the `{{...}}` AI-variable lines, and `{sender_signature}`). **Hard ceiling 80 words. REJECT any email over 80** - this is a fail, not a flag. Follow-ups should land well under (target ≤55). Report the per-email count.
- [ ] **Run the "cut at least 30%" pass** on every email - if it can be cut ~30% without losing meaning, it is bloated: REJECT and show the tighter version.
- [ ] **Prefer short sentences** - flag long, multi-clause sentences.
- [ ] **Punchy, not staccato** - flag jittery one-sentence-per-line fragments ("It just runs."); copy should keep full thoughts grouped into 1-2 short paragraphs.

#### Sequence Length
- [ ] **Default is 3 emails, not 4-5** - if the sequence has 4+ emails, verify each extra email carries a distinct worth-sending idea. FLAG any follow-up that just restates an earlier email and recommend cutting it.

#### First Email Requirements (Email 1 ONLY)
- [ ] **MUST mention the solution** - not just the problem
- [ ] **States problem AND offers solution** in the same email
- [ ] **Don't ask if they have problems** - state their problem and offer solution
- [ ] **UVP stated clearly** - don't keep value prop secret

#### CTA Requirements (Check ALL emails - HARD)
- [ ] **Every email's CTA asks for the real offer, including Email 1.** REJECT any email whose close does not ask for the actual offer (the call, demo, walkthrough, or sample). The first email must carry the strongest offer CTA, not a soft warm-up.
- [ ] **REJECT diagnostic / soft questions used as the CTA** - "Do you have a system for X?", "Do you have anything in place?", "Where do your clients come from?", "Is it worth a look?", "a quick look", "Curious if...?", "Worth exploring...?". Asking about their situation is not a CTA.
- [ ] **Strong and direct CTAs** - a direct ask for the offer ("Want me to walk you through it?", "Open to a quick walkthrough?"), or positioned as a "strategy call" / "conversion optimization call" for SaaS
- [ ] **No "Should I close the loop?"** - use direct unsubscribe language instead
- [ ] **No complex rhetorical questions** that require too much thought to answer
- [ ] **No time commitments in CTA** - duration details ("30 minutes", "15 min") should not appear in the CTA line
- [ ] **No keyword trigger CTAs** - "Reply 'X' and I'll send Y" patterns are spam signals; use plain "reply" CTAs instead
- [ ] **Question + link-on-its-own-line is PREFERRED, not a violation** - a short direct question ("Do you want to apply?", "Want a seat?") with the link on the next line by itself is a strong CTA pattern. Do not flag it for "link not in a sentence"; flag only if the question is weak or the link is embedded/buried instead.

#### Rhetorical Questions
- [ ] **If rhetorical question used**, it's immediately followed by answer/solution in next sentence
- [ ] **Never leave prospects hanging** - rhetorical questions need payoff

#### Offer Strategy (Mid-Market)
- [ ] **Sells the PRODUCT**, not audits/analysis/friction analysis
- [ ] **Solution-focused for mid-market** - not indie hacker-style audits
- [ ] **Analysis/audit mentioned as proof/demo only**, not primary offer

#### Case Study Relevance
- [ ] **Proof points match prospect's vertical** - no irrelevant case studies
- [ ] **No B2C examples for B2B prospects** (e.g., no Crocs for B2B SaaS)
- [ ] **Same or adjacent industry** case studies used
- [ ] **If no relevant case study**, use generic metric without company name

#### Subject Line Threading
- [ ] **Every email uses an AI-generated subject line `{{Subject Line}}`** - operator standard (Cristian, 2026-06-03): all steps carry `{{Subject Line}}`, including follow-ups. Do NOT leave follow-up subjects empty and do NOT flag a follow-up that has `{{Subject Line}}`. (The parser emits `{{Subject Line}}` for every step via `_default_subject_line`.)

### Task 4: Run QA Checklist Scoring
- [ ] Score each email using criteria from `qa.md`
- [ ] Run self-review questions (assume you're a cold prospect)
- [ ] Check strategy alignment

### Task 5: Run Quality Exercises
- [ ] **"So What?" Test** - For every line, ask "So what?" If you can't justify it, cut it
- [ ] **Word Reduction** - Identify lines that can be tightened (strip unnecessary words)
- [ ] **Read Aloud Test** - Check for awkward phrasing
- [ ] **Feature-to-Story Transformation** - Flag any boring feature dumps

### Task 6: Output Review

Generate a structured review with:

```markdown
## Email Review

### Overall Score: [1-5, can be decimal like 4.5]

### Critical Copy Rules Violations
[List any violations found in Task 3, or "None found"]

### Email-by-Email Feedback

**Email 1: [Title]**
- Score: [1-5]
- Issues: [list specific problems]
- Suggestions: [specific improvements with before/after]

**Email 2: [Title]**
...

[Repeat for each email]

### Client-Specific Notes Applied
[Any notes from {workspace}/notes.md that were applied]

### Quality Exercise Results
- "So What?" failures: [lines that couldn't be justified]
- Tightening opportunities: [lines that can lose words]
- Awkward phrasing: [flagged from read aloud test]
- Length & brevity: [per-email word counts; any email that fails the "30% shorter?" pass, with the tighter rewrite]
- Greeting check: [any follow-up missing a `Hey {firstName},` greeting]
- First-line bridge: [any email where the body's first sentence jumps away from the personalized `{{First Line}}`]

### Priority Improvements
1. [Most important fix]
2. [Second most important]
3. [Third]
```

### Task 7: Score Decision

**Hard gate (overrides the score):** if ANY rule marked HARD or REJECT above is violated - a static body over 80 words, a missing or weak offer CTA (including Email 1), a salesy follow-up ending ("Last note from me", "just following up", etc.), a `[bracket]` AI variable instead of `{{...}}`, or a hand-written signature instead of `{sender_signature}` - the review **fails regardless of the numeric score**. Fix every HARD/REJECT violation (mechanically where possible: variable syntax, signature swap, trimming to the ceiling) and re-check before writing emails_v2.md.

**If score >= 4.5 AND no HARD/REJECT violation remains:**
- Apply all identified fixes to the email copy
- Write the corrected version as `{segment_folder}/emails_v2.md`
- Report success: "Email review passed with score [X]. emails_v2.md written."

**If score < 4.5 OR any HARD/REJECT violation remains:**
- Do NOT write emails_v2.md
- Output the full review with specific revision instructions
- Signal that email-copywriting needs to revise:
  ```
  Email review score: [X]/5 - Below 4.5 threshold.
  emails_v2.md NOT created. Email copy needs revision.

  Revision instructions for email-copywriting:
  [Specific, actionable fixes organized by email]
  ```

## Review Priority Rules

When encountering conflicting guidance, apply in this order:

1. **Client notes override everything** - If `notes.md` says "client hates emojis", never use emojis even if other guidance suggests it
2. **Conversation feedback overrides notes.md** - If user said something in this session, it's the latest preference
3. **Campaign strategy overrides generic guidelines** - The strategy was created for this specific campaign
4. **QA checklist provides baseline** - Use as default when no specific guidance exists

## Review Scope

**ONLY review:**
- Subject lines
- Email body content
- CTAs
- Formatting and readability
- Tone alignment with client preferences

**DO NOT review:**
- AI personalization prompts (handled by prompt-writer skill)
- List building criteria
- Campaign strategy itself

## Output Handling

### If segment folder specified (workflow mode):
1. Write review output to conversation
2. If score >= 4.5: Write `emails_v2.md` to segment folder
3. Report result to calling skill/workflow

### If standalone mode:
1. Output review to conversation
2. If score >= 4.5: Write `emails_v2.md` to segment folder (if folder known) or return inline if no folder is known

## Resources

For detailed review criteria, see the following reference files in this skill folder:

- **qa.md** - QA checklists, scoring criteria, self-review questions
- **extra_info.md** - Quality exercises, writing tips, common mistakes to avoid
