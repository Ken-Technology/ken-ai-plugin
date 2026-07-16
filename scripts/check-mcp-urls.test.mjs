import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  findConfigDisagreements,
  findMcpUrls,
  main,
  metadataUrlFor,
  readConfiguredUrls,
  verifyResource
} from './check-mcp-urls.mjs';

// Mirrors the real mcp.getken.ai as observed on 2026-07-16:
//   /ken-ai/mcp -> the protected RESOURCE (the MCP endpoint)
//   /ken-ai     -> the AUTHORIZATION SERVER base: a real URL, but not an endpoint
//   everything else 404s at the metadata layer
// Both /ken-ai/mcp and /mcp return an identical 401 at the endpoint itself,
// which is exactly why this check reads metadata instead.
const RESOURCE = 'https://mcp.getken.ai/ken-ai/mcp';
const METADATA = 'https://mcp.getken.ai/.well-known/oauth-protected-resource/ken-ai/mcp';

function fakeFetch(url) {
  const live = url === METADATA;
  return Promise.resolve({
    status: live ? 200 : 404,
    json: async () => {
      if (!live) throw new Error('Not Found');
      return {
        resource: RESOURCE,
        authorization_servers: ['https://mcp.getken.ai/ken-ai']
      };
    }
  });
}

async function makeRepo(files) {
  const dir = await mkdtemp(join(tmpdir(), 'mcp-check-'));
  for (const [path, contents] of Object.entries(files)) {
    const full = join(dir, path);
    await mkdir(join(full, '..'), { recursive: true });
    await writeFile(full, contents);
  }
  return dir;
}

const claudeConfig = (url) =>
  JSON.stringify({ mcpServers: { 'ken-ai': { type: 'http', url } } });
const codexConfig = claudeConfig;
// The shape that shipped: no `mcpServers` envelope, so no server registers.
const bareMapConfig = (url) => JSON.stringify({ 'ken-ai': { type: 'http', url } });

const goodRepo = () => ({
  'plugins/ken-ai/.mcp.json': claudeConfig(RESOURCE),
  'plugins/ken-ai/.codex-plugin/mcp.json': codexConfig(RESOURCE)
});

// ---------------------------------------------------------------- metadataUrlFor

test('metadataUrlFor inserts the well-known suffix between host and path', () => {
  assert.equal(metadataUrlFor(RESOURCE), METADATA);
});

test('metadataUrlFor removes only the slash following the host (RFC 9728 3.1)', () => {
  // Root: the terminating slash after the host IS removed.
  assert.equal(
    metadataUrlFor('https://mcp.getken.ai/'),
    'https://mcp.getken.ai/.well-known/oauth-protected-resource'
  );
  assert.equal(
    metadataUrlFor('https://mcp.getken.ai'),
    'https://mcp.getken.ai/.well-known/oauth-protected-resource'
  );
  // A slash inside the path is significant and must survive: /a/ != /a.
  assert.equal(
    metadataUrlFor('https://mcp.getken.ai/ken-ai/mcp/'),
    'https://mcp.getken.ai/.well-known/oauth-protected-resource/ken-ai/mcp/'
  );
});

test('metadataUrlFor preserves the query component', () => {
  assert.equal(
    metadataUrlFor('https://mcp.getken.ai/ken-ai/mcp?tenant=1'),
    'https://mcp.getken.ai/.well-known/oauth-protected-resource/ken-ai/mcp?tenant=1'
  );
});

test('metadataUrlFor keeps a non-default port', () => {
  assert.equal(
    metadataUrlFor('https://mcp.getken.ai:8443/ken-ai/mcp'),
    'https://mcp.getken.ai:8443/.well-known/oauth-protected-resource/ken-ai/mcp'
  );
});

// ------------------------------------------------------------------- findMcpUrls

test('findMcpUrls extracts URLs from config JSON and markdown prose', () => {
  assert.deepEqual(findMcpUrls(`"url": "${RESOURCE}"`), [RESOURCE]);
  assert.deepEqual(findMcpUrls(`bundles the server (\`${RESOURCE}\`).`), [RESOURCE]);
  assert.deepEqual(findMcpUrls(`see ${RESOURCE}, then run`), [RESOURCE]);
  assert.deepEqual(findMcpUrls(`use ${RESOURCE}!`), [RESOURCE]);
  assert.deepEqual(findMcpUrls('no mcp urls at https://app.ken.so/settings'), []);
});

// Regression: a ported URL used to match only the bare origin, so the checker
// verified a URL nobody ships while the real one went unchecked.
test('findMcpUrls keeps the port and path intact', () => {
  assert.deepEqual(findMcpUrls('https://mcp.getken.ai:8443/ken-ai/mcp'), [
    'https://mcp.getken.ai:8443/ken-ai/mcp'
  ]);
});

test('findMcpUrls skips lines marked mcp-url-ignore', () => {
  // Lets a changelog or post-mortem quote a dead URL without failing the build.
  assert.deepEqual(
    findMcpUrls('was https://mcp.getken.ai/ken-ai before the fix <!-- mcp-url-ignore -->'),
    []
  );
});

// -------------------------------------------------------------- config agreement

test('readConfiguredUrls reads the url each runtime declares', async () => {
  const dir = await makeRepo(goodRepo());
  try {
    const entries = await readConfiguredUrls(dir);
    assert.deepEqual(
      entries.map((e) => [e.runtime, e.url]),
      [
        ['Claude Code', RESOURCE],
        ['Codex', RESOURCE]
      ]
    );
    assert.deepEqual(findConfigDisagreements(entries), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// Regression: THE original bug. Offline, deterministic, no network needed.
test('findConfigDisagreements catches the Claude/Codex URL drift', async () => {
  const dir = await makeRepo({
    'plugins/ken-ai/.mcp.json': claudeConfig('https://mcp.getken.ai/ken-ai'),
    'plugins/ken-ai/.codex-plugin/mcp.json': codexConfig(RESOURCE)
  });
  try {
    const problems = findConfigDisagreements(await readConfiguredUrls(dir));
    assert.equal(problems.length, 1);
    assert.match(problems[0], /disagree on the MCP URL/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// Regression: the Claude Code config shipped a bare server map with no
// `mcpServers` envelope. The URL inside it was irrelevant - nothing registered.
test('readConfiguredUrls rejects a config missing the mcpServers envelope', async () => {
  const dir = await makeRepo({
    'plugins/ken-ai/.mcp.json': bareMapConfig(RESOURCE),
    'plugins/ken-ai/.codex-plugin/mcp.json': codexConfig(RESOURCE)
  });
  try {
    const problems = findConfigDisagreements(await readConfiguredUrls(dir));
    assert.equal(problems.length, 1);
    assert.match(problems[0], /no ken-ai server url declared/);
    assert.equal(await main(dir), 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('readConfiguredUrls reports a missing or urlless config', async () => {
  const dir = await makeRepo({
    'plugins/ken-ai/.codex-plugin/mcp.json': codexConfig(RESOURCE)
  });
  try {
    const problems = findConfigDisagreements(await readConfiguredUrls(dir));
    assert.equal(problems.length, 1);
    assert.match(problems[0], /\.mcp\.json \(Claude Code\): file is missing/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------- verifyResource

test('verifyResource accepts the live endpoint', async () => {
  assert.equal((await verifyResource(RESOURCE, fakeFetch)).ok, true);
});

// Regression: the URL that actually shipped - the auth-server base.
test('verifyResource rejects the auth-server base', async () => {
  const result = await verifyResource('https://mcp.getken.ai/ken-ai', fakeFetch);
  assert.equal(result.ok, false);
  assert.equal(result.transient, false);
  assert.match(result.reason, /not a registered MCP resource/);
});

// Regression: the "fix" a debugging agent inferred from the endpoint's 401.
test('verifyResource rejects the bare /mcp path', async () => {
  const result = await verifyResource('https://mcp.getken.ai/mcp', fakeFetch);
  assert.equal(result.ok, false);
  assert.match(result.reason, /not a registered MCP resource/);
});

test('verifyResource rejects metadata whose resource does not match', async () => {
  const drifted = () =>
    Promise.resolve({
      status: 200,
      json: async () => ({ resource: 'https://mcp.ken.so/ken-ai/mcp' })
    });
  const result = await verifyResource(RESOURCE, drifted);
  assert.equal(result.ok, false);
  assert.equal(result.transient, false);
  assert.match(result.reason, /but this repo ships/);
});

test('verifyResource rejects a fragment in the resource identifier', async () => {
  const result = await verifyResource(`${RESOURCE}#frag`, fakeFetch);
  assert.equal(result.ok, false);
  assert.match(result.reason, /must not contain a fragment/);
});

test('verifyResource marks unreachable hosts transient, not broken config', async () => {
  const offline = () => Promise.reject(new Error('ENOTFOUND'));
  const result = await verifyResource(RESOURCE, offline);
  assert.equal(result.ok, false);
  assert.equal(result.transient, true);
  assert.match(result.reason, /could not reach/);
});

test('verifyResource retries transient 5xx then succeeds', async () => {
  let calls = 0;
  const flaky = (url) => {
    calls++;
    if (calls < 3) return Promise.resolve({ status: 503, json: async () => ({}) });
    return fakeFetch(url);
  };
  const result = await verifyResource(RESOURCE, flaky);
  assert.equal(result.ok, true);
  assert.equal(calls, 3);
});

test('verifyResource does not retry a definitive 404', async () => {
  let calls = 0;
  const counting = (url) => {
    calls++;
    return fakeFetch(url);
  };
  await verifyResource('https://mcp.getken.ai/ken-ai', counting);
  assert.equal(calls, 1);
});

// ---------------------------------------------------------------------- main()

test('main fails when the runtime configs disagree, without any network', async () => {
  const dir = await makeRepo({
    'plugins/ken-ai/.mcp.json': claudeConfig('https://mcp.getken.ai/ken-ai'),
    'plugins/ken-ai/.codex-plugin/mcp.json': codexConfig(RESOURCE)
  });
  try {
    assert.equal(await main(dir), 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// Regression: an inventory-driven checker reported "1/1 verified" on this repo,
// because the broken config sat on a host the regex ignored while the README
// still carried a good URL. Anchoring on the config makes it fail.
test('main fails when .mcp.json ships a non-mcp host the sweep would miss', async () => {
  const dir = await makeRepo({
    'plugins/ken-ai/.mcp.json': claudeConfig('https://api.getken.ai/ken-ai/mcp'),
    'plugins/ken-ai/.codex-plugin/mcp.json': codexConfig(RESOURCE),
    'README.md': `The plugin bundles the MCP server (\`${RESOURCE}\`).`
  });
  try {
    assert.equal(await main(dir), 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('main fails when the Claude Code config is missing entirely', async () => {
  const dir = await makeRepo({
    'plugins/ken-ai/.codex-plugin/mcp.json': codexConfig(RESOURCE)
  });
  try {
    assert.equal(await main(dir), 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
