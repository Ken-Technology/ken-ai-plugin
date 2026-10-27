---
name: report
description: Write a weekly or monthly results report from live campaign numbers - headline, scoreboard, three interested replies, what changed, next moves and a cover email - as text you return. Distinct-contact replies, no opens, N/A instead of 0, no vendor names.
---

# Report

Write the weekly or monthly results report for a workspace: for an agency's client, for a team's manager, or for the user. You pull the numbers for the window, check them, pick the replies worth quoting and write the report and a short cover email. The report is text you return in your reply. A person reads it and sends it.

Every call takes `client_id`, the workspace id. Send it when the user can see more than one workspace. Dates are ISO-8601 instants (`2026-10-01T00:00:00Z`). Rates come back as fractions from 0 to 1.

## The rules

- **Replies are people.** Count distinct contacts, never messages. Out-of-office is not a reply.
- **Never report opens.** Open tracking is off for deliverability, so open numbers mean nothing.
- **Three interested replies, or none.** Quote exactly three, from three different people, or leave the section out. Never pad it with a neutral or out-of-office reply.
- **N/A, never 0, for anything you could not read.** A 0 says nothing happened; N/A says you do not know. Every N/A that only the reader can fill (meetings held, pipeline, cost per meeting) becomes a question under "Where we need you".
- **No benchmarks yet.** There is no benchmark field in Ken AI, so write N/A for any benchmark row and never quote an "industry average". Use a benchmark only when the user gives you one with its source.
- **No vendor names.** Never name a sending provider, data vendor, mailbox host or AI model maker in the report. Say "your sending domains", "our data", "the AI".
- **Names as the app shows them.** Use each campaign's and segment's name exactly as it appears in Ken AI. Never an internal label such as "plan 3" or "v2 series".
- **Never invent results or work.** Meetings, pipeline, revenue, costs and "what we did this week" come from a tool or from the user. When neither has it, write N/A or leave the line out.
- **A person sends it.** You draft the report and the cover email. Never send it, and never create a share that emails anyone, without a yes.

## Step 0 - Who, which window, which campaigns

1. **The window.** Weekly is Monday to Sunday. Default to the latest week that has ended. Monthly is a calendar month. Default to the previous month in the first 3 days of a month, otherwise month to date, and say "month to date" in the report.
2. **The campaigns.** `campaigns(operation="list", limit=100)`. Keep every campaign that sent in the window (Step 1 tells you). Name each one as the app does.
3. **The reader.** Ask who it is for if the user did not say: the client's contact name for the greeting, and the sender's first name for the sign-off.

If an operation this skill names is not listed for you, or answers 404 on a campaign the user named, stop and say: "I can't read those results from here. They are in Ken AI at https://app.ken.so/campaigns/<id>." Do not retry a 404 as "not found", and do not report a campaign as missing because one read failed.

## Step 1 - The numbers

**Weekly**, per campaign: `analytics(operation="get-weekly-report", campaign_id=42, week_of="2026-10-20")`.

- `week` and `toDate` each hold `sentCount`, `contactedCount`, `replyCount`, `interestedCount` and `bounceCount`. `toDate` runs from the campaign's start.
- `segments` gives each segment's contacts, sends and reply rate to date.
- `changed` lists the week's changes, and `next` the leads left and the estimated finish date.

Use `week.startDate` and `week.endDate` as the window for every other read in this report. Skip campaigns whose `week.sentCount` is 0, unless they are new: then say they are getting ready.

**Monthly**, per campaign: `analytics(operation="get-campaign-performance", from_time="2026-10-01T00:00:00Z", to_time="2026-10-31T23:59:59Z", campaign_id=42)`, and the same call with `group_by="segment"` for the segment rows. Read the weekly report for each week of the month for `changed`.

**Workspace totals:** the same performance call without `campaign_id`. Its `meetingsBooked` counts meetings booked from campaigns. Meetings held are not tracked yet, so that row is N/A.

**Clicks:** use the human `clickCount` and the returned `clickRate`. Never add `botClickCount`. A 0 on a campaign that sent volume with links in it can mean tracking is not recording: when you cannot confirm it, write N/A.

## Step 2 - Replies

`analytics(operation="get-reply-classifications", from_time="2026-10-20T00:00:00Z", to_time="2026-10-26T23:59:59Z", by_campaign=True)`

- Replies are `totalCount` minus the `out_of_office` count. Interested replies are `interestedCount`. `byCampaign` gives both per campaign. Each person counts once.
- If these differ from the weekly report's `replyCount` and `interestedCount` for the same window, use the classification read and say in your note to the user that replies are people who answered, with out-of-office left out.
- Check classification is keeping up: a large `unclassified` share means positive replies are undercounted. Then write the interested number as N/A ("replies are still being classified") and tell the user. `campaign-diagnosis` Step 1 has the full check.

## Step 3 - Three interested replies, or none

`threads(operation="list", campaign_id=42, interest="interested", limit=25)`, for each campaign in the report.

Keep threads whose prospect replied inside the window. Pick three different people for the whole report, favoring replies with substance: a question, a referral, a meeting request. For each one give the name, title and company, and a quote of at most 200 characters on one line. Fewer than three in the window: leave the whole section out.

## Step 4 - What changed and what comes next

- Turn each `changed` entry into one plain line that names the campaign: "New version of the email sequence for <campaign>", "Paused variant B of step 2 in <campaign>", "Added the <segment> segment to <campaign>". Group repeats: one line per campaign and kind of change. At most 8 lines for a month.
- `next` gives the leads left and, when it can be estimated, the day the last lead starts.
- Work outside campaigns (new domains, inbox setup, research) is in no tool. Ask the user for it, or leave it out.

## Step 5 - Deliverability (optional)

`analytics(operation="get-deliverability", from_time="2026-10-20T00:00:00Z", to_time="2026-10-26T23:59:59Z", group_by="domain")` and `analytics(operation="auto-pauses-list")`. Write one line: the bounce rate with its counts, the number of sending domains, and any active hold. If a domain looks unhealthy, say so plainly and suggest `deliverability-guard`. If you did not read it, leave the line out rather than call it healthy.

## Step 6 - Sanity-check before you write

- Per campaign and in total: interested is at most replies, replies at most contacted, contacted at most sent.
- The campaign rows add up to the workspace totals.
- Every number uses the same window.
- A campaign that sent but shows 0 replies: confirm classification and holds before you print the 0.

Fix the source of a failed check, or write that number as N/A and tell the user why in your note. The reason goes in the note to the user, not in the report.

## Step 7 - Write it

Load `load_skill("report", reference="references/templates.md")` for the weekly email, the monthly review layout and the wording of the lines. In short:

1. **Headline:** one sentence with the period's main number.
2. **Scoreboard:** sent, people contacted, replies, interested replies, meetings booked, human clicks, each with its N/A where unknown.
3. **Per campaign:** two or three lines each.
4. **What worked** and **what we would change:** each tied to a number. Skip a section that has nothing real.
5. **Next moves:** at most three, each one change with a hypothesis ("Shorter step 2 for the RevOps segment: we expect more interested replies from step 2 within two weeks").
6. **Where we need you:** the questions and the data you need from the reader.
7. **Cover email:** two to four lines that point at the report and give the headline.

Return the report and the cover email as text in your reply.

## Step 8 - Hand it over

- **Default:** the user copies the text and sends it.
- **Share page (optional):** `approvals(operation="shares-create", items=["report"], permission="view", campaign_id=42)` makes a view-only page with the campaign's weekly report, and `recurring_report=True` refreshes it every Monday. Passing `recipients` emails them the link, so ask first. Send the user `data.url` from the response; never build a share link yourself.
- **Studio doc (optional):** only when the workspace has the `studio` and `rd_docs` flags on and the user asks for a doc. Build it with the `studio-asset` skill on a doc template, then `studio_docs(operation="create-doc-export", asset_id=88, provider="google_drive")` returns a Google Doc link. Without those flags the text is the report.

## What this skill cannot do yet

- Render an HTML or PDF deck. The report is text.
- Compare against a benchmark. There is no benchmark field yet, so benchmarks are N/A.
- Count meetings held, or read the reader's CRM pipeline. Both are N/A until the reader gives them.
