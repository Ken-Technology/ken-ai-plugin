# Account brief: layout and example

The brief is one page a person reads in two minutes before a call. Six sections, always in this order. Every line ends with its citation. A section with nothing sourced says "Not known" and moves the question to Open questions.

## Layout

```markdown
# <Account name> - brief for <meeting title or call>, <date>

**Why now**
- <the one change that makes this call matter now> [<citation>]

**Who is in the room**
- <Name>, <title> - <committee role>. Cares about <one thing>. <Warm path, if any.> [<citation>]

**What they care about**
- <pain, priority or objection, in their words when there is a quote> (<date>) [<citation>]

**Where it stands**
- Stage <stage>, tier <tier>. Last touch <date, channel, title>. Last reply <date, who, gist>. [<citation>]
- Open deal: <name, stage, amount as recorded> or none. [<citation>]
- Waiting for approval: <n touches, who and when>.

**Open with**
- "<one sentence the person can say first>"

**Open questions**
- <what is not known> - <who could answer it>

_Skipped: <parts that were not on, and why>._
```

## Citations

| Source | Write |
|---|---|
| A Knowledge item | its `citationId`, for example `[k12]` |
| A Knowledge search hit | its `citationId`, with `observedAt` when the date matters |
| Research | the source URL's site and the research date, for example `[acme.com/careers, research Oct 21]` |
| The meeting brief | the line's own source label, for example `[email Oct 14]` |
| A touch or a reply | `[touch Oct 18]`, `[reply from Dana, Oct 20]` |
| A signal | its kind and date, for example `[hiring signal, Oct 14]` |

A `stale` item, or research older than 30 days, keeps its date in the line: "(from April)".

## Rules for the lines

- One fact per line. No adjectives the source does not support.
- Names, titles, amounts and dates exactly as the source gives them. An amount the source leaves blank is "not stated", never 0.
- A funding round goes under Why now only with what it pays for: "Series B (Oct 14) pays for an EMEA sales team: three AE roles open since Oct 2", not "they just raised".
- No opens, no click counts, and no vendor or data-provider names in a brief that a client may read.
- Quotes stay short and dated. Never paste a whole email.

## Example

```markdown
# Northwind - brief for "Northwind x Acme intro", Oct 28

**Why now**
- Northwind is moving support to three regions and opened two RevOps roles on Oct 9. [k4] [hiring signal, Oct 9]

**Who is in the room**
- Dana Ruiz, VP Security - evaluator. Cares about the vendor security review. Warm path: Sam worked with her at Globex. [k7]
- Lee Park, Head of RevOps - champion. Replied to the Oct 14 email asking for pricing tiers. [reply from Lee, Oct 15]

**What they care about**
- "We cannot add a tool that fails our SOC 2 review" (Dana, Oct 20 call). [k11]
- Ramping new RevOps hires before Q1 planning. [k9]

**Where it stands**
- Stage engaged, tier 2. Last touch Oct 18, email, "Your two RevOps roles". Last reply Oct 15 from Lee: wants pricing tiers. [touch Oct 18]
- Open deal: none.
- Waiting for approval: 1 touch to Dana, due Oct 30.

**Open with**
- "Lee mentioned the two RevOps roles - is ramping them the priority for this quarter?"

**Open questions**
- Who signs? The economic buyer seat is open - Lee could say.
- Budget timing - not known.

_Skipped: the open deal (Opportunities is not on for this workspace)._
```
