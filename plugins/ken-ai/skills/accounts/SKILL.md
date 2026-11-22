---
name: accounts
description: Run the Accounts loop - add target accounts, research them, map the buying committee, scan signals, plan touches that send under the workspace's Ken agent permission, and hand an account to a teammate.
---

# Accounts

Accounts is the 1:1 lane in Kenso: a short list of target companies, each worked by hand with touches to the people who buy. An account has its domains, a stage, an owner, a research dossier, a buying committee (stakeholders and open seats), signals and touches. Today in Kenso is where a person approves the touches that wait for them.

This skill is the loop an agent runs: read what Knowledge knows, add the accounts, research them, map their committees, scan their signals, then plan and write touches. It ends with every touch you made read back and the person told whether it waits for them in Today or sends at its due time, or with the account handed to a teammate.

## The rule: the workspace's permission decides who approves a touch

You plan and write touches. Whether a person approves one before it sends is the workspace's Ken agent permission (Settings > Ken agent), set per action. Read it before you write a touch with a body: `agent_permissions(operation="get")`. An email follows `send_email`; a LinkedIn message, or a connection request with a note, follows `send_linkedin`.

| The action's `mode` | A touch you create, or a body you write or change |
|---|---|
| `asks_first` | waits for a person |
| `runs_on_its_own` | waits for a person: this mode sends Ken's own first draft that its quality check kept, never text an agent or an API key wrote or changed |
| `runs_everything` | is approved with no click and sends at its due time, unless it is on the list below. You are the last reader before it goes out |

- `agent_permissions` answers 404 `not_found`: the permission is off for the workspace, and every touch waits for a person.
- `agent_permissions` is missing from your tools, or refuses you: you cannot tell. Act as if it reads `runs_everything`, and tell the person you could not read the setting.
- On a workspace run for a client, the send actions read `asks_first` until the client's yes is stored.

These wait for a person at every mode:

- A touch a member created, or one somebody is working on beyond the sender's own text: a member snoozed it, undid a step on it or changed its recipient, a teammate edited it, a workflow changed it, or someone other than a member or the sender's own key or agent asked Ken to write it with `account_touches(operation="draft")`. At `runs_everything` the sender's own edit of the subject, body, title, due date or rationale, and a draft a member or the sender's own key or agent asked Ken for (a first draft or a redraft), no longer hold it: a request goes at once, an edit 10 minutes after the sender's last one. A teammate's edit still waits for the sender, who alone may approve that send. At `runs_on_its_own` they still do.
- A touch approved before, and one that became ready before its action's mode was set.
- A touch with no one to approve it: no account owner and no Sends from inbox or LinkedIn account.
- A touch a key or an agent wrote for a send that is not its own person's. A send belongs to the member whose inbox or LinkedIn account it goes from, else the account owner. A teammate's key or agent may not approve that member's send, and a workspace API key that is nobody's may not approve any, so a touch either one creates waits for that member, and so does a draft a teammate's key or agent acts on, or that a key that is nobody's acts on, directly or through you.
- A reply, a meeting email, an after-call follow-up, a reschedule note, a touch with a spend scope, and a workflow's touch (its step's approval setting decides).
- The first message after someone's LinkedIn connection request is accepted. This permission never sends it: the LinkedIn account's own inbound setting decides. On an autonomous account Ken sends it when the request came with no note; on a manual account, or when the request came with a note (it answers what a stranger wrote), its owner approves it.
- A LinkedIn follow, like or connection request with no note that you create. `engage_linkedin`, where it is listed, releases only the ones Ken's plan places.
- Every iMessage, WhatsApp, Facebook and Instagram touch.

A call, event, intro or task is a person's to-do: nothing sends it, and approving it marks it done.

When the action reads `runs_everything`, the person's click is no longer the safety net. Before you write a touch with a body:

1. Write it only when the person asked for this outreach, or their standing instructions cover it. Name which.
2. With the person in the conversation, show the exact subject and body, who it goes to and when it sends, and write it on their yes.
3. Tell them it sends at that time without their click. Never say it is waiting for their approval.
4. When you are unsure, ask before you write. A draft you ask Ken for with `account_touches(operation="draft", touch_id=...)` sends with no click under `runs_everything` when you act for the sender (the member whose inbox or LinkedIn account it goes from, else the account owner), and waits only when you act for a teammate. A touch left `planned` with no body is not held either: Ken writes it ahead of its due date, and under `runs_everything` that draft sends with no click too.
5. Never raise a mode. Raising a send mode is the person's step in Settings > Ken agent; from here it is refused with 403 `approval_requires_human`. Lower one only when the person asks.

**Read every touch back.** After a create or an update, `account_touches(operation="get", touch_id=5001)`, and report what it says, never what you expect:

- `status` `planned`: no text yet. `awaiting_approval`: nobody has approved it. Right after your write it reads `awaiting_approval` at every mode: an approval under the permission comes from Ken's send pass minutes later, so read it again before you tell the person it went out.
- `approved`: it goes out at `sendAt`, and `holdReason` says why it waits when set. `approvedAt` is when it was approved. `approvedByMemberId` is the member it goes out for, not proof they clicked: under the permission Ken approves in their name. `sent`: it went out at `sentAt`.
- `approverMemberId` is the member who approves it when it waits (null when anyone may).

Approve or retry a send only when the person asks you to approve that exact touch, after they saw this version of it: `client_approvals(operation="touches-approve", client_id=..., touch_id=9001, updated_at="<the touch's updatedAt>")` approves it as them, and `touches-retry` sends a failed one again. Never approve a touch because it looks ready, and never approve one you planned or wrote unless the person asked for exactly that.

- Never say a touch was approved or sent because you created it. Say what its status shows, and when it is due.
- Never invent a price, a meeting time or an offer in a touch. Use what Knowledge, the research or the user gave you, with its source.

Every call takes `client_id`, the workspace id. Send it on every call when the user can see more than one workspace.

## Step 0 - Check what is on

Accounts is in beta. If `accounts(operation="list", limit=1)` is not in your tools or answers 404, Accounts is not on for this workspace: tell the user in one sentence that Accounts is not switched on for them yet, link `https://app.ken.so/<workspace id>`, and stop. Never retry a 404 as "not found".

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
| Kenso writes or grades a touch | `account_touches` draft, rewrite, feedback | `accounts_writer` |
| Hand-off to a teammate | `committee` handoff-brief, hand-off | `accounts_handoff` |
| Today | `today` get, update | `today` |

An operation whose flag is off is not listed for the workspace, or answers 404 `not_found` on every id. Skip that step, tell the user which part is not on for them yet, and carry on with the rest. Do not retry it.

Read the workspace's Contact limits before you plan touches: `account_touches(operation="contact-limits-get")`. Its guardrails bind your touch writes and never a person's: the send window's days and an open opportunity on the account.

## Step 1 - Read what Knowledge knows

Start with one Knowledge read, before any research or writing:

`knowledge(operation="context", purpose="work target accounts: ICP, offer, proof and writing style")`

It returns the workspace's cited pack: instructions, company files, the member's About me and Writing style. Use it to judge fit and to write in the workspace's voice. Before you write an account's touches, read its own pack once: `knowledge(operation="context", account_id=101, purpose="write touches")`. Cite items by `citationId`, and treat `stale` items (over 90 days) with care. When Knowledge is off, skip this step and say so once.

## Step 2 - Add the accounts

Check whether an account exists first: `accounts(operation="list", domain="acme.com")`. Any website URL or work email works as the domain.

Add up to 100 at once from their domains:

`accounts(operation="bulk-create", items=[{"domains": ["acme.com"]}, {"domains": ["globex.com", "globex.io"]}])`

The first domain is the primary. Each result is `created`, `domain_taken` (another account owns that domain: use the `accountId` it names), `invalid` (with the field) or `failed`. Kenso names each account from Kenso Search.

To add one account with its fields set:

`accounts(operation="create", domains=["acme.com"], fields={"stage": "researching", "why_now": "Hiring three AEs for EMEA"})`

- Stages, in six groups (`stage_group`): to sort (`new`, an import added it), pipeline (`researching`, `warming`, `engaged`, `meeting_booked`, `in_deal`), customers (`onboarding`, `client`, `churned`), later (`nurture`, `paused`, `lost`), network (`network`, with `network_label` `partner`, `investor` or `personal`) and archive (`not_a_fit`, `competitor`, `do_not_contact`). Kenso moves an account to `lost` when its deals are all lost, and back to `engaged` when it gets an open opportunity again. Ken plans and drafts touches only in the pipeline and for `nurture`.
- `onboarding` and `client` make the account a customer: its domains are blocked and only a workspace admin may move an account into or out of them. `account_type` follows the stage.
- A field a person set is pinned. Changing it with `accounts(operation="update", account_id=101, changes={"stage": "warming"})` fails with `pinned_by_user`. Send `overwrite_pinned=True` only when the user asked for that exact change.
- Delete and merge cannot be undone. Use them only when the user asks. To set an account aside, set its stage to `paused`, `not_a_fit` or `do_not_contact`.

Done when every company the user named maps to one account id, created or found.

## Step 3 - Research each account

When research is on, a new account starts its research run by itself. Read it with:

`accounts(operation="get", account_id=101, expand="research")`

`researchStatus` is `none`, `waiting_credits`, `queued`, `running`, `succeeded` or `failed`. The research block holds `whyNow`, `angle`, `fitScore`, `pains`, `stack`, `signals`, `facts` and `sources`, and every claim carries the URLs it came from. Reading never starts a run.

To start or refresh research: `committee(operation="research", account_id=101)`

`refresh` says what happened: `started` (a run is queued), `waiting_credits` (held until the workspace has credits), `fresh` (research is under 14 days old, so nothing ran), `in_progress`, `daily_limit`, `recent_failure` or `member_credit_limit_reached`. While a run is open you get the previous dossier: read it again later with `get` and `expand="research"`. `force=True` refreshes fresh research too. It costs credits, so ask the user before forcing.

Research you already gathered elsewhere goes on the account for free: `account_views(operation="accounts-write-research", account_id=101, research={...})`, with the fields of the research block (not its `id`, `status`, `trigger`, `researchedAt` or `isStale`). It shows in the Research tab like a run and changes no account field. A person's is `account_views(operation="people-write-research", person_id=..., research={...})`.

Done when each account's research succeeded, or you told the user why it did not.

## Step 4 - Map the buying committee

Read the committee: `committee(operation="get", account_id=101)`. It returns the stakeholders (person, role, priority, coverage, notes, reports-to, `warmPath` when a teammate can get an intro), the open seats, `coverage {covered, total}` and the latest mapping run.

Ask Kenso to map it: `committee(operation="map", account_id=101, instruction="whoever owns security")`

The run comes back with 202. Follow it with `committee(operation="run-get", run_id=7001)` until `status` is `succeeded` or `failed`. A `paused` run with `pausedReason` `credits` or `member_limit` resumes by itself once credits arrive or an admin raises the limit: tell the user. One run per account at a time: `committee_run_active` names the open run, so follow it instead of starting another.

To find the people yourself, start the run in finding and hand over what you found within 10 minutes:

`committee(operation="map", account_id=101, find=True)`

`committee(operation="submit-candidates", run_id=7001, candidates=[{"full_name": "Maya Chen", "title": "VP Revenue Operations", "linkedin_url": "https://www.linkedin.com/in/mayachen", "evidence": "Named as VP RevOps on the team page", "source_url": "https://acme.com/team", "suggested_role": "economic_buyer"}])`

Each candidate needs `full_name` and at least one of `ken_person_id`, `linkedin_url` or `source_url`: Kenso never adds a person with no source. Send candidates once per run (`run_not_finding` means the run moved on, so do not resend). If you found nobody, send `candidates=[]` and Kenso maps the account at once.

To add one person yourself:

`accounts(operation="stakeholders-create", account_id=101, person={"full_name": "Maya Chen", "email": "maya@acme.com", "title": "VP Revenue Operations"}, fields={"role": "economic_buyer", "priority": 1, "coverage": "planned"})`

- Roles: `champion`, `economic_buyer`, `approver`, `evaluator`, `user`, `executive_sponsor`, `blocker`, `unknown`. Coverage: `engaged`, `planned`, `gap`, `not_targeted`. Priority 1 to 3.
- A person who matches by email, LinkedIn URL or `ken_person_id` is reused, never duplicated.
- `previously_removed` means a person took them off this account. Ask the user, and resend with `force=True` only if they say so.
- A stakeholder with no email cannot get an email touch. `people(operation="find-emails", person_ids=[401], account_id=101)` queues a find, charged per email found at the rate card's price (`billing(operation="credit-rate-card-get")`).

Done when the committee has the people you will write to, each with an email or a LinkedIn URL.

## Step 5 - Scan the signals

Scan an account now: `account_signals(operation="scan", account_id=101)`. It runs in seconds. The Kenso data sources are free; the news search is billed like any web search. It checks funding, sales and RevOps hiring, new sales and finance leaders, headcount growth, stakeholder job changes and, at most once a day for companies over 100 employees, the news. Each source reports `succeeded`, `skipped` (with a reason such as `scanned_recently` and its `nextScanAt`) or `failed`. One failed source never fails the scan, and a rescan of the same data stores nothing.

- One account's stored signals: `account_signals(operation="list", account_id=101, kind="funding,hiring")`.
- Every account's new signals since a date: `account_signals(operation="list-workspace", detected_after="2026-10-12T00:00:00Z")`. Each carries `points` and `weightedPoints` (full up to 7 days old, then less).
- The accounts heating up: `accounts(operation="list", latest_signal_after="2026-10-12T00:00:00Z", fits_icp=True, sort="-score", limit=4)`. `fits_icp=True` keeps pipeline and later accounts only, and leaves out the workspace's own company and accounts research scored below 20, as Today does.

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

**First, why not now.** Every account in `accounts(operation="get")`, `list` and `search` carries `whyNotNow` when there is a reason not to reach out now: `reason`, `outcome` (`stop` or `wait`), `text`, its source (`sourceUrl` and `sourceDate`, or `replyId`), `until` for a wait, and `setBy`. Read it before any touch.

- While it is a `stop`, or a `wait` whose `until` is ahead, do not reach out: plan, write and create no touch there. Tell the user the account's `text` and, for a wait, its `until`. Only a person undoes one: clear it with `account_views(operation="accounts-clear-why-not-now", account_id=101)` only when the user asks.
- When you find a sourced reason not to reach out now, set it: `account_views(operation="accounts-set-why-not-now", account_id=101, reason="being_acquired", source_url="https://news.example.com/acme-globex", source_date="2026-11-03", note="Acme agreed to be bought by Globex")`. The source is the page that says it and `source_date` is the date on that page, never today's; a reply that says it is `reply_id` (its `msg_` id). Never set one without a source.
- Reasons: `outside_limits`, `company_gone` and `competitor` stop the account (its stage moves to `not_a_fit` or `competitor`); `open_deal`, `asked_later` (send `until`, the date they gave), `recent_no`, `crisis`, `being_acquired` and `just_bought` wait until a date (the default unless you send `until`, 180 days at most); `person_left` and `wrong_person` stop reaching one stakeholder (send `stakeholder_id`) and leave the account as it is.

There are two ways to put touches on an account.

**Kenso's plan.** `account_touches(operation="plan-start", account_id=101)` places planned touches across the people you can reach. Where account tiers are on, the account's tier sizes the plan: its `maxTouches`, `days` and `gapDays` from `account_signals(operation="account-tiers-get")` (on the default ladder Tier 1 is up to 11 touches over 100 days, Tier 5 up to 3 over 21). Otherwise it places up to 9 over 90 days. The account must be `researching`, `warming` or `engaged`, with one person who has an email or LinkedIn; otherwise `invalid_state` says what is missing. Read the plan with `account_touches(operation="plan-get", account_id=101)`: `thin` means map more people. Then write each planned touch. Have Kenso write it with `account_touches(operation="draft", touch_id=5001)` (charged; the touch lands in `awaiting_approval`, and under `runs_everything` it then sends with no click when you act for the sender, as The rule says), or write the body yourself with `update`, which the permission decides (The rule).

**Your own touch.**

`account_touches(operation="create", account_id=101, stakeholder_id=301, channel="email", due_at="2026-10-21T14:00:00Z", reason="signal", title="Ramping Maya's three EMEA AEs", subject="Your three EMEA AE hires", body="Hi Maya, ...", rationale="Acme is hiring three AEs for EMEA (careers page, Oct 14), paid for by its Series B. The touch is about ramping them, not the round.")`

- With a body the touch lands in `awaiting_approval`, and the permission decides from there (The rule). Without one it is `planned`, and Ken writes it ahead of its due date.
- Channels: `email`, `linkedin_connect`, `linkedin_message`, `linkedin_follow`, `linkedin_like`, `linkedin_comment`, `call`, `event`, `intro`, `asset`, `task`. Reasons: `cadence`, `signal`, `manual` (the default), `reply`.
- Instagram channels (`instagram_dm`, `instagram_follow`, `instagram_like`, `instagram_comment`) exist, but Instagram plans, sends and engagement are not available yet.
- `linkedin_follow`, `linkedin_like` and `linkedin_comment` need the workspace's `linkedin_engagement` and `accounts_writer` flags. Create them with no body and no page link: Kenso puts a follow or a like up for approval as it is, and for a comment it picks the person's recent post and writes the comment first.
- `rationale` says why this touch, now, with its source. The person approving reads it.
- Edit with `account_touches(operation="update", touch_id=5001, changes={"body": "Hi Maya, ..."})`. That works from `planned`, `drafted`, `awaiting_approval` and `failed`; another status is `invalid_transition`.

Check the copy before you hand it over:

- `account_touches(operation="feedback", touch_id=5001)` grades it for free: a score from 0 to 10, a band (`keep`, `rewrite`, `start_over`, `write_first`) and five bars with notes.
- `account_touches(operation="rewrite", touch_id=5001, instruction="shorter")` returns a rewrite (`shorter`, `warmer`, `more_specific`, `in_my_voice`), is charged, and stores nothing. Save the text you keep with `update`.

A create, update or snooze that breaks a Contact limits guardrail fails with 422 `guardrail_violation`. `error.details[0]` has the rule and `nextAllowedAt`, the first due time that passes: move the touch there. The rule `skip_accounts_with_open_opportunity` has no such time, so leave that account to a person.

Done when you read back each touch you made and know, from its `status` and its action's mode, whether a person approves it or it sends at its due time.

## Step 7 - Hand over to a person

List what waits for a person on an account: `account_touches(operation="list", account_id=101, status="awaiting_approval")`. Each touch's `approverMemberId` is the member who must approve it (null when anyone may).

- If your client shows MCP Apps, call `approvals_review` with `account_id` to show the approval card, with Approve, Edit, Snooze and Skip buttons for the person. Only their click approves, and you never see the grant behind it.
- Otherwise send the user to Today in Kenso: `https://app.ken.so/<workspace id>/today`.
- `today(operation="get", timezone="Europe/Bucharest")` reads the member's Today as they see it: touches waiting for approval, failed sends, tasks due today and paused plans.

Report back per account: the research status and why now, the committee coverage, the signals found, and each touch you made with its person, channel, due time and `status`: waiting for a person, or set to send with no click.

## Hand an account to a teammate

When an account is ready for someone else (a meeting booked, an AE taking over), and the user asks for the hand-off:

1. Find the teammate's member id: `members(operation="list")`.
2. Get Kenso's brief: `committee(operation="handoff-brief", account_id=101, to_member_id=12, channel="email")`. It returns `subject` and `body`: fit score, why now, the engaged and planned stakeholders, roles not mapped yet, the last conversation and the angle. Nothing is sent or charged. `channel` is `email`, `slack` or `crm_task`.
3. Show the brief to the user and edit it with them. The hand-off messages a person, so send it only after the user says yes:

`committee(operation="hand-off", account_id=101, to_member_id=12, channel="email", subject="Handing off Acme", body="...")`

- `create_opportunity=True` also opens an opportunity owned by the teammate, unless the account has an open one. Set it only when the user asks.
- `channel_unavailable` means Slack or the CRM is not connected for this: offer email instead. `self_handoff` means you named the caller.
- `duplicate_handoff` means it already went: do not retry. `delivery_failed` means nothing was recorded but it may have gone out: ask the user before retrying.

The account's owner, inbox and plan do not change. The timeline records the hand-off.

## After a touch is approved

- An approved touch sends from the account's Sends from inbox or LinkedIn account at `sendAt`. `account_touches(operation="get", touch_id=5001)` shows `holdReason` while it waits (for example `connect_inbox` or a `contact_limit_*` reason) and `failureReason` when a send failed. Retrying a failed send is the person's button too.
- Move a touch with `account_touches(operation="snooze", touch_id=5001, days=7)`. Drop it with `account_touches(operation="skip", touch_id=5001, reason="Maya left Acme")`. Delete one only when the user asks.
- A reply pauses the account's plan. Resume it with `account_touches(operation="plan-resume", account_id=101)` or end it with `plan-end`, only when the user says so.
- The account's timeline: `accounts(operation="activity", account_id=101)`.

## Who did what

Every write you make is recorded as an agent write through your client, with the connected user behind it, even when the person asked for it. Touches you create are marked as created by an agent, so the permission for their channel decides whether a person approves them (The rule).

## Credits and errors

Adding accounts, grading a touch, a hand-off brief and a signals scan (apart from its news search) are free. Research runs, mapping runs, touch plans, drafts and rewrites are charged, and an email find is charged per email found. `billing(operation="credit-rate-card-get")` has each price; never quote one from memory. Before research or mapping runs on more than a few accounts, tell the user what it costs.

The cost of each step and what each error code means (`domain_taken`, `pinned_by_user`, `account_merged`, `committee_run_active`, `guardrail_violation`, 402 and the rest) are in `references/credits-and-errors.md`. Open it with `load_skill("accounts", reference="references/credits-and-errors.md")` when a call fails.

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
