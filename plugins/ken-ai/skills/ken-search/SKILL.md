---
name: ken-search
description: Create KenSearch filters for the 280M+ Ken database, validate result count against desired contacts. Replaces list-building for search filter generation. Use when creating prospect search filters for a campaign, validating list size, or when campaign-planning dispatches targeting. Triggers on "create search filters", "ken search", "build prospect list", or when dispatched by campaign-planning.
model: sonnet
thinking: true
---

# Ken Search Skill

Create search filters for the Ken 280M+ contact database. Validate result count is sufficient for the campaign.

> **Platform reference**: see `${CLAUDE_PLUGIN_ROOT}/reference/platform-capabilities.md`
> for the 6 supported countries and the full-phrase title-search behavior.

## Required Context

1. **Read `plan.md`** from the plan folder - Broad ICP, desired contacts
2. **Read `{workspace}/research.md`** - Client overview, ICP details, detailed targeting info (`{workspace}` = the client campaign workspace, default `./ken-campaigns/{client-slug}/` under the current directory)

## Core Principles

- **Breadth over perfection** - Capture the full addressable market. AI qualification handles edge cases.
- **5x multiplier** - Result count should be ~5x desired contact limit to account for enrichment (~30% email found rate), verification (~70% valid), and qualification (~60% pass).
- **Function + Seniority preferred** - Better coverage than specific titles for most roles.
- **isDecisionMaker shortcut** - Use `is_decision_maker=True` instead of manually listing VP/CLevel/Director when targeting decision makers.
- **No keywords** - Keywords unnecessarily restrict search size. Use AI qualification instead.
- **Facets first** - Use `search_get_people_facets` to understand result distribution before committing to filters.
- **Iterate on count** - If results are too low, loosen filters. If too high, tighten. Aim for the sweet spot.
- **Use AI expansion** - `search_expand_titles` and (when available) `search_expand_industries` broaden coverage without manual brainstorming.
- **Resolve fuzzy values on demand** - Use `search_metadata_category` (when available) for specific unknown strings. Never pull the full metadata catalog - it's tens of thousands of tokens of countries/states/industries that Claude's priors + backend normalization already handle.
- **Trust backend normalization** - Pass `"United States"` or `"California"` directly; the backend accepts full names or ISO codes/abbreviations and handles industry `&`/`and`/`+` variations. Don't fetch lists just to validate common values.
- **Only 6 supported countries** - KenSearch location filters are limited to **United Kingdom, United States, Canada, Ireland, New Zealand, Australia**. The HQ and profile-location dropdowns hide everything else. Do NOT author `countries`/`company_headquarters` filters for any other country - they won't resolve. If a client's ICP is outside these 6, flag it to the user rather than silently building an empty search.
- **Full-phrase title matching** - title search now matches the **whole phrase**, not any single word (so "Marketing Director" no longer matches every title containing "Marketing" or "Director"). Always run `search_expand_titles` so real-world variants ("VP of Marketing", "Head of Marketing") are covered explicitly instead of relying on loose word-matching.

## Workflow

### Step 1: Read Context

- [ ] Read `plan.md` from the plan folder for Broad ICP and segment definitions
- [ ] Read `{workspace}/research.md` for ICP and targeting details
- [ ] Read [references/ken-search-filters.md](references/ken-search-filters.md) for available filter fields

### Step 2: Determine Desired Contacts

Calculate from plan.md:
- Number of segments x contacts per segment = total desired contacts
- Default: ~1,000-2,000 contacts per segment unless specified
- Search target = desired_contacts x 5

### Step 3: Read Reference Enums

Use the small stable enums documented in [references/ken-search-filters.md](references/ken-search-filters.md) - it's already loaded when this skill runs, so it's free context. The reference doc lists the authoritative values for seniority levels, functions, company types, degrees, and sort options.

**Do NOT call `search_get_filter_metadata`.** The backend returns a ~20-50k-token `UnifiedMetadataResponse` (full industries list, 195 countries, 5000+ states, nested locationHierarchy) that would burn most of your context window on data you don't need. The only things that endpoint uniquely provides over the reference doc are the dynamic industries/locations lists, and for those you should use `search_metadata_category` on demand in Step 6.

For country/state/city/language filters, just pass the natural-language name (e.g. `"United States"`, `"California"`, `"Berlin"`). The backend normalizes full names, ISO codes, and abbreviations automatically.

### Step 4: Decide People-First vs Account-First

- **People-first** (default, most campaigns): the ICP is defined by role + company attributes. Jump to Step 5.
- **Account-first** (target-account list, small-n enterprise plays): the client named specific companies to target. Use `search_accounts` to resolve company names to `currentCompanyIds`, then pass those ids into `search_people_in_accounts`. Trigger: `{workspace}/research.md` contains an explicit list of target accounts, or the plan says "ABM".

### Step 5: Expand Titles and Industries with AI

- If the ICP mentions specific job titles, call `search_expand_titles(titles=[...])` and merge the variations into `currentTitles`. This replaces the manual "think of every synonym" step and mirrors the frontend's AI Suggest button for titles.
- If the ICP mentions specific industries, call `search_expand_industries(industries=[...])` and merge the variations. If the tool doesn't exist in the current MCP build, skip this step (tracked upstream) and rely on `search_metadata_category(category="industries", search=...)` plus `search_get_filter_metadata` for manual coverage.

### Step 6: Resolve Fuzzy Filter Values On Demand

This is the skill's ONLY path to server-side filter metadata, and you should only take it when you're uncertain about a specific string. Never use it to browse or enumerate options.

Call `search_metadata_category` with a tight `search` query when:
- The ICP mentions a specific industry you can't name canonically (e.g., is it "Software Development" or "Software & Technology"?)
- The ICP names a specific company you need to resolve to `currentCompanyIds`
- The ICP cites a specific school whose exact name matters
- A city-level location filter needs the canonical spelling

```
search_metadata_category(category="industries", search="software")
search_metadata_category(category="hq_locations", search="Berlin")
search_metadata_category(category="companies", search="Stripe")
```

Valid categories: `titles`, `companies`, `schools`, `hq_locations`, `profile_locations`, `industries`, `functions`, `seniority_levels`, `languages`, `countries`, `states`, `cities`.

**Do NOT:**
- Call this without a `search` query (you'd get a full paginated dump).
- Call it to confirm common countries, states, or languages - your priors + backend normalization already handle those.
- Call it preemptively "just in case" - only call when a specific value is genuinely ambiguous.

If the tool doesn't exist yet in the current MCP build (tracked upstream at issue #26), skip this step and accept lower precision on fuzzy fields.

### Step 7: Build Filters

Translate the ICP into KenSearch filters using the values from steps 3-6:
- Map titles to `current_titles` (after Step 5 expansion) or use `seniority_levels` + `functions`
- Use `is_decision_maker=True` for VP+ targeting instead of listing individual seniority levels
- Map company size to `company_headcount_min`/`company_headcount_max`
- Map industries to `industries` array (after Step 5 expansion)
- Map geography to `countries`/`states`/`cities` (person location) - `countries` must be one of the 6 supported (UK, US, Canada, Ireland, New Zealand, Australia)
- Use `company_headquarters` if the ICP specifies where companies should be based (same 6-country limit)
- Use `exclude_seniority_levels`/`exclude_functions` to remove irrelevant roles
- Avoid over-constraining: don't combine current_titles AND seniority_levels AND functions simultaneously

### Step 8: Check Distribution with Facets

Call `search_get_people_facets` with current filters. Review the breakdown by industry, seniority, country, company type, company size. If any one facet bucket holds >60% of results, the filter is probably too narrow in the other dimensions - loosen before validating count.

### Step 9: Validate Result Count

Call `search_people` with `page=1, page_size=1` and read `totalResults`:

```
search_people(
  current_titles=["CTO", "VP Engineering"],
  seniority_levels=["CLevel", "VP"],
  industries=["software development", "it services and it consulting"],
  countries=["United States"],
  company_headcount_min=51,
  company_headcount_max=500,
  page=1,
  page_size=1
)
```

**Validation rules:**
- `totalResults < desired_contacts x 3`: Too few. Loosen filters (broaden titles, add industries, expand geography, remove seniority constraint).
- `totalResults > desired_contacts x 10`: Too many. Tighten filters (narrow titles, reduce geography, add seniority, add company size).
- `totalResults` between 3x-10x desired: Good range.

Iterate up to 3 times. If still out of range, proceed with the best result and note the discrepancy in the report.

### Step 10 (optional): LinkedIn Sanity Check

If `{workspace}/research.md` cites example prospects by LinkedIn URL, call `search_lookup_person_by_linkedin_url` on 1-2 of them. Confirm they exist in the index and match the filter criteria you built. Good signal that the ICP is well-calibrated; not required.

### Step 11 (optional): Save the Search

When the filter will be reused across multiple segments or the CSM wants to tweak it later in the frontend, save it so the same entity appears in both surfaces:

```
search_saved_search_manage(
  operation="create",
  name="{client_slug} - {segment_name or plan_name}",
  search_type="people",
  filters_json=json.dumps(filters),
  is_shared=True,
  client_id=<client_id>     # currently optional; when the upstream MCP issue lands, scoping becomes per-client
)
```

Record the returned `id` in `filters.json` as `saved_search_id`. If `client_id` isn't yet accepted by the MCP (tracked upstream), the create still works - just omit it and the skill continues.

### Step 12: Write filters.json

Write to `{plan_folder}/filters.json`:

```json
{
  "source": "KenSearch",
  "filters": {
    "currentTitles": ["CTO", "Chief Technology Officer", "VP Engineering"],
    "seniorityLevels": ["CLevel", "VP"],
    "companyHeadcount": { "min": 51, "max": 500 },
    "industries": ["software development", "it services and it consulting"],
    "countries": ["United States"]
  },
  "results_count": 12500,
  "desired_contacts": 2500,
  "saved_search_id": "abc-123"
}
```

Use **camelCase** keys in the filters object - this matches the API request format directly.
Only include filters that are actually used. Omit empty arrays and null values.
Omit `saved_search_id` if Step 11 was skipped.

## Output Handling

### Workflow mode (plan folder provided):
1. Write `filters.json` to the plan folder root
2. Report: result count, desired contacts, ratio, whether a saved search was created
3. Flag if ratio is outside 3x-10x range

### Standalone mode:
1. Return the output inline to the user
2. Still validate result count via `search_people` MCP tool

## Forward Compatibility

As of 2026-06, `search_expand_industries` and `search_metadata_category` have landed and are live in the
ken-ai-mcp build (previously tracked as upstream issues #27 and #26). Use them. `search_saved_search_manage`
still treats `client_id` as optional (per-client scoping is upstream issue #28).

Keep treating each as optional defensively: if a tool returns an error, continue the workflow without it and
note the skipped step in the final report.

The skill deliberately does **not** depend on `search_get_filter_metadata` or `search_get_filter_options` (upstream issues #23 and #25). Those tools return huge payloads appropriate for the frontend dropdown UI, not for a context-constrained LLM workflow. The reference doc plus on-demand `search_metadata_category` lookups are always preferred.
