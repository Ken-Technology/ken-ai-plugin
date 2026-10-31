# Lead-source workflows and templates

Part of the `workflows` skill. `SKILL.md` has the full loop (validate, estimate, test, publish, run, recover) and the app links; this file helps you pick a template and take it live. Use it when the user wants leads, people or accounts to come in and be worked by themselves:

- "Add the companies from my Sales Navigator search to Accounts every day."
- "Add the people who comment on my LinkedIn posts to my campaign."
- "Every Typeform lead should become a person, then get enriched."
- "Email hot website visitors."
- "Enrich every list I import."
- "When a past champion changes jobs, tell me and draft an email."

Every call takes `client_id`, the workspace id, as in `SKILL.md`.

## Pick a template

`workflows(operation="templates-list", client_id=...)` is the live list, and the only one to trust: it can hold templates this page does not name yet. Each entry's `requires` lists what the workspace needs before publishing (`app:slack`, `secret:NAME`, `flag:x`). Read the template with `workflows(operation="templates-get", client_id=..., template_key="hot-website-visitor")` before you suggest it, and tell the user what it needs that the workspace does not have.

| The user wants | Start from |
|---|---|
| leads from a form tool or automation platform | `leads-from-typeform`, `leads-from-hubspot-forms`, `leads-from-webflow`, `leads-from-tally`, `leads-from-zapier`, `leads-from-make`, `leads-from-n8n`, `leads-from-json` |
| companies from Sales Navigator | `new-accounts-from-sales-navigator` |
| people who react to or comment on your LinkedIn posts, or view your LinkedIn profile, added to a campaign | `people-who-engage-with-linkedin-posts`, `people-who-view-linkedin-profiles` |
| people at local businesses picked in Search > Places (Google Maps) | `find-people-at-local-businesses` |
| website visitors worked | `visitor-id`, `hot-website-visitor` |
| signals turned into outreach | `signals-to-pipeline`, `hiring-signal-outreach`, `champion-changed-jobs`, `hand-off-hot-accounts` |
| imported or CRM lists cleaned up | `enrich-imported-list`, `enrich-imported-list-clay`, `email-waterfall-verified`, `crm-cleanup`, `enrich-crm-contacts-ken-search`, `enrich-crm-companies-ken-search`, `webhook-to-crm` |
| a first email from a list | `icp-list-to-sequence`, `ai-personalization-stack` |
| events and phones | `find-relevant-events-weekly`, `find-eventbrite-events-apify-weekly`, `find-linkedin-events-apify-weekly`, `find-phones-for-people`, `find-phones-interested-replies` |
| meetings and nurture | `meeting-booked-brief`, `nurture-air-cover` |
| leads who replied "not now" or out of office, or lost deals, followed up later on their own thread | `revive-not-now-replies`, `revive-lost-deals` |
| ads warming up leads (matched audiences on Meta or Google Ads) | `clickers-to-meta-audience`, `ready-campaigns-to-ad-platform`, `campaign-leads-to-meta-matched-audience` |
| a campaign that never runs out of leads | `keep-campaign-full` |

No template fits: build from the goal with `workflow_builder(operation="build", ...)` (`SKILL.md` step 1).

## Every template

| `template_key` | Use it to |
|---|---|
| `signals-to-pipeline` | turn hiring, funding, job change and ICP timing signals into qualified accounts and the company in the CRM, and a first email |
| `hiring-signal-outreach` | when a lead's company starts hiring for sales or growth, research the hiring push and draft an email to the lead for your approval |
| `champion-changed-jobs` | follow a past champion to their new company |
| `enrich-imported-list` | enrich every new lead from an import, the API or a webhook |
| `enrich-imported-list-clay` | enrich every new lead through your own Clay table, then write an opening line |
| `icp-list-to-sequence` | take a list of people from search or an import to a first email |
| `email-waterfall-verified` | get a verified work email for every person mapped to an account |
| `ai-personalization-stack` | find the best personalization angle for each account |
| `meeting-booked-brief` | turn a booked first meeting into a CRM deal and an opportunity with a brief |
| `hot-website-visitor` | score identified website visitors and post the hot ones to Slack |
| `visitor-id` | when the visitor-ID provider connected in Settings > Integrations names the company behind a visit, score it against your ICP and post the good fits to Slack |
| `webhook-to-crm` | qualify form submissions and create the good fits as CRM contacts |
| `leads-from-typeform` (also `leads-from-hubspot-forms`, `-webflow`, `-tally`, `-zapier`, `-make`, `-n8n`, `-json`) | create or update a person (lead intake) from every submission or call that tool sends, then branch on whether the person is new; publish, then paste the trigger's webhook URL into the tool |
| `hand-off-hot-accounts` | hand a hot account to the AE with a brief |
| `crm-cleanup` | look up, enrich and update every contact that comes in from a CRM list |
| `enrich-crm-contacts-ken-search` | write Kenso Search's current title to each CRM contact on a CRM list that has a LinkedIn URL in the CRM (it replaces the CRM's title; nothing else is written, a missing value never clears one). The list import adds the contacts to the trigger's campaign and reserves lead credits, so pick a campaign the user will not launch. 0.2 credits per lookup that finds the person or company. Needs a connected CRM |
| `enrich-crm-companies-ken-search` | the same for each contact's CRM company: Kenso Search's employee count, found by the company domain. A company with several contacts on the list is looked up once per contact |
| `new-accounts-from-sales-navigator` | add the companies of a Sales Navigator account search or list to Accounts once a day and start a run per new account; set the trigger's `linkedinAccountId` (a seat with Sales Navigator that you connected) and `url`. New accounts are not researched: add an `ai.research@1` step under the branch for that. Needs the `sales_navigator` and `accounts` features, and publishing it needs Accounts edit and the import permission |
| `people-who-engage-with-linkedin-posts` | once a day, add the people who reacted to or commented on your LinkedIn seats' recent posts to a campaign and start a run per person under a "Comment or reaction?" branch; set the trigger's `campaignId` (a regular campaign, not trigger mode), and optionally `linkedinAccountIds` (none reads every connected seat), `kinds`, `commentKeywords`, `companyPageUrls`, `postMaxAgeDays` and `maxNewLeadsPerDay`. The campaign's own workflow contacts them; each new lead reserves lead credits. Needs the `linkedin_signals` feature (the template is hidden without it) |
| `people-who-view-linkedin-profiles` | the same for the people who viewed your Premium seats' LinkedIn profiles; set `campaignId`, and optionally `linkedinAccountIds` (Premium seats; none reads every connected Premium seat) and `maxNewLeadsPerDay`. Needs the `linkedin_signals` feature |
| `find-relevant-events-weekly` | every Monday, find upcoming conferences, meetups and online events that fit your ICP, Knowledge and target accounts, and add the best as Suggested events on Accounts > Events for you to add or dismiss. Free, no setup. Needs the `accounts` and `event_outbound` features; Kenso installs it for you where `event_outbound` is on |
| `find-eventbrite-events-apify-weekly` | every Monday, run an Eventbrite scraper on the user's own Apify account for business events in the next 90 days and add the ones that fit as Suggested events. Needs the user's Apify API token under Settings > Integrations > Apify; the run bills their Apify account, not their credits |
| `find-linkedin-events-apify-weekly` | the same for LinkedIn Events, through the user's own Apify account and token; no LinkedIn login needed |
| `find-phones-for-people` | find a phone number for each person you run it on (`trigger.manual@1` on people; once published, start runs with `workflow_runs(operation="run-on-records", records=[{"type": "person", "id": ...}])`). People who already have a usable phone, or a find in flight, are skipped. A number found costs credits at the phone found price, charged by the phone finder outside the workflow's limits; no number found costs nothing. Needs the `calls` feature |
| `find-phones-interested-replies` | when a lead replies interested to a campaign, find a phone number for the person behind them. Same skip and charge rules. Needs the `calls` feature; Kenso installs it for you (off unless the old Find phones setting was on) where `calls` and `workflows` are on |
| `revive-not-now-replies` | when a lead replies "not now", is out of office, or replies interested and then goes quiet, wait until the date they asked for (else a default follow-up date; when they named no date and are not out of office, news of funding or hiring at their company since their reply ends the wait early and the draft mentions it), check they are still worth a follow-up (not in a sequence, no meeting booked, not unsubscribed or bounced, not followed up in the last year), and draft one short reply on their original thread; a week later, one shorter nudge if they did not answer. A person reviews and sends each draft in the inbox. Kenso leaves 10% of these leads out on purpose to measure what revival adds. Each reply sent costs one send credit; a draft nobody sends costs nothing. Needs the `lead_revival` feature (the template is hidden without it) |
| `find-people-at-local-businesses` | find the owners and managers of local businesses picked in Search > Places (Google Maps), their emails, and add each place to Accounts with its people (or the people to a campaign: set `deliver`'s `destination` and `campaignId`). Run it on places by their `plc_` ids. Needs the Places search feature |
| `clickers-to-meta-audience` | add every lead who clicks a link in a campaign email (bots excluded) to one Meta audience, "Ken clickers", for 90 days after their last click; Kenso uploads new clickers at least once a day. Edit the step's `provider` for Google Ads. Needs the `ad_audiences` feature and Meta connected with an ad account picked under Settings > Integrations > Ad platforms. Free |
| `ready-campaigns-to-ad-platform` | every day at 09:00 UTC, give each Ready campaign a matched Meta audience of its leads that Kenso keeps in step with the campaign. While it is on, the workflow owns those audiences: it resumes a paused one and makes again a deleted one. Same feature and connection as above. Free |
| `campaign-leads-to-meta-matched-audience` | when leads land in the campaign picked in the trigger (`campaignId`), make it a Meta audience with enhanced matching on: besides each lead's own email, Kenso uploads the hashed personal emails and phone numbers its licensed people dataset holds for them. Enhanced matching runs only in workspaces Kenso has turned it on for; elsewhere the audience gets each lead's own email. Same feature and connection as above. Free |
| `revive-lost-deals` | when a Kenso deal moves to a lost stage, wait until the first quarter-start Tuesday at least 120 days later, find the deal's person (else the account's champion or first stakeholder) and their latest reply to your campaigns, check they are still worth a follow-up, and draft one short reply on that thread that refers to why the deal was lost; a week later, one shorter nudge the same way. A new open deal at the account, a meeting since the loss, or a revival sent to that person in the last year stops it, and a deal whose person never replied to a campaign, or another deal lost at the same account within 120 days, is skipped. A person reviews and sends each draft; each reply sent costs one send credit. Needs the `opportunities` and `lead_revival` features |
| `nurture-air-cover` | a `campaign` workflow for a light nurture campaign: when an account moves to Nurture, add its people with no 1:1 touch planned (not the economic buyer, nobody touched in the last 30 days) to the campaign, and for 9 weeks move the account back to Warming and post to Slack when someone replies or its page gets 3 human views. Fill in the Slack channel |
| `keep-campaign-full` | a `campaign` workflow that checks its campaign every hour and, when fewer leads are waiting for a first email than the threshold, imports more from Kenso Search with the filters you set (`filters`, required). Caps: `maxLeadsPerDay` (500), `maxLeadsPerWeek` (2000) and `monthlyLeadBudget` (25% of the plan's monthly leads by default; an unlimited plan must set it). Each lead takes a lead credit inside the import. It skips while an import or its enrichment is still running, and turns itself off when the campaign is deleted, archived or completed, or 2 refills in a row find nobody new. Publishing it needs a workspace admin with Search view, Campaigns edit and the import permission, and it imports as the workflow's creator, who needs the same rights (not Kenso staff). Needs the `campaign_lead_refill` feature |

`hand-off-hot-accounts` starts on `trigger.account_hot@1`: Kenso writes that event when a new signal lifts an account's signal score from below the workspace's Tier 1 floor (Knowledge > Tiers, 65 by default) to at or above it, at most once per climb (points edits and account merges never count). Both the event and the trigger need the `workflows_account_hot` feature, which is off until staff turn it on for the workspace; while it is off the template saves as a draft and publishing reports `feature_disabled`. The template runs at most once per account every 30 days.

`enrich-imported-list-clay` needs the secrets `CLAY_WEBHOOK_URL` and `CLAY_WEBHOOK_TOKEN`; the Clay HTTP API column posts to the URL in the row's `kenCallbackUrl` column (the `callbackUrl` in the step's output has its secret redacted, so do not copy it).

The eight `leads-from-*` templates replaced the old Settings > Sources page. Each starts on `trigger.webhook@1` with that tool's preset and `createPerson` on, then a free "New person?" branch (New person, No person, Already in Ken) that the user builds under. They spend nothing by themselves. `createPerson` needs the `lead_intake` flag: while intake is off or over its limit, a delivery starts no run and the sender is asked to retry; a delivery with no email, LinkedIn URL or name with a company domain goes down No person.

## Take a template live

1. **Create.** `workflows(operation="create", client_id=..., template_key="new-accounts-from-sales-navigator")`. Keep its `id` and `draftVersion`.
2. **Fill.** Read it with `workflows(operation="get", client_id=..., workflow_id=12)` and replace every `<fill in: ...>` value with `workflows(operation="update", client_id=..., workflow_id=12, base_version=1, patch=[...])`. Ask the user for what only they know (their ICP in two sentences, a Slack channel, a Sales Navigator URL); never invent it.
3. **Validate.** `workflows(operation="validate", client_id=..., workflow_id=12, mode="publish")` until `valid` is true. Follow each issue's `fix`. A `missing_secret` is a secret to create with `workflow_builder(operation="workflow-secrets-create", ...)` and the value the user gives you (`SKILL.md` step 2). An `app_not_connected` is the user's step in Settings: the MCP cannot connect Slack, a CRM or Apify for them.
4. **Estimate.** `workflows(operation="estimate-create", client_id=..., workflow_id=12, records=300)`, with `records` the runs the user expects a month (a form's monthly submissions, a list's size). Give `expectedCredits` and `maxCredits`.
5. **Test on one record.** `workflow_builder(operation="test", client_id=..., workflow_id=12)` runs the draft once on the newest record of the trigger's type, or name one with `record_type` and `record_id`. A field the record cannot supply keeps the trigger type's example value (a webhook delivery's fields, for example), and `exampleFields` names those made-up fields: say so when you report the test. Done when `publishPassRecorded` is true.
6. **Set the spend limit.** Read it with `billing(operation="workflow-spend-limits-get", client_id=..., workflow_id=12)` and show its `display`. When the user names a cap, set it with `billing(operation="workflow-spend-limits-update", client_id=..., workflow_id=12, changes={"monthly_limit_millicredits": 100000, "runs_per_day": 200, "at_limit": "ask"})`. 1 credit is 1,000 millicredits. `at_limit` is `pause` (the workflow turns off), `ask` (the run waits for a person) or `hold` (runs wait until a limit is raised). It needs Workflows edit and the billing permission.
7. **Publish on a yes.** Show the estimate and the limit, wait for the user's yes, then `workflows(operation="publish", client_id=..., workflow_id=12, note="Typeform leads")`.
8. **Connect the source.** A webhook trigger gets its URL when it is published: read `webhook.url` from `workflows(operation="get", client_id=..., workflow_id=12)` and give it to the user to paste into the form tool (each `leads-from-*` template's description says where). `webhook.live` is true while a delivery starts a run. `webhook` comes only to a user with the Integrations permission; without it, ask a workspace admin for the URL. Share the URL only with the user: anyone holding it can start runs. A Sales Navigator, LinkedIn post engagement, LinkedIn profile viewers or schedule trigger starts on its own. A `trigger.manual@1` template runs only on the records someone picks (`SKILL.md` step 6).
9. **Check the first runs.** After the first deliveries, `workflow_runs(operation="list", client_id=..., workflow_id=12)` and the failed-runs pass in `SKILL.md` step 7.

## Rules

- A person approves every send. Templates that write an email keep `approval: "required"`, and the touch waits in Today.
- Never turn on a source the user did not ask for, and never publish before the yes in step 7.
- Quote only the credits and dollars the tools return. Apify-backed templates bill the user's own Apify account: say so, and do not estimate that bill yourself beyond what the template description says.
- Funding is not a buying event by itself. When the user wants a funding signal to trigger outreach, qualify the account against their ICP first (as `signals-to-pipeline` does) instead of writing to every company that raised.
