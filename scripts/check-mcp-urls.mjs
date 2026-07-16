#!/usr/bin/env node
// Verifies every Ken MCP URL this repo ships or documents resolves to a live MCP
// resource.
//
// A reachability or "does it return 401?" probe is NOT sufficient here, and that
// is the whole reason this script exists: mcp.getken.ai blanket-401s unknown
// paths, so a dead URL and a live one return byte-identical 401s (same
// www-authenticate header). The only signal that discriminates is the RFC 9728
// protected-resource metadata - it must exist AND its `resource` field must
// equal the URL we ship.
//
// History: the Claude Code config shipped `https://mcp.getken.ai/ken-ai`
// (missing the `/mcp` suffix) while the Codex config shipped the correct URL.
// Every Claude Code install got a dead endpoint; Codex users were unaffected.

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const SKIP_DIRS = new Set(['.git', 'node_modules', 'build', '.worktrees']);
const SCANNED_FILE = /\.(json|md|toml)$/i;

// Any host under `mcp.` is one of our MCP endpoints, wherever it appears.
const MCP_URL_RE = /https:\/\/mcp\.[a-z0-9.-]+(?:\/[^\s`)"'\]<>,]*)?/gi;

/** Extract MCP URLs from text, trimming trailing prose punctuation. */
export function findMcpUrls(text) {
  return [...text.matchAll(MCP_URL_RE)].map((m) =>
    m[0].replace(/[.,;:]+$/, '')
  );
}

/** Derive the RFC 9728 protected-resource metadata URL for a resource URL. */
export function metadataUrlFor(resourceUrl) {
  const url = new URL(resourceUrl);
  const path = url.pathname.replace(/\/+$/, '');
  return `${url.origin}/.well-known/oauth-protected-resource${path}`;
}

/** Walk the repo and map each distinct MCP URL to the files that reference it. */
export async function collectMcpUrls(rootDir) {
  const found = new Map();

  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) await walk(full);
      } else if (SCANNED_FILE.test(entry.name)) {
        for (const url of findMcpUrls(await readFile(full, 'utf8'))) {
          if (!found.has(url)) found.set(url, new Set());
          found.get(url).add(full);
        }
      }
    }
  }

  await walk(rootDir);
  return found;
}

/** Check one URL against its protected-resource metadata. */
export async function verifyResource(url, fetchImpl = fetch) {
  const metadataUrl = metadataUrlFor(url);

  let response;
  try {
    response = await fetchImpl(metadataUrl, {
      headers: { accept: 'application/json' }
    });
  } catch (error) {
    return { url, ok: false, reason: `could not fetch ${metadataUrl}: ${error.message}` };
  }

  if (response.status !== 200) {
    return {
      url,
      ok: false,
      reason: `${metadataUrl} returned ${response.status}, expected 200 - this URL is not a registered MCP resource`
    };
  }

  let body;
  try {
    body = await response.json();
  } catch {
    return { url, ok: false, reason: `${metadataUrl} did not return valid JSON` };
  }

  if (body.resource !== url) {
    return {
      url,
      ok: false,
      reason: `server says the resource is "${body.resource}", but this repo ships "${url}"`
    };
  }

  return { url, ok: true };
}

export async function main(rootDir = process.cwd()) {
  const found = await collectMcpUrls(rootDir);

  // A zero-URL run means the extractor broke; passing silently would defeat the
  // entire check.
  if (found.size === 0) {
    console.error('FAIL no MCP URLs found - the extractor is broken, not the repo.');
    return 1;
  }

  const results = await Promise.all(
    [...found.keys()].map((url) => verifyResource(url))
  );

  let failures = 0;
  for (const result of results.sort((a, b) => a.url.localeCompare(b.url))) {
    const files = [...found.get(result.url)]
      .map((file) => relative(rootDir, file))
      .sort()
      .join(', ');

    if (result.ok) {
      console.log(`ok   ${result.url}\n     ${files}`);
    } else {
      failures++;
      console.error(`FAIL ${result.url}\n     ${files}\n     ${result.reason}`);
    }
  }

  console.log(`\n${found.size - failures}/${found.size} MCP URLs verified.`);
  return failures > 0 ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(await main());
}
