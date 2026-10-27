# Weekly sales update: layout and definitions

Reference for the pipeline-review skill, Step 5. Plain text, short enough to read in two minutes. Amounts in the workspace currency from `opportunities(operation="settings-get")`.

## Layout

```text
Pipeline update - week of <Mon date> to <Sun date>

Pipeline now
  Open deals: <n>, <total amount>, weighted <weighted amount>
  <stage label>: <n> deals, <amount>, weighted <amount>
  ...

This week
  Opened: <n> (<amount>) - <names>
  Moved forward: <n> - <name: from stage -> to stage>
  Won: <n> (<amount>) - <names>
  Lost: <n> (<amount>) - <name: reason>

Stuck
  <name> - <stage>, <days> days in stage - <signals> - next: <action, owner, date>
  ...

Next actions by owner
  <owner>: <deal> - <action> by <date>
  ...

Top of funnel (last 7 days vs the 7 before)
  Contacted: <n> (<prev>)
  Replies: <n> (<prev>)
  Interested: <n> (<prev>)
  Meetings booked: <n> (<prev>)

Notes
  <data caveats: CRM sync behind, no stage history, thresholds used>
```

## Definitions

| Line | Definition |
|---|---|
| Open deals | deals whose stage category is `open` |
| Weighted | amount x win probability / 100, summed; the deal's own probability while open, else its stage's |
| Opened | `createdAt` inside the week |
| Moved forward | `stageChangedAt` inside the week and the stage is later in the pipeline order; only the latest change is known |
| Won, lost | `closedAt` inside the week, by stage category |
| Contacted | distinct contacts reached in the window (the query's `contacted` metric) |
| Replies | distinct contacts who replied; out-of-office and automated replies are not replies |
| Interested | distinct contacts whose reply is classified interested |
| Meetings booked | meetings booked from outreach; never call them held |

## Rules for the numbers

- A number you could not read is N/A, never 0. Say why in Notes.
- Never report opens or open rates.
- If replies are above 0 and interested is 0, the replies may not be classified yet: say so in Notes instead of reporting a 0% positive rate.
- Rates come with their counts ("4 of 120 contacted"), so a small sample is visible.
- Do not compare this week with a week that had a CRM import or a backfill without saying so.
- A won deal's amount is what the deal says. Never round it or add one that is not there.
