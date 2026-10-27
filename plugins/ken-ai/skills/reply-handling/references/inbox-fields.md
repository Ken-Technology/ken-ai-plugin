# Inbox fields, values and errors

Reference for the reply-handling skill. Ids: threads are `thr_`, messages `msg_`, attachments `att_`.

## Tabs

`threads(operation="list", tab=...)` and `threads(operation="counts", tab=...)` take the tab the app shows:

| Tab | Holds |
|---|---|
| `to_reply` | human replies waiting for an answer, not archived |
| `other` | the rest of the inbox, not archived |
| `automated` | auto-replies, out-of-office and delivery notices |
| `not_interested` | replies filed as not interested |
| `saved` | threads a person saved |
| `done` | archived threads |
| `sent` | threads you started or answered |
| `all` | the whole inbox |

`counts` also returns `toReplyCount` (the To Reply badge), `unreadCount`, `campaigns` (threads per campaign) and `inboxChangedAt`, which moves when a reply arrives or the classifier files one: poll it and list again when it changes.

## Interest

`interested`, `not_interested`, `negative`, `automated`, `unclassified`, `unsubscribe`, `objection`, `wrong_contact`, `out_of_office`, `referral`.

- `threads(operation="list", interest=...)` filters by it.
- `threads(operation="update", thread_id="thr_...", changes={"interest": "interested"})` changes it. LinkedIn threads refuse `automated`.
- A label moves the thread between tabs and into or out of positive-reply counts in reports, so tell the user what you changed.
- A positive reply is a distinct contact filed `interested`. If replies come in and nothing is ever filed `interested`, the classifier may not be running for this workspace: say that, and do not report a 0% positive rate.

## Thread fields worth reading

- `direction`: `inbound` (the contact wrote last) or `outbound` (you did).
- `campaignId`, `contactId`, `inboxId` (the inbox the contact wrote to), `accountId` and `accountName` (when the contact is on a target account).
- `tags`, `subject`, `preview`.
- On `threads(operation="get", ...)`: `scheduledMessages` (replies not sent yet: `scheduled`, `sending` or `awaiting_approval`), and `referral` on a recruiting reply filed `referral`.
- On `threads(operation="list-messages", ...)`: each message, oldest first. Inbound email messages carry `extractedText` (the contact's words only). Outbound messages carry open counts: never report them. `attachments` list files with an `att_` id you can read with `threads(operation="get-content", attachment_id="att_...")`.

## Thread changes

`threads(operation="update", ...)` and `threads(operation="bulk-update", ...)` take `changes` with any of `is_read`, `is_archived`, `is_saved`, `interest`, `reminder_at` (ISO 8601 time). `bulk-update` takes up to 1,000 ids. `threads(operation="mark-all-read")` marks the whole workspace read with no undo: use it only when the user asks.

## Drafts

- `threads(operation="get-draft", thread_id="thr_...")`: 404 when there is none.
- `threads(operation="replace-draft", thread_id="thr_...", body="...")`: saves your draft. A person's draft is never replaced: the result then has `kept_person_draft: true`. An empty body deletes your draft.
- `threads(operation="delete-draft", thread_id="thr_...")` deletes any draft, a person's too. Use it only when the user asks to discard the draft.
- `threads(operation="suggest", thread_id="thr_...", action="rewrite", draft="...")`: actions are `rewrite`, `simplify`, `shorten`, `lengthen`, `tone`, `custom`, `continue` and `draft_from_chip`. `tone` and `custom` read `tone_or_instruction`. It saves and sends nothing. Full-access members only.

## Sending

`threads(operation="create-message", thread_id="thr_...", body="...", sender_email_id=88, idempotency_key="...")`

- Email needs `sender_email_id`. LinkedIn sends plain text through the conversation's seat and needs none.
- The reply is recorded as the agent's. It is recorded as sent only after the provider accepts it.
- `idempotency_key`: up to 200 characters, one per draft. The same key with another thread, inbox or body is 409 `idempotency_key_reused`.
- `archive_after_send`: archive the thread once the reply sends.
- `confirm_suppressed`: only when a person asked for this exact reply to a contact who opted out or is blocked.

| Error | Meaning | Do |
|---|---|---|
| 202 `held_for_client_approval` | the workspace requires the client to approve replies | report it as waiting for the client |
| 403 `forbidden` | an agent cannot reply from a member's own mailbox | the person sends it from the inbox |
| 409 `invalid_state` with `confirmSuppressed` | the contact opted out, is blocklisted or unsubscribed | do not send; tell the user |
| 409 `invalid_state` with `inbox_paused` | a member paused the inbox | another inbox, or wait until they resume it |
| 409 `invalid_state` with `inbox_send_blocked` | the inbox is blocked from sending until `nextAllowedAt` | another inbox, or wait |
| 409 `in_progress` | the same key is still being queued | wait until `nextAllowedAt`, then retry with the same key |
| 409 `outcome_unknown` | it is unclear whether the reply queued | read the thread; never resend |
| 409 `reply_not_sent` | the scheduled reply failed or was cancelled | send again with a new key, on the person's word |
| 404 `not_found` | wrong id, or the thread is not in this workspace | check the id; never retry blind |

A queued reply waits out a short undo delay. `threads(operation="cancel", scheduled_message_id=...)` stops one that has not started sending; one already sending, sent, cancelled or failed is 409 `invalid_state`.

## Reply templates

- `replies(operation="reply-templates-list")` and `replies(operation="reply-templates-get", reply_template_id=12)`: `name`, `description`, `body`, `authorSource` (`user` or `agent`).
- Bodies keep raw tokens such as `{firstName}`. The app fills them when a person inserts a template. You fill them yourself.
- An agent cannot edit or delete a template a person wrote.

## Reply agent settings

`replies(operation="autonomous-reply-settings-get")` returns `defaultEnabled`, `linkedInEnabled`, `mode` (`draft` or `autonomous`) and `extraInstructions` (up to 4,000 characters). `autonomous` sends AI replies without a person.
