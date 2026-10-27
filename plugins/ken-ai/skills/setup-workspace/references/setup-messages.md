# Setup message shapes

Short, plain-language chat messages for the guidance steps of `setup-workspace`.
Adapt the wording to the conversation. No jargon, no hype, no em dashes.

This file is served without the workspace's branding, so it names no product
and no URL. Each `<... link>` below is the matching link from `SKILL.md`, which
is branded for this workspace: copy it from there exactly, never from memory.

## Blocklist (Step 5)

> Before your first campaign, add the people you should never cold email -
> current clients, partners, and anyone who asked not to be contacted - to your
> blocklist: <blocklist link>. You can upload a file or add domains and
> emails there. Every lead is checked against it before sending. I won't take the list here; it stays in the platform.

Rules:

- Never ask the user to paste a client list, CSV, or personal data into chat.
- If they paste some anyway, do not store it. Point them to the blocklist page.

## Integrations (Step 5)

> When you're ready, you can connect your stack at <integrations link> -
> your CRM (<CRM link>) so replies and meetings sync, and your calendar
> (<calendar link>) for booking links. This is optional; campaigns work without it.

Rules:

- Optional and low pressure. Do not claim anything is connected.
- OAuth happens in the browser. Never ask for passwords, API keys, or tokens.

## Sending infrastructure (Step 6)

Free plan:

> Cold email goes out from separate sending domains with a few inboxes each,
> so your main domain stays safe. Those unlock on a paid plan - upgrade anytime
> at <billing link> and then set them up on the domains and inboxes page.

Paid plan:

> Cold email goes out from separate sending domains with a few inboxes on
> each. Each Google or Microsoft inbox sends about 25 emails a day, and new
> inboxes warm up before full volume. You can buy new domains, connect ones
> you already own, and see your inboxes on the domains and inboxes page:
> <domains and inboxes link>.

If `sendingInfrastructure.status` is `ready`, say sending is already set up and
link the domains and inboxes page for review. If `pending`, say it is still being set up
and relay `pendingReason` when present.

## Hand-off (Step 7)

> Done: company profile, logo, 2 invites. Skipped: none.
> You're ready to build your first campaign. Want to start now?

## Error envelope

Every failed call returns the normalized envelope:

```json
{
  "success": false,
  "error": {
    "code": "...",
    "category": "plan_limit|billing|permission|validation|not_found|transient|unknown",
    "message": "...",
    "metric": null,
    "used": null,
    "limit": null,
    "remaining": null,
    "planType": null,
    "recovery": {"summary": "...", "tool": "..."},
    "status_code": null
  }
}
```

Relay `message` and `recovery.summary` in plain words. Report `remaining` only
when the envelope carries it.
