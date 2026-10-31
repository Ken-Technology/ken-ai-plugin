# Knowledge prompts

A Knowledge prompt is one workspace prompt of a type, written once and used by every campaign it applies to. Types: `qualification`, `scoring`, `research`, `personalization`, `replies` and `tiers`. All operations are on the `knowledge_prompts` facade and need the `knowledge` flag; writes need Knowledge edit.

Use a Knowledge prompt for a rule that holds across campaigns ("never qualify agencies", "our replies never quote a price"). A rule for one campaign goes in that campaign's own prompt: the qualification and prompt writer playbooks of this skill (the playbook table in the knowledge-setup body).

## Who it applies to

`applies_to` lists up to 50 audiences: `{"kind": "everyone"}`, `{"kind": "tier", "tier": 2}` (an account tier, 1 to 10) or `{"kind": "segment", "segment_id": 55}` (a live segment of a live campaign). With no audience, the prompt runs only where an AI variable or a workflow step links it, which makes it a template.

For each lead the most specific prompt of a type wins: segment, then tier, then everyone. Ties go to the oldest.

## How each type reaches the work

| Type | Where it runs |
|---|---|
| `qualification` | Added after the campaign's own Qualification prompt, as a Knowledge section. It adds rules; it never replaces the campaign's. |
| `scoring` | Added the same way to the lead-score question, by the lead's segment, then tier, then Everyone. |
| `personalization` | Goes into the campaign's personalization prompt, after the company folder's files and the Instructions. An AI variable can also link one, which copies the body into the variable. |
| `replies` | The reply agent always gets the Everyone prompt. |
| `tiers` | Places accounts in the custom account tiers (see below). Everyone or tiers only, never a segment. |
| `research` | Added to account research and to a workflow research step, by the account's tier, else Everyone. Research has no segment, so a segment research prompt never runs. |

To see what a campaign actually resolves to, per segment and for leads with no segment: `knowledge_prompts(operation="campaign-resolution-list", campaign_id=...)`. `match` is `segment`, `everyone` or `none`, and `tierPrompts` names the tier prompt that beats the Everyone prompt for each tier.

## Read

- All: `knowledge_prompts(operation="list")`, or `type="qualification"` for one type. Each has `appliesTo`, `tierDescriptions` (tiers prompts) and `usedIn`: the linked AI variables (`ai_variable`) and workflow steps (`workflow_step`), each `synced` (its text equals the body) or `edited` (changed where it lives).
- One: `knowledge_prompts(operation="get", knowledge_prompt_id=...)`.

## Change one

1. Read it with `get` and look at `usedIn`.
2. Tell the person what the change reaches before you save: the campaigns and segments it applies to, and every synced AI variable and draft workflow step it will rewrite. Edited uses keep their own text. Published workflow versions never change.
3. When a synced variable belongs to a live client campaign, the change alters what that campaign sends: it needs a yes that names that client, with where and when they said it.
4. Save: `knowledge_prompts(operation="update", knowledge_prompt_id=..., body="...")`. Any of `name`, `type`, `body`, `model` (`cheap`, `balanced`, `smart`), `applies_to` (replaces the list; `[]` clears it) and `tier_descriptions`. `syncedRows` and `syncedSteps` in the answer say what it rewrote: report them.
5. Clearing the body is refused while synced uses run it.

Create: `knowledge_prompts(operation="create", name="Agency exclusion", type="qualification", body="...", applies_to=[{"kind": "everyone"}])`. Body up to 20,000 characters. Write it like the campaign prompts it joins: short, plain rules a model can check against the lead's data (the qualification guide's data limits apply).

Delete and restore: `knowledge_prompts(operation="delete", knowledge_prompt_id=...)` is soft. Linked AI variables keep their text and read as unlinked while it is deleted, and it stops resolving everywhere. `knowledge_prompts(operation="restore", knowledge_prompt_id=...)` brings it and its links back. Delete only when the person asked.

## Link an AI variable

- Link: `knowledge_prompts(operation="link-knowledge-prompt", prompt_id=<AI variable id>, knowledge_prompt_id=...)`. The variable is a personalization prompt of a campaign (`prompts(operation="list", campaign_id=..., segment_id=...)` finds it). Linking copies the body into it, so it starts synced; linking an edited variable again reverts it to the body. Needs campaign edit.
- Unlink: `knowledge_prompts(operation="unlink-knowledge-prompt", prompt_id=...)`. The variable keeps its current text.

Linking changes the variable's text, so the same yes rule as step 3 applies on a live client campaign.

## Account tiers with a tiers prompt

With custom tiers on (`account_signals(operation="account-tiers-get")` shows `placement` `prompt`), a tiers prompt places each account: it picks the tier whose description fits the account best, with the body as instructions. `tierPromptId` on the ladder names the Everyone tiers prompt.

- Tier descriptions: `tier_descriptions=[{"tier": 1, "text": "Who belongs in Tier 1"}, ...]`, each tier once, up to 1,000 characters. Only a tiers prompt takes them; an update replaces the list.
- Describe who belongs with what the account data shows (industry, size, signals Kenso records). Funding alone is not a buying event: do not make a recent round the reason an account is Tier 1.
- Saving the ladder or the prompt never moves an account by itself; the tiers apply at each account's next move.

## Errors

- 404 on every call: Knowledge is off for the workspace (the knowledge-setup body, Step 0).
- 400 on `applies_to`: a segment that is not live, a tier outside 1 to 10, or a segment on a tiers prompt.
- 403: the person lacks Knowledge edit (or campaign edit for a link). Ask a workspace admin.
