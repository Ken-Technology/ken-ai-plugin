# Event invite playbook

An event invite asks one person at one account to a dinner, a roundtable or a webinar, and saves the seat with a form on the page. `studio-template-builder.md` (in this folder) holds the bundle format, the kit and every validation rule; this file covers what to build.

## What it is for

The buyer moment: you host something real with a date, and you want specific people from specific accounts in the room. A personal invite beats a registration page. It names their company, says in one or two sentences why they belong there, and takes the RSVP without sending them anywhere else.

Pick it when the event exists and the details are fixed. The details are the same on every page; only the "why you" line is written per account. That makes it the cheapest recipe of the six types: one `bind` and one short `prompt`.

## Sections that work

`event-invite`, top to bottom:

| `data-section` | What it holds | Reads |
|---|---|---|
| `invite` | A "5 seats left" stamp, the logo, "An invitation for {first name} at {account}", the event name, dinner or webinar, date and time, a short letter with the why-you line, a "Save my seat" link down to the form | `data.event_name`, `data.format`, `data.city`, `data.platform`, `data.date_text`, `data.time_text`, `data.why_you`, `data.seats_left` |
| `details` | When, where (venue and city, or "Online, the link comes by email"), the host, who is coming by role | `data.venue`, `data.host`, `data.guests` |
| `agenda` | Time, title and a short note per item | `data.agenda` |
| `rsvp` | Seats left, the form (a waitlist when full), "Can't make this one? Reply and I'll send you the notes" | `ken/form` |

The decline line matters: a person who cannot come still has an easy reply, and a reply is a signal too.

## Required slots

The event details live in slot fallbacks. Edit the `fallback` values in `studio.json` once, and every page renders them. No recipe step writes them.

| Slot | Type and limits | Filled by | Fallback |
|---|---|---|---|
| `event_name` | string, 3 to 80 | fallback only | "Outbound, over dinner" |
| `format` | enum `dinner` or `webinar` | fallback only | "dinner" |
| `date_text` | string, 3 to 60 | fallback only | "Thursday, November 13" |
| `time_text` | string, 3 to 60 | fallback only | "6:30 pm to 9:30 pm" |
| `host` | string, 2 to 80 | fallback only | Liquid: the sender's name, "Our team" as the default |
| `seats_left` | integer | fallback only | 5 |
| `agenda` | array, 1 to 8 items: `time` (max 20), `title` (2 to 80), `note` (max 160) | fallback only | four items, drinks to last drinks |
| `why_you` | string, 20 to 320 | `why_you` (prompt) | Liquid: a general line with the account name |

Optional, with fallbacks: `city` and `venue` (dinner), `platform` (webinar), `guests` (max 200, roles only, never names). Working slot: `why_now`.

There is no `fallback.liquid`, and that is the right call here: every required slot has a fallback, so the invite is complete the moment the email goes out, even before the fill runs.

Dates are strings written the way you would say them. The slot schema has no date type.

To change a detail on pages that are already live (a new venue, fewer seats), edit the fallback, push, then publish with `studio_templates(operation="publish", template_id=41, update_live="all")`. Live pages stay on their version otherwise. `seats_left` does not count down when people RSVP: lower it by hand as seats go, and remember the workspace gets 50 publishes a day.

## The recipe that fills them

| id | kind | What it does | Writes |
|---|---|---|---|
| `why_now` | bind | `account.dossier.why_now` | `why_now` |
| `why_you` | prompt | One or two sentences on why someone from this company belongs in the room | `why_you` |

The prompt step from the starter, shortened:

```json
{ "id": "why_you", "kind": "prompt", "model": "cheap",
  "inputs": ["account.name", "account.industry", "account.size_band", "account.dossier.summary", "data.why_now"],
  "to": ["data.why_you"],
  "prompt": "... The event (template owners: keep this line in step with the event details in this template): a small dinner or a short webinar for sales and revenue leaders at B2B companies ... why_you: one or two sentences, at most 300 characters ... Never use a first name; the page adds the greeting. No flattery ... Never name other guests or say who else is coming. ..." }
```

Rewrite the line that starts with "The event" whenever you change the event, or every page explains why they belong at a different event.

Credits, in plain words: the `bind` is free. The prompt is short and costs its tokens at 2x model cost when Studio runs it (`executor="ken"`), nothing when your agent fills the page. The page costs 1 credit when its first link is published. Form submissions cost nothing.

## The CTA: the form

```liquid
{% render 'ken/form', id: 'rsvp', fields: 'name,email,company,dietary', submit: 'Save my seat' %}
```

Webinars swap `dietary` for `title`. How the form works:

- `fields` is a comma list of names. A `*` after a name makes it required: `'name*, email*, company'`. Without `fields` the form asks for `name*, email*`. At most 12 fields.
- The kit picks the input type from the name: `email`, `phone`/`tel`/`mobile` (tel), `website`/`url`/`site` (url), `message`/`note`/`comments`/`question` (textarea), anything else text. For a select, checkbox, date or number field, pass `fields` an array of `{name, label, type, required, options}`, for example from an optional slot whose static fallback holds that array.
- The form posts only to the page's own host. A submission becomes a signal on the account and a Today item for the owner, and updates the person when it comes through a person's link.
- The form posts only on a real link. A Studio preview has no link, so it shows the same fields with the submit disabled and a "Preview: not saved" note. In a local preview, stub it and leave room in the layout.
- At `seats_left` 0 the starter's copy turns the same form into a waitlist ("If a seat opens up, it goes to you first").

What a form may never ask for: passwords, card numbers, security codes, bank account or routing numbers, social security, tax, national ID, passport or driver's license numbers. The kit drops those fields whatever the template asks, the submit handler drops any value that looks like a card number, and validation rejects them in your own HTML (`csp-input-type`).

## Common failure modes

- **Your own `<form>`.** A form whose `action` points anywhere but the page's host fails `csp-form-action`. Use `ken/form`; it posts to the right place and records the signal.
- **A sensitive field.** `<input type="password">`, `autocomplete="cc-number"` or a field named `card_number` fails `csp-input-type`. In `fields`, the same names silently disappear from the form.
- **"An invitation for null".** `person` is null on the shared link. The starter branches: `{% if person.first_name %}An invitation for ...{% else %}An invitation for the team{% endif %}`.
- **A date slot.** `"type": "date"` fails `slot-schema-invalid`. Use a string and write the date out.
- **A fallback outside its enum.** `"fallback": "Dinner"` on the lowercase `format` enum fails `slot-fallback-invalid`.
- **The note names other guests.** Telling one prospect who else is coming leaks your list. The prompt forbids it; keep `guests` to roles ("heads of sales, RevOps leads").
- **A flattering or generic note.** "Love what you're building" reads like a mass invite. The prompt bans flattery and asks for one fact from the dossier tied to the topic of the room. If the dossier is empty, the fallback line is better than a vague one.
- **Stale seat count.** The stamp says 5 seats on the day the table filled. Update the fallback and publish with `update_live` as seats go.

## Starter

`studio_templates(operation="create", starter_slug="event-invite")`

Edit the fallbacks in `studio.json` (event name, format, date, time, city or platform, venue, host, guests, seats, agenda), rewrite "The event" line in the `why_you` prompt, validate, publish.
