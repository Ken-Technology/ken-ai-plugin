import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync as rf } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadManifest, assemble } from './build-free.mjs';

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
