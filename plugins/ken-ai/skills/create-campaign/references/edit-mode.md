# Edit Mode (Improvement Context)

When invoked with improvement context (`mode: "edit"`), edit or rewrite parts of a segment's existing strategy (the `## Strategy - <segment name>` section of the campaign plan file in Knowledge, or the strategy in the conversation without Knowledge) while preserving what works.

## Detecting edit mode

- `mode: "edit"` - edit mode
- `trigger: "analytics"` or `trigger: "feedback"` - the source
- `improvement_instruction` - the specific changes to make

## Workflow

1. **Read the improvement context** - extract `improvement_instruction`.
2. **Load the strategy** - `knowledge(operation="list", tag="campaign-<campaign id>")`, then `knowledge(operation="get", file_id=...)`, and take the `## Strategy - <segment name>` section. Keep the file's `version`.
3. **Identify preservation zones** - what must not change (below).
4. **Identify change zones** - what specifically to modify.
5. **Apply scoped changes** - modify only those sections.
6. **Show a diff** - before/after for each changed section.
7. **Get approval** - wait for the user to confirm.
8. **Save** - `knowledge(operation="update", file_id=..., base_version=<version>, section={"heading": "Strategy - <segment name>", "body": <approved section>})`. A stale `base_version` answers `version_conflict`: get the file again and redo the edit. Without Knowledge, show the approved strategy and say it is not saved in the workspace.
9. **Cascade check** - tell the user which downstream stages to re-run.
10. **Log** - add a dated entry to the plan file's `## Improvement log` (a section update replaces the whole section, so send the existing entries plus the new one).

## Edit scopes

| Scope | Action | What changes | Cascades to |
|-------|--------|--------------|-------------|
| "email sequence" | Rewrite email blueprints | Email Sequence section | email-copywriting for this segment, then email-review |
| "AI variables" | Update variable definitions | AI Personalization Variables | prompt-writer |
| "segment overview" | Update ICP, goal, funnel type | Segment Overview | May affect everything downstream |
| "pivot angle" | Change the messaging angle | Several sections | email-copywriting and prompt-writer |
| "full rewrite" | Generate a new strategy | Everything | The full per-segment loop |

## Preservation rules

**Always preserve (unless explicitly changing):**
- ICP and segment definition (unless pivoting)
- Available data sources and constraints
- Funnel type (reply-based vs click-based)
- Core value proposition from the client research

**Consider preserving:**
- Sequence structure when only the copy angle changes
- AI variable names when their prompts already work

**Safe to change:**
- Email blueprints and goals
- AI variable definitions
- Messaging angle and hooks
- Offer and CTA specifics

## Proposed-changes format

```markdown
## Proposed Changes to Strategy - <segment name>

### Email Sequence Section

**Before:**
Email 3:
- Goal: Re-engage with social proof
- Content: Share a case study relevant to their industry
- Delay: 3 days

**After:**
Email 3:
- Goal: Re-engage with a curiosity hook
- Content: Ask a thought-provoking question about their growth strategy, no case study yet
- Delay: 3 days

**Rationale:** Email 3 drew 40% fewer replies than Email 2 - the case study pitch may read as too salesy

### Cascade Impact
- email-copywriting: Email 3 needs rewriting - re-run it for this segment after approval
- prompt-writer: No changes needed (AI variable names unchanged)

---

Approve these changes? [Yes/No/Modify]
```

## Analytics-informed editing

When `analytics_context` is provided:
- Use `sequence_stats` to find which emails need strategic changes.
- Use `weak_spots` for specific improvement areas.
- Use `sibling_comparison` to learn from winning campaigns.

Before you change the strategy, check the numbers: replies are distinct contacts and out-of-office is not a reply; read the reply classification before blaming copy or targeting; and check bounces (about 3% or 100 on the campaign means delivery, not copy, is the problem). Below about 100 sends, compare absolute counts. Opens are never a signal.

Common patterns:
- Few replies to Email 1 - strengthen the opening hook strategy.
- Replies stop after Email 2 - pivot the Email 3 strategy.
- Replies but few positive ones across all emails - a CTA or offer problem.
- A winning angle built on a funding round - a raise is not a buying event; find what really drove the replies.

## Feedback-informed editing

When `feedback_context` is provided:
- "Wrong angle" - pivot the messaging strategy.
- "Offer not resonating" - update the lead magnet / CTA strategy.
- "ICP mismatch" - update the Segment Overview.
- "Emails too long" - adjust the email blueprints.

## Cascade notifications

| Change type | Action needed |
|-------------|---------------|
| Email blueprints | Re-run email-copywriting for this segment |
| AI variables | Re-run prompt-writer |
| ICP or offer | Consider the full per-segment loop (copy, review, prompt-writer) |

On a live campaign, the rewritten copy becomes a new version of the live steps (a full replace, then a saved version), never a new Variant B, and any sequence change on a client's live campaign needs a yes that names that client.

Tell the user: "Strategy updated in `## Strategy - <segment name>` of the campaign plan file. Downstream: [list]."

## Checklist

- [ ] Only the specified sections changed
- [ ] Preservation zones respected
- [ ] Changes align with the client research
- [ ] Cascade impacts identified
- [ ] Diff shown and approved by the user
