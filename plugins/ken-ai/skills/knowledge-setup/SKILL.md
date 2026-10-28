---
name: knowledge-setup
description: Set up and keep up a workspace's Knowledge - company, offer and pricing files, watched website pages, call transcripts, writing style, account tiers and scoring, the Review queue and Knowledge prompts - plus the playbooks for researching a company, reading its website and writing a campaign's qualification and AI variable prompts.
---

# Knowledge setup

Knowledge is what Ken AI knows about a workspace: the company, its offer and prices, who it sells to, its proof and competitors, how its people write, and what its calls and website say. Campaigns and agents read it. Every personalization prompt gets the company folder's files and the Instructions; the reply agent and account research cite it; Knowledge prompts add workspace-wide rules to every campaign's qualification, scoring, personalization and replies.

This skill fills Knowledge in and keeps it true. It also holds the four playbooks it replaced, which work with or without Knowledge.

## Playbooks

| Task | Load |
|---|---|
| Research a company and write its company context | `load_skill(name="knowledge-setup", reference="references/client-research.md")` |
| Read a company's website into notes | `load_skill(name="knowledge-setup", reference="references/website-scraping.md")` |
| Write a campaign's qualification prompt | `load_skill(name="knowledge-setup", reference="references/qualification.md")` |
| Write and test a campaign's AI variable prompts | `load_skill(name="knowledge-setup", reference="references/prompt-writer.md")` |
| Work the Review queue, change the review mode, undo a change | `load_skill(name="knowledge-setup", reference="references/knowledge-review.md")` |
| Write a prompt every campaign shares (Knowledge prompts) | `load_skill(name="knowledge-setup", reference="references/knowledge-prompts.md")` |

Each playbook reads on its own and names its own references, which load the same way.

## Rules

- **Extract, never invent.** Every fact in a file comes from a source you can name: the website, a call, a document, or the person's words in this conversation. Never invent a price, a customer, a result or a number. A gap stays a gap: write it as an open question and ask.
- **Cite what people want.** A rule about how the company writes, or a claim about what a client wants, carries its source: who said it, where and when ("Dana, kickoff call, 2026-10-14"). With no source, ask; never fill the gap from a ticket's or an issue's claim.
- **A yes before each write.** Show what you will write, file by file, and save after the person agrees. A yes to the pricing file covers that file, not the folder.
- **Read, then write.** `knowledge(operation="get", file_id=...)` returns `version`; pass it as `base_version`. `version_conflict` means someone saved since: read again, merge, show the person, save.
- **Edit sections, keep files.** `section={"heading": "Pricing", "body": "..."}` changes one heading and leaves the rest. A restructure is a new version of the same file, never a delete and a new file; History keeps every version.
- **Propose what you may not change.** `canEdit` false, or a 403 on a write: `knowledge(operation="suggestion-create", ...)` (the Review playbook), and say it waits in Review.
- **Webhook URLs and email-in addresses are passwords.** Give one only to the person who asked, here, and never write it into a file, a ticket or a shared channel.
- **Vendor names never reach clients.** Ken's model and data providers stay out of Knowledge and out of what you tell a client.
- This skill never sends, launches, or changes a campaign's schedule or volume. A person approves every send and launch.

## Step 0: Check Knowledge is on

`knowledge(operation="folders-list")`. It returns the top folders: the company folder named after the workspace (with Competitors and Proof inside), Accounts, You, Skills and Instructions. Keep their ids and `canEdit`.

When the call is refused or answers 404, Knowledge is off for this workspace. Say so in one sentence with the link `https://app.ken.so/demo/knowledge` and stop; never retry it. The four campaign playbooks above still work without Knowledge, so offer the one the person needs.

## Step 1: Read what is there

1. `knowledge_review(operation="tree-get")`: every folder and file with its name, level, status and version. Add `include_bodies=true` only for a small tree.
2. `workspace(operation="get", workspace_id=...)`: `website` and `companyContext`, the short company summary campaign prompts read. The workspace id comes from `workspace(operation="list")`.
3. `knowledge(operation="website-pages-list")`: the pages Ken watches and each one's status.
4. `knowledge_review(operation="sources-list")`: connected mailboxes, CRM and recorders.
5. `knowledge_review(operation="settings-get")` and `knowledge_review(operation="suggestion-counts")`: the review mode and what already waits.

Tell the person in a few lines what is there, what is missing and what you would fill first. Most workspaces need, in order: the company files, the website pages, the voice, then calls and tiers.

## Step 2: Company files

The company folder holds the company-wide files. Ken seeds none, except a `Company overview` moved from Settings when the workspace had a company context. Aim for:

| File | Holds |
|---|---|
| Company overview | What the company does, for whom, and why it wins, in plain words |
| Ideal customer profile | Industries, sizes, roles, the problems they have, and who is not a fit |
| Pricing | Plans, prices and terms exactly as the company states them, with the source and its date |
| Proof (folder) | One file per case study or result: customer, problem, result, source |
| Competitors (folder) | One file per competitor: what they do, where the company wins, where it loses |

1. Gather: run the client-research playbook (website, past research, the person's notes), or take what the person pastes or says.
2. For each file: when one with that name exists, `get` it and update only the sections that changed. Otherwise `knowledge(operation="create", folder_id=<company folder id>, name="Pricing", body="# Pricing\n...", tags=["pricing"])`. Proof and Competitors files go in those folders (`knowledge(operation="folders-list", parent_id=<company folder id>)` gives their ids).
3. Keep the workspace company context in step with Company overview: the client-research playbook writes it with `workspace(operation="update", workspace_id=..., company_context=...)`.

Your writes, made with the person's yes, go live at once and can be undone from the change log. What Ken learns later from the website, calls and mail goes through the review mode, which by default holds pricing and company-wide changes for a person.

## Step 3: Website pages

Ken watches up to 15 pages of the workspace's website and turns new and changed text into facts.

- No website: `website` is null and a refresh answers `no_website`. On a yes, set it: `workspace(operation="update", workspace_id=..., website="https://...")`.
- Pick the pages: home, product or service pages, pricing, customers or case studies, about. Skip blog posts, careers and legal pages.
- Save the whole list (workspace admins): `knowledge(operation="website-pages-replace", urls=["/", "/pricing", "/customers"])`. A page left out stops being read, and its pending suggestions leave Review.
- Read them now (workspace admins): `knowledge(operation="website-pages-refresh")`. It queues and can take about 25 minutes; new facts arrive in Review. `refresh_in_progress` and `refresh_recent` (one finished within the hour) mean wait: do not retry.

A one-off read of a site for research is the website-scraping playbook, not this list.

## Step 4: Voice and Instructions

- **Instructions** are workspace rules every campaign follows ("never promise a delivery date", "say workspace, not account"), added to every personalization prompt as rules. One rule per line, each with its source: `knowledge(operation="create", folder_id=<Instructions id>, name="Tone", body="- ...")`. A shared instruction needs a workspace admin; `visibility="private"` makes one the person's own. Review holds every change Ken proposes to them.
- **Writing style** is per person. `knowledge(operation="writing-style-create")` finds or makes the person's You / Writing style file; add rules with `knowledge(operation="update", file_id=..., base_version=..., body=...)`, one `- rule` line each. With their mailbox connected, `knowledge(operation="writing-style-relearn")` has Ken learn from their sent mail on the next hourly run and file the rules as a suggestion. `no_mailbox_ingest` means they have no mailbox source with reading on.
- A voice rule needs its source: the person's words, a sample they wrote, or a call. With nothing to learn from, ask for two or three emails they are proud of.

## Step 5: Calls and connected sources

- **One call:** `knowledge(operation="transcripts-create", text="...", title="Kickoff with Acme", occurred_at="2026-10-14T15:00:00Z", account_id=...)`. Up to 5 MB; `Name: words` lines keep the speaker. Facts arrive in Review. Without an account the transcript stays the person's own.
- **Every call:** `knowledge(operation="transcripts-create-webhook")` returns a URL a recorder, Zapier or Make posts to; `knowledge(operation="transcripts-create-email-address")` returns an address to forward recaps to. Each is shown once, replaces the person's previous one, and is a password (Rules).
- **Mailbox and CRM:** `knowledge_review(operation="sources-list")` shows them. Turn reading on or off, or share one with the workspace, on the owner's yes: `knowledge_review(operation="sources-update", source_id=..., ingest_enabled=true, share_with_workspace=false)`. HubSpot: `knowledge(operation="hubspot-create-connect-session")` returns an authorize link for a workspace admin, who finishes the connection signed in to the app.
- **Documents:** people upload them in the app. Read an uploaded file's text with `knowledge_review(operation="upload-content", file_id=...)`.

## Step 6: Review mode

Ask a workspace admin which mode they want, with the table from the Review playbook, and save it on their yes: `knowledge_review(operation="settings-update", review_mode="exceptions")`. `exceptions` (the default) holds skills, instructions, pricing and company-wide changes for a person; `review_all` holds everything; `auto` lets company-wide changes through with spot checks. Then walk the person through what already waits, as the Review playbook says.

## Step 7: Account tiers and scoring

These need the Accounts feature (scoring also needs Accounts signals). A refusal means it is off: say so and skip this step.

1. Read: `account_signals(operation="account-tiers-get")` (names, score floors, `placement`) and `account_signals(operation="scoring-get")` (points per signal kind).
2. Describe each tier from the Ideal customer profile, in what the account data shows. With `placement` `prompt` (custom tiers), the descriptions live on the tiers Knowledge prompt (the Knowledge prompts playbook). Otherwise name the tiers and set the floors on a yes: `account_signals(operation="account-tiers-update", changes={"tiers": [{"tier": 1, "name": "Best fit", "min_score": 70}]})`. What each tier does next (destination, touches, campaign) is the accounts skill.
3. Points: weigh the signals that show the problem the offer solves. Funding is not a buying event: a new round alone never makes an account Tier 1, so keep `funding` below the signals that show need. `account_signals(operation="scoring-update", points={"funding": 10})` rescores every live account at once, so show the old and new points and save on a yes.

## Step 8: Knowledge prompts

A rule that holds for every campaign (who never qualifies, what replies never say, how to personalize for this company) is a Knowledge prompt, written once. Load the Knowledge prompts playbook before writing one. Changing a prompt that synced AI variables use rewrites them; on a live client campaign that changes what it sends, so it needs a yes that names the client.

## Step 9: Check and hand off

1. Read it back the way agents will: `knowledge(operation="context", purpose="first cold email to a new prospect")` returns the cited pack. Check that the overview, offer and voice are in `stable` and that nothing there is wrong or stale.
2. Report in a few lines: each file you wrote with its link `https://app.ken.so/demo/knowledge/f/<file id>`, the watched pages, the sources connected, the review mode, and `pendingCount` from `knowledge_review(operation="suggestion-counts")` with the Review link `https://app.ken.so/demo/knowledge/review`. The change log is `https://app.ken.so/demo/knowledge/review/changes`.
3. List the open questions you left as gaps: a price you could not confirm, a competitor with no source.

## What this skill cannot do yet

- Upload a document. People upload in the app; this skill reads uploads.
- Make, rename or delete a folder. Use the app.
- Give a file a system key. A file you create is a plain file, so update the `Company overview` Ken moved from Settings rather than making a second one.
- Read a website on a customer connection: `web` is not on those, so ask the person to paste the page text (the website-scraping playbook).
- Download an export. The zip opens only in the app.
- Run research Knowledge prompts. They are kept, but campaigns do not run them yet.

## Errors

| Error | Action |
|---|---|
| 404 on a Knowledge call, or the call is refused | Knowledge is off (Step 0). Stop; never retry |
| 403 `forbidden` or `permission_denied` | The person cannot change it: propose it with `suggestion-create`, or ask a workspace admin (website pages, review mode and shared skills and instructions are admin-only) |
| 409 `version_conflict` | Read again, merge, show the person, save |
| 409 `member_required` or `needs_person` | The connection has no person behind it: writing style and transcripts need the person's own connection |
| 409 `refresh_in_progress` or `refresh_recent` | Wait; do not retry |
| 409 `website_refresh_off` | Website reading is not on for this workspace: say so |
| 400 on a field | Fix the named field and retry once |

## No Ken account yet

These steps run on the Ken MCP server, which signs in with a Ken account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
