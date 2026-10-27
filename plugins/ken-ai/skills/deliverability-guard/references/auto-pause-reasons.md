# Auto-pause reasons

What each `reason` from `analytics(operation="auto-pauses-list")` means, and what to check next. New reasons can appear: say an unknown one in plain words from its `scope`, `metric`, `rate` and `threshold`.

| Reason | Scope | What it means | Check next |
|---|---|---|---|
| `mailbox_hard_bounce_rate` | inbox | The inbox's hard bounces passed the threshold | That inbox's rows in deliverability by inbox, then the campaigns it sends for: a list problem shows in one campaign, an inbox problem in all of them |
| `campaign_hard_bounce_rate` | campaign | The campaign's hard bounces passed the threshold | The campaign's `bounceBreakdown`. Mostly `invalidRecipient` is the list: clean it before resuming |
| `domain_complaint_rate` | domain | Too many spam complaints on the domain | Domain health, and the copy and targeting of the campaigns on that domain |
| `domain_gmail_spam_rate` | domain | Gmail reports too much of the domain's mail as spam | Domain health and a placement test |
| `domain_placement_spam` | domain | A placement test found the domain's mail in spam | The test result, then domain health and blocklists |
| `reply_ingest_dead` | inbox | Replies stopped arriving from the inbox, so its replies would be missed | The inbox's connection: it may need to be reconnected |
| `uri_blocklist_listed` | domain | A link host in the copy is on a blocklist | The links in the campaign's copy, and the link host |
| `domain_dns_unresolvable` | domain | The domain's DNS does not resolve | `domains(operation="get-dns")` and the nameservers at the registrar |
| `tenant_ban` | inbox | The mailbox's Microsoft 365 tenant refuses to send | The mailbox host. Other inboxes on the same tenant will fail too |
| `mailbox_sender_ndr_rate` | inbox | Too many of the inbox's sends came back as non-delivery reports | The inbox's settings and its sending host |
| `workspace_breaker` | workspace | A send hold on the whole workspace | Only support releases it. Tell the user to contact support |
| `send_failures` | inbox or campaign | Repeated send failures | The inbox's connection and the failure message on its sends |

Rules for reading the list:

- `isActive` true means it still blocks. Inactive rows are history: use them to spot a pattern, such as the same inbox paused every week.
- A domain pause blocks that domain's inboxes, not the campaigns. The campaigns keep sending from their other inboxes.
- A campaign pause stays until someone resumes it. Resuming needs the cause fixed first, and on a client's campaign a yes that names the client.
- `rate` and `threshold` are fractions. Say them as percentages with the counts when you have them.
