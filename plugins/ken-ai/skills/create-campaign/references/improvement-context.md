# Improvement Context

How to plan a new campaign from a prior campaign's learnings.

## Detecting it

Improvement-driven planning applies when the conversation carries prior learnings:

- `mode: "create"` with `prior_learnings` - improvement-driven planning
- `trigger: "analytics"` - data-driven iteration
- `analytics_context` - performance data from previous campaigns

## Context object

```json
{
  "mode": "create",
  "trigger": "analytics",
  "source_skill": "manual",
  "prior_learnings": {
    "winning_angle": "Guarantee messaging with a case study proof point",
    "winning_metrics": {
      "reply_rate": 4.1,
      "positive_reply_rate": 1.6,
      "click_rate": 12.3
    },
    "failed_angles": ["ROI focus", "Cost savings"],
    "weak_spots": ["Email 3 replies", "Email 4 positive replies"],
    "successful_icp": "CEO, Founder, VP Marketing at B2B SaaS 51-500 employees",
    "recommendation": "Test guarantee angle with new ICPs or variations"
  },
  "source_plan": {
    "source_campaign_id": 12345,
    "test_variable": "Messaging Angle",
    "hypothesis": "Guarantee messaging reduces perceived risk"
  }
}
```

## Before you trust the numbers

Read the source campaign's results with these rules, or the plan learns the wrong lesson:

- **Replies are distinct contacts.** Count people who replied, not messages. Out-of-office is not a reply. Opens are never reported or used as a goal or a metric.
- **Check reply classification before blaming copy or targeting.** A campaign that looks dead may have interested replies filed as not interested, or out-of-office counted as replies. Read the replies before calling an angle a failure.
- **Check delivery before blaming copy.** Bounces at about 3% or 100 on a campaign mean a list or infrastructure problem: copy did not get a fair test. An inbox at about 5% bounces in 24 hours gets zero daily sends. Below about 100 sends, compare absolute counts, not rates.
- **A funding round is not a buying event.** If a "won" angle congratulated a raise, the win came from something else. Plan to what the money pays for (hiring, a launch, a new market).
- **Never invent a metric.** Every number in the new plan comes from the campaign's analytics or the user.

## Using the learnings

1. **Executive Summary** - lead with them:
   ```markdown
   ## Executive Summary
   Building on the guarantee test, where guarantee messaging outperformed ROI focus
   (4.1% vs 2.3% reply rate, 1.6% vs 0.5% positive reply rate), this plan tests the
   winning angle with new segments.
   ```
2. **Client Context** - list them under Past Learnings:
   ```markdown
   - **Past Learnings**:
     - Guarantee messaging outperformed ROI focus (+1.8% reply rate)
     - Case study proof builds credibility and memorability
     - Email 3 drew almost no replies; its angle needs rework
   ```
3. **Segments that build on winners**
   - Winning sub-ICP: double down with more granular sub-segments within it.
   - Underperforming sub-ICP: exclude it or adjust its messaging.
   - Apply winning messaging patterns across segments while tailoring proof points.

## Planning modes

- **Mode A: Refine sub-ICP segments** - keep the offer; add, remove, or adjust segments by which groups responded best. Goal: better targeting.
- **Mode B: Expand to new sub-ICPs** - keep the offer; add segments not yet targeted (new industries, titles, company stages). Goal: new responsive audiences.
- **Mode C: New offer or variable** - keep the winning segments; test a new offer, lead magnet, or campaign element, which may need a new campaign. Goal: better conversion with proven audiences.

## Linking campaigns

1. Reference the source in the new plan's metadata (`**Based On**`, `**Source Learnings**`).
2. Add an entry to the `## Improvement log` section of the SOURCE campaign's plan file. Find it with `knowledge(operation="list", tag="campaign-<source id>")` and read it with `knowledge(operation="get", file_id=...)`. A section update replaces that heading's whole content, so send the existing entries plus the new one: `knowledge(operation="update", file_id=..., base_version=<version>, section={"heading": "Improvement log", "body": <all entries>})`. A stale `base_version` answers `version_conflict`: get the file again and redo it. Each entry is a `###` heading, since a `##` heading would end the section. Without Knowledge, show the entry in the conversation and say it is not saved:

```markdown
### {date}: New Plan Created Based on Learnings

**Trigger**: Performance analysis showed clear winner
**Decision**: Iterate on winning angle with new segment variations
**New Campaign**: {new_campaign_id} - {new campaign name}
**Test Variable**: Messaging refinement
```

## Workflow

1. Load the improvement context.
2. Read the source campaign's plan file (`knowledge(operation="list", tag="campaign-<source id>")`, then `knowledge(operation="get", file_id=...)`).
3. Check the numbers (Before you trust the numbers), then analyze winning and failed patterns.
4. Design the new plan with segments that build on them.
5. Get approval, create the Draft campaign, store its plan.
6. Log the cross-reference in the source campaign's `## Improvement log`.
7. Hand off to ken-search with the new campaign id.

## Avoiding repeated mistakes

When `failed_angles` is provided:

- Do not repeat failed messaging unless it is significantly modified.
- Say why the approach differs if you revisit similar territory.
- Set a clear hypothesis for why this iteration will work.
