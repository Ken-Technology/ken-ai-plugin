# Report templates

The layouts and wording for Step 7 of `report`. Placeholders are in angle brackets. Every number comes from the reads in Steps 1 to 5; a number you could not read is N/A. Simple dashes only.

## Weekly report

```
Subject: Your weekly results - week of <Oct 20 - Oct 26>

Hi <first name>,

<Headline: one sentence with the week's main number.>

Results (<Oct 20 - Oct 26>):
- <sent> emails sent
- <contacted> people contacted
- <replies> people replied (out-of-office left out)
- <interested> interested replies
- <meetings booked> meetings booked
- <human clicks> link clicks

<Per campaign, one or two lines each, when there is more than one campaign.>

What people said:
- <Name, title at company>: "<quote, at most 200 characters>"
- <Name, title at company>: "<quote>"
- <Name, title at company>: "<quote>"

What changed this week:
- <one plain line per change, naming the campaign>

Next:
- <at most three moves, each one change with what you expect it to do>

<Where we need you: one or two questions, only when there are some.>

<Sender first name>
```

- Leave "What people said" out when you do not have exactly three interested replies from three different people.
- The weekly report has no benchmark or target line: the meetings ones are per month, and the monthly review compares them.
- Leave out the clicks line when no campaign has tracked links.
- Leave out "What changed" when nothing changed. Never fill it with routine sending.
- A week with no sends: say what is being prepared ("The <campaign> leads are being verified; sending starts Monday") only if a tool or the user told you.

### Headline lines

| The week | Headline |
|---|---|
| Interested replies came in | "<interested> interested replies this week from <contacted> people contacted, <best campaign> leading with <n>." |
| Replies but no interested ones | "<replies> people replied this week; none were interested yet. <one-line read, marked as a read>." |
| Sending ramping up | "<campaign> started sending this week: <contacted> people contacted so far." |
| Sending held | "Sending paused on <campaign> this week while <reason the tool gave>." |

## Monthly review

Write it in this order. Drop any section that has nothing real; never pad a list to three.

1. **Headline.** One sentence with the month's main number. Month to date: say so.
2. **Scoreboard.**

   | | <Month> |
   |---|---|
   | Emails sent | <sent> |
   | People contacted | <contacted> |
   | Replies (people) | <replies> |
   | Interested replies | <interested> |
   | Reply rate | <replies / contacted, one decimal>% (<replies> of <contacted>) |
   | Meetings booked | <meetings booked> |
   | Meetings held | N/A |
   | Human link clicks | <clicks> |

   Against the benchmark and target from Step 0:

   | | <Month> | Benchmark | Target |
   |---|---|---|---|
   | Reply rate | <replies / contacted, one decimal>% | <reply rate benchmark>% | <reply rate target>% |
   | Interested reply rate | <interested / contacted, one decimal>% | <interested reply rate benchmark>% | <interested reply rate target>% |
   | Meetings booked | <meetings booked> | <meetings per month benchmark> | <meetings per month target> |

   Write N/A in a cell whose benchmark or target you do not have. When you have none of the six, leave this table out and add the row `| Benchmark and target | N/A |` to the scoreboard. Month to date: compare meetings with the target and say "month to date".

3. **Per campaign.** For each campaign that sent: its name as the app shows it, the same rows in two or three lines, and its best segment by reply rate with counts when the campaign has more than one segment.
4. **What worked.** The campaign or segment with the most interested replies per person contacted, with counts, and the three replies (same rule as the weekly report).
5. **What we would change.** Real misses only, each a headline of at most 12 words and an explanation of at most 45 words with one number.
6. **What changed this month.** At most 8 lines from the weekly reports' `changed`, newest first.
7. **Next month.** At most three moves. Each one: the move, what to do, and the hypothesis with the number that would prove it.
8. **Where we need you.** Two or three questions that need a decision or data from the reader. Every N/A that only they can fill (meetings held, pipeline, deal value, cost per meeting) gets a question asking for it.

Cover email for the monthly review:

```
Subject: Your monthly review - <Month Year>

Hi <first name>,

<One line on the month.>

- <replies> replies (<interested> interested)
- <meetings booked> meetings booked

The full review is below. <One line on when you will talk it through, only if the user gave a date.>

<Sender first name>
```

Drop any bullet whose value is N/A rather than printing "N/A meetings booked".

## Lines for what changed

| `changed` kind | Line |
|---|---|
| `sequence_version_saved` | "New version of the email sequence for <campaign>" |
| `linkedin_sequence_version_saved` | "New version of the LinkedIn steps for <campaign>" |
| `variant_paused` | "Paused a variant that was not working in <campaign>" |
| `variant_resumed` | "Turned a variant back on in <campaign>" |
| `segment_added` | "Added the <segment> audience to <campaign>" |
| `leads_held_back` | "Held back leads for 1:1 account outreach in <campaign>" |
| A kind not listed here | Say it in plain words from its `text`, or leave it out |

## Words to use

- "people contacted", not "leads touched" or "contacts sequenced".
- "interested replies", not "positives".
- "replies from <n> people", never a message count.
- "our read" or "we think" before any cause; the numbers come first.
- No vendor, provider or model names. No internal plan or version labels.
