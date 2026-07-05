---
name: client-research
description: Synthesize client research from meeting recordings, website data, and other resources into a comprehensive Markdown strategy document. Use when the user uploads meeting transcripts, call recordings, or scraped website data and needs a complete client research document for GTM strategy, list building, or email copywriting. Triggers on requests like "create a client research doc", "summarize this client", "build a strategy document from these resources", or when multiple client-related sources are provided for synthesis.
model: sonnet
thinking: false
---

# Client Research Skill

Synthesize multiple research sources into a comprehensive client strategy document optimized for both human review and downstream AI agents (GTM strategy, list building, email copywriting).

## Required Context

Before generating the research document, load all available client sources. `{workspace}` = the client campaign workspace (default `./ken-campaigns/{client-slug}/` under the current directory):

**Directory Structure Reference:**
```
{workspace}/
├── research.md       # Existing research (preserve metadata if updating) - THIS skill's output
├── notes.md          # Optional client preferences
├── research/         # Source material: scraped website content (from website-scraping),
│   └── website/      # transcripts, documents the user dropped in
└── {plan folders}/   # Past campaign plans (note what worked)
```

Sources may also arrive as user uploads or paths given in the conversation - use whatever is provided.

## Inputs

Expect one or more of these source types:
- Meeting recordings/transcripts (Fireflies, Otter, Gong, etc.)
- Scraped website content
- Product documentation
- Competitor analysis
- Customer testimonials or case studies
- Sales materials

## Output Format

Generate ONE document, `{workspace}/research.md`, with a quick-reference summary on top followed by the comprehensive research. This single file is what every downstream campaign skill reads.

### Part 1: Summary (top of research.md)

Quick-reference section for daily use. See `references/context-template.md` for the exact structure. Key sections:

- Header metadata (client slug, created date, owner)
- **Elevator Pitch** - Short hook answering: "If I met {ICP} in an elevator with {Company}, what should I say in a couple seconds to make them really hooked?"
- **About the Company** - 3-paragraph executive summary
- **Target Audience** - Condensed ICP (1-2 paragraphs)
- **Core Problems Solved** - Bulleted list (3-5 items)
- **Key Assets** - Top 3 lead magnets (table format)
- **Case Studies** - Top 3 results (table format)
- **Quick Links** - Website, other client links

### Part 2: Comprehensive research (rest of research.md)

Full research for strategy and copywriting. Generate with these sections in order:

```markdown
# [Company Name] Strategy

## Elevator Pitch

> If you met [primary ICP - role/title at company type] in an elevator with [Company], what should you say in a couple seconds to make them really hooked?

[1-3 sentences. Plain English, no buzzwords. Lead with the specific pain or outcome that hits hardest for the ICP, then the mechanism. Should feel like something you'd actually say out loud, not marketing copy.]

## About the Company

### Summary
[3 paragraphs: Business overview, Differentiation & approach, Strategic context]

## Product

### What it is
[2-3 paragraphs on core functionality, technical approach, fundamental methodology]

### Benefits & Features
[Max 3 focused paragraphs on unique capabilities - not generic features]

### Problems it solves
[3-5 problems with structure: Problem Title, The Pain, The Solution, Outbound Angle]

### Why this matters
[2-3 paragraphs: Market timing, Financial impact, Operational reality]

### Pricing
[Tiers, ACV, sales cycle if available]

### Unique Competitive Advantages
[3-5 advantages with: What Makes This Different, Outbound Angle]

## Target Market

### Filters
[Table: Filter, Value, Rationale - for company size, industry, geography, roles]

### Core Problems Solved
[Numbered list of 3-5 core problems with business impact and urgency triggers]

## Assets

### Lead Magnets
[Top 3 existing lead magnets with: Type/Format, What It Is, What It Does, Strength Assessment, Access Details, Outbound Usage Strategy]

## Case Studies
[Top 3 case studies with: Customer Type, Situation, Results Achieved (with metrics), GTM Application]

## Additional Insights
[Past outbound efforts, sales process, channel performance, decision-maker dynamics, pain point language, onboarding model, strategic context - only what exists in sources]
```

## Section Guidelines

Read [references/section-prompts.md](references/section-prompts.md) for detailed instructions on each section before writing.

## Critical Rules

1. **Extract, don't invent**: Only include information present in the provided sources. Never suggest new ideas or speculate.

2. **Avoid generic language**: Never use "innovative", "cutting-edge", "AI-powered" without explaining the actual mechanism. Be specific about how things work.

3. **Quantify when possible**: Include specific metrics, percentages, dollar amounts, time savings. Numbers make content actionable for outbound.

4. **Include outbound angles**: Every problem, advantage, and lead magnet should have a concrete question or hook for cold email usage.

5. **Prioritize by ICP fit**: When selecting case studies, lead magnets, or problems to highlight, prioritize those most relevant to the primary target audience.

6. **Write for dual audiences**: Content must be scannable by humans AND parseable by AI agents. Use consistent headers and structured formats.

## Quality Checklist

Before finalizing, verify:
- [ ] All sections populated from source material (or explicitly noted as "Not found in resources")
- [ ] No speculative or suggested content
- [ ] Specific metrics included where available
- [ ] Outbound angles are concrete questions, not vague statements
- [ ] Problems describe actual pain with business impact
- [ ] Competitive advantages explain WHY they're hard to replicate
- [ ] Lead magnets include access details or links when available

## Output Handling

After generating the research documents:

1. **Update Ken AI companyContext**: Resolve the Ken client ID - from a `configuration.json` in the workspace's plan folders if one exists, otherwise call the ken-ai MCP tool `api_client_manage` (operation="list") and have the user confirm the client. If a client ID is confirmed, generate a `companyContext` (target 400-700 tokens, ~300-550 words) using the structure and rules below, then call `api_client_manage` with `operation="update"`, `client_id`, and `company_context` set to the generated text. If the user declines or no client exists yet, skip this step silently.

   ### How to write companyContext

   This string is injected into every AI personalization flow for this client. The AI uses it to understand *who it is writing as* and *who it is writing to*, across ALL current and future campaigns. Write it to be campaign-agnostic: general enough to apply to any ICP or angle we might test later.

   **Structure (use these exact section headers in the output):**

   **Company**
   One sentence: what they do and for whom. Plain-English, no buzzwords.

   **What we do**
   2-3 sentences on the product or service: how it actually works, the mechanism, the delivery model (SaaS, agency, marketplace, etc.). Be specific about the "how" - not "AI-powered platform" but "ingests X, runs Y, returns Z".

   **Who we serve**
   2-3 sentences describing the kinds of companies and roles that typically buy. Keep it GENERAL - describe the archetype, not a filter. Say "mid-market B2B SaaS companies with a sales team" not "50-500 employees, ARR > $5M, has SDRs". Avoid numbers, exclusions, or disqualifiers - those belong in qualification/segmentation prompts, not here. The AI should be able to use this context for any segment we might target.

   **Value prop & differentiation**
   2-4 sentences on the core pains this solves and why the client wins vs. alternatives (in-house, competitors, status quo). Lead with the pain in the buyer's language, then the mechanism that resolves it. Include 1-2 genuine differentiators (proprietary data, unique methodology, team background) - only ones supported by the source material.

   **Voice & tone**
   2-3 sentences, prescriptive: "Write in [adjectives]. Use [style cues]. Sound like [persona]." Derive this from the sources: how does the client talk about themselves on their website, in meetings, in emails? Include 1-2 phrasing examples if a distinctive voice is evident (e.g., "Uses direct second-person, avoids corporate hedging, occasional dry humor"). If sources don't clearly establish voice, write a conservative default ("Professional, plain-English, no jargon") rather than guessing.

   **Don'ts** (only if applicable - otherwise omit this section entirely)
   Bullet list. Include only: compliance constraints (e.g., "no ROI claims - regulated industry"), explicit client aversions mentioned in meetings or emails (e.g., "client hates the word 'leverage'"), or factual guardrails (e.g., "never claim we integrate with Salesforce - we don't").

   **Writing rules:**
   - Extract from sources only. If a section has no source material, shorten it - never invent.
   - No proof points, metrics, case studies, or customer names (those live in campaign strategy, not global context).
   - No campaign-specific angles, offers, or CTAs.
   - No segmentation criteria, filters, or disqualifiers.
   - Write in first-person plural ("we do X") - this is the client's own voice the AI will adopt.
   - Target 400-700 tokens total. If under 300 words, you're probably too vague. If over 600, you're probably including campaign specifics that don't belong.

   After the `api_client_manage` call succeeds, tell the CSM: "Pushed companyContext to Ken AI. Want any edits to the voice/tone or anything else?" and include the generated text inline so they can review and redirect if needed.

2. **Confirm**: Tell the user the research is saved to `{workspace}/research.md`.
