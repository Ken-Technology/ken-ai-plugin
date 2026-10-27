# Lead Search Filter Reference

All filters use camelCase keys inside `body`. `search-people`, `search-companies`, `get-people-facets`, and `get-company-facets` take that object as `body` and ignore any other filter argument. `expand` and `people_in_accounts` take flat snake_case arguments instead. A key the API does not know (including snake_case inside `body`) is rejected with 400 `unknown_filter_fields` naming it, so check every key against this page.

## Context-Efficient Usage

This page is the filter metadata for the skill. Do not call `search(operation="get-filters")`: it returns 20-50k+ tokens of industry, country, state, and location-hierarchy data built for app dropdowns, not for a model.

- Common country, state, city, and language values: pass them as written. The backend normalizes full names, ISO codes, and abbreviations.
- Small stable enums (seniority, function, company type, degree, sort): the lists below are authoritative.
- Fuzzy specific values (an obscure industry, a school, a city): pass the most common natural-language string. Resolve a company name with `search(operation="search-companies", body={"name": "..."})`.
- Never pull lists "just in case."

## People Filters (`search(operation="search-people")`)

### Names and direct lookup
- `name` - Full name (fuzzy match)
- `firstName`, `lastName`
- `nameList` - Array of full names for batch matching
- `exactMatch` - Boolean, exact name match
- `linkedInUrl` - One LinkedIn profile URL; matches exactly that person (an unparseable URL matches nothing)

### Current role
- `currentTitles` - Array of full-phrase job titles
- `excludeTitles` - Titles to exclude
- `pastTitles` - Past job titles

### Seniority and function
- `seniorityLevels` - **All 10 values:** `"Training"`, `"Entry"`, `"Individual"`, `"Senior"`, `"Manager"`, `"Director"`, `"VP"`, `"CLevel"`, `"Owner"`, `"Partner"` (Partner covers agency, law, and consulting partners)
- `excludeSeniorityLevels` - Same values
- `functions` - LinkedIn standard job functions: `Engineering`, `Sales`, `Marketing`, `Finance`, `Human Resources`, `Operations`, `Business Development`, `Information Technology`, `Product Management`, `Consulting`, `Education`, `Legal`, `Healthcare Services`, `Research`, `Administrative`, `Arts and Design`, `Community and Social Services`, `Media and Communication`, `Military and Protective Services`, `Program and Project Management`, `Purchasing`, `Quality Assurance`, `Real Estate`, `Support`. For a function not listed, pass the natural-language name.
- `excludeFunctions` - Same values
- `isDecisionMaker` - Boolean. Shortcut for VP+ seniority

### Companies
- `currentCompanies` - Array of company names
- `currentCompanyIds` - Array of numeric company index ids (from `search-companies` results; never invented)
- `pastCompanies` - Any past employer in the experience history
- `previousCompanies` - The immediately prior employer only (people who recently left a company)
- `excludeCompanies` - Companies to exclude
- `companyHeadcount` - `{ "min": N, "max": N }` (maps to size buckets internally)
- `foundedYear` - `{ "min": N, "max": N }`
- `companyFundingAmount` - `{ "min": N, "max": N }`, total funding raised by the current company in whole USD (each bound optional, at least 0, min no greater than max)
- `companyFundedWithinDays` - Integer 1-3650: the current company last raised within this many days
- `companyTypes` - `"Public Company"`, `"Privately Held"`, `"Non Profit"`, `"Government Agency"`, `"Sole Proprietorship"`, `"Partnership"`, `"Educational Institution"`, `"Self Employed"`
- `companyHeadquarters` - HQ locations (e.g. `["United States"]`; only the 6 supported countries)
- `excludeCompanyHeadquarters` - Exclude companies headquartered here

### Industries
- `industries` - LinkedIn canonical industry strings, lowercase. `&`/`and`/`+` variants match (`"hospital & health care"` = `"hospital and health care"`).
- `excludeIndustries` - Same normalization
- **Common examples**: `"software development"`, `"it services and it consulting"`, `"financial services"`, `"hospital and health care"`, `"marketing and advertising"`, `"retail"`, `"e-learning"`, `"real estate"`, `"insurance"`, `"manufacturing"`, `"construction"`, `"legal services"`, `"computer and network security"`, `"staffing and recruiting"`, `"management consulting"`, `"banking"`, `"venture capital and private equity"`.
- Broaden a seed list with `search(operation="expand", kind="industries", industries=[...])`.

### Location (the person's location)
- `countries` - Full names or ISO codes (`"United States"` or `"US"`)
- `states` - Full names or abbreviations (`"California"` or `"CA"`)
- `cities` - City names
- `excludeCountries` - Countries to exclude

Supported countries: United Kingdom, United States, Canada, Ireland, New Zealand, Australia.

### Experience
- `yearsOfExperience`, `yearsInCurrentRole`, `yearsInCurrentCompany` - `{ "min": N, "max": N }`

### Education
- `schools` - School names as written
- `degrees` - `"Bachelor's Degree"`, `"Master's Degree"`, `"MBA"`, `"PhD"`, `"Doctorate"`, `"Associate's Degree"`, `"High School Diploma"`, `"Certificate"`
- `fieldsOfStudy` - e.g. `"Computer Science"`, `"Business Administration"`

### Skills and languages
- `skills` - A person matches when they have ANY listed skill (OR), so it does not over-constrain
- `excludeSkills` - Drop people with any listed skill
- `languages` - Languages

### Job-change signals
- `changedJobRecently` - Boolean
- `changedJobWithinMonths` - Integer; employer change detected within the last N months (more precise). Combine with `currentCompanies` for people who just started at a target company.
- `newInSeat` + `newInSeatWindowDays`, `newInRole` + `newInRoleWindowDays` - Boolean + integer window
- `tenureRipe` + `tenureRipeThresholdYears` - Boolean + years in seat
- `titleChangedRecently`, `promoted`, `seniorityIncreased` - Booleans

### Other
- `includeSimilarPeople` - Boolean; expands results with similar profiles
- `keywords` - Free text across headline, summary, and skills. Avoid for campaign searches: it shrinks the audience.
- `booleanSearch` - Advanced field-targeted query (e.g. `title:engineer AND company:"Google"`)

### Pagination and sort
- `page` - Default 1
- `pageSize` - Default 25, max 100. Use `1` for a count (read `totalResults`).
- `searchAfter` - Cursor for deep pagination (from the previous response)
- `sortBy` - `"relevance"`, `"name"`, `"seniority_level"`, `"years_of_experience"`
- `sortOrder` - `"asc"` or `"desc"` (default `"desc"`)

## Account Filters (`search(operation="search-companies")`)

- `name` - Company name (fuzzy match)
- `industries` / `excludeIndustries`
- `countries` / `states` / `cities` / `excludeCountries` - HQ location only
- `geographyCountries` / `geographyStates` / `geographyCities` - Any office location, not just HQ
- `companyTypes` / `excludeCompanyTypes`
- `companySizes` - Size bands (e.g. `["11-50", "51-200"]`)
- `employeesCount` - `{ "min": N, "max": N }`
- `foundedYear` - `{ "min": N, "max": N }`
- `fundingRoundTypes` / `excludeFundingRoundTypes` - e.g. `["Series A", "Seed"]`
- `fundingAmount` - `{ "min": N, "max": N }` in USD
- `raisedFundingRecently` + `raisedFundingWithinDays` (default 180, max 3650)
- `headcountGrew` + `minHeadcountGrowthPct`, `headcountDeclined` + `minHeadcountDeclinePct`, `crossedSizeBandUp`, `enteredSizeBands`
- `newlyFounded` + `newlyFoundedWithinYears`
- `leadershipChange` - `{ "types": [...], "seniorityLevels": [...], "months": N }`
- `hiringSurge` - `{ "functions": [...], "windowMonths": N, "minNetAdds": N, "minGrowthPercent": N }`
- `specialties` - Company specialty keywords
- `website` - Website domain
- `keywords`, `booleanSearch`, `includeSimilarCompanies`
- `sortBy` - `"relevance"`, `"name"`, `"employees_count"`, `"founded_year"`

## Tool Workflow

1. `search(operation="expand", kind="titles", titles=[...])` / `search(operation="expand", kind="industries", industries=[...])` - AI variations of a seed list. If expand errors, keep the values you already have.
2. `search(operation="get-people-facets", body=...)` / `search(operation="get-company-facets", body=...)` - Query-scoped distribution before the full search (small payloads, safe to call).
3. `search(operation="search-people", body=...)` / `search(operation="search-companies", body=...)` - Run the search. Put `"page": 1, "pageSize": 1` in `body` for a count.
4. `search(operation="people_in_accounts", account_ids=[...], current_titles=[...], ...)` - People at specific companies (accounts first, then people). For account-first and ABM campaigns.
5. `search(operation="lookup-person", linked_in_url=...)` / `search(operation="lookup-company", linked_in_url=...)` - Sanity-check example prospects or companies from the research.
6. `saved_searches` - `list`, `get`, `create`, `update`, `run`.
7. `saved_searches(operation="import_to_campaign")` - Import found leads into a campaign (run by the configuration stage of `create-campaign`, not this skill).

## Saved Searches (`saved_searches`)

- `list` - `client_id` (string) is required; `page`, `page_size` paginate.
- `get` - By `search_id`.
- `create` - `name`, `search_type` (`"people"` or `"account"`, case-insensitive), `filters_json` (the filter object), `is_shared`, `client_id` (string, required).
- `update` - `search_id` plus any of `name`, `filters_json`, `is_shared`.
- `run` - Re-execute by `search_id` and return fresh results.

Saved searches appear in People Search in the app, so the user can open, tweak, or re-run the same filters.

## Filter Strategy

- **Breadth over perfection** - Cast wide; AI qualification handles edge cases.
- **Size to the target** - Use the caller's target and range; otherwise ~5x desired contacts for enrichment, verification, and qualification attrition.
- **Avoid over-constraining** - Don't combine `currentTitles` AND `seniorityLevels` AND `functions`.
- **Function + seniority** - Better coverage than specific titles for most searches.
- **`isDecisionMaker`** - Instead of listing VP/CLevel/Director.
- **No keywords** - Let qualification judge.
- **Facets first** - Check how results distribute before committing to filters.
- **HQ vs geography** - For accounts, `countries`/`states`/`cities` are HQ only; use `geography*` for any office.
