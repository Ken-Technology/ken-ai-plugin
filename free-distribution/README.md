# free-distribution (retired)

The hand-kept overrides that used to build `Ken-Technology/cold-email-skills` are gone, and so are `scripts/build-free.mjs` and the workflow that published them. One generator in ken-backend now writes the public tree from Ken's MCP skills (`mcp/src/ken_mcp/skills`):

```bash
cd mcp && uv run python scripts/build_skill_packages.py write --files-out <new empty dir>
```

Then replace the skill folders, README and LICENSE in a checkout of cold-email-skills with that directory's contents and open a PR there. Nothing syncs it automatically.
