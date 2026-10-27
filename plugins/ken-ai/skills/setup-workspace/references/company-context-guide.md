# How to write companyContext

This string is injected into every AI personalization flow for this workspace.
The AI uses it to understand *who it is writing as* and *who it is writing to*,
across ALL current and future campaigns. Write it to be campaign-agnostic:
general enough to apply to any ICP or angle we might test later.

Resolve the workspace id in Step 1 of setup-workspace, then after the user
approves the draft call:

```
workspace(
  operation="update",
  workspace_id=<client_id from Step 1>,
  company_context=<approved draft>
)
```

You may include other profile fields in the same confirmed write when they
changed: `name`, `website`, `linkedin_company_url` only.

## Structure (use these exact section headers in the output)

**Company**
One sentence: what they do and for whom. Plain-English, no buzzwords.

**What we do**
2-3 sentences on the product or service: how it actually works, the mechanism,
the delivery model (SaaS, agency, marketplace, etc.). Be specific about the
"how" - not "AI-powered platform" but "ingests X, runs Y, returns Z".

**Who we serve**
2-3 sentences describing the kinds of companies and roles that typically buy.
Keep it GENERAL - describe the archetype, not a filter. Say "mid-market B2B
SaaS companies with a sales team" not "50-500 employees, ARR > $5M, has SDRs".
Avoid numbers, exclusions, or disqualifiers - those belong in
qualification/segmentation prompts, not here. The AI should be able to use this
context for any segment we might target.

**Value prop & differentiation**
2-4 sentences on the core pains this solves and why the client wins vs.
alternatives (in-house, competitors, status quo). Lead with the pain in the
buyer's language, then the mechanism that resolves it. Include 1-2 genuine
differentiators (proprietary data, unique methodology, team background) - only
ones supported by the source material.

**Voice & tone**
2-3 sentences, prescriptive: "Write in [adjectives]. Use [style cues]. Sound
like [persona]." Derive this from the sources: how does the company talk about
itself on its website? Include 1-2 phrasing examples if a distinctive voice is
evident (e.g., "Uses direct second-person, avoids corporate hedging, occasional
dry humor"). If sources don't clearly establish voice, write a conservative
default ("Professional, plain-English, no jargon") rather than guessing.

**Don'ts** (only if applicable - otherwise omit this section entirely)
Bullet list. Include only: compliance constraints (e.g., "no ROI claims -
regulated industry"), explicit aversions the user mentioned (e.g., "we hate the
word 'leverage'"), or factual guardrails (e.g., "never claim we integrate with
Salesforce - we don't").

## Writing rules

- Extract from sources only (the website research and what the user says). If
  a section has no source material, shorten it - never invent.
- No proof points, metrics, case studies, or customer names (those live in
  campaign strategy, not global context).
- No campaign-specific angles, offers, or CTAs.
- No segmentation criteria, filters, or disqualifiers.
- Write in first-person plural ("we do X") - this is the company's own voice the
  AI will adopt.
- Target 400-700 tokens total. If under 300 words, you're probably too vague.
  If over 600, you're probably including campaign specifics that don't belong.
- A short research summary is a starting point, not the final draft: expand it
  with facts from the site, never with filler.

## After a successful save

Tell the user:

"Saved your company context. Want any edits to the voice and
tone or anything else?"

Include the saved text inline so they can review and redirect if needed.
