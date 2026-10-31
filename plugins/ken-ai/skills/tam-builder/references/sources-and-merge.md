# TAM builder: sources, splitting and merging

How to pull a market from several sources so the list is close to complete, and how to merge it into one row per company.

## What a full run looked like

A worldwide agency TAM built in October 2026 pulled 160,627 candidate domains from nine sources, classified 102,848 and kept 16,086 fits. The first source to find each fit:

| Source | Fits found first |
|---|---|
| A company-search keyword grid over 111 countries | 7,775 |
| Search, six countries | 3,634 |
| Lookalikes of confirmed fits | 2,531 |
| Directory research (tool and partner directories) | 724 |
| Web lists and searches | 638 |
| People first (founders by title and headline) | 597 |
| Technology search | 86 |
| Agencies that cold-pitched our own inbox | 71 |
| Partner directories | 30 |

Lessons from that run:

- No single source found more than half the fits. Plan at least three.
- Lookalikes of confirmed fits were the third-largest source: once you have confirmed fits, widen around them (the `similarCompanies` ids on each fit's company record).
- People first catches freelancers and one-person shops whose company page is thin or missing.
- The site pass (reading the home, about and team pages) found a founder on about 30% of the sites it could read, and most of those gave a verified email. About a quarter of sites did not answer a script fetch.
- Only 46% of fits had a verified founder email. Plan the campaign size from emails found, not from fits.

## Splitting a search that is too big

A search with thousands of results returns them in pages, and deep pages are slow or capped. Split it until each part is small enough to read in full:

1. By size band: `["1-10"]`, `["11-50"]`.
2. Then by industry.
3. Then by founding year (`foundedYear` `{"min": 2015, "max": 2019}`).

Stop splitting a part once it returns only domains you already have.

## The keyword grid

One company search per keyword per country:

| Keyword | Countries | Size |
|---|---|---|
| outbound | each country in scope | each size band |
| lead generation | ... | ... |
| appointment setting | ... | ... |

Keep the keyword list to the target phrases of the fit rubric. Keywords shrink a people search (the `ken-search` skill says to avoid them there), but for a company grid they are the point: they find companies by what they say they do.

## Web sources

- Directories and partner pages: find them with `web` search ("<category> partner directory", "best <category> agencies 2026"), then read each with `web` scrape. Many pages with the same layout: one `create-extraction` job with a prompt naming the fields (name, website).
- Listicles carry names more often than websites: resolve each name to a domain with a company search by `name`, and drop names that match more than one company.
- A page that does not answer is skipped, not retried in a loop.

## Merging

1. Normalize each domain: lowercase, strip `http://`, `https://`, `www.` and any path or query.
2. One row per domain. Keep the first source that found it and add later sources to a `sources` column.
3. Drop rows with no domain, or resolve them by name.
4. Drop domains already held: the target campaign's contacts, target accounts, blocklist entries.
5. Keep the source per row: it tells you which sources to run again next time.

## Contacts

- One or two people per fit company, by the rubric's titles, local-language titles included.
- Only the company's own domain counts for a person's email. A generic inbox (info@, hello@) is a separate, lower list: its copy has no first name.
- Never privacy, legal, careers, billing or no-reply inboxes.
- Search covers six countries for people. Fits elsewhere get their names from their own site or the user, then the email finder (SKILL.md Step 5); the ones still without an email go to a separate list for the user.
