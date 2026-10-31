# Studio template builder

Keep this open while you write a Studio template bundle. A template is built once and the platform fills a copy of it for each account: a Studio page on the workspace's own link host. Every limit, keyword and rule id below is what `validate` checks, so a bundle written to this page passes on the first or second try.

- The build loop (brief, validate, preview, publish, versions) is the `studio-template` skill; its `references/studio.md` also covers runs, links and credits. Filling a page for an account or a candidate is the `studio-asset` skill, and filling one with your own model is its `references/studio-fill.md`.
- Every call takes `client_id` (the workspace id). A 404 on every Studio call means the workspace does not have Studio yet (it is behind the `studio` flag and staff-only in beta): stop and say so, and never retry it as a missing template.

The build loop, in short:

1. Start from a starter: `studio_templates(operation="starters-list")`, then `studio_templates(operation="create", starter_slug="rd-doc")`. Or start blank: `studio_templates(operation="create", name="Site notes", template_type="audit", template_format="page")`.
2. Read the files: `studio_templates(operation="pull", template_id=41)`.
3. Write or edit the files in your own environment, with this page and the type playbook open.
4. Check without storing: `studio_templates(operation="validate", template_id=41, text_files={"studio.json": "...", "template.liquid": "..."})`. Fix by rule id. Repeat until `errorCount` is 0.
5. Store: `studio_templates(operation="push", template_id=41, text_files={...}, message="Add funnel chart")`.
6. Preview on 3 accounts with `studio_templates(operation="preview", ...)` (Step 5 of the `studio-template` skill) in both modes: with `sample="samples/<name>.json"` for the filled layout on each account, and without it for the fallback. Then publish through the `studio-template` skill.

## The bundle

```
<slug>/
  studio.json        the manifest: what the template is, its data.* slots, the recipe that fills them, tracked sections
  template.liquid    the page, rendered per link with Kenso variables and the filled data; a full HTML document
  fallback.liquid    optional: a page that reads only Kenso variables, for when the fill has nothing usable
  assets/            files the page loads from its own host: images, fonts, pdf, csv
  samples/           optional: <name>.json = {account, person, data} for local preview (.json, .csv); never served
  README.md          optional notes for the next editor (a webhook contract, a CSV layout)
```

Anything else is ignored with a `bundle-unknown-file` warning.

| Limit | Value |
|---|---|
| `template.liquid`, `fallback.liquid`, `studio.json` | 256 KB each |
| Any other file | 5 MB |
| Whole bundle | 20 MB |
| HTML start tags per file (or per HTML slot value) | 2000 |
| One push | 300 files, 20 `fromUrl` files, 20 MB |
| Paths | relative, `/`-separated, letters, digits, `.`, `_`, `-`; no `..`, no leading `/` |

Asset types: images (png, jpg, gif, webp, avif, ico, svg), fonts (woff, woff2, ttf, otf), pdf and csv. An SVG may not hold `<script>`, `<foreignObject>`, `on*=` attributes or `javascript:`. JavaScript and CSS files are not assets: write CSS inline in `<style>`. A page runs no script of its own (see Scripts below).

`format` is one of three values:

- `page`: an HTML web page.
- `doc`: a document that reads top to bottom on the web and downloads as a PDF. It is still a full HTML document built only from HTML blocks; no step renders Markdown. Add print CSS (for example `break-before: page` on each section).
- `email`: a cold email pinned to a sequence step, rendered per lead in Kenso with its own rules (a `subject`, inline CSS, `{{unsubscribe_link}}`, a smaller Liquid filter list). Read the `studio-template` skill's `references/email.md` before writing one; the rest of this page is about pages and docs.

Both page formats need `<meta name="viewport" content="width=device-width, initial-scale=1">` and a `</body>`: the tracking script is injected right before `</body>`. Write mobile-first CSS; most people open these links on a phone.

## How files travel

- **Text files** (`studio.json`, `*.liquid`, SVG, `README.md`, samples) go inline: `studio_templates(operation="push", template_id=41, text_files={"studio.json": "{...}", "template.liquid": "<!doctype html>..."})`.
- **Binaries** take three steps:
  1. `studio_templates(operation="create-upload-url", template_id=41, path="assets/logo.png", content_type="image/png", size_bytes=18432)` returns `url`, `headers` and `uploadId`.
  2. PUT the bytes to `url` with exactly the returned `headers`, within 15 minutes.
  3. `studio_templates(operation="push", template_id=41, files={"assets/logo.png": {"uploadId": "<uploadId>"}})`.
- **A public file** The platform fetches for you (at most 5 MB, 10 seconds): `studio_templates(operation="push", template_id=41, files={"assets/hero.jpg": {"fromUrl": "https://example.com/hero.jpg"}})`. This is the way to add a binary when you have no shell.
- **Using an asset in Liquid**: `{{ asset_url | append: '/hero.jpg' }}` serves `assets/hero.jpg`, because `asset_url` already points at `assets/`. A relative `assets/hero.jpg` does not load on the page; the validator warns with `asset-relative-url`.
- `files` and `text_files` can go in one push; each path once. Unlisted files stay in the draft. `delete_missing=True` makes the draft hold exactly the files you sent.
- `studio_templates(operation="pull", template_id=41)` reads the draft (else the latest published version) back: text inline, binaries as a `downloadUrl` valid for 15 minutes. `version` takes `"draft"`, `"latest"` or a version id.
- A push after the latest version is published starts draft N+1. A push with validation errors is still stored; publish refuses it until the errors are gone.
- Every write is recorded as the connected user through their client (for example "Maya via Claude Code"): the version's `builtBy` is `customer_agent` and `agentClient` is your client's name.
- If a script pushes the files instead of your client (an HTTP request to the MCP endpoint), send the header `X-Ken-Mcp-Client` with your client's name on every request, for example `X-Ken-Mcp-Client: cursor`. Without it, the version shows the API key's name instead of your client.

## studio.json

| Field | Required | Value |
|---|---|---|
| `kenStudio` | yes | `"1"` (a string) |
| `name` | yes | Not blank. Shown in the library |
| `type` | yes | `reverse_demo`, `landing_page`, `audit`, `report`, `event`, `calculator`, `recruiting` or `other`. `recruiting` needs the workspace's `recruiting` flag |
| `format` | yes | `page`, `doc` or `email` (the `studio-template` skill's `references/email.md`) |
| `slug` | yes | `^[a-z0-9]+(-[a-z0-9]+)*$`, at most 60 characters. The `{page}` part of every link: `https://{host}/{account-slug}/{slug}` shared, `.../{slug}-for-{first-name}` per person |
| `slots` | yes | `{"type": "object", "properties": {...}, "required": [...]}` in the schema subset below. Describes `data.*` |
| `recipe` | yes | Ordered list of steps that fill `data.*` (see "Recipe steps") |
| `sections` | yes | `[{"id": "cover", "label": "Cover"}]`, one per `data-section` element in the template |
| `cta` | no | `{"primary": "booking", "label": "Book 30 minutes"}` (starters also use `"form"`). Stored with the version as a description of the page's main ask. The page renderer does not read it: the button on the page is the template's own `ken/cta`, `ken/booking` or `ken/form`. Keep the two in step |

Any other top-level key is ignored with `manifest-unknown-key`.

Template #1, the `rd-doc` starter (a sample outbound campaign doc). The two long `prompt` strings and the `rubric` are shortened with `...`; everything else is exact:

```json
{
  "kenStudio": "1",
  "name": "Sample outbound campaign doc",
  "type": "reverse_demo",
  "format": "doc",
  "slug": "outbound-campaign",
  "slots": {
    "type": "object",
    "properties": {
      "site": {"type": "object"},
      "dossier": {"type": "string", "maxLength": 4000},
      "why_now": {"type": "string", "maxLength": 1000},
      "offer": {"type": "string", "maxLength": 300},
      "strategy": {
        "type": "object",
        "properties": {
          "intro": {"type": "string", "minLength": 40, "maxLength": 900},
          "audience": {"type": "string", "minLength": 40, "maxLength": 900},
          "offer": {"type": "string", "minLength": 40, "maxLength": 900},
          "channels": {"type": "string", "minLength": 40, "maxLength": 900},
          "goal": {"type": "string", "minLength": 40, "maxLength": 900}
        },
        "required": ["intro", "audience", "offer", "channels", "goal"]
      },
      "segments": {
        "type": "array",
        "minItems": 2,
        "maxItems": 4,
        "items": {
          "type": "object",
          "properties": {
            "label": {"type": "string", "minLength": 2, "maxLength": 24},
            "sub": {"type": "string", "maxLength": 40},
            "value": {"type": "integer"},
            "tests": {
              "type": "array",
              "maxItems": 4,
              "items": {
                "type": "object",
                "properties": {"name": {"type": "string", "maxLength": 28}, "hypothesis": {"type": "string", "maxLength": 28}},
                "required": ["name", "hypothesis"]
              }
            }
          },
          "required": ["label", "sub", "value"]
        }
      },
      "segment_notes": {"type": "string", "maxLength": 600},
      "funnel": {
        "type": "array",
        "minItems": 3,
        "maxItems": 6,
        "items": {"type": "object", "properties": {"label": {"type": "string", "maxLength": 28}, "value": {"type": "integer"}}, "required": ["label", "value"]},
        "fallback": [
          {"label": "People reached", "value": 1000},
          {"label": "Opened or accepted", "value": 460},
          {"label": "Replied", "value": 48},
          {"label": "Positive replies", "value": 19},
          {"label": "Meetings booked", "value": 9}
        ]
      },
      "funnel_notes": {"type": "string", "maxLength": 400},
      "search": {"type": "object"},
      "candidates": {"type": "array", "maxItems": 30, "items": {"type": "object"}},
      "sampling_criteria": {"type": "string", "maxLength": 500},
      "leads": {
        "type": "array",
        "minItems": 3,
        "maxItems": 10,
        "items": {
          "type": "object",
          "properties": {
            "name": {"type": "string", "maxLength": 80},
            "title": {"type": "string", "maxLength": 120},
            "company": {"type": "string", "maxLength": 80},
            "linkedin_url": {"type": "string", "format": "uri"},
            "website": {"type": "string", "maxLength": 120},
            "why": {"type": "string", "maxLength": 140}
          },
          "required": ["name", "title", "company", "why"]
        }
      },
      "emails": {
        "type": "array",
        "minItems": 1,
        "maxItems": 3,
        "items": {
          "type": "object",
          "properties": {
            "name": {"type": "string", "maxLength": 80},
            "title": {"type": "string", "maxLength": 120},
            "linkedin_url": {"type": "string", "format": "uri"},
            "subject": {"type": "string", "maxLength": 60},
            "body": {"type": "array", "minItems": 2, "maxItems": 5, "items": {"type": "string", "maxLength": 420}},
            "ps": {"type": "string", "maxLength": 240},
            "linkedin": {"type": "string", "maxLength": 280}
          },
          "required": ["name", "subject", "body"]
        }
      }
    },
    "required": ["strategy", "segments", "funnel", "leads", "emails"]
  },
  "recipe": [
    {"id": "site", "kind": "tool", "tool": "scrape.page", "args": {"url": "https://{{ account.domain }}", "maxChars": 12000, "mode": "markdown"}, "to": "data.site"},
    {"id": "dossier", "kind": "bind", "from": "account.dossier.summary", "to": "data.dossier"},
    {"id": "why_now", "kind": "bind", "from": "account.dossier.why_now", "to": "data.why_now"},
    {"id": "offer", "kind": "bind", "from": "knowledge.offer", "to": "data.offer"},
    {
      "id": "plan",
      "kind": "prompt",
      "model": "cheap",
      "inputs": ["account.name", "account.domain", "account.industry", "data.site", "data.dossier", "data.why_now"],
      "to": ["data.strategy", "data.segments", "data.segment_notes", "data.funnel", "data.funnel_notes", "data.search", "data.sampling_criteria"],
      "prompt": "You are planning a sample outbound campaign for {{ account.name }} ({{ account.domain }}). ... Return JSON with these keys: strategy, segments, segment_notes, funnel, funnel_notes, search, sampling_criteria. ..."
    },
    {"id": "leads", "kind": "tool", "tool": "ken_search.people", "args": {"company": "any", "filters": "{{ data.search }}", "limit": 30}, "to": "data.candidates"},
    {
      "id": "copy",
      "kind": "prompt",
      "model": "cheap",
      "inputs": ["account.name", "data.candidates", "data.strategy", "data.segments", "data.sampling_criteria", "data.site"],
      "requires": ["data.candidates"],
      "to": ["data.leads", "data.emails"],
      "prompt": "Write the sample leads and outreach for {{ account.name }}'s campaign. ... leads: pick the 8 to 10 people in data.candidates who best fit ... emails: ..."
    },
    {
      "id": "grade",
      "kind": "grade",
      "on": ["data.emails"],
      "retries": 1,
      "pass_score": 7.5,
      "rubric": "Grade each email the way its recipient reads it: subject, body, PS, then the LinkedIn note. ... Pass when the overall score is 7.5 or higher ..."
    }
  ],
  "sections": [
    {"id": "cover", "label": "Cover"},
    {"id": "strategy", "label": "Strategy"},
    {"id": "segments", "label": "Segments"},
    {"id": "funnel", "label": "Funnel"},
    {"id": "leads", "label": "Sample leads"},
    {"id": "outreach", "label": "Outreach"},
    {"id": "next_steps", "label": "Next steps"}
  ],
  "cta": {"primary": "booking", "label": "Book 30 minutes"}
}
```

What each part does:

- `kenStudio`, `name`, `type`, `format`: a `reverse_demo` in `doc` format, so the page also downloads as a PDF.
- `slug` `outbound-campaign`: Leo at Brightwave gets `https://{host}/brightwave/outbound-campaign-for-leo`.
- `slots`: `site`, `dossier`, `why_now`, `offer`, `search` and `candidates` are working slots. They hold scraped text, research and raw search results that later steps read; they are optional because the page never shows them. Every `to` must name a declared slot, so intermediate results are declared too.
- `slots.required`: the five slots the page cannot do without. Only `funnel` has its own `fallback` (planning numbers); the others are covered because the bundle ships `fallback.liquid`.
- The `maxLength` limits match the layout: chart labels at most 28 characters (the chart kit's limit), segment labels 24, subjects 60.
- `recipe`: scrape the site, bind two dossier fields and the Knowledge offer, plan with a `prompt` (seven slots in one call), search people with the filters that prompt wrote (`"{{ data.search }}"` passes the object through), write leads and emails with a second `prompt` that `requires` the search results (no results, no leads: the page falls back instead of naming people the search never found), then `grade` the emails. A failing grade reruns `copy` once (`retries: 1`) and then marks the page needs_review.
- `sections`: seven ids, each on exactly one `data-section` element in `template.liquid`.
- `cta`: describes the booking button the template renders with `{% render 'ken/cta', label: 'Book 30 minutes', kind: 'booking' %}`.

## Slot schema subset

`slots` is a hand-checked subset of JSON Schema. These keywords and nothing else:

| Keyword | Where | Notes |
|---|---|---|
| `type` | every node | `string`, `number`, `integer` (a whole number), `boolean`, `array`, `object` |
| `properties` | objects | Child schemas by name |
| `required` | objects | Names that exist in `properties` |
| `items` | arrays | One schema for every item |
| `minLength`, `maxLength` | strings | Counted in characters (an emoji is one) |
| `minItems`, `maxItems` | arrays | |
| `enum` | any | Non-empty list of allowed values |
| `format` | strings | Only `"uri"`: an absolute https URL |
| `fallback` | any slot | Studio's own: see below |
| `title`, `description` | any | Notes for people and for the model that fills the slot |

Anything else fails: `pattern`, `oneOf`, `anyOf`, `$ref`, `additionalProperties`, `minimum`, `default` give `slot-schema-keyword`; a type like `date` or `null`, or a `format` other than `uri`, gives `slot-schema-invalid`. Express a rule the subset cannot hold with `enum`, a length limit, or the step's prompt.

### Fallbacks

- Every required slot needs a `fallback`, unless the bundle ships `fallback.liquid` (`slot-fallback-missing`).
- A static fallback is plain JSON that matches the slot's own schema: an array for an array slot, an object with its required keys for an object slot (`slot-fallback-invalid`).
- A Liquid fallback is a string with `{{ }}`, allowed only on `string` slots. It may read only Kenso variables, never `data.*` (`slot-fallback-data-ref`), and may not use `{% render %}`. Example from `event-invite`: `"host": {"type": "string", "minLength": 2, "maxLength": 80, "fallback": "{{ sender.name | default: 'Our team' }}"}`.
- Optional slots may skip a fallback. When such a slot is unfilled it is absent at render, so wrap its markup in `{% if data.x %}`.

### What renders when

The same URL always serves the best version available, and upgrades in place when the fill finishes (no caching):

1. **Personalized**: the page is `ready` or `live` and every required slot is filled. `template.liquid` renders with the filled `data`.
2. **Partial**: some slots failed or are still empty. `template.liquid` renders with each unfilled slot replaced by its `fallback`; an unfilled slot without one is absent. A slot counts as unfilled when it has no value, an empty string, or a value that broke a data rule.
3. **Fallback page**: the bundle ships `fallback.liquid` and no slot is filled yet, or a required slot has neither a value nor a fallback. `fallback.liquid` renders with empty `data`.
4. **Safety net**: when `template.liquid` throws, runs past the render limits, or its output still contains `{{` or `{%`, the page serves `fallback.liquid`. If that fails too, a plain page with the account name, "Prepared by" the sender and a booking button.

A page never shows an unresolved slot. Emails go out on schedule with the link; fallbacks cover whatever is not filled yet.

## Liquid

Pages render with LiquidJS 10 on the page server. The validator parses with Scriban's Liquid mode and allows only the tags Studio renders.

- **Tags**: `if`, `elsif`, `else`, `unless`, `case`, `when`, `for` (with `limit`, `offset`, `reversed`, `break`, `continue`), `tablerow`, `assign`, `capture`, `increment`, `decrement`, `cycle`, `echo`, `comment`, `raw`, and `render` for the four kit snippets only. No `include`, `layout`, `block` or `{% liquid %}`. Nesting stays under 250 levels.
- **Filters**: strict. A filter LiquidJS does not know makes the whole template fail at render, and the page drops to its fallback. Use the standard ones: `default`, `escape`, `append`, `prepend`, `replace`, `remove`, `split`, `join`, `first`, `last`, `size`, `map`, `where`, `sort`, `uniq`, `slice`, `truncate`, `truncatewords`, `upcase`, `downcase`, `capitalize`, `strip`, `strip_html`, `newline_to_br`, `strip_newlines`, `url_encode`, `date`, `plus`, `minus`, `times`, `divided_by`, `modulo`, `round`, `floor`, `ceil`, `abs`, `at_least`, `at_most`, `json`, `raw`.
- **Variables**: not strict. An unknown variable renders empty; the validator warns with `liquid-unknown-variable`. Root variables are `account`, `person`, `sender`, `brand`, `link`, `data`, `asset_url`, plus whatever the template assigns.
- **Dates** render in UTC with the `en-US` locale.
- **Limits**: 50,000 render steps (each node, loop iteration and kit call is one) and 2 MB of output per page. Past either, the render fails and the fallback serves.
- **Escaping**: every `{{ }}` output is HTML-escaped automatically. Existing entities are kept, so an explicit `| escape` is harmless and never escapes twice. To output HTML from a slot, use `| raw`. Markup a filter adds is escaped too, so prose with line breaks escapes first and ends in `raw`: `{{ data.intro | escape | newline_to_br | strip_newlines | raw }}`, or the reader sees `<br />` as text. Filled HTML must pass `data-active-content`: formatting elements only, never scripts, styles, forms, frames, media or handlers.
- **Scripts**: a template has none (`csp-inline-script`). Print only numbers into an `x-data` literal or a directive; print text with Liquid in the markup, where escaping keeps it safe.
- **Defaults**: give every Kenso variable that can be null a `| default:` or an `{% if %}` guard (which ones: see Kenso variables).
- **Truthiness**: an empty string is truthy. An empty top-level slot is replaced by its fallback or removed before render, so `{% if data.x %}` works for it. Test nested strings with `{% if e.ps and e.ps != '' %}`.
- **Literal braces**: a rendered page that contains `{{` or `{%` counts as a failed render. Never print literal Liquid braces, not even through `{% raw %}`.

Examples:

```liquid
{%- assign font_head = brand.fonts.heading | default: 'Newsreader' -%}
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={{ font_head | replace: ' ', '+' }}:wght@400;600;700&display=swap">
<style>.page{--accent:{{ brand.colors.primary | default: '#4f00d0' }};font-family:'{{ font_head | escape }}',system-ui,sans-serif}</style>

<p>Hi {{ person.first_name | default: 'there' }},</p>
<p>Prepared by {{ sender.name | default: 'our team' }}{% if sender.title %}, {{ sender.title }}{% endif %}.</p>
{%- if brand.logo_url %}<img src="{{ brand.logo_url | escape }}" alt="{{ brand.name | default: 'Logo' | escape }}">{%- endif %}
<img src="{{ asset_url | append: '/hero.png' }}" alt="">
```

```liquid
<table>
{%- for lead in data.leads limit: 10 %}
<tr><td>{{ lead.name }}</td><td>{{ lead.title }}</td><td>{{ lead.why }}</td></tr>
{%- endfor %}
</table>

{%- for e in data.emails %}
<h3>{{ e.subject }}</h3>
{%- for line in e.body %}<p>{{ line | strip }}</p>{%- endfor %}
{%- if e.ps and e.ps != '' %}<p>{{ e.ps }}</p>{%- endif %}
{%- endfor %}

{%- case f.severity -%}
{%- when 'high' -%}<span class="sev sev-high">Fix first</span>
{%- when 'medium' -%}<span class="sev">Worth fixing</span>
{%- else -%}<span class="sev sev-low">Minor</span>
{%- endcase %}
```

```liquid
<div class="summary">{{ data.summary_html | raw }}</div>
<div class="calc" x-data="roi" data-reps="{{ data.reps | default: 6 }}" data-hours="{{ data.hours | default: 8 }}"></div>
```

## Kenso variables

Supplied at render, never filled by the recipe. Recipes fill only `data.*`.

| Variable | Fields | Notes |
|---|---|---|
| `account` | `name`, `domain`, `industry`, `size_band`, `employee_count`, `hq_location`, `linkedin_url`, `why_now`, `angle`, `fit_score`, `dossier.summary`, `dossier.why_now`, `dossier.angle`, `dossier.fit_score` | `size_band` is `1-10`, `11-50`, `51-200`, `201-500`, `501-1000`, `1001-5000`, `5001-10000` or `10001+`. `dossier` also carries the keys of the latest research run. Any field can be null. A page built for a campaign lead's company also has `description`, and an empty `dossier` |
| `person` | `first_name`, `last_name`, `title`; on a recruiting page also `current_title`, `current_company`, `location`, `skills` (a list of strings), `experience_summary`, `linkedin_url` | Per-person links only. **Null on the shared link and during the fill**, so every use needs `\| default:`. A recruiting page is the exception: it is filled per candidate, so `person` is set during its fill too |
| `sender` | `name`, `first_name`, `last_name`, `title`, `signature_html` | `title` is null today. The sender's email is never a variable |
| `brand` | `name`, `logo_url`, `colors.primary`, `colors.secondary`, `fonts.heading`, `fonts.body` | **`colors` and `fonts` are null today.** `logo_url` is null unless the workspace has its own brand |
| `link` | `page_url`, `booking_url`, `refresh_url` | `page_url` is this page's URL. `booking_url` is the sender's booking link, or null |
| `asset_url` | | Base URL of `assets/`, no trailing slash: `{{ asset_url \| append: '/logo.png' }}` serves `assets/logo.png` |
| `role` | `title`, `company`, `location`, `remote_policy` (`onsite`, `hybrid`, `remote` or null), `pay_range` (text like "$150k-$180k a year", empty text when the role has no pay), `description` (at most 4000 characters), `highlights` (the must-haves, at most 10), `job_url`, `booking_url` | Recruiting pages only, during the fill and on the page; absent everywhere else. `booking_url` is null during the fill and equals `link.booking_url` on the page |
| `roles` | A list shaped like `role`: the campaign's primary role first, then its open extra roles, at most 4 | Recruiting pages only, during the fill and on the page |

`brand.colors.*`, `brand.fonts.*` and `sender.title` are null today, so every use needs `| default:`. `fallback.liquid` and Liquid slot fallbacks see the same variables, with empty `data`.

Recipes also read `knowledge.*` (the workspace's Knowledge, in `bind` and `inputs`). It is empty today, so a `knowledge.*` bind falls back. Templates cannot read `knowledge`.

## Kit snippets

Four snippets, called with `{% render 'ken/<name>', key: value, ... %}`. Values are quoted strings, numbers or variables. Each renders plain elements that template CSS can style.

**`ken/cta`**: a link button.

```liquid
{% render 'ken/cta', label: 'Book 20 minutes', kind: 'booking' %}
{% render 'ken/cta', label: 'Read the full report', href: 'https://brightwave.example/report', id: 'report', variant: 'link' %}
```

| Arg | Meaning |
|---|---|
| `label` | Button text. Default "Book a time" (booking) or "Learn more" |
| `kind` | Only `'booking'`: the button goes to `link.booking_url`. Any other value is a `liquid-render-arg` warning |
| `href` | Destination when `kind` is not set: https, mailto, tel, a relative path or `#` |
| `id` | Name for click tracking (`data-ken-cta`). Default `booking` or `primary` |
| `variant` | `'link'` drops the button styling |
| `color` | `#rgb` or `#rrggbb`. Default `brand.colors.primary`, else `#111827` |

Markup: `<a class="ken-cta" data-ken-cta="...">` with inline button styles (override them with `!important`, or use `variant: 'link'`). External links open in a new tab. It renders nothing when there is no safe destination, for example `kind: 'booking'` while the sender has no booking link. Guard it with `{% if link.booking_url %}` when the page needs a visible ask either way.

**`ken/chart`**: an inline SVG chart, no JavaScript.

```liquid
{% render 'ken/chart', type: 'funnel', data: data.funnel, title: 'What 1,000 sends should turn into' %}
```

| Arg | Meaning |
|---|---|
| `type` | `'bar'` (default), `'funnel'`, `'line'` or `'pie'`. Anything else is a `liquid-render-arg` error |
| `data` | A list of `{label, value}`. Labels are cut to 28 characters, at most 50 points, negative values count as 0. Other item keys are ignored, so `data.segments` with `{label, sub, value}` works |
| `title` | A string or a variable: the SVG `aria-label` and a `<figcaption>` |
| `color` | `#rgb` or `#rrggbb`. Default `brand.colors.primary`, else `#2563eb` |

Markup: `<figure class="ken-chart" data-ken-chart="bar"><svg ...></svg><figcaption>...</figcaption></figure>`. Empty data renders nothing, and so does a pie whose values add up to 0. `chart.data` (a recipe tool) shapes any list into `{label, value}`.

**`ken/booking`**: the sender's booking page inline.

```liquid
{% render 'ken/booking', height: 760 %}
```

Args: `title` (the iframe title, default "Book a time"), `height` (pixels, 320 to 1200, default 700), `color` (the fallback button's color). Markup: `<div class="ken-booking" data-ken-booking="embed"><iframe ...></iframe></div>` when `link.booking_url` is on the booking frame list. Otherwise a `ken/cta` booking button, or nothing when there is no booking link.

**`ken/form`**: a form that posts only to the platform. Each submission becomes a signal on the account.

```liquid
{% render 'ken/form', id: 'rsvp', fields: 'name*, email*, company, dietary', submit: 'Save my seat' %}
```

| Arg | Meaning |
|---|---|
| `id` | Form name, `[a-z0-9-]`. Default `form` |
| `fields` | Comma-separated field names; a trailing `*` makes a field required. Common names: `name`, `email`, `company`, `title`, `guests`, `dietary`, `note`. Default `'name*, email*'`. Or a variable holding a list of `{name, label, type, required, options, placeholder}` |
| `submit`, `color` | Button text (default "Submit") and button color |

- A field name is lowercase, starts with a letter, at most 40 characters. The type follows the name: `email`; `phone`, `tel` or `mobile` give tel; `website`, `url` or `site` give url; `message`, `note`, `notes`, `comment` or `question` give a textarea; anything else is text. A list item may set `type` to `text`, `email`, `tel`, `url`, `number`, `date`, `textarea`, `select` (needs `options`) or `checkbox`.
- At most 12 fields. Password, card and ID-number names never render.
- Markup: `<form class="ken-form">`, one `<label class="ken-form-field">` per field (a `<span>` with the label, then the `input`, `textarea` or `select`), `<label class="ken-form-field ken-form-check">` for checkboxes, and `<button class="ken-form-submit">` with inline styles. The form needs a published link: without one (a preview) it renders nothing.

## Tracked sections

- Put `data-section="<id>"` on exactly one element per section (usually a `<section>` or `<header>`).
- The ids in `template.liquid` equal `studio.json` `sections[].id`, both ways. Ids match `^[a-z0-9_-]+$`, and each section has a `label`.
- `fallback.liquid` may use only declared ids. It does not have to use all of them.
- Time spent per section, CTA clicks (`data-ken-cta`) and form submits become engagement and signals on the account. Pick sections a seller would want to know were read: pricing, the leads table, the result.

## What HTML can do (CSP and allow-lists)

Every Studio page is served with this Content Security Policy, built from the policy below:

```
default-src 'none'; script-src 'self' 'nonce-<per response>' https://cdn.jsdelivr.net/npm/chart.js@4 https://cdn.jsdelivr.net/npm/chart.js@4/ https://cdn.jsdelivr.net/npm/@alpinejs/csp@3/ https://cdn.jsdelivr.net/npm/motion@11 https://cdn.jsdelivr.net/npm/motion@11/ https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://api.ken.so/media/; connect-src 'self' https://cloudflareinsights.com/cdn-cgi/rum; frame-src https://calendly.com https://cal.com https://app.cal.com https://meetings.hubspot.com https://meetings-eu1.hubspot.com https://*.chilipiper.com https://savvycal.com https://www.loom.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://fast.wistia.net; form-action 'self'; base-uri 'none'; frame-ancestors 'none'
```

The policy the validator and the page server share, verbatim:

```json
{
  "schemaVersion": 1,
  "csp": {
    "scriptSources": [
      "https://cdn.jsdelivr.net/npm/chart.js@4", "https://cdn.jsdelivr.net/npm/chart.js@4/",
      "https://cdn.jsdelivr.net/npm/@alpinejs/csp@3/", "https://cdn.jsdelivr.net/npm/motion@11",
      "https://cdn.jsdelivr.net/npm/motion@11/"
    ],
    "styleSources": ["https://fonts.googleapis.com"],
    "fontSources": ["https://fonts.gstatic.com"],
    "imageSources": ["https://api.ken.so/media/"]
  },
  "frames": {
    "booking": [
      "https://calendly.com", "https://cal.com", "https://app.cal.com", "https://meetings.hubspot.com",
      "https://meetings-eu1.hubspot.com", "https://*.chilipiper.com", "https://savvycal.com"
    ],
    "video": [
      "https://www.loom.com", "https://www.youtube.com", "https://www.youtube-nocookie.com",
      "https://player.vimeo.com", "https://fast.wistia.net"
    ]
  },
  "links": {
    "shorteners": [
      "bit.ly", "bitly.com", "bl.ink", "buff.ly", "clck.ru", "cutt.ly", "dub.sh", "goo.gl", "is.gd", "lnkd.in",
      "ow.ly", "rb.gy", "rebrand.ly", "s.id", "shorte.st", "short.io", "shorturl.at", "snip.ly", "t.co", "t.ly",
      "t2m.io", "tiny.cc", "tinyurl.com", "tr.im", "v.gd", "x.co"
    ]
  },
  "kit": ["ken/cta", "ken/chart", "ken/booking", "ken/form"],
  "chart": {"types": ["bar", "funnel", "line", "pie"], "maxLabelLength": 28, "maxPoints": 50},
  "forms": {
    "fieldTypes": ["text", "email", "tel", "url", "number", "date", "textarea", "select", "checkbox"],
    "maxFields": 12,
    "deniedInputTypes": ["password"],
    "deniedAutocompletePrefixes": ["cc-", "current-password", "new-password"],
    "deniedFieldNamePatterns": [
      "pass(word|code|phrase)?", "[a-z]*passw(or)?d", "pwd", "pin",
      "(credit|debit)?card(number|num|no|holder|code|exp|expiry)?", "cc-?(number|num|no|exp|csc|cvv|cvc)", "cvv",
      "cvc", "ccv", "security-?code", "iban", "routing(number|num|no)?", "account-?(number|num|no)", "ssn",
      "social-?security", "tax-?id", "national-?id", "passport", "driver'?s?-?licen[cs]e"
    ]
  }
}
```

What that means for the HTML you write:

- **Scripts**: no inline `<script>` and no `on*` handler attributes (`csp-inline-script`). Only Kenso's own scripts run inline, each with the response's nonce; a template's inline script has none and does not run. A JSON data block (`type="application/ld+json"` structured data, or `application/json`) is not script and stays allowed. For charts, forms, booking and CTAs use the kit (`ken/chart`, `ken/form`, `ken/booking`, `ken/cta`). External scripts only from the script sources: Chart.js 4, the Alpine CSP build 3 and Motion 11. A source without a trailing `/` matches only that exact URL, so load files under the `/` prefixes, for example `https://cdn.jsdelivr.net/npm/@alpinejs/csp@3/dist/cdn.min.js`. Chart.js and Motion need a script of the page's own to call them, so use `ken/chart` and CSS animations instead.
- **Alpine**: only the CSP build (`@alpinejs/csp`), loaded with `defer`. Standard Alpine evaluates expressions with `new Function`, which the policy blocks, so it fails. There is no inline script to register `Alpine.data` components in, so keep state in `x-data` object literals (`x-data="{ open: false }"`) and directive expressions to what the CSP build evaluates: object and array literals, arithmetic, comparisons, ternaries, `!` and `&&`, assignments (`count = 0`, `count++`) and method calls on the component's data. Globals (`Math`, `window`, `document`, `parseInt`), arrow functions, template literals, spread and `x-html` do not run. Never bind an input's `type`, `name` or `autocomplete` (`:type`, `x-bind:type`): it fails `csp-input-type`. No `eval` and no `new Function` anywhere.
- **Network**: `connect-src 'self'`. `fetch` and XHR reach only the page's own host, so no third-party APIs and no analytics or pixels. Studio tracks views itself. The served header also lists `static.cloudflareinsights.com` and `cloudflareinsights.com/cdn-cgi/rum`, only for the Cloudflare Web Analytics beacon the zone injects after the page is served. Do not load or call them: the validator rejects a `<script src>` from that host, and Studio's own view tracking is the page's analytics.
- **Styles and fonts**: inline `<style>` blocks and Google Fonts (`fonts.googleapis.com` CSS, `fonts.gstatic.com` files). Self-hosted font files go in `assets/` and load through `@font-face` with `asset_url`.
- **Images** (`img`, `srcset`, `poster`, icons, CSS `url()`): `assets/` through `asset_url`, `data:` images, or the image proxy `https://api.ken.so/media/`. Nothing from other hosts.
- **Frames**: only the booking and video lists. Use `ken/booking` for booking. No `<object>`, `<embed>` or `<applet>`.
- **Forms**: post only back to the page's own host, which is the platform's form handler. Use `ken/form`: the handler stores only the fields a `ken/form` on the page declared and drops password, card and ID-number names. A form the template writes itself stores nothing. Password inputs, `cc-*` or password autocomplete, and card or ID-number field names are rejected.

## Links

Every `href`, `src`, `srcset`, `action`, `formaction`, `poster`, meta refresh and literal `window.open` URL in the templates, and every URL and HTML string in filled data, passes the static link rules: `link-scheme`, `link-ip-host`, `link-userinfo`, `link-port`, `link-shortener`, `link-punycode`, `link-text-mismatch` and `nav-redirect`. The validation table below has each rule and its fix. In short: https (or mailto, tel, relative, `#`), a real domain, no `user@`, no port, no shortener, no punycode unless it is one of the workspace's DNS-verified domains, link text that names the real destination, and no scripted redirects.

A URL that holds Liquid (`https://{{ account.domain }}/pricing`) is checked at push only up to the Liquid. The rest is checked on the filled data and at render.

At publish, at fill and on Customize, every external link host also gets a reputation check:

| Rule | Severity | Meaning and fix |
|---|---|---|
| `link-domain-blocked` | error | A malware-blocking resolver (Cloudflare or Quad9) blocks the domain. Remove the link |
| `link-domain-new` | error | The domain was registered less than 30 days ago. Remove it, unless it is one of the workspace's DNS-verified domains: a sending domain Kenso bought, an imported one moved to Kenso's nameservers, or its Ready hosting hostname (then it passes). The email domain, the website and the account's domains are typed in, so they get the age rule too |
| `link-check-unavailable` | warning | The check could not run. Nothing to fix; publishing goes ahead |

Results are cached 24 hours per domain. Publishing is refused (409) while a link is flagged. Live pages are re-checked daily, and a page whose link host turns bad is taken down.

## Recipe steps

The recipe fills `data.*` for one account, in order. Every step is `{"id", "kind", ...fields, "to"}`.

- `id`: unique in the recipe.
- `to`: `"data.<slot>"` or a list of them; every slot is declared in `slots`.
- `inputs` and Liquid read only Kenso variables, `knowledge.*`, or `data.<slot>` that an earlier step fills. Order the steps so writers come before readers.
- Recipe text (a prompt's `prompt`, a grade's `rubric`, every string in a tool's `args` and a dataset's `where`) takes output tags only: `{{ account.name }}`, `{{ data.leads[0].name }}`, `{{ data.why_now | default: 'no news' }}`. Filters: `default`, `upcase`, `downcase`, `capitalize`, `strip`, `size`, `join`, `truncate`, `json`. A `{% %}` tag (`if`, `for`, `assign`) fails validation (`recipe-liquid-tag`), because the runner refuses it on every fill and every page would fall back. Put a condition in words instead ("skip the industry line when it is blank"); `template.liquid` and `fallback.liquid` keep the full tag set.
- `requires` (optional, every kind but `bind`): the `data.<slot>` paths the step cannot work without, each written by an earlier step, such as `["data.candidates"]`. When one is empty (null, blank text, an empty list or object) or its step failed, the step does not run: no model or tool call, no charge, it is recorded `skipped`, and its slots fall back. A step that requires those slots skips in turn. Put it on every prompt that writes from search or tool results, so a failed search never turns into invented people.
- `person` is null while the recipe runs (pages fill once per account; person fields bind per link). Read `person.*` in the template, not in the recipe. Recruiting pages are the exception: they fill once per candidate, so `person.*`, `role.*` and `roles` are set while the recipe runs, and a `prompt` reads them in `inputs`.
- Credits: when the platform runs the recipe (executor `ken`), `prompt`, `grade` and `ken.copy` cost tokens at 2x model cost. When your own agent fills the page (executor `agent`, the `studio-asset` skill's `references/studio-fill.md`), there is no token charge. `bind`, Kenso Search, `scrape.page`, `chart.data`, `webhook` and `dataset` are free.

### bind

Copies one value into one slot. Fields: `from` (starts with `account.`, `person.`, `role.` or `knowledge.`, including `account.dossier.*`), `to` (one slot). A missing or empty source is not an error: the slot falls back.

```json
{"id": "why_now", "kind": "bind", "from": "account.dossier.why_now", "to": "data.why_now"}
```

### tool

Fields: `tool`, `args`, `to`. `ken.copy` also takes a step-level `model`. Args are strings with output tags over Kenso variables and `data.*` (recipe text above: no `{% %}` tags, nested args included). An arg that is exactly one output tag, like `"{{ data.search }}"`, passes the typed JSON value through instead of a string. The result is fitted to the target slot's schema.

| Tool | Args | Result |
|---|---|---|
| `ken_search.people` | `company`: `"account"` (default, the account's domain), a domain, or `"any"` to search across companies (needs at least one filter). `filters`: a camelCase Kenso Search people filter object (`currentTitles`, `seniorityLevels` from Entry, Individual, Senior, Manager, Director, VP, CLevel, Owner; `industries` as lowercase LinkedIn industries; `companyHeadcount {min, max}`; `countries`, where people exist only in United States, United Kingdom, Canada, Australia, Ireland and New Zealand, so any other country finds no one). `titles`, `seniorities`, `departments`, `locations`: lists that override those filters. `limit` 1 to 30, default 10 | People records (`name`, `title`, `company`, `linkedin_url`, ...), never an email address or phone number |
| `ken_search.companies` | `filters`: a camelCase Kenso Search account filter object (`industries`, `hiringSurge`, `headcountGrew`, `raisedFundingRecently`, ...). Without `filters` it finds lookalikes of `company` (`"account"` default, or a domain). `mode`: `filters` or `lookalikes`, inferred. `limit` 1 to 50, default 10 | Company records; never the account itself |
| `scrape.page` | `url` (default `https://{{ account.domain }}`; a bare host gets `https://`), `maxChars` 200 to 20,000 (default 12,000), `mode` `markdown` (default) or `metadata` | `{url, source, title, description, markdown, captured_at}`, emails and phone numbers removed. An account with no domain falls back |
| `ken.copy` | `brief` (required: what to write, for whom, which facts), `kind` `email`, `headline` or `paragraph` (default), `tone`, `maxWords` (default 120, 14 or 80 by kind; at most 400) | A string, or a list of paragraphs when the slot is an array |
| `chart.data` | `from` (`"data.segments"` or `"{{ data.segments }}"`), `label` and `value` (item fields, default `label` and `value`, dotted paths work), `top` 1 to 50, `sort` `none` (default), `desc` or `asc` | `[{label, value}]` for `ken/chart`, labels cut to 28 characters |
| `enrich.email` | | Not available yet: its slot always falls back and nothing is charged. Do not build on it |

```json
{"id": "leads", "kind": "tool", "tool": "ken_search.people", "args": {"company": "any", "filters": "{{ data.search }}", "limit": 30}, "to": "data.candidates"}
```

### prompt

A model writes one or more slots. Fields:

- `prompt`: recipe text (output tags only) over Kenso variables and `data.*`.
- `inputs`: the paths the model reads (Kenso variables, `knowledge.*`, earlier slots).
- `to`: the slots it writes. The model answers JSON with exactly those slot names as keys, and each value is checked against its slot schema. A bad answer is retried with the reason.
- `model`: `cheap` (default) or an allow-listed model name. An unknown name fails the step, and the error lists the valid names.

Write the slot limits into the prompt too ("label at most 24 characters"); the schema rejects, the prompt prevents.

```json
{"id": "why_you", "kind": "prompt", "model": "cheap", "inputs": ["account.name", "account.industry", "account.size_band", "account.dossier.summary", "data.why_now"], "to": ["data.why_you"], "prompt": "Write the personal line on an invite from {{ sender.name | default: 'our team' }} to someone at {{ account.name }}. ... Use facts from these inputs only. Never invent news, numbers, customers or people. ..."}
```

### grade

A judge scores slots against a rubric. Fields: `rubric` (recipe text, output tags only), `on` (slots an earlier step fills), `retries` (rewrites allowed, default 2, at most 5), `pass_score` (0 to 10, default 7), `checks` (optional, below). The judge answers `{score, pass, reasons, fix}`. On a fail, the steps that wrote those slots run again with the judge's `fix`. Still failing after `retries`, the page is marked needs_review. A grade with none of its slots filled is skipped.

```json
{"id": "grade", "kind": "grade", "on": ["data.rewrites"], "retries": 2, "pass_score": 7, "rubric": "Grade the three rewrites in data.rewrites the way {{ account.name }}'s team would read them. 10 is a rewrite they could paste onto their site today. ...",
 "checks": {"banned": ["demo", "I noticed"], "no_dashes": true, "no_placeholders": true, "skip": ["name", "title", "linkedin_url"]}}
```

`checks` are string rules the platform runs on the graded slots before the judge. A hit fails the grade with no model call and no charge; `fix` names each rule and quotes the phrase, and the writers rerun with it, counting against `retries`. The judge runs only when every check passes. Each check is off unless the step turns it on:

| Check | Fails on |
|---|---|
| `banned` | each listed word or phrase (at most 100, each at most 80 characters) on word edges, with its -s, -es, -ed, -d or -ing forms: `demo` fails `demos`, not `demonstrate` |
| `no_placeholders` | `{{`, `{%`, `[[` or `${` left in the text, and `Your name` |
| `no_dashes` | em and en dashes and their entities; the simple hyphen `-` passes |
| `no_prices` | `$`, `€` or `£` before a number, or a number next to USD, EUR or GBP; `40%` passes |
| `no_test_noun` | "test" as a noun (`a quick test`, `test campaign`); the verb passes |
| `no_real_emphasis` | the word "real"; `real estate`, `real time` and `really` pass |
| `no_signoff` | a `body` field whose last paragraph is a sign-off (Best, Thanks, Cheers, ...) or a bare name |

- The checks read every string in the graded slots, nested ones included, except under the field names in `skip` (at most 50): values copied from search results that a rewrite cannot change.
- Keep `banned` to words no account or product name would hold: a name the copy must quote fails on every rewrite and sends the page to review.
- Any other key, or a value of the wrong type, fails validation (`recipe-grade-checks`), so a misspelled check never silently skips.
- Checks run on both fill paths. When the platform fills the page (executor `ken`), they run before the judge. Your own agent's fill (executor `agent`) gets `checks` with the grade instruction, and submit refuses copy that fails them, unless the agent reports that grade with `pass: false`, which sends the page to needs_review.

### webhook

Your own endpoint fills slots. Fields: `url` (absolute https), `headers` (optional, static strings), `to`, `timeout_s` (above 0, at most 30).

- The platform POSTs `{account, person, data, template: {id, versionId}, assetId}` (`person` is null at fill time).
- The answer is a JSON object whose top-level keys are the `to` slot names. Each value is checked against its slot schema; a missing or invalid slot falls back.
- The platform signs every call Standard Webhooks style (`webhook-id`, `webhook-timestamp`, `webhook-signature`), so any Standard Webhooks or Svix library can verify it. Checking is up to you.
- Redirects are not followed. Timeouts, 408, 429 and 5xx are retried; other 4xx answers are final.

```json
{"id": "run", "kind": "webhook", "url": "https://api.your-product.example/ken/studio", "to": ["data.metric", "data.findings", "data.chart", "data.chart_title", "data.scope", "data.report_url"], "timeout_s": 20}
```

### dataset

Picks rows from a CSV uploaded to the template. Fields: `dataset` (its name), `where`, `limit` (default 10, at most 100 and the slot's `maxItems`), `to`.

- `where` is a list of `{column, op, value}`. `op` is `eq` (numbers as numbers, text case-insensitive), `in` (a list) or `between` (`[min, max]` or `{min, max}`, inclusive, numeric, a null bound is open).
- `value` is a literal, a variable path (`account.industry`, `data.segment`) or a `{{ }}` tag. A variable the account does not have matches no row, so a page never shows rows picked for another account.
- Rows become the items of an array slot (columns map to the item's properties by name and convert to their types), or the first match fills an object slot. No match: the slot falls back.
- Upload the CSV (header row first, at most 5 MB and 50,000 rows): `studio_templates(operation="create-upload-url", template_id=41, path="peers.csv", content_type="text/csv", size_bytes=48210)`, PUT the bytes to `url` with exactly the returned `headers`, then `studio_templates(operation="datasets-create", template_id=41, name="peers", upload_id="<uploadId>")`. List them with `studio_templates(operation="datasets-list", template_id=41)`.

```json
{"id": "peers", "kind": "dataset", "dataset": "peers", "where": [{"column": "industry", "op": "eq", "value": "account.industry"}, {"column": "size_band", "op": "eq", "value": "account.size_band"}], "limit": 12, "to": "data.benchmarks"}
```

## Filled data rules

Whatever fills `data.*` (the recipe, your agent through `submit`, a person's Customize edit) is checked against the slot schema and these rules. A value that breaks one fails that slot, and the slot shows its fallback:

- No unresolved `{{`, `{%`, `[[` or `${` in any string (`data-unresolved`).
- No email address or phone number except the sender's own (`data-third-party-contact`). Figures with a decimal digit, dates, years, counts and prices are fine.
- None of the workspace's banned phrases from Knowledge, case-insensitive, whole words (`data-banned-phrase`).
- HTML values are formatting only: `p`, `br`, `hr`, `span`, `div`, inline text tags, headings, `blockquote`, `pre`, `code`, lists, tables, `a`, `img`, `picture`, `source`, `figure`. No `on*` handlers and no Alpine attributes (`x-*`, `@*`, `:*`) (`data-active-content`). A value counts as HTML as soon as `<` is followed by a letter or `/`.
- Every URL and HTML string passes the link rules, and `img` sources pass the image rule.

## Validation: read the result and fix it

`validate` returns, and `push` returns as `validation`:

```json
{"ok": false, "errorCount": 1, "warningCount": 1, "issues": [
  {"file": "template.liquid", "line": 212, "column": 1, "rule": "csp-script-src", "severity": "error",
   "message": "An external script from 'https://unpkg.com/alpinejs@3/dist/cdn.min.js' is blocked by the page's Content Security Policy.",
   "fix": "Load scripts only from the Studio CDN list (Chart.js 4, the Alpine CSP build 3, Motion 11)."},
  {"file": "template.liquid", "line": 40, "column": 12, "rule": "liquid-unknown-variable", "severity": "warning",
   "message": "'company' is not a Ken variable or a variable the template assigns; it renders empty.", "fix": "Use account.name."}
]}
```

- `ok` is true when no issue is an error. Errors block publishing; warnings never do, but read them (an unknown variable renders empty).
- For data issues, `file` is the data path (`data.leads[2].linkedin_url`) and `line` is empty.
- Publish answers 409 `invalid_state` while errors remain, with each detail naming `file:line` and the rule.

The loop:

1. `studio_templates(operation="validate", template_id=41, text_files={...})` validates your files merged over the draft and stores nothing. Add `delete_missing=True` to validate exactly what you sent.
2. Fix by rule id with the table below. Fix `manifest-json` and `liquid-parse` first: a file whose Liquid does not parse reports only parse and render errors, so more issues show up after.
3. Repeat until `errorCount` is 0, then `push`.
4. `data-*` rules run on filled data (fill, `submit`, Customize), not on the bundle. Check your samples against them by hand.

| Rule | Severity | Fix |
|---|---|---|
| **Bundle layout and limits** | | |
| `bundle-missing-file` | error | Add `studio.json` and `template.liquid` |
| `bundle-path` | error | Relative path, `/` separators, letters, digits, `.`, `_`, `-`; no `..` |
| `bundle-unknown-file` | warning | Move the file under `assets/` or `samples/` (`.json`, `.csv`), or drop it; it is ignored |
| `bundle-encoding` | error | Save the text file as UTF-8 |
| `size-template` | error | Keep each `.liquid` file at most 256 KB: move inline SVG and images into `assets/`, trim CSS |
| `size-asset` | error | Compress or resize the file to 5 MB or less |
| `size-bundle` | error | Remove or shrink assets until the bundle is 20 MB or less |
| `size-elements` | error | At most 2000 HTML start tags per file or HTML value: loop over data instead of repeating markup, or move decoration into CSS or an SVG asset |
| `asset-type` | error | Only images, fonts, pdf and csv in `assets/`; strip `<script>`, `<foreignObject>`, `on*=` and `javascript:` from SVGs; inline CSS in the template |
| `asset-relative-url` | warning | Replace the relative `assets/logo.png` (or `./assets/`, `/assets/`) and the doubled `{{ asset_url \| append: '/assets/logo.png' }}` with `{{ asset_url \| append: '/logo.png' }}`; as written it does not load on the page. Write a stylesheet inline in `<style>` instead. Fix it before you push |
| **studio.json** | | |
| `manifest-json` | error | Strict JSON: double quotes, no comments, no trailing commas |
| `manifest-size` | error | Keep it at most 256 KB: shorten prompts, or move reference text into a dataset |
| `manifest-shape` | error | Make the root a JSON object |
| `manifest-field-type` | error | Give the field its JSON type: strings for `name`, `type`, `format`, `slug`; objects for `slots`, `cta`; arrays for `recipe`, `sections` |
| `manifest-required` | error | Add the missing field (`kenStudio`, `name`, `type`, `format`, `slug`, `slots`, `recipe`, `sections`); `name` not blank |
| `manifest-version` | error | Set `"kenStudio": "1"` |
| `manifest-type` | error | Use `reverse_demo`, `landing_page`, `audit`, `report`, `event`, `calculator`, `recruiting` or `other` |
| `manifest-format` | error | Use `page`, `doc` or `email` |
| `manifest-slug` | error | Lowercase letters and digits joined by single hyphens, at most 60 characters |
| `manifest-unknown-key` | warning | Remove the key; only the fields above plus `cta` are read |
| **Slot schema** | | |
| `slot-schema-root` | error | `slots` is `{"type": "object", "properties": {...}}` |
| `slot-schema-keyword` | error | Remove the keyword (`pattern`, `oneOf`, `$ref`, ...); use `enum`, a length limit or the prompt instead |
| `slot-schema-invalid` | error | A supported `type` on every node; `format` only `uri`; `properties` only on objects; `items` only on arrays; `required` names exist; min not above max; `enum` not empty |
| `slot-fallback-missing` | error | Add a `fallback` to the required slot, or ship `fallback.liquid` |
| `slot-fallback-data-ref` | error | Read only Kenso variables in slot fallbacks and in `fallback.liquid`, never `data.*` |
| `slot-fallback-invalid` | error | Make a static fallback match the slot schema; Liquid fallbacks only on string slots, parsing, with no render tag |
| **Recipe** | | |
| `recipe-kind` | error | Use `bind`, `tool`, `prompt`, `grade`, `webhook` or `dataset` |
| `recipe-id-missing` | error | Give the step an `id` |
| `recipe-id-duplicate` | error | Rename the step; ids are unique |
| `recipe-field-missing` | error | Add the kind's required fields: bind `from`, `to`; tool `tool`, `to`; prompt `prompt`, `to`; grade `rubric`, `on`; webhook `url`, `to`; dataset `dataset`, `to` |
| `recipe-field-unknown` | warning | Remove the field; for a tool step, tool arguments go inside `args` |
| `recipe-to` | error | Point `to` at `data.<slot>` and declare that slot |
| `recipe-input` | error | List only Kenso variables (`role` and `roles` too on a recruiting page), `knowledge.*` or slots an earlier step fills; move the writing step earlier |
| `recipe-bind-from` | error | Start `from` with `account.`, `person.`, `role.` or `knowledge.`; a template reads `data.*` slots directly, no bind needed |
| `recipe-tool` | error | Use `ken_search.people`, `ken_search.companies`, `enrich.email`, `scrape.page`, `ken.copy` or `chart.data` |
| `recipe-webhook-url` | error | Use an absolute https URL |
| `recipe-webhook-timeout` | error | Set `timeout_s` above 0 and at most 30 |
| `recipe-grade-on` | error | Grade only `data.<slot>` targets an earlier step fills; put the grade after the writer |
| `recipe-value` | error | Fix the value's shape: `args` an object, `inputs` strings, `headers` static strings, `where` entries `{column, op: eq/in/between, value}`, `limit` a whole number above 0, `retries` a whole number 0 or more, `pass_score` 0 to 10 |
| `recipe-requires` | error | List `data.<slot>` paths in an array, each a declared slot an earlier step writes in its `to`; a `bind` step takes no `requires` |
| `recipe-grade-checks` | error | Make `checks` an object of `banned` (non-blank strings, at most 100, each at most 80 characters), `skip` (field names, at most 50) and the `no_*` switches as `true` or `false`; remove any other key |
| `recipe-liquid-tag` | error | Remove the `{% %}` tag from the prompt, rubric, tool args or dataset `where`; use output tags (`{{ x \| default: 'text' }}`) and put conditions in words |
| **Sections** | | |
| `section-invalid` | error | Give the section an id matching `^[a-z0-9_-]+$` and a label |
| `section-duplicate` | error | Unique ids in `studio.json`; each `data-section` value on one element only |
| `section-mismatch` | error | Make the template's `data-section` values equal `sections[].id`, both ways; `fallback.liquid` uses only declared ids |
| **Liquid** | | |
| `liquid-parse` | error | Fix the Liquid at `file:line`: close every block, use only the supported tags, nest under 250 deep |
| `liquid-unknown-render` | error | Render only `ken/cta`, `ken/chart`, `ken/booking`, `ken/form`; write other markup inline (no `include`) |
| `liquid-render-syntax` | error | `{% render 'ken/x', key: value %}`: a quoted snippet name, values that are quoted strings, numbers or variables, no trailing comma |
| `liquid-render-arg` | error / warning | Error: chart `type` outside `bar`, `funnel`, `line`, `pie`. Warning: drop an argument the snippet does not read; use `href` instead of a cta `kind` other than `booking` |
| `liquid-unknown-variable` | warning | Use a root variable (`account`, `person`, `sender`, `brand`, `link`, `data`, `asset_url`) or `assign` it first; as written it renders empty |
| `liquid-undeclared-slot` | error | Declare the slot in `studio.json`, or fix the name the template reads |
| **Content Security Policy** | | |
| `csp-script-src` | error | Load external scripts only from the script sources (Chart.js 4, Alpine CSP 3, Motion 11) |
| `csp-inline-script` | error | Remove the inline `<script>` and the `on*` handler attributes; use the kit, CSS, or Alpine directives with inline expressions. Already published versions keep serving, but their own inline scripts no longer run |
| `csp-style-src` | error | Use inline `<style>` or Google Fonts CSS; preload fonts only from `assets/` or `fonts.gstatic.com` |
| `csp-iframe-src` | error | Frame only booking or video hosts from the lists; use `ken/booking`; remove `<object>`, `<embed>`, `<applet>` |
| `csp-img-src` | error | Load images from `assets/` (`asset_url`), a `data:` image or `https://api.ken.so/media/`; this also applies to `img` and `srcset` in slot HTML |
| `csp-form-action` | error | Use `ken/form`; never post to another host |
| `csp-input-type` | error | Remove password inputs, `cc-*` or password autocomplete, and card or ID-number fields; do not bind an input's `type`, `name` or `autocomplete` |
| `csp-inline-handler-url` | error | Remove the `javascript:` URL (also encoded or split forms); use a real link, the kit, or an Alpine directive |
| **Links** | | |
| `link-scheme` | error | Use `https:`, `mailto:`, `tel:`, a relative path or `#`; `data:` only for images; no `http:`. A schemeless link with `&`, `:` or a control character before its first `/`, `?` or `#` also fails |
| `link-ip-host` | error | Link to a domain, not an IP address |
| `link-userinfo` | error | Remove the `user@` part before the host |
| `link-port` | error | Remove the port; only the default https port is allowed |
| `link-shortener` | error | Link to the final destination, not a shortener from the policy list |
| `link-punycode` | error | Use the plain ASCII domain; `xn--` hosts pass only for the workspace's DNS-verified domains (a sending domain Kenso bought or moved to Kenso's nameservers, its Ready hosting hostname) |
| `link-text-mismatch` | error | Make link text that looks like a domain or URL name the domain the link goes to, or use plain words |
| `nav-redirect` | error | Remove `<meta http-equiv="refresh">` and any `location` assignment, `location.assign` or `location.replace`; use a link or `ken/cta`; `window.open` only with a literal https URL |
| **Filled data** | | |
| `data-type` | error | Give the value the slot's type (`integer` means a whole number) |
| `data-required` | error / warning | Fill the required property. A missing required slot is a warning when it has a fallback, an error when it has none |
| `data-length` | error | Fit `minLength` and `maxLength`, counted in characters |
| `data-items` | error | Fit `minItems` and `maxItems` |
| `data-enum` | error | Use one of the `enum` values |
| `data-uri` | error | Write an absolute https URL |
| `data-unknown-slot` | warning | Drop the key, or declare the slot; it is ignored |
| `data-unresolved` | error | Resolve or remove `{{`, `{%`, `[[` and `${` |
| `data-third-party-contact` | error | Remove email addresses and phone numbers other than the sender's own |
| `data-banned-phrase` | error | Rewrite without the banned phrase |
| `data-active-content` | error | Keep HTML values to formatting elements; no scripts, styles, forms, frames, media, SVG, handlers or Alpine attributes |

After a fill, each slot reports a status: `filled` (a value with no errors), `fallback` (no value, and it has a fallback or is optional) or `failed` (its value broke a rule, or it is required with no value and no fallback).

## Samples for local preview

`samples/<name>.json` holds `{account, person, data}` (the starters add `sender` and `brand` too), shaped like the Kenso variables. A recruiting sample also carries `role` and `roles` and sets `"account": null`, since a recruiting page has no company. Render `template.liquid` with LiquidJS against each sample to see the page before you publish. Ship at least three:

- a full sample (every slot filled),
- a **partial** sample (some slots missing, so fallbacks and `{% if %}` guards show),
- a **shared** sample (`"person": null`, the shared link, so every `person.*` default shows).

`event-invite/samples/quarry-partial.json`, a partial sample where only `why_now` is filled and every other slot shows its fallback:

```json
{
  "account": {
    "name": "Quarry Health", "domain": "quarryhealth.example", "industry": "hospitals and health care", "size_band": "11-50",
    "dossier": {"summary": "Quarry Health sells patient intake software to physical therapy clinics.", "why_now": "Raised a seed round in July."}
  },
  "person": { "first_name": "Elena", "last_name": "Ruiz", "title": "Head of Growth" },
  "sender": { "name": "Maya Brennan", "title": null, "signature_html": null },
  "brand": { "name": null, "logo_url": null, "colors": null, "fonts": null },
  "data": { "why_now": "Raised a seed round in July." }
}
```

Set LiquidJS up the way the page renderer runs it, or a local render hides errors the live page shows:

- `strictFilters: true`, `strictVariables: false`, `ownPropertyOnly: true`, and every output escaped. Only HTML slots and escaped prose (`| escape | newline_to_br | strip_newlines | raw`) use `| raw`.
- The scope is one sample file: `{account, person, sender, brand, data}`, plus `role` and `roles` on a recruiting page.
- The kit snippets (`ken/cta`, `ken/chart`, `ken/booking`, `ken/form`) render inside Studio only, and `ken/form` needs a published link. Register placeholder partials with those names so the page renders.

A local render does not apply the fallback precedence for you. To preview the partial variant, merge each missing slot's `fallback` into `data` first (render Liquid fallbacks over the sample's Kenso variables). When a required slot has no fallback and the bundle ships `fallback.liquid`, render that file instead. Open each result at 375 px and 1280 px wide.

The hosted preview (`studio_templates(operation="preview", ...)`, Step 5 of the `studio-template` skill) is the main check: it renders the stored draft on real accounts on the workspace's own host and returns URLs, mobile and desktop screenshots and console errors. Pass `sample="samples/<name>.json"` to render one of these samples' `data` on each account, with that account's own Kenso variables: the filled layout before any page exists. Without `sample`, an account with no page renders the fallback, and with no `account_ids` and no recently touched accounts the preview renders these samples on their own. Render locally when you want a check before you push.

## Type playbooks

One playbook per page type, in the `studio-template` skill's `references/`. Open one with `load_skill("studio-template", reference="references/<file>")` and read the one that matches `type` before you write the slots and recipe. What each starter's fields need at fill time is in the `studio-asset` skill's references, one file per starter.

- `reverse-demo.md`: show an account what your product or service produces for them (starters `rd-doc`, `rd-ken-native`, `rd-your-product`).
- `audit.md`: review the account's site or setup and show fixes (starter `audit-rewrites`).
- `report.md`: put the account next to its peers from a dataset (starter `benchmark-report`).
- `landing-page.md`: a page built for one account, such as the closest customer story (starter `case-study`).
- `event.md`: a personal invite to a dinner or webinar with an RSVP form (starter `event-invite`).
- `calculator.md`: an interactive calculator prefilled with the account's numbers (no starter for now).
- `recruiting.md`: a page for one candidate about a role, or the open roles that fit them (starters `role-pitch`, `roles-for-you`). Needs the `recruiting` flag.
- `email.md`: the `email` format, for any type: a cold email pinned to a sequence step. No email starter is in the gallery yet, so start blank with `template_format="email"`. Needs the `studio_email` flag.
