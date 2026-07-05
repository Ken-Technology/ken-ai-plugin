# HTML Serializer Reference

Loaded when the skill serializes email bodies to HTML (campaign-configuration Step 6) or needs the retrofitting recipe. The skill does this conversion itself - these rules are REQUIRED reading before pushing any email sequence.

> The "Retrofitting tracking links to an existing sequence" section at the bottom of this file is a specialized recipe for pushing tracking links into an already-deployed plain-text sequence. For general email sequence updates (changed content, added/removed steps), see `references/update-recipes.md` section 5 instead.

### Variable Contract: Authoring vs Ken AI Storage

Two stages transform variables from human-friendly authoring to Ken AI format. Authors write local syntax only.

| Stage | Lead Variables | AI Variables | Links |
|-------|---------------|--------------|-------|
| **Local copy** (emails_v2.md) | `{camelCase}` single braces | `[Title Case]` square brackets | Raw URLs or markdown links |
| **Ken AI stored** (sequence push) | `{firstName}`, `{company}` unchanged | `{{First Line}}`, `{{PS Line}}` double braces | `{{tracking_link:ID}}` standalone token |

**Key rules:**
- Convert `[Variable Name]` -> `{{Variable Name}}` when pushing to Ken AI.
- Lead variables stay in single braces, camelCase, unchanged.
- Tracking links are **standalone tokens** - not wrapped in `<a href>` tags. The redirect link's `text_value` stores the display text; backend constructs the anchor at render time.
- Authors must never write `{{tracking_link:ID}}` in local copy.

### HTML Conversion Rules (matches ken-frontend serializer)

The frontend serializes editor content via `serializeSequenceBodyToHtml` in `ken-frontend/src/features/campaigns/utils/sequence-body-html.ts`. The skill must produce output that matches what that serializer would emit for the same markdown input.

| Authoring markdown | HTML output |
|--------------------|-------------|
| Paragraph | `<p>text</p>` |
| Blank line between paragraphs | `<p><br /></p>` between blocks, producing `<p>A</p><p><br /></p><p>B</p>`. Every blank line in emails_v2.md is intentional and must survive in this canonical EmailBison-safe form. Back-to-back `<p>A</p><p>B</p>` (no separator) renders as a wall of text, and bare `<p></p>` gaps are not reliable once the sequence is pushed through EmailBison. |
| Single newline in paragraph | `<br />` |
| `**bold**` or `__bold__` | `<strong>bold</strong>` |
| `*italic*` or `_italic_` | `<em>italic</em>` |
| `***both***` | `<em><strong>both</strong></em>` (CommonMark ordering: em outer, strong inner) |
| Underline | `<u>text</u>` (frontend-only - see "Intentional gaps" below) |
| `~~strike~~` | `<del>text</del>` |
| Numbered list | `<ol><li>item</li></ol>` (NO inner `<p>`) |
| Bullet list (`- item`) | `<p>- item one<br />- item two</p>` - lists get rewritten to dash paragraphs for email-client compatibility |
| `[text](url)` tracked | `{{tracking_link:ID}}` standalone (display text captured in redirect link `text_value`) |
| `[text](url)` untracked | `<a href="url">text</a>` |
| `[text](url "title")` untracked | `<a href="url" title="title">text</a>` (rehype-sanitize's defaultSchema allow-lists `title` globally, so TipTap round-trips preserve it) |
| `[text](url "title")` tracked | `{{tracking_link:ID}}` standalone (the whole anchor, including title, is replaced by the placeholder) |
| Raw URL tracked | `{{tracking_link:ID}}` standalone |
| Raw URL untracked | `<a href="https://foo.com/path">https://foo.com/path</a>` - display text is the **full URL**, matching ken-frontend's remark-gfm autolink-literal output |

**Preserve verbatim**: `{{variable}}`, `{variable}`, `{{tracking_link:ID}}`. Single underscores inside bare identifiers (`snake_case_var` in prose) are also left alone - the emphasis regex guards against word-boundary underscores.

**Allowed href protocols**: `http`, `https`, `mailto`, `tel`.

**Allowed inline tags**: `strong`, `em`, `u`, `del`, `a` (with restricted href).

### Intentional gaps vs ken-frontend

These are cases where the frontend's unified/remark/rehype pipeline produces output the Python serializer does not match, and we have deliberately not closed the gap. Pin-tests in `test_html_serialize.py` document the current backend behavior so a future refactor won't silently shift it.

- **`<u>underline</u>`**: the frontend's sanitize schema allow-lists `<u>`, but markdown has no underline syntax. Any literal `<u>` in `emails_v2.md` is HTML-escaped by the backend. Authors cannot reach underline from the authoring format; use bold or italic instead.
- **Blank-line separator divergence**: remark-parse emits `<p>A</p><p>B</p>` (no separator) for `A\n\nB`. The backend instead emits `<p>A</p><p><br /></p><p>B</p>` so an author's blank line in emails_v2.md survives in the same canonical form EmailBison expects after a manual editor save. Without the separator, prospects see a wall of text. Bare `<p></p>` gaps are not used because they can collapse after API-based sequence syncs.
- **Bare `www.` autolinks**: frontend (remark-gfm) turns `www.foo.com` into `<a href="http://www.foo.com">www.foo.com</a>`. The backend leaves it as plain text. Copywriters are expected to write full `https://` URLs.
- **Inline code** `` `code` ``: frontend emits `<code>`. The backend passes backticks through literally. Cold-email bodies don't use inline code.
- **GFM tables and task lists**: not supported by the backend. Not authored in cold-email bodies.

**Tracking link replacement (CRITICAL):**

When converting email body content to HTML, replace every raw URL or markdown link that has a corresponding redirect link ID (from the URL-to-ID mapping built in Step 12a) with a **standalone tracking link token**. Do NOT wrap the token in an `<a href>` tag - the backend constructs the full anchor from the redirect link metadata.

For each URL found in the email body:
1. Look up the URL in the mapping using key `"{email_number}:{variant}:{url}"`
2. If found: replace the entire URL (or markdown link) with standalone `{{tracking_link:{ID}}}`
3. If not found (should not happen if Step 12a ran correctly): use raw URL as fallback `<a href="{url}">{cleaned-url}</a>`

**Context-aware replacement examples:**

URL at end of sentence:
```
Input:  Here's the framework: https://amspredict.com
Output: <p>Here's the framework: {{tracking_link:116}}</p>
```

URL on its own line:
```
Input:  https://amspredict.com
Output: <p>{{tracking_link:116}}</p>
```

Markdown link:
```
Input:  Check out [our report](https://amspredict.com/report)
Output: <p>Check out {{tracking_link:117}}</p>
```
(The link text "our report" is captured in the redirect link's `text_value` field during Step 12a.)

**Full transformation example:**

Input (from emails_v2.md Email 1, no variants):
```
Hi {firstName},

{{First Line}}

30+ employers use our platform. Here's how it works: https://amspredict.com

Best,
Ronnie
```

With redirect link mapping `"1:null:https://amspredict.com" -> 116`, output bodyContent:
```
<p>Hi {firstName},</p><p><br /></p><p>{{First Line}}</p><p><br /></p><p>30+ employers use our platform. Here's how it works: {{tracking_link:116}}</p><p><br /></p><p>Best,<br />Ronnie</p>
```

Note: `Best,` and `Ronnie` are on consecutive lines in the source (single `\n`, not `\n\n`), so they stay in one paragraph joined by `<br />`. Only blank lines between blocks get the `<p><br /></p>` separator.

**Retrofitting tracking links to an existing sequence:**

If an email sequence was already pushed with plain text URLs (not wrapped in `<a>` tags), follow this process to add tracking links:

1. Get the existing sequence:
```python
existing = api_email_sequence_manage(operation="get", campaign_id={campaign_id}, campaign_segment_id={segment_id})
sequence_id = existing["data"]["id"]
steps = existing["data"]["steps"]
```

2. Parse raw URLs from each step's `bodyContent`. Plain text URLs appear inside `<p>` tags as literal text (e.g., `<p>Check it out: https://example.com</p>`), NOT as `<a href>` tags. Extract with regex `https?://[^\s<)"']+` applied to each step's bodyContent.

3. Create redirect links for each unique URL per step+variant PER SEGMENT (same as Step 12a). Each segment must have its own redirect link IDs - never share redirect links across segments.

4. Replace plain text URLs in `bodyContent` with standalone tracking link tokens:
```
{{tracking_link:ID}}
```

Example before:
```
<p>Here's how it works: https://amspredict.com</p>
```
Example after:
```
<p>Here's how it works: {{tracking_link:116}}</p>
```

5. Update the sequence with modified steps (include `id` and `sequenceId` for existing steps):
```python
api_email_sequence_manage(
    operation="update",
    campaign_id={campaign_id},
    campaign_segment_id={segment_id},
    sequence_id=sequence_id,
    steps=[
        {
            "id": step["id"],
            "sequenceId": sequence_id,
            "stepOrder": step["stepOrder"],
            "versionType": step["versionType"],
            "name": step["name"],
            "subjectLine": step["subjectLine"],
            "bodyContent": modified_body,  # with {{tracking_link:ID}} placeholders
            "bodyFormat": step["bodyFormat"],
            "waitDays": step["waitDays"]
        }
        # ... for each step
    ]
)
```

**Lead variables** (resolved from contact data, single braces, camelCase): `{firstName}`, `{lastName}`, `{fullName}`, `{company}`, `{companyDomain}`, `{title}`, `{location}`, `{headline}`, `{industry}`, `{linkedInUrl}`, `{email}`, `{summary}`, `{profileUrl}`, `{skills}`, `{education}`, `{companyEmployeeCount}`, `{companyLocation}`, `{companyDescription}`, `{companyTechnologies}`. See email-copywriting skill's `references/lead-variables.md` for the complete list.

**AI variables** (resolved by AI personalization): `{{Subject Line}}`, `{{First Line}}`, `{{PS Line}}`, etc. - these MUST each have a matching prompt in the segment's prompts.md. Campaign-level prompts do not apply to segments that have their own prompts (see Step 12c warning).
