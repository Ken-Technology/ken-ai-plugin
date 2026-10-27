# Event outbound: reading a LinkedIn event's attendees

A LinkedIn event read pages through the seat's own LinkedIn people search, filtered by the event. It happens only through one of the caller's own connected seats, only after the person accepts the warning, and the rows it finds are a preview: nothing lands on the event until you add the rows the person keeps.

## The warning

`outbound_events(operation="linkedin-attendees", event_id=...)` returns the text. Show it to the person word for word before every read. In short:

- Automated reads break LinkedIn's User Agreement (section 8.2) and can get the seat restricted.
- The read uses the seat's search budget.
- The seat must already be attending the event. Nobody clicks Attend for the person.

Pass `accept_warning=True` only after the person accepted it in this conversation.

## Limits

| Limit | Value |
|---|---|
| Attendees per read | 100 |
| Reads of one event | one every 24 hours |
| Attendees per event, in all | 300 |
| Event reads per seat per UTC day | 2 |
| Attendees per seat per UTC day | 200 |
| Wait between pages | at least 30 seconds |
| Pause after a rate limit or restriction sign | 72 hours on that seat |

The first rate limit or restriction sign stops the read and pauses event reads on that seat for 72 hours.

## Reading the result

`linkedin-attendees` returns:

- `enabled`: false while LinkedIn event reads are switched off. No read can start.
- `event`: `attendeesCounted`, `attendeesLeft`, `nextReadAt`.
- `seats`: each with `canRead`, `refusal`, `message`, `availableAt`, `readsToday`, `attendeesToday`, `pausedUntil`.
- `reads`: the latest 5 reads, newest first, each with `status` (`queued`, `reading`, `done`, `failed`), `stopReason`, `pagesRead`, `attendeeCount` and `rows`.

Poll it until the read is `done` or `failed`. Review the rows with the person (the LinkedIn headline is the title), then add the ones they keep with `attendees-bulk-create`, `source="url"` and the event link as `source_url`.

## Refusals

| Code | Meaning | Do |
|---|---|---|
| `switched_off` (409) | LinkedIn event reads are off | tell the person; build the list from the event's pages |
| `event_cooldown` | this event was read in the last 24 hours | try after `nextReadAt` |
| `event_limit` | 300 attendees already read for this event | stop: the list is as full as reads allow |
| `seat_paused` | the seat hit a rate limit or a restriction sign | wait until `pausedUntil`; never switch to another person's seat |
| `seat_reads_today`, `seat_limit` | the seat's daily reads or attendees are used | try tomorrow (UTC) |
| `invalid_linkedin_event_url` | not a LinkedIn event link | ask for the `linkedin.com/events/...` link |
| `linkedin_account_unavailable` | another member's seat, or one that cannot read | use one of the caller's own seats with `canRead` true |
| `warning_not_accepted` | `accept_warning` was not true | show the warning and ask again |
| `no_attendees` | LinkedIn returned nobody | the seat has not clicked Attend on the event; no retry |
