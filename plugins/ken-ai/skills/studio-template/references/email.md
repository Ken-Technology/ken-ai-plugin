# Email format

A template with `"format": "email"` is a cold email, not a page. A published version is pinned to a sequence step, and each lead gets the template rendered for them one step ahead of the send. Needs the workspace's `studio` and `studio_email` flags, and `html_steps` to pin. Without `studio_email`, `studio_templates(operation="create", template_format="email")` answers 400 `feature_disabled`. No email starter is in the starter gallery yet (`studio_templates(operation="starters-list")` lists none), so start blank: `studio_templates(operation="create", name="Personal note", template_type="other", template_format="email")`.

## The bundle

Same bundle as a page (`studio.json`, `template.liquid`, optional `fallback.liquid`, `samples/`, `README.md`), with these differences:

- `studio.json` has `"format": "email"` and a `subject`: one line of Liquid over the same variables, such as `"{{ person.first_name | default: 'Hi' }}, a note on {{ account.name }}"`. A blank subject fails `email-subject`.
- No `sections` (`email-sections` warns): an email has no tracked sections.
- `template.liquid` is an email body, not a document: a `<div>` or `<table>` with inline styles. No `<html>`, `<head>`, viewport meta or `</body>` is needed.
- `assets/` files load from the workspace's link host: `{{ asset_url | append: '/logo.png' }}`. An absolute `https` image works too. Never an image on a Kenso host (`email-image-source`).

## Rules (the email validator)

| Rule | Severity | Fix |
|---|---|---|
| `email-subject` | error | Add a non-blank `subject` to `studio.json` |
| `email-unsubscribe` | error | Put `{{unsubscribe_link}}` in `template.liquid` (and in `fallback.liquid` when you ship one) |
| `email-no-active-content` | error | No `script`, `iframe`, `form`, `input`, `object`, `embed`, `on*` attributes or `javascript:` URLs |
| `email-css-inline-only` | error | Inline `style=""` only: no `<link>` stylesheets, no `@import`, no `url(...)` in CSS |
| `email-image-source` | error | `https` images or ones rooted at `asset_url`, never on a Kenso host |
| `email-size` | error | Keep `template.liquid` under 100 KB |
| `email-no-kit-tags` | error | No `{% ken_kit %}` snippets; write the CTA as an inline-styled `<a>` |
| `email-sections` | warning | Remove `sections` |
| `liquid-unsupported-filter` | error | Use only the filters below |
| `liquid-parse` | error | Use only the tags below |

Tags: `if`, `unless`, `elsif`, `else`, `for`, `assign`, `capture`, `case`, `when`, `comment`, `raw` (and their `end` tags).

Filters: `date`, `downcase`, `upcase`, `capitalize`, `strip`, `lstrip`, `rstrip`, `truncate`, `truncatewords`, `replace`, `replace_first`, `append`, `prepend`, `default`, `size`, `join`, `split`, `first`, `last`, `escape`, `url_encode`, `strip_html`, `plus`, `minus`, `times`, `divided_by`, `modulo`, `round`, `abs`.

Kenso renders emails in .NET (Scriban's Liquid mode), not on the edge, and these are the tags and filters both agree on.

## Escaping

Every `{{ }}` output is HTML-escaped, braces included, and an existing entity is kept (an explicit `| escape` never escapes twice). There is no `| raw` in an email: filled data, person and account values always show as text. `sender.signature_html` is the one variable that outputs markup, after the sanitizer.

## Kenso tokens

`{{unsubscribe_link}}`, `{{tracking_link:N}}` (N is the link's id, such as `{{tracking_link:7}}`), `{{asset_link}}` and `{{booking_url}}` pass through the render untouched and are filled at send, like in a hand-written step. Use them as written, not inside Liquid filters. `link.booking_url` is the `{{booking_url}}` token. `link.page_url` is empty in an email: write `{{asset_link}}` for the campaign page.

## Variables

`account`, `person`, `sender`, `brand`, `link`, `data` and `asset_url`, as on a page. `account` is the lead's company (`contacts_company`) and `person` is the lead. `sender.first_name`, `sender.last_name`, `sender.name` and `sender.signature_html` go out as the merge tags `{sender_first_name}`, `{sender_last_name}` and `{sender_signature}`, filled at send from the inbox that sends. Put one through a filter (`upcase`, `truncate`) and the email renders with the campaign's first inbox instead.

## What sends

1. One step ahead, Kenso renders the email for each lead: `template.liquid` with each slot's `fallback` (a Liquid fallback renders with the lead's variables), or `fallback.liquid` when a required slot has no fallback. Recipes do not run for email yet, so write fallbacks that read well with the lead's variables.
2. At send, the lead's render is the body and subject. With no render yet (or a failed one), the step's stored fallback sends: the version rendered once at pin time with no lead (each `default` applies), the workspace brand and the sender as merge tags.

So a pin needs every required slot to have a `fallback`, or a `fallback.liquid`: the pin is refused with `studio_pin_not_allowed` otherwise.

A render also fails past 10,000 loop steps in all, 1,000,000 characters of output or 2 seconds. Keep loops short and over your own data.

## Preview and pin

1. `studio_templates(operation="preview", template_id=41)` renders up to 3 samples (`samples/*.json`, else one fallback render) in Kenso and returns `emailPreviews[]` with `subject`, `html`, `text` and `issues`.
2. Publish as the `studio-template` skill describes (Step 6).
3. Pin it with `email_sequences(operation="replace", ...)`: set `studio_template_version_id` on the step to the published version id. The step becomes `html`, its subject is the template's, and its body is the stored fallback. The sequence read shows `studioPin {versionId, templateId, state}`; `stale` means the version is no longer published or the template was deleted, and the step sends its stored fallback. A later save that leaves `studio_template_version_id` off the step removes the pin, so send it back on every save.

Pinning changes a live campaign's copy. On a client's campaign that is sending, ask first and name the campaign: a sequence change needs that person's yes.
