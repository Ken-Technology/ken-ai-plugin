# Calculator playbook

A calculator puts a number on a cost the account lives with, starting from their own figures, and lets them change every input. The `roi-calculator` starter is the worked example. `studio-template-builder.md` (in this folder) holds the bundle format, the kit and every validation rule; this file covers what to build, including the one hard constraint: Alpine runs only as its CSP build.

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

The slot schema has no `minimum` or `maximum`, so ranges live in three places: the prompt ("Clamp every number to its range"), the Liquid at the top of the template (`at_least`, `at_most`), and the script's `fit()` for what the reader types.

Every required slot has a fallback, and the starter also ships `fallback.liquid` for the time before the first fill. The starter keeps every `data.*` read in one "inputs" block at the top of `template.liquid`, so `fallback.liquid` is the same file with that block swapped for constants. Keep the two in step when you change the calculator.

## The recipe that fills them

| id | kind | What it does | Writes |
|---|---|---|---|
| `dossier`, `why_now` | bind | `account.dossier.summary`, `account.dossier.why_now` | `dossier`, `why_now` |
| `site` | tool `scrape.page` | Their homepage, for team size and open sales roles | `site` |
| `estimate` | prompt | Fair starting numbers, a basis line for each, the headline and intro | 6 slots |

The prompt step from the starter, shortened:

```json
{ "id": "estimate", "kind": "prompt", "model": "cheap",
  "inputs": ["account.name", "account.industry", "account.size_band", "data.dossier", "data.why_now", "data.site"],
  "to": ["data.reps", "data.hours", "data.rep_cost", "data.basis", "data.headline", "data.intro"],
  "prompt": "... The reader can change every number, so your job is a fair starting point, not a sales pitch. ... reps: integer from 1 to 50. ... If the inputs name a sales team size or open sales roles, start from that. Otherwise use size_band: 1-10 gives 1, 11-50 gives 3, 51-200 gives 6 ... basis: one plain line each ... When no input supports a number, write \"A typical figure for a team this size.\" ... Clamp every number to its range. Return integers, not strings. ..." }
```

Credits, in plain words: the binds and `scrape.page` are free. The prompt costs its tokens at 2x model cost when Studio runs it (`executor="ken"`) and nothing when your agent fills the page. The page costs 1 credit when its first link is published.

## Alpine under the CSP

Studio pages run under a Content Security Policy with no `'unsafe-eval'`. Standard Alpine turns every directive into code with `new Function`, so it does not run there, and loading it from unpkg fails `csp-script-src` at validation. The only Alpine the policy allows is the CSP build, `https://cdn.jsdelivr.net/npm/@alpinejs/csp@3/dist/cdn.min.js`, which never evaluates expressions. The pattern that works:

1. Register the component in an inline script, inside `alpine:init`, with `Alpine.data`. Load the CSP build after it, with `defer`.
2. Put every computed value in a getter and every action in a method.
3. Keep each directive to a single name: `x-text="yearBack"`, `x-on:click="reset"`, `x-bind:hidden="unchanged"`, `x-model.number="reps"`. The CSP build does not run arbitrary JavaScript, so math, `!`, ternaries and arguments go in a getter or a method, never in the markup.
4. Pass the prefilled numbers through `data-*` attributes and read them in `init()`.
5. Wire events with `x-on:` or `addEventListener`, never `onclick=` attributes.

Shortened from the starter:

```html
<script>
document.addEventListener('alpine:init', function () {
  window.Alpine.data('roi', function () {
    return {
      reps: 6, hours: 8, cost: 90000, share: 60,
      init: function () {
        var d = this.$el.dataset;
        this.reps = Number(d.reps) || 6; this.hours = Number(d.hours) || 8; this.cost = Number(d.cost) || 90000;
      },
      get yearBack() {
        return '$' + Math.round(this.reps * this.hours * this.cost * this.share / 4000).toLocaleString('en-US');
      }
    };
  });
});
</script>
<script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/csp@3/dist/cdn.min.js"></script>

<div x-data="roi" data-reps="{{ data.reps | default: 6 }}" data-hours="{{ data.hours | default: 8 }}" data-cost="{{ data.rep_cost | default: 90000 }}">
  <input type="number" min="1" max="50" x-model.number="reps">
  <b x-text="yearBack">$64,800</b>
</div>
```

The text inside `<b>` is the Liquid-computed figure the reader sees before Alpine starts. The starter computes it with the same formula as the getter (40 hour weeks, 48 weeks a year) and formats the thousands separators by hand, since Liquid has no filter for them.

## The CTA: booking under the result

```liquid
{% render 'ken/booking' %}
```

It embeds the sender's booking page when `link.booking_url` is on the booking allow-list (Calendly, Cal.com, HubSpot Meetings, Chili Piper, SavvyCal), and falls back to a booking button for any other URL. Optional `height` (320 to 1200, default 700) and `title`. The result section also carries `{% render 'ken/cta', label: 'Check these numbers on a call', kind: 'booking' %}`, so the ask sits next to the number even before the reader scrolls to the calendar. The booking copy invites them to bring the figures they changed.

## Common failure modes

- **Nothing reacts to input.** Standard Alpine, or an expression in a directive (`x-text="reps * hours"`), under the CSP. The first fails `csp-script-src`; the second passes validation and only fails in the browser console. Move the expression into a getter.
- **Numbers as strings.** The prompt returns `"6"`, `data-type` fails the integer slot, and the page uses the fallback 6. Keep "Return integers, not strings" in the prompt.
- **Out-of-range inputs.** A prompt answer of 400 reps passes the schema, which cannot hold a range. Clamp in Liquid before printing and in the script before computing.
- **The two files drift.** You change a formula in `template.liquid` and not in `fallback.liquid`, and a reader who opens the link before the fill sees different math. Keep all `data.*` reads in the inputs block and diff the files before you push.
- **The script and the server disagree.** The Liquid figure and the getter use different formulas, so the number jumps when Alpine starts. Write the formula once in a comment above both and copy it exactly.
- **An overclaim.** The share you take over is your claim; the starter defaults it to 60 percent and lets the reader lower it. The prompt never promises a result, and the page calls every figure an estimate.
- **A calendar that does not embed.** A booking URL outside the allow-list renders as a button, not an iframe. That is expected; your own `<iframe>` from another host fails `csp-iframe-src`.
- **A placeholder in the preview.** A Studio preview has no link and so no booking link: `ken/booking` shows a dashed box the size of the frame, and a booking `ken/cta` keeps its button with no link. The live page shows the calendar and links the button.

## Starter

`studio_templates(operation="create", starter_slug="roi-calculator")`

To make it your calculator, change the inputs block, the formulas in Liquid and in the getters, the labels and help text, and the `estimate` prompt's rules for each starting number. Keep the getter names in step with every `x-text`.
