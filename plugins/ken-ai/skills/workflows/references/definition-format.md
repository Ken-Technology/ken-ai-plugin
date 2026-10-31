# The kenWorkflow format

A workflow definition is one JSON object in the `kenWorkflow: "1"` format. `workflows(operation="create")`, `workflows(operation="update")` and `workflows(operation="validate")` take it as `definition`. This page is every rule the parser and the validator check, so a definition written to it validates on the first or second try. The loop (validate, test, publish, run, recover) and the app links are in the skill body (`SKILL.md`). Three complete workflows are in `examples.md`.

## Shape

```json
{
  "kenWorkflow": "1",
  "name": "Qualify new signups",
  "description": "Scores each new account against the ICP.",
  "trigger": { "type": "trigger.manual@1", "with": { "recordType": "account" } },
  "steps": [
    { "id": "qualify", "type": "ai.qualify@1", "with": { "criteria": "B2B SaaS, 50+ people", "tier": "cheap" } }
  ],
  "limits": { "creditsPerMonth": 100, "creditsPerRun": 5, "runsPerDay": 50, "atLimit": "ask" }
}
```

| Property | Required | Rule |
|---|---|---|
| `kenWorkflow` | yes | the string `"1"` (`unsupported_format` otherwise) |
| `name` | yes | a title of up to 120 characters (`invalid_name`) |
| `description` | no | what the workflow does, one or two sentences |
| `trigger` | yes | `{type, with}`: one trigger type (`missing_trigger`) |
| `steps` | yes | at least one step to test or publish (`no_steps`); a draft may save with `[]` |
| `limits` | to publish | see Limits (`limits_required`) |

Property names are camelCase and case-sensitive: `kenWorkflow`, `onFailure`, `with`. Anything else is ignored with an `unknown_property` warning, whose `fix` names the closest known property.

## Trigger

`type` is a trigger type written `key@version`: `trigger.signal@1`, `trigger.new_leads@1`, `trigger.manual@1`, `trigger.webhook@1`, `trigger.schedule@1`, `trigger.reply@1`, `trigger.meeting_booked@1`, `trigger.person_mapped@1`, `trigger.account_stage@1`, `trigger.run_failed@1`, `trigger.account_hot@1`, `trigger.meeting_notes_ready@1`, `trigger.crm_record_changed@1`, `trigger.event_date@1`, `trigger.crm_list@1`, `trigger.sales_navigator@1`, `trigger.places@1`, `trigger.linkedin_post_engagement@1`, `trigger.linkedin_profile_viewers@1`, `trigger.saved_list@1`, `trigger.ken_search@1`, `trigger.campaign_leads@1`, `trigger.csv@1`, `trigger.event_attendees@1`, `trigger.apollo@1`. `with` holds its settings. `workflows(operation="step-types-list", client_id=..., kind="trigger")` lists them with their input schema, example and example output.

The trigger decides what one run is about: an account, a person, a lead, a Google Maps place, or no record. Its description says which. `trigger.manual@1` takes `with.recordType` (`account`, `person`, `lead` or `place`) and is what a run on records starts. A place run is sent by its `plc_` id (`{"type": "place", "id": "plc_7"}`). A `trigger.webhook@1` or schedule run has no record.

`trigger.crm_list@1` (`with.listId`, `with.campaignId`, optional `with.keepInSync`) starts one lead run per contact the CRM list import adds to the campaign. Publishing registers the list as a list source in the workspace's CRM settings and the import runs every 15 minutes, so publishing on an existing list starts a run for every current member not yet in the campaign. Leads already in the campaign are not backfilled, and a lead added by another path (CSV, API) also starts a run. It needs a connected CRM with list sync on in the CRM settings and the `ingestion` feature; a Salesforce list is a Campaign. Starting runs costs nothing, but each new contact the import adds reserves lead credits from the plan, like any CRM list import. While the CRM needs a reconnect, is paused for the plan, or has list sync or a feature flag off, the registration waits and starts no run until it recovers. Unpublishing the workflow leaves the list source in the CRM settings, so the import keeps adding members until the user removes the list source there.

`trigger.sales_navigator@1` (`with.linkedinAccountId`, `with.url`, optional `with.maxCompanies`, 100 by default, at most 1000) reads a Sales Navigator account search or account list once a day through a connected LinkedIn seat with Sales Navigator that the person who last saves the workflow connected, adds the companies that are not in Accounts yet (matched by website domain, exactly like the Accounts import) and starts one account run per account it added, with `{{trigger.created}}` true. A company already in Accounts starts no run. Copy the URL from the browser's address bar in Sales Navigator; a lead search or lead list is refused. It needs the `sales_navigator` and `accounts` features (publish refuses it otherwise), and publishing it needs Accounts edit and the import permission, like the Accounts import (403 `permission_denied` otherwise). A seat that is disconnected or has no Sales Navigator makes the registration wait; a removed seat, a seat someone else connected, or a URL LinkedIn cannot open fails it. New accounts are added without research, so the trigger spends no credits; add an `ai.research@1` step to research them within the workflow's limits. The template `new-accounts-from-sales-navigator` starts from it.

`trigger.linkedin_post_engagement@1` (`with.campaignId`, optional `with.linkedinAccountIds`, `with.kinds` of `reaction` and `comment`, `with.commentKeywords`, `with.companyPageUrls` (up to 3), `with.postMaxAgeDays` (14 by default, at most 30) and `with.maxNewLeadsPerDay` (100 by default, at most 500)) reads once a day who reacted to or commented on the recent posts of the seats (none listed: every connected seat), adds up to `maxNewLeadsPerDay` new people to the campaign as leads, like a LinkedIn import (the campaign's dedupe and do-not-contact apply, the workspace's own seats are never added, each new lead reserves lead credits), and starts one lead run per person the read placed in the campaign, new or already a lead there. `{{trigger.kind}}` is `reaction` or `comment`; `{{trigger.profileUrl}}`, `{{trigger.name}}`, `{{trigger.headline}}`, `{{trigger.postUrl}}`, `{{trigger.commentText}}` and `{{trigger.linkedinAccountId}}` describe the engagement. `trigger.linkedin_profile_viewers@1` (`with.campaignId`, optional `with.linkedinAccountIds` and `with.maxNewLeadsPerDay`) does the same for the people who viewed the Premium seats' profiles in the last 14 days, with `{{trigger.kind}}` `profile_view`. Both need the `linkedin_signals` feature (publish refuses them otherwise). A deleted or trigger-mode campaign, or a listed seat that is not in the workspace, fails the registration; a disconnected or non-Premium seat is skipped until it recovers. The templates `people-who-engage-with-linkedin-posts` and `people-who-view-linkedin-profiles` start from them.

`trigger.places@1` (`with.query`, `with.location` or `with.area` (`{lat, lng, zoom}`, zoom 3 to 21), optional `with.country`, `with.lang`, `with.filters` (the Search > Places filters; places with a website only, unless `filters.hasWebsite` is false) and `with.maxPlaces`, 100 by default, at most 1000) reads a Google Maps places search once a day, 200 places a page and at most 5 pages a read, and starts one place run for each place the workspace has not processed yet (a place counts as processed once any workflow delivered it, and a place this workflow already ran on never starts it again). Each page costs 1 credit and counts against the workflow's monthly credit limit; a read stops before a page the limit or the credit balance cannot pay for, and the next read continues there. When the search has no more pages it waits 30 days, then reads it from the top. It needs the Places search feature, and publishing it needs Search view (403 `permission_denied` otherwise). The template `find-people-at-local-businesses` runs on places picked in Search; put this trigger in its place to run it on a saved search every day.

`trigger.saved_list@1` (`with.savedListId`) reads one of the workspace's saved company lists, as a source of a Bulk import workflow. It needs a `schedule` (`{"every": "once"}`, or `hour`, `day` or `week` with optional `at`, `weekday` and `timezone`, as `trigger.schedule@1` takes them): it reads the list when the workflow is published, then on that cadence, and each read starts one account run per member again. Each member with a website domain becomes an account, matched by domain like the Accounts import and added without research when new, so steps read `{{account.*}}`; a member without a domain starts nothing. A people list, a deleted list, another workspace's list or a private list of someone other than the person who published fails the registration. It needs the `workflow_sources` and `accounts` features (publish refuses it otherwise), and publishing it needs Accounts edit and the import permission. A `schedule` on any other trigger is `invalid_schedule`.

`trigger.ken_search@1` (`with.filters`, the `searchFilters` of `POST /v1/search/imports`, or `with.savedSearchId`, exactly one; `with.limit`, 1 to 1000, 100 by default; `with.skipKnown`, true by default) reads a Kenso Search people search as a Bulk import source, with a `schedule` as `trigger.saved_list@1` takes it. Each read starts from the top of the search and takes up to `limit` people: each person is matched in the workspace's people by LinkedIn URL or Kenso Search id, or added (source workflow, on no account, custom `company_domain` and `company_name` filled where blank), and starts one person run, so steps read `{{person.*}}`. With `skipKnown`, people the workspace already had are skipped and do not count toward the limit, so a weekly read finds new people only; with it false every read runs the same people again. Reading the search and adding people cost no credits; the steps charge as usual. A saved search is read as the person who published the workflow: if they left the workspace or can no longer see it, the registration fails with `saved_search_not_found`, and filters Kenso Search rejects fail it with `ken_search_rejected`. It needs the `workflow_sources` and `accounts` features, and publishing it needs Search view, Accounts edit and the import permission.

`trigger.campaign_leads@1` (`with.campaignId`) collects the leads added to a campaign, from anywhere (the Leads tab, the API, Ask Ken, an import), as a source of a Bulk import workflow. It needs a repeating `schedule` (`hour`, `day` or `week`), usually `{"every": "hour"}`: its first read, when the workflow is published, only marks where to start, after the leads the campaign already has (no backfill), so `once` would never collect a lead and is `invalid_schedule`. Each later read starts one lead run for each lead added since the last read, so steps read `{{lead.*}}`; republishing carries on where the last version stopped. A lead runs once: a lead the workflow already ran on, or one its own steps added to a campaign (`account.add_to_campaign@1`, `place.deliver@1`, a `campaign.refill@1` import), starts nothing. A Bulk import campaign workflow (root `type: "bulk_import"`) always holds one for its own campaign: validate and publish report `campaign_leads_required` without it, and Kenso adds it, hourly, when it builds one. In a campaign workflow its `campaignId` is the workflow's own campaign (Kenso sets it); elsewhere it must be a campaign of the workspace (`invalid_source_campaign` otherwise). It needs the `workflow_sources` feature.

`trigger.csv@1` (`with.savedListId`) runs each row of an uploaded CSV through the workflow once, as a person, as a Bulk import source. Upload the file into a people list first (`POST /v1/saved-lists` with kind `people`, then `POST /v1/saved-lists/{savedListId}/uploads`). Its `schedule` must be `{"every": "once"}` (any other cadence is `invalid_schedule`): it reads the list when the workflow is published, after the upload has been processed (while an upload of the list is pending or running it waits and reads it on a later pass). Each row is matched in the workspace's people by email, LinkedIn URL or Kenso person id, or added (source workflow, on no account, with its name, title and phone, custom `company_domain` and `company_name` and the CSV's custom columns filled where blank), and starts one person run, so steps read `{{person.*}}`. A row with none of the three keys is skipped, as are rows that opted out. A person runs once per workflow from its CSV sources, so publishing again starts no row twice. Reading the list and adding people cost no credits; the steps charge as usual. A company list fails the registration with `csv_list_not_people`; a deleted list, another workspace's list or a private list of someone other than the person who published it fails it with `csv_list_not_found`. It needs the `workflow_sources` and `accounts` features, and publishing it needs Search view and Accounts edit.

`trigger.event_attendees@1` (`with.eventId`, an outbound event of the workspace from `GET /v1/outbound-events`; `with.roles`, any of `attendee`, `exhibitor`, `speaker` and `sponsor`, all four by default) reads the event's attendee list as a Bulk import source, with a `schedule` of `once`, `day` or `week` (`hour` is `invalid_schedule`). Each read takes the rows added since the last one, and each person listed starts one person run, once for the workflow, so steps read `{{person.*}}`: a person listed twice, or read again after a republish, runs once. A row with an email, a LinkedIn URL or a Kenso Search id is matched in the workspace's people or added (source workflow, on no account, custom `company_domain` and `company_name` filled where blank); a row with only a name and a company domain is matched by name on the workspace's account for that domain, or added to it. A row without a person's name (a company-only sponsor or exhibitor), with only a name and no company domain, or whose domain is no account of the workspace starts nothing, and is not read again until the workflow is published again (add the missing account first). Reading the list and adding people cost no credits; the steps charge as usual. A deleted event or another workspace's fails the registration with `event_not_found`. It needs the `workflow_sources`, `accounts` and `event_outbound` features, and publishing it needs Accounts edit.

`trigger.apollo@1` (`with.listId`) runs the contacts of one of the workspace's Apollo lists through the workflow, as people, as a Bulk import source. It reads Apollo on the workspace's own Apollo key, saved in Settings > Integrations; Kenso has no Apollo key. `workflow_builder(operation="apollo-lists-list", client_id=...)` lists the workspace's Apollo contacts lists with their `id` (the `listId`, at most 64 characters), `name` and `count`. Its `schedule` is `once`, `day` or `week` (`hour` is `invalid_schedule`: each read pages the whole list within Apollo's rate limits). Each read first checks the list is still one of the workspace's Apollo contacts lists (else the registration fails with `apollo_list_not_found`), then pages it from the contact created last in Apollo, up to Apollo's 50,000 (on a bigger list, an older contact added to it lately can sort past that cap and is not read). Each contact is matched in the workspace's people by email or LinkedIn URL, or added (source workflow, on no account, with its name, title and phone, custom `company_domain` and `company_name` filled where blank), and starts one person run, so steps read `{{person.*}}`. A contact with no name, or with neither an email Apollo has unlocked nor a LinkedIn URL, is skipped. A person runs once per workflow from its Apollo sources, so a daily or weekly read runs only the contacts added to the list since, and publishing again starts no one twice. Reading the list costs no Kenso credits and no Apollo credits (Apollo's rate limits apply to the key); the steps charge as usual. Without a usable Apollo key the registration fails with `apollo_not_connected`, and when Apollo refuses the key (401 or 403) with `apollo_key_rejected`. Save a master Apollo key: the same key runs Kenso's Apollo email finder (`people/match`), so a key limited to the list endpoints stops working for both. It needs the `workflow_sources` and `accounts` features, and publishing it needs Accounts edit.

On a place run, `data.find_people@1` needs no titles (owners and managers first) and returns each person's `personId`; `ai.website_people@1` reads the place's website and returns `people` (with `personId` and the email the site printed), `businessEmails` and `phones`; `data.find_email@1` and `data.find_phone@1` take `personId` to run on one of those people inside `logic.for_each@1` (`"personId": "{{item.personId}}"`); `place.deliver@1` adds the place to Accounts (`destination: "accounts"`), its people to a campaign (`"campaign"` with `campaignId`) or both, with an optional business mailbox contact (`businessContactFallback`). `ai.website_people@1` and `place.deliver@1` need the Places search feature, and a place run needs it too.

## Steps

```json
{
  "id": "research",
  "type": "ai.research@1",
  "title": "Research why now",
  "with": { "focus": "why now: {{trigger.signal}} signal", "tier": "balanced" },
  "when": "{{qualify.score}} >= 70",
  "next": ["email"],
  "save": [{ "from": "summary", "to": "account.whyNow" }],
  "onFailure": "continue",
  "retry": { "maxAttempts": 3 }
}
```

| Property | Rule |
|---|---|
| `id` | required. `^[a-z][a-z0-9_]{0,39}$`, unique in the workflow, never a reference root (`trigger`, `secrets`, `account`, `person`, `lead`, `record`, `item`, `run`). Codes `invalid_id`, `reserved_id`, `duplicate_id`. References use the id, never the title. |
| `type` | required. A step type `key@version` such as `ai.qualify@1` (`invalid_step_type` when malformed, `unknown_step_type` when not registered). |
| `title` | optional. What the editor shows. |
| `with` | the step's input; it must match the type's `inputSchema` (`invalid_input`). |
| `when` | optional "only run if": a boolean formula. When it is false the step is skipped. |
| `next` | the step ids that follow (`unknown_target` for an id that does not exist). A step with several parents waits for all of them. Steps no other step points at follow the trigger directly. |
| `save` | optional list of `{from, to}`: `from` is a path in this step's output (`score`, `company.size`), `to` a record field (see Save to field). |
| `onFailure` | `stop` (default: end the run), `continue` (the step is `failed_safely` and later steps see empty values) or `branch:<step id>` (go to that step). `invalid_on_failure` otherwise. |
| `retry` | optional `{maxAttempts, initialDelaySeconds, maxDelaySeconds}` within the type's bounds. |

### Branch, filter, for each

- `logic.branch@1` routes the run down one arm. `with.branches` is a list of arms `{label, when, next}`, checked in order; the first arm whose `when` is true runs its `next`. At most one arm has `"else": true` and no `when`. Every arm has `next`, and `[]` ends the run. The branch step has no `next` of its own (`ignored_next`). Its output is `{"taken": "<label>"}`.
- `logic.filter@1` continues only when `with.when` is true. When it is false, the run ends `succeeded` and nothing after it spends credits or sends. Put it early.
- `logic.for_each@1` runs body steps once per item: `with.items` is a reference or a formula that gives a list, `with.steps` the body (written like top-level steps), `with.concurrency` 1 to 50 (default 5). Inside the body the current item is `{{item.email}}` and the like. Body edges stay inside the body (`cross_scope_edge`), and a body cannot hold another for each (`nested_for_each`).
- `logic.formula@1` computes values: `with.outputs` maps each output name to a formula.

The graph must have no loop (`cycle`), and every step must be reachable from the trigger (`unreachable`, a warning).

## References

A reference is `{{root.path}}` inside a string in `with` or in a formula.

| Root | What it is |
|---|---|
| `trigger` | the trigger's output, e.g. `{{trigger.signal}}`, `{{trigger.payload.round}}` |
| `account`, `person`, `lead` | the run's record. An account run sees `account`; a person run sees `person` and its `account`; a lead run sees `lead`. |
| `record` | the run's record, whatever its type |
| `run` | `{{run.id}}`, `{{run.createdAt}}`, `{{run.workflowId}}`, `{{run.isTest}}` |
| `item` | the current item, only inside a `logic.for_each@1` body (`item_outside_for_each` elsewhere) |
| a step id | that step's output, e.g. `{{qualify.score}}`, `{{research.summary}}`. The step must run before this one (`reference_not_upstream`). |
| `secrets` | `{{secrets.CRM_TOKEN}}`, only in the `headers` of `http.request@1`, the `secret` of `webhook.send@1` and the `webhookUrl` and `authToken` of `clay.enrich@1`, never in a formula (`secrets_not_allowed`). `code.run@1` gets secrets through its `secrets` list instead: names only (`["CRM_TOKEN"]`), given to the code as environment variables. The secret must exist in the workspace to publish (`missing_secret`). |

The first field after `account`, `person`, `lead` or `place` should be one the record has (`unknown_record_field`, a warning: the reference renders empty). `account`: `id`, `name`, `stage`, `stageChangedAt`, `ownerMemberId`, `fitScore`, `tier` (1 to 10, a hand-set tier first; absent until the account is placed; the stored tier, so after the workspace cuts its tier count it can be past the last tier, which the Tiers page shows as the last one), `signalScore` (0 to 99), `whyNow`, `angle`, `cadenceDays`, `nextTouchAt`, `lastTouchAt`, `source`, `industry`, `fundingRound`, `employeeCount`, `hqLocation`, `linkedinUrl`, `primaryDomain`, `domains`, `kenCompanyId`, `createdAt`, `updatedAt`. `person`: `id`, `fullName`, `firstName`, `lastName`, `title`, `email`, `linkedinUrl`, `kenPersonId`, `createdAt`, `updatedAt`. `lead`: `id`, `firstName`, `lastName`, `fullName`, `title`, `email`, `linkedinUrl`, `location`, `city`, `country`, `companyName`, `companyDomain`, `companyLinkedinUrl`, `campaignId`, `doNotContact`. Each also has `custom.<key>`, which is open. `place`: `id`, `name`, `website`, `domain`, `phone`, `address`, `city`, `state`, `country`, `rating`, `review_count`, `categories`, `maps_url`. A place is read-only: no step saves to it. The account's domain is `{{account.primaryDomain}}`, not `account.domain`; a lead's is `{{lead.companyDomain}}`. A field with no value on one record is left out of it.

The path must exist in that type's output (`unknown_reference`): read `exampleOutput` from `workflows(operation="step-types-get", client_id=..., type="ai.research@1")`. A string that is exactly one reference becomes the referenced value with its type (a number stays a number), so it can fill an input that takes a list or true/false (`"acceptCatchAll": "{{qualify.fit}}"`); validate checks the referenced output's type there (`invalid_input`). Other strings interpolate: empty for null, compact JSON for objects and lists. Strings in `with` resolve references only, never expressions; compute a value with `logic.formula@1` first. `slack.message@1` escapes the text references give it (`&`, `<`, `>`, and special mentions such as `<!channel>` dropped), so only the literal template can mention or link. Inside your own `<target|label>`, a reference that starts the target must give an http, https or mailto link, or a bare host such as `acme.com`, which gets `https://` (else it is dropped), and a `|` in it cannot add a label. A reference there cannot give an object or a list (`structured_value_not_allowed`): write blocks as literal JSON and reference single values inside them.

## Formulas

`when`, branch arm `when`, `logic.filter@1` `when`, `logic.formula@1` outputs and `logic.for_each@1` `items` are formulas.

- Operators: `== != > >= < <= + - * / %`, `and`, `or`, `not` (lowercase), parentheses.
- Literals: numbers, `'text'` or `"text"`, `true`, `false`, `null`.
- Functions (case-sensitive): `lower`, `upper`, `trim`, `contains`, `startsWith`, `endsWith`, `split`, `len`, `now`, `daysSince`, `addDays`, `count`, `first`, `any`, `all`, `in`, `coalesce`, `if`, `round`, `number`, `text`.
- At most 4,000 characters and 256 nesting levels. A string or list a formula builds is capped at 64 KB (`formula_too_large`).
- A condition must give a boolean (`condition_not_boolean`): `{{qualify.score}} >= 70`, `contains(lower({{account.industry}}), 'software')`.

A formula issue's message starts with its own code (`syntax_error`, `unknown_function`, `argument_count`, `type_mismatch`, `invalid_reference`, `formula_too_long`, `formula_too_deep`), and validate reports it as `invalid_formula`.

To turn one plain-words condition into a formula: `workflow_builder(operation="compile-condition", client_id=..., text="the company has more than 50 people", workflow_id=12)`. It returns `formula`, the `references` it uses and `issues`; paste the formula into `when`.

## Code steps

`code.run@1` runs your JavaScript or Python on each record in an isolated sandbox, for logic a formula cannot express. It needs the `workflows_code` feature, which is off until Kenso turns it on for the workspace: while it is off, drafts still validate, but publish mode reports `feature_disabled`, a test answers `feature_disabled` unless the step's output is pinned, and the in-app builder does not offer the step. `workflows(operation="step-types-get", client_id=..., type="code.run@1")` has its schema and example; `examples.md` has a complete workflow.

- `language` is `javascript` or `python`. `code` is at most 65,536 characters.
- JavaScript: `export default function run(inputs, ctx) { ... return { ... }; }` (it may be `async`). Python: `def run(inputs, ctx): ... return { ... }`.
- `code` is never rendered: `{{...}}` inside it stays plain text and is not checked. Put every reference in `inputs`; the code receives that object as `inputs`, with each reference already resolved.
- Return a JSON object. `outputSchema` (a JSON schema of type `object`) states the shape each returned object must match. Later steps read the returned properties like any output (`{{transform.tld}}`), but validate does not check those paths: spell them exactly as the code returns them. A `pattern` in `outputSchema` cannot use lookaround, backreferences, atomic groups, conditionals or very large repetition counts such as `{0,50000}` (`invalid_input`).
- `ctx.skip("reason")` ends the run as skipped.
- `console.log` and `print` lines land in the step log: 50 lines and 8 KB per record, secret values masked.
- Packages: lodash, date-fns and zod (JavaScript); requests and python-dateutil (Python). Nothing else, no installs.
- No network unless `allowedHosts` lists hostnames, at most 20: `api.example.com`, or `*.example.com` for its subdomains. HTTPS only. IP addresses and other entries that are not hostnames are `invalid_input`; `.local`, `.internal` and `.localhost` names, Kenso's own domains and a wildcard over a public suffix, where anyone can register a name (`*.vercel.app`, `*.co.uk`, `*.amazonaws.com`), are `host_not_allowed`: list the exact host (`myapp.vercel.app`) or a wildcard under a domain you own.
- `secrets` lists workspace secret names, at most 10: `["CRM_TOKEN"]`, read as `process.env.CRM_TOKEN` or `os.environ["CRM_TOKEN"]`. Each must exist to publish (`missing_secret`). A `{{secrets.X}}` reference in `inputs` is `secrets_not_allowed`. A header-only secret (one with a `header` in `workflows(operation="workflow-secrets-list", client_id=...)`) is not an environment variable: the sandbox network adds it as its header on requests to its host, so the code calls that host without setting the header, and `allowedHosts` must list the host or a `*.` wildcard one label above it (`secret_host_not_listed`).
- Limits per record: 30 s, 256 MB, 256 KB of output. A record that breaks one fails on its own; the other records go on.
- A record whose code may have run is never run again: when its call to the sandbox failed after it went out, the sandbox stopped it after it started, a worker stopped mid-call, or its result could not be read in time, it fails `code_unknown_outcome`. Check the target before you retry it by hand.
- Free in credits. With `workflows_code` on, a test runs code without `allowedHosts` for real on the test records. Code with `allowedHosts` is simulated (output `{}`) unless the test names the step in `live_steps`.

## Limits

| Field | Meaning |
|---|---|
| `creditsPerMonth` | required to publish: credits the workflow may spend in a month |
| `creditsPerRun` | credits one run may spend |
| `runsPerDay` | runs a day |
| `atLimit` | what happens at a limit: `pause` (the workflow turns `off`), `ask` (the run waits in Needs attention) or `hold` (runs wait until the window resets). Left out, the workflow's spend limits start from the workspace's at-limit rule (`pause` unless the workspace changed it) |

Credits are whole credits. Every number must be more than 0 (`invalid_limits`). `limits` has no other fields: an unknown one is ignored with an `unknown_property` warning.

To start at most one run per record in N days, set `oncePerRecordDays` in the trigger's `with`. Only `trigger.signal@1`, `trigger.website_visit@1`, `trigger.account_hot@1` and `trigger.opportunity_stage@1` take it.

## Save to field

`save` writes a step output onto the run's record. Standard targets:

- Account: `account.name`, `account.stage`, `account.ownerMemberId`, `account.fitScore`, `account.whyNow`, `account.angle`, `account.cadenceDays`, `account.industry`, `account.fundingRound`, `account.employeeCount`, `account.hqLocation`, `account.linkedinUrl`.
- Person: `person.fullName`, `person.firstName`, `person.lastName`, `person.title`, `person.email`, `person.linkedinUrl`.

`account.custom.<key>`, `person.custom.<key>` and `lead.custom.<key>` need a custom field in the workspace. To see the targets a `save` block accepts, including this workspace's custom fields, call `workflow_builder(operation="workflow-fields-list", client_id=..., object="account")`. A target you need that is missing: `workflow_builder(operation="workflow-fields-create", client_id=..., object="account", key="icp_tier", type="text")`, then use `account.custom.icp_tier`. `workflow-fields-update` changes a custom field's label (never its key or type), and `workflow-fields-delete` removes one no published workflow saves to or reads, which frees its key. `account.*` targets work on account and person runs, `person.*` only on person runs, and a lead run saves only `lead.custom.*` (a lead has no standard fields; a target a run cannot write is `invalid_save_target` or `save_target_record_mismatch`).

## Knowledge prompt links

An AI step's text can come from a Knowledge prompt (staff only while Knowledge is dark): the `instructions` of `ai.agent@1` and `ai.qualify@1`, the `prompt` of `ai.prompt@1` and the `focus` of `ai.research@1`. `with.knowledgePromptId` names the prompt and sits next to that text, so it saves with the draft and freezes with a published version. The step always runs its own text; nothing reads the prompt at run time.

- Link, or revert to the prompt: read it with `knowledge_prompts(operation="get", knowledge_prompt_id=...)`, then in one `workflows(operation="update", ...)` set `knowledgePromptId` and copy its `body` into the text. The step is synced while its text equals the body, and edited once it differs.
- Unlink: remove `knowledgePromptId`. The text stays.
- Save a step's text as a template: `knowledge_prompts(operation="create", name=..., type=..., body=<the text>, applies_to=[])`, then link the new id.
- A body change (`knowledge_prompts(operation="update", ...)`) rewrites the text of linked steps still equal to the old body in each workflow's draft, and bumps that draft's version. Published versions never change; publish the draft to ship it. Edited steps keep their text. `usedIn` on the prompt lists every linked step of each draft and published version.
- The id must be a Knowledge prompt of this workspace (`knowledge_prompt_not_found`). A deleted prompt keeps its link and the step its text. The prompt's type need not match the step.
- Write the id as a whole number above 0, as `12` or `"12"`. Any other form (`"012"`, `"+12"`, `" 12"`, `0`, `12.0`) is `invalid_knowledge_prompt_id`.

Leave `knowledgePromptId` out unless the text came from a Knowledge prompt.

## Authoring rules

Write every definition to these, whether you build it, fill a template or write it by hand:

1. `kenWorkflow: "1"`, a `name` under 120 characters, property names exactly as above.
2. Step ids are slugs that never equal a reference root.
3. A `logic.branch@1` step has no `next`; every arm has `next` (`[]` to end the run), and at most one arm is `else`.
4. Every reference names the trigger, a record root, `run`, `item` inside a for-each body, or an upstream step id, and its path exists in that type's output.
5. Every `when` is a boolean formula.
6. `limits` is present with `creditsPerMonth`, `creditsPerRun`, `runsPerDay` and `atLimit` (use `"ask"`), so publish mode reports no `limits_required`.
7. `save` targets are standard fields (or existing custom fields) that match the trigger's record type (a place workflow has none: use `place.deliver@1`).
8. `{{secrets.NAME}}` appears only in the `headers` of an `http.request@1` step, the `secret` of a `webhook.send@1` step and the `webhookUrl` and `authToken` of a `clay.enrich@1` step. A step that sends one writes out its url's scheme, host and port (`https://api.example.com/...`), or takes the whole url from one secret (`{{secrets.CLAY_WEBHOOK_URL}}`): references may fill only the path and query. A `code.run@1` step lists the names in `secrets` (no braces) and its code reads them as environment variables. Publishing a step that sends or lists a secret, or running it live in a test (also when you replay, restart or retry that test run), needs the Integrations permission.
9. On a lead trigger, `campaign.promote@1` runs before any `send.*`, `account.*` or `data.find_people@1` step. Promoting a lead stops every campaign sequence at its company, so say so when you describe the workflow.
10. Every `send.email@1` and `send.linkedin@1` step has `"approval": "required"`.
11. A send, Slack or `crm.*` step that has steps after it carries `"onFailure": "continue"`.
12. After `trigger.webhook@1` (no record): no `campaign.promote@1`, no `ai.research@1`, no `account`, `person` or `lead` references and no `save`. AI steps read the delivery from `{{trigger.fields.email}}` and the like in their `instructions`.
13. `crm.*` steps need a connected HubSpot or Salesforce (`requires` `app:crm`) and the `ingestion` flag (and `crm_sync` for steps that write); `fields` keys are Kenso catalog keys the workspace mapped Kenso-to-CRM (`person.first_name`, `person.last_name`, `person.email`, `person.title`, `person.phone`, `person.linkedin_url` (HubSpot only), `account.name`, `account.domain` by default) or raw CRM api names; `crm.create_opportunity@1` is not retried and needs a `stage` id from the CRM pipeline. A `fields` value that renders null or blank is skipped, never written as a clear, and listed in the step's `fieldsSkipped` output; give the step a `when` (for example `{{verify.email}} != null`) when it has nothing to write without that value.

## Step types

`workflows(operation="step-types-list", client_id=...)` is the catalog: every type with `inputSchema`, `outputSchema`, `example`, `exampleOutput`, `cost`, `requires`, `test` (`live`, `simulate` or `sample`) and `sideEffects`. Filter with `kind` (`trigger`, `source`, `data`, `ai`, `action`, `logic`, `human`, `code`). `workflows(operation="step-types-get", client_id=..., type="send.email@1")` reads one. Copy `example` as the starting `with` and read `exampleOutput` for the paths later steps can reference. In a test run a `simulate` or `sample` step returns its `exampleOutput` unchanged (`send.email@1`'s `touchId` 48213 every time), so check its rendered `input` in the run instead.

The `crm.*` steps act on the workspace's connected HubSpot or Salesforce and cost nothing. `crm.lookup@1` finds a company, contact or deal and returns `found`, `externalId`, `externalUrl`, `fields`, `accountId` and `personId`. `crm.upsert@1` creates or updates a company (keyed by `domain`) or a contact (keyed by `email`), so a re-run is safe, and returns `externalId`, `externalUrl` and `created`. `crm.update@1` changes fields on a record the CRM already has, named by `externalId`, `email` or `domain`, or by the run's record when it has a CRM link, and returns `externalId`, `externalUrl` and `changed`. `crm.create_opportunity@1` opens a deal at a `stage` and returns `externalId`, `externalUrl`, `created` and `opportunityId`. With Kenso's deal sync on and the deal in its pipeline (a blank `pipelineId` takes the settings pipeline), it keeps one deal per opportunity: when the run's account's open opportunity already has a CRM deal, it returns that deal with `created` false and writes nothing; otherwise it links the new deal to that opportunity. Without an open opportunity, or with deal sync off, every run creates a deal. Put `"onFailure": "continue"` on a CRM step that has steps after it: a CRM outage must not stop the email.

The `ads.*` steps build matched audiences on the workspace's connected ad platform (`provider` `google_ads`, `meta_ads` or `linkedin_ads`), cost nothing and need the `ad_audiences` feature. Neither calls the platform: Kenso's audience sync (every 6 hours) creates the audience, uploads hashed emails and removes anyone who unsubscribes, bounces, is blocklisted or deleted. `ads.add_to_audience@1` (`audienceName`, optional `removeAfterDays` and `leadId`) puts the run's lead (a person run's newest lead) into the workflow's own audience, one per platform, and returns `adAudienceId`, `added` and `reason` (`already_in`, `no_email`, `no_lead` or `library_contact`) when not added; with `removeAfterDays` a person leaves that many days after the last run that added them. `ads.sync_campaign_audience@1` takes `campaignId` (a campaign workflow defaults to its own campaign) or `campaignStatuses` (`active`, `draft`, `building`, `ready`, `paused`, `completed`, `error`, `archived`), gives each campaign without one the same audience Settings > Integrations > Ad platforms creates, at most 50 a run, resumes a paused one, makes again one a member deleted (the workflow owns those audiences; use `campaignId` to keep a campaign out) and never deletes; it returns `created`, `alreadyPresent` and `skipped`. Both fail with a setup error (`ad_not_connected`, `ad_needs_reconnect`, `ad_account_required`, `feature_disabled`) until the platform is connected with an ad account picked. A provider Kenso cannot connect yet (`linkedin_ads` before LinkedIn Ads ships) fails the run with `invalid_input`. A workflow's audience keeps syncing after the workflow stops, until each member's window ends. The templates `clickers-to-meta-audience` and `ready-campaigns-to-ad-platform` use them.

`data.find_events@1` (optional `with.monthsAhead`, 1-12, 6 by default; `with.maxSuggestions`, 1-50, 25 by default; `with.minRelevance`, 0-100, 50 by default) runs on a schedule trigger with no record. It reads the workspace's ICP, Knowledge and live target accounts, searches the free public listings of Luma, dev.events, AllEvents and Meetup for in-person, hybrid and online events in the window, skips events the workspace already has as an event or a suggestion, scores the rest and writes the best as Suggested events on Accounts > Events. It never creates an event, a touch or an import. A target account named on an event's page (as speaker, sponsor or exhibitor) raises its relevance. It costs no credits. Its output is `candidates`, `scored`, `suggested`, `skippedKnown`, `sources` (`source`, `reads`, `candidates`, `error`) and the model's `inputTokens` and `outputTokens`; a source that fails reports its `error` and the step still succeeds. It needs the `accounts` and `event_outbound` features. The template `find-relevant-events-weekly` runs it every Monday.

`data.save_email@1` is system-only: it writes the email results of Kenso's own pipelines, is not available to customers, is missing from the catalog, and validate reports `system_only_step` for it in any other workflow. The trigger `trigger.system_contacts@1` (Kenso's `system.email_pipeline`) is system-only the same way. So is `system.send_plan@1` (Kenso's `system.send_plan`): it runs Kenso's send planner for a workspace, as a shadow plan that writes nothing or, once Kenso moves the workspace's sends to the engine, as a live plan that queues them.

## Issue codes

What validate reports beyond the table in the skill body. Each issue carries a `fix`: follow it.

| Code | Meaning |
|---|---|
| `invalid_json`, `invalid_type`, `missing_property` | the JSON does not parse, or a value has the wrong JSON type or is missing |
| `not_a_trigger`, `trigger_as_step` | a step type used as the trigger, or a trigger used as a step |
| `invalid_input` | `with` does not match the type's `inputSchema` |
| `host_not_allowed` | a `code.run@1` `allowedHosts` entry the sandbox refuses: Kenso's own domains, local or internal names, a wildcard over a public suffix (`*.vercel.app`), or a hostname label that is too long or starts or ends with `-` |
| `unknown_record_field` | a warning: `account`, `person` or `lead` followed by a field the record does not have, such as `{{account.domain}}`; it renders empty. The fix names the right field |
| `malformed_reference`, `reference_not_upstream`, `item_outside_for_each` | a reference that does not read, names a later step, or uses `item` outside a for each |
| `invalid_secret_name`, `secrets_not_allowed` | a bad secret name (in a reference or a `code.run@1` `secrets` list), a `{{secrets.X}}` reference outside `http.request` headers, the `webhook.send` secret and the `clay.enrich` `webhookUrl` and `authToken`, or a secret-sending step whose url takes its host from a reference |
| `condition_not_boolean` | a `when` that does not give true or false |
| `structured_value_not_allowed` | a lone reference that gives an object or a list in `slack.message@1`, which takes only text, numbers and true/false from references |
| `branch_arm_target_missing`, `branch_multiple_else`, `branch_duplicate_label` | a branch arm points at no step, has two else arms or repeats a label |
| `for_each_concurrency_out_of_range` | `concurrency` outside 1 to 50 |
| `subworkflow_id_required` | `flow.subworkflow@1` without `workflowId` |
| `system_child_from_customer` | `flow.subworkflow@1` starts one of Kenso's own system workflows; only a system workflow may start it, and a run that tries fails the step |
| `invalid_save_target`, `save_target_record_mismatch` | a save target that does not exist, or does not match the record type |
| `placeholder_not_filled` | a template's `<fill in: ...>` value still in the trigger's or a step's `with`: a warning in draft, an error in publish |
| `knowledge_prompt_not_found` | an AI step's `with.knowledgePromptId` that is not a Knowledge prompt of this workspace (a deleted one is fine); the draft save refuses it too |
| `invalid_knowledge_prompt_id` | an AI step's `with.knowledgePromptId` not written as a whole number above 0 (`12` or `"12"`: no leading zero, sign, spaces or decimals); the draft save refuses it too |
| `invalid_limits` | a limit at 0 or below, or an unknown `atLimit` |
| `duplicate_id`, `unknown_target`, `cross_scope_edge`, `nested_for_each`, `cycle`, `unreachable`, `ignored_next` | graph problems: repeated ids, `next` to a missing step, edges out of a for-each body, nested for each, loops, steps the trigger never reaches, `next` on a branch |
