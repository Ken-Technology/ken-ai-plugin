# free-distribution (retired)

The hand-kept overrides that used to build `Ken-Technology/cold-email-skills` are gone, and so are `scripts/build-free.mjs` and the workflow that published them. One generator in ken-backend now writes the public tree from Kenso's MCP skills (`mcp/src/ken_mcp/skills`), and ken-backend's `cold-email-skills-sync.yml` workflow publishes it: on each change to ken-backend `main` that can alter the tree, it regenerates it and opens and merges one PR in cold-email-skills.

Run it by hand with `gh workflow run cold-email-skills-sync.yml -R Ken-Technology/ken-backend --ref main`. Without it, run this in ken-backend and open a PR in cold-email-skills with the change:

```bash
cd mcp && uv run python scripts/build_skill_packages.py write --files-out <a cold-email-skills checkout>
```
