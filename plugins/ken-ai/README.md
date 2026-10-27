# Ken AI skills for coding agents

The skills Ken's own agents run, for your Ken workspace: build campaigns, handle replies, report results and keep sending healthy. The plugin connects the Ken MCP server (`https://mcp.ken.so/mcp`); sign in with your Ken account when your agent asks. Each skill runs on the Ken tools your role can use, and asks before it sends, launches or changes a live campaign.

No Ken account yet? Create one at https://app.ken.so/get-started. For cold email skills that need no account, see [Ken-Technology/cold-email-skills](https://github.com/Ken-Technology/cold-email-skills).

## Install

Claude Code:

```
/plugin marketplace add Ken-Technology/ken-ai-plugin
/plugin install ken-ai@ken-ai-plugin
```

Cursor, Codex, GitHub Copilot CLI, VS Code, Grok Build and any other agent it finds on your machine, skills and Ken MCP server together:

```
npx plugins add Ken-Technology/ken-ai-plugin
```

Skills only, into any agent that reads Agent Skills:

```
npx skills add Ken-Technology/ken-ai-plugin
```

This copies the skills but not the server: also add the Ken MCP server, `https://mcp.ken.so/mcp`, to your agent ([steps for each agent](https://ken.so/mcp)).

## Skills

| Skill | What it does |
|---|---|
| `account-brief` | Get a cited one-page brief on an account before a call: why now, who is in the room, what they care about, what to open with. |
| `accounts` | Add target accounts, research them, map who buys, scan for signals and plan touches that a person approves in Today. |
| `campaign-diagnosis` | Find out why a campaign is up or down, check the numbers are real first, and get one change to try next. |
| `campaign-improvement` | Fix the email that isn't working in a live campaign: a before and after, graded, saved as a version you can roll back. |
| `connect-domains` | Import your own sending domains and complete the nameserver cutover. |
| `create-campaign` | Build a campaign from an ICP and offer to launch-ready: plan, segments, copy, review, settings and prelaunch checks. |
| `deliverability-guard` | Find out why bounces are up or sends dropped, and what to pause, warm up or rotate before it hurts your domains. |
| `delivery-setup` | Get your sending ready: inboxes, domains, LinkedIn accounts and the link host, one step at a time. |
| `domain-selection` | Review sending domains or order new ones on a paid workspace. |
| `event-outbound` | Plan outreach around a conference: build its list, match it to your accounts, find who is likely there, plan touches for Today. |
| `inbox-configuration` | Tune sending inboxes: daily limits, display names, signatures, and reply forwarding. |
| `infra-planning` | Size sending domains and inboxes against daily send and credits on a paid plan. |
| `ken-search` | Build and save people-search filters against the contact database for a campaign. |
| `knowledge-setup` | Fill a workspace's Knowledge: company and offer files, website pages, calls, voice, tiers, Review and shared prompts. |
| `meeting-prep-and-followup` | Prep for a sales call, then follow it up: the brief before, and after it the commitments, deal updates and a follow-up draft you approve. |
| `pipeline-review` | Review your pipeline: open deals by stage and age, which ones are stuck and why, the next action for each, and a weekly sales update. |
| `reply-handling` | Go through your replies: sort them by interest, draft answers from your templates and offer real meeting times. You approve every send. |
| `report` | Write the weekly or monthly results report for a client or your own team, with a short cover email. |
| `role-intake` | Turn a job link or a few answers into a saved role, then build a campaign that finds candidates for it. |
| `setup-workspace` | Set up a workspace: company profile, logo, invites, blocklist and integrations links, then your first campaign. |
| `signal-outreach` | Email companies when a signal fires (hiring, funding, new leaders), gated for free first, with copy about the plan behind it. |
| `skill-editor` | View, edit, switch on or off and restore the skills in Knowledge > Skills, Ken's defaults included. |
| `studio-asset` | Fill a Studio template for an account or candidate, check the page, then create each person's link to use in a touch. |
| `studio-template` | Build or edit a Studio template: write the bundle, validate it, preview it on real accounts, publish it and manage its versions. |
| `tam-builder` | Size a market and build the list: every company that fits, why it fits, who to write to, saved with its stats. |
| `today-review` | See what needs you today, draft or fix the touches you flag, snooze or skip the rest. You approve every send yourself. |
| `workflows` | Create a workflow from a goal or template, validate, test and publish it, run it on records, watch and recover runs. |

Generated from `mcp/src/ken_mcp/skills` in ken-backend by `mcp/scripts/build_skill_packages.py`; do not edit by hand.
