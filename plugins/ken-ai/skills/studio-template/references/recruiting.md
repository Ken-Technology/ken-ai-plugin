# Recruiting page playbook

A recruiting page talks to one candidate about a role, or about the open roles that fit them. `studio-template-builder.md` (in this folder) holds the bundle format, the kit and every validation rule; this file covers what to build.

## What it is for

The moment: a recruiter has a role and a short list of people whose work fits it, and wants each of them to see, on one page, why they were picked, what the job is, what it pays and how to talk about it. A personal page beats a job ad: it names the fit, shows the pay range up front and asks for one small step, a 15-minute call.

Pick it when the workspace has the `recruiting` flag and the page goes to leads of a recruiting campaign. Without the flag, `template_type="recruiting"` is refused with `feature_disabled` and the recruiting starters are hidden.

## Who it belongs to

One page per candidate (a lead of the recruiting campaign), not per account. There is no company: `account` is empty on the page and during the fill, so never read `account.*` in the template, the recipe or a slot fallback. Read these instead:

| Variable | Fields | When |
|---|---|---|
| `person` | `first_name`, `last_name`, `title`, `current_title`, `current_company`, `location`, `skills` (a list), `experience_summary`, `linkedin_url` | During the fill and on the page. Null on the shared link |
| `role` | `title`, `company`, `location`, `remote_policy` (`onsite`, `hybrid`, `remote` or null), `pay_range` (text like "$150k-$180k a year", empty when the role has no pay), `description` (at most 4000 characters), `highlights` (the must-haves, at most 10), `job_url`, `booking_url` | During the fill and on the page. `booking_url` is null during the fill and the candidate's booking link on the page |
| `roles` | A list shaped like `role`: the campaign's primary role first, then its open extra roles, at most 4 | During the fill and on the page |

Guard every field: `role` is absent when the campaign has no role, and any field can be null. `pay_range` is empty text, not null, when there is no pay, and empty text is true in Liquid, so test it with `{% if role.pay_range and role.pay_range != '' %}`.

## Two starters

### `role-pitch`: one role

| `data-section` | What it holds | Reads |
|---|---|---|
| `intro` | Logo, "For {first} {last}", the headline, chips for company, location, remote policy and pay, a booking button | `data.headline`, `role.*`, `person.first_name` |
| `why` | "Hi {first}", the why-you note, the sender's name | `data.why_you` |
| `role` | The team and the work, the must-haves, the pay, an optional hiring-manager video, a link to the full job description | `data.team`, `role.description`, `role.highlights`, `role.pay_range`, `data.video`, `role.job_url` |
| `process` | The hiring steps | `data.process` |
| `book` | A booking button, or "reply with a few times" when there is no booking link | `link.booking_url` |

Recipe: a `bind` from `role.title` to `data.headline`, then one cheap `prompt` that writes `why_you` and `team`. `process` is the same for every candidate: edit its static fallback once.

### `roles-for-you`: several roles

| `data-section` | What it holds | Reads |
|---|---|---|
| `intro` | A greeting, the intro note, the sender | `data.intro` |
| `roles` | One card per role: title, company, location, remote policy, pay, "Why you", three must-haves, a booking button and a "Read the job" link | `roles`, `data.fits` |
| `book` | One call for all of them | `link.booking_url` |

Recipe: one cheap `prompt` that reads `roles` and the candidate and writes `intro` and `fits`, a list of `{title, why}` for the roles that fit, best first. The template matches each role to its fit by title, lowercased. When the fill found fits, only those roles show; when it found none, or has not run, every role shows without a why line.

## Writing the prompt

- Inputs are the work only: `person.current_title`, `person.current_company`, `person.skills`, `person.experience_summary`, and the `role` fields (or `roles`). Never pass `person.first_name`, `person.last_name` or `person.linkedin_url`: the page adds the greeting, and a model that sees a name can guess things that must never count.
- Say in the prompt: use facts from the inputs only, never invent employers, projects or numbers, and say nothing about age, gender, looks, family, health, nationality, religion or school dates.
- No pay figures in the copy: the page prints `role.pay_range` itself.
- No recruiting cliches ("exciting opportunity", "fast-paced", "rockstar", "dream job"), no flattery, no question.

## The CTA

```liquid
{% render 'ken/cta', label: 'Book a 15-minute intro', kind: 'booking', id: 'book-intro' %}
{% render 'ken/cta', label: 'Read the job', href: r.job_url, variant: 'link', id: job_id %}
```

The booking button goes to the candidate's own booking link (`link.booking_url`, the same value as `role.booking_url`). It renders nothing when there is no booking link, so the starters guard the last section with `{% if link.booking_url %}` and ask for a reply otherwise. A booking made from the page counts as a meeting with rule `page_booking` in `studio_pages(operation="engagement", asset_id=901)` and shows on the candidate's card in the role's pipeline. Give each button its own `id`, so clicks count per button.

## Video

`role-pitch` embeds one hiring-manager video from a fixed host, with the id escaped:

```liquid
<iframe src="https://www.loom.com/embed/{{ data.video.id | url_encode }}" title="A note from the hiring manager" loading="lazy" allowfullscreen></iframe>
```

YouTube uses `https://www.youtube-nocookie.com/embed/` and Vimeo `https://player.vimeo.com/video/`. A host off the frame allow-list fails `csp-iframe-src`. Set one video for every page as a static fallback of the `video` slot.

## Samples

A recruiting sample is `{account: null, person, role, roles, sender, brand, data}`. Ship a full sample, a partial one (the headline from `role.title`, the rest from fallbacks) and a shared one (`"person": null`). `studio_templates(operation="preview", template_id=41, sample="samples/maya-backend.json")` renders a sample's `data` with its `role` and `roles`.

## Common failure modes

- **Reading `account.*`.** It is empty here, so the page prints nothing where the company should be and the prompt writes about no one. Use `person.current_company` and `role.company`.
- **"Hi null".** `person` is null on the shared link: `{{ person.first_name | default: 'there' }}`.
- **An empty pay chip.** `{% if role.pay_range %}` alone is true for empty text.
- **A why line that names a protected trait or invents a project.** Keep the inputs to the work and put the rule in the prompt.
- **A fit that never shows.** The template matches `fits[].title` to the role's title, so the prompt has to copy titles exactly.
- **Every page stuck at partial.** A required slot no step fills always falls back. Fill it with a `bind` (the starter binds `role.title` to `headline`) or make it optional with a static fallback.

## Starters

`studio_templates(operation="create", starter_slug="role-pitch")` or `studio_templates(operation="create", starter_slug="roles-for-you")`, then pin it on the recruiting campaign: `studio_pages(operation="asset-template-put", campaign_id=55, template_id=41)`.
