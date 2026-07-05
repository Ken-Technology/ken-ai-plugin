# Ken Platform Capabilities & Changelog

Single source of truth for what the Ken AI platform (ken-backend / ken-frontend / ken-ai-mcp) can do
right now, so the campaign skills configure campaigns against the current reality instead of a stale one.
Skills link here instead of each duplicating platform details.

**Last verified: 2026-06-06** (covers the 30-day window 2026-05-06 → 2026-06-06).

## How to refresh this doc

1. Read the ClickUp **Product Updates** channel (`2kypytan-28235`) via `clickup_get_chat_channel_messages`
   - it carries weekly release notes.
2. Survey merged PRs from the last 30 days in `Ken-Technology/{ken-backend, ken-frontend, ken-ai-mcp}`
   (`gh pr list --repo <repo> --state merged --search "merged:>=<date>"`).
3. Verify specifics live (never hardcode without checking): `api_ai_supported_models` (model defaults),
   `api_campaign_manage` schema (config knobs), `search_get_filter_options` (search values).
4. Update the changelog + the relevant skills, then bump the date above.

---

## Changelog (May - June 2026)

Campaign-relevant features that shipped in the window. Grouped by area.

### Campaign configuration
- **Recently-emailed dedup** - per-campaign `recently_emailed_dedup_days` (1-3650) suppresses contacts
  emailed within the window. Applied at import AND now at EmailBison export. `api_campaign_manage`.
- **Duplicate campaign** - `api_campaign_duplicate` copies config (segments, filters, prompts, AI workflows,
  model configs, redirect links, sequences) into a fresh Draft; optional `include_leads`.
- **A/B test segmentation** - campaign `segmentation_mode` + `AbTest` segment type with `ab_test_percentage`.
  New "Actions → A/B Testing" UI. Removing a bucket redistributes its contacts across the rest.
- **Email-sequence variant active toggle** - base version A and B/C/D variants each toggle active/inactive
  per step; inactive variants are skipped at send. At least one active version must remain per step.
- **Campaign version history + drift** - segments, email sequences, and prompt bundles are versioned.
  `save_new_version` / `list_versions` / `get_version` / `revert_version`; `list_versions` reports whether
  the live working copy has drifted from the latest version. New `api_prompt_bundle_manage`. Versioning
  is **opt-in** (create/update write no version row); reverts are forward-only; reverting a **segment**
  version **cascades** to its sequence + prompt bundle (to the child version at-or-before the segment
  version's timestamp); retention cap is 100 versions/resource.
- **"AI Segments"** is the current name for what used to be "Auto Segments" (AI-criteria segmentation).
- **Segment descriptions** are the system of record for segmentation context (the default segment's
  description is the campaign-wide audience context); criteria no longer live in the prompt library.

### Approvals (client sign-off)
- **Client Approval Workflow** - send the client a no-login magic link to review audience, sample leads, and
  copy; they leave paragraph-level comments or approve in one click. Lives under a campaign's
  **Actions → Approvals** and the main **Approvals** nav page.
- MCP: `api_create_approval_test` (async create → Processing draft) → `api_get_approval_test` (poll until
  `ready`, returns `magicLink`) → `api_approval_feedback` (`summary` list, then `feedback` for change
  requests on a `notApproved` draft) → `api_rotate_approval_link` (refresh a leaked/expired link).

### Targeting & search
- **KenSearch location filter** restricted to the **6 supported countries** (see below).
- **Title search now matches the full phrase** (e.g. "Marketing Director" no longer matches any title
  containing either word). Lean on `search_expand_titles` to cover real-world title variants.
- Company headcount uses numeric **min/max** (mapped to size buckets), not string ranges.
- Saved searches are shared workspace-wide by default; updating/deleting a shared one now confirms first.

### Email, inbox & sending
- **Per-sender signatures + sender variables** - each sending mailbox carries its own HTML signature;
  three sender system variables available in the sequence editor (see Sender variables below).
  `api_inbox_signature_manage` (set/clear per inbox or in bulk).
- **Inbox rebuilt on EmailBison's spec** - `api_email_reply_manage` now targets `/api/v1/inbox/*` with 11
  ops; 7 legacy ops deprecated; filter contract changed (`status` not `classification`, `read` not
  `is_read`, `tag_ids`). Inline Reply / Reply All composer; full contact email-thread view.
- **Tracking links are unique per spot** - adding a link in the sequence editor creates a unique tracked
  redirect for that exact (step, variant, URL-occurrence); reusing a destination no longer collapses links.
- Changing a redirect URL on a live campaign now requires explicit confirmation.

### Analytics, reporting & research
- **Spend analysis** MCP tools: `api_analytics_vendor_usage`, `api_analytics_top_vendors_by_company`,
  `api_analytics_top_campaigns_by_spend`, `api_analytics_ai_flow_breakdown`, `api_analytics_campaign_costs`.
- **Audit log** - `api_audit_log_query`. Campaign-scoped (`campaign_id` set) is tenant-guarded and the
  usable path for reports; the global log is super-admin only (errors for normal callers).
- **Bot clicks** are included in total click counts but excluded from the unique human click-rate.
  Segment click attribution stays correct even when a contact changes segments after clicking.
  **Opens are still not tracked** (disabled for deliverability) - always 0%.
- **Email delivery** breaks out by provider: Google, Microsoft, Apple, Yahoo, Proton, AOL, Other.
- **Segmentation reasoning** - the AI's reason for each segment assignment is stored and shown in the lead
  detail view and included in exports.
- **Web research** MCP tools: `web_scrape`, `web_batch_scrape`, `web_crawl`, `web_extract`, `web_search`
  (+ `_wait` variants). Canonical replacement for the old "Firecrawl-equivalent" phrasing.
- **Mongo analytics** read tools (`mongo_find/aggregate/count/...`) over the webhooks DB.

### AI / cost
- **Prompt caching + client batching** - all four AI flows cache prompts (≈90% input-token savings) and
  batch by client. `api_ai_token_analysis` reports whether a prompt is long enough to cache.
- **Model catalog is multi-vendor and dynamic** (OpenAI, Anthropic, OpenRouter, Fireworks AI). Defaults
  moved to open models (see AI models below). Always read `api_ai_supported_models`; never hardcode.

### Infra / platform
- Default `KEN_API_BASE_URL` = `https://api.getken.ai` (avoids the Cloudflare WAF 1010 block).
- API keys managed in **Settings → Integrations**; keys can be set to never expire; new search scope gives
  MCP clients KenSearch access. Unified tag table (`api_tag_manage`, multi-scope campaign/domain).
- Engagement filters on the Leads tab (sent / clicks / replies / positive / unsub / bounce). Blocklist
  (`api_v2_blocklist`): add/import/edit emails or domains; exact-match domains.

---

## Current campaign-config MCP surface (key params)

| Tool | Use | Notable params |
|------|-----|----------------|
| `api_campaign_manage` | CRUD the campaign record | `recently_emailed_dedup_days` (+`clear_`), `segmentation_mode` (+`clear_`), `duplication_scope`, `contact_limit`, `campaign_ai_workflows`, enrichment/verification arrays, sending schedule, `tag_ids`/`tag_match`. Passing `status` is rejected - use `api_campaign_lifecycle`. |
| `api_campaign_lifecycle` | State transitions | `start_workflows` (Draft→Building), `launch_sending` (Ready→Sending), pause/resume. |
| `api_campaign_duplicate` | Clone a campaign | `campaign_id`, `new_name`, `include_leads` (default false = config only). |
| `api_campaign_segment_manage` | Segments + versions | `segmentation_type` (1 Manual / 2 AI / 3 AbTest), `ab_test_percentage` (+`clear_`), `description`, `activate`/`deactivate`, `process_filters` (Manual), `save_new_version`/`list_versions`/`get_version`/`revert_version`. |
| `api_qualification_prompt_save` | Qualification prompt (flow 1) | `audience_description`, `disqualification_criteria`, `qualification_criteria`. |
| `api_segmentation_prompt_save` | Segmentation prompt (flow 4) | per-segment criteria; default segment = audience context. |
| `api_rewriting_prompt_save` | Rewriting prompt (flow 3) | steering paragraph appended after backend defaults. |
| `api_redirect_link_manage` | Tracking links | one per (step, variant, URL-occurrence); `text_value` sets anchor text. |
| `api_inbox_signature_manage` | Per-sender signature | `set`/`set_bulk`, `inbox_id`/`inbox_ids`, `signature` (omit/None clears). |
| `api_create_approval_test` | Create client-approval draft | `campaign_id`, `filters_json` (saved-search blob), `contact_limit`, `saved_search_name`. |
| `api_get_approval_test` | Poll a draft | `campaign_test_id`; watch `status` → `ready`, read `magicLink`. |
| `api_approval_feedback` | Read approval status/feedback | `operation="summary"` first; `feedback` only for `notApproved`. |
| `api_rotate_approval_link` | Refresh a magic link | `campaign_test_id`. |
| `api_campaign_prompt_test` | Live test prompts | `campaign_id`, `flow`, `sample_size`, `segment_id`. |
| `api_ai_supported_models` | List allowed models per flow | `flow` (1-4); read `providerGroups`. |
| `api_ai_token_analysis` | Cache-readiness of a prompt | per campaign + flow. |

---

## Enums & values

**Segment types**: 1 = Manual, 2 = AI, 3 = AbTest.
**Segmentation mode** (campaign-level, set at create time only): AI (default) vs AbTest (percentage arms;
all weights incl. the Default arm sum to exactly 100).
**Campaign lifecycle**: 0 Draft, 1 Building, 2 Ready, 3 Sending, 4 Paused, 5 Completed, 6 Error
(Building + Ready can co-exist; status is an array). No Archived state - pause + soft-delete.
**AI workflows**: 1 Qualification, 2 Personalization, 3 Rewriting, 4 Segmentation.
**Default data config**: data source 17 = KenSearch; data enrichments [3 WebsiteContent, 4 WebsiteMetadata];
email enrichments [8 Findymail, 3 LeadMagicBusiness]; email verification 1 = MailTester.

### AI models (verified 2026-06-06 - re-check with `api_ai_supported_models`)
Catalog is dynamic and multi-vendor; these are the current **defaults**, not the only options:
- **Personalization (flow 2)**: default `accounts/fireworks/models/kimi-k2p5` (kimi-k2.5), temp 0.6.
  Also available: `claude-sonnet-4-6`, `claude-haiku-4-5`, deepseek-v4, mimo, minimax, glm, gpt-oss-120b.
- **Qualification (flow 1)**: default `accounts/fireworks/models/gpt-oss-20b`, temp 0.2.
  Also available: `gpt-5.4-nano-2026-03-17`, gpt-4.1-nano, deepseek-v4-flash, gpt-oss-120b.
- **Rewriting (flow 3)** and **Segmentation (flow 4)**: read live; rewriting tracks personalization-class
  models, segmentation tracks qualification-class (cheap) models.
- Only override the default when there's a reason (quality vs cost); the dashboard model picker reflects
  the same catalog.

### KenSearch supported countries (only these 6)
United Kingdom, United States, Canada, Ireland, New Zealand, Australia. Location dropdowns hide everything
else; don't author filters for other countries.

### Sender variables (single-brace, canonical)
Resolve to the **sending mailbox**, not the contact (EmailBison rotates inboxes at send time):
- `{sender_first_name}` - sending mailbox's first name
- `{sender_last_name}` - sending mailbox's last name
- `{sender_signature}` - sending mailbox's configured HTML signature (use on every email instead of a
  hand-written sign-off)

Canonical editor syntax is **single brace** (matching lead variables). Legacy double-brace `{{sender_*}}`
tokens are still accepted by the backend formatter but don't author with them.

### Variable syntax recap
- Lead variable: `{firstName}` (single brace, camelCase) - from contact data.
- Sender system variable: `{sender_signature}` (single brace, snake_case) - from sending inbox.
- AI variable: `{{First Line}}` (double brace, Title Case) - from personalization prompts.
- Tracking link: `{{tracking_link:ID}}` - inserted by the configuration step, never hand-authored.
