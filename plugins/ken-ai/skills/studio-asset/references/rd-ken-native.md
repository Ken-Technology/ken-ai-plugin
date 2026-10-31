# Fill guide: `rd-ken-native`, We built you a campaign

Starter `rd-ken-native` 1.1.1. Type `reverse_demo`, format `page`. Page slug `campaign-preview`: `https://{host}/fernway/campaign-preview-for-maria`. Sections: `hero`, `audience`, `people`, `emails`, `cta`. The ask is a booking button, "Book 20 minutes".

A one-page campaign preview for an account: who they should email first, six real people from Kenso Search, and the first emails to two or three of them. Lighter than `rd-doc` (no strategy, segments or funnel, no PDF), and its email core is written once by the platform's copy step and personalized per person. Like every reverse demo, the campaign sells the account's own product to the account's buyers.

Read the template's own `studio.json` first (`studio_templates(operation="pull", template_id=41)`): a workspace copy may differ, and its file wins. You recognize this starter by the slug `campaign-preview` and the steps `dossier`, `why_now`, `target`, `find`, `write`, `pick`, `grade`.

## Before you run it

- **Research on the account.** This starter reads no website. Everything it knows about the account comes from `account.dossier.summary`, `account.dossier.why_now`, `account.industry` and `account.size_band`. Check the dossier with `accounts(operation="get", account_id=3101, expand="research")`. With no dossier the targeting is a guess from industry and size: refresh the research first (`committee(operation="research", account_id=3101)`, flag `accounts_research`, charged, so ask), or pick `rd-doc`, which reads the site. A campaign page built for a lead's company has no dossier.
- **Buyers in Kenso Search's countries**: the United States, the United Kingdom, Canada, Australia, Ireland and New Zealand.
- **The sender's booking link** for the button.

## What each field needs

| Slot | Required | Limits | Filled by | From |
|---|---|---|---|---|
| `dossier`, `why_now` | no | 4,000 and 1,000 characters | binds | the research dossier |
| `search` | no | object | `target` | Kenso Search people filters in camelCase: the 3 to 6 roles that own the problem, aiming at a few thousand matches |
| `brief` | no | 400 | `target` | one sentence for the copy step: what the account sells, who buys it, and the one fact the first email leans on |
| `audience` | no | `summary` 40 to 480 (required inside), `chips` up to 8 | `target` | who we go after, why they feel the problem, who we left out; chips say the filters in plain words, at most 36 characters each |
| `people` | no | up to 12 | `find` (Kenso Search) | buyers matching `search`, from any company |
| `draft` | no | 1,500 | `write` (`ken.copy`) | the core of the first email: what the account does for them, one proof point from the brief, one soft ask. No greeting, no first line, no signature |
| `headline` | no | 10 to 80 | `pick` | what is on the page, plainly. Fallback: "We built {account} a campaign" |
| `intro` | no | 420 | `pick` | 2 or 3 sentences from the sender: who you looked for, what is below, and what they would change. Uses why now when there is one. Has a fallback |
| `shortlist` | yes | 3 to 6: `name`, `title`, `company`, `why` (120) required, `linkedin_url` | `pick` | the 6 people in `people` who best fit the audience, copied as given |
| `emails` | yes | 1 to 3: `name`, `subject` (2 to 60), `body` (2 to 5 paragraphs) required; `title`, `company`, `linkedin_url`, `ps` (240) optional | `pick` | the first email to the top 2 or 3 on the shortlist: "Hi <first name>,", a first line under 20 words with one fact about their role or company from `people`, then the paragraphs of `draft`. Subject under 6 words, built on that fact |

## How it fills

1. `dossier` and `why_now` bind.
2. `target` (prompt) writes `search`, `brief` and `audience`.
3. `find` (Kenso Search people, requires `search`, 12) fills `people`.
4. `write` (the `ken.copy` tool, requires `brief` and `audience`) writes `draft`. It is a model call the platform runs on every path, so it costs tokens even when your own agent fills the page. For a token-free fill, edit the template so a `prompt` step writes `draft` instead.
5. `pick` (prompt, requires `people` and `draft`) writes `headline`, `intro`, `shortlist` and `emails`.
6. `grade` judges `emails` (pass at 7.5, 1 retry). Automatic fails: a dash, "reverse demo" or "demo", an email address, phone number or price, a subject of 6 words or more, or a first line that opens with "I noticed", "I saw" or "I came across".

## Your own model (executor `"agent"`)

The first `prepare` runs the two binds and gives you `target` and `grade`; `find`, `write` and `pick` wait. Write `search`, `brief` and `audience`, then prepare again with them: The platform runs the search and the copy step and gives you `pick` with `people` and `draft`. Write its four slots, grade the emails in a separate call, and submit. `references/studio-fill.md` has the loop and a worked example of exactly this starter.

## Check before the first link

- `state` is `ready`; `shortlist` and `emails` are `filled`. `headline` and `intro` may show their fallbacks; read them and say so.
- The grade passed.
- Every person on the shortlist came from `people`; none works at the account.
- No email address, phone number, price, vendor or tool name, and no "demo".
- Read the page once through its `previewUrl` (`studio_pages(operation="get", asset_id=901)`).

## When it goes wrong

| You see | Why | Do |
|---|---|---|
| `shortlist` and `emails` on fallback | the search found no one, or `target` had nothing to go on | check the dossier and the account's market; refill once, then tell the user |
| Generic targeting | no dossier on the account | refresh the research (ask first), then refill |
| `needs_review` | the emails failed the grade after the retry | read the reasons; refill, or a person edits it on Customize |
