# KenSearch Filter Reference

All filters use camelCase keys in the JSON body. The MCP tool params use snake_case.

## Context-Efficient Usage

**This doc IS the filter metadata for the skill.** Do not call `search_get_filter_metadata` or `search_get_filter_options` from `/ken-search` - those tools return 20-50k+ tokens of industry/country/state/locationHierarchy data appropriate for a frontend dropdown UI, not an LLM workflow. Everything you need for 95% of searches is either documented here or can be looked up surgically via `search_metadata_category` with a tight `search` query.

Rules:
- Common country/state/city/language values: pass them directly in natural language. Backend normalizes full names, ISO codes, and abbreviations.
- Small stable enums (seniority, function, company type, degree, sort): use the lists below as authoritative.
- Fuzzy specific values (a particular company, school, obscure industry, city): call `search_metadata_category(category="X", search="<query>")` - it returns ~25 paginated matches, tiny payload.
- Do not pull lists "just in case." Only look up when you have a specific value in hand that needs canonicalizing.

## People Filters (`search_people`)

### Names
- `name` - Full name (fuzzy match)
- `firstName` - First name
- `lastName` - Last name
- `nameList` - Array of full names for batch matching

### Current Role
- `currentTitles` - Array of job title strings
- `excludeTitles` - Array of titles to exclude
- `pastTitles` - Array of past job titles

### Seniority & Function
- `seniorityLevels` - **Authoritative list (8 values):** `"Entry"`, `"Individual"`, `"Senior"`, `"Manager"`, `"Director"`, `"VP"`, `"CLevel"`, `"Owner"`
- `excludeSeniorityLevels` - Same values as seniorityLevels
- `functions` - **Common values** (LinkedIn standard job functions): `Engineering`, `Sales`, `Marketing`, `Finance`, `Human Resources`, `Operations`, `Business Development`, `Information Technology`, `Product Management`, `Consulting`, `Education`, `Legal`, `Healthcare Services`, `Research`, `Administrative`, `Arts and Design`, `Community and Social Services`, `Media and Communication`, `Military and Protective Services`, `Program and Project Management`, `Purchasing`, `Quality Assurance`, `Real Estate`, `Support`. If the ICP cites a function not in this list, call `search_metadata_category(category="functions", search="<query>")` to find the canonical name.
- `excludeFunctions` - Same values as functions
- `isDecisionMaker` - Boolean. Shortcut for VP+ seniority

### Companies
- `currentCompanies` - Array of company names
- `currentCompanyIds` - Array of Coresignal company IDs
- `pastCompanies` - Array of past company names
- `excludeCompanies` - Array of companies to exclude
- `companyHeadcount` - Object: `{ "min": N, "max": N }` (maps to size buckets internally)
- `companyTypes` - Array: "Public Company", "Privately Held", "Non Profit", "Government Agency", "Sole Proprietorship", "Partnership", "Educational Institution", "Self Employed"
- `companyHeadquarters` - Array of HQ locations (e.g., ["United States", "Germany"])
- `excludeCompanyHeadquarters` - Exclude companies headquartered in these locations

### Industries
- `industries` - Array of LinkedIn canonical industry strings (lowercase). Handles `&`/`and`/`+` variations automatically (`"hospital & health care"` matches `"hospital and health care"`).
- `excludeIndustries` - Array. Same normalization.
- **Common examples**: `"software development"`, `"it services and it consulting"`, `"financial services"`, `"hospital and health care"`, `"marketing and advertising"`, `"retail"`, `"e-learning"`, `"real estate"`, `"insurance"`, `"manufacturing"`, `"construction"`, `"legal services"`, `"computer and network security"`, `"staffing and recruiting"`, `"management consulting"`, `"banking"`, `"venture capital and private equity"`.
- If the ICP cites a specific industry you're unsure about, call `search_metadata_category(category="industries", search="<keyword>")` to get the exact canonical string. Do NOT pull the full industry list.
- For AI expansion of an industry seed list into related industries, use `search_expand_industries(industries=[...])`.

### Location (person's location)
- `countries` - Full names or ISO codes (e.g., "United States" or "US")
- `states` - Full names or abbreviations (e.g., "California" or "CA")
- `cities` - City names
- `excludeCountries` - Countries to exclude

### Experience
- `yearsOfExperience` - Object: `{ "min": N, "max": N }`
- `yearsInCurrentRole` - Object: `{ "min": N, "max": N }`
- `yearsInCurrentCompany` - Object: `{ "min": N, "max": N }`

### Education
- `schools` - Array of school names. Use `search_metadata_category(category="schools", search="...")` when the exact spelling matters.
- `degrees` - **Common values**: `"Bachelor's Degree"`, `"Master's Degree"`, `"MBA"`, `"PhD"`, `"Doctorate"`, `"Associate's Degree"`, `"High School Diploma"`, `"Certificate"`. For unusual degree types, use category lookup.
- `fieldsOfStudy` - Array of fields (e.g. `"Computer Science"`, `"Business Administration"`)

### Other
- `skills` - Array of skills
- `languages` - Array of languages
- `changedJobRecently` - Boolean
- `includeSimilarPeople` - Boolean. Expands results with similar profiles.
- `keywords` - Free text search across headline + summary + skills
- `booleanSearch` - Advanced boolean search with field targeting (e.g., 'title:engineer AND company:"Google"')

### Pagination & Sort
- `page` - Page number (default: 1)
- `pageSize` - Results per page (default: 25, max: 100)
- `searchAfter` - Cursor for deep pagination (from previous response)
- `sortBy` - "relevance", "name", "seniority_level", "years_of_experience"
- `sortOrder` - "asc" or "desc" (default: "desc")

## Account Filters (`search_accounts`)

- `name` - Company name (fuzzy match)
- `industries` / `excludeIndustries` - Industry arrays
- `countries` / `states` / `cities` / `excludeCountries` - HQ location
- `geographyCountries` / `geographyStates` / `geographyCities` - ALL locations (any office, not just HQ)
- `companyTypes` / `excludeCompanyTypes` - Company type arrays
- `companySizes` - Size categories (e.g., ["11-50", "51-200"])
- `employeesCount` - Object: `{ "min": N, "max": N }` (numeric range)
- `foundedYear` - Object: `{ "min": N, "max": N }`
- `fundingRoundTypes` / `excludeFundingRoundTypes` - e.g., ["Series A", "Seed"]
- `fundingAmount` - Object: `{ "min": N, "max": N }` in USD
- `specialties` - Company specialty keywords
- `website` - Website domain filter
- `keywords` - Search across company descriptions
- `booleanSearch` - Advanced boolean search
- `includeSimilarCompanies` - Boolean. Expands results with similar companies.
- `sortBy` - "relevance", "name", "employees_count", "founded_year"

## MCP Tool Workflow

1. `search_metadata_category` - Autocomplete within a category (titles, companies, schools, hq_locations, profile_locations, industries, functions, seniority_levels, languages, countries, states, cities). Use only to resolve specific fuzzy filter values to canonical strings; never browse. *Forward-compatible: may not exist in the current MCP build - skip if missing.*
2. `search_expand_titles` - Broaden title searches with AI-generated variations
3. `search_expand_industries` - Broaden industry searches with AI-generated variations. *Forward-compatible: may not exist in the current MCP build - skip if missing.*
4. `search_get_people_facets` / `search_get_account_facets` - Understand query-scoped distribution before running the full search (small payloads, query-scoped aggregations - safe to call)
5. `search_people` / `search_accounts` - Run searches (use `page_size=1` to get count-only responses)
6. `search_people_in_accounts` - Find people at specific companies (2-step: accounts first, then people). Use for account-first / ABM campaigns.
7. `search_lookup_person_by_linkedin_url` / `search_lookup_account_by_linkedin_url` - Sanity-check example prospects cited in `{workspace}/research.md`
8. `search_saved_search_manage` - Save, list, get, update, delete, run saved searches
9. `search_export_to_campaign` - Import found leads into a campaign (handled by `/campaign-configuration`, not this skill)
10. `search_enrich_people` / `search_enrich_companies` / `search_enrich_csv` - Enrich existing contacts

**Do NOT call:** `search_get_filter_metadata` or `search_get_filter_options`. They return huge payloads (20-50k+ tokens of global metadata) appropriate for the frontend UI, not an LLM workflow. Use this reference doc + on-demand `search_metadata_category` instead.

## Metadata Category Autocomplete (`search_metadata_category`)

Backend endpoint: `GET /v1/search/metadata?category=X&search=Y&page=&pageSize=`. Use when the ICP mentions a company, school, title, or location that needs resolution to a canonical value rather than free-text guessing.

Valid `category` values:
- `titles` - Job titles with profile counts
- `companies` - Company names with employee counts
- `schools` - Universities / schools
- `hq_locations` - Company HQ locations
- `profile_locations` - Person locations
- `industries` - Canonical industry strings
- `functions` - Job functions
- `seniority_levels` - Seniority enum
- `languages` - Language filters
- `countries` / `states` / `cities` - Geo filters

Response shape: `{ category, page, pageSize, totalCount, items: [{ value, label, count?, employeesCount? }] }`.

*Forward-compatible: this tool may not yet exist in the current MCP build - skip if the tool is missing.*

## Saved Searches (`search_saved_search_manage`)

Operations:
- `list` - All saved searches (pass `client_id` to scope to one client when the upstream fix lands)
- `get` - Fetch a specific saved search by `search_id`
- `create` - Create a new saved search: `name`, `search_type` (`people` or `accounts`), `filters_json` (JSON string), `is_shared`, `client_id`
- `update` - Update name / filters / sharing
- `delete` - Delete by `search_id`
- `run` - Re-execute a saved search and return fresh results. *Forward-compatible: may not yet exist in the current MCP build.*

Saved searches created here appear in the ken-frontend UI, so the CSM can open, tweak, or re-run them from the dashboard - parity between skill and UI.

## Industry Expansion (`search_expand_industries`)

Backend endpoint: `POST /v1/search/metadata/expand-industries`. Body: `{ "industries": [...] }`. Response: `{ expandedIndustries: Record<str, List[str]> }`.

Use to broaden industry filters automatically using AI, the same way `search_expand_titles` broadens titles. Mirrors the frontend's "AI Suggest similar industries" button.

*Forward-compatible: this tool may not yet exist in the current MCP build - skip if missing and rely on manual industry selection via `search_metadata_category(category="industries", search=...)` instead.*

## Filter Strategy

- **Breadth over perfection** - Cast wide, let AI qualification handle edge cases
- **5x multiplier** - Target ~5x desired contact limit to account for enrichment, verification, and qualification attrition
- **Avoid over-constraining** - Don't combine currentTitles AND seniorityLevels AND functions simultaneously
- **Function + Seniority preferred** - Better coverage than specific titles for most searches
- **isDecisionMaker shortcut** - Use instead of manually listing VP/CLevel/Director seniority levels
- **Do NOT use keywords** - Keywords unnecessarily restrict search size. Use AI qualification instead.
- **Use facets first** - Check `search_get_people_facets` to understand how results distribute before committing to filters
- **HQ vs Geography** - For accounts: countries/states/cities = HQ only. Use geography_* for any office presence.
