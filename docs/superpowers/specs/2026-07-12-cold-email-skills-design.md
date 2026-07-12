# cold-email-skills - Free Open-Source Skills Repo

**Date:** 2026-07-12
**Status:** Approved design, ready for implementation plan
**Canonical repo:** `Ken-Technology/ken-ai-plugin` (this repo)
**Distribution repo (new):** `Ken-Technology/cold-email-skills`

## Summary

Publish a free, MIT-licensed, open-source **skills repository** - `cold-email-skills` -
that gives anyone a complete cold-email workflow (**plan → target → write → review →
personalize**) which outputs **files**, with **zero Ken account, zero MCP, zero API keys**.
It is distributed as raw [Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
installable via `npx skills add` ([skills.sh](https://skills.sh)) into Claude Code, Codex,
and 20+ other agents.

The existing paid `ken-ai` plugin in this repo is **untouched**. The free repo is a **pure
build artifact** generated from this canonical repo, so the shared skills have a single
source of truth.

## Goals

- A genuinely useful, standalone cold-email skill set for people with **no Ken account**.
- **Single source of truth**: shared skills are authored once (here) and never hand-edited
  in the free repo.
- Installable natively via `npx skills add Ken-Technology/cold-email-skills` (whole repo)
  or per-skill, and listed on skills.sh.
- Tasteful, contextual **upgrade path** to Ken AI - useful first, salesy never.
- Keep the paid `ken-ai` plugin working exactly as-is.

## Non-Goals

- No hosted web app. "Free tool on our website" = a marketing/landing page whose CTA is the
  `npx skills add ...` command. Not a browser app that generates emails server-side.
- No integration of Ken's proprietary tools (KenSearch, enrichment, sending, platform push)
  into the free repo.
- No plugin/marketplace/command packaging for the free repo - it is a **skills repo**, not a
  plugin (no `.claude-plugin/`, `.codex-plugin/`, `marketplace.json`, `plugin.json`,
  `commands/`).
- No CSV export skill, no website-scraping replacement (v1).

## Audiences

| Audience | Uses | Gets |
|---|---|---|
| **Free / open-source** | `cold-email-skills` repo via skills.sh | Files-only cold-email workflow, BYO prospect list, tool-agnostic search guidance |
| **Ken customers** | existing `ken-ai` plugin (unchanged) | Full workflow incl. KenSearch, enrichment, platform push, sending |

## Architecture

### Canonical source (this repo)

Nothing about the paid plugin changes. Three new things are added **here**:

```
plugins/ken-ai/skills/            # canonical skills (unchanged; paid plugin still uses them)
free-distribution/
├── manifest.json                 # what the free repo is built from
├── overrides/                    # free-only + adapted content, authored once
│   ├── search-strategy/          # NEW skill (replaces ken-search)
│   ├── cold-email-campaign/      # NEW orchestrator skill (free variant of campaign-planning)
│   ├── client-research/          # adapted copy (Ken companyContext push removed)
│   ├── prompt-writer/            # adapted copy (Ken live-test + config gating removed)
│   ├── README.md                 # free repo README
│   └── LICENSE                   # MIT
scripts/
└── build-free.mjs                # assemble + validate + publish
.github/workflows/
└── publish-cold-email-skills.yml # build & push on push to main
```

### The free repo (build output)

A **flat skills repo** - skill folders at the **top level** (matches the
`owner/repo/<skill>` install path convention, e.g. `browserbase/skills/browser`):

```
cold-email-skills/                # Ken-Technology/cold-email-skills
├── README.md                     # leads with `npx skills add` commands + upgrade section
├── LICENSE                       # MIT
├── cold-email-campaign/          # orchestrator skill (entry point)
├── search-strategy/
├── qualification/
├── segmentation/
├── campaign-strategy/
├── email-copywriting/
├── email-review/
├── prompt-writer/
├── client-research/
└── lead-magnet/
```

Install:

```
npx skills add Ken-Technology/cold-email-skills                 # everything
npx skills add Ken-Technology/cold-email-skills/email-copywriting   # one skill
```

skills.sh reads GitHub directly (installable the moment the repo is public) and places skills
into the right directory per agent (`~/.claude/skills/` for Claude Code, the equivalent for
Codex/Cursor/etc.), so the repo is runtime-neutral with no manifests.

## Skill Inventory

### Verbatim (byte-identical, `copy` in manifest)

Authored in `plugins/ken-ai/skills/`, copied unchanged into the free repo:

- `email-copywriting`
- `email-review`
- `campaign-strategy`
- `segmentation`
- `qualification`
- `lead-magnet`

**Requirement:** these must contain no `mcp__`/Ken-only references (validated by the build -
see Build & Validation). If any do today, they are generalized in place in the canonical repo
(the paid plugin does not depend on Ken coupling inside these, so this is safe).

### Adapted (authored in `overrides/`, replace the canonical version in the free build)

**`client-research`** - Drop the "Update Ken AI companyContext" step
(canonical `SKILL.md` ~lines 146-180: the `api_client_manage` list/update calls and the
"Pushed companyContext to Ken AI" message). Everything else (synthesizing pasted transcripts,
call notes, website text into `research.md`) is generic and stays. Meeting-source examples
(Fireflies/Otter/Gong) remain as illustrative BYO sources.

**`prompt-writer`** - Most Ken-entangled. Keep the prompt-**writing** technique (how to author
strong AI personalization prompts, the internal text review). Remove:
- the live campaign test half (`api_campaign_prompt_test`, `api_ai_supported_models`,
  `api_ai_token_analysis`),
- the `configuration.json` / `campaign_id` gating and graceful-degradation branch,
- `references/configuration.md` (the "Ken AI Campaign Configuration Reference").

Reframe output from "prompts for Ken AI's personalization engine" to "AI personalization
prompts you can paste into any personalization tool or LLM." Keep `{{Title Case}}` variable
convention (it is a generic templating choice, not Ken-specific).

### New (authored in `overrides/`)

**`search-strategy`** - the free replacement for `ken-search`. Tool-agnostic. Turns the ICP
into concrete, portable filter definitions (titles, seniority, industries, headcount/revenue
bands, geo, technographic/intent signals, keywords, exclusions) that the user runs in
**Apollo / Sales Navigator / Clay / ZoomInfo / etc.**, plus a **BYO-list CSV shape** helper
(required columns: name, email, company, title, …). Output: `search-strategy.md`. Ends with a
tasteful Ken CTA (see Upgrade Touchpoints). Replaces the `filters.json` artifact in the flow.

**`cold-email-campaign`** - free orchestrator skill (variant of `campaign-planning`, authored
fresh because the canonical one is coupled to the platform parser contract, `api_client_manage`,
`filters.json`, `configuration.json`, and a final `campaign-configuration` push). Keeps the
planning model (1 broad ICP + 1 offer + N segments). Chain:

```
search-strategy → qualification → segmentation
  → per segment: campaign-strategy → email-copywriting → email-review → prompt-writer
  → STOP: files written + "how to actually send these" handoff (+ Ken CTA)
```

No client confirmation, no `configuration.json`, no platform push.

### Excluded (Ken-only, never in the free repo)

`ken-search`, `campaign-configuration`, `verify-campaign`, `website-scraping`.

## Free Workspace / Output Layout

Mirrors the paid layout minus platform artifacts:

```
./cold-email/{slug}/
├── research.md              # client-research (or user-provided)
├── plan.md                  # the campaign plan (H1 = campaign name)
├── search-strategy.md       # portable filters to run in Apollo/Sales Nav/etc. (replaces filters.json)
├── qualification.md
├── segmentation.md
├── 0 - default/             # strategy.md, emails_v2.md, prompts.md
└── 1 - {segment}/           # one folder per segment
```

No `configuration.json` (no platform state to journal).

## Build & Validation

`free-distribution/manifest.json` declares:

```json
{
  "targetRepo": "Ken-Technology/cold-email-skills",
  "copy": ["email-copywriting", "email-review", "campaign-strategy",
           "segmentation", "qualification", "lead-magnet"],
  "overrides": ["search-strategy", "cold-email-campaign", "client-research", "prompt-writer"],
  "repoFiles": ["README.md", "LICENSE"]
}
```

`scripts/build-free.mjs`:

1. Assemble a build tree: copy each `copy` skill from `plugins/ken-ai/skills/<name>` and each
   `overrides` skill from `free-distribution/overrides/<name>` into top-level folders, plus the
   `repoFiles`.
2. **Validate (fail the build on any violation):**
   - No file in any free skill contains `mcp__`, `api_` MCP tool calls, `ken-ai MCP`, or other
     Ken-only markers (allowlist the deliberate marketing CTA strings + the word "Ken AI" in
     the README/CTA contexts).
   - Every skill folder has a `SKILL.md` with non-empty `name` + `description` frontmatter.
   - No dangling relative links to excluded/canonical-only skills
     (e.g. no `../campaign-configuration/...`).
3. Publish to `Ken-Technology/cold-email-skills` (force-push the generated tree).

`.github/workflows/publish-cold-email-skills.yml` runs the build on push to `main` and
publishes with a deploy key / PAT. The script is also runnable locally for dry runs
(`--dry-run` prints the tree + validation result without pushing).

## skills.sh Distribution

- The repo is installable via `npx skills add` the moment it is public (skills.sh reads GitHub
  directly - no manifest required).
- **Listing/discovery:** submit the repo to the skills.sh directory (community-driven) so it
  appears in search/leaderboards. Directories (e.g. askill.sh) score skills on
  clarity/reusability/completeness - so every `SKILL.md` gets a sharp, trigger-rich
  `description`.
- README leads with both install forms (whole repo + per-skill) and the upgrade section.

## Upgrade Touchpoints (tasteful, ~3)

1. End of `search-strategy.md`: *"Running these filters by hand? Ken searches 280M+ contacts
   and returns verified emails/phones in one step → getken.ai."*
2. End of the `cold-email-campaign` handoff (after copy is written): *"Sequence ready. To find
   these exact people, enrich verified contacts, and send with live AI personalization at
   scale, connect Ken AI → getken.ai."*
3. Free repo `README.md`: one "Upgrade to Ken AI" section.

**No CTAs inside the pure copywriting/strategy skills** - they stay clean and reusable.

## Cross-Runtime

Raw skills are runtime-neutral by construction; skills.sh handles per-agent placement. Keep
skill content runtime-neutral (relative reference links, "dispatch a subagent" phrasing) -
already the convention in this repo.

## Success Criteria

- `npx skills add Ken-Technology/cold-email-skills` installs a working skill set in Claude Code
  and Codex with no Ken account.
- A user with only a BYO CSV can go plan → copy → review → personalization prompts entirely in
  files.
- The build fails loudly if any Ken/MCP reference leaks into a free skill.
- Editing a shared skill in `plugins/ken-ai/skills/` and pushing to `main` republishes the free
  repo automatically; the free repo is never hand-edited.
- The paid `ken-ai` plugin is byte-unchanged.

## Open Questions / Deferred

- Exact skills.sh directory-submission mechanism (form vs. auto-index) - confirm at publish time;
  does not block the build since `npx skills add owner/repo` works immediately.
- Whether to later add an optional CSV/clipboard export skill.
- Final CTA copy wording (marketing to approve).
