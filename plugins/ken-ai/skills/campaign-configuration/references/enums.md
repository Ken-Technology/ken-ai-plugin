# Ken AI Enum Reference

Every numeric value the MCP tools and direct HTTP endpoints expect. Loaded only when debugging a backend validation error (e.g., "Invalid flow value" or "Invalid status value").

**Enrichment IDs Reference:**

Email Enrichments (`campaign_email_enrichments`):
- 2 = Icypeas
- 3 = LeadMagicBusiness
- 4 = LeadMagicPersonal
- 5 = Prospeo
- 6 = Enrow
- 7 = Kitt
- 8 = Findymail

Email Verifications (`campaign_email_verifications`):
- 1 = MailTester
- 4 = IcypeasCatchAll
- 5 = LeadMagicCatchAll
- 7 = FindymailCatchAll

AI Workflows (`campaign_ai_workflows`):
- 1 = Qualification
- 2 = Personalization
- 3 = Rewriting
- 4 = Segmentation
- 5 = ToneOfVoice

## Ken AI API Reference

**CRITICAL: All enum values must be NUMERIC, not strings.**

### Campaign fields (api_campaign_manage)

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Required on create + update |
| `client_id` | number | Required on create |
| `campaign_id` | number | Required on update/get/delete |
| `status` | number | CampaignStatus: 0=Draft, 1=Building, 2=Ready, 3=Sending, 4=Paused, 5=Completed, 6=Error. See [`campaign-status-enums.md`](campaign-status-enums.md) for the canonical reference and lifecycle. |
| `contact_limit` | number | Max contacts to process |
| `duplication_scope` | number | 0=Campaign (cross-client), 1=CampaignSegment (same-campaign only), null=None |
| `recently_emailed_dedup_days` | number | Optional 1-3650. Suppresses contacts emailed within the window, at import AND EmailBison export. Off (null) by default. Pair with `clear_recently_emailed_dedup_days=true` to turn it back off. Prime use: reactivation / winback campaigns. |
| `segmentation_mode` | number\|string | Campaign-level A/B flag - see SegmentationMode below. Set at CREATE time only. `clear_segmentation_mode=true` clears it. |
| `allow_personal_emails` | bool | Allow gmail/yahoo/etc. |
| `campaign_data_sources` | int[] | `[17]` for KenSearch campaigns |
| `campaign_ai_workflows` | int[] | `[1, 4]` at create time; Personalization (2) auto-added by AI variables endpoint. Rewriting (3) is NOT auto-added - add explicitly when used. (The skill always flags variables `to_rewrite=1` except Subject Line after the bulk save.) |
| `campaign_data_enrichments` | int[] | `[3, 4]` for website scraping (Content + Metadata) |
| `campaign_email_enrichments` | int[] | Default `[8, 3]` = Findymail + LeadMagicBusiness |
| `campaign_email_verifications` | int[] | Default `[1]` = MailTester |

**Not yet in MCP** (use direct HTTP):
- `sendingDays`, `sendingStartTime`, `sendingEndTime`, `sendingTimezone`
- `emailBisonCampaign.maxEmailsPerDay`
- `campaignWebsitePageSelections`

### DataSource Enum
- 1 = LinkedinSalesNavigator
- 14 = Apollo (obsolete)
- 15 = LinkedinCompanyEmployees
- 16 = FileUpload
- **17 = KenSearch** <- use this for new campaigns

### DataEnrichment Enum
- 1 = LinkedInProfile, 2 = LinkedInCompany
- **3 = WebsiteContent, 4 = WebsiteMetadata** <- website scraping pair
- 6 = TechnologyEnrichment, 7 = LinkedInPosts, 8 = LinkedInArticle
- 9 = LinkedInRecommendations, 10 = GoogleSearchEnrichment
- 11 = LinkedInUrlDiscovery, 12 = CompanyDomainDiscovery

### WebsitePageType Enum (for campaignWebsitePageSelections)
- 1 = Home
- 2 = About
- 3 = Pricing
- 4 = Contact
- 5 = Blog
- 6 = BlogArticles
- 7 = Services
- 8 = Products
- 9 = Testimonials
- 10 = CaseStudies
- 11 = Results
- 12 = Portfolio
- 13 = Gallery
- 14 = Reviews
- 15 = PrivacyPolicy
- 16 = TermsOfService
- 17 = Careers
- 18 = Team

### Flow Enum
- 1 = Qualification, 2 = Personalization, 3 = Rewriting, 4 = Segmentation, 5 = ToneOfVoice

### SegmentationType Enum (`campaign_segment.segmentation_type` / `api_campaign_segment_manage` `segmentation_type`)
- **1 = Manual** (operator-defined membership via filter criteria)
- **2 = AI** (assigned by the AI segmentation prompt - what the skill creates for normal sub-ICP segments)
- **3 = AbTest** (random %-distribution A/B-test arm; pairs with `ab_test_percentage`)

> The `campaign_segment` DB column comment still reads "1=Manual, 2=AI" - it is stale and predates AbTest=3. The authoritative source is the ken-frontend `SegmentationType` map. The Default segment is stored with `segmentation_type=NULL` + `is_default=1` in **AI mode**; in **percentage / A-B mode** the backend births it as `segmentation_type=3` (AbTest) with a percentage (it is one of the A/B arms - the baseline/control - see SegmentationMode below).

### SegmentationMode (campaign-level, `segmentationMode` on the campaigns endpoint)
- Same value space: `"Manual"`/`1`, `"AI"`/`2`, `"AbTest"`/`3`. The MCP `api_campaign_manage` resolves `"AbTest"`/`"3"`/`3` → numeric `3`; pass the **numeric `3`** when calling the campaigns endpoint directly, because the update DTO deserializer rejects the string `"AbTest"`.
- Set to AbTest to put a whole campaign in sequence-A/B mode. **It MUST be set at create time** via `api_campaign_manage(operation="create", segmentation_mode=3)` (which PUTs it in the create body) - this births the un-deletable Default as `AbTest@100`. A post-hoc switch is impossible: `ValidateCampaignSumAsync` counts the untyped Default and 400s, and AbTest arms can't be created until the campaign is already in A/B mode (circular dependency). See SKILL.md Step 4.
- Every active segment - numbered arms **and** the Default - must be AbTest with a 1-100 `ab_test_percentage`, all summing to exactly 100 at launch/export. Clear the mode with `clearSegmentationMode: true` (or `clear_segmentation_mode=True` on the MCP tool).

### PromptType Enum (backend-accurate, not the old docs)
- **1 = system** (user-authored prompts - qualification, AI variables, rewriting all use this)
- **2 = user**
- 3 = assistant

> The old skill documented this as "1=User, 2=System" which was backwards. Numerically the skill was still correct because the MCP passes ints through, but the labels were misleading. Use "system" when referring to type=1 prompts.

### DuplicationScope Enum
- 0 = Campaign (cross-client dedup)
- **1 = CampaignSegment / Audience (same-campaign dedup only)** <- default for new campaigns
- null = None (no dedup)

### Wait Days Rules
- Min: 1 (EmailBison v1.1 rejects `< 1`)
- Max: 30
- Default: 3
- Every step (including step 1) must have `waitDays >= 1`

### Email Sequence Step
| Field | Type | Notes |
|-------|------|-------|
| `stepOrder` | int | 1-based |
| `versionType` | int | 1=A, 2=B, 3=C, 4=D |
| `name` | string | Internal label |
| `subjectLine` | string | Populated for step 1; `""` for follow-ups (enables threading) |
| `bodyContent` | string | HTML with `<p>` tags, see HTML conversion rules above |
| `bodyFormat` | int | Always 1 (Plain) even for HTML content |
| `waitDays` | int | 1-30, default 3 |

### AI Variables Endpoint (direct HTTP)
- `PUT /api/v1/campaigns/{campaign_id}/ai-variables?segmentId={segment_id}`
- Body: `{ variables: [{ name, prompt, order }], model? }`
- Response: `{ success, message, data: { variables: [...], workflowsEnabled: [2, 3], model } }`
- Backend validation:
  - Names non-empty, unique (case-insensitive)
  - Prompts non-empty
  - Order > 0
  - Name max 30 chars, prompt max 4096 chars
  - Model must be recognized by `AiProviderHelper.GetProviderFromModelName`

### KenSearch Export (search_export_to_campaign)
- Params: `campaign_id`, `select_all`, `people_filters_json` (stringified), `import_limit`
- Uses Ken Search API (separate from Ken AI backend)

### Prompt save tools (per-flow, preferred)

Prefer these per-flow save tools for create/update. They always set `flow`, `type`, `name`, `toOutput`, `toRewrite`, `order` correctly and auto-upsert (auto-lookup `prompt_id` from the campaign if not passed). The generic `api_prompt_library_manage(operation="create"/"update", ...)` is soft-deprecated for these flows - it's the footgun where omitting `flow` silently reset it to `0`.

| Flow | Per-flow MCP tool | Required params | Optional | Notes |
|------|-------------------|-----------------|----------|-------|
| 1 = Qualification | `api_qualification_prompt_save` | `campaign_id`, `persona`, `qualifiers`, `disqualifiers` | `prompt_id` | Structured fields - backend rebuilds canonical prompt via `QualificationPromptTemplate`. |
| 2 = Personalization | `api_ai_variables_save` | `campaign_id`, `segment_id`, `variables[]` | `model` | Unchanged - this was already the right tool. |
| 3 = Rewriting | `api_rewriting_prompt_save` | `campaign_id`, `instructions` | `campaign_segment_id`, `prompt_id` | `instructions=""` deletes the existing rewriting prompt. |
| 4 = Segmentation | `api_segmentation_prompt_save` | `campaign_id`, `prompt_text` | `audience_id`, `name`, `prompt_id` | `audience_id` set → per-audience (default name "Auto Segment", order=1); omitted → audience description context (default name "Audience Description", order=0). Not used in the current skill workflow (segmentation uses segment descriptions). |
| 5 = ToneOfVoice | *none yet* | use `api_prompt_library_manage(operation="create"/"update", flow=5, ...)` | | No per-flow tool - fall back to the generic one and always pass `flow=5` explicitly. |

Reads, deletes, list, and `get_by_campaign` still use `api_prompt_library_manage` for all flows.

### Prompt fields (api_prompt_library_manage - generic tool, reads/deletes/list/get_by_campaign only)
| Field | Notes |
|-------|-------|
| `flow` | 1=Qual, 2=Pers, 3=Rewrite, 4=Seg, 5=ToneOfVoice |
| `prompt_type` | 1=system (use for qual/pers/rewriting), 2=user |
| `to_output` | true=included in exports, false=context only |
| `to_rewrite` | 0=not rewritten, 1=will be rewritten |
| `order` | Execution order |
| `campaign_segment_id` | Links prompt to a segment |
| `audience_description`, `qualification_criteria`, `disqualification_criteria` | Qualification-only structured fields (flow=1) - legacy path on this tool; prefer `api_qualification_prompt_save` instead. |
