---
name: today-review
description: Review a member's Today queue - what needs them now, grouped by kind and urgency - then draft, rewrite, grade, snooze or skip the touches they flag, clear rows they are done with, and hand every approval back to them.
---

# Today review

Today in Ken AI is one member's queue for the day: touches waiting for approval or failed, tasks due, meetings, replies waiting, signals, new leads, paused account plans and setup steps. The member sees it at `https://app.ken.so/<workspace id>/today`.

Trigger on "what needs me today?", "clear my queue", "go through my Today", or the start of a member's day.

This skill reads the queue in the member's time zone, groups it, works the touches the member points at (draft, rewrite, grade, snooze, skip), clears the rows they are done with, shows the questions Ken AI asked them, and hands every approval back to them.

## The rule: the member approves every send

You draft, rewrite, grade, snooze and skip. Only a person approves. No tool you have approves a touch, retries a failed send, or answers a question Ken AI asked, and the backend refuses agents that try.

- A touch with a body waits as `awaiting_approval` until the person clicks Approve in Today or on the approval card. Never say a touch was sent or approved because you wrote it: say it waits for their approval, and when it is due.
- Retrying a failed send is the person's button too.
- Every write in this skill happens only on the member's request, one row at a time unless they ask for a batch.

Every call takes `client_id`, the workspace id. Send it on every call when the user can see more than one workspace.

## Step 0 - Check what is on

Today and touches are in beta. They are staff-only until these flags are on for the workspace:

| Part | Operations | Flag |
|---|---|---|
| Today | `today` get, update | `today` and `accounts` |
| Touches: read, edit, snooze, skip, undo | `account_touches` list, get, update, snooze, skip, undo | `accounts` |
| Ken AI writes or grades a touch | `account_touches` draft, rewrite, feedback | `accounts_writer` |
| Questions Ken AI asks | `ken_questions` list, get | `notifications`, and staff only for now whatever the flags |

- `today` is not listed, or answers 404: Today is not on for this workspace. Stop, say so in one sentence, and link `https://app.ken.so/<workspace id>/today`. Do not retry, and do not read the 404 as "nothing to do".
- 403 `member_required`: Today belongs to a member, and this connection has no person behind it (an opaque API key). Ask the member to connect as themselves.
- `draft`, `rewrite` or `feedback` missing or 404: the member can still edit text with `update`; say Ken AI drafting is not on for them.
- `ken_questions` missing or 404: skip step 5 without comment.

## Step 1 - Read Today

`today(operation="get", client_id=..., timezone="Europe/Bucharest")`

- `timezone` sets the day for a member with no app time zone; the member's own app time zone wins. Pass the zone the member told you, or leave it out and say the day is UTC. Never guess a zone from a name or a company.
- `scope` is `mine` by default (the member's accounts and accounts with no owner). Pass `scope="everyone"` only when a manager asks for the team's queue.

What comes back:

| Field | Holds |
|---|---|
| `data.brief` | `greeting`, `text` (at most two sentences on replies waiting and the next meeting), `needsYou` (the count that needs the member) and up to 3 `chips` with a prompt each |
| `data.items` | the open rows, already in the backend's order: setup and Knowledge rows, paused and ended plans, opportunities, touches and tasks by due time, the other plan rows, new leads and merge suggestions, then calls, meeting notes, replies, meetings today and signals. `data.hasMore` says more exist |
| `data.done` | rows the member cleared today, each with `doneAs` (`approved`, `done`, `snoozed`, `skipped`) |
| `data.calls` | call counts while calls are on (`open`, `callableNow`, `dueToday`), else null |
| `data.batches` | campaign batches waiting for approval, oldest first, whatever the scope |

Each row has `id`, `kind`, `title`, `detail` and `dueAt`. A touch row (`touch_<id>`) also has `touch`, `approval` (`canDecide`, `note`) and `notice`: `reconnect_inbox` or `reconnect_linkedin` when the sender must reconnect, `connect_inbox` when the account has no Sends from inbox. A notice never blocks approval, but the send waits until it is fixed.

## Step 2 - Group and present

Open with `data.brief.text`, then the groups that have rows, most urgent first:

| Group | Rows | What the member does |
|---|---|---|
| Blocked | touch rows with a `notice`; failed sends | reconnect the inbox or LinkedIn account, or retry the send in Today |
| To approve | touch rows `awaiting_approval`, due today or overdue; `data.batches` | approve, edit, snooze or skip |
| Replies waiting | `reply` rows (`reply_email_<n>`, `reply_linkedin_<n>`) | answer them (the `reply-handling` skill) |
| Meetings | `meeting` (today) and `meeting_notes` (ended, no notes) | prep (the `meeting-prep-and-followup` skill), or add notes |
| Tasks and calls | task rows due today, `call`, `call_disposition` | do them, or log the call outcome |
| Pipeline | `opportunity_suggestion`, `opportunity_no_show` | create the opportunity, or move the deal |
| People | `new_lead`, `merge_suggestion` | look at the lead; merge or dismiss the pair |
| Accounts | `plan_paused_<id>`, `plan_ended_<id>`, `plan_thin_<id>`, `signal` | resume or end the plan, map more people, read the signal (the `accounts` skill) |
| Setup | `hosting_setup`, `knowledge_review_all`, `knowledge_daily` | finish the step in the app |

- Give each group a count and its top 3 rows with title, person or account, and due time. Ask which ones to work; do not walk the whole list unasked.
- A reply row whose `interest` is `out_of_office` is not a reply and nobody is waiting on it: list it apart, and never count it in "replies waiting". Count replies by distinct person.
- Never report opens.
- `data.done` is the member's progress today: mention it in one line when it has rows.
- For the touches waiting across the workspace, not only the member's Today: `account_touches(operation="list", client_id=..., status="awaiting_approval,failed")`. Each item's `approverMemberId` is who must approve it (null when anyone may).

## Step 3 - Work the touches the member flags

Touch row `touch_9001` is touch id `9001`. Read it first: `account_touches(operation="get", client_id=..., touch_id=9001)` (full body, the first draft, the account, `holdReason`, `failureReason`).

| The member wants | Call | Note |
|---|---|---|
| Ken AI to write it | `account_touches(operation="draft", client_id=..., touch_id=9001)` | a planned touch with no body, on email, LinkedIn connect or message, or call. Charged. It lands `awaiting_approval` with a rationale and its sources |
| it shorter, warmer, more specific, or in their voice | `account_touches(operation="rewrite", client_id=..., touch_id=9001, instruction="shorter")` | `shorter`, `warmer`, `more_specific`, `in_my_voice`. Charged. Stores nothing: show the result, then save it on a yes |
| a grade | `account_touches(operation="feedback", client_id=..., touch_id=9001)` | free: a score 0 to 10, a band (`keep`, `rewrite`, `start_over`, `write_first`) and five bars with notes |
| their own edit saved | `account_touches(operation="update", client_id=..., touch_id=9001, changes={"body": "Hi Maya, ..."})` | from `planned`, `drafted`, `awaiting_approval` or `failed`; a body puts it up for approval |

- Show the full text before you save it, and save only what the member accepts.
- Never invent a price, a meeting time, a discount or an offer. When the touch needs one the member has not given, leave it out and ask.
- A subject or body that names an event (funding, a hire, a launch) that no signal or research on the account states fails with 400 `unsourced_claim`. Name only what the account's signals or research say.
- Funding is not a buying event by itself. Do not make a round the reason for the message unless the account's research ties it to a need the member's offer meets.
- A structural change to the message (new angle, new offer, new call to action) is a new draft the member reviews from scratch, not a small edit.
- 402 `INSUFFICIENT_CREDITS`: tell the member to add credits. 503 `context_unavailable`: retry once in a minute. 409 `concurrent_change`: read the touch again and redo the step.

## Step 4 - Snooze, skip and clear

| The member says | Call |
|---|---|
| "push this touch out" | `account_touches(operation="snooze", client_id=..., touch_id=9001, days=3)` (1 to 90 days, 7 by default) |
| "skip it" | `account_touches(operation="skip", client_id=..., touch_id=9001, reason="Maya left Acme")` |
| "undo that" (right after a snooze or skip) | `account_touches(operation="undo", client_id=..., touch_id=9001, action="skip", updated_at="<updatedAt from the skip response>")` |
| "I've done this one", "hide it until Monday", "show it again" (any row) | `today(operation="update", client_id=..., today_item_id="meeting_notes_42", state="done")`, `state="snoozed"` with `snoozed_until="2026-11-02T09:00:00Z"` (at most 90 days out), or `state="open"` |

- A snooze that breaks a Contact limits rule fails with 422 `guardrail_violation`; `nextAllowedAt` is the first due time that passes. Offer that time.
- `today(operation="update")` on a touch row hides the row for the member only; the touch and its due date stay. To move the touch, snooze it.
- Some rows change more than the queue. Say so and wait for a yes before you clear them:
  - `done` on a reply row archives the thread, marks it read and clears its reminder: it leaves To Reply.
  - `done` on a `merge_suggestion` row means "not a duplicate" for the whole workspace, and needs Accounts edit.
  - `done` on an opportunity, new lead, merge suggestion, meeting notes or signal row dismisses it for good.
- Undo works only for the member's own snooze or skip, and only while nothing else changed the touch. Undoing an approval is the person's own button in the app.

## Step 5 - Questions waiting for an answer

`ken_questions(operation="list", client_id=...)` lists the open questions asked to the member, newest first (`status="open,expired"` for more). Read one with `ken_questions(operation="get", client_id=..., question_id="kq_9001")`.

Show each question with its options. There is no answer tool, by design: the member answers in the app or in Slack, with a button or a reply. Do not pick an option for them, and do not tell an agent the answer before `get` shows `status` `answered`.

## Step 6 - Hand the approvals back

- If your client shows MCP Apps, call `approvals_review` with the touch row ids (`ids=["touch_9001", "touch_9002"]`) to show the approval card with Approve, Edit, Snooze and Skip. Only the member's click approves, and you never see the grant behind it.
- Otherwise link Today: `https://app.ken.so/<workspace id>/today`. Campaign batches in `data.batches` are approved there too.

Report back: what waits for the member (by group, with counts), what you changed (each draft, edit, snooze, skip and cleared row), and the questions that wait for their answer.

## What this skill cannot do yet

- Read the one approvals queue across lanes: there is no tool for it. Today's touch rows, `data.batches` and the approval card cover what the member approves.
- Approve, retry a failed send, or answer a question Ken AI asked: those stay with the person, on purpose.
- Act on a reply, a meeting or an account plan from here: use the `reply-handling`, `meeting-prep-and-followup` and `accounts` skills.

## Troubleshooting

| Symptom | Meaning | Do |
|---|---|---|
| `today` missing, or 404 on every call | Today or Accounts is off for the workspace | stop and link Today (step 0) |
| 403 `member_required` | no person behind this connection | the member connects as themselves |
| 404 on one `today_item_id` | the row went (merged, deleted) or its flag is off | read Today again |
| `invalid_transition` | the touch moved past that status | read it with `get` |
| 422 `guardrail_violation` | a Contact limits rule | offer `nextAllowedAt` |
| `already_written` on draft | the touch has a body | rewrite or edit it instead |
| `not_draftable` on draft | that channel cannot be drafted | the member writes it |
| 409 `nothing_to_undo` or `concurrent_change` on undo | something else changed the touch | read it and tell the member |

## No Ken account yet

These steps run on the Ken MCP server, which signs in with a Ken account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
