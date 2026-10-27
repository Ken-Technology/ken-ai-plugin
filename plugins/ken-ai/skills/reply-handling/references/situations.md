# Reply situations: what to write

One section per situation from Step 2 of the reply-handling skill. Each says what the contact needs, what the draft does, and what it must never do. The examples are shapes, not text to paste: write in the sender's voice, from the thread, the reply templates and the workspace's Knowledge.

Every draft:

- Answers every question the contact asked, in their order.
- Ends with one next step the contact can say yes to.
- Stays short: 2 to 5 sentences for most replies. No "I hope this finds you well", no "just circling back", no "per my last email".
- Quotes no price, time, offer, result, case study or number that is not in a template, in Knowledge or in a tool result. A gap is written as `[what is missing - confirm]` and named to the person.
- Mentions no attachment. Put a link or the content in the body, or tell the person to attach the file before sending.
- Uses no em dashes and keeps a blank line between paragraphs.

## Wants to talk

The contact said yes, or asked for a call.

- Thank them in a few words, confirm what they want to talk about in their terms, and offer two or three real times or the booking link (Step 4 of the skill).
- Answer anything else they asked first.
- Set no agenda the contact did not ask for.

Shape:

> Hi Maya,
>
> Great - happy to walk you through how the EMEA team would use it.
>
> Would Tuesday at 10:00 or Wednesday at 15:00 (London) work? Or pick any time here: <booking link>.

## Asks the price

The most common reply that goes unanswered.

- Answer with the price from a reply template or Knowledge, exactly as written there, with what it includes.
- If the price depends on scope, say what it depends on and offer a short call to size it.
- If you have no price source, write `[price - confirm]` and tell the person. Never estimate, round or "start from".
- Never defer the answer to "another call" when they asked in writing.

## Asks for more information

- Send the specific thing they asked for: a link from Knowledge, a two-line answer, or a short list.
- If they asked for a deck or a file you do not have as a link, leave `[link to <file> - confirm]` for the person.
- Close with a light next step: "Happy to show it live if useful: <booking link>."

## Not now, later

- Thank them, ask one question if the reason is unclear ("Is it timing or budget?"), and offer to come back at the time they named.
- Set a reminder on the thread at that time (Step 6 of the skill), so the follow-up happens.
- If they gave no time, ask for one. Do not guess a quarter.

## Points to someone else

Filed as `referral` or `wrong_contact`.

- Thank them and ask for the introduction, or confirm you may write to the person they named.
- Read the name, email and LinkedIn URL of the person they named from the message itself. On recruiting replies filed `referral`, `threads(operation="get", ...)` also returns them as `referral`. Show them to the user.
- Writing to the new person starts a new thread, which only staff can do from here. Otherwise draft the email for the person to send from their own mail, and say so.

## Pushes back

Filed as `objection` or `negative`.

- Answer the objection once, briefly, with a fact from Knowledge or a template. Do not argue and do not repeat the pitch.
- For "we already use X": one line on the difference that matters to them, then an easy out.
- For anger or a complaint: apologise once, confirm they will not hear from you again if they ask for that, and tell the user. Do not offer anything.

## No thanks

- Usually no reply is needed. If they asked a question, answer it in one line.
- Archive the thread when the user wants: `threads(operation="update", thread_id="thr_...", changes={"is_archived": True})`.

## Opted out

Filed as `unsubscribe`. Never reply. The contact is suppressed, and a reply is refused with `confirmSuppressed` unless a person asks for that one reply.

## Out-of-office and automated

Not replies: no draft, not counted. If the message names a return date, a new contact or a forwarding address, list it for the user so they can decide what to do.
