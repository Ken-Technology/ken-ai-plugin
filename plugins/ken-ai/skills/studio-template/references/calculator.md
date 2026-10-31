# Calculator playbook

A calculator puts a number on a cost the account lives with, starting from their own figures, and lets them change every input. The gallery has no calculator starter for now. `studio-template-builder.md` (in this folder) holds the bundle format, the kit and every validation rule; this file covers what to build, including the one hard constraint: Alpine runs only as its CSP build.

## What it is for

The buyer moment: the account half knows a process costs them time or money but has never sized it. The calculator does it in a minute, on a phone, with their numbers already in the boxes. It is a one-step solution: it solves one step (sizing the problem) of a bigger job, and the last line of the math points at the part you take over.

Be honest about the format. The rankings of create-campaign's `lead-magnet` stage put a generic ROI calculator at 1 star and a calculator with benchmarks at 2. What lifts a Studio calculator above that:

- Inputs prefilled for the account (team size from its size band and the open roles on its site), not blank boxes.
- A basis line under each input that says where the number came from.
- The math shown line by line, so the result is checkable, not a claim.
- A booking calendar right under the result, at the moment the number lands.

Score it before you build: 1 to 5 on narrow problem, scalable, quick to consume, reveals a bigger problem, data-driven, and build only at an average of 3 or more. If "reveals a bigger problem" scores under 3, the result does not lead to your offer: change the formula so its last line is the work you take over ("share of that work we take over").

Pick a calculator over a report when the reader's own inputs matter more than peer data.

## Sections that work

| `data-section` | What it holds | Reads |
|---|---|---|
| `hero` | Brand, "Prospecting cost estimate", account, prepared for, prepared by, the headline, the intro | `data.headline`, `data.intro` |
| `calculator` | Four inputs, each a number box plus a range slider, help text and a basis line; an "Undo changes" button | `data.reps`, `data.hours`, `data.rep_cost`, `data.basis` |
| `result` | The yearly figure printed large, hours a month, a ledger with each step of the math, a booking button | computed |
| `booking` | The sender's calendar inline | `ken/booking` |

The result renders twice. Liquid computes it on the server from the prefilled inputs, so the number is on the page at first paint, for a reader whose scripts do not run, and in a print. Alpine then recomputes it as the reader changes an input.

## Required slots

| Slot | Type and limits | Filled by | Fallback |
|---|---|---|---|
| `reps` | integer, 1 to 50 (enforced in the prompt and the template) | `estimate` (prompt) | 6 |
| `hours` | integer, 2 to 20 | `estimate` | 8 |
| `rep_cost` | integer, 40,000 to 250,000, a multiple of 5,000 | `estimate` | 90000 |
| `headline` | string, 10 to 90 | `estimate` | Liquid: `"What manual prospecting costs {{ account.name }}"` |
| `intro` | string, 20 to 300 | `estimate` | Liquid: "A rough estimate from typical numbers, not yet tuned to {account}. Change any figure below." |

Optional: `basis` (`{reps, hours, rep_cost}`, max 120 each). Working slots: `dossier`, `why_now`, `site`.

The slot schema has no `minimum` or `maximum`, so ranges live in three places: the prompt ("Clamp every number to its range"), the Liquid at the top of the template (`at_least`, `at_most`), and the inputs' `min` and `max` for what the reader types.

Every required slot has a fallback; ship a `fallback.liquid` too, for the time before the first fill. Keep every `data.*` read in one "inputs" block at the top of `template.liquid`, so `fallback.liquid` is the same file with that block swapped for constants. Keep the two in step when you change the calculator.

## The recipe that fills them

| id | kind | What it does | Writes |
|---|---|---|---|
| `dossier`, `why_now` | bind | `account.dossier.summary`, `account.dossier.why_now` | `dossier`, `why_now` |
| `site` | tool `scrape.page` | Their homepage, for team size and open sales roles | `site` |
| `estimate` | prompt | Fair starting numbers, a basis line for each, the headline and intro | 6 slots |

The prompt step, shortened:

```json
{ "id": "estimate", "kind": "prompt", "model": "cheap",
  "inputs": ["account.name", "account.industry", "account.size_band", "data.dossier", "data.why_now", "data.site"],
  "to": ["data.reps", "data.hours", "data.rep_cost", "data.basis", "data.headline", "data.intro"],
  "prompt": "... The reader can change every number, so your job is a fair starting point, not a sales pitch. ... reps: integer from 1 to 50. ... If the inputs name a sales team size or open sales roles, start from that. Otherwise use size_band: 1-10 gives 1, 11-50 gives 3, 51-200 gives 6 ... basis: one plain line each ... When no input supports a number, write \"A typical figure for a team this size.\" ... Clamp every number to its range. Return integers, not strings. ..." }
```

Credits, in plain words: the binds and `scrape.page` are free. The prompt costs its tokens at 2x model cost when Studio runs it (`executor="ken"`) and nothing when your agent fills the page. The page costs 1 credit when its first link is published.

## Alpine under the CSP

Studio pages run under a Content Security Policy with no `'unsafe-eval'` and no inline script of their own: only Kenso's scripts run inline, each with the response's nonce, and validation refuses a template's inline `<script>` and `on*` handlers (`csp-inline-script`). Standard Alpine turns every directive into code with `new Function`, so it does not run there, and loading it from unpkg fails `csp-script-src`. The only Alpine the policy allows is the CSP build, `https://cdn.jsdelivr.net/npm/@alpinejs/csp@3/dist/cdn.min.js`, which evaluates directives with its own parser. The pattern that works:

1. Load the CSP build with `defer`. There is no inline script to register an `Alpine.data` component in.
2. Put the state in an `x-data` object literal, with the prefilled numbers printed into it by Liquid.
3. Keep each directive to what the CSP build evaluates: arithmetic, comparisons, ternaries, `!` and `&&`, assignments and method calls on the component's data. No `Math`, `window` or other globals, no arrow functions, no template literals.
4. Wire events with `x-on:`, never `onclick=` attributes. Bind inputs with `x-model.number`, never `:type` or `:name` on an input (`csp-input-type`).

```html
<script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/csp@3/dist/cdn.min.js"></script>

{% assign reps = data.reps | default: 6 | at_least: 1 | at_most: 50 %}
{% assign hours = data.hours | default: 8 | at_least: 2 | at_most: 20 %}
{% assign cost = data.rep_cost | default: 90000 | at_least: 40000 | at_most: 250000 %}

<div x-data="{ reps: {{ reps | round }}, hours: {{ hours | round }}, cost: {{ cost | round }}, share: 60 }">
  <input type="number" min="1" max="50" x-model.number="reps">
  <b x-text="'$' + (reps * hours * cost * share / 4000).toFixed(0)">${{ reps | times: hours | times: cost | times: 60 | divided_by: 4000 }}</b>
</div>
```

The three `assign` lines are the inputs block at the top of the template. The text inside `<b>` is the Liquid-computed figure the reader sees before Alpine starts, with the same formula as the `x-text` (40 hour weeks, 48 weeks a year).

## The CTA: booking under the result

```liquid
{% render 'ken/booking' %}
```

It embeds the sender's booking page when `link.booking_url` is on the booking allow-list (Calendly, Cal.com, HubSpot Meetings, Chili Piper, SavvyCal), and falls back to a booking button for any other URL. Optional `height` (320 to 1200, default 700) and `title`. The result section also carries `{% render 'ken/cta', label: 'Check these numbers on a call', kind: 'booking' %}`, so the ask sits next to the number even before the reader scrolls to the calendar. The booking copy invites them to bring the figures they changed.

## Common failure modes

- **Nothing reacts to input.** Standard Alpine, an inline `Alpine.data` script, or a global in a directive (`x-text="Math.round(total)"`), under the CSP. The first fails `csp-script-src`, the second `csp-inline-script`; the third passes validation and only fails in the browser console. Use the data's own methods (`total.toFixed(0)`).
- **Numbers as strings.** The prompt returns `"6"`, `data-type` fails the integer slot, and the page uses the fallback 6. Keep "Return integers, not strings" in the prompt.
- **Out-of-range inputs.** A prompt answer of 400 reps passes the schema, which cannot hold a range. Clamp in Liquid before printing, and give each input `min` and `max`.
- **The two files drift.** You change a formula in `template.liquid` and not in `fallback.liquid`, and a reader who opens the link before the fill sees different math. Keep all `data.*` reads in the inputs block and diff the files before you push.
- **The directive and the server disagree.** The Liquid figure and the `x-text` use different formulas, so the number jumps when Alpine starts. Write the formula once in a comment above both and copy it exactly.
- **An overclaim.** The share you take over is your claim; default it to 60 percent and let the reader lower it. The prompt never promises a result, and the page calls every figure an estimate.
- **A calendar that does not embed.** A booking URL outside the allow-list renders as a button, not an iframe. That is expected; your own `<iframe>` from another host fails `csp-iframe-src`.
- **A placeholder in the preview.** A Studio preview has no link and so no booking link: `ken/booking` shows a dashed box the size of the frame, and a booking `ken/cta` keeps its button with no link. The live page shows the calendar and links the button.

## Starter

None in the gallery for now: the ROI calculator starter left it while it is rebuilt without an inline script. Build from `studio-template-builder.md` and this playbook, and keep the formula in the Liquid and in each `x-text` in step.
