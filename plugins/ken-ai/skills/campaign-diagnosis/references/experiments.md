# Experiments

Every night the platform looks at what changed in the workspace's campaigns (a new email version, an edited subject, a paused step, two campaigns sent to similar leads) and what the numbers did after. Each of these is a finding. A finding has a proof level, which says how sure the platform is, and a bucket: working, not working or too early.

You read findings, explain them to the user in the words their proof level allows, and act on them only when the user asks.

Every call takes `client_id`, the workspace id. Send it when the user can see more than one workspace. Experiments sit behind the `experiments` flag: while it is off for the workspace the operations are hidden or answer not found. Say Experiments are not on for this workspace yet; do not guess at results from other tools.

## Read

- What to look at today: `analytics(operation="experiments-list")`. It returns the findings, `summary` (active findings per bucket) and `oneThing`, the one thing to do today. Lead with `oneThing` when it is there.
- Narrow it: `analytics(operation="experiments-list", bucket="not_working")`, `analytics(operation="experiments-list", campaign_id=42)`, `analytics(operation="experiments-list", kind="version_test")`.
- One finding: `analytics(operation="experiments-get", experiment_id=7)`. It returns the readout as text: the claim first, the proof in plain words, the counts behind any lift, what else changed in the window, and the summary, insights and recommendations. Quote it; do not rewrite its numbers into a stronger claim.
- The arm keys, `canMakeDefault` and any open default: `analytics(operation="experiments-get", experiment_id=7, format="json")`.
- How a finding moved over time: `analytics(operation="experiments-list-readout-history", experiment_id=7)`.
- How two campaigns compare, when the user asks about two campaigns by name: `analytics(operation="experiments-compare", campaign_ids=[12, 9])`. The platform reads them now, over the days both sent, and returns the same text as a finding's readout; nothing is saved. Their leads differ, so it is a `hunch` at most. When the platform cannot read them side by side (they never sent on the same days, or it has nothing to read for one of them) it is `cant_tell` and the text names the reason and the campaign; repeat that reason, and do not compare their totals yourself instead.

## Say it in its proof words

The proof level decides what you may claim. This is the rule that matters most.

| Proof | What it means | How to say it |
|---|---|---|
| `proven` | The same leads, split at random, sent side by side. | "Version B got more interested replies, and it held up as a fair test." You may say it won. |
| `leaning` | Side by side and pointing one way, but not settled yet. | "Version B is ahead so far, but it is not settled. Give it until the next read." |
| `hunch` | Different leads or different weeks, so the change cannot be credited. | "Replies went up after the edit, but the leads and weeks changed too, so we cannot credit the edit. Do not copy it to other campaigns on this alone." |
| `measured` | A count of what happened, not a comparison. | "This campaign's bounce rate was 4.1% this month." Say what happened, never why. |
| `cant_tell` | Too few replies yet, or the comparison broke. | "Too early to tell." Give the next read from the readout if it has one. |

Below `proven`, never use these words about the finding, in your own sentences or in a summary of it: won, winner, wins, beat, beats, proven, proves, best, caused, doubled, tripled, guaranteed, significant. Say "ahead", "more", "higher", "went up after" instead, and name what else changed when the readout lists it.

Always put the counts next to a lift: "+61% interested replies (14 of 1,198 sends against 9 of 1,240)". A percentage without its counts overstates small numbers.

## Act

Do these only when the user asks.

- Rename: `analytics(operation="experiments-update", experiment_id=7, custom_name="Short subject test")`. `clear_custom_name=True` brings the platform's name back.
- Dismiss: `analytics(operation="experiments-update", experiment_id=7, dismissed=True)`. A dismissed finding comes back on its own when its proof level changes. `dismissed=False` restores it.
- Move to another bucket: `analytics(operation="experiments-update", experiment_id=7, bucket="not_working")`. The move sticks until reset, even when the platform's read changes; `bucket` then shows the move and `detectedBucket` the platform's own read. `reset_bucket=True` goes back to the platform's read. A move changes nothing in the campaigns, and it does not change the proof: keep saying the finding in its proof words.
- Watch for the user: `analytics(operation="experiments-watch", experiment_id=7)`; stop with `analytics(operation="experiments-unwatch", experiment_id=7)`.

### Make a version the default

Make default keeps one version of a tested email and turns that email's other active versions off in the live sequence. It is offered only on a version test at `proven`, or when a guardrail (bounces, unsubscribes) fired on another version.

1. Read the finding with `format="json"`. Go on only when `canMakeDefault` is true.
2. Tell the user which version stays on and which turn off, with the readout's counts and proof. Ask for a clear yes.
3. Call `analytics(operation="experiments-make-default", experiment_id=7, arm_key="b")` with `confirm` set to true, and only after that yes. Never keep a version a guardrail fired on.
4. Report what changed: the kept version and `deactivatedStepIds`.

Undo turns back on exactly the versions make default turned off, after the same clear yes: `analytics(operation="experiments-undo-default", experiment_id=7)` with `confirm` set to true. A version that was already paused before stays paused.

Both change a live sequence, so they refuse until `confirm` is true. A conflict means the sequence was saved meanwhile: read the finding again and ask again.

## Learnings

`analytics(operation="learnings-list")` will list ideas that held across findings. It is always empty for now; do not tell the user their campaigns taught nothing.
