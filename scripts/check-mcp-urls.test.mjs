import test from 'node:test';
import assert from 'node:assert/strict';
import { findMcpUrls, metadataUrlFor, verifyResource } from './check-mcp-urls.mjs';

// Mirrors the real mcp.getken.ai as observed on 2026-07-16:
//   - /ken-ai/mcp  is the protected RESOURCE (the MCP endpoint)
//   - /ken-ai      is the AUTHORIZATION SERVER base - a real URL, but not an endpoint
//   - every other path 404s at the metadata layer
// Both /ken-ai/mcp and /mcp return an identical 401 at the endpoint itself,
// which is precisely why this check reads metadata instead.
const RESOURCE = 'https://mcp.getken.ai/ken-ai/mcp';

function fakeFetch(url) {
  const routes = {
    'https://mcp.getken.ai/.well-known/oauth-protected-resource/ken-ai/mcp': {
      status: 200,
      body: {
        resource: RESOURCE,
        authorization_servers: ['https://mcp.getken.ai/ken-ai']
      }
    }
  };
  const hit = routes[url];
  return Promise.resolve({
    status: hit ? 200 : 404,
    json: async () => {
      if (!hit) throw new Error('Not Found');
      return hit.body;
    }
  });
}

test('metadataUrlFor derives the RFC 9728 metadata path', () => {
  assert.equal(
    metadataUrlFor('https://mcp.getken.ai/ken-ai/mcp'),
    'https://mcp.getken.ai/.well-known/oauth-protected-resource/ken-ai/mcp'
  );
  assert.equal(
    metadataUrlFor('https://mcp.getken.ai/ken-ai/mcp/'),
    'https://mcp.getken.ai/.well-known/oauth-protected-resource/ken-ai/mcp'
  );
  assert.equal(
    metadataUrlFor('https://mcp.getken.ai/'),
    'https://mcp.getken.ai/.well-known/oauth-protected-resource'
  );
});

test('findMcpUrls extracts URLs from config JSON and markdown prose', () => {
  assert.deepEqual(findMcpUrls('"url": "https://mcp.getken.ai/ken-ai/mcp"'), [
    RESOURCE
  ]);
  // Markdown wraps URLs in backticks and parentheses, and sentences end in periods.
  assert.deepEqual(
    findMcpUrls('bundles the server (`https://mcp.getken.ai/ken-ai/mcp`).'),
    [RESOURCE]
  );
  assert.deepEqual(findMcpUrls('see https://mcp.getken.ai/ken-ai/mcp, then run'), [
    RESOURCE
  ]);
  assert.deepEqual(findMcpUrls('no mcp urls at https://app.ken.so/settings'), []);
});

test('verifyResource accepts the live endpoint', async () => {
  const result = await verifyResource(RESOURCE, fakeFetch);
  assert.equal(result.ok, true);
});

// Regression: the exact bug this script was written to catch.
test('verifyResource rejects the auth-server base that shipped as the endpoint', async () => {
  const result = await verifyResource('https://mcp.getken.ai/ken-ai', fakeFetch);
  assert.equal(result.ok, false);
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
  assert.match(result.reason, /but this repo ships/);
});

test('verifyResource reports fetch failures instead of passing', async () => {
  const offline = () => Promise.reject(new Error('ENOTFOUND'));
  const result = await verifyResource(RESOURCE, offline);
  assert.equal(result.ok, false);
  assert.match(result.reason, /could not fetch/);
});

// The property that makes this check worth having: a reachability probe cannot
// tell the dead URL from the live one, because the host 401s both identically.
test('a 401-based probe cannot distinguish the URLs, but metadata can', async () => {
  const endpoint401 = () =>
    Promise.resolve({
      status: 401,
      headers: {
        'www-authenticate':
          'Bearer resource_metadata="https://mcp.getken.ai/.well-known/oauth-protected-resource/ken-ai/mcp"'
      },
      json: async () => ({})
    });

  // Identical 401 for both - a reachability check would pass the dead URL.
  const live = await endpoint401();
  const dead = await endpoint401();
  assert.equal(live.status, dead.status);
  assert.equal(
    live.headers['www-authenticate'],
    dead.headers['www-authenticate']
  );

  // Metadata separates them.
  assert.equal((await verifyResource(RESOURCE, fakeFetch)).ok, true);
  assert.equal(
    (await verifyResource('https://mcp.getken.ai/mcp', fakeFetch)).ok,
    false
  );
});
