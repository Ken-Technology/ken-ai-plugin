# configuration.json Schema

The exact shape of configuration.json. The campaign-configuration skill writes and incrementally updates this file itself (Write/Edit tools) - merge new keys into the existing file, never blow away fields you did not touch.

### Step 13: Write configuration.json

```json
{
  "campaign_id": 123,
  "campaign_name": "Client - Broad ICP",
  "client_id": 24,
  "ken_search_export_id": null,
  "ken_search_import_asked": false,
  "qualification_prompt_id": 456,
  "settings": {
    "contact_limit": 1000,
    "max_emails_per_day": 134,
    "duplication_scope": 1,
    "allow_personal_emails": false,
    "sending_days": [0, 1, 2, 3, 4, 5, 6],
    "sending_start_time": "09:30",
    "sending_end_time": "18:00",
    "sending_timezone": "America/New_York"
  },
  "data": {
    "sources": [17],
    "enrichments": [3, 4],
    "website_page_selections": [
      {"pageType": 1, "pageTypeDisplayName": "Home", "isEnabled": true, "maxPagesLimit": 10}
    ],
    "email_enrichments": [8, 3],
    "email_verifications": [1]
  },
  "segmentation": {
    "method": "segment_description",
    "segments": {
      "0 - default": {"segment_id": 100, "name": "Default"},
      "1 - early-stage-saas": {"segment_id": 101},
      "2 - growth-stage-saas": {"segment_id": 102}
    }
  },
  "emailbison": {
    "campaign_ids": {
      "0 - default": null,
      "1 - early-stage-saas": null,
      "2 - growth-stage-saas": null
    }
  },
  "ai_model_configs": [],
  "per_segment": {
    "0 - default": {
      "segment_id": 100,
      "email_sequence_id": 500,
      "ai_variable_ids": [601, 602, 603],
      "rewriting_prompt_id": null,
      "redirect_link_ids": [799, 800],
      "redirect_links": {"url_0": 799, "url_1": 800},
      "name": "Default",
      "is_default": true,
      "versions": {"sequence": 2, "prompt_bundle": 2, "segment": 2}
    },
    "1 - early-stage-saas": {
      "segment_id": 101,
      "email_sequence_id": 501,
      "ai_variable_ids": [701, 702, 703],
      "rewriting_prompt_id": null,
      "redirect_link_ids": [801, 802],
      "redirect_links": {
        "1:null:https://example.com/page": 801,
        "2:null:https://example.com/page": 802
      },
      "versions": {"sequence": 2, "prompt_bundle": 2, "segment": 1}
    }
  },
  "version_log": [
    {
      "round": 1,
      "note": "initial",
      "at": "2026-06-10T14:00:00Z",
      "segments": {
        "0 - default": {"sequence": 1, "prompt_bundle": 1, "segment": 1},
        "1 - early-stage-saas": {"sequence": 1, "prompt_bundle": 1, "segment": 1}
      }
    },
    {
      "round": 2,
      "note": "client feedback: shorten email 1, soften CTA",
      "at": "2026-06-12T09:30:00Z",
      "segments": {
        "0 - default": {"sequence": 2, "prompt_bundle": 2, "segment": 2},
        "1 - early-stage-saas": {"sequence": 2, "prompt_bundle": 2}
      }
    }
  ],
  "sync_status": {
    "campaign_created": true,
    "campaign_settings_patched": true,
    "ai_models_configured": false,
    "qualification_pushed": true,
    "segments_created": true,
    "segment_descriptions_set": true,
    "per_segment_sequences_pushed": true,
    "per_segment_ai_variables_pushed": true,
    "per_segment_rewriting_pushed": true,
    "ken_search_imported": false,
    "fully_synced": true
  }
}
```

> `ai_models_configured = false` by default and is NOT required for `fully_synced = true`. It flips to `true` only when the user has explicitly requested model overrides and those configs were created.

**Default segment**: the entry keyed by `0 - default` under `per_segment` IS the Default segment - there is no separate top-level `default_segment` key. The `is_default: true` flag distinguishes it. It binds to the backend's auto-created segment via `isDefault=true` lookup (no `create` call). It cannot be renamed (backend always calls it "Default") and cannot be deleted (backend auto-recreates).

**Notes on the schema changes**:
- `ai_variable_ids` replaces `prompt_ids` to reflect the new endpoint
- `ai_model_configs` defaults to `[]` - the skill does NOT create model configs by default, backend picks defaults
- `settings.max_emails_per_day` is new
- `data.website_page_selections` is new
- `settings.sending_*` fields are new
- `campaign_settings_patched` tracks whether Step 6b succeeded
- `ken_search_imported` defaults to false; set true only if Step 9 runs

### Version tracking (`per_segment.*.versions` + top-level `version_log`)

The backend stores **no human label** on a version (only number/timestamp/author), so the round
labels live here. Both keys are optional - omit them entirely on campaigns that have never been
snapshotted.

- `per_segment[<folder>].versions` - the **latest** captured version number per resource for that
  segment: `{sequence, prompt_bundle, segment}`. Any subset of keys may be present (a segment whose
  prompt bundle was never snapshotted just omits `prompt_bundle`). Overwritten on each snapshot.
- `version_log` - an **append-only** list of rounds. Each entry: `round` (1-based), `note` (the
  operator's one-liner; `"initial"` for the create baseline), `at` (ISO-8601 UTC), and `segments`
  mapping folder → the version numbers captured for it that round. Revert operations append an
  entry too (e.g. `note: "revert round 3 → round 1"`).

When updating, deep-merge `per_segment.*.versions` (replace) and **append** to `version_log`
(it is not replaced) - pass only the new round entry in the results JSON's `version_log` array.
Use `list_versions` against the backend for the full immutable history; `version_log` is just the
local label/round map.
