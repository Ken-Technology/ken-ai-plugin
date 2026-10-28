---
name: accounts
description: Run the Accounts loop - add target accounts, research them, map the buying committee, scan signals, plan touches that a person approves in Today, and hand an account to a teammate.
---

# Accounts

Accounts is the 1:1 lane in Ken AI: a short list of target companies, each worked by hand with touches to the people who buy. An account has its domains, a stage, an owner, a research dossier, a buying committee (stakeholders and open seats), signals and touches. Today in Ken AI is where a person approves what goes out.

This skill is the loop an agent runs: read what Knowledge knows, add the accounts, research them, map their committees, scan their signals, then plan and write touches. It ends with every touch waiting for a person in Today, or with the account handed to a teammate.

## The rule: a person approves every touch

You plan and write touches. A person approves them. No tool you have approves a touch or retries a failed send, and the backend refuses agents that try.

- A touch with a body waits as `awaiting_approval` until a person clicks Approve in Today or on the approval card. A touch you create always waits for a person, whatever the workspace's agent settings say.
- Never tell the user a touch was sent or approved because you created it. Say it is waiting for their approval in Today, and when it is due.
- Never invent a price, a meeting time or an offer in a touch. Use what Knowledge, the research or the user gave you, with its source.

Every call takes `client_id`, the workspace id. Send it on every call when the user can see more than one workspace.

## Step 0 - Check what is on

Accounts is in beta. If `accounts(operation="list", limit=1)` is not in your tools or answers 404, Accounts is not on for this workspace: tell the user in one sentence that Accounts is not switched on for them yet, link `https://app.ken.so`, and stop. Never retry a 404 as "not found".

Each other part of the loop sits behind its own flag, so a workspace may have some steps and not others.

| Part | Operations | Flag |
|---|---|---|
| Accounts, domains, people, stakeholders, touches, Contact limits | `accounts`, `people`, `account_touches` | `accounts` |
| What Knowledge knows | `knowledge` context | `knowledge` |
| Research | `committee` research | `accounts_research` |
| Committee mapping runs | `committee` map, run-get, submit-candidates | `accounts_committee` |
| Signals and scoring | `account_signals` list, list-workspace, scan, scoring-get, scoring-update | `accounts_signals` |
| The tier ladder | `account_signals` account-tiers-get, account-tiers-update, account-tiers-reset | `accounts` |
| The 90-day touch plan | `account_touches` plan-start, plan-get, plan-pause, plan-resume, plan-end | `accounts_plan` |
| Ken AI writes or grades a touch | `account_touches` draft, rewrite, feedback | `accounts_writer` |
| Hand-off to a teammate | `committee` handoff-brief, hand-off | `accounts_handoff` |
| Today | `today` get, update | `today` |

An operation whose flag is off is not listed for the workspace, or answers 404 `not_found` on every id. Skip that step, tell the user which part is not on for them yet, and carry on with the rest. Do not retry it.

Read the workspace's Contact limits before you plan touches: `account_touches(operation="contact-limits-get")`. Its guardrails bind your touch writes and never a person's: weeks between touches to one person, new people contacted per day, and the send window.

## Step 1 - Read what Knowledge knows

Start with one Knowledge read, before any research or writing:

`knowledge(operation="context", purpose="work target accounts: ICP, offer, proof and writing style")`

It returns the workspace's cited pack: instructions, company files, the member's About me and Writing style. Use it to judge fit and to write in the workspace's voice. Before you write an account's touches, read its own pack once: `knowledge(operation="context", account_id=101, purpose="write touches")`. Cite items by `citationId`, and treat `stale` items (over 90 days) with care. When Knowledge is off, skip this step and say so once.

## Step 2 - Add the accounts

Check whether an account exists first: `accounts(operation="list", domain="acme.com")`. Any website URL or work email works as the domain.

Add up to 100 at once from their domains:

`accounts(operation="bulk-create", items=[{"domains": ["acme.com"]}, {"domains": ["globex.com", "globex.io"]}])`

The first domain is the primary. Each result is `created`, `domain_taken` (another account owns that domain: use the `accountId` it names), `invalid` (with the field) or `failed`. Ken AI names each account from Ken Search.

To add one account with its fields set:

`accounts(operation="create", domains=["acme.com"], fields={"stage": "researching", "why_now": "Hiring three AEs for EMEA"})`

- Stages: `researching`, `warming`, `engaged`, `meeting_booked`, `nurture`, `lost`, `paused`, `not_a_fit`. Ken moves an account to `lost` when its deals are all lost, and back to `engaged` when it gets an open opportunity again. Ken plans and drafts no touch for `lost`, `paused` or `not_a_fit` accounts.
- A field a person set is pinned. Changing it with `accounts(operation="update", account_id=101, changes={"stage": "warming"})` fails with `pinned_by_user`. Send `overwrite_pinned=True` only when the user asked for that exact change.
- Delete and merge cannot be undone. Use them only when the user asks. To set an account aside, set its stage to `paused` or `not_a_fit`.

Done when every company the user named maps to one account id, created or found.

## Step 3 - Research each account

When research is on, a new account starts its research run by itself. Read it with:

`accounts(operation="get", account_id=101, expand="research")`

`researchStatus` is `none`, `waiting_credits`, `queued`, `running`, `succeeded` or `failed`. The research block holds `whyNow`, `angle`, `fitScore`, `pains`, `stack`, `signals`, `facts` and `sources`, and every claim carries the URLs it came from. Reading never starts a run.

To start or refresh research: `committee(operation="research", account_id=101)`

`refresh` says what happened: `started` (a run is queued), `waiting_credits` (held until the workspace has credits), `fresh` (research is under 14 days old, so nothing ran), `in_progress`, `daily_limit`, `recent_failure` or `member_credit_limit_reached`. While a run is open you get the previous dossier: read it again later with `get` and `expand="research"`. `force=True` refreshes fresh research too. It costs credits, so ask the user before forcing.

Done when each account's research succeeded, or you told the user why it did not.

## Step 4 - Map the buying committee

Read the committee: `committee(operation="get", account_id=101)`. It returns the stakeholders (person, role, priority, coverage, notes, reports-to, `warmPath` when a teammate can get an intro), the open seats, `coverage {covered, total}` and the latest mapping run.

Ask Ken AI to map it: `committee(operation="map", account_id=101, instruction="whoever owns security")`

The run comes back with 202. Follow it with `committee(operation="run-get", run_id=7001)` until `status` is `succeeded` or `failed`. A `paused` run with `pausedReason` `credits` or `member_limit` resumes by itself once credits arrive or an admin raises the limit: tell the user. One run per account at a time: `committee_run_active` names the open run, so follow it instead of starting another.

To find the people yourself, start the run in finding and hand over what you found within 10 minutes:

`committee(operation="map", account_id=101, find=True)`

`committee(operation="submit-candidates", run_id=7001, candidates=[{"full_name": "Maya Chen", "title": "VP Revenue Operations", "linkedin_url": "https://www.linkedin.com/in/mayachen", "evidence": "Named as VP RevOps on the team page", "source_url": "https://acme.com/team", "suggested_role": "economic_buyer"}])`

Each candidate needs `full_name` and at least one of `ken_person_id`, `linkedin_url` or `source_url`: Ken AI never adds a person with no source. Send candidates once per run (`run_not_finding` means the run moved on, so do not resend). If you found nobody, send `candidates=[]` and Ken AI maps the account at once.

To add one person yourself:

`accounts(operation="stakeholders-create", account_id=101, person={"full_name": "Maya Chen", "email": "maya@acme.com", "title": "VP Revenue Operations"}, fields={"role": "economic_buyer", "priority": 1, "coverage": "planned"})`

- Roles: `champion`, `economic_buyer`, `approver`, `evaluator`, `user`, `executive_sponsor`, `blocker`, `unknown`. Coverage: `engaged`, `planned`, `gap`, `not_targeted`. Priority 1 to 3.
- A person who matches by email, LinkedIn URL or `ken_person_id` is reused, never duplicated.
- `previously_removed` means a person took them off this account. Ask the user, and resend with `force=True` only if they say so.
- A stakeholder with no email cannot get an email touch. `people(operation="find-emails", person_ids=[401], account_id=101)` queues a find, 1 credit per email found.

Done when the committee has the people you will write to, each with an email or a LinkedIn URL.

## Step 5 - Scan the signals

Scan an account now: `account_signals(operation="scan", account_id=101)`. It runs in seconds. The Ken data sources are free; the news search is billed like any web search. It checks funding, sales and RevOps hiring, new sales and finance leaders, headcount growth, stakeholder job changes and, at most once a day for companies over 100 employees, the news. Each source reports `succeeded`, `skipped` (with a reason such as `scanned_recently` and its `nextScanAt`) or `failed`. One failed source never fails the scan, and a rescan of the same data stores nothing.

- One account's stored signals: `account_signals(operation="list", account_id=101, kind="funding,hiring")`.
- Every account's new signals since a date: `account_signals(operation="list-workspace", detected_after="2026-10-12T00:00:00Z")`. Each carries `points` and `weightedPoints` (full up to 7 days old, then less).
- The accounts heating up: `accounts(operation="list", latest_signal_after="2026-10-12T00:00:00Z", fits_icp=True, sort="-score", limit=4)`. `fits_icp=True` leaves out the workspace's own company, `not_a_fit` accounts and accounts research scored below 20, as Today does.

**Scanning many accounts** ("scan my accounts", "what changed this week"):

1. List the live accounts: `accounts(operation="list", stage="researching,warming,engaged", fits_icp=True, limit=50)`.
2. Scan each one, one call at a time, at most 25 per pass unless the user asks for more. A failed scan never stops the pass: note it and move on. Skip an account whose sources all answer `scanned_recently`.
3. Read what is new across the workspace with `list-workspace` and `detected_after` set to the start of the pass, highest `weightedPoints` first.
4. Read the tier ladder, `account_signals(operation="account-tiers-get")`, to show where each account sits (`tier`, `autoTier`). Set a tier by hand only when the user asked for that tier: `accounts(operation="update", account_id=101, changes={"tier_override": 2})`, in its own call.
5. Report per account: the new signals with their dates and sources, the score and tier, and the touch each signal suggests. Plan those touches in Step 6.

What a signal means:

- A signal is the best reason for a touch. Give a touch it prompts `reason="signal"` and name the signal in the rationale.
- A funding round is not a buying event by itself. The money pays for a plan (hiring, a new market, a launch): write about that plan to the person who runs it, never "congrats on the raise".
- A job change of a known stakeholder is a new door: the person at their new company, and a gap on the old account's committee.

## Step 6 - Plan and write touches

There are two ways to put touches on an account.

**Ken AI's plan.** `account_touches(operation="plan-start", account_id=101)` places planned touches across the people you can reach. Where account tiers are on, the account's tier sizes the plan: its `maxTouches`, `days` and `gapDays` from `account_signals(operation="account-tiers-get")` (on the default ladder Tier 1 is up to 11 touches over 100 days, Tier 5 up to 3 over 21). Otherwise it places up to 9 over 90 days. The account must be `researching`, `warming` or `engaged`, with one person who has an email or LinkedIn; otherwise `invalid_state` says what is missing. Read the plan with `account_touches(operation="plan-get", account_id=101)`: `thin` means map more people. Then write each planned touch. Have Ken AI write it with `account_touches(operation="draft", touch_id=5001)` (charged; the touch lands in `awaiting_approval`), or write the body yourself with `update`.

**Your own touch.**

`account_touches(operation="create", account_id=101, stakeholder_id=301, channel="email", due_at="2026-10-21T14:00:00Z", reason="signal", title="Ramping Maya's three EMEA AEs", subject="Your three EMEA AE hires", body="Hi Maya, ...", rationale="Acme is hiring three AEs for EMEA (careers page, Oct 14), paid for by its Series B. The touch is about ramping them, not the round.")`

- With a body the touch waits for approval. Without one it is `planned`, to write later.
- Channels: `email`, `linkedin_connect`, `linkedin_message`, `linkedin_follow`, `linkedin_like`, `linkedin_comment`, `call`, `event`, `intro`, `asset`, `task`. Reasons: `cadence`, `signal`, `manual` (the default), `reply`.
- `linkedin_follow`, `linkedin_like` and `linkedin_comment` need the workspace's `linkedin_engagement` and `accounts_writer` flags. Create them with no body and no page link: Ken AI puts a follow or a like up for approval as it is, and for a comment it picks the person's recent post and writes the comment first.
- `rationale` says why this touch, now, with its source. The person approving reads it.
- Edit with `account_touches(operation="update", touch_id=5001, changes={"body": "Hi Maya, ..."})`. That works from `planned`, `drafted`, `awaiting_approval` and `failed`; another status is `invalid_transition`.

Check the copy before you hand it over:

- `account_touches(operation="feedback", touch_id=5001)` grades it for free: a score from 0 to 10, a band (`keep`, `rewrite`, `start_over`, `write_first`) and five bars with notes.
- `account_touches(operation="rewrite", touch_id=5001, instruction="shorter")` returns a rewrite (`shorter`, `warmer`, `more_specific`, `in_my_voice`), is charged, and stores nothing. Save the text you keep with `update`.

A create, update or snooze that breaks a Contact limits guardrail fails with 422 `guardrail_violation`. `error.details[0]` has the rule and `nextAllowedAt`, the first due time that passes: move the touch there. The rule `skip_accounts_with_open_opportunity` has no such time, so leave that account to a person.

Done when each touch you made is `awaiting_approval` with a body, or `planned` on purpose.

## Step 7 - Hand over to a person

List what waits on an account: `account_touches(operation="list", account_id=101, status="awaiting_approval")`. Each touch's `approverMemberId` is the member who must approve it (null when anyone may).

- If your client shows MCP Apps, call `approvals_review` with `account_id` to show the approval card, with Approve, Edit, Snooze and Skip buttons for the person. Only their click approves, and you never see the grant behind it.
- Otherwise send the user to Today in Ken AI: `https://app.ken.so/<workspace id>/today`.
- `today(operation="get", timezone="Europe/Bucharest")` reads the member's Today as they see it: touches waiting for approval, failed sends, tasks due today and paused plans.

Report back per account: the research status and why now, the committee coverage, the signals found, and each waiting touch with its person, channel and due time.

## Hand an account to a teammate

When an account is ready for someone else (a meeting booked, an AE taking over), and the user asks for the hand-off:

1. Find the teammate's member id: `members(operation="list")`.
2. Get Ken AI's brief: `committee(operation="handoff-brief", account_id=101, to_member_id=12, channel="email")`. It returns `subject` and `body`: fit score, why now, the engaged and planned stakeholders, roles not mapped yet, the last conversation and the angle. Nothing is sent or charged. `channel` is `email`, `slack` or `crm_task`.
3. Show the brief to the user and edit it with them. The hand-off messages a person, so send it only after the user says yes:

`committee(operation="hand-off", account_id=101, to_member_id=12, channel="email", subject="Handing off Acme", body="...")`

- `create_opportunity=True` also opens an opportunity owned by the teammate, unless the account has an open one. Set it only when the user asks.
- `channel_unavailable` means Slack or the CRM is not connected for this: offer email instead. `self_handoff` means you named the caller.
- `duplicate_handoff` means it already went: do not retry. `delivery_failed` means nothing was recorded but it may have gone out: ask the user before retrying.

The account's owner, inbox and plan do not change. The timeline records the hand-off.

## After a person approves

- An approved touch sends from the account's Sends from inbox or LinkedIn account at `sendAt`. `account_touches(operation="get", touch_id=5001)` shows `holdReason` while it waits (for example `connect_inbox` or a `contact_limit_*` reason) and `failureReason` when a send failed. Retrying a failed send is the person's button too.
- Move a touch with `account_touches(operation="snooze", touch_id=5001, days=7)`. Drop it with `account_touches(operation="skip", touch_id=5001, reason="Maya left Acme")`. Delete one only when the user asks.
- A reply pauses the account's plan. Resume it with `account_touches(operation="plan-resume", account_id=101)` or end it with `plan-end`, only when the user says so.
- The account's timeline: `accounts(operation="activity", account_id=101)`.

## Who did what

Every write you make is recorded as an agent write through your client, with the connected user behind it. Touches you create are marked as created by an agent, which is why they always wait for a person.

## Credits and errors

Adding accounts, grading a touch, a hand-off brief and a signals scan (apart from its news search) are free. Research runs, mapping runs, touch plans, drafts and rewrites are charged, and an email find costs 1 credit per email found. Before research or mapping runs on more than a few accounts, tell the user what it costs.

The cost of each step and what each error code means (`domain_taken`, `pinned_by_user`, `account_merged`, `committee_run_active`, `guardrail_violation`, 402 and the rest) are in `references/credits-and-errors.md`. Open it with `load_skill("accounts", reference="references/credits-and-errors.md")` when a call fails.

## No Ken account yet

These steps run on the Ken MCP server, which signs in with a Ken account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
