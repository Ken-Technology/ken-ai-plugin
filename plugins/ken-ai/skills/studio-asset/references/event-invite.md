# Fill guide: `event-invite`, Dinner or webinar invite

Starter `event-invite` 1.0.2. Type `event`, format `page`. Page slug `invite`: `https://{host}/quarry-health/invite-for-elena`. Sections: `invite`, `details`, `agenda`, `rsvp`. The ask is a form, "Save my seat"; each submission becomes a signal on the account.

A personal invite to a dinner or a webinar. The event details are the same for every account and live in the template as slot fallbacks. The only thing written per account is a short line on why this company belongs in the room.

Read the template's own `studio.json` first (`studio_templates(operation="pull", template_id=41)`): the event details are its fallbacks, and its file wins over this guide. You recognize this starter by the slug `invite` and the steps `why_now`, `why_you`.

## Before you run it

- **The event details are set and true.** Pull the template and read the `fallback` of each detail slot. The starter ships example values ("Outbound, over dinner", "Thursday, November 13", Austin, Juniper Table, 5 seats). A template that still holds them would invite people to an event that does not exist. Every date, time, venue, city, platform and seat count comes from the user, never from you. Changing them is template work: the `studio-template` skill (edit the fallbacks, push, publish).
- **The `why_you` prompt matches the event.** Its line that starts with "The event" describes the event to the writer; it must match the details.
- **Research on the account** sharpens the personal line: `account.dossier.why_now` binds into `why_now`, and the prompt reads `account.dossier.summary`. Without them the line stays general.
- No fallback page: every required slot has its own fallback, so the invite always renders.

## What each field needs

| Slot | Required | Limits | Filled by | From |
|---|---|---|---|---|
| `event_name` | yes | 3 to 80 | fallback only | the event's name |
| `format` | yes | `dinner` or `webinar` | fallback only | webinars hide the venue and dietary field and ask for a job title |
| `date_text`, `time_text` | yes | 3 to 60 each | fallback only | written the way you would say them, "Thursday, November 13" |
| `city`, `venue` | no | 60, 120 | fallback only | dinner only |
| `platform` | no | 60 | fallback only | webinar only, such as "Zoom" |
| `host` | yes | 2 to 80 | fallback only | defaults to the sender's name |
| `guests` | no | 200 | fallback only | who is coming, by role, never by name |
| `seats_left` | yes | a whole number | fallback only | shown on the stamp and above the form; at 0 the form becomes a waitlist. Keep it true |
| `agenda` | yes | 1 to 8 `{time (20), title (2 to 80), note (160)}` | fallback only | the evening or session in order |
| `why_now` | no | 1,000 | `why_now` (bind) | the dossier's why now |
| `why_you` | yes | 20 to 320 | `why_you` (prompt) | one or two sentences, from facts only, on why this company should be there. Falls back to a general line with the account name |

## How it fills

1. `why_now` binds the dossier's why now.
2. `why_you` (prompt) writes the personal line from the account's industry, size band, dossier summary and why now.

No grade step. The fill is one short model call per account.

## Your own model (executor `"agent"`)

`prepare` runs the bind and gives you `why_you`. Write one or two plain sentences from the inputs only (no invented news, numbers or names), and submit with no grade results. `references/studio-fill.md` has the loop.

## Check before the first link

- The event details on the page are the user's real event, not the starter's examples.
- `why_you` is `filled` and says something true about this company. On its fallback the invite still works, but say so.
- `seats_left` is current. Tell the user it is a fixed number in the template: it does not count down as people RSVP.

## When it goes wrong

| You see | Why | Do |
|---|---|---|
| Austin, Juniper Table, November 13 | the starter's example details were never replaced | stop; get the real details from the user and update the template first |
| A generic `why_you` | no dossier on the account | refresh the research (ask first, it is charged), then refill |
| The form renders nothing | the page has no published link yet (previews never show the form) | create the link; the form appears on the live page |
