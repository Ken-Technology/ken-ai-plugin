---
name: skill-editor
description: View, edit, switch on or off, restore and draft the skills in Knowledge > Skills - the workspace's own skills and its copies of Kenso's default skills - so every agent that loads them follows the workspace's version.
---

# Skill editor

A skill is a set of instructions an agent follows for one job. The workspace's skills live in Knowledge > Skills in Kenso, as files at level `skill`. There are two kinds:

- **Kenso skills**: the workspace's copies of Kenso's built-in skills, which Kenso puts in the Skills folder when Kenso skills are on for the workspace. Kenso keeps an untouched copy up to date. An edited copy keeps the workspace's text, and the app shows a banner when Kenso has a newer version.
- **Workspace skills**: skills people wrote or Ken drafted from their work. Agents list them as `knowledge/<cmd>`.

A skill reaches agents when it is on (`active`), reviewed (`status` `ok`) and has a command (`cmd`). Agents load it with `load_skill`, and in the Ken pane it is `/<cmd>`.

## Rules

- **Admins edit shared skills.** A skill with `visibility` `workspace`, every Kenso skill included, changes only through a workspace admin; a private skill belongs to the person who made it. When `canEdit` is false or a save answers 403, propose the change instead: `knowledge(operation="suggestion-create", kind="change", file_id=..., base_version=..., old_text="...", new_text="...", reason="...")`. It waits in Review at `https://app.ken.so/<workspace id>/demo/knowledge/review`.
- **A yes before each save.** Show the change as before and after, in the skill's own words, and save after the person agrees. Pass a `reason`; History shows it.
- **Read, then write.** `knowledge(operation="get", file_id=...)` returns `version`; pass it as `base_version`. `version_conflict` means someone saved since: read again, merge, show, save.
- **Keep the approvals.** A skill must never let an agent send, launch, book, spend credits, or change a campaign's schedule or volume without a person's yes. Keep every approval step and "a person approves" line. When a requested edit would remove one, say so and leave that part out.
- **Keep what agents parse.** Leave the tool calls, operation names and the double-brace brand placeholders exactly as they are unless the person asks to change one; a wrong operation name breaks the skill. Check a new call with `describe_tools` before you write it.
- **Edit the main text only.** A Kenso skill's references stay Kenso's and cannot be edited. To change what a reference says, add the override to the main text ("For this workspace, ignore the subject-line rule in the copy reference: we write ...").
- **Kenso skills are switched off, never deleted.** Delete refuses them.
- **Triggers only on request.** A trigger makes the skill run on its own and can build a workflow that spends credits. Set or change `trigger` only when the person asks, and say what it will run.
- **Cite what clients want.** A rule about what a client wants carries its source: who said it, where and when.

## Step 0: Check Knowledge is on

`knowledge(operation="list", level="skill")`. When it is refused or answers 404, Knowledge is off for this workspace: say so in one sentence with the link `https://app.ken.so/<workspace id>/demo/knowledge` and stop. Never retry it.

## Step 1: Find the skill

The list gives each skill's `id`, `name`, `cmd`, `active`, `status`, `visibility` and `systemKey`. Narrow it with `q="reply"`, `active=true` or `status="pending"`, and pass `pagination.nextCursor` back for the next page.

- A Kenso skill has `systemKey` `ken_skill_` plus its name with `-` as `_` (`reply-handling` is `ken_skill_reply_handling`). Newer answers also carry `kenSkill` (the name), `kenSkillEdited` and `kenSkillUpdateAvailable`.
- No `ken_skill_` files means Kenso skills are not on for this workspace yet. The workspace's own skills can still be edited; Kenso's built-in skills cannot be changed from here.
- The Skills folder id, for new skills, comes from `knowledge(operation="folders-list")`.

## Step 2: Read it

`knowledge(operation="get", file_id=...)` returns `body`, `version`, `canEdit`, `cmd`, `trigger`, `triggerStatus`, `active`, `status` and `visibility`. Summarize it for the person: what it does, when it runs, its steps, and anything that looks out of date. Link it: `https://app.ken.so/<workspace id>/demo/knowledge/f/<file id>`.

Kenso's own current text of a Kenso skill is the `skill://ken-ai/<name>/SKILL.md` resource. Compare with it to see what the workspace changed.

## Step 3: Edit it

1. Agree the change with the person: the steps, wording or rules to add, drop or rewrite.
2. Change one heading's content: `knowledge(operation="update", file_id=..., base_version=..., section={"heading": "Rules", "body": "..."}, reason="Add the pricing rule from Dana, kickoff call, 2026-10-14")`. An empty section body clears that heading, and a heading the file lacks is added at the end. For a rewrite send the whole `body` instead, never both.
3. Other fields on the same call: `name`, `cmd` (lowercase words joined by hyphens, up to 40; `""` clears it and the skill stops reaching agents), `visibility` (`workspace` shares it, admins only; `private` keeps it the person's own) and `tags`.
4. The answer has the new `version`. Report what changed and the link.

## Step 4: Switch it on or off

- Off: `knowledge(operation="update", file_id=..., base_version=..., active=false, reason="...")`. An off skill leaves agents' lists and the `/` menu. Loading a Kenso skill by its exact name still returns Kenso's default text, so pipelines that load it keep working. An off workspace skill does not load at all.
- On: the same call with `active=true`. It also needs `status` `ok` and a `cmd` to reach agents.

## Step 5: Undo and restore

- History: `knowledge(operation="versions-list", file_id=...)` lists every version, newest first, with its author, `reason` and `bodyMd`.
- Restore one on a yes: `knowledge(operation="versions-restore", file_id=..., version=<the one to bring back>, base_version=<the current version>)`. It becomes a new version, so nothing is lost and the restore can itself be undone.
- Back to Kenso's current text, on a yes: `knowledge_prompts(operation="knowledge-files-reset", file_id=..., base_version=<the current version>)`. It writes Kenso's text as a new version, so the edits stay in History. Only a Kenso skill resets. The reset icon in the Knowledge tab (the file's toolbar, next to History) does the same.

## Step 6: When Kenso updates a skill

Kenso updates an untouched copy in place, as a new version named "Ken updated <name>". An edited copy keeps the workspace's text; the app shows a banner with See changes, Keep mine and Reset to new.

- **Merge:** read Kenso's current text (Step 2), show the person what Kenso changed next to what the workspace changed, and on a yes save the merged text as the whole `body`. Then mark Kenso's update as taken: `knowledge_prompts(operation="knowledge-files-keep-edits", file_id=..., base_version=<the version the save returned>)`. Without it the file still shows Kenso's update as waiting.
- **Keep mine**, on a yes: `knowledge_prompts(operation="knowledge-files-keep-edits", file_id=..., base_version=...)`. The text stays as it is, no version is written, and `kenSkillUpdateAvailable` turns false until Kenso ships a newer version.
- **Reset to new**: the reset in Step 5.

## Step 7: Draft a new skill

- **From the person's work:** `knowledge_review(operation="skill-draft-create", channel="email", count=3)` drafts skills from their last finished hand tasks on that channel (3 to 30). Each draft is a pending new-file suggestion in Skills: show each one, then `knowledge_review(operation="suggestion-accept", suggestion_id=...)` or `knowledge_review(operation="suggestion-dismiss", suggestion_id=..., reason="...")` on the person's yes. `too_few_tasks` means fewer than 3 finished tasks.
- **From scratch:** write it as steps an agent follows: when to use it, what it needs, the steps, the rules, what it hands back. Save it private and off first: `knowledge(operation="create", folder_id=<Skills folder id>, name="Intro email", body="...", cmd="intro-email", visibility="private", active=false)`. Test it (Step 8), then switch it on, and share it (`visibility="workspace"`, admins) when the person wants the team to use it.

## Step 8: Test it

1. `list_skills()` lists it: a workspace skill as `knowledge/<cmd>`, a Kenso skill under its own name.
2. `load_skill(name="knowledge/<cmd>")`, or `load_skill(name="<name>")` for a Kenso skill, returns the text agents get. If a Kenso skill still returns Kenso's text after an edit, workspace copies are not served to agents in this workspace yet: say so plainly.
3. Walk one real request through it with the person and fix what reads wrong.

## What this skill cannot do yet

- Edit a skill's references. They stay Kenso's.
- Delete a Kenso skill. Switch it off.
- Change a built-in skill for a workspace that has no Kenso skill copies.

## Errors

| Error | Action |
|---|---|
| 404, or the call is refused | Knowledge is off (Step 0), or the file is not one the person can see. Stop; never retry |
| 403 `forbidden` or `permission_denied` | Only an admin can change it: propose it with `suggestion-create`, or ask a workspace admin |
| 409 `version_conflict` | Read again, merge, show, save |
| 409 `invalid_state` on delete | A Kenso skill: switch it off instead |
| 409 `invalid_state` on reset or keep-edits | Not a Kenso skill, or Kenso no longer ships it: say so |
| 409 `too_few_tasks` or `no_skills_folder` on a draft | Too few finished tasks, or the workspace has no Skills folder: say so |
| 429 on a draft | A draft is already running for the person: wait for it |
| 400 on `cmd` | Lowercase words joined by hyphens, up to 40 characters |

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
