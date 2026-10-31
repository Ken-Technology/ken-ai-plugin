# Knowledge Review

Ken, members and agents propose changes to Knowledge as suggestions. A person with edit rights accepts or dismisses each one in Review. Every change, proposed or live, lands in the change log, and most can be undone. All of these operations need the `knowledge` flag; the links to Review and the change log are in the knowledge-setup body.

## The rule: a person decides

You summarize and recommend. A person decides.

- Accept or dismiss only after an explicit yes for those suggestions. A yes to "the three pricing ones" covers those three, not the rest of the queue.
- Say which ones you would accept and why, and which look wrong (a fact without a source, a claim that contradicts a newer one, a guess about a person).
- Change the review mode, the spot-check rate or the auto-approve pause only on a workspace admin's yes. The operations refuse anyone else with 403.

## What waits in Review

The workspace's review mode decides what goes live by itself. Read it with `knowledge_review(operation="settings-get")`: `reviewMode`, `spotCheckRate` (0 to 1), `autoApprovePaused` with `autoApprovePausedUntil` and `autoApprovePausedReason`, `retentionMonths` and `canEdit`.

| Mode | What waits for a person |
|---|---|
| `review_all` | Everything. |
| `exceptions` (the default) | Skills and instructions, pricing and commercial terms, and company-wide facts and files. The rest goes live once Kenso's checks pass, with undo. |
| `auto` | Skills and instructions, and pricing. Company-wide changes go live too, except while the auto-approve pause holds. A share of live changes (the spot-check rate) comes back to Review as spot checks. |

Kenso pauses auto-approve by itself when people reject too many spot checks. Spot checks a person dismisses in Review count toward that pause; a dismissal through these tools is an agent's decision and does not.

To change the mode or rate (admins): `knowledge_review(operation="settings-update", review_mode="exceptions")`, or `spot_check_rate=0.1`. To lift the pause after an admin agreed: `knowledge_review(operation="settings-update", auto_approve_paused=false)`. Only `false` is accepted: Kenso sets the pause itself.

## Read the queue

1. Count: `knowledge_review(operation="suggestion-counts")` returns `pendingCount` (a floor when `isCapped` is true).
2. List: `knowledge_review(operation="suggestion-list", status="pending", limit=50)`. Filters: `kind` (`change`, `addition`, `new_file`, `fact`), `file_id`, `folder_id`, `account_id`, `source_type` with `source_ref` (one source, as a Review chip names it), `is_spot_check`. Pass `pagination.nextCursor` back unchanged for the next page.
3. One suggestion in full: `knowledge_review(operation="suggestion-get", suggestion_id=...)`, with its old and new text, file name, facts, source and author.

Summarize per file and per source, oldest first: how many, what each says in one line, where it came from, and your recommendation. Never paste whole bodies back.

## Decide

- Accept one: `knowledge_review(operation="suggestion-accept", suggestion_id=...)`. It writes a file version labelled with the person and the client. 409 `invalid_state` means it was already decided, or (code `superseded`) its file changed so the text no longer applies: read the file again and propose the change fresh.
- Dismiss one: `knowledge_review(operation="suggestion-dismiss", suggestion_id=..., reason="Pricing changed in October")`. The reason goes to the change log.
- Accept everything from one file or one source, after the person saw the summary and said yes to all of it: `knowledge_review(operation="suggestion-bulk-accept", file_id=...)`, or `source_type=` with `source_ref=`, not both. Up to 200 per call, oldest first, each on its own. Call again while `hasMore` is true and report `accepted`, `superseded` and `failed`.
- A 403 on a decision means the person cannot edit that file or folder: ask a workspace admin. A new suggestion would not help.

## Propose a change yourself

When you may not change a file (`canEdit` is false, or a write answered 403 forbidden), propose it:

- A change: `knowledge(operation="suggestion-create", kind="change", file_id=..., base_version=..., anchor_heading="Pricing", old_text="...", new_text="...", reason="...")`.
- An addition: `kind="addition"` with `file_id` and `new_text`.
- A new file: `kind="new_file"` with `folder_id`, `new_file_name` and `new_text`.

Tell the person it is waiting in Review for someone with edit rights.

## The change log and undo

- List: `knowledge_review(operation="change-list", limit=50)`, filtered by `file_id`, `account_id` or `kind` (`fact_added`, `file_edited`, `file_created`, `suggestion_accepted`, `suggestion_dismissed`, `restored`, `undone`, `prompt_created`, `prompt_edited`, `prompt_deleted`, `prompt_restored`). Each change has its summary, file name, actor and `undoable`.
- One change: `knowledge_review(operation="change-get", change_id=...)`.
- Undo, on a yes: `knowledge_review(operation="change-undo", change_id=...)`. 409 `invalid_state` with code `later_saves` means the file was saved again since: restore an older version from the file's History instead (`knowledge(operation="versions-list", file_id=...)`, then `knowledge(operation="versions-restore", file_id=..., version=..., base_version=...)`). `not_undoable` and `already_undone` mean there is nothing to undo.
- For a Knowledge prompt, only a delete can be undone, and the undo restores it.

## Export

`knowledge_review(operation="export-create")` (or `folder_id=` for one folder) starts a zip of markdown. `knowledge_library(operation="export-content", export_id=<its id>)` downloads it, for the member who asked only, for 24 hours: `status` `running` means read it again in a minute, and a built zip up to 2 MiB comes back as `contentBase64`. A bigger one returns a note instead: export one folder at a time, or send the person to Knowledge in the app.
