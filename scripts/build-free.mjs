import { readFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
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
