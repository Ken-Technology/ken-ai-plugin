import { readFileSync, mkdirSync, rmSync, cpSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export function loadManifest(manifestPath) {
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

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
