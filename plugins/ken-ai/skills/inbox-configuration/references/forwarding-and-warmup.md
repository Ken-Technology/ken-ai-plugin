# Reply forwarding and warmup

## Reply forwarding

Forwards replies from a sending mailbox to the client's own external inbox. Off by default when a mailbox is provisioned.

- One inbox: `inboxes(operation="forwarding-set", inbox_id=..., forwarding_type=2, destination="founder@acme.com")`
- Many inboxes: `inboxes(operation="forwarding-set_bulk", inbox_ids=[...], forwarding_type=2, destination=...)`
- Turn it off: pass no `forwarding_type`

`forwarding_type=2` with an external `destination` is the only accepted mode. Platform-hosted forwarding (`forwarding_type=1`) and destinations on platform-hosted addresses or platform-managed sending domains are rejected. Google, Outlook, and Azure mailboxes all accept it. The provider queues the change, so it can take a few minutes to apply.

This is reply forwarding, not the domain website redirect. The redirect is a domain setting (`domains` update with `redirect_url_404`), handled in `domain-selection`.

## Warmup

Every new managed mailbox is enrolled in warmup automatically. Warmup sends share the mailbox's provider budget with cold sends, so do not set a cold limit that leaves no room for it.

Read one inbox: `inboxes(operation="get-warmup", inbox_id=...)`. Act on `status`:

| `status` | What to do |
|----------|------------|
| `in_progress` | Already warming. Nothing to do |
| `pending` | Bought and waiting to activate. Leave it alone |
| `paused` | Resume only if the user asks: `inboxes(operation="update-warmup", inbox_id=..., enabled=true)` |
| `failed` | The provider cannot warm it. Re-enabling does not fix it. Tell the user it needs the support team |
| `not_started` | No warmup subscription. Enrolling is a staff step, not available from this skill |
| `completed`, `maintenance`, `degraded` | An older warmup record, shown when no warmup provider tracks the inbox now. Nothing to resume from this skill; if the user wants it warming, it needs the support team |

Pause with `enabled=false`. Pause and resume need the admin role and a yes from the user. `readiness.isHeld` true means the cold-send gate is still holding the inbox (for example `too_young` while it warms); wait it out rather than raising limits.
