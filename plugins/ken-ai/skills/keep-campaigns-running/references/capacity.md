# Capacity

## Goal

Each campaign sends what its healthy inboxes can carry, no more and not much less.

## Reads

- `agent_team(operation="get-runway")`: per campaign `capacity` {dailyCap, rampFloor, inboxCapacity, healthyInboxCapacity, short}, `leads.runwayDays`, and the workspace's `clientWorkspace`.
- `agent_team(operation="list-changes", since="<7 days ago, ISO 8601>")`: the `volume_changed` and `schedule_changed` changes and the team's `cap_move` actions of the last 7 days.

## Kinds

- Actions: `cap_move` {newCap}.
- Proposals: `cap_move` {newCap}, `schedule` {sendingDays?, startTime? "HH:mm", endTime? "HH:mm", timezone?, confirmWeekend?}, `pause` {}, `resume` {}.

## Thresholds

- A cap move is at most 25% of the current cap, up or down.
- At most one cap move per campaign per 7 days, counting the team's and a person's.
- Never above the inbox capacity, and never while the campaign ramps (`rampFloor` is set).
- `capacity.short` is true: lower the cap toward `healthyInboxCapacity`, within the 25%.
- The cap sits well under `healthyInboxCapacity` and runway is above target: raise it, within the 25%.
- Schedule, pause and resume are always proposals. Adding Saturday or Sunday needs `confirmWeekend` true.
- On a client workspace a schedule or volume change (`cap_move`, `schedule`, `pause`, `resume`) needs the client's yes. Put the person's sourced words (who, where, when) in `client_yes`, or leave it out and say so in the reason. Never invent a source.

## Examples

`agent_team(operation="create-action", kind="cap_move", campaign_id=412, args={"newCap": 150}, reason="Healthy inboxes carry 210 a day and runway is 12 days. Raising the cap 20%, from 125 to 150.")`

`agent_team(operation="create-proposal", kind="schedule", campaign_id=412, title="Send 9:00 to 16:00", reason="Interested replies come in the morning. The client agreed on the Oct 19 call.", args={"startTime": "09:00", "endTime": "16:00"}, client_yes="Dana on the Oct 19 call")`
