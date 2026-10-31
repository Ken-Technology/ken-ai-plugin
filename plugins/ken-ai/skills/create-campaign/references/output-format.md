# Verification Output Format

Use this layout for every verify-campaign run. One row per executed check; SKIP rows may be grouped. A SKIP row always says why it was not checked.

```
## Campaign Verification: {campaign_name}

**Campaign ID:** {id} | **Workspace ID:** {client_id} | **Status:** {status_name} ({status_num})
**Segments:** {segment_count} segments configured
**Pipeline (summary):** {notable stage statuses from the status payload}
**Prelaunch gate:** {PASS | FAIL - n checks block launch}

### Results

| # | Category | Check | Status | Details |
|---|----------|-------|--------|---------|
| 1 | Campaign | Has segments | PASS | 3 segments (+ Default) |
| 2 | Campaign | Status | WARN | Draft (0) - not launched yet |
| 3 | Campaign | Data sources | PASS | Data source 17 (built-in people search) |
| 4 | Campaign | Data enrichments | PASS | Website content (3), website metadata (4) |
| 5 | Campaign | Email enrichments | PASS | Email finders 8 and 3 |
| 6 | Campaign | Email verification | PASS | Verifier 1 |
| 7 | Campaign | Core AI workflows | PASS | Qualification (1); Segmentation (4) for 2 AI segments |
| 8 | Campaign | Personalization attached | PASS | Personalization (2) |
| 12-16 | Settings | Schedule + daily cap | PASS | Mon-Fri 10:00-18:00 America/New_York, 134/day |
| 17 | Settings | Website pages | PASS | Home page |
| 20 | Segmentation | Default segment exists | PASS | 1 Default segment |
| 21 | Segmentation | Default description | INFO | 0 chars (not used for assignment) |
| 22 | Segmentation | Default sequence | PASS | 5 steps copied from "growth-stage" |
| 23 | Segmentation | AI segment descriptions | PASS | 2/2 AI segments described; "partners" is manual (skipped) |
| 26 | Qualification | Prompt exists | PASS | 1 qualification prompt |
| 29 | Personalization | Sequences per segment | PASS | 4/4 segments have sequences (Default + 3) |
| 30 | Personalization | AI variables per segment | PASS | 4/4 segments have personalization variables (avg 3) |
| 35 | Personalization | Placeholders covered | PASS | All {{Variable Name}} tokens matched |
| 41 | Tracking Links (seg 1) | Tokens present | PASS | No raw CTA URLs |
| 42 | Tracking Links (seg 1) | Token IDs resolve | PASS | All {{tracking_link:ID}} resolve |
| 43 | Tracking Links (seg 1) | One link per URL | PASS | 2 URLs, 2 tracking links |
| 44 | Tracking Links (seg 1) | No cross-segment reuse | FAIL | ID 116 also used by segment "growth-stage" |
| 55b | Personalization | Subject Line | PASS | toOutput=true, toRewrite=0 on all segments |
| 57-58 | Scoring | Scoring | SKIP | Not checked: scoring not requested |
| 56 | Quality | Campaign name | PASS | "Acme - Series A SaaS founders" |
| 60 | Prelaunch | Launch readiness | INFO | notReady: Draft, workflows still running |
| 61-62 | Prelaunch | Domain auth + blocklists | PASS | 3/3 domains SPF, DKIM, DMARC pass; none listed (checked 2026-10-26) |
| 63 | Prelaunch | Inbox warmup | FAIL | 2 of 9 inboxes have 6 warmup days left |
| 64 | Prelaunch | Placement test | WARN | No placement test for this campaign yet |
| 65 | Prelaunch | Merge fields render | PASS | 9 previews over 3 segments, no empty or literal tokens |
| 66 | Prelaunch | Tracking HTTPS | PASS | Tracking DNS verified, certificate valid |
| 67 | Prelaunch | Unsubscribe + replies | PASS | Unsubscribe on; replies to the sending inboxes |
| 69 | Prelaunch | Canary plan | WARN | No canary plan agreed |
| 70 | List audit | Duplicates | INFO | Dedup against other campaigns: off (scope 1) |
| 71-73 | List audit | Blocklist, free mail, countries | PASS | Sample of 200: 0 blocklisted, 0 free-mail, 0 excluded countries |
| 74 | List audit | Email validity | WARN | 412 sendable of 500 target; 31 risky, 22 catch-all |

**Summary:** {pass_count} passed, {fail_count} failed, {warn_count} warnings, {skip_count} not checked

### Issues Found

**CRITICAL (must fix before launch):**
1. Segment "early-stage" reuses tracking link 116 from segment "growth-stage" - create its own link with `tracking_links(operation="tracking-links-create", campaign_id={id}, name="early-stage url_1", domain_name="{destination url}", text_value="{display text}")`, then replace every early-stage body that links to that URL with `<a href="{{tracking_link:NEW_ID}}">{display text}</a>` through `email_sequences(operation="segment-email-sequences-replace", segment_id={early-stage id}, steps=[...])` (every step, flags carried unchanged) and `email_sequences(operation="save-version", segment_id={early-stage id}, name="Own tracking links")`.
2. 2 inboxes are still warming up - wait until their warmup days reach 0 before launch, or launch without them; this needs time, not a write.

**WARNINGS (recommended fixes):**
1. Status is Draft (0) - launch from the campaign page when ready; this check does not launch.
2. Segment "enterprise" description drifts from the campaign plan - update with `segments(operation="update", segment_id=..., description=...)`.
3. No placement test yet - a member with Delivery edit can start one after your yes with `approvals(operation="placement-tests-create", campaign_id={id}, random_scope=True)`; it sends the live copy to seed inboxes and uses one of the workspace's 2 tests a day (8 in 30 days).
4. No canary plan - agree the first 50-200 leads and how long to watch them before the rest send.

Want me to apply the critical fixes?
```

## Rules

- Show status as `{Name} ({n})` from `campaign-status-enums.md`.
- Name sources, enrichments and verifications by number and role, never by provider name.
- Every CRITICAL and WARNING item names the exact call (or the campaign's page in the app, for settings with no MCP write) that fixes it, in the canonical forms of the Proposed fixes list in `verify-campaign.md`.
- This stage applies nothing. After the user's yes, the configuration stage (campaign-configuration) applies the fixes, then verification runs again.
- A live schedule or volume fix on a client's campaign also states whose request it is (`sending_days_requested_by`).
- Never include launch, export, workflow-start, test-send, placement-test or scoring-run calls as fixes the agent runs on its own.
