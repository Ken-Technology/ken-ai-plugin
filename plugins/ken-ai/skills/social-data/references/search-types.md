# Social data search types

Every search is `social(operation="search", platform=..., type=..., ...)` with `limit` 1 to 100 (default 25). Price, polling and errors are in `SKILL.md`.

Shared optional fields:

- `since`: an ISO-8601 instant (`2026-10-01T00:00:00Z`). Only records posted at or after it. Types without it below ignore it.
- `country`: a two-letter country code (`us`, `de`). On a type that reads it, anything else is 400 `validation_failed`; the other types ignore it.
- A `url` must be a link of the search's platform and of the kind the type reads (a profile, a company page, a group, a channel). Another link is 400 `validation_failed` naming what the search needs.

## LinkedIn

| type | needs | optional | returns |
|---|---|---|---|
| `posts_by_profile` | `url`: a profile link (`linkedin.com/in/...`) | `since` | posts |
| `posts_by_company` | `url`: a company page link (`linkedin.com/company/...`) | `since` | posts |
| `jobs_by_company` | `company`: the company name | `keyword` (narrows the titles), `location` (default worldwide), `country`, `since` | job openings from the past month at most |
| `jobs_by_keyword` | `keyword` and `location` (a city, a country or "Worldwide") | `country`, `since` | job openings, any age unless `since` |
| `people_by_name` | `first_name` and `last_name` | none (`company` does not narrow it) | profiles |

`since` on a jobs search picks the nearest posted-time window: the past day, week or month, or any time.

Example: `social(operation="search", platform="linkedin", type="jobs_by_company", company="Globex", keyword="sales", limit=25)`

## Facebook

| type | needs | optional | returns |
|---|---|---|---|
| `posts_by_page` | `url`: a page link | `since` | posts |
| `posts_by_group` | `url`: a group link (`facebook.com/groups/...`) | `since` | posts |
| `ads_by_keyword` | `keyword` | `country` (default `us`) | ads |

## Instagram

| type | needs | optional | returns |
|---|---|---|---|
| `profile_by_username` | `keyword`: the username (a leading `@` is dropped) | none | the profile |
| `posts_by_profile` | `url`: a profile link | `since` | posts |

## X

| type | needs | optional | returns |
|---|---|---|---|
| `profile_by_username` | `keyword`: the username (a leading `@` is dropped) | none | the profile |
| `posts_by_profile` | `url`: a profile link (`x.com/...`) | `since` | posts |

## TikTok

| type | needs | optional | returns |
|---|---|---|---|
| `posts_by_profile` | `url`: a profile link | `since` | posts |
| `posts_by_keyword` | `keyword` | `country` | posts |
| `profiles_by_search` | `keyword` | `country` (default `us`) | profiles |

## YouTube

| type | needs | optional | returns |
|---|---|---|---|
| `channels_by_keyword` | `keyword` | none | channels |
| `videos_by_keyword` | `keyword` | `country`, `since` | videos (kind `post`) |
| `videos_by_hashtag` | `keyword`: the hashtag (a leading `#` is dropped) | `country`, `since` | videos (kind `post`) |
| `videos_by_channel` | `url`: a channel link | `since` | videos (kind `post`) |

## Crunchbase

| type | needs | optional | returns |
|---|---|---|---|
| `companies_by_keyword` | `keyword`: the company name or words that describe it | none | Crunchbase company records |

For a company whose Crunchbase link you already have, look it up instead: `social(operation="lookup", urls=["https://www.crunchbase.com/organization/globex"])` reads that one record.
