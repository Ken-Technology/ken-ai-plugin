---
name: kenso-cli
description: The Kenso CLI (kenso) for work from a file (of any size, even a few ids) or over about 50 records - import, update, remove (delete), pause, tag or export leads, import CRM accounts and people, edit Studio templates as local files and fill them, run an API operation per file row, resume an interrupted run, write the Kenso AI work a workspace gave to its own coding agent (My agent, with kenso work run, or work pull and submit with subagents), sign in with a key from a variable (pipe it to kenso auth login --with-key, no check first). For records listed in the message (under about 50), one record or a question, use the Kenso MCP.
---

1. Every write runs first with `--dry-run`; apply with the plan's `next`. `--yes` at once only to continue an interrupted run or apply what the person confirmed.
2. Many rows: one command on the file as it is (`--file`, `--ids`, `--each`). Run kenso only: no python, awk or shell tests, not even on a file or variable.
3. Any output's `next` is the command to run; errors are JSON on stderr. `--force` only with the person's OK.
4. Ids are flags: `--campaign 812` on contacts import, update, export; `--campaign-id 812` on API commands. `--workspace <id>`; by name `kenso workspace list --q acme`. Other commands: `kenso --help`; `kenso api <METHOD> <path>` only when none fits.

```bash
kenso contacts import --campaign 812 --file leads.csv --dry-run   # skips leads already in; --map '{"Pain": "customVariables.pain_point", "Notes": null}'; over 200 MB --server-import
kenso contacts update --file edits.csv --match id --dry-run   # also one lead; or --match email --campaign 812
kenso contacts remove --ids ids.txt --dry-run   # also pause, resume, restore; over 1,000: --confirm <count>
kenso contacts remove --where '{"campaignIds": [812], "filters": [{"conditions": {"field": "ContactCompany.Name", "operator": 2, "value": "acme"}}]}' --dry-run   # also pause, resume; 2 = contains; no search first
kenso contacts tag --tag 31 --ids ids.txt --dry-run   # tag, restore: --ids only, so first kenso contacts list --campaign-id 812 --all -o ids > ids.txt
kenso contact-imports create --source campaign --source-campaign-id 10601 --campaign-id 812 --dry-run   # copy another campaign's leads in
kenso contacts export --campaign 812 --out leads.csv   # a segment: kenso contact-exports create --segment-id 55
kenso runs resume <runId>   # an interrupted run; terminal lost: kenso runs list finds it. A changed file is a new run
kenso accounts import --file accounts.csv --dry-run   # companies; a file of people: kenso people import --file people.csv
kenso studio push 12 --dir ./tpl   # to preview local edits push first (draft; live needs --publish), then studio preview 12
kenso studio fill 12 --accounts ids.txt --dry-run   # or --campaign 10546 --contacts leads.csv
kenso opportunities update --each rows.csv --dry-run   # any API command on a file of rows (CSV or JSONL; keys fill flags and body). One record: kenso campaigns update --campaign-id 812 --name Q4 --dry-run
kenso mcp call list_skills   # only to list Ken's skills
```

Charges: `accounts import` per new account, `studio fill` per page (again for ids from another file): show the estimate. `pinned_by_user`: with the person's OK, rerun with `--overwrite-pinned`. Workflows: `kenso workflows brief` first; secrets only as `{{secrets.NAME}}`. Key: `KENSO_API_KEY`, or pipe a variable, no check: `printf '%s' "$KEY" | kenso auth login --with-key`; never in a flag, output or file.

## Work (beta): My agent

A workspace can set a kind of Kenso AI work (personalization, qualification, segmentation, rewriting, meeting brief, call brief, workflow prompt) to My agent in Settings > AI work: then it waits for the person's own coding agent, at 0 Kenso AI credits. The `kenso work` commands take no `--dry-run`. Never read the items' text into the chat: the files carry it.

```bash
kenso work status   # what waits, per kind
kenso work run --agent claude   # does it all: claims, runs headless agents, submits; stops when the queue is empty. Other agents need --allow-unconfined; exit 6 = the plan's usage limit
kenso work pull --files 4 --per-file 10   # by hand: prints the work file paths, never the items
kenso work submit <dir>/*.answers.json   # pull's next; exit 5 = some answers rejected (see each <claimId>.results.json)
kenso work release <claimId>   # give back work you will not finish
```

By hand in a chat: run `kenso work pull`, then give each work file to its own subagent with only its path ("Read this work file and write its answers file as its rules say"), then run pull's `next`. More: `kenso docs work`.

## No Kenso account yet

The CLI signs in with a Kenso API key. If the user has no Kenso account, send them to https://app.ken.so/get-started to create one, then create a key in Kenso at Settings > Integrations > API keys.
