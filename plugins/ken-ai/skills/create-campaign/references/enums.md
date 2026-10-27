# Enum Reference

The values behind campaign settings, prompts, segments, and sequences, with where each is read and how it is written. Load it when configuring a setting, when a backend validation error names a value, or when a verify check needs the exact value to compare against. Several settings are not writable through these tools: they are listed so you can read and explain them, and so the user can set them in the campaign settings in the app.

**Wire formats.** The campaign DTO from `campaign_ops(operation="status", campaign_id=...)` (`data.campaign`) carries numbers. The canonical reads and writes (`campaigns`, `segments`, `prompts`, `email_sequences`, `campaign_flow` AI workflows) use lowercase strings for enums (`status`, `segmentationType`, `flow`, `type`, `variant`, `bodyFormat`), except AI workflow ids, which stay numbers. Lifecycle status: [`campaign-status-enums.md`](campaign-status-enums.md).

## Campaign settings

| Read field | Read from | Values | Write |
|-------|------|-------|-------|
| `name` | `campaigns(operation="get")` | string | `campaigns(operation="update", name=...)` |
| `contactLimit` | get, status | Caps qualified contacts with a safe email, not imports. A campaign accepts up to 10x this in profiles | update `contact_limit` |
| `sendingDays` | get | 0 = Sunday ... 6 = Saturday; omitted when unset (Mon-Fri) | update `sending_days`; on a live campaign also `sending_days_requested_by` (the client's named yes) |
| `sendingStartTime` / `sendingEndTime` | get | Local `HH:MM`; omitted when unset | update `sending_start_time` / `sending_end_time` |
| `sendingTimezone` | get | IANA zone or `"prospect"`; omitted when unset | update `sending_timezone` |
| `maxEmailsPerDay` | get | Greater than 0; omitted when unset | update `max_emails_per_day` |
| `status` | get | Collapsed lifecycle string | Lifecycle calls only, never update |
| `campaignStatuses` | status | CampaignStatus numbers | Lifecycle calls only |
| `campaignAiWorkflows` | status (also `campaign_flow(operation="list-ai-workflows")`) | Flow ids. `[1, 4]` at create; 2 and 3 are attached by you, 6 by scoring | `campaign_flow(operation="replace-ai-workflows", ai_workflow_ids=[...])`, a full replace |
| `duplicationScope` | status | DuplicationScope | App setting |
| `recentlyEmailedDedupDays` | status | 1-3650 or null (off). Suppresses contacts emailed within the window when they are imported. For reactivation / winback | App setting |
| `segmentationMode` | status | SegmentationMode | App setting (create time or later) |
| `allowPersonalEmails` | status | bool. Allow gmail / yahoo / etc. | App setting |
| `campaignDataSources` | status | DataSource. `[17]` for search-sourced campaigns | App setting |
| `campaignDataEnrichments` | status | DataEnrichment. `[3, 4]` for website scraping (not defaulted on at create) | App setting |
| `campaignEmailEnrichments` | status | EmailEnrichment. Default `[3, 5, 8]`, applied at create when omitted | App setting |
| `campaignEmailVerifications` | status | EmailVerification. Default `[1, 5, 7]`, applied at create when omitted | App setting |
| `campaignWebsitePageSelections` | status | WebsitePageType per page, when enrichments 3/4 are on | App setting |
| `aiFlowModelConfigurations` | status | Model overrides per flow; empty unless someone set one | Workspace admins: `models` configuration operations; everyone else: the campaign's AI settings in the app |

## Email Enrichment (`campaignEmailEnrichments`)
- 3 = LeadMagicBusiness
- 5 = Prospeo
- 8 = Findymail
- Retired, not selectable for new campaigns: 2, 4, 6, 7

## Email Verification (`campaignEmailVerifications`)
- 1 = MailTester
- 5 = LeadMagicCatchAll
- 7 = Findymail (catch-all check)
- Retired, not selectable for new campaigns: 2, 3, 4, 6

These names are wire values for reading settings. Never name these providers to a client: say "email finding" and "email verification".

## DataSource
- 1 = LinkedinSalesNavigator (retired: no scraper runs)
- 14 = Apollo (obsolete)
- 15 = LinkedinCompanyEmployees
- 16 = FileUpload
- **17 = KenSearch** (use for new search-sourced campaigns)
- 18 = ClientApiUpload
- 19 = LinkedInSignal
- 20 = LinkedInUrlImport

## DataEnrichment
- 1 = LinkedingProfile (spelled so in the enum), 2 = LinkedinCompany
- **3 = WebsiteContent, 4 = WebsiteMetadata** (website scraping pair), 5 = WebsiteScreenShot
- 6 = TechnologyEnrichment, 7 = LinkedInPosts, 8 = LinkedInArticle
- 9 = LinkedInRecommendations
- 11 = LinkedInUrlDiscovery, 12 = CompanyDomainDiscovery
- 13 = ProfileEnrichment, 14 = CompanyEnrichment

## WebsitePageType (for `campaignWebsitePageSelections`)
1 = Home, 2 = About, 3 = Pricing, 4 = Contact, 5 = Blog, 6 = BlogArticles, 7 = Services, 8 = Products, 9 = Testimonials, 10 = CaseStudies, 11 = Results, 12 = Portfolio, 13 = Gallery, 14 = Reviews, 15 = PrivacyPolicy, 16 = TermsOfService, 17 = Careers, 18 = Team

## CampaignListType
- 1 = CSV, 2 = KenSearch, 3 = CampaignImport, 4 = SavedList

## Flow (AI workflows and prompts)
- 1 = Qualification, 2 = Personalization, 3 = Rewriting, 4 = Segmentation, 5 = ToneOfVoice, 6 = Scoring

Prompt calls take the flow as a lowercase name: `qualification`, `personalization`, `rewriting`, `segmentation`, `scoring`. `tone_of_voice` still reads back on old rows, but a new prompt write rejects it, and AI workflow 5 cannot be attached. AI workflow writes take the ids 1, 2, 3, 4 and 6.

## SegmentationType (`segments` `segmentation_type`)
- **1 = Manual** (membership by filter criteria) - `"manual"`
- **2 = AI** (assigned by the segmentation prompt; normal sub-ICP segments) - `"ai"`
- **3 = AbTest** (random percentage arm; pairs with `ab_test_percentage`) - `"ab_test"`

The Default segment (`isDefault=true`) is stored with no type in AI mode. In percentage (A/B) mode the backend creates it as AbTest with a percentage: it is the baseline arm.

## SegmentationMode (campaign-level)
- Same value space: 1 = Manual, 2 = AI, 3 = AbTest.
- AbTest puts the whole campaign in sequence A/B mode. These tools cannot set it: the user turns on A/B test segments in the app. Created in A/B mode, the campaign starts with the un-deletable Default as `AbTest@100`. A later switch is accepted only when every active segment, Default included, is already AbTest with an `ab_test_percentage`, the weights sum to 100, and no segment has manual filter criteria. `segments` create rejects `ab_test` until the mode is on, but `segments` update can convert an existing segment (Default included) before the switch.
- Every active segment, numbered arms **and** Default, must be AbTest with a 1-100 `ab_test_percentage`, summing to exactly 100 at launch.

## PromptType
- **1 = system** (user-authored prompts: qualification, AI variables, rewriting) - `"system"`
- 2 = user - `"user"`
- 3 = assistant - `"assistant"`

## DuplicationScope
- 0 = Campaign (the app's "other campaigns" box checked): a contact already in another campaign of this workspace is a duplicate too. Never across workspaces.
- **1 = CampaignSegment** (the box unchecked): dedup only inside this campaign, across all its segments - default for new campaigns
- Dedup inside the same campaign is on either way. A workspace-level duplicate setting, when someone set one, overrides both values.

## Wait days (confirmed)
- `waitDays` on Email N = days to wait **before** Email N sends (delta from the previous email). Email 1 is `0`.
- Follow-ups: 1-30 (a follow-up below 1 is rejected).
- Send days 0/3/7/11 are stored as **`0, 3, 4, 4`**. The sequencer reads them that way.
- Dashboard gap widgets bind the gap before Email N+1 to Email N's stored value, so a correct `0/3/4/4` can render `1/3/4`. Never shift stored values to match the UI.
- Verify after every push by re-reading the sequence and comparing cumulative waits to the intended send days.

## Email sequence step
Read with `email_sequences(operation="segment-email-sequences-get", segment_id=...)` and written with `email_sequences(operation="segment-email-sequences-replace", segment_id=..., steps=[...])` in the same shape (snake_case or the camelCase the read returns).

| Field | Type | Notes |
|-------|------|-------|
| `id` | int | Keep it on every step you keep; a step without `id` is created, a live step left out is deleted |
| `stepOrder` | int | 1-based |
| `variant` | string | `a`-`d`. Prospect-facing A/B arms that send; never use them as review-round versions. Omitted is `a` |
| `name` | string | Internal label |
| `subject` | string | Every step carries `{{Subject Line}}` (Email 1 and follow-ups) - operator standard; do not blank follow-up subjects |
| `body` | string | HTML with `<p>` paragraphs; CTAs as `<a href="{{tracking_link:ID}}">display</a>` (see `html-serializer.md`) |
| `bodyFormat` | string | `plain` for copy you author, even with `<p>` and links; `markdown`; `html` only for full HTML emails (needs the workspace's `html_steps` feature). EmailBodyFormat 1 = Plain, 2 = Markdown, 3 = Html |
| `waitDays` | int | See Wait days |
| `isActive` | bool | An inactive variant does not send. Carry from the read so a paused variant stays paused |
| `openTrackingEnabled` | bool | Per-step open tracking. Carry from the read; omitting it turns open tracking off |
| `handwrittenEnabled` | bool | The body above the signature or unsubscribe line goes out as a handwritten letter image (needs the workspace flag `handwritten_letters`). Carry from the read; omitting it turns the letter off |
| `handwrittenBackground` | string or null | Letter paper: `walnut`, `linen`, `kraft`, `marble`, `deckle` or `notepad` (null is `walnut`); carry from the read |
| `handwrittenIntro` | string or null | One-line intro above the letter, at most 200 characters, no links; carry from the read |
| `studioTemplateVersionId` | int or null | A pinned Studio email template; carry from the read, or the step is unpinned |

## LinkedIn sequence step
Canonical strings, with the LinkedInStepType / LinkedInStepConditionType integers.

| stepType | Integer | Notes |
|----------|--------|-------|
| `profile_visit` | 1 = ProfileVisit | No body, no versions |
| `connection_request` | 2 = ConnectionRequest | Note max 275 characters |
| `message` | 3 = Message | Sent as an InMail automatically when the contact is not connected |
| `in_mail` | 4 = InMail | An explicit InMail step |
| `follow` | 5 = Follow | A body is ignored (never sent). No versions |
| `like_post` | 6 = LikePost | Likes the newest original post from the last 30 days that takes reactions. A body is ignored (never sent). No versions |
| `endorse_skill` | 7 = EndorseSkill | 1st-degree only: place after the connection request with condition `accepted`. A body is ignored (never sent). No versions |
| `comment_post` | 8 = CommentPost | Ken writes the comment in the background on the newest original post from the last 30 days. A comment not written within 6 hours skips with `comment_unavailable`; a workspace out of credits skips with `insufficient_credits`. The body is optional guidance, not the comment, max 500 characters. No versions |

conditionType: `none` (0), `clicked` (1), `replied_positive` (2), `accepted` (3), `engaged` (4 = Engaged: the prospect read or reacted to one of our LinkedIn messages, so it needs a message step earlier). The four engagement step types and `engaged` need the workspace's `linkedin_engagement` flag; a save that contains them without it is rejected. Turning the flag off also stops saved engagement steps: each skips with `engagement_disabled` and the lane continues. A step with nothing to act on (no recent post, already following, not connected) skips and the lane continues.

## AI variables (`personalization` prompts)

Read a segment's set with `prompts(operation="list", campaign_id=..., segment_id=..., flow="personalization")`. Write one variable per call: `prompts(operation="create", ..., flow="personalization", name=..., ...)` for a new name, `prompts(operation="update", prompt_id=..., changes={...}, confirm=False)` for an existing one (recipe: `update-recipes.md` section 6). A variable you do not write stays; nothing is deleted unless you delete it.

- Names non-empty and unique per segment, case-insensitively and after lowercase snake_case normalization: "Subject Line" and "subject_line" are the same variable
- Prompts non-empty
- Creating a variable does not attach workflow 2: check `campaign_flow(operation="list-ai-workflows")`

## Prompt writes per flow

Every create takes `prompt_type="system"` and `confirm=False` (a 409 shows the impact; repeat with `confirm` set to true only after the user agrees), and needs `campaign_id` or `segment_id`.

| Flow | Create fields | Scope | Notes |
|------|------|-------|-------|
| `qualification` | `prompt="structured"`, `audience_description`, `qualification_criteria`, `disqualification_criteria`, `order=1`, `to_output=False`, `to_rewrite=0` | Campaign | The backend builds the prompt text from the three fields. One per campaign: find it with `prompts(operation="list", campaign_id=..., flow="qualification")` and update it |
| `personalization` | `name=<variable name>`, `prompt`, `order=<n>`, `to_output=True`, `to_rewrite=0` or 1, optional `fallback_if_empty`, `is_required_for_sending` | Segment | One per variable; attach workflow 2 |
| `rewriting` | `name="Rewriting"`, `prompt=<instructions>`, `order=1`, `to_output=False`, `to_rewrite=0` | Segment, or campaign | Runs only while workflow 3 is attached. With no rewriting prompt, the backend's default instructions apply |
| `segmentation` | `name="Audience Description"`, `order=0` at campaign level; `name="Auto Segment"`, `order=1` with `segment_id` | Campaign or segment | Not used in the standard flow (segment descriptions drive AI segmentation) |
| `scoring` | `scoring_criteria` (required), with `prompt` | Campaign | Optional tuning for lead scoring; check `describe_tools(['prompts'])` first |

Updates: `prompts(operation="update", prompt_id=..., changes={...}, confirm=False)` with snake_case or camelCase keys. Reads: `prompts(operation="list", ...)` or `prompts(operation="get", prompt_id=...)`. Deletes: `prompts(operation="delete", prompt_id=..., confirm=False)` for every flow.

## Prompt fields (as read back)
| Field | Notes |
|-------|-------|
| `flow` | Lowercase flow name (see Flow) |
| `type` | `system` for qualification, personalization, rewriting |
| `name` | The variable name on personalization prompts |
| `toOutput` | true = included in exports, false = context only |
| `toRewrite` | 0 = not rewritten, 1 = rewritten |
| `order` | Execution order |
| `campaignId`, `segmentId` | Scope; `segmentId` links a prompt to a segment |
| `audienceDescription`, `qualificationCriteria`, `disqualificationCriteria` | Qualification structured fields |
| `scoringCriteria` | Scoring tuning |
| `fallbackIfEmpty`, `isRequiredForSending` | Personalization options |

## Search import (`saved_searches(operation="import_to_campaign")`)
- Params: `campaign_id`, `select_all`, `people_filters_json` (object or JSON string), `import_limit`, `await_ready`
- Async: returns `jobId`; poll `saved_searches(operation="export_status", job_id=...)`

## ReplyClassification (reply `classification`, legacy integer wire)
- 0 = Interested (the only positive reply)
- 1 = NotInterested (retired, historical rows)
- 2 = Automated
- 3 = Unclassified
- 4 = HardBounce
- 5 = SoftBounce
- 6 = Unsubscribe
- 7 = OutOfOffice
- 8 = NDR
- 9 = Complaint
- 10 = Unknown
- 11 = Negative
- 12 = Objection
- 13 = WrongContact
- 14 = Referral (recruiting campaigns: "not me, try X")

Canonical threads use the snake_case `interest` values instead: interested, not_interested, negative, automated, unclassified, unsubscribe, objection, wrong_contact, out_of_office, referral.

Count replies as distinct contacts. An out-of-office is not a reply. Opens are never a goal or a reported number.
