# News outreach: a campaign from a market story

A market story is a news event in the workspace's market: a security incident, trouble at a vendor, a new regulation, big industry news, or a trend several outlets keep covering. A campaign built on one works only while the story is fresh, and only when the email is about what the story changes for the reader, not about the story itself.

Use this reference at the plan, strategy and copy stages of a campaign that starts from a story. Everything else in `create-campaign` still applies, and the build still stops at a draft: a person launches it.

## When to use a story

Use a story only when all of these hold:

- **It is fresh.** A story is good for about five days after it broke. If the campaign cannot go out this week, say the hook will be stale and offer to plan it without the news.
- **It changes something for the reader:** a new obligation, a new risk, a vendor they rely on in trouble, a reason to act now that did not exist last week.
- **The workspace can help with exactly that change.** If linking the story to the offer takes more than one sentence, the story is a stretch: leave it out.
- **An outlet reported it,** and you have the outlet's name and the date.

Never use a story about deaths, disasters, violence, politics or elections, even when it touches the market. A funding round or a layoff is not a story here: account signals cover those per company.

## The two angle types

| Angle type | The story is about | Who gets the email | What connects the story to the offer |
|---|---|---|---|
| `direct` | The market the workspace sells to: a regulation, an industry event, a trend | People in that market whose work the story changes | What the story asks of them now, and how the offer makes it easier |
| `vendor` | A company whose customers the workspace can help: an outage, a breach, a price change, a product shut down | People at that vendor's customers, and optionally at customers of similar vendors | What the vendor's customers have to do now, and how the offer helps them do it |

A trend has no single event. Write it as a pattern the reader has likely seen ("three outlets covered ... in the week of 9 November"), never as one company's news.

## Rules for a story that names a company

A story names a company when it is about a specific vendor, customer or competitor. These rules hold for the plan, every angle and every email:

1. **State only what the sources reported.** Every fact in the copy is one the sources state. No guess about the cause, the size, who is affected or what happens next.
2. **Attribute it.** Name the outlet and the date: "The Compliance Wire reported on 12 November that ...". Never present the report as something you know yourself.
3. **Make no accusation of your own.** Never call the company negligent, insecure, failing or at fault, and quote no one you did not read in a source.
4. **Never blame the reader's vendor beyond the report.** The reader chose that vendor. Write about what the reader can do now, never that they chose badly or should leave.
5. **No fear.** No "you could be next", no countdowns, no worst case the report does not give.
6. **Leave the named company out of the audience.** Never write to its own staff about its own trouble.

The person who reviews the plan sees a "names a company" warning, and the plan summary says the story names a company.

## Rules for every story

- **Never quote the article.** Say what happened in one sentence of your own and name the outlet. Quote the headline at most, never article text.
- **Write as of the report, not as of today.** "reported on 12 November", never "today" or "this morning": the email may send days later.
- **No article link** unless the user asks for one. The outlet and the date are enough to find it, and a link in a first email costs deliverability.
- **One story per campaign.** Never stack two news hooks.
- **The offer stays the offer.** The story is the reason to write now; the ask is still the workspace's real offer.

## The plan

- **Angle.** Each segment's angle carries the story, because the copy is written from the segment: what happened, the outlet and the date ("The Compliance Wire reported on 12 November that ..."), why it matters to that buyer, and, for a story that names a company, the rule "state only what the outlet reported; no blame". Keep each angle under 400 characters.
- **Audience.** A `direct` story starts from the story's suggested industries, countries and keywords, plus the buyer titles; check each value before you count. A `vendor` story starts from the vendor's customers: their company names in the `currentCompanies` filter, plus the buyer titles. Offer the customers of similar vendors as an optional second segment, never by default. Put the named company in `excludeCompanies`.
- **Segments.** One to three, by buyer. Split by vendor only when the copy would really differ.
- **Summary.** One line names the story, the outlet and the date, and says so when the story names a company.

## The sequence

Two or three emails over three to five days. After that the news is old.

| Step | Day | Purpose |
|---|---|---|
| 1 | 0 | The story in one attributed sentence, what it changes for the reader, the offer, a small ask |
| 2 | 2 | The same change from another side (a question they now have to answer, a task it adds), one proof point, the ask again |
| 3 (optional) | 4 | A short close: one line on the change, one on the offer, an easy way to say no |

Keep step 1 under 90 words. Steps 2 and 3 do not retell the story; they point back to it ("since the report last week").

## Worked examples

Every company and outlet below is made up. The bracket is where the workspace's own proof goes: never write a proof point the workspace does not have.

### A regulation story (`direct`)

Story: The Payments Desk reported on 10 November that card processors in the EU must keep fraud logs for five years from March.
Workspace: sells log archiving to fintech companies.

> Subject: the five-year fraud log rule
>
> Hi Dana, The Payments Desk reported on 10 November that EU card processors must keep fraud logs for five years from March. For most teams that means moving years of logs out of expensive storage before the deadline. We archive them at a fraction of the cost and keep them searchable. [One proof point.] Worth a look before March?

### A vendor story that names a company (`vendor`)

Story: The Compliance Wire reported on 12 November that Fieldstone Compliance took its evidence portal offline for two days after a security incident.
Workspace: sells independent audit evidence reviews.
Audience: compliance leads at Fieldstone's customers. Fieldstone itself is excluded.

> Subject: audit evidence after the Fieldstone outage
>
> Hi Sam, The Compliance Wire reported on 12 November that Fieldstone Compliance took its evidence portal offline for two days after a security incident. If your audit is close, an independent check that your evidence is complete may help. We run that review in a week. [One proof point.] Open to a short call?

What it does not say: that Fieldstone was at fault, that customer data leaked, or that Sam should leave Fieldstone. The report said none of it.

### A trend story (`direct`)

Story: Clinic Ops Weekly and two other outlets covered clinics moving appointment booking to self-service in the week of 9 November.
Workspace: sells patient reminder sequences.

> Subject: self-service booking
>
> Hi Priya, Clinic Ops Weekly and two other outlets covered clinics moving appointment booking to self-service in the week of 9 November. The usual snag is the first month, when no-shows rise while patients learn the new flow. Our reminder sequences are built for that switch. [One proof point.] Would a short look help your rollout?
