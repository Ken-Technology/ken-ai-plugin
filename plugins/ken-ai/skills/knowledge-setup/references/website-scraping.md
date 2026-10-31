# Website Scraping Skill

Pick the pages of a company website that explain what it sells and to whom, and scrape them as markdown with the platform `web` tool (Kenso's web archive first, then Firecrawl). The pages feed client research, campaign strategy, and copy.

When the workspace has Knowledge on, the pages Kenso keeps reading on its own are a separate list, the watched pages in the knowledge-setup skill. This playbook is for one-off reads that feed research and copy now.

## Tools

`web` takes an `operation` plus a `body` (the Firecrawl request, camelCase keys):

- `web(operation="map", body={"url": <site_url>, "limit": 100, "includeSubdomains": false})` - list the site's URLs. Add `"search": "<term>"` to rank them by a term.
- `web(operation="scrape", body={"url": <page_url>, "formats": ["markdown"], "onlyMainContent": true})` - scrape one page. This is the workhorse.

Scrape one URL per `scrape` call. For 8 pages it is the simplest and the most reliable path.

`web` is not listed for every connection. When it is missing, ask the user for the pages' text or the links they want read, and say that live scraping is not available on this connection.

## The site

Scrape the site the user names. When they name none, use the workspace's `website` from `workspace(operation="get", workspace_id=...)`. With no website anywhere, ask for it.

## Page Selection

If the user gives explicit URLs, scrape exactly those: no filtering, no cap.

Otherwise map the site and pick **at most 8 pages**:

1. **Same host only** - the site's own domain (a leading `www.` does not matter). Skip subdomains such as `blog.`, `docs.`, `app.`, `help.`, and every external link.
2. **Priority order** - homepage; about (`/about`, `/company`, `/team`, `/our-story`); product (`/product`, `/products`, `/solutions`, `/services`, `/platform`, `/features`, `/how-it-works`, `/process`); pricing (`/pricing`, `/plans`, `/packages`); customers (`/customers`, `/case-studies`, `/success-stories`, `/testimonials`, `/reviews`); industries and use cases (`/industries`, `/use-cases`, `/verticals`); integrations (`/integrations`, `/partners`); why-us.
3. **Skip** - blog posts and articles (`/blog/*`, `/news/*`, `/press/*`, single resource items), careers and jobs, legal (`/privacy`, `/terms`, `/legal`, `/cookie-policy`, `/gdpr`), login, signup, account, and app pages, search results and pagination (`?q=`, `?page=`, `/page/2`), media files (`.pdf`, `.jpg`, `.png`, `.mp4`), `/admin`, `/api`, `/webhook`, single event or webinar pages.
4. **One URL per page** - drop query strings, fragments, and trailing slashes before comparing, so the same page is never scraped twice.

If map fails or returns nothing usable, scrape the homepage alone.

## Scraping

- A page that fails is skipped; keep going. Never abort a site for one failure.
- Site unreachable: report it and stop for that site.
- Web scraping off: the error says "Web scraping is off right now". Skip that page like any failed page and never retry it; the other pages can still come from Kenso's web archive. Say once at the end that live scraping is off.
- An archive copy (`metadata.kenSource: "archive"`) is a normal result. It can be up to 18 months old; `metadata.capturedAt` says when.
- Never echo scraped markdown back into the conversation. Report one line per page: URL and `ok` or `failed`, then how many URLs the map found and how many pages were read.
- With several sites, finish one before starting the next.

## Save Pages (MCP)

When the pages should be kept for later skills, save each one as a workspace file right after scraping it, before the next scrape:

- Name: `website/<page-slug>.md`. `/` -> `website/index.md`, `/about` -> `website/about.md`, `/products/x` -> `website/products--x.md`. Nested path segments join with `--`.
- Content: front matter with `url`, `title` (from the scrape result, or empty), and `scraped_at` (ISO timestamp), then the scraped markdown.
- Upsert: `files(operation="list")` (no `campaign_id` lists workspace files) and match the exact `name`. If found, `files(operation="update", file_id=..., content=...)`; else `files(operation="create", name=..., content=...)`. Never create duplicates.

Then run the client research playbook on the saved pages: `load_skill(name="knowledge-setup", reference="references/client-research.md")`.

## Errors

Tools return a normalized error envelope. Surface `error.message`; for `plan_limit` or `billing`, also `error.recovery.summary`. Never retry blindly.
