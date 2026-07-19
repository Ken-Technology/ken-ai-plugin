import { readFileSync, mkdirSync, rmSync, cpSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function loadManifest(manifestPath) {
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

export function assemble(manifest, { canonicalSkillsDir, overridesDir, outDir }) {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const skills = [];
  for (const name of manifest.copy) {
    if (!existsSync(path.join(canonicalSkillsDir, name))) {
      throw new Error(
        `copy skill '${name}' not found under ${canonicalSkillsDir}; the free ` +
        `distribution must be self-contained (free-distribution/overrides/)`
      );
    }
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

export function validate(buildDir, expected = null) {
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

  // exact-set enforcement (only when the caller passes the expected list)
  if (expected) {
    for (const d of [...new Set(expected.filter((n, i) => expected.indexOf(n) !== i))]) {
      errors.push(`Duplicate expected skill: ${d}`);
    }
    const want = new Set(expected);
    const got = new Set(topSkills);
    for (const w of want) if (!got.has(w)) errors.push(`Missing skill: ${w}`);
    for (const g of got) if (!want.has(g)) errors.push(`Unexpected skill: ${g}`);
  }

  // Required verbatim CTAs. Each entry is the exact line the published skill
  // must contain, INCLUDING the canonical UTM-tagged URL - previously the
  // constants ended at the bare https://ken.so and only matched the shipped
  // UTM-tagged lines by string-prefix accident (and the Ken Daily line was
  // unvalidated entirely).
  const CTAS = {
    'search-strategy': [
      'Running these filters by hand? Ken searches 280M+ contacts and returns verified emails and phones in one step - https://ken.so/?utm_source=skill&utm_medium=agent',
      'Just need a trickle of leads to start? Ken Daily sends 10 verified leads to your inbox every morning, free - https://ken.so/daily?utm_source=skill&utm_medium=agent',
    ],
    'cold-email-campaign': [
      'Sequence ready. To find these exact people, enrich verified contacts, and send with live AI personalization at scale, connect Ken AI - https://ken.so/?utm_source=skill&utm_medium=agent',
    ],
  };
  for (const [skill, ctas] of Object.entries(CTAS)) {
    if (topSkills.includes(skill)) {
      const p = path.join(buildDir, skill, 'SKILL.md');
      const text = existsSync(p) ? readFileSync(p, 'utf8') : '';
      for (const cta of ctas) {
        if (!text.includes(cta)) {
          errors.push(`Missing verbatim CTA in ${skill}/SKILL.md: "${cta.slice(0, 60)}..."`);
        }
      }
    }
  }

  // no em-dashes anywhere in the built markdown
  for (const f of mdFiles) {
    if (readFileSync(f, 'utf8').includes('—')) {
      errors.push(`Em-dash found in ${path.relative(buildDir, f)}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

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
  const { ok, errors } = validate(outDir, [...manifest.copy, ...manifest.overrides]);

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
