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
    // Catch ANY relative markdown link target, not just ones prefixed ./ or ../
    // (e.g. `](references/foo.md)`). Skip URLs, anchors, and site-absolute
    // paths - only local relative file targets are resolved and existence-checked.
    for (const m of text.matchAll(/\]\(([^)]+)\)/g)) {
      let target = m[1].trim().split(/\s+/)[0]; // drop any `"title"` after the path
      const hash = target.indexOf('#');
      if (hash !== -1) target = target.slice(0, hash); // drop `#anchor` fragment
      if (!target) continue; // pure anchor or empty
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue; // http:, https:, mailto:, ...
      if (target.startsWith('//')) continue; // protocol-relative URL
      if (target.startsWith('/')) continue; // site-absolute path, not a repo file
      const resolved = path.resolve(path.dirname(f), target);
      assert.ok(existsSync(resolved), `dead link ${target} in ${path.relative(repoRoot, f)}`);
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
