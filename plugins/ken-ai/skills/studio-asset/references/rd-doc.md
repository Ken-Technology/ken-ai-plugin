# Fill guide: `rd-doc`, Sample outbound campaign doc

Starter `rd-doc` 1.3.0. Type `reverse_demo`, format `doc`: a web page that also downloads as a PDF. Page slug `outbound-campaign`, so Leo at Brightwave gets `https://{host}/brightwave/outbound-campaign-for-leo`. Sections: `cover`, `strategy`, `segments`, `funnel`, `leads`, `outreach`, `next_steps`. The ask is a booking button, "Book 30 minutes".

The page is a free sample campaign built for one account: their strategy, four segments, a planning funnel, 8 to 10 real people from Ken Search who would buy from them, and the first emails and LinkedIn notes to three of them. The campaign sells the account's own product to the account's buyers. It never sells anything to the account.

A workspace's copy may have changed slots or steps. Read its own `studio.json` first (`studio_templates(operation="pull", template_id=41)`); where it differs from this guide, the file wins. You recognize this starter by the slug `outbound-campaign` and the steps `site`, `dossier`, `why_now`, `offer`, `plan`, `leads`, `copy`, `grade`.

## Before you run it

- **A domain the scraper can read.** `site` scrapes `https://<account domain>`, and `plan` requires it: no readable homepage, no plan, no leads, no emails, and the page shows `fallback.liquid`. Check the account has a primary domain that answers.
- **Research on the account.** `dossier` and `why_now` bind `account.dossier.summary` and `account.dossier.why_now`, from the account's latest succeeded research run. Read it with `accounts(operation="get", account_id=3101, expand="research")`. A missing or stale dossier is not fatal (the page leans on the site), but the plan is sharper with one. Refreshing it with `committee(operation="research", account_id=3101)` needs the `accounts_research` flag and is charged, so ask first. A campaign page built for a lead's company has no dossier at all.
- **Buyers in Ken Search's countries.** People search covers the United States, the United Kingdom, Canada, Australia, Ireland and New Zealand only. An account that sells elsewhere finds no one: the leads and emails fall back and the page shows its fallback.
- **The sender's booking link.** The button goes to the sender's booking URL. Without one it renders nothing.
- **The offer.** `offer` binds `knowledge.offer`, which is empty today (Studio fills cannot read Knowledge yet), so the offer paragraph stays hidden.

## What each field needs

Required slots are marked yes. Slots without a static fallback are covered by `fallback.liquid`.

| Slot | Required | Limits | Filled by | From |
|---|---|---|---|---|
| `site` | no | object | `site` (scrape) | their homepage, markdown, up to 12,000 characters. Never shown |
| `dossier`, `why_now` | no | 4,000 and 1,000 characters | binds | the research dossier. Never shown |
| `offer` | no | 300 | bind | `knowledge.offer`, empty today |
| `strategy` | yes | `intro`, `audience`, `offer`, `channels`, `goal`, each 40 to 900 characters | `plan` | the site, the dossier and why now. `intro` is the one bet; `audience` is who is in and who is out; `offer` is the low-effort next step the emails ask for; `channels` is Email 1 plus a LinkedIn connect on day 0, then email follow-ups; `goal` is what a good first two weeks look like |
| `segments` | yes | 2 to 4 items: `label` at most 28, `sub` at most 80, `value` a whole number, `tests` up to 4 `{name, hypothesis}` | `plan` | four cuts of their market. The first is the one sampled and the largest. The values are how many of the first 1,000 sends go to each and add up to 1,000. A test is `"<choice>: <A> vs <B>"` over a pain, offer, angle or ask, never a subject line |
| `segment_notes` | no | 600 | `plan` | why the first segment goes first |
| `funnel` | yes | 3 to 6 `{label, value}`, labels at most 28 | `plan` | five stages for 1,000 people: reached, opened or accepted, replied, positive replies, meetings. These are planning numbers (35 to 55 percent opened, 3 to 7 replied, 1 to 3 positive, 0.5 to 1.5 meetings), not results. Static fallback: 1,000, 460, 48, 19, 9 |
| `funnel_notes` | no | 400 | `plan` | what would move the numbers |
| `search` | no | object | `plan` | Ken Search people filters in camelCase for the first segment, aiming at a few thousand matches |
| `sampling_criteria` | no | 500 | `plan` | who is in the sample |
| `candidates` | no | up to 30 people | `leads` (Ken Search) | people matching `search`, from any company. Never an email address or phone number |
| `leads` | yes | 3 to 10: `name`, `title`, `company`, `why` (140) required, `linkedin_url`, `website` | `copy` | the 8 to 10 candidates who best fit, best first, copied as given. Never a person outside `candidates`, never someone at the account itself |
| `emails` | yes | 1 to 3: `name`, `subject` (60), `body` (2 to 5 paragraphs of at most 420), `linkedin` (280) required; `ps` (240) optional | `copy` | Email 1 and a LinkedIn connect note for the first 3 leads |

What the emails must be, because the grade fails anything else: a subject of 2 to 4 words built on the fact the first line uses; "Hey <first name>," then a first line under 20 words that ties one fact about the lead's company to the problem the account solves, never their title or headline and never "I noticed", "I saw" or "I came across"; one or two paragraphs on what the account does, in plain words and only claims the site makes; one soft yes-or-no ask, never a meeting or a number of minutes; no sign-off (the page adds the signature). A PS only when it adds something new for that lead, never repeated across leads. A counter on the site that reads 0, 0% or 0+ did not load: it is never a fact.

## How it fills

1. `site` scrapes the homepage. `dossier`, `why_now` and `offer` bind.
2. `plan` (prompt, requires `site`) writes `strategy`, `segments`, `segment_notes`, `funnel`, `funnel_notes`, `search` and `sampling_criteria`.
3. `leads` (Ken Search people, requires `search`, up to 30) fills `candidates`.
4. `copy` (prompt, requires `candidates`) writes `leads` and `emails`. With no candidates it writes empty lists, so the page falls back instead of naming people the search never found.
5. `grade` judges `emails` (pass at 7.5, 2 retries) after its checks: banned "reverse demo", "demo", "I noticed", "I saw", "I came across", "caught my attention", "your headline", "your profile" and "why I am writing"; no dashes, prices, placeholders, "test" as a noun, "real" as emphasis or sign-off. The grade also fails any claim about the account that the site text does not support, and any fact about a lead their search record does not hold.

## Your own model (executor `"agent"`)

The first `prepare` runs the scrape and the binds and gives you `plan` and `grade`; `leads` and `copy` wait. Write `plan`'s seven keys from the site, the dossier and why now only, then prepare again with them: The platform runs the search and hands you `copy` with `candidates`. Write `leads` and `emails` from `candidates` and the site only, grade the emails in a separate call against the rubric and checks, and submit. The full loop is `references/studio-fill.md`.

## Check before the first link

- `state` is `ready` and `slotStatus` shows `filled` for `strategy`, `segments`, `funnel`, `leads` and `emails`. `dossier`, `why_now` and `offer` may be empty: the page never shows the first two and hides the offer paragraph.
- The grade passed. A `needs_review` page never gets a link.
- 8 to 10 leads, all from `candidates`, none at the account itself. Fewer than 30 candidates came back means a narrow search: say so.
- No email address or phone number anywhere, no vendor or tool name, no "demo".
- Every number in the emails appears on the account's site. The funnel is labeled as planning numbers, never quoted as the account's results.
- Open the page's `previewUrl` from `studio_pages(operation="get", asset_id=901)` and read it once top to bottom on desktop and mobile.

## When it goes wrong

| You see | Why | Do |
|---|---|---|
| Whole page on the fallback | the homepage could not be read, so `plan` skipped | check the domain; a site behind a login or a bot wall cannot be sampled |
| `leads` and `emails` on fallback, strategy filled | the search found no one | the buyers are outside Ken Search's countries, or the filters were too narrow: refill once, then tell the user |
| `needs_review` | the emails failed the grade after 2 rewrites | read `data.emails` and the grade's reasons; refill, or have a person edit it on Customize |
| A lead who works at the account | the copy step picked a colleague | refill; never link a page that pitches the account its own staff |
