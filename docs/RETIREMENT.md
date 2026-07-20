# Ken AI Plugin Retirement

This plugin is retired. Every skill and command in it is now a deprecation shim
that points at the Ken MCP server (`https://mcp.getken.ai/ken-ai/mcp`), which
serves the workflows natively via `list_skills()` / `load_skill("<name>")` and
the typed `api_campaign_status` / `api_campaign_export` tools. The only artifact
here that keeps working value is the bundled MCP server config
(`plugins/ken-ai/.mcp.json` and `plugins/ken-ai/.codex-plugin/mcp.json`).

This document enumerates (A) every external link/doc that must change and (B)
the ordered archive checklist. A Verification appendix at the end records the
parity evidence and the fresh-install checks.

## A. External links and docs to update

Each row was grounded by searching before writing. Where a reference could not
be verified from this repo, the row says so and is marked "to verify by owner".

| Location | Reference | Change | Owner | Status (2026-07-19) |
|---|---|---|---|---|
| ken-frontend `src/features/settings/constants/ai-agents.ts` (+ `src/features/settings/components/integrations/ai-agents-setup.tsx`) | plugin repo install steps and `github.com/Ken-Technology/ken-ai-plugin` link | drop the plugin install path so the panel shows MCP-only instructions (this program's Task 07, Layer 1) | frontend | To verify by owner. Actual paths differ from the original task template (which named `.../integrations/ai-agents/constants/ai-agents.ts`). On the ken-frontend `main` checkout the plugin refs are still present: `ai-agents.ts` lines 30, 72-73, 94, 147-148 (plus its `.test.ts`). Task 07 lands these edits on the ken-frontend `ai-onboarding/integration` branch. Confirm in the shipped app (Settings - Integrations - AI Agents) once that branch reaches production. |
| `Ken-Technology/cold-email-skills` README (published from `free-distribution/overrides/README.md`) | any plugin-repo mention | rewrite to an MCP pointer if present | this repo | No change needed. Searched `free-distribution/overrides/README.md` for `plugin` and `ken-ai-plugin`: no plugin-repo mention exists. It references only the free repo (`Ken-Technology/cold-email-skills`) and ken.so UTM links, which Task 11's validator pins and this task must not touch. |
| GitHub repo About/description for `Ken-Technology/ken-ai-plugin` | current tagline | set to `DEPRECATED - use the Ken MCP: mcp.getken.ai/ken-ai` | repo admin (manual) | To verify by owner. Cannot be set from the repo tree; it is a GitHub settings field. |
| Help-center / KB articles referencing the plugin install | install steps ("plugin", "ken-ai-plugin", "marketplace add") | rewrite to the MCP connect flow | support (ticketed) | To verify by owner. The only help-center search tool reachable from this repo targets the Twenty CRM documentation, not the Ken AI KB. A search for "ken-ai-plugin marketplace install AI agents plugin" returned only Twenty CRM "AI Agents" articles, none about this plugin. The Ken KB could not be searched here; support must sweep the KB for the three terms and rewrite any hits. |
| Claude Code / Codex marketplace listing entries cached by users | old plugin description | superseded by the 1.0.0 manifest push | automatic | Automatic on update. The `1.0.0` manifests carry the `DEPRECATED -` prefix; a `/plugin marketplace update` or reinstall picks it up. |
| `docs/superpowers/*` in this repo | historical design/plan docs | leave as history; add a one-line retirement pointer at the top of `2026-07-12-cold-email-skills-design.md` | this repo | Done. A retirement blockquote was added at the top of `docs/superpowers/specs/2026-07-12-cold-email-skills-design.md`. The plan doc `docs/superpowers/plans/2026-07-12-cold-email-skills.md` is left untouched as history. |

## B. Archive checklist

Ordered. Do not archive the GitHub repo until every item above the archive step
is checked.

- [ ] MCP parity re-verified on production (`list_skills`: exact set equality on all 17 names - 13 workflow + `setup-workspace` + 3 infra (`infra-planning`, `domain-selection`, `inbox-configuration`); one `load_skill` body per migration wave; `api_campaign_status` / `api_campaign_export` callable) - date + verifier. **Local parity verified 2026-07-19 against `ai-onboarding/integration` @ `db18e8efa6e4ff985142ebc8e32b84bc9ac54b24`; this item MUST be re-run against `https://mcp.getken.ai/ken-ai/mcp` after ken-ai-mcp PR #402 deploys, before archiving.** (See the Verification appendix for the local evidence.)
- [ ] Final shim version `1.0.0` merged to main and the marketplace update visible in a fresh `/plugin marketplace add Ken-Technology/ken-ai-plugin`.
- [ ] Fresh-install verification passed (see the Verification appendix: interactive install still pending-human; the non-interactive equivalents pass).
- [ ] Free distribution rebuilt and republished from main AFTER the shim merge; `cold-email-skills` repo diff reviewed (must be empty - the free build no longer reads `plugins/`).
- [ ] check-mcp-urls CI disposition: leave the workflow enabled until archive. GitHub archiving disables scheduled runs automatically, so no workflow edit is required. The daily liveness signal it provided moves to the ken-ai-mcp repo's own checks (file that note there).
- [ ] External-link table (section A) fully executed; each row checked off with a date.
- [ ] GitHub: archive `Ken-Technology/ken-ai-plugin` (Settings - Archive). Redirect note: GitHub preserves the repo URL read-only; there is no HTTP redirect to the MCP docs - the README banner IS the redirect. Do NOT rename the repo (renames break marketplace source references for existing installs).
- [ ] Announce in the team ClickUp channel (deprecation note + MCP instructions link).

### check-mcp-urls CI disposition (detail)

The shims still ship the MCP URL, so `scripts/check-mcp-urls.mjs` retains value
until the moment of archive: its offline layer keeps the two runtime configs in
agreement, and its network layer keeps proving `https://mcp.getken.ai/ken-ai/mcp`
resolves to a live RFC 9728 protected resource. Leave
`.github/workflows/check-mcp-urls.yml` enabled. A GitHub-archived repo stops
running scheduled workflows automatically, so no deletion or edit is needed; the
archive step alone retires it. The daily strict liveness signal should be
re-homed to the ken-ai-mcp repo (note filed there per the checklist).

## Verification appendix

### 1. Local MCP parity (binding gate, amended 2026-07-19)

The production `list_skills` parity check is impossible until ken-ai-mcp PR #402
deploys. Per the orchestrator's binding amendment, parity was verified locally
(read-only) against the merged MCP worktree
`/Users/cristian/Projects/.aiob-wt/int-ken-ai-mcp`, branch
`ai-onboarding/integration` @ `db18e8efa6e4ff985142ebc8e32b84bc9ac54b24`.

The MCP `list_skills` tool (`src/ken_mcp/tools/skills.py`) delegates to
`ken_mcp.skills.loader.list_skills()`, which directory-scans
`src/ken_mcp/skills/<name>/SKILL.md` (`discover_skills`) and returns the visible
skills. On a non-client-facing host all discovered skills are visible.

Command (run in the MCP worktree, read-only):

```
KEN_MCP_CLIENT_FACING=0 PYTHONPATH=src .venv/bin/python -c '
from ken_mcp.skills import loader
served = sorted(s["name"] for s in loader.list_skills())
expected = sorted([
  "campaign-configuration","campaign-planning","campaign-strategy","client-research",
  "email-copywriting","email-review","ken-search","lead-magnet","prompt-writer",
  "qualification","segmentation","verify-campaign","website-scraping",
  "setup-workspace","infra-planning","domain-selection","inbox-configuration",
])
print("SERVED (%d):" % len(served), served)
print("MISSING (expected - served):", sorted(set(expected) - set(served)))
print("UNEXPECTED (served - expected):", sorted(set(served) - set(expected)))
print("EXACT SET EQUALITY:", set(served) == set(expected))
'
```

Output:

```
SERVED (17): ['campaign-configuration', 'campaign-planning', 'campaign-strategy', 'client-research', 'domain-selection', 'email-copywriting', 'email-review', 'inbox-configuration', 'infra-planning', 'ken-search', 'lead-magnet', 'prompt-writer', 'qualification', 'segmentation', 'setup-workspace', 'verify-campaign', 'website-scraping']
EXPECTED (17): [...same set...]
MISSING (expected - served): []
UNEXPECTED (served - expected): []
EXACT SET EQUALITY: True
```

Exact set equality holds in both directions: nothing missing, nothing
unexpected. All 17 names match (13 workflow + `setup-workspace` + the 3 infra
skills).

### 2. Typed tools that replace the raw-SQL commands

Both are registered `@ken_tool(client_type="api")` tools in the same worktree:

```
src/ken_mcp/tools/campaign_status.py:202:@ken_tool(client_type="api", name="api_campaign_status")
src/ken_mcp/tools/campaign_export.py:20:@ken_tool(client_type="api", name="api_campaign_export")
```

These replace `commands/campaign-status.md` and `commands/export-campaign.md`,
whose raw-SQL bodies (which required database credentials client principals do
not have) have been removed.

### 3. Script verification (Step 6, this repo)

All run from the plugin worktree root on node v22.20.0:

```
node --test scripts/build-free.test.mjs        # 15 pass / 0 fail
node --test scripts/check-mcp-urls.test.mjs     # 22 pass / 0 fail
node --test scripts/check-shim-links.test.mjs   # 3 pass / 0 fail
node scripts/check-mcp-urls.mjs                 # exit 0; configs agree; 1/1 MCP URLs verified live
node scripts/build-free.mjs --dry-run           # exit 0; 10 skills built from overrides; validation passed
grep -rn "db_execute\|SELECT \|api.getken.ai/v1" plugins/   # clean (no matches)
```

The `check-mcp-urls.mjs` doc sweep now covers every rewritten file; the only MCP
URL any of them ships is `https://mcp.getken.ai/ken-ai/mcp`, which verified live
(RFC 9728 protected-resource metadata `resource` matched). The free-distro build
is unaffected by the shim rewrite because `free-distribution/manifest.json` has
`copy: []` and sources everything from `free-distribution/overrides/` - the
build reads nothing from `plugins/`.

### 4. Fresh-install verification (Step 6.5)

Interactive `/plugin marketplace add` + `/plugin install` inside a running Claude
Code session cannot be executed non-interactively here, so it is marked
**pending-human**. Re-run after the `1.0.0` merge: add the marketplace, install
`ken-ai@ken-ai-plugin`, confirm the 13 skills appear, invoke one (its shim text
should point at `load_skill("<name>")`), and confirm the bundled ken-ai MCP
server appears in `/mcp`.

Non-interactive equivalents (all pass, `claude` CLI 2.1.215):

```
claude plugin validate .                # marketplace manifest: Validation passed (exit 0)
claude plugin validate plugins/ken-ai   # plugin manifest: Validation passed (exit 0)
```

Frontmatter scan of `plugins/ken-ai/skills/`: exactly 13 skill directories, each
with a `SKILL.md` whose frontmatter `name` matches the directory, a non-empty
`description`, and a `load_skill("<name>")` pointer in the body. 13/13 valid, 0
problems.

### 5. Deviation: link-checker frontmatter regex

The link-integrity test in `scripts/check-shim-links.test.mjs` was created from
the task template. The template's frontmatter assertion used
`/^---\n[\s\S]*?\nname:\s*\S/m`, which requires a newline immediately before
`name:`. In every skill `name` is the FIRST frontmatter key (line 2, directly
after the opening `---`), so no such newline exists and the assertion could never
pass against a correctly preserved, byte-identical frontmatter. Since the
frontmatter must stay byte-identical (so skill discovery keeps matching), the
regex - not the frontmatter - was corrected to the multiline anchor
`/^---\n[\s\S]*?^name:\s*\S/m`, which correctly asserts "a leading `---` block
that carries a `name:` line". The test's stated intent ("`<skill> lost its
frontmatter`") is unchanged.
