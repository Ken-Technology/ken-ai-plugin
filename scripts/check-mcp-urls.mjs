#!/usr/bin/env node
// Guards the MCP URLs this plugin ships, in two layers.
//
// 1. AGREEMENT (offline, deterministic). The two runtime configs must declare
//    the identical URL. This is what catches the bug this script was written
//    for: .mcp.json shipped the OAuth authorization-server base
//    (https://mcp.getken.ai/ken-ai) while .codex-plugin/mcp.json shipped the
//    real endpoint (.../ken-ai/mcp). Two files, one truth, and nothing tying
//    them together. This layer needs no network and cannot flake.
//
// 2. LIVENESS (network). Each configured URL must resolve to a live MCP
//    resource. A reachability or "does it 401?" probe is NOT sufficient and
//    that is the whole point: mcp.getken.ai blanket-401s unknown paths, so a
//    dead URL and a live one return byte-identical 401s with the same
//    www-authenticate header. Only the RFC 9728 protected-resource metadata
//    discriminates - it must exist AND its `resource` field must equal the URL
//    we ship.
//
// The check is anchored on the config files, never on whatever a regex sweeps
// out of prose. An earlier inventory-driven version reported "1/1 verified" on
// a repo whose .mcp.json was broken, because the broken URL sat on a host the
// regex did not match while the docs still carried a good one. Docs are swept
// as a secondary layer only.

import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The configs that actually wire up the MCP server. Both use the documented
// `mcpServers` envelope - a bare `{"ken-ai": {...}}` map registers no server at
// all, which is how this plugin shipped a Claude Code config that could never
// have worked regardless of the URL in it.
const CONFIG_FILES = [
  {
    path: 'plugins/ken-ai/.mcp.json',
    runtime: 'Claude Code',
    read: (json) => json?.mcpServers?.['ken-ai']?.url
  },
  {
    path: 'plugins/ken-ai/.codex-plugin/mcp.json',
    runtime: 'Codex',
    read: (json) => json?.mcpServers?.['ken-ai']?.url
  }
];

const SKIP_DIRS = new Set(['.git', 'node_modules', 'build', '.worktrees']);
const SCANNED_FILE = /\.(json|md)$/i;

// A line carrying this marker is exempt from the docs sweep, so a changelog or
// post-mortem can quote a dead URL without failing the build.
const IGNORE_MARKER = 'mcp-url-ignore';

// Hosts under `mcp.` are ours. The optional `:port` group is load-bearing:
// without it `https://mcp.host:8443/x/mcp` matches only the bare origin, and the
// checker would verify a URL nobody ships while the real one goes unchecked.
const MCP_URL_RE = /https:\/\/mcp\.[a-z0-9.-]+(?::\d+)?(?:\/[^\s`)"'\]<>,]*)?/gi;

const FETCH_ATTEMPTS = 3;
const FETCH_TIMEOUT_MS = 10_000;

/** Extract MCP URLs from text, skipping lines marked as historical. */
export function findMcpUrls(text) {
  const urls = [];
  for (const line of text.split('\n')) {
    if (line.includes(IGNORE_MARKER)) continue;
    for (const match of line.matchAll(MCP_URL_RE)) {
      const candidate = match[0].replace(/[.,;:!?]+$/, '');
      try {
        new URL(candidate);
      } catch {
        continue;
      }
      urls.push(candidate);
    }
  }
  return urls;
}

/**
 * Derive the RFC 9728 protected-resource metadata URL for a resource identifier.
 *
 * Per RFC 9728 section 3.1 the well-known suffix is inserted "between the host
 * component and the path and/or query components", and only "any terminating
 * slash (/) following the host component" is removed. So the query is preserved
 * and a slash *inside* the path is significant - `/a/` and `/a` are different
 * resources. Do not be tempted to strip all trailing slashes; that silently
 * rewrites the identifier being checked.
 */
export function metadataUrlFor(resourceUrl) {
  const url = new URL(resourceUrl);
  const path = url.pathname === '/' ? '' : url.pathname;
  return `${url.origin}/.well-known/oauth-protected-resource${path}${url.search}`;
}

/** Read the URL each runtime config declares. Missing/blank is a hard failure. */
export async function readConfiguredUrls(rootDir) {
  const entries = [];
  for (const config of CONFIG_FILES) {
    const file = join(rootDir, config.path);
    let raw;
    try {
      raw = await readFile(file, 'utf8');
    } catch {
      entries.push({ ...config, url: null, error: 'file is missing' });
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      entries.push({ ...config, url: null, error: `invalid JSON: ${error.message}` });
      continue;
    }
    const url = config.read(parsed);
    if (typeof url !== 'string' || url.trim() === '') {
      entries.push({ ...config, url: null, error: 'no ken-ai server url declared' });
      continue;
    }
    entries.push({ ...config, url: url.trim(), error: null });
  }
  return entries;
}

/**
 * The offline invariant: every runtime config must declare the same URL.
 * Returns a list of human-readable problems (empty when they agree).
 */
export function findConfigDisagreements(entries) {
  const problems = entries
    .filter((entry) => entry.error)
    .map((entry) => `${entry.path} (${entry.runtime}): ${entry.error}`);

  const urls = [...new Set(entries.filter((e) => e.url).map((e) => e.url))];
  if (urls.length > 1) {
    const detail = entries
      .filter((e) => e.url)
      .map((e) => `  ${e.runtime.padEnd(12)} ${e.url}  (${e.path})`)
      .join('\n');
    problems.push(`runtime configs disagree on the MCP URL:\n${detail}`);
  }
  return problems;
}

/** Fetch with a timeout, retrying only on transient errors (network / 5xx). */
async function fetchMetadata(url, fetchImpl) {
  let lastError;
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
    try {
      const response = await fetchImpl(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
      });
      if (response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/**
 * Check one URL against its protected-resource metadata.
 * `transient: true` means we could not reach the host - distinct from a
 * definitive 404 / mismatch, so an upstream blip cannot be mistaken for a
 * broken config (and vice versa).
 */
export async function verifyResource(url, fetchImpl = fetch) {
  // RFC 8707: a resource identifier must not carry a fragment.
  if (new URL(url).hash) {
    return {
      url,
      ok: false,
      transient: false,
      reason: 'resource identifier must not contain a fragment (RFC 8707)'
    };
  }

  const metadataUrl = metadataUrlFor(url);

  let response;
  try {
    response = await fetchMetadata(metadataUrl, fetchImpl);
  } catch (error) {
    return {
      url,
      ok: false,
      transient: true,
      reason: `could not reach ${metadataUrl} after ${FETCH_ATTEMPTS} attempts: ${error.message}`
    };
  }

  if (response.status !== 200) {
    return {
      url,
      ok: false,
      transient: false,
      reason: `${metadataUrl} returned ${response.status}, expected 200 - this URL is not a registered MCP resource`
    };
  }

  let body;
  try {
    body = await response.json();
  } catch {
    return {
      url,
      ok: false,
      transient: false,
      reason: `${metadataUrl} did not return valid JSON`
    };
  }

  if (body.resource !== url) {
    return {
      url,
      ok: false,
      transient: false,
      reason: `server says the resource is "${body.resource}", but this repo ships "${url}"`
    };
  }

  return { url, ok: true, transient: false };
}

/** Sweep docs for MCP URLs, mapping each to the files that mention it. */
export async function collectDocumentedUrls(rootDir) {
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

export async function main(rootDir = process.cwd(), { strict = false } = {}) {
  // Layer 1: agreement. Offline, deterministic, catches config drift.
  const configured = await readConfiguredUrls(rootDir);
  const disagreements = findConfigDisagreements(configured);

  for (const entry of configured) {
    if (entry.url) console.log(`config  ${entry.runtime.padEnd(12)} ${entry.url}`);
  }

  if (disagreements.length > 0) {
    for (const problem of disagreements) console.error(`FAIL ${problem}`);
    return 1;
  }
  console.log('ok      runtime configs agree\n');

  // Layer 2: liveness. Config URLs are authoritative; docs are secondary.
  const documented = await collectDocumentedUrls(rootDir);
  const configUrls = new Set(configured.map((entry) => entry.url));
  const targets = new Map();

  for (const url of configUrls) {
    targets.set(url, new Set(configured.filter((e) => e.url === url).map((e) => e.path)));
  }
  for (const [url, files] of documented) {
    if (!targets.has(url)) targets.set(url, new Set());
    for (const file of files) targets.get(url).add(relative(rootDir, file));
  }

  const results = await Promise.all(
    [...targets.keys()].map((url) => verifyResource(url))
  );

  let hardFailures = 0;
  let transientFailures = 0;

  for (const result of results.sort((a, b) => a.url.localeCompare(b.url))) {
    const files = [...targets.get(result.url)].sort().join(', ');
    if (result.ok) {
      console.log(`ok      ${result.url}\n        ${files}`);
    } else if (result.transient) {
      transientFailures++;
      console.warn(`WARN    ${result.url}\n        ${files}\n        ${result.reason}`);
    } else {
      hardFailures++;
      console.error(`FAIL    ${result.url}\n        ${files}\n        ${result.reason}`);
    }
  }

  const verified = results.filter((r) => r.ok).length;
  console.log(`\n${verified}/${results.length} MCP URLs verified.`);

  if (hardFailures > 0) return 1;
  if (transientFailures > 0) {
    if (strict) {
      console.error(`\n${transientFailures} URL(s) unreachable and strict mode is on.`);
      return 1;
    }
    console.warn(
      `\n${transientFailures} URL(s) unreachable - treating as infrastructure, not a config error. ` +
        'The scheduled run checks this in strict mode.'
    );
  }
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exit(await main(process.cwd(), { strict: process.env.MCP_CHECK_STRICT === '1' }));
}
