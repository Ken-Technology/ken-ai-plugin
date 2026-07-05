---
name: website-scraping
description: Scrape client websites using Ken AI's web tools (Firecrawl-equivalent) to gather content for research, campaign strategy, and email copywriting. Use when the user wants to scrape a client's website, extract website content, or gather web data for client research.
model: sonnet
thinking: true
---

# Scrape Website

Scrape client website content using the Ken AI platform MCP web tools (a self-hosted Firecrawl fork) and save as markdown for research and copywriting.

## Tools to use
These are Ken AI platform MCP tools, exposed on the same server that hosts `api_*`, `search_*`, `db_*`
(they appear as `web_*`, e.g. `web_scrape`). Call them by their bare names; they take
snake_case params:
- `web_map` - discover URLs. Params: `url`, `limit`, `include_subdomains`, `search`.
- `web_scrape` - scrape one URL. Params: `url`, `formats` (default `["markdown"]`), `only_main_content` (default true). **This is the workhorse - scrape URLs one at a time.**

The full web toolkit also includes `web_crawl` / `web_crawl_wait` (whole-site), `web_extract` /
`web_extract_wait` (structured extraction), and `web_search`. For this skill stick to `web_map` +
per-URL `web_scrape`.

Do NOT use `web_batch_scrape` / `web_batch_scrape_wait` - the batch worker is unreliable and usually fails. Always loop `web_scrape` per URL instead.

Do NOT use any external Firecrawl MCP tools - use the Ken AI platform `web_*` tools above. (Tool surface: `../../reference/platform-capabilities.md`.)

## Context-budget rule (IMPORTANT)
This skill has hit context-limit errors. Keep the main thread tiny:

1. Do the minimum in the main thread: parse args, resolve the URL, then immediately delegate the rest to a subagent via the `Agent` tool with `subagent_type: "general-purpose"`.
2. The subagent does the map, the filter, the scrapes, the writes, and the manifest.
3. The subagent must return ONLY a short JSON summary (counts + filenames). Never return scraped HTML/markdown to the main thread.
4. If scraping multiple sites, spawn ONE subagent PER site, sequentially, each returning only a summary.

## Arguments
`$ARGUMENTS` is one of:
- **URL(s)** starting with `http(s)://` (space- or comma-separated) - scrape exactly those
- **Empty** - ask the user for the client's website URL

## Step 1 - Resolve target (main thread, keep brief)

Output goes into the client campaign workspace: `{workspace}/research/website/` (`{workspace}` = the client workspace folder, default `./ken-campaigns/{client-slug}/`; create it if needed, or ask the user where to save).

**URLs given:** extract the URLs. Confirm which workspace (client) to save under. Skip to Step 2.

**No argument:** ask the user for the website URL (check `{workspace}/research.md` first if it exists - it may name the website).

## Step 2 - Delegate to subagent

Spawn a `general-purpose` subagent with the prompt template below. Pass it the website URL (or the explicit URL list) and the client slug.

```
You are scraping a website with the Ken AI web MCP and saving markdown files. Do all work yourself; return only a small JSON summary.

INPUT:
- client_slug: {slug}
- output_dir: {workspace}/research/website/    (use FORWARD SLASHES in all paths)
- mode: {"map" | "explicit_urls"}
- base_url: {url}                         (map mode only)
- urls: [...]                             (explicit_urls mode only)

STEPS:

1. If mode == "map":
   Call web_map with: url=base_url, limit=100, include_subdomains=false
   From the returned URLs, pick up to 15 using these rules:

   INCLUDE (priority order): homepage (/), about, company, team, our-story, services, products, solutions, offerings, what-we-do, features, capabilities, platform, pricing, plans, case-studies, success-stories, customers, clients, how-it-works, process, testimonials, reviews, industries, verticals, integrations, partners, contact, demo, book-demo, resources index, why-us.

   EXCLUDE: blog posts (/blog/*), individual news/press, legal (/privacy, /terms, /legal, /cookie-policy, /gdpr), careers/jobs, login/signup/account, search results, pagination, media files (*.pdf, *.jpg, *.png, *.mp4), /admin, /api, /webhook, individual events/webinars.

   Hard cap: 15 URLs.

   If mode == "explicit_urls": use the urls list as-is (no filtering, no cap).

2. For each chosen URL, in sequence (do NOT use batch - it usually fails):
   a. Call web_scrape with:
        url=<url>
        formats=["markdown"]
        only_main_content=true
   b. If it fails, skip and continue (do not create a file).
   c. IMMEDIATELY write the result to disk before scraping the next URL. Do not buffer.

   Filename rules (forward slashes only):
   - "/"            -> output_dir + "index.md"
   - "/about"       -> output_dir + "about.md"
   - "/products/x"  -> output_dir + "products--x.md"
   - Strip query strings and trailing slashes when building the filename.

   File contents:
   ---
   url: "<full_url>"
   title: "<title from scrape result, or empty>"
   scraped_at: "<iso_timestamp>"
   client_slug: "<slug>"
   ---

   <scraped markdown>

3. After all URLs are processed, write output_dir + "_manifest.json":
   {
     "client_slug": "<slug>",
     "website_url": "<base_url or first url>",
     "scraped_at": "<iso_timestamp>",
     "total_urls_discovered": <N or null>,
     "pages_scraped": <N>,
     "pages": [ { "filename": "...", "url": "...", "title": "..." }, ... ]
   }

4. Return ONLY this JSON (no scraped content, no commentary):
   {
     "client_slug": "<slug>",
     "website_url": "<base_url or first url>",
     "pages_attempted": N,
     "pages_succeeded": N,
     "files_created": ["index.md", "about.md", ...]
   }
```

## Step 3 - Report (main thread)

Parse each subagent's JSON. Print a short summary:

```
## Website Scrape Complete

### {slug}
- Website: {url}
- Pages scraped: {N}
- Files: {workspace}/research/website/

Next: run the client-research skill on the scraped content
```

Skip anything that failed; do not abort the batch.

## Errors
- Website unreachable -> skip client, continue.
- Map fails -> subagent falls back to scraping the homepage only.
- Single page fails -> skip it, continue.

---

**Arguments**: $ARGUMENTS
