import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = path.join(repoRoot, 'plugins', 'ken-ai');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

test('shimmed plugin ships only SKILL.md per skill and no dead relative links', () => {
  const skillsDir = path.join(pluginRoot, 'skills');
  for (const skill of readdirSync(skillsDir)) {
    const files = walk(path.join(skillsDir, skill));
    assert.deepEqual(
      files.map(f => path.relative(path.join(skillsDir, skill), f)),
      ['SKILL.md'],
      `${skill} must contain exactly SKILL.md`
    );
  }
  for (const f of walk(pluginRoot).filter(f => f.endsWith('.md'))) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(/\]\((\.{1,2}\/[^)#]+)/g)) {
      const target = path.resolve(path.dirname(f), m[1]);
      assert.ok(existsSync(target), `dead link ${m[1]} in ${path.relative(repoRoot, f)}`);
    }
  }
});

test('every skill shim points at load_skill with its own name', () => {
  const skillsDir = path.join(pluginRoot, 'skills');
  for (const skill of readdirSync(skillsDir)) {
    const text = readFileSync(path.join(skillsDir, skill, 'SKILL.md'), 'utf8');
    assert.ok(text.includes(`load_skill("${skill}")`), `${skill} shim missing load_skill`);
    // Frontmatter must survive the shim: a leading `---` block that carries a
    // `name:` key. The `^name:` multiline anchor (not `\nname:`) is deliberate -
    // `name` is the first frontmatter key, so there is no newline before it.
    assert.ok(/^---\n[\s\S]*?^name:\s*\S/m.test(text), `${skill} lost its frontmatter`);
  }
});

test('claude and codex plugin manifests carry the same final version', () => {
  const claude = JSON.parse(readFileSync(path.join(pluginRoot, '.claude-plugin', 'plugin.json'), 'utf8'));
  const codex = JSON.parse(readFileSync(path.join(pluginRoot, '.codex-plugin', 'plugin.json'), 'utf8'));
  assert.equal(claude.version, codex.version);
  assert.equal(claude.version, '1.0.0');
  assert.match(claude.description, /^DEPRECATED/);
  assert.match(codex.description, /^DEPRECATED/);
});
