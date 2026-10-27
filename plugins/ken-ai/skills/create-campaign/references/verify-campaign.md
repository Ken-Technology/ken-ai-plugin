# Verify Campaign Skill

Final read-only gate after campaign-configuration and the copy/prompt skills (it does not write strategy, sequences, or prompts): confirm a campaign is fully and correctly set up before launch. Checks campaign settings, lists, segments, sequences, AI variables, tracking links, scoring, the prelaunch gate (launch readiness, domains, warmup, placement, rendering, canary) and a list audit, using **MCP tools only**.

This skill reads and reports PASS or FAIL per check. It never writes, launches, sends, test-sends, pauses, resumes, exports, starts workflows, triggers AI runs, or starts a placement test or a domain health check. It never fixes anything on its own: it lists each fix with its exact call, and after the user's yes the configuration stage (campaign-configuration) or the stage that owns the artifact applies it (see Proposed fixes). Launch is the user's button.

> **Platform reference**: campaign status lifecycle and enum tables live in `references/campaign-status-enums.md` and `references/enums.md`. The full output template is `references/output-format.md`. Load them via `load_skill` / skill resources when you need exact values.

## Required inputs

Accept either of:

- **campaign_id** (numeric campaign ID)
- **campaign name** (case-insensitive match, see Step 1)

Do not accept local paths, workspace folders, or shell-side campaign directories. All context is platform state.

## Workflow

### Step 1: Resolve Campaign ID

**If campaign_id provided:** use it directly.

**If campaign name provided:**

1. Call `campaigns(operation="list", q="<name>", limit=100)`; follow `cursor` while `pagination.hasMore` is true. Or call `campaign_ops(operation="status", campaign_name="<name>")`, which resolves the name and returns `candidates` on ambiguity.
2. Match case-insensitively (prefer an exact match when unique).
3. If multiple matches, show candidates (`id`, `name`) and ask the user to pick.
4. If zero matches: stop and ask for a correct id or name.

**If nothing provided:**

> "Provide a campaign ID or campaign name to verify."

### Step 2: Gather Data (MCP only)

**Phase A - campaign-level (prefer parallel):**

1. **`campaign_ops(operation="status", campaign_id=X)`** - one read returning `data.campaign` (the full campaign DTO: sources, enrichments, verifications, `campaignAiWorkflows`, `campaignWebsitePageSelections`, `aiFlowModelConfigurations`, limits, dedup, `campaignStatuses`; fields in `references/enums.md`), `data.segments` (`description`, `isDefault`, `segmentationType`, `abTestPercentage`), `data.statistics`, and `data.pipeline` (Import through Sending; each stage has `total`, `processed`, `failedCount`, `stuckCount`, `status`, and Verification and Qualification carry a `breakdown`).
2. **`campaigns(operation="get", campaign_id=X)`** - lifecycle `status` string (see Status Label Map), send schedule (`sendingDays` 0=Sunday..6=Saturday, `sendingStartTime`, `sendingEndTime`, `sendingTimezone`, `maxEmailsPerDay`; each omitted when unset), `sendingStatus`, `sendingError`, `unsubscribeLink`, `replyTo`, `kind`, `roleId`, `contactCount`.
3. **`campaign_flow(operation="can_launch", campaign_id=X)`** - report-only launch readiness: `data.ok`, `data.reasons` (unmet conditions, each `code`, `message`, `fixUrl`) and `data.warnings`. `ok=true` is not a promise that launch succeeds.
4. **`campaign_flow(operation="list-ai-workflows", campaign_id=X)`** - the attached AI workflows as `{id, flow}` (ids 1 qualification, 2 personalization, 3 rewriting, 4 segmentation, 6 scoring).
5. **`lists(operation="list", campaign_id=X)`** - campaign lists (data sources / contact counts).
6. **`segments(operation="list", campaign_id=X)`** - only if you need fields beyond `data.segments` (`segmentationType` is `manual`, `ai` or `ab_test` there; `segments(operation="get", segment_id=...)` adds `filterCriteria`).
7. **`prompts(operation="list", campaign_id=X)`** - every prompt row (`name`, `prompt`, `flow`, `segmentId`, `order`, `toOutput`, `toRewrite`, and the qualification fields); follow `cursor`. Filter by `flow`: `qualification`, `personalization` (AI variables), `rewriting`, `scoring`. `segmentation` rows keep the Segmentation workflow attached; they are not what assigns contacts (see Segmentation Checks).
8. **`models(operation="list", campaign_id=X)`** - model overrides (only non-empty when the user set one; `aiFlowModelConfigurations` on the campaign DTO carries the same). Workspace admins only; if not visible to this account, SKIP the model checks.
9. **`tracking_links(operation="tracking-links-list", campaign_id=X)`** - all tracking links for the campaign (`id`, `name`, `domainName` = destination URL, `textValue`); follow `cursor`.
10. **`campaigns(operation="get-scoring", campaign_id=X)`** - scoring flag `isEnabled` (no score rows).

**Phase B - AI variables (personalization):**

AI variables are the `personalization` rows of `prompts(operation="list", campaign_id=X, segment_id=Y, flow="personalization")`, per segment. A row with no `segmentId` is campaign-level: count it as inherited, not as segment-owned. Per-variable fields: `name`, `prompt`, `order`, `toOutput`, `toRewrite`, `fallbackIfEmpty`, `isRequiredForSending`. Treat these as the AI variables for checks 30-35, 55b, 55c.

**Phase C - Per-segment email sequences:**

For each segment: `email_sequences(operation="segment-email-sequences-get", segment_id=...)`; add `email_sequences(operation="list-versions", segment_id=...)` when you need every version. Each step comes back as `id`, `stepOrder`, `variant` (`a`-`d`), `name`, `subject`, `body` (HTML), `bodyFormat`, `waitDays`, `isActive`, `openTrackingEnabled`, `handwrittenEnabled`, `handwrittenBackground`, `handwrittenIntro`. Scan each step's `subject` and `body` for:

- `{{tracking_link:ID}}` tokens
- AI variable placeholders like `{{First Line}}`, and any square-bracket stand-in like `[First Line]` (the copy lint rejects it)
- leftover raw `https://` URLs that should have been converted

**Phase D - Prelaunch and list reads:**

- Sending inboxes: `inboxes(operation="list", role="sending")` (`status`, `warmup.daysLeft`, `sendBlock`, `healthScore`). The campaign's own inbox pool is `campaign_ops(operation="get", campaign_id=X)`, which only staff can run; everyone else checks every sending inbox in the workspace and says so.
- Domains: `domain_setup(operation="list")` - the latest stored DNS and blocklist snapshot per sending domain (status codes 1=Pass, 2=Fail, 3=Unknown; `checked` is its date). `domains(operation="get-health", domain_id=...)` adds the certificate; `domains(operation="get-dns", domain_id=...)` the tracking DNS status.
- Placement: `approvals(operation="placement-tests-list", campaign_id=X)`, newest first (`inboxRate`, `spamRate` are fractions 0-1); `analytics(operation="placement-tests-get", test_id=...)` for one test. Workspace admins only (check 64).
- Rendering: `email_sequences(operation="segment-email-sequences-preview", segment_id=..., use_random=True)`, 2-3 calls per segment.
- Contacts for the list audit: `contacts(operation="list", campaign_id=X, limit=200)` (`email`, `emailValidity`, `country`, `countryIso2`); follow `cursor` while the campaign is small enough to read whole (a few thousand contacts), else audit the first 200 and say the counts come from a sample.
- Blocklist: `lists(operation="blocklist-entries-list", entry_type="domain")` and `entry_type="email"`.

**Phase E - The plan (for drift checks only):**

For checks 24 / 53, with Knowledge on: `knowledge(operation="list", tag="campaign-<campaign id>")`, then `knowledge(operation="get", file_id=...)` for the campaign's `Campaign plan - <campaign name>` file. Knowledge needs the workspace's `knowledge` feature (staff otherwise). Without Knowledge, compare against a plan the user shared in this conversation. No plan => SKIP those checks (not FAIL).

**Export readiness:** read the Export and Sending stages from `data.pipeline`. Never run an export from this skill; if the user wants a CSV sample, tell them it is a separate request.

### Step 3: Run Check Matrix

Execute ALL applicable checks below. Track each result as:

- **PASS** - condition met
- **FAIL** - critical issue; campaign will not work correctly, or the prelaunch gate blocks launch
- **WARN** - non-critical; may work but suboptimally
- **SKIP** - not checked; always give the reason (not applicable, not visible to this account, or no tool reads it yet)
- **INFO** - informational only (does not count as fail)

---

## Check Matrix

Fields: campaign DTO from `campaign_ops` status unless noted.

### Campaign Level Checks

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 1 | Has campaign segments | segments list not empty | FAIL | "No campaign segments configured." Prefer the segment count from `data.segments`. |
| 2 | Campaign status | lifecycle is building / ready / active (sending); WARN if draft / paused / completed / error / archived | WARN | "Status is {name} ({n})." Show the name and number from `references/campaign-status-enums.md`. Launching is the user's decision; this skill never launches. |
| 3 | Data sources | `campaignDataSources` includes 17 (the built-in people search) | FAIL | "No built-in people search data source. Expected [17]." |
| 4 | Data enrichments | `campaignDataEnrichments` includes [3, 4] (website content + website metadata) | WARN | "Missing website enrichments. Expected [3, 4]. Found: {list}." |
| 5 | Email enrichments | `campaignEmailEnrichments` includes 8 and 3 | FAIL | "Missing email finders. Expected at minimum 8 and 3." |
| 6 | Email verification | `campaignEmailVerifications` includes 1 | FAIL | "Missing email verification. Expected verifier 1." |
| 7 | AI workflows (core) | `campaignAiWorkflows` includes 1 (Qualification), and 4 (Segmentation) when any non-Default segment is an AI segment (`segmentationType` 2 / `ai`). Manual segments and percentage arms need no 4 | FAIL | "Missing AI workflows. Expected Qualification (1){ and Segmentation (4) for AI segments}." |
| 8 | Personalization attached | If any segment has personalization variables, `campaignAiWorkflows` includes 2 | FAIL | "AI variables exist but Personalization (2) is not attached. Saving a variable does not attach it." |
| 9 | Contact limit | `contactLimit` > 0 | FAIL | "Contact limit is 0 or not set." |
| 10 | Duplication scope | `duplicationScope` is not null | WARN | "Duplication scope not set." Its meaning is check 70. |
| 11 | Allow personal emails | `allowPersonalEmails` is false | WARN | "allowPersonalEmails=true - campaign will send to gmail/yahoo etc. Intended?" Counts are check 72. |
| 11b | Recently-emailed dedup | INFO only - report `recentlyEmailedDedupDays` (off if null) | INFO | "Recently-emailed dedup: {n} days / off. For reactivation/winback this should usually be ON; for fresh cold lists, off is fine." |

### Campaign Settings Checks (from `campaigns` get)

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 12 | Sending days | `sendingDays` is a non-empty array | FAIL | "sendingDays not set. Campaign won't send. Default: [1,2,3,4,5] (Monday-Friday, 0=Sunday)." |
| 12b | Weekend sending | `sendingDays` contains neither 0 (Sunday) nor 6 (Saturday), or the campaign owner asked for weekend sending | WARN | "Campaign sends on weekends (sendingDays includes 0 and/or 6). Ask the campaign owner. Pass confirm_weekend_sending=true only after they ask for weekend days." |
| 13 | Sending start time | `sendingStartTime` is set (HH:MM) | FAIL | "sendingStartTime not set. Default: '10:00'." |
| 14 | Sending end time | `sendingEndTime` is set (HH:MM) | FAIL | "sendingEndTime not set. Default: '18:00'." |
| 15 | Sending timezone | `sendingTimezone` is set (IANA name) | FAIL | "sendingTimezone not set. Default: 'America/New_York'." |
| 16 | Max emails/day | `maxEmailsPerDay` > 0 | FAIL | "maxEmailsPerDay not set. Expected min(1000, ceil(contact_limit * 4 / 30))." |
| 17 | Website page selections | If [3, 4] in data enrichments: `campaignWebsitePageSelections` has at least 1 enabled page | FAIL | "Website enrichments enabled but no campaignWebsitePageSelections. Default: Home (pageType=1)." |

### Campaign List & Contact Checks

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 18 | Campaign lists exist | At least 1 campaign list, OR the Import stage is still empty/not started | WARN | "No campaign lists found. If import wasn't run, run the campaign-configuration import step." |
| 19 | Lists have contacts | If lists exist, at least 1 has a contact count > 0 | WARN | "Lists exist but have no contacts. Import may still be processing - check the Import stage in the pipeline." |

### Segmentation Checks (description-based)

AI Segmentation asks one choice question per contact over the campaign's AI segments, each offered with its `description` (its name when the description is blank), with Default listed last under fixed fallback text; a confident match keeps the chosen segment, otherwise the contact lands in Default. Vague descriptions therefore push contacts into Default. Manual segments are never offered (contacts reach them by filter or by hand), and the Default segment's own description is never read. `segmentation` prompt rows do not change this; do not FAIL on them.

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 20 | Default segment exists | At least 1 segment with isDefault=true | FAIL | "No Default segment. Required as the catchall for contacts no other segment takes." |
| 21 | Default segment description | INFO only: report its length. Assignment never reads it, so empty is fine | INFO | "Default description: {n} chars (not used for assignment)." |
| 22 | Default segment has sequence | Default segment has an email sequence with at least 1 step | FAIL | "Default segment has no email sequence. Contacts assigned to Default will have nothing to send. Copy a fallback segment's sequence into Default." |
| 23 | AI segment descriptions | Every non-default AI segment (`segmentationType` 2 / `ai`) has a non-empty `description`. SKIP manual segments (no description needed) and pure percentage mode | WARN | "Segment '{name}' has no description. AI Segmentation matches on its name alone, so most contacts will land in Default." |
| 24 | Segment inventory vs the plan | If the campaign's plan was found (Phase E): count/names of non-default segments roughly match the plan | WARN | "The plan defines {plan_count} segments, the campaign has {live_count}. Review drift." SKIP if no plan. |

### AI Qualification Checks (if workflow 1 attached)

Model configs are SKIPPED by default - the backend auto-selects models unless the user created an override. Only check a model if an override exists.

Qualification asks one yes/no question per contact; the Qualification pipeline breakdown (Qualified / Unqualified / Unprocessed) is the authoritative split, and a contact already judged is skipped by later runs.

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 26 | Qualification prompt exists | At least 1 `qualification` row from `prompts` list | FAIL | "No Qualification prompt found." |
| 27 | Qualification fields populated | At least 2 of {audienceDescription, qualificationCriteria, disqualificationCriteria} populated | FAIL | "Qualification requires at least 2 of 3 structured fields to be populated." |
| 28 | Qualification model (if override) | A qualification override's model id is returned by `models(operation="ai_supported_models", flow=1)` | WARN | "Using {model} for Qualification override. Confirm it's still in the allowed list - the catalog is dynamic." |

### AI Personalization Checks (per segment)

Run these per segment, including Default.

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 29 | Email sequence per segment | Each active segment has an email sequence | FAIL | "Segment '{name}' has no email sequence." |
| 29b | Active version per step | Each step has at least one variant (a-d) with `isActive=true` | FAIL | "Segment '{name}' Email {N}: every version is inactive - nothing will send for this step." |
| 30 | AI variables per segment | Each active segment has at least 1 personalization variable | FAIL | "Segment '{name}' has no AI variables." |
| 31 | Variable names valid | Each variable has a non-empty `name`, length <= 30 chars | FAIL | "Segment '{name}' variable has missing/oversized name: '{var}'." |
| 32 | Variable prompts valid | Each variable has a non-empty `prompt`, length > 10 and <= 4096 | FAIL | "Segment '{name}' variable '{var}' has empty or oversized prompt." |
| 33 | Names unique per segment | Variable names are unique (case-insensitive) within a segment | FAIL | "Segment '{name}' has duplicate variable name: '{var}'." |
| 34 | Orders positive | All variable `order` values are positive integers | FAIL | "Segment '{name}' has variable with invalid order." |
| 35 | Placeholders covered | Every `{{Variable Name}}` placeholder in the segment's live `subject` and `body` matches a personalization variable by name (ignore lead fields like `{firstName}` and `{{tracking_link:ID}}`). Any square-bracket placeholder (`[First Line]`) FAILs: the copy lint rejects it | FAIL | "Segment '{name}' sequence references variables without matching prompts: {missing}." / "Segment '{name}' Email {N} has a square-bracket placeholder {placeholder}; write it as {{Variable Name}}." |
| 36 | Personalization model (if override) | A personalization override's model id is in `models(operation="ai_supported_models", flow=2)` | WARN | "Using {model} for Personalization override. Confirm the id is still in the allowed list." |
| 37 | Company context populated | `workspace(operation="get", workspace_id=<campaign clientId>)` has a non-empty `companyContext` | WARN | "Workspace company context is empty. Backend auto-generates system prompts from this field - without it, personalization will lack company context." |

### AI Rewriting Checks (if workflow 3 attached or variables use rewrite)

Rewriting prompt is optional - backend applies a default when none is set. Rewriting runs only while workflow 3 is attached.

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 38 | Custom rewriting prompt | Custom `rewriting` prompt exists OR backend default in use | PASS (info) | Display which path is active |
| 39 | Custom prompt quality | If custom exists, length > 10 and <= 4096 | WARN | "Custom rewriting prompt is empty or too short. Delete it to use the backend default, or fill it in." |
| 40 | Rewriting model (if override) | A rewriting override's model id is in `models(operation="ai_supported_models", flow=3)` | WARN | "Using {model} for Rewriting override. Confirm the id is still in the allowed list." |

### Lead Scoring Checks (if workflow 6 attached or the user asked for scoring)

Scoring is opt-in per campaign. Scores persist 1-10 (1 = no fit, 10 = perfect fit) as the contact's `qualityScore` and leave qualification state untouched. The scoring prompt is auto-built from the qualification fields; an optional `scoring` system row with `scoring_criteria` adds extra tuning.

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 57 | Scoring workflow attached | `campaignAiWorkflows` includes 6 when the user asked for scoring | WARN | "Scoring requested but workflow 6 not attached." |
| 58 | Scoring flag | `campaigns(operation="get-scoring", campaign_id=X)` returns `isEnabled=true` when 57 applies. It does not return scores | WARN | "Scoring enabled but no scores stored yet. Scoring runs only on a manual trigger, over Qualified contacts." |

### Tracking Link Checks (live sequences + tracking links, one link per URL per segment)

Tracking links are **per-segment, per-URL**, the convention email-copywriting pushes with: each segment has one tracking link per destination URL, named `{segment-slug} url_{n}`, and every email, variant and occurrence of that URL in the segment reuses it. Links are never shared across segments: the same URL in two segments is two tracking links. Source of truth is the **live** sequence `body`.

**Run per segment:**

1. From each step's `body`, collect every `{{tracking_link:ID}}` token (including those inside `<a href="{{tracking_link:ID}}">`) with its step and variant.
2. Resolve each ID against the `tracking_links` list (or `tracking_links(operation="tracking-links-get", tracking_link_id=...)`).
3. Also flag raw `https?://` URLs still present in body (should be tokens by launch time; skip LinkedIn profile URLs that are clearly not CTAs).

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 41 | Tracking tokens present when CTAs expected | If body has CTA-like raw URLs, FAIL unless intentionally untracked; if body has no URLs and no tokens, SKIP | FAIL/WARN | "Segment '{name}' Email {N}: raw URL(s) remain without {{tracking_link:ID}} tokens." |
| 42 | Token IDs resolve | Every `{{tracking_link:ID}}` in body resolves to an existing tracking link for this campaign | FAIL | "Segment '{name}': tracking token ID {id} does not resolve to a tracking link on this campaign." |
| 43 | One link per URL | Within the segment, every occurrence of the same destination URL uses one tracking link ID | WARN | "Segment '{name}': {url} has {n} tracking links ({ids}). Reuse one link per URL per segment." |
| 44 | No cross-segment reuse | No tracking link ID used by this segment appears in any other segment's body | FAIL | "Segment '{name}' reuses tracking link IDs from segment '{other}': {ids}. Each segment needs its own link set." |
| 45 | Link name filled | Every referenced tracking link has a non-empty `name` (convention: `{segment-slug} url_{n}`) | FAIL | "Tracking link ID {id} has no name." |
| 46 | Link URL filled | Every referenced tracking link has a non-empty `domainName` (the destination URL) | FAIL | "Tracking link '{name}' has no destination URL (domainName)." |
| 47 | Link variable name | SKIP. The tracking link has no variable name; the token is the id | SKIP | "No variable name field on tracking links." |
| 48 | Link text_value filled | Every referenced tracking link has a non-empty `textValue` (display text; create takes `text_value`) | FAIL | "Tracking link '{name}' has no textValue." |
| 49 | Tokens live in href | Body CTAs use `<a href="{{tracking_link:ID}}">display</a>`. Bare colon-id tokens are OK (backend wraps at save/send). A leftover occurrence slot `tracking_link_N` in double braces FAILs | FAIL | "Segment '{name}' Email {N}: leftover occurrence-slot tracking_link_N - replace with colon-id href." |

### Live percentage / Subject Line / rewriting alignment

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 53 | Segment descriptions vs the plan | If the plan was found: live segment descriptions contain or semantically match the plan's segment criteria | WARN | "Segment '{name}' description drifts from the plan." SKIP if no plan. |
| 55a | A/B weights sum (percentage mode) | If any segment is AbTest / has `abTestPercentage` set (or `segmentationMode` is 3): all arm weights including Default are integers summing to exactly 100 | FAIL | "A/B arm weights sum to {sum}, expected 100." SKIP when not in percentage mode. |
| 55b | Subject Line output prompt exists | Per segment: a personalization variable named "Subject Line" exists with `toOutput`=true and `toRewrite`=0 | FAIL | "Segment '{name}' has no Subject Line output variable (toOutput=true, toRewrite=0) - workflow start will fail." |
| 55c | Rewriting workflow matches usage | If any non-Subject-Line personalization variable has `toRewrite` >= 1 OR a custom `rewriting` prompt exists: `campaignAiWorkflows` includes 3. If nothing uses rewriting, 3 absent is fine | WARN | "Rewriting usage and workflow 3 disagree for segment '{name}'." |

### Quality Checks

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 56 | Campaign name | Not generic (not matching: test, campaign 1, untitled, draft, new campaign) | WARN | "Campaign name '{name}' looks generic. Consider a descriptive name." |

### Prelaunch Gate

The gate a campaign passes before its first send. Every check reports PASS or FAIL (or SKIP with the reason); none of them launches, sends or starts a test.

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 60 | Launch readiness | `can_launch` `data.ok` is true. Each `reasons` entry is a FAIL with its message and `fixUrl`; each `warnings` entry a WARN. `notReady` on a Draft or Building campaign is expected until its workflows finish: report it as INFO with the status. `noReplyIngestPath` and `migrationSourceStillActive` are advisory: WARN | FAIL | "{code}: {message}" |
| 61 | Domains authenticated | Every sending domain's snapshot shows `spfStatus`, `dkimStatus` and `dmarcStatus` = 1 (Pass) | FAIL (2) / WARN (3, or no snapshot) | "{domain}: {record} fails." The snapshot checks the records exist and are valid, not DMARC alignment of each message; when `checked` is old or missing, say so and offer a fresh check (Proposed fixes). |
| 62 | Not blocklisted | No sending domain has `blacklistStatus` 2 (Listed) | FAIL | "{domain} is listed on {listedCount} blocklist(s)." |
| 63 | Inboxes warmed | Every sending inbox has `warmup.daysLeft` 0 and no `sendBlock`, and `status` is `active`. Plan for 14-21 days of warmup before cold sends | FAIL | "{inbox}: {n} warmup days left" / "{inbox}: send block {reason} until {until}." |
| 64 | Placement test | The newest placement test for this campaign has `inboxRate` >= 0.5. Under 0.5 blocks launch unless a person overrides it (record who and why). No test yet: WARN | FAIL / WARN | "Latest placement: {inboxRate} inbox, {spamRate} spam ({date})." Anyone but a workspace admin gets SKIP "not checked: placement tests need a workspace admin". |
| 65 | Merge fields render | In 2-3 previews per segment, no subject or body shows a literal `{...}` / `{{...}}` token, an empty AI variable, or a broken greeting. `can_launch` warning `blankAiOutputHeld` counts here | FAIL | "Segment '{name}' Email {N}: {token} renders empty/literal for contact {id}." |
| 66 | Tracking domain serves HTTPS | No `noTrackingDomain` warning; the sending domains' tracking DNS is `verified` and the certificate is valid (`domains` get-dns / get-health) | FAIL (`dead`) / WARN (`unchecked`) | "{domain}: tracking DNS {status}, certificate {state}." |
| 67 | Unsubscribe and reply routing | `unsubscribeLink` is true; replies reach an inbox the workspace reads (`replyTo`, or the workspace default) | WARN | "Unsubscribe headers off" / "{code}: {message}." |
| 68 | Schedule and caps | Checks 12-16 pass, and `maxEmailsPerDay` fits the sending inboxes' daily capacity | FAIL | See 12-16. |
| 69 | Canary plan | The user agreed a first send of 50-200 of the best-verified leads, watched for 24-48 hours before the rest | WARN | "No canary plan agreed." Watch: hard bounces under 2% and no spam complaints. Pause the campaign at about 3% bounces or 100 bounces; an inbox at about 5% in 24 hours gets zero daily sends; below about 100 sends, judge by counts, not rates. |

### List Audit

Report counts and what would be dropped, never the contacts themselves. Counts from a sample say so.

| # | Check | Pass Condition | Fail/Warn | Details |
|---|-------|---------------|-----------|---------|
| 70 | Duplicates | INFO: report `duplicationScope`. 0 = contacts already in any other campaign of this workspace are dropped at import; 1 = only duplicates inside this campaign are dropped. Same-campaign dedup is always on. A workspace-level duplicate setting can override both (for example keep every duplicate) | INFO | "Dedup against other campaigns: {on/off}." No tool reports how many duplicates were dropped, and there is no bulk "do we already hold these people" lookup across the workspace; one person is `contacts(operation="list", email=...)`. |
| 71 | Blocklist | No audited contact's email or email domain is on the blocklist | WARN | "{n} of {audited} contacts match blocklist entries ({sources})." |
| 72 | Free-mail addresses | With `allowPersonalEmails` false, no audited contact has a free-mail address (gmail.com, yahoo.com, outlook.com, hotmail.com, icloud.com and the like) | WARN | "{n} of {audited} contacts use free-mail addresses." |
| 73 | Excluded countries | No audited contact's `country` / `countryIso2` is one the plan excludes. Country exclusions live in the search filters (`excludeCountries`) and the segment filters; no campaign setting blocks a country | WARN | "{n} contacts in excluded countries: {countries}." SKIP when the plan excludes none. |
| 74 | Email validity | Report the Verification breakdown (Safe, Verified, CatchAll, Risky, Invalid, Unknown, NoEmail). Invalid and NoEmail never send. Safe + Verified reaches `contactLimit` | WARN | "{safe+verified} sendable of {contactLimit} target; {risky} risky, {catchAll} catch-all, {unknown} unknown, {invalid} invalid." |

### Optional pipeline notes (not numbered core FAILs)

When useful, surface from `data.pipeline` (or `campaign_ops(operation="pipeline", campaign_id=X)`): stuck/failed counts and `stalledSince` on Qualification, Personalization, Export, Sending; whether Export has progressed; and `sendingError` from `campaigns` get (current hard-failure text; it clears itself and never pauses the campaign). Informational unless the user asked about post-processing health.

---

## Output Format

Present results as one verification table: header (campaign name, ID, workspace ID, status `{Name} ({n})`, segment count, pipeline summary), then `| # | Category | Check | Status | Details |` rows for every executed check, then `Summary: {pass} passed, {fail} failed, {warn} warnings, {skip} not checked`, then **CRITICAL** and **WARNINGS** issue lists with the exact fix for each, ending with "Want me to apply the critical fixes?". Full template and worked example: `references/output-format.md`.

Name sources, enrichments and verifications by number and role ("email finder 8"), never by the provider names in `references/enums.md`: provider names never reach clients.

### Status Label Map

0=Draft (`draft`), 1=Building (`building`), 2=Ready (`ready`), 3=Sending (`active`), 4=Paused (`paused`), 5=Completed (`completed`), 6=Error (`error`), 7=Archived (`archived`). Display as `{Name} ({n})`, e.g. "Draft (0)". Canonical reference: `references/campaign-status-enums.md`.

> Do NOT use the legacy `Status` enum (`0=ToScrape...5=Draft`, the DTO `status` field and `sourceStatus`) or the pseudo-state "To Do". The lifecycle is `campaignStatuses` on the DTO or `status` on `campaigns` get.

### Workflow Label Map

1=Qualification, 2=Personalization, 3=Rewriting, 4=Segmentation, 5=ToneOfVoice, 6=Scoring (opt-in lead-quality scoring, 1-10).

### Expected Values (defaults the checks compare against)

- Data source **17** (built-in people search); data enrichments **[3, 4]** (website content + website metadata); website page **1=Home**
- Email enrichments default **[3, 5, 8]** (check 5 requires at least 8 and 3); email verifications default **[1, 5, 7]** (check 6 requires 1)
- Segment types 1=Manual, **2=AI** (default), 3=AbTest; duplication scope 0=Campaign (dedup against other campaigns), **1=CampaignSegment** (this campaign only; the configuration default)
- Prompt type **system** (qualification, rewriting, AI variables)

Every other value (all data sources, enrichments, verifications, page types, list types): `references/enums.md`.

---

## Proposed fixes

This stage writes nothing. It lists each fix with its exact call; after the user approves the list, the configuration stage (campaign-configuration) or the stage that owns the artifact applies it, one at a time, then this stage runs again.

1. Qualification: find the row with `prompts(operation="list", campaign_id=X, flow="qualification")`. Change it with `prompts(operation="update", prompt_id=..., changes={"audience_description": ..., "qualification_criteria": ..., "disqualification_criteria": ...}, confirm=False)`; when none exists, `prompts(operation="create", campaign_id=X, flow="qualification", prompt_type="system", prompt="structured", audience_description=..., qualification_criteria=..., disqualification_criteria=..., order=1, to_output=False, to_rewrite=0, confirm=False)`.
2. AI variables: one call per variable. New: `prompts(operation="create", campaign_id=X, segment_id=Y, flow="personalization", prompt_type="system", name="First Line", prompt=..., order=<n>, to_output=True, to_rewrite=0, confirm=False)`. Existing (same name): `prompts(operation="update", prompt_id=..., changes={"prompt": ...}, confirm=False)`. A variable you do not touch stays as it is; remove one with `prompts(operation="delete", prompt_id=..., confirm=False)` only when the user asked. Saving variables does not attach workflow 2: see fix 5.
3. Rewriting: `prompts(operation="create", campaign_id=X, segment_id=<optional>, flow="rewriting", prompt_type="system", name="Rewriting", prompt=<instructions>, order=1, to_output=False, to_rewrite=0, confirm=False)`; change with `prompts(operation="update", prompt_id=..., changes={"prompt": ...}, confirm=False)`; clear with `prompts(operation="delete", prompt_id=..., confirm=False)` to fall back to the default.
4. A prompt write that would refresh AI results the campaign already produced answers 409 with the impact instead of writing. Show the impact to the user; repeat with `confirm` set to true only after they agree.
5. AI workflows: read with `campaign_flow(operation="list-ai-workflows", campaign_id=X)`, then `campaign_flow(operation="replace-ai-workflows", campaign_id=X, ai_workflow_ids=[...])` with every id the campaign should run (a full replace: an id left out is detached). While the campaign is scheduled, launching or sending, only adding 3 and changing 6 are allowed.
6. Segment descriptions / weights: `segments(operation="update", segment_id=X, description=..., ab_test_percentage=...)`.
7. Schedule and limits: `campaigns(operation="update", campaign_id=X, sending_days=[...], sending_start_time="10:00", sending_end_time="18:00", sending_timezone="America/New_York", max_emails_per_day=..., contact_limit=...)`. Absent fields stay unchanged; a schedule change queues a rebuild. `status` is not a patch field. On a client's campaign that is sending, launching or scheduled, a schedule or volume change needs a yes that names that client, and `sending_days_requested_by` carries its source ("Jane Doe (client) on the 2026-10-19 call"); a failed check is not a request, so ask the campaign owner first.
8. Data sources, enrichments, email enrichments/verifications, website page selections, duplication scope, personal emails, and recently-emailed dedup have no MCP write: tell the user to fix them in the campaign's settings in the app, then re-verify.
9. Model override (only when the user asked for one, workspace admins only): `models(operation="create", campaign_id=X, flow="personalization", model=...)`.
10. Tracking links: `tracking_links(operation="tracking-links-create", campaign_id=X, name="<segment-slug> url_<n>", domain_name="<destination url>", text_value="<display text>")`, one per destination URL per segment, reused by every email and variant that links to it. Never reuse a tracking link across segments.
11. Retrofitting tokens in an existing sequence: `email_sequences(operation="segment-email-sequences-replace", segment_id=Y, steps=[...])` with the changed `body` containing `<a href="{{tracking_link:ID}}">display</a>`. It is a full replace: send every step with its `id`, `step_order`, `variant`, `name`, `subject`, `body`, `body_format` and `wait_days`, and carry `isActive`, `openTrackingEnabled`, `handwrittenEnabled`, `handwrittenBackground` and `handwrittenIntro` from the read unchanged; a step left out is deleted. Omitting `openTrackingEnabled` turns open tracking off, and omitting `handwrittenEnabled` turns the handwritten letter off. A handwritten step takes no links (the save fails with a 400 naming the step): leave its link out, or turn the letter off only after the user's yes. The steps are in `references/html-serializer.md` (Retrofitting tracking links). On a client's campaign that is already sending, this is a sequence change and needs a yes that names that client, with its source. Then `email_sequences(operation="save-version", segment_id=Y, name="<short label>")` once for the segment. Never add a variant row to hold a fix: variants are live A/B arms.
12. Domains and inboxes: a fresh DNS and blocklist snapshot is `domain_setup(operation="run")` (poll with `domain_setup(operation="poll", run_id=...)`); a failing record is fixed at the domain's DNS host, then re-checked. Warmup that is still running needs time, not a write.
13. Placement test (workspace admins, after a yes): `approvals(operation="placement-tests-create", campaign_id=X, random_scope=True)`, or with `domain_id=...` or `inbox_id=...`. It sends the live copy to seed inboxes and counts against the workspace's placement-test quota.
14. Canary: the user picks the first batch and the pace; `campaigns(operation="update", campaign_id=X, ramp_up_days=...)` or a first-days `max_emails_per_day` carries it.
15. After fixes, re-run verification to confirm.

**Do NOT auto-apply fixes without user approval.** Always present the fix list and wait for confirmation. Launching, starting workflows, scoring runs, test sends and exports are not fixes: hand them back to the user.

Never use non-MCP transports or ad-hoc network clients for reads or writes.

---

## Recruiting campaigns

For a campaign with `kind` `recruiting`, add three rows under a Recruiting category:

- The campaign has a `roleId` (`campaigns` get); without the `recruiting` feature the role cannot be read, so SKIP with that reason.
- The channels match the plan: `campaigns(operation="get-linkedin-settings", campaign_id=X)` shows LinkedIn on for a LinkedIn-first or LinkedIn-only plan, and off for an email-only plan.
- No segment description, qualification field or step names or targets age, gender, race, religion, disability, family status or nationality. Any hit is a FAIL.

---

## Errors

| Error | Response |
|-------|----------|
| Campaign not found | "Campaign ID {X} not found in this workspace. Check the ID or provide a name to search." |
| Multiple name matches | List candidate `{id, name}` rows and ask the user to pick; do not guess. |
| MCP unavailable | "The tools are not responding. Check the connection with `health_check`." |
| Auth errors (401/403) | "Authentication expired. Reconnect the MCP connection and re-authorize, then try again." |
| Operation not visible to this account | SKIP the dependent checks with "Not checked - not available to this account." Never retry a 404 as "not found". |
| Partial data (some calls fail) | Run available checks, mark failed sections as "Not checked - {error}" |
| No campaign id or name | "Provide a campaign ID or campaign name to verify." |
| No plan for drift checks | SKIP checks 24 and 53 with "No campaign plan found - skipped plan drift comparison." |
| plan_limit / billing errors on any tool | Surface `error.message` and recovery summary; do not retry blindly. |
