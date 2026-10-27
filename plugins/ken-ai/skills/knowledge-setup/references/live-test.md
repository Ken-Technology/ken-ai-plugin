# Live Prompt Test Reference

Details for Task 5 of the prompt writer playbook (`references/prompt-writer.md`): testing saved prompts on real contacts, reading the response, judging outputs and revising.

## When it runs

All of these hold:
- the campaign exists and its AI variables are saved for the segment;
- the segment has contacts the test can sample;
- at least one `to_output: true` prompt exists;
- the user did not ask to skip testing.

Otherwise skip it, say why, and tell the user to re-test once contacts are imported.

## The call

```
prompts(operation="test", campaign_id=..., flow="personalization", sample_size=5, segment_id=...)
```

- `sample_size` 5 per round (1-100 allowed). Maximum 3 rounds. Each call uses model credits on real contacts.
- The test needs the Ask permission. A refusal for that reason means the user lacks it: say so and stop testing.
- The backend samples personalization-ready contacts in the segment and falls back to other active contacts (or the default segment) when the pool is small. Each call draws fresh contacts, so there is nothing to dedupe across rounds. To keep a contact out, pass its id in `exclude_contact_ids`.
- Rewriting runs in the same call when the campaign has rewriting enabled and a variable has `to_rewrite > 0`.
- To compare a model, pass `model_overrides={"personalization": {"model": "<name>"}}` with a name from `models(operation="ai_supported_models", flow="Personalization")`. The override applies to this test only.

## Response

```
successCount, failureCount, returnedSampleSize
usageSummary: averageInputTokens, averageOutputTokens, totalEstimatedCostUsd, averageEstimatedCostUsd
samples[]: contactId, fullName, title, companyName, segmentName, success, errorMessage,
           personalizationOutputs[] {name, value},
           rewritingOutputs[] {name, value} (when rewriting ran),
           finalOutputs[] {name, value} (what reaches the contact),
           isQualified, qualificationResponse (qualification tests),
           matchedSegmentName, segmentationReasoning (segmentation tests)
```

- Judge each sample's **`finalOutputs`**. When rewriting did not run, they equal its `personalizationOutputs`.
- Map outputs to variables by `name`. Only `to_output: true` prompts appear.
- A sample with `success: false` is a transport or model failure, not a prompt verdict (`errorMessage` says which). If every sample failed, do not claim success; surface the failures.
- The response also names the provider and model each sample ran on. Keep those out of anything a client reads: vendor names never reach clients.

## Judging outputs

| Criterion | Question | Check |
|-----------|----------|-------|
| Natural | Does it sound like a human wrote it? | No robotic patterns |
| Contextual | Does it fit the email sequence flow? | Matches tone and style |
| Relevant | Does it use the contact's real data? | References their LinkedIn or company |
| Constrained | Does it follow length and format rules? | Word counts, no emojis, `PS: ` |
| Fallback | Did missing data degrade gracefully? | No blank or error output |

**Scoring:** Pass = 5/5 samples acceptable. Minor = 3-4/5. Major = fewer than 3/5, or a systemic problem.

### Quality thresholds

| Variable | Max length | Required elements |
|----------|------------|-------------------|
| Subject Line | 6 words (ideally 3-4) | Specific detail, no emojis |
| First Line | 20 words | Hook, personalization, no greeting |
| PS Line | 2 sentences | Personal detail, starts with `PS: ` |
| Body variable | Varies | Relevant to context |

### Issue patterns

| Issue | Detection | Severity | Fix |
|-------|-----------|----------|-----|
| Generic output | "I noticed you work at a company" pattern | Major | Name the LinkedIn or website fields to use: "Reference a specific detail from their LinkedIn profile, such as their current role, past experience, or listed skills" |
| Wrong data source | References news, funding, events | Major | Remove it; substitute a valid source |
| Too long | Subject over 6 words, first line over 20 | Minor | "MUST be under X words. Count your words before outputting." |
| Forced connection | "We went to the same school" | Major | "Never assume shared schools, connections or history" |
| Missing fallback | Blank or error output | Major | Add an explicit fallback line, and consider `fallback_if_empty` on the variable |
| Repetitive | Same phrase for 3+ contacts | Minor | "Vary your approach for each contact. Don't reuse the same structure or phrases." |
| Off-tone | Clashes with the sequence style | Minor | Point the prompt at the sequence's tone explicitly |
| "I noticed / I saw" opener | Starts with "I noticed you" or "I saw that" | Minor | "Never start with 'I noticed' or 'I saw' - state the observation directly" |

## Revision loop (max 3 rounds)

1. All pass: done.
2. Minor: find the prompt causing it, apply a targeted fix.
3. Major: look for the pattern across failures, rewrite the affected prompts.
4. Re-save only the prompts you changed: `prompts(operation="update", prompt_id=..., changes={"prompt": "..."}, confirm=false)` keeps `to_rewrite` and the other fields untouched. A new variable is a create (playbook Task 4a).
5. Re-run the test with `sample_size=5`.
6. After round 3 still failing: leave the best version saved, warn the user, and recommend a manual review.

Minor fixes (length limits, small wording) need no new approval. Changing data sources or restructuring variables does.

## Other flows

The same call tests the other prompt flows:
- **Qualification** (`flow="qualification"`, no `segment_id` - campaign-wide): cross-check each `isQualified` against the sampled contact's data. Qualification is assistive, not definitive. If accuracy is weak, sharpen the qualification and disqualification criteria; the platform fixes the model for Qualification and Segmentation, so a model change does nothing there.
- **Segmentation** (`flow="segmentation"`, no `segment_id` - it assigns segments): check each `matchedSegmentName` against the contact's attributes and the edge cases between segments.

## Round summary (chat)

```markdown
## Prompt test - Round N

**Status**: PASS / MINOR / MAJOR
**Contacts**: 5 | Pass rate: X/5

| Contact | Variable | finalOutput (short) | Eval |
|---------|----------|---------------------|------|
| ... | Subject Line | "..." | pass/fail |
| ... | First Line | "..." | pass/fail |

**Issues / fixes applied**: ...
**Next**: re-test | done | need your call
```

When the user wants less, one line per round is enough: `Round 1: 3/5 pass, fixed subject length and first-line specificity`.

## Errors

| Error | Action |
|-------|--------|
| No contacts to sample | Prompts stay saved; skip the test; ask the user to import contacts, then re-test |
| Every sample failed | Do not claim success; surface the failures; ask for review |
| Rate limit | Wait about 30 seconds, retry once, then stop with a warning |
| Timeout | Retry once with a smaller `sample_size` (5 to 3), then stop with a warning |
| Auth / permission | Surface `error.message` and the recovery hint; do not retry blindly |
| `plan_limit` / `billing` | Surface `error.message` and `error.recovery.summary`; never retry blindly |
