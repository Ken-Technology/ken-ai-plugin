import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync as rf, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifest, assemble, validate, main } from './build-free.mjs';

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
  writeSkill(out, 'clean', 'reach out to Ken AI at https://ken.so to upgrade');
  const res = validate(out);
  assert.equal(res.ok, true, JSON.stringify(res.errors));
});

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

function fakeRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'ces-repo-'));
  const canonical = path.join(dir, 'plugins', 'ken-ai', 'skills');
  const overrides = path.join(dir, 'free-distribution', 'overrides');
  mkdirSync(canonical, { recursive: true });
  mkdirSync(overrides, { recursive: true });
  // Keep one canonical skill so unit tests can still exercise the copy mechanism
  // (supported, but production manifest has copy: []).
  writeSkill(canonical, 'email-copywriting', 'good copy');
  writeSkill(overrides, 'search-strategy',
    'good targeting\n\n' +
    'Running these filters by hand? Ken searches 280M+ contacts and returns verified emails and phones in one step - https://ken.so/?utm_source=skill&utm_medium=agent\n' +
    'Just need a trickle of leads to start? Ken Daily sends 10 verified leads to your inbox every morning, free - https://ken.so/daily?utm_source=skill&utm_medium=agent');

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

test('validate enforces the exact expected skill set', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ces-'));
  const out = path.join(dir, 'out');
  writeSkill(out, 'a'); writeSkill(out, 'b');
  let r = validate(out, ['a', 'b', 'c']);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes('Missing skill: c')));
  r = validate(out, ['a']);
  assert.ok(r.errors.some(e => e.includes('Unexpected skill: b')));
  r = validate(out, ['a', 'b', 'a']);
  assert.ok(r.errors.some(e => e.includes('Duplicate expected skill: a')));
  r = validate(out, ['a', 'b']);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
});

test('validate flags a missing verbatim CTA and an em-dash', () => {
  const d1 = mkdtempSync(path.join(tmpdir(), 'ces-'));
  const o1 = path.join(d1, 'out');
  writeSkill(o1, 'search-strategy', 'no cta here');
  let r = validate(o1);
  assert.ok(r.errors.some(e => e.includes('CTA') && e.includes('search-strategy')));
  const d2 = mkdtempSync(path.join(tmpdir(), 'ces-'));
  const o2 = path.join(d2, 'out');
  writeSkill(o2, 'x', 'this has an em dash — here');
  r = validate(o2);
  assert.ok(r.errors.some(e => e.includes('Em-dash')));
});

test('manifest no longer sources anything from plugins/', () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const m = loadManifest(path.join(repoRoot, 'free-distribution', 'manifest.json'));
  assert.deepEqual(m.copy, []);
  assert.ok(m.overrides.includes('email-review'));
  assert.ok(m.overrides.includes('lead-magnet'));
});

test('the real build succeeds with plugins/ken-ai/skills absent', () => {
  // Self-containment proof: clone the free-distribution tree into a temp repo
  // root WITHOUT a plugins/ directory and build from there.
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const dir = mkdtempSync(path.join(tmpdir(), 'ces-decoupled-'));
  cpSync(path.join(repoRoot, 'free-distribution'), path.join(dir, 'free-distribution'),
    { recursive: true });
  const code = main(['--out', path.join(dir, 'out')], dir);
  assert.equal(code, 0);
  assert.ok(existsSync(path.join(dir, 'out', 'email-review', 'SKILL.md')));
  assert.ok(existsSync(path.join(dir, 'out', 'lead-magnet', 'references', 'lead-magnet-guide.md')));
});

test('CTA validation requires the canonical UTM-tagged URLs', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ces-'));
  const out = path.join(dir, 'out');
  // Bare URL (no UTM tags) must now FAIL - the shipped CTA is the tagged form.
  writeSkill(out, 'search-strategy',
    'Running these filters by hand? Ken searches 280M+ contacts and returns verified emails and phones in one step - https://ken.so\n' +
    'Just need a trickle of leads to start? Ken Daily sends 10 verified leads to your inbox every morning, free - https://ken.so/daily?utm_source=skill&utm_medium=agent');
  let r = validate(out);
  assert.ok(r.errors.some(e => e.includes('CTA') && e.includes('search-strategy')));

  const dir2 = mkdtempSync(path.join(tmpdir(), 'ces-'));
  const out2 = path.join(dir2, 'out');
  writeSkill(out2, 'search-strategy',
    'Running these filters by hand? Ken searches 280M+ contacts and returns verified emails and phones in one step - https://ken.so/?utm_source=skill&utm_medium=agent\n' +
    'Just need a trickle of leads to start? Ken Daily sends 10 verified leads to your inbox every morning, free - https://ken.so/daily?utm_source=skill&utm_medium=agent');
  r = validate(out2);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
});

test('CTA validation covers the Ken Daily line', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ces-'));
  const out = path.join(dir, 'out');
  // Main CTA present, Daily CTA missing -> error.
  writeSkill(out, 'search-strategy',
    'Running these filters by hand? Ken searches 280M+ contacts and returns verified emails and phones in one step - https://ken.so/?utm_source=skill&utm_medium=agent');
  const r = validate(out);
  assert.ok(r.errors.some(e => e.includes('CTA') && e.includes('search-strategy')));
});
