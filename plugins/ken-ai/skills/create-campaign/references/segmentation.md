# Segmentation Skill

Split a campaign's qualified leads into the plan's segments so each group gets the right messaging. You write the segment descriptions the assigner reads, plus the Default segment's description.

## Inputs

The plan's segments (name, sub-ICP, angle), the qualification audience description, and the applied search filters and qualification criteria (so you repeat neither). Read only what the conversation lacks: the campaign's plan file in Knowledge (`knowledge(operation="list", tag="campaign-<campaign id>")`, then `knowledge(operation="get", file_id=...)`), and the saved qualification prompt (`prompts(operation="list", campaign_id=..., flow="qualification")`). Without Knowledge, the plan is in the conversation.

## Pick the Mode

| Mode | `segmentation_type` | Use when |
|------|---------------------|----------|
| Manual | `"manual"` | The split is a hard filter: industry, seniority, function, geo, company type, email validity. Free. Prefer it. |
| AI | `"ai"` | The split needs judgment from profile or company text (e.g. product company vs services hybrid). Paid AI run. |
| A/B arms | `"ab_test"` | A sequence test: random split by weight, no criteria. |

Never mix A/B arms with criteria segments in one campaign.

## The Default Segment

- The backend creates Default with the campaign, so it always exists. Update it; never create one, never rename it.
- Default catches every qualified lead that fits no other segment, plus any lead the assigner is not confident about.
- Its description is the short general audience description: persona + org type only (e.g. "Financial advisors at independent advisory practices"). No criteria, filters, headcount, geography, value prop, or "doesn't fit the above" wording.
- Default gets its own sequence like any other segment. Leads that fall through still receive email.

## Write Segment Descriptions (AI mode)

- **Write short, trust the AI** - a sentence or two per segment. Describe the persona, not a keyword list.
- **Self-contained and mutually exclusive** - each description names its own observable signals (role focus, company type, industry cues, stage, size) and never refers to other segments.
- **Checkable** - the assigner sees the LinkedIn profile, company data (industry, headcount, HQ, description), and website title + meta description only. No news, tech stack, funding, or full site content.
- **Never restate a search filter or a qualification criterion.** Reuse only the audience description.
- **Cover the audience** - every qualified lead lands somewhere; Default takes the rest. Assignment reasons are stored on the lead, so concrete signals keep routing auditable.

## How the Platform Assigns (AI mode)

- One choice question per lead, asked only when the Segmentation workflow is on and at least two segments (Default counts) exist. Each non-default AI segment is an option, with its description as the option text. Default is listed last with fixed catch-all text. Manual segments are not options.
- Confidence of 0.6 or more stores the chosen segment; anything lower, or an unrecognized answer, stores Default.
- The backend adds its own instructions and the qualification audience description. You write descriptions only.

## Save (MCP)

Show the proposed Default description and each segment to the user first. Write nothing until approved. Then, idempotently:

1. `segments(operation="list", campaign_id=...)` - find Default (`isDefault=true`) and any segment with the same name as a planned one.
2. Default: `segments(operation="update", segment_id=<default id>, description=<audience description>)`.
3. Each AI segment: `segments(operation="update", segment_id=..., description=...)` when the name exists, else `segments(operation="create", campaign_id=..., name=..., segmentation_type="ai", description=...)`.
4. Optional segmentation prompt. Look first: `prompts(operation="list", campaign_id=..., flow="segmentation")`. Campaign-level audience description: `prompts(operation="create", campaign_id=..., flow="segmentation", prompt_type="system", name="Audience Description", prompt=<text>, order=0, to_output=False, to_rewrite=0, confirm=False)`. One segment's criteria: the same call with `segment_id=<segment id>`, `name="Auto Segment"` and `order=1`. When one exists, change it with `prompts(operation="update", prompt_id=..., changes={"prompt": <text>}, confirm=False)`. A write that would refresh AI results the campaign already produced answers 409 with the impact instead of writing: show it, and repeat with `confirm` set to true only after the user agrees.

**Manual:** `segments(operation="get_filter_metadata", campaign_id=...)` for valid values, `segments(operation="preview", campaign_id=..., criteria={...})` to check counts (add `segment_id` to scope it to one segment), create or update with `segmentation_type="manual"` and `filter_criteria` (the same camelCase filter object), then `segments(operation="process_filters", campaign_id=..., segment_id=<manual segment id>)` once per manual segment to assign its leads (skipping it leaves the segment empty; re-run it after changing criteria). Keep the AI Segmentation workflow (4) off when every non-default segment is manual: read the campaign's workflows with `campaign_flow(operation="list-ai-workflows", campaign_id=...)`, and drop 4 with `campaign_flow(operation="replace-ai-workflows", campaign_id=..., ai_workflow_ids=[...])`, a full replace that lists every other id the campaign runs. When ken-search built separate lists for one campaign, re-split them with manual segments; qualification still covers the union of the lists.

**A/B arms:** `segments` create accepts `ab_test` only once the campaign is in A/B mode, and the MCP tools cannot switch the mode. The user turns on A/B test segments for the campaign in the app, and the backend accepts that only when no segment, inactive ones included, has manual filter criteria, and every active segment, Default included, is already `ab_test` with an `ab_test_percentage`, the weights summing to 100. If the campaign is not in A/B mode yet:

1. Clear the filters of every segment that has them with `segments(operation="update", segment_id=..., filter_criteria={})`, in its own call before any type change. Deactivating a segment does not clear its filters.
2. Convert every active segment you keep, Default included, with `segments(operation="update", segment_id=..., segmentation_type="ab_test", ab_test_percentage=<weight>)`, weights summing to exactly 100 (Default alone takes 100). Deactivate the other active segments with `segments(operation="deactivate", ...)`.
3. Have the user turn the mode on.

Then, before launch, create each new arm with `segmentation_type="ab_test"`, `ab_test_percentage=<weight>`, and no description, and update Default to its final `ab_test_percentage`. Once the campaign is scheduled, sending, paused or launching, every create or weight change must keep the active weights at exactly 100, so add arms before launch. All weights, Default included, must be integers summing to exactly 100 (Default = `100 - sum(arms)` when not stated). On a client's live campaign, a weight change or a new arm needs a yes from the user that names that client.

Report the mode, Default update, and each segment name with its id.

## Recruiting campaigns

For a campaign with `kind` `recruiting`, segments split the candidates by why they would move, not by what they would buy. Read the role first: `roles(operation="get", role_id=<role id>)` (staff, or a workspace with the `recruiting` feature; otherwise take the role from the plan).

- Good angles: the step up (more scope, the next title), the match (they already do this work, with this stack or in this domain), the place (close to the office, or remote when they are not today), the tenure (a long time in their current role), the company stage (from a large company to a smaller one, or the reverse).
- Each description names what a profile shows, so the platform can assign people: current title, past titles, years in the current role, company size, skills.
- Never segment on age, gender, race, religion, disability, family status or nationality, or on a guess at any of them.
- The Default keeps everyone who fits the role but no named angle.

## Errors

On `plan_limit` or `billing`, surface `error.message` and `error.recovery.summary`; never retry blindly. Fix validation errors (e.g. weights not summing to 100) with the user before continuing. A 409 on a prompt write is the impact check above: show it and wait for the user's yes. An operation that is not listed for you, or answers `not_found` on every id (for example `knowledge` in a workspace without it), is off: work from the conversation and never retry it.
