# HTML Serializer Reference

Read this before pushing any email sequence, and when reading a live one back. Copy you author is a `plain` step (`body_format` `plain`), but its body is stored as simple HTML: `<p>` paragraphs and `<a href="{{tracking_link:ID}}">` links. The skill converts the approved plain-text copy itself; no tool does it for you. `body_format` `html` is for full HTML emails, needs the workspace's `html_steps` feature, and is never used for copy written here.

## Authoring vs stored form

| Stage | Lead variables | AI variables | Links |
|-------|---------------|--------------|-------|
| **Authoring** (the copy you draft and show) | `{firstName}`, `{company}` single braces | `{{First Line}}`, `{{PS Line}}` double braces, Title Case | Markdown links on plain words, `https` |
| **Stored** (sequence push) | unchanged | unchanged | `<a href="{{tracking_link:ID}}">link text</a>` |

Rules:
- Write AI variables in their final double-brace form while drafting. Never use square brackets; the lint rejects `[First Line]` as an unresolved placeholder.
- Lead variables stay single-brace camelCase, unchanged.
- A tracked link lives in the href: `<a href="{{tracking_link:ID}}">link text</a>`, where ID is the tracking link's numeric id. The wrapper is the contract: never write a bare token or any other token spelling.
- Never hand-write a tracking token in draft copy. The push inserts it.

## Conversion rules

| Authoring text | Stored HTML |
|----------------|-------------|
| Paragraph | `<p>text</p>` |
| Blank line between paragraphs | `<p><br /></p>` between blocks: `<p>A</p><p><br /></p><p>B</p>`. Every blank line is intentional and must survive in this form. `<p>A</p><p>B</p>` with no separator renders as a wall of text, and bare `<p></p>` gaps can collapse after a sync. |
| Single newline inside a paragraph | `<br />` |
| `**bold**` | `<strong>bold</strong>` (cold email should not need it) |
| `*italic*` | `<em>italic</em>` (same) |
| Numbered list | `<ol><li>item</li></ol>` (no inner `<p>`) |
| Dash list (`- item`) | `<p>- item one<br />- item two</p>` - dash paragraphs, not `<ul>`, for email-client compatibility |
| `[text](url)`, tracked | `<a href="{{tracking_link:ID}}">text</a>` |
| Raw URL (should not be in approved copy) | Turn it into a link on a short phrase first (`[see the setup](https://acme.com/setup)`), then serialize as above |
| Untracked link (fallback only) | `<a href="url">text</a>` on the same plain-word text |

- Keep `{...}`, `{{...}}` and `{{tracking_link:ID}}` tokens verbatim, and leave underscores inside identifiers alone.
- Links are `https` only (an `http` link is blocked on cold outreach); `mailto` and `tel` are allowed but rarely belong in cold email. Allowed inline tags: `strong`, `em`, `del`, `a`.
- Write full `https://` URLs; a bare `www.` address stays plain text. No underline, inline code, tables or task lists.

## Tracking links

Every URL in the approved copy (the signature company link included) gets a tracking link, scoped to one segment:

1. `tracking_links(operation="tracking-links-list", campaign_id=...)` lists existing links. Reuse one whose name starts with `{segment-slug} url_` and points to the same destination.
2. Otherwise create one: `tracking_links(operation="tracking-links-create", campaign_id=..., name="{segment-slug} url_{n}", domain_name="<full destination URL>", text_value="<link text>")`. `domain_name` takes the full URL, path included. `text_value` is the markdown link text: a few plain words, never a host or URL.
3. Record the mapping `url -> id` for the segment, then replace every link to that URL, in every email and variant, with the wrapped token.

Never share a tracking link across segments. Link text must be plain words (the company name, "the 2-minute demo"), never a bare URL and never text that reads like a web address (`acme.com`): click tracking sends every link through a tracking domain, so the visible host would not match, and the save raises a `link_host_mismatch` finding.

Examples (tracking link id 116 for `https://acme.com`, 117 for `https://acme.com/report`):

```
Input:  Here's [the framework](https://acme.com)
Output: <p>Here's <a href="{{tracking_link:116}}">the framework</a></p>

Input:  Check out [our report](https://acme.com/report)
Output: <p>Check out <a href="{{tracking_link:117}}">our report</a></p>
```

Full example (Email 1, signature link 116):

```
Hey {firstName},

{{First Line}}

30+ clinics use this to cut no-shows in half. Most saw it inside the first month, without changing their booking system.

Want me to send the setup for {company}?

Best,
{sender_first_name} {sender_last_name} - Founder at [Acme](https://acme.com)

{{PS Line}}
```

```
<p>Hey {firstName},</p><p><br /></p><p>{{First Line}}</p><p><br /></p><p>30+ clinics use this to cut no-shows in half. Most saw it inside the first month, without changing their booking system.</p><p><br /></p><p>Want me to send the setup for {company}?</p><p><br /></p><p>Best,<br />{sender_first_name} {sender_last_name} - Founder at <a href="{{tracking_link:116}}">Acme</a></p><p><br /></p><p>{{PS Line}}</p>
```

`Best,` and the name line are consecutive lines (one newline), so they share a paragraph joined by `<br />`. Only blank lines get the `<p><br /></p>` separator.

## Reading stored HTML back (review and edit)

- `<p>` blocks are paragraphs, `<p><br /></p>` is a blank line, `<br />` a line break.
- Drop formatting tags; turn `<a href="{{tracking_link:ID}}">text</a>` into `text` plus a note of the token, so you can restore it unchanged.
- Each `<a>` is one link for the lint's link count.
- Count words and check the lint on the plain text; keep the original HTML for the replace so untouched tokens survive.

## Step shape

`email_sequences(operation="segment-email-sequences-get", segment_id=...)` returns each step in the same shape `email_sequences(operation="segment-email-sequences-replace", ...)` takes, so a step goes back as it was read. The write accepts snake_case or the camelCase the read returns.

| Field | Notes |
|-------|-------|
| `id` | Keep on every existing step. A step without `id` is created; a step you leave out of the list is deleted |
| `stepOrder` / `step_order` | 1, 2, 3...; variants of one email share it |
| `variant` | `a`-`d`, prospect-facing A/B arms that all send. Omitted is `a` |
| `name` | 25 characters max (`Offer`, `Offer - With PS`) |
| `subject` | 1-60 characters; `{{Subject Line}}` on every step |
| `body` | The serialized HTML above |
| `bodyFormat` / `body_format` | `plain` for copy written here; `markdown`; `html` only for full HTML emails with the `html_steps` feature |
| `waitDays` / `wait_days` | Days before this step sends; Email 1 is 0 |
| `isActive` | Carry over, so a paused variant stays paused. New steps send `true` |
| `openTrackingEnabled` | Carry over; omitting it turns open tracking off |
| `handwrittenEnabled`, `handwrittenBackground`, `handwrittenIntro` | Carry all three over; omitting them turns the handwritten letter off |
| `studioTemplateVersionId` | Carry over when set; omitting it unpins the Studio template and the step sends its stored body |

The replace is a full replace, so send every step, changed or not.

A handwritten step sends everything above a `{sender_signature}` line or the unsubscribe link as an image of a letter, and a typed sign-off is part of that letter. The letter takes no links, URLs or link tokens: in copy with the typed two-line signature, a handwritten step carries no link at all, so write the company name plain. A link there fails the save with a 400 naming the step and variant.

## Retrofitting tracking links to a live sequence

When a sequence was pushed with plain-text URLs (no `<a>` wrapper):

1. Read it: `email_sequences(operation="segment-email-sequences-get", segment_id=...)`.
2. Find raw URLs in each body (regex `https?://[^\s<)"']+` on the text inside `<p>` tags).
3. Create or reuse a tracking link per unique URL for this segment, as above, with a plain-word `text_value`.
4. Replace each raw URL with `<a href="{{tracking_link:ID}}">a few plain words</a>`, rewording the sentence if needed so the link sits on a phrase; never use the URL or host as the link text.
5. Write every step back with `email_sequences(operation="segment-email-sequences-replace", segment_id=..., steps=[...])`, each step carried over per the table above.
6. Save the checkpoint: `email_sequences(operation="save-version", segment_id=..., name="Tracking links")`.

On a client's campaign that is already sending, this is a sequence change: it needs a yes that names that client, with its source.

## Variables recap

Lead variables: the 38 names in the lint contract of the `email-copywriting` stage reference; which ones the save rejects, and which are often empty, is in `references/lead-variables.md`. AI variables (`{{Subject Line}}`, `{{First Line}}`, `{{PS Line}}`, ...) each need a matching personalization prompt for the segment (knowledge-setup's `prompt-writer` playbook writes them; `prompts(operation="list", campaign_id=..., segment_id=..., flow="personalization")` lists them). Campaign-level prompts do not apply to a segment that has its own prompts.
