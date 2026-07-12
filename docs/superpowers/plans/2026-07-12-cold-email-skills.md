# cold-email-skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a free, MIT-licensed open-source skills repo (`Ken-Technology/cold-email-skills`) built as a pure artifact from this canonical repo, giving anyone a files-only cold-email workflow with no Ken account or MCP.

**Architecture:** Shared skills stay authored once in `plugins/ken-ai/skills/`. A `free-distribution/manifest.json` declares which skills are copied verbatim and which are overridden by free-only/adapted versions in `free-distribution/overrides/`. A Node build script (`scripts/build-free.mjs`) assembles them into a flat top-level skills tree, validates that no Ken/MCP references leak, and a GitHub Action force-pushes the result to the free repo on every push to `main`.

**Tech Stack:** Node.js 20 (ES modules, built-in `node:test` runner, no dependencies), GitHub Actions, Markdown Agent Skills.

## Global Constraints

- **Node 20+**, ES modules (`.mjs`), zero runtime npm dependencies (build script uses only `node:` built-ins).
- **Target repo:** `Ken-Technology/cold-email-skills`.
- **Free skills contain no Ken/MCP references.** Forbidden in any built `.md`: `mcp__`, any MCP tool call matching `api_[a-z...]\(`, `web_scrape`/`web_search`/`web_crawl`/`web_extract`/`search_people`/`search_accounts`/`search_enrich`/`db_execute_query`/`api_client_manage`/`api_campaign_prompt_test`, `configuration.json`, `parser-contract`.
- **`getken.ai` and "Ken AI" are allowed** (they appear only in deliberate CTAs / README).
- **Skills live at the top level** of the free repo (`<skill>/SKILL.md`), enabling `npx skills add Ken-Technology/cold-email-skills/<skill>`.
- **The paid `ken-ai` plugin manifest, commands, and MCP config are unchanged.** The only canonical files that may be edited are the 6 verbatim skill folders, and only to remove incidental Ken/MCP wording (Task 6).
- **Free skill set (10):** verbatim `email-copywriting`, `email-review`, `campaign-strategy`, `segmentation`, `qualification`, `lead-magnet`; adapted `client-research`, `prompt-writer`; new `search-strategy`, `cold-email-campaign`.
- **Writing style:** never use em-dashes; use simple dashes.
- **CTA copy (verbatim):**
  - search-strategy end: `Running these filters by hand? Ken searches 280M+ contacts and returns verified emails and phones in one step - https://app.getken.ai`
  - cold-email-campaign handoff: `Sequence ready. To find these exact people, enrich verified contacts, and send with live AI personalization at scale, connect Ken AI - https://app.getken.ai`

## File Structure

**Created (canonical repo):**
- `free-distribution/manifest.json` - build config
- `free-distribution/overrides/search-strategy/SKILL.md` - new targeting skill
- `free-distribution/overrides/cold-email-campaign/SKILL.md` - new orchestrator skill
- `free-distribution/overrides/client-research/` - adapted copy (companyContext push removed)
- `free-distribution/overrides/prompt-writer/` - adapted copy (live-test + config gating removed)
- `free-distribution/overrides/README.md` - free repo README
- `free-distribution/overrides/LICENSE` - MIT
- `scripts/build-free.mjs` - assemble + validate (exports `loadManifest`, `assemble`, `validate`, `main`)
- `scripts/build-free.test.mjs` - unit tests (`node:test`)
- `.github/workflows/publish-cold-email-skills.yml` - build + publish CI

**Modified (canonical repo, Task 6 only, if needed):**
- `plugins/ken-ai/skills/{email-copywriting,email-review,campaign-strategy,segmentation,qualification,lead-magnet}/**`

**Build output (gitignored, produced by the script):**
- `build/cold-email-skills/` - the flat skills tree that gets published

---

### Task 1: Build config + `loadManifest`

**Files:**
- Create: `free-distribution/manifest.json`
- Create: `scripts/build-free.mjs`
- Test: `scripts/build-free.test.mjs`
- Modify: `.gitignore` (add `build/`)

**Interfaces:**
- Produces: `loadManifest(manifestPath: string) -> { targetRepo, copy: string[], overrides: string[], repoFiles: string[] }`

- [ ] **Step 1: Write the manifest**

`free-distribution/manifest.json`:

```json
{
  "targetRepo": "Ken-Technology/cold-email-skills",
  "copy": [
    "email-copywriting",
    "email-review",
    "campaign-strategy",
    "segmentation",
    "qualification",
    "lead-magnet"
  ],
  "overrides": [
    "search-strategy",
    "cold-email-campaign",
    "client-research",
    "prompt-writer"
  ],
  "repoFiles": ["README.md", "LICENSE"]
}
```

- [ ] **Step 2: Write the failing test**

`scripts/build-free.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadManifest } from './build-free.mjs';

test('loadManifest parses the manifest json', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ces-'));
  const p = path.join(dir, 'manifest.json');
  writeFileSync(p, JSON.stringify({
    targetRepo: 'x/y', copy: ['a'], overrides: ['b'], repoFiles: ['README.md']
  }));
  const m = loadManifest(p);
  assert.equal(m.targetRepo, 'x/y');
  assert.deepEqual(m.copy, ['a']);
  assert.deepEqual(m.overrides, ['b']);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test scripts/build-free.test.mjs`
Expected: FAIL - `loadManifest` is not exported / module has no such export.

- [ ] **Step 4: Write minimal implementation**

`scripts/build-free.mjs`:

```js
import { readFileSync } from 'node:fs';

export function loadManifest(manifestPath) {
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}
```

- [ ] **Step 5: Add `build/` to .gitignore**

Append a line `build/` to `.gitignore` (create the file with that single line if it does not exist).

- [ ] **Step 6: Run test to verify it passes**

Run: `node --test scripts/build-free.test.mjs`
Expected: PASS (1 test).

- [ ] **Step 7: Commit**

```bash
git add free-distribution/manifest.json scripts/build-free.mjs scripts/build-free.test.mjs .gitignore
git commit -m "feat: build config + loadManifest for cold-email-skills"
```

---

### Task 2: `assemble` - copy skills + repo files into a flat tree

**Files:**
- Modify: `scripts/build-free.mjs`
- Test: `scripts/build-free.test.mjs`

**Interfaces:**
- Consumes: `loadManifest` output.
- Produces: `assemble(manifest, { canonicalSkillsDir, overridesDir, outDir }) -> { outDir: string, skills: string[] }` - wipes `outDir`, copies each `copy` skill from `canonicalSkillsDir`, each `overrides` skill from `overridesDir`, and each `repoFiles` entry from `overridesDir`, all to the top level of `outDir`. Returns the skill folder names written.

- [ ] **Step 1: Write the failing test**

Add to `scripts/build-free.test.mjs`:

```js
import { assemble } from './build-free.mjs';
import { existsSync, readFileSync as rf } from 'node:fs';

function writeSkill(root, name, body = 'body') {
  mkdirSync(path.join(root, name), { recursive: true });
  writeFileSync(path.join(root, name, 'SKILL.md'),
    `---\nname: ${name}\ndescription: does ${name}\n---\n\n${body}\n`);
}

test('assemble copies copy-skills, override-skills, and repo files flat', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ces-'));
  const canonical = path.join(dir, 'canonical');
  const overrides = path.join(dir, 'overrides');
  const out = path.join(dir, 'out');
  writeSkill(canonical, 'email-copywriting');
  writeSkill(overrides, 'search-strategy');
  writeFileSync(path.join(overrides, 'README.md'), '# readme');
  writeFileSync(path.join(overrides, 'LICENSE'), 'MIT');

  const manifest = {
    copy: ['email-copywriting'],
    overrides: ['search-strategy'],
    repoFiles: ['README.md', 'LICENSE'],
  };
  const res = assemble(manifest, {
    canonicalSkillsDir: canonical, overridesDir: overrides, outDir: out,
  });

  assert.deepEqual(res.skills.sort(), ['email-copywriting', 'search-strategy']);
  assert.ok(existsSync(path.join(out, 'email-copywriting', 'SKILL.md')));
  assert.ok(existsSync(path.join(out, 'search-strategy', 'SKILL.md')));
  assert.equal(rf(path.join(out, 'README.md'), 'utf8'), '# readme');
  assert.ok(existsSync(path.join(out, 'LICENSE')));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/build-free.test.mjs`
Expected: FAIL - `assemble` is not exported.

- [ ] **Step 3: Write minimal implementation**

Add to `scripts/build-free.mjs` (and extend the top import line):

```js
import { readFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import path from 'node:path';

export function assemble(manifest, { canonicalSkillsDir, overridesDir, outDir }) {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const skills = [];
  for (const name of manifest.copy) {
    cpSync(path.join(canonicalSkillsDir, name), path.join(outDir, name), { recursive: true });
    skills.push(name);
  }
  for (const name of manifest.overrides) {
    cpSync(path.join(overridesDir, name), path.join(outDir, name), { recursive: true });
    skills.push(name);
  }
  for (const f of manifest.repoFiles) {
    cpSync(path.join(overridesDir, f), path.join(outDir, f));
  }
  return { outDir, skills };
}
```

(Keep the existing `loadManifest`; merge the `readFileSync` import into the single import from `node:fs`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/build-free.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/build-free.mjs scripts/build-free.test.mjs
git commit -m "feat: assemble flat skills tree from manifest"
```

---

### Task 3: `validate` - Ken/MCP leak check

**Files:**
- Modify: `scripts/build-free.mjs`
- Test: `scripts/build-free.test.mjs`

**Interfaces:**
- Produces: `validate(buildDir: string) -> { ok: boolean, errors: string[] }`. This task implements only the forbidden-pattern (leak) portion; Task 4 adds frontmatter + link checks to the same function.

- [ ] **Step 1: Write the failing test**

Add to `scripts/build-free.test.mjs`:

```js
import { validate } from './build-free.mjs';

test('validate flags forbidden Ken/MCP markers in built skills', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ces-'));
  const out = path.join(dir, 'out');
  writeSkill(out, 'clean', 'just good copy advice');
  writeSkill(out, 'leaky', 'call api_client_manage(operation) via mcp__ken-ai');
  const res = validate(out);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some(e => e.includes('leaky')));
  assert.ok(!res.errors.some(e => e.includes('clean')));
});

test('validate passes a clean tree', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ces-'));
  const out = path.join(dir, 'out');
  writeSkill(out, 'clean', 'reach out to Ken AI at https://app.getken.ai to upgrade');
  const res = validate(out);
  assert.equal(res.ok, true, JSON.stringify(res.errors));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/build-free.test.mjs`
Expected: FAIL - `validate` is not exported.

- [ ] **Step 3: Write minimal implementation**

Add to `scripts/build-free.mjs` (extend the `node:fs` import with `readdirSync`, `statSync`):

```js
const FORBIDDEN = [
  /mcp__/,
  /\bapi_[a-z][a-z0-9_]*\s*\(/,
  /\b(?:web_scrape|web_search|web_crawl|web_extract|search_people|search_accounts|search_enrich|db_execute_query|api_client_manage|api_campaign_prompt_test)\b/,
  /configuration\.json/,
  /parser-contract/,
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

export function validate(buildDir) {
  const errors = [];
  const mdFiles = walk(buildDir).filter(f => f.endsWith('.md'));
  for (const f of mdFiles) {
    const text = readFileSync(f, 'utf8');
    for (const pat of FORBIDDEN) {
      if (pat.test(text)) {
        errors.push(`Forbidden pattern ${pat} in ${path.relative(buildDir, f)}`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/build-free.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/build-free.mjs scripts/build-free.test.mjs
git commit -m "feat: validate leak-checks built skills for Ken/MCP markers"
```

---

### Task 4: `validate` - frontmatter + dangling cross-skill links

**Files:**
- Modify: `scripts/build-free.mjs`
- Test: `scripts/build-free.test.mjs`

**Interfaces:**
- Consumes/extends: `validate(buildDir)` from Task 3 - append two checks, keep the same return shape.

- [ ] **Step 1: Write the failing test**

Add to `scripts/build-free.test.mjs`:

```js
test('validate flags a skill missing its description', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ces-'));
  const out = path.join(dir, 'out');
  mkdirSync(path.join(out, 'broken'), { recursive: true });
  writeFileSync(path.join(out, 'broken', 'SKILL.md'), `---\nname: broken\n---\nbody\n`);
  const res = validate(out);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some(e => e.includes('description') && e.includes('broken')));
});

test('validate flags a link to a skill not in the build', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ces-'));
  const out = path.join(dir, 'out');
  writeSkill(out, 'orch', 'see [config](../campaign-configuration/ref.md) for details');
  const res = validate(out);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some(e => e.includes('campaign-configuration')));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/build-free.test.mjs`
Expected: FAIL - both new tests fail (missing description not caught; dangling link not caught).

- [ ] **Step 3: Write minimal implementation**

In `scripts/build-free.mjs`, extend the `node:fs` import with `existsSync`, and insert these two blocks into `validate` before the `return`:

```js
  const topSkills = readdirSync(buildDir)
    .filter(e => statSync(path.join(buildDir, e)).isDirectory());

  // frontmatter: every skill folder has SKILL.md with non-empty name + description
  for (const skill of topSkills) {
    const skillMd = path.join(buildDir, skill, 'SKILL.md');
    if (!existsSync(skillMd)) { errors.push(`Missing SKILL.md in ${skill}`); continue; }
    const fm = readFileSync(skillMd, 'utf8').match(/^---\n([\s\S]*?)\n---/);
    if (!fm) { errors.push(`No frontmatter in ${skill}/SKILL.md`); continue; }
    const name = fm[1].match(/^name:\s*(.+)$/m);
    const desc = fm[1].match(/^description:\s*(.+)$/m);
    if (!name || !name[1].trim()) errors.push(`Missing name in ${skill}/SKILL.md`);
    if (!desc || !desc[1].trim()) errors.push(`Missing description in ${skill}/SKILL.md`);
  }

  // dangling cross-skill links: ../<dir> must be a built skill
  for (const f of mdFiles) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(/\]\(\.\.\/([^/)]+)/g)) {
      if (!topSkills.includes(m[1])) {
        errors.push(`Dangling cross-skill link to '${m[1]}' in ${path.relative(buildDir, f)}`);
      }
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/build-free.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/build-free.mjs scripts/build-free.test.mjs
git commit -m "feat: validate frontmatter and cross-skill links"
```

---

### Task 5: CLI `main` - assemble, validate, exit code

**Files:**
- Modify: `scripts/build-free.mjs`
- Test: `scripts/build-free.test.mjs`

**Interfaces:**
- Produces: `main(argv?: string[], repoRoot?: string) -> number` (0 = ok, 1 = validation failed). Resolves manifest at `<repoRoot>/free-distribution/manifest.json`, canonical skills at `<repoRoot>/plugins/ken-ai/skills`, overrides at `<repoRoot>/free-distribution/overrides`, output at `<repoRoot>/build/cold-email-skills` (override with `--out <dir>`). `--dry-run` deletes the output dir after validating.

- [ ] **Step 1: Write the failing test**

Add to `scripts/build-free.test.mjs`:

```js
import { main } from './build-free.mjs';

function fakeRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'ces-repo-'));
  const canonical = path.join(dir, 'plugins', 'ken-ai', 'skills');
  const overrides = path.join(dir, 'free-distribution', 'overrides');
  mkdirSync(canonical, { recursive: true });
  mkdirSync(overrides, { recursive: true });
  writeSkill(canonical, 'email-copywriting', 'good copy');
  writeSkill(overrides, 'search-strategy', 'good targeting');
  writeFileSync(path.join(overrides, 'README.md'), '# free');
  writeFileSync(path.join(overrides, 'LICENSE'), 'MIT');
  writeFileSync(path.join(dir, 'free-distribution', 'manifest.json'), JSON.stringify({
    targetRepo: 'x/y', copy: ['email-copywriting'],
    overrides: ['search-strategy'], repoFiles: ['README.md', 'LICENSE'],
  }));
  return dir;
}

test('main returns 0 and writes the tree on a clean repo', () => {
  const dir = fakeRepo();
  const code = main([], dir);
  assert.equal(code, 0);
  assert.ok(existsSync(path.join(dir, 'build', 'cold-email-skills', 'search-strategy', 'SKILL.md')));
});

test('main returns 1 when a skill leaks a forbidden marker', () => {
  const dir = fakeRepo();
  writeSkill(path.join(dir, 'free-distribution', 'overrides'), 'search-strategy',
    'run api_client_manage(list) via mcp__ken-ai');
  const code = main([], dir);
  assert.equal(code, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/build-free.test.mjs`
Expected: FAIL - `main` is not exported.

- [ ] **Step 3: Write minimal implementation**

Add to `scripts/build-free.mjs` (extend the `node:fs` import with `rmSync` if not already present, and add the `node:url` import):

```js
import { fileURLToPath } from 'node:url';

export function main(argv = process.argv.slice(2), repoRoot = process.cwd()) {
  const dryRun = argv.includes('--dry-run');
  const outIdx = argv.indexOf('--out');
  const manifest = loadManifest(path.join(repoRoot, 'free-distribution', 'manifest.json'));
  const outDir = outIdx >= 0
    ? path.resolve(repoRoot, argv[outIdx + 1])
    : path.join(repoRoot, 'build', 'cold-email-skills');
  const { skills } = assemble(manifest, {
    canonicalSkillsDir: path.join(repoRoot, 'plugins', 'ken-ai', 'skills'),
    overridesDir: path.join(repoRoot, 'free-distribution', 'overrides'),
    outDir,
  });
  const { ok, errors } = validate(outDir);
  console.log(`Built ${skills.length} skills into ${outDir}`);
  for (const s of skills) console.log(`  - ${s}`);
  if (!ok) {
    console.error('\nValidation FAILED:');
    for (const e of errors) console.error(`  x ${e}`);
  } else {
    console.log('\nValidation passed.');
  }
  if (dryRun) rmSync(outDir, { recursive: true, force: true });
  return ok ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exit(main());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/build-free.test.mjs`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/build-free.mjs scripts/build-free.test.mjs
git commit -m "feat: build-free CLI entry with exit codes"
```

---

### Task 6: Audit and generalize the 6 verbatim canonical skills

**Files:**
- Modify (only if grep finds hits): `plugins/ken-ai/skills/{email-copywriting,email-review,campaign-strategy,segmentation,qualification,lead-magnet}/**`

**Interfaces:** none (content hygiene so the verbatim skills pass `validate`).

- [ ] **Step 1: Grep the verbatim skills for forbidden markers**

Run:

```bash
grep -rnE 'mcp__|api_[a-z][a-z0-9_]*\(|web_scrape|web_search|web_crawl|web_extract|search_people|search_accounts|search_enrich|db_execute_query|api_client_manage|api_campaign_prompt_test|configuration\.json|parser-contract' \
  plugins/ken-ai/skills/email-copywriting \
  plugins/ken-ai/skills/email-review \
  plugins/ken-ai/skills/campaign-strategy \
  plugins/ken-ai/skills/segmentation \
  plugins/ken-ai/skills/qualification \
  plugins/ken-ai/skills/lead-magnet || echo "NO HITS"
```

- [ ] **Step 2: Remove each incidental Ken/MCP reference in place**

For every line the grep prints, edit the file to express the same guidance without the Ken/MCP-specific token. Guidelines:
- A reference to a Ken-specific artifact (e.g. "written to `configuration.json`") becomes the generic equivalent ("recorded in the campaign files") or is dropped if it only made sense on the platform.
- A `parser-contract` link is removed along with the sentence that depends on it.
- Do not change the skill's actual copywriting/strategy advice - only the platform-coupled phrasing.
If Step 1 printed `NO HITS`, this task is a verification no-op; skip to Step 4.

- [ ] **Step 3: Re-run the grep to confirm zero hits**

Run the Step 1 command again.
Expected: `NO HITS`.

- [ ] **Step 4: Commit (only if files changed)**

```bash
git add plugins/ken-ai/skills
git commit -m "chore: strip platform-coupled wording from shareable skills" || echo "nothing to commit"
```

---

### Task 7: New skill - `search-strategy`

**Files:**
- Create: `free-distribution/overrides/search-strategy/SKILL.md`

**Interfaces:** produces the `search-strategy.md` workspace artifact consumed by `cold-email-campaign` (Task 8).

- [ ] **Step 1: Write the skill**

Create `free-distribution/overrides/search-strategy/SKILL.md` with this exact frontmatter:

```markdown
---
name: search-strategy
description: Turn an ICP into portable prospect-search filters you can run in Apollo, Sales Navigator, Clay, ZoomInfo, or any list tool, plus the CSV shape for a bring-your-own list. Use when defining who to target for a cold-email campaign without a specific data provider. Triggers on "who should I target", "build my prospect filters", "define the ICP filters", or as the targeting step of the cold-email-campaign workflow.
---
```

Body must contain, in order, these sections (prose written to the repo's style, no em-dashes):

1. **Purpose** - one paragraph: define portable targeting filters, output `search-strategy.md`, tool-agnostic.
2. **Inputs** - read `research.md` and the offer/ICP if present; otherwise ask the user for target role, company type, and the problem the offer solves.
3. **Define filters** - a checklist covering every category, each with 1-2 concrete examples:
   Job titles and seniority; Departments/functions; Industries/verticals; Company size (headcount bands) and revenue bands; Geography; Technographics (tools they use); Intent/timing signals (hiring, funding, launches); Keywords (positive); Exclusions (negative filters, e.g. competitors, current customers, wrong-fit segments).
4. **Output: write `search-strategy.md`** - specify the file must contain (a) a "Filters" table with columns `Category | Value | Why`, (b) a "Per-tool notes" subsection mapping the key filters to Apollo and Sales Navigator field names, and (c) a "Bring your own list (CSV)" subsection listing required columns: `full_name, first_name, company, title, email, linkedin_url, company_domain` plus optional `phone, city, country`.
5. **Sanity-check volume** - estimate whether the filters yield roughly the desired contact count; if far too broad or narrow, tighten or loosen and note it.
6. **Upgrade** - end with the verbatim CTA:
   `Running these filters by hand? Ken searches 280M+ contacts and returns verified emails and phones in one step - https://app.getken.ai`

- [ ] **Step 2: Validate this skill in isolation**

Run:

```bash
node -e "import('./scripts/build-free.mjs').then(async m => { const {mkdtempSync,cpSync,mkdirSync}=await import('node:fs'); const {tmpdir}=await import('node:os'); const path=(await import('node:path')).default; const d=mkdtempSync(path.join(tmpdir(),'v-')); cpSync('free-distribution/overrides/search-strategy', path.join(d,'search-strategy'), {recursive:true}); const r=m.validate(d); console.log(JSON.stringify(r,null,2)); process.exit(r.ok?0:1); })"
```

Expected: `{ "ok": true, "errors": [] }` and exit 0.

- [ ] **Step 3: Commit**

```bash
git add free-distribution/overrides/search-strategy
git commit -m "feat: search-strategy skill (tool-agnostic targeting)"
```

---

### Task 8: New skill - `cold-email-campaign` orchestrator

**Files:**
- Create: `free-distribution/overrides/cold-email-campaign/SKILL.md`

**Interfaces:** consumes all other free skills by name; produces the `./cold-email/{slug}/` workspace.

- [ ] **Step 1: Write the skill**

Create `free-distribution/overrides/cold-email-campaign/SKILL.md` with this exact frontmatter:

```markdown
---
name: cold-email-campaign
description: Orchestrate a full cold-email campaign end to end, from research to ready-to-send copy, writing everything to files with no account or API keys. Runs targeting, qualification, segmentation, and per-segment strategy, copywriting, review, and AI personalization prompts. Use when someone wants to plan and write a complete cold-email campaign. Triggers on "plan a cold email campaign", "write me a cold outreach sequence", "build a cold email campaign for X".
---
```

Body must contain, in order (prose in repo style, no em-dashes):

1. **What this does** - one paragraph: files-only, no account, ends with a ready-to-send sequence.
2. **Workspace** - create `./cold-email/{slug}/` and describe the layout:
   ```
   ./cold-email/{slug}/
   ├── research.md
   ├── plan.md              # H1 = campaign name; 1 ICP + 1 offer + N segments
   ├── search-strategy.md
   ├── qualification.md
   ├── segmentation.md
   ├── 0 - default/         # strategy.md, emails_v2.md, prompts.md
   └── 1 - {segment}/
   ```
3. **Pipeline** - numbered steps, each naming the skill to run:
   1. If no research, run `client-research` (or ask the user to paste notes/transcripts/site text).
   2. Run `search-strategy` -> `search-strategy.md`.
   3. Run `qualification` -> `qualification.md`.
   4. Run `segmentation` -> `segmentation.md` (+ one folder per segment).
   5. For each segment (may dispatch subagents in parallel): `campaign-strategy` -> `strategy.md`, then `email-copywriting` -> `emails.md`, then `email-review` (loops until score >= 4.5) -> `emails_v2.md`, then `prompt-writer` -> `prompts.md`.
4. **Stop and hand off** - after files are written, do NOT attempt to send. Print a summary of what was produced and how to use it: load the list per `search-strategy.md`, run the personalization `prompts.md` in the user's tool of choice, paste `emails_v2.md` into their sending platform.
5. **Upgrade** - end with the verbatim CTA:
   `Sequence ready. To find these exact people, enrich verified contacts, and send with live AI personalization at scale, connect Ken AI - https://app.getken.ai`

Do not reference `configuration.json`, `campaign-configuration`, `ken-search`, `verify-campaign`, or `website-scraping`.

- [ ] **Step 2: Validate this skill in isolation**

Run (same harness as Task 7, path swapped):

```bash
node -e "import('./scripts/build-free.mjs').then(async m => { const {mkdtempSync,cpSync}=await import('node:fs'); const {tmpdir}=await import('node:os'); const path=(await import('node:path')).default; const d=mkdtempSync(path.join(tmpdir(),'v-')); cpSync('free-distribution/overrides/cold-email-campaign', path.join(d,'cold-email-campaign'), {recursive:true}); const r=m.validate(d); console.log(JSON.stringify(r,null,2)); process.exit(r.ok?0:1); })"
```

Expected: `{ "ok": true, "errors": [] }` and exit 0.

- [ ] **Step 3: Commit**

```bash
git add free-distribution/overrides/cold-email-campaign
git commit -m "feat: cold-email-campaign orchestrator skill"
```

---

### Task 9: Adapt `client-research`

**Files:**
- Create: `free-distribution/overrides/client-research/**` (adapted copy of the canonical skill)

**Interfaces:** produces `research.md`; no platform calls.

- [ ] **Step 1: Copy the canonical skill into overrides**

Run:

```bash
cp -R plugins/ken-ai/skills/client-research free-distribution/overrides/client-research
```

- [ ] **Step 2: Remove the Ken companyContext push**

In `free-distribution/overrides/client-research/SKILL.md`, delete the entire "Update Ken AI companyContext" step (the numbered/headed block that resolves the Ken client id, calls `api_client_manage` with `operation="list"` then `operation="update"`, and ends with the "Pushed companyContext to Ken AI" user message - roughly the `## ...` / step around canonical lines 146-180). Renumber any following steps. The skill should now end after producing `research.md`.

- [ ] **Step 3: Remove any remaining forbidden markers and delete Ken-only references**

Run the leak grep scoped to this folder:

```bash
grep -rnE 'mcp__|api_[a-z][a-z0-9_]*\(|configuration\.json|parser-contract|api_client_manage' free-distribution/overrides/client-research || echo "NO HITS"
```

Remove each remaining hit (delete the dependent sentence). Delete any `references/*.md` in this folder that only documented the platform push.

- [ ] **Step 4: Validate this skill in isolation**

Run:

```bash
node -e "import('./scripts/build-free.mjs').then(async m => { const {mkdtempSync,cpSync}=await import('node:fs'); const {tmpdir}=await import('node:os'); const path=(await import('node:path')).default; const d=mkdtempSync(path.join(tmpdir(),'v-')); cpSync('free-distribution/overrides/client-research', path.join(d,'client-research'), {recursive:true}); const r=m.validate(d); console.log(JSON.stringify(r,null,2)); process.exit(r.ok?0:1); })"
```

Expected: `{ "ok": true, "errors": [] }` and exit 0.

- [ ] **Step 5: Commit**

```bash
git add free-distribution/overrides/client-research
git commit -m "feat: adapt client-research for the free repo (no platform push)"
```

---

### Task 10: Adapt `prompt-writer`

**Files:**
- Create: `free-distribution/overrides/prompt-writer/**` (adapted copy of the canonical skill)

**Interfaces:** produces `prompts.md`; no platform calls.

- [ ] **Step 1: Copy the canonical skill into overrides**

Run:

```bash
cp -R plugins/ken-ai/skills/prompt-writer free-distribution/overrides/prompt-writer
```

- [ ] **Step 2: Delete the Ken configuration reference file**

Run:

```bash
rm -f free-distribution/overrides/prompt-writer/references/configuration.md
```

- [ ] **Step 3: Rewrite the frontmatter description**

Set the `description` in `free-distribution/overrides/prompt-writer/SKILL.md` to exactly:

```
description: Generate AI personalization prompts for cold email campaigns. Reads the AI variables from a campaign strategy and outputs detailed prompts you can run in any personalization tool or LLM to tailor each email per prospect. Use after campaign strategy, or when creating prompts for an existing sequence. Triggers on "write prompts for this campaign", "generate personalization prompts".
```

- [ ] **Step 4: Remove the live-campaign-test half and config gating**

In `SKILL.md`, remove:
- the live campaign test step and its calls (`api_campaign_prompt_test`, `api_ai_supported_models`, `api_ai_token_analysis`) and any example invocation blocks for them;
- the "Graceful Degradation" branch keyed on `configuration.json` / `campaign_id` (the whole section and any references to it);
- any remaining `references/configuration.md` links and "for Ken AI" / "Ken AI's AI" phrasings (reframe to "your personalization tool" or "the LLM").
Keep the internal text-review of the drafted prompts (rephrased so it no longer says it runs before a live campaign test). Keep the `{{Title Case}}` variable convention.

- [ ] **Step 5: Confirm no forbidden markers remain**

Run:

```bash
grep -rnE 'mcp__|api_[a-z][a-z0-9_]*\(|configuration\.json|parser-contract' free-distribution/overrides/prompt-writer || echo "NO HITS"
```

Expected: `NO HITS`. Fix any remaining hit before continuing.

- [ ] **Step 6: Validate this skill in isolation**

Run:

```bash
node -e "import('./scripts/build-free.mjs').then(async m => { const {mkdtempSync,cpSync}=await import('node:fs'); const {tmpdir}=await import('node:os'); const path=(await import('node:path')).default; const d=mkdtempSync(path.join(tmpdir(),'v-')); cpSync('free-distribution/overrides/prompt-writer', path.join(d,'prompt-writer'), {recursive:true}); const r=m.validate(d); console.log(JSON.stringify(r,null,2)); process.exit(r.ok?0:1); })"
```

Expected: `{ "ok": true, "errors": [] }` and exit 0.

- [ ] **Step 7: Commit**

```bash
git add free-distribution/overrides/prompt-writer
git commit -m "feat: adapt prompt-writer for the free repo (tool-agnostic prompts)"
```

---

### Task 11: Free repo README + LICENSE

**Files:**
- Create: `free-distribution/overrides/README.md`
- Create: `free-distribution/overrides/LICENSE`

**Interfaces:** copied to the free repo root by `assemble` via `repoFiles`.

- [ ] **Step 1: Write the README**

Create `free-distribution/overrides/README.md` covering, in order:
1. Title `# cold-email-skills` and a one-line description: free, open-source Agent Skills for planning and writing cold-email campaigns, no account required.
2. **Install** - both forms:
   ```
   npx skills add Ken-Technology/cold-email-skills
   npx skills add Ken-Technology/cold-email-skills/email-copywriting
   ```
   plus a line that they install into Claude Code, Codex, and other agents via skills.sh.
3. **What's inside** - bullet list of the 10 skills with a one-line description each (`cold-email-campaign`, `search-strategy`, `qualification`, `segmentation`, `campaign-strategy`, `email-copywriting`, `email-review`, `prompt-writer`, `client-research`, `lead-magnet`).
4. **Quick start** - tell users to run the `cold-email-campaign` skill (ask their agent to "plan a cold email campaign"); note it is files-only and bring-your-own list.
5. **Upgrade to Ken AI** - one short section: these skills plan and write; to find the contacts, verify emails/phones, and send at scale with live AI personalization, use Ken AI at https://app.getken.ai.
6. **License** - MIT.

- [ ] **Step 2: Write the LICENSE**

Create `free-distribution/overrides/LICENSE` with the standard MIT License text, copyright line: `Copyright (c) 2026 Ken Technology`.

- [ ] **Step 3: Commit**

```bash
git add free-distribution/overrides/README.md free-distribution/overrides/LICENSE
git commit -m "docs: free repo README and MIT license"
```

---

### Task 12: Full build integration check

**Files:**
- Test: `scripts/build-free.test.mjs` (add an integration test that runs against the real repo)

**Interfaces:** exercises `main([], repoRoot)` end to end on the real canonical tree.

- [ ] **Step 1: Write the failing/integration test**

Add to `scripts/build-free.test.mjs`:

```js
import { fileURLToPath } from 'node:url';

test('integration: real repo builds 10 skills and passes validation', () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const out = path.join(repoRoot, 'build', 'cold-email-skills');
  const code = main(['--out', out], repoRoot);
  assert.equal(code, 0);
  const dirs = ['cold-email-campaign','search-strategy','qualification','segmentation',
    'campaign-strategy','email-copywriting','email-review','prompt-writer',
    'client-research','lead-magnet'];
  for (const d of dirs) {
    assert.ok(existsSync(path.join(out, d, 'SKILL.md')), `missing ${d}`);
  }
  assert.ok(existsSync(path.join(out, 'README.md')));
  assert.ok(existsSync(path.join(out, 'LICENSE')));
});
```

- [ ] **Step 2: Run the full test suite**

Run: `node --test scripts/build-free.test.mjs`
Expected: PASS (9 tests). If the integration test fails on a leak/frontmatter/link error, fix the offending skill (Task 6/9/10 remediation) and re-run.

- [ ] **Step 3: Run the CLI once for a human-readable build**

Run: `node scripts/build-free.mjs`
Expected: prints `Built 10 skills into .../build/cold-email-skills`, lists all 10, then `Validation passed.`

- [ ] **Step 4: Commit**

```bash
git add scripts/build-free.test.mjs
git commit -m "test: end-to-end build of the free skills tree"
```

---

### Task 13: GitHub Action to publish

**Files:**
- Create: `.github/workflows/publish-cold-email-skills.yml`

**Interfaces:** on push to `main`, builds and force-pushes `build/cold-email-skills/` to the target repo.

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/publish-cold-email-skills.yml`:

```yaml
name: Publish cold-email-skills
on:
  push:
    branches: [main]
    paths:
      - 'plugins/ken-ai/skills/**'
      - 'free-distribution/**'
      - 'scripts/build-free.mjs'
      - '.github/workflows/publish-cold-email-skills.yml'
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Test build script
        run: node --test scripts/build-free.test.mjs
      - name: Build free repo
        run: node scripts/build-free.mjs --out build/cold-email-skills
      - name: Publish to cold-email-skills
        env:
          DEPLOY_TOKEN: ${{ secrets.COLD_EMAIL_SKILLS_DEPLOY_TOKEN }}
        run: |
          cd build/cold-email-skills
          git init -q
          git config user.name "ken-ai-bot"
          git config user.email "development@getken.ai"
          git add -A
          git commit -q -m "build: sync from ken-ai-plugin@${GITHUB_SHA::7}"
          git branch -M main
          git push --force "https://x-access-token:${DEPLOY_TOKEN}@github.com/Ken-Technology/cold-email-skills.git" main
```

- [ ] **Step 2: Validate the workflow YAML**

Run:

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/publish-cold-email-skills.yml')); print('yaml ok')"
```

Expected: `yaml ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/publish-cold-email-skills.yml
git commit -m "ci: publish cold-email-skills on push to main"
```

- [ ] **Step 4: Post-merge manual steps (record, do not automate)**

Note for the operator (these happen once, outside this branch):
1. Create the empty public repo `Ken-Technology/cold-email-skills`.
2. Add repo secret `COLD_EMAIL_SKILLS_DEPLOY_TOKEN` (a PAT / fine-grained token with `contents:write` on that repo).
3. After the first successful publish, submit the repo to skills.sh for directory listing and confirm `npx skills add Ken-Technology/cold-email-skills` installs cleanly in Claude Code and Codex.

---

## Self-Review

**Spec coverage:**
- Standalone skills repo, top-level layout -> Tasks 2, 12; layout enforced by `assemble`.
- Single source of truth / build artifact -> Tasks 1-5, 12, 13.
- Verbatim skill set clean of Ken refs -> Task 6.
- Adapted `client-research`, `prompt-writer` -> Tasks 9, 10.
- New `search-strategy`, `cold-email-campaign` -> Tasks 7, 8.
- Excluded skills never included -> enforced by manifest (Task 1) + dangling-link check (Task 4).
- Leak validation -> Tasks 3, 4; run in 6-12.
- skills.sh install + listing -> README (Task 11) + Task 13 Step 4.
- Upgrade CTAs (verbatim) -> Tasks 7, 8, 11.
- GitHub Action publish on push to main -> Task 13.
- Paid plugin unchanged -> no task touches `plugins/ken-ai/{.claude-plugin,.codex-plugin,commands,.mcp.json}`; only the 6 verbatim skill folders may change (Task 6).

**Placeholder scan:** No TBD/TODO. Prose-heavy skill tasks (7-11) specify exact frontmatter, ordered required sections, and an objective validation gate rather than inventing final marketing prose.

**Type consistency:** `loadManifest`, `assemble(manifest, {canonicalSkillsDir, overridesDir, outDir})`, `validate(buildDir) -> {ok, errors}`, `main(argv, repoRoot) -> number` are used identically across Tasks 1-5, 7-10, 12. Manifest keys (`copy`, `overrides`, `repoFiles`, `targetRepo`) match between Task 1 and Task 2/5. The 10 skill names match across manifest, Task 12 assertions, and README.
