---
name: kenso-start
description: Interview a person to find the outbound job that will pay off first, pick the Kenso skill or command for it, confirm the plan and workspace, then start it. Use only when the person invokes kenso-start.
disable-model-invocation: true
---

# Start with Kenso

Run this only when the person asked for kenso-start. It finds the one outbound job that will pay off first, picks the skill or command for it, gets one yes for the plan and the workspace, and starts it. The rules for workspace, spend, sends and the final reply are the hub's: `kenso skill show kenso`.

## How to interview

- One question per turn. Give your recommendation with it and the reason in one line, so the person can answer "yes".
- Look facts up instead of asking. Run read-only commands, with `KENSO_READ_ONLY=1` set, so nothing changes while you learn.
- Stop asking once you can name the job, the records it covers, the skill or command, and the workspace.

```bash
KENSO_READ_ONLY=1 kenso doctor
KENSO_READ_ONLY=1 kenso whoami
KENSO_READ_ONLY=1 kenso campaigns list --limit 5
KENSO_READ_ONLY=1 kenso credits balance
```

## The first question

Offer the starter menu, with your pick marked and why:

1. Count my market: how many companies and people match my ICP?
2. Check my sending setup and tell me what to fix before I launch.
3. Draft a campaign for my company from my website and show it to me before anything is sent.
4. Tell me what you want to get done.

A workspace with live campaigns: also offer "Diagnose my best and worst campaign" and "Triage today's replies".

## What to ask next

- Count my market: the ICP, read from Knowledge when it is there (`knowledge-setup` fills it), then the market. Skill: `tam-builder`.
- Sending setup: nothing to ask, run the checks. Skill: `delivery-setup`, then `deliverability-guard` when the workspace already sends.
- Draft a campaign: the company website and the offer, from Knowledge when they are there. Skill: `create-campaign`. Nothing is sent: the draft is shown first.
- Anything else: run `kenso discover` with the person's own words, then pick from the hub's table.

## One yes

Before you start, show one block and wait:

```text
Job: <the job, in the person's words>
Records: <which records, and how many>
Skill or command: <the skill, or the command>
Workspace: <name> (<id>)
Cost: <the dry-run estimate, or "no credits">
Reply yes to start.
```

A yes that does not accept the workspace shown is not a yes.

## The hand-off brief

After the yes, write this brief, then load the skill it names and follow it with the brief as your input:

```text
Goal: <the outcome the person wants>
Workspace: <name> (<id>)
Records: <which records, and how many>
Decided: <every answer the person gave>
Limits: <the cap, and anything the person ruled out>
Open questions: <what is still unknown>
```

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
