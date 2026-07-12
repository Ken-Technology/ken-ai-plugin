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
