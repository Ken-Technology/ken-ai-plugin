# Reply forwarding and warmup

## Reply forwarding

Forwards replies from a sending mailbox to the client's own external inbox. Off by default when a mailbox is provisioned, unless the workspace has saved a reply forwarding default.

- One inbox: `inboxes(operation="update", inbox_id=..., changes={"forwarding_destination": "founder@acme.com"})`
- Many inboxes: `inboxes(operation="bulk-update", ids=[...], changes={"forwarding_destination": ...})`
- Turn it off: `changes={"forwarding_destination": null}`

Only an external destination is accepted: a destination on a platform-hosted address or on one of the workspace's managed sending domains is rejected. Google, Outlook, and Azure mailboxes all accept it. The provider queues the change, so it can take a few minutes to apply.

This is reply forwarding, not the domain website redirect. The redirect is a domain setting (`domains` update with `redirect_url_404`), handled in `domain-selection`.

## Warmup

Warmup is optional and off by default: new mailboxes are not enrolled. They rely on the send ramp instead: a new Google or Outlook mailbox starts at 5 emails a day and adds 2 per sending day, up to 30. Do not recommend warmup, and never suggest turning it on. A mailbox that is already warming keeps warming: leave it alone unless the user asks. Warmup sends share the mailbox's provider budget with cold sends, so on a mailbox with warmup on, do not set a cold limit that leaves no room for it.

When the user asks to turn warmup on (or resume it), first give them this warning in one or two sentences, and act only after they confirm:

> There is no independent evidence that warmup networks improve inbox placement or replies with real prospects: every positive number comes from a warmup vendor. Validity's Heatwave blocklist, used or evaluated by Proofpoint, Spamhaus, Comcast and SURBL, lists domains that trade automated warmup mail, and its listings never expire; Google and Microsoft document a slow ramp of real sending instead, which is what the send ramp does.

Read one inbox: `inboxes(operation="get-warmup", inbox_id=...)`. Act on `status`:

| `status` | What to do |
|----------|------------|
| `in_progress` | Already warming. Nothing to do |
| `pending` | Bought or turned on, and waiting to activate. Leave it alone |
| `paused` | Leave it paused. Resume only if the user asks, after the warning above and their yes: `inboxes(operation="update-warmup", inbox_id=..., enabled=true)` |
| `failed` | The provider cannot warm it. Re-enabling does not fix it. If the user wants it warming, it needs the support team |
| `not_started` | Not enrolled, the default for a new inbox. Leave it off. Only if the user asks, after the warning above and their yes: `inboxes(operation="update-warmup", inbox_id=..., enabled=true)`. On a Google inbox the workspace ordered or claimed in the app, this records the request (`pending`) and enrollment follows within about 10 minutes; any other inbox with no warmup subscription (Outlook, or one the workspace connected itself) needs the support team |
| `completed`, `maintenance`, `degraded` | An older warmup record, shown when no warmup provider tracks the inbox now. Nothing to resume from this skill; if the user asks for warmup, give the warning above, and on their yes it needs the support team |

Pause with `enabled=false`. Turning warmup on or off needs Delivery edit access (owners, admins and editors by default) and a yes from the user. `readiness` is the warmup evidence for the inbox, not a condition for sending: new payers' cold sends are no longer held for warmup, and a new inbox sends on the send ramp whether or not it warms. If `readiness.isHeld` is true, say so, and do not raise limits or turn warmup on to get around it.
