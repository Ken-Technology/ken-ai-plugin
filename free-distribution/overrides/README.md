# cold-email-skills

Free, open-source Agent Skills for planning and writing cold-email campaigns. No account required.

## Install

Install the full set:

```bash
npx skills add Ken-Technology/cold-email-skills
```

Or install a single skill:

```bash
npx skills add Ken-Technology/cold-email-skills/email-copywriting
```

These install into Claude Code, Codex, and other agents via [skills.sh](https://skills.sh).

## What's inside

- **cold-email-campaign** - Orchestrate a full cold-email campaign end to end, from research to ready-to-send copy.
- **search-strategy** - Turn an ICP into portable prospect-search filters you can run in any list tool, plus a bring-your-own list CSV shape.
- **qualification** - Write AI qualification prompts for evaluating whether a prospect fits your audience.
- **segmentation** - Write AI segmentation prompts that divide prospects into campaign segments.
- **campaign-strategy** - Create a per-segment email strategy with sequence blueprints and AI personalization variables.
- **email-copywriting** - Write cold email copy: hooks, body, CTAs, signatures, and personalization placeholders.
- **email-review** - Review cold email copy for quality and critical copy rules, and iterate until it scores well.
- **prompt-writer** - Generate AI personalization prompts you can run in any personalization tool or LLM.
- **client-research** - Synthesize meeting notes, website data, and other sources into a client research document.
- **lead-magnet** - Ideate and design lead magnets for click-based and reply-based cold email campaigns.

## Quick start

Ask your agent to **plan a cold email campaign**. That runs the `cold-email-campaign` skill, which walks research, targeting, qualification, segmentation, strategy, copy, review, and personalization prompts.

Everything is written to local files. You bring your own prospect list (these skills plan and write; they do not pull contacts or send mail).

## Upgrade to Ken AI

These skills plan and write campaigns. To find contacts, verify emails and phones, and send at scale with live AI personalization, use [Ken AI](https://ken.so).

## License

MIT
