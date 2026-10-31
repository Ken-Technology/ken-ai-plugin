---
name: signal-outreach
description: Reach companies when something changes - hiring, a funding round, a new leader, a job change - with a free gate before any spend, one decision maker per company, copy about the plan behind the signal, and a trigger that keeps it running.
---

# Signal outreach

"Email companies hiring SDRs." "Reach companies that just raised." A signal is a change at a company that makes now a better time to write: open roles, a funding round, a new sales leader, a past champion's new job, fast headcount growth. This skill turns one into outreach:

1. Pick the signal and the plan it points to.
2. Write a free, deterministic gate and show what passes before anything is charged.
3. Find one decision maker per company.
4. Write copy about the plan behind the signal.
5. Run it once as a list, or keep it running as a trigger on a campaign.

A person launches the campaign. You build it and hand it over.

## Rules

- **A person approves every launch and send.** You may create a trigger on a Draft campaign. Launching, resuming or raising volume is the person's click, and on a client's campaign it needs a yes that names that client, with its source (who said it, where, when).
- **A funding round is not a buying event by itself.** In Kenso's own campaign data, people at funded companies reply no more than people at same-size companies with no funding (1.01x). The money pays for a plan, usually hiring first. Write about that plan, to the person who runs it. Never open with "congrats on the raise".
- **Signals are noisy. Gate before you spend.** In Kenso's own hiring-signal runs, only about 1 in 4 matched job titles was the role the signal was meant to find. A free gate on titles, size, country, language and duplicates removed about 70% of signals before anything was charged.
- **Never invent** a round size, a job title, a date or a name. Quote the signal as the source states it, with its date. An amount the source leaves blank is "not stated", never 0.
- **Never name a data vendor** to a client. Signals come from Kenso.
- Skip companies already worked elsewhere: target accounts (the Accounts lane works them), live conversations and the blocklist.

## Step 0 - Check what is on

- `triggers` operations are open to every member; creating, changing or pausing a trigger needs full access (admin). A 403 means the user is not an admin: say so in one sentence and stop.
- Trigger capacity (`trigger-capacity-get`, `trigger-capacity-update`) is for admins only. If they are missing, skip the capacity step and tell the user an admin sets it.
- Job postings answer 503 `service_unavailable` when the index is off. Tell the user and do not retry in a loop.
- Signals on target accounts (`account_signals`) need the Accounts and Accounts signals flags. Without them, use the searches below.
- If the workspace has no campaign to attach a trigger to, build one first (Step 5). If none of the operations here are in your tools, tell the user in one sentence and link `https://app.ken.so/<workspace id>`.

## Step 1 - Pick the signal and the plan it points to

Ask what the user sells and what change makes a company need it. Then pick the source:

| The user says | One-off list (Mode B) | Always on (Mode A trigger `signal_type`) |
|---|---|---|
| "companies hiring SDRs / AEs / RevOps" | `job_postings` search on the titles | `open_roles` (open posts that match the titles), or `hiring_surge` (net adds in a function) |
| "companies that just raised" | `triggers` funding-rounds-search | `fundraising` |
| "new VP Sales / new CRO" | `search` search-companies with `leadershipChange` | `new_in_seat` (people new in their seat) |
| "people who used us and changed jobs" | - | `job_change` |
| "fast-growing companies" | `search` search-companies with `hiringSurge` or `headcountGrew` | `headcount_growth`, `company_headcount_growth` |
| "our target accounts changed" | `account_signals` list-workspace (then the `accounts` skill) | - |

Read the exact trigger fields and defaults before you write one: `triggers(operation="trigger-schemas-list")`.

Then name the plan the signal points to, in one line: "They raised to build an EMEA sales team: three AE roles are open." That line drives the gate's titles, the person you write to and the copy.

## Step 2 - Gate it for free

Every search here is free. Browse, count and filter before anything is imported or enriched.

**Hiring:**

`job_postings(operation="search", body={"titles": {"include": ["sales development representative", "business development representative"], "exclude": ["intern"]}, "location": {"countries": ["US", "GB"]}, "postedWithin": 30, "groupBy": "company", "includeDescription": false, "includeFacets": true, "limit": 50})`

Resolve partial names first with `job_postings(operation="resolve-filters", body={"titles": "sales devel"})`. Staffing agencies are hidden unless `includeAgencies` is true.

**Funding:**

`triggers(operation="funding-rounds-search", body={"reportedWithinDays": 30, "newRoundsOnly": true, "amountRaisedUsd": {"min": 2000000}, "hasDomain": true, "includeFacets": true, "groupBy": "company", "limit": 50})`

Funds, real estate and banks are hidden by default. `location.states` takes US state codes.

**Company changes** (the company search, six countries): `search(operation="search-companies", body={"hiringSurge": {"functions": ["Sales"], "windowMonths": 3, "minNetAdds": 3}, "companySizes": ["11-50", "51-200"], "countries": ["United States"], "page": 1, "pageSize": 25})`. Filter keys are in the `ken-search` skill's reference.

Then apply the gate, cheapest check first, and keep the count after each one:

1. **Titles**: keep only titles that match the plan; drop the families in `references/signal-gate.md` (recruiting for clients, IT implementation roles, incidental words, part-time and entry-level posts, roles that do not own pipeline). Read the real title, never the keyword that matched.
2. **Size and country**: the user's ICP. The people search covers six countries (United States, United Kingdom, Canada, Ireland, Australia, New Zealand): a company elsewhere passes the gate, and Step 3 finds its decision maker by name with the email finder. Say how many.
3. **Language**: drop postings not written in the campaign's language.
4. **Duplicates**: one row per company domain. Drop target accounts (`accounts(operation="list", domain="acme.com")` when Accounts is on) and companies already in the campaign.
5. **Fit** (optional, paid): when the fit_classification flag is on, score the companies that passed against the user's ICP with `models(operation="fit-classifications-create", fit_definition="...", rows=[{"companyId": 123456}, {"domain": "acme.com", "name": "Acme"}])`: up to 100 rows a call, each back with `fit` (yes, no or maybe), a 0-100 `score` and a one-sentence `reason`, at 0.05 credits a classified row (`estimate_only=True` prices it first). Keep the `yes` rows and their reasons. While the flag is off (the call is not found), judge fit from the company data yourself and keep a reason per company.

Show the user the funnel before you go on: "212 postings, 141 companies, 46 pass titles, 31 pass size and country, 29 new. Next: 29 companies, up to 29 people imported into a Draft campaign." Price it with `job_postings(operation="triggers-preview", signal_type="open_roles", parameters='{...}')` (the same keys the trigger stores; it runs for `fundraising`, `open_roles` and `company_headcount_growth`, and saves, fires and charges nothing). Show its `steps` (pass counts per gate step) and `estimatedCredits.basis` (an upper bound for the page, charged per lead), say that each imported person is enriched, verified and qualified by the campaign, and get a yes before Step 3.

## Step 3 - One decision maker per company

Write to the person who runs the plan, not the logo. At a company over 200 people, the CEO is not buying your tool: the VP who inherited the hiring plan is.

1. Find each company's search id: `search(operation="search-companies", body={"website": "acme.com", "page": 1, "pageSize": 1})`.
2. Find the person: `search(operation="people_in_accounts", account_ids=[123456, 234567], current_titles=["VP Sales", "Head of Sales", "Director of Sales Development"], seniority_levels=["Director", "VP", "CLevel"])`. Keep one per company, two at most.
3. Funding rounds name executives on the round (`people`); use them only when their role owns the plan.

Keep each person's search id. The campaign finds and verifies their email after import.

**Outside the six countries, or when the people search finds nobody**, use the email finder. It works in any country:

1. Get the decision maker's name: the round's `people`, the company's team or about page (`web(operation="scrape", body={"url": "https://acme.fr/equipe", "formats": ["markdown"]})`), or the user.
2. Tell the user the count and the price before you start: 1 credit for each email found, nothing for a miss. Get a yes.
3. Find and verify the email, one call at a time: `saved_searches(operation="email-finds-create", full_name="Claire Martin", company_domain="acme.fr")`. Pass the company's website domain: with only `linkedin_url`, the find needs the company in the people search. The call waits up to 45 seconds; a find still running comes back with its id, read it with `saved_searches(operation="email-finds-get", email_find_id=...)`. The limit is 30 finds a minute and 500 a day per workspace.
4. Keep the `found` rows with their email and `verification.status`, and import them as a CSV (Step 5), one row per person with the email in its own column. List the `not_found` companies for the user.

If `email-finds-create` is not in your tools, the email finder is off for this workspace: list those companies for the user instead of importing them.

## Step 4 - Write the copy

The signal is the reason; the plan is the subject. The shape, examples per signal and the data behind the rule are in `references/signal-copy.md` (`load_skill("signal-outreach", reference="references/signal-copy.md")`):

1. Their plan, in their words: "Your careers page lists four SDR roles this month."
2. The problem that plan creates: "New SDRs usually spend their first month without a list to call."
3. What you do about it, with one proof point from Knowledge.

Each email quotes its own company's signal. Keep the facts per company (the job title, the posting date, the round's stated use) and bring them in as custom variables when you import (Step 5), or let the campaign's AI personalization write that line from the lead's company data; the `create-campaign` skill sets up either. Never write "congrats", never guess a number, never claim they are "scaling" unless the source says so.

## Step 5 - Run it

**Mode B, one-off list.** Build or reuse a Draft campaign with the `create-campaign` skill, with the copy from Step 4. Import the people you picked:

`saved_searches(operation="import_to_campaign", campaign_id=8123, selected_person_ids=[90011, 90012], await_ready=True)`

The import skips people already in the campaign. To carry each company's signal facts as custom variables, import a CSV instead: `contacts(operation="contact-imports-create", source="csv", campaign_id=8123, csv_content="...", column_mappings=[...])`, one row per person with the job title or round use in its own column. Then hand it over: the person reviews and launches it in Kenso. Repeat weekly for a fresh list.

**Mode A, always on.** A trigger watches for the signal and adds each new match to a Trigger campaign by itself. Try the filters with the searches in Step 2 first, then:

`triggers(operation="triggers-create", campaign_id=8123, signal_type="fundraising", tier="same_day", parameters='{"raisedWithinDays": 30, "newRoundsOnly": true, "minRaisedUsd": 2000000, "titles": ["VP Sales", "Head of Sales"], "maxContactsPerCompany": 2}')`

- `parameters` is a JSON string with camelCase keys, as `trigger-schemas-list` gives them. Unknown keys are rejected. Funding-round search keys (`reportedWithinDays`, `amountRaisedUsd`) differ from the trigger's (`raisedWithinDays`, `minRaisedUsd`).
- The campaign must be in Trigger mode. `switch_campaign_to_trigger=True` switches a Batch campaign in the same call, and a Trigger campaign never goes back to Batch: pass it only when the user agreed to that.
- `tier` is `minutes`, `hours` or `same_day`: how fast a firing goes out.
- People a trigger adds to a Draft campaign are not emailed until a person launches the campaign.

**Capacity.** Read `triggers(operation="trigger-capacity-get", campaign_id=8123)`. A daily cap is volume: set it with `triggers(operation="trigger-capacity-update", campaign_id=8123, daily_cap=25)` only when the user gave the number, and on a client's campaign only with a yes that names that client.

## Step 6 - Watch the firings

- `triggers(operation="get-stats", trigger_id=77, days=7)`: firings by outcome.
- `triggers(operation="trigger-firings-list", trigger_id=77, status="suppressed")`: why firings were held back (cooldown, frequency cap, do not contact, blocklist, an active conversation, already in a trigger campaign, expired).
- Too many suppressed or off-target firings: tighten `parameters` with `triggers(operation="triggers-update", trigger_id=77, changes={"parameters": "..."})`. Too few: widen the window or the titles.
- To check that a saved trigger would fire, test-fire it on a sample signal: `job_postings(operation="triggers-test-fire", trigger_id=77, contact_id=..., payload={...})`. It reports `shouldFire`, `rejectedBy` and each check, and queues, sends and charges nothing. `payload` is the signal's JSON object. Sweep-only signals (`click_dormancy`, `company_icp_timing`, `linkedin_post_engagement`) answer `test_fire_not_supported`.
- `triggers(operation="pause", trigger_id=77)` and `triggers(operation="resume", trigger_id=77)` stop and restart it. On a client's campaign both need a yes that names that client.

Report the signal, the gate funnel, who you picked and why, the campaign and trigger ids, and what the person has to click.

## What this skill cannot do yet

- No people search outside its six countries: there the email finder needs each decision maker's name, from the round, the company's site or the user.

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
