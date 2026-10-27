# Lead Variables Reference

Lead variables are filled from contact data when emails are sent. Use them directly in email copy. The full list the copy lint accepts (38 names) is in the lint contract of the `email-copywriting` stage reference; this file says what each one is and which ones are safe to use.

## Variable Syntax

| Type | Syntax | Example | Source |
|------|--------|---------|--------|
| Lead variable | `{variableName}` (single braces, camelCase), optional fallback after a bar (Fallbacks below) | `{firstName}`, `{company}` | Contact data |
| Sender variable | `{sender_snake_case}` (single braces) | `{sender_first_name}` | Sending inbox |
| AI variable | `{{Variable Name}}` (double braces, Title Case, max 30 characters) | `{{First Line}}`, `{{PS Line}}` | AI personalization prompts |
| Tracking link | inserted by the push, never hand-written | - | Tracking links |

## Safe to use in copy

These fill reliably at send time. Stick to them:

| Variable | Syntax | Description |
|----------|--------|-------------|
| firstName | `{firstName}` | Contact's first name - greetings: "Hey {firstName}," |
| lastName | `{lastName}` | Contact's last name |
| company | `{company}` | Contact's company name in the short form a person would write (trademark signs, taglines and tails like "Technologies" removed): "how {company} handles..." |
| companyDomain | `{companyDomain}` | Contact's company domain |
| title | `{title}` | Contact's job title (use sparingly; mirroring a title back reads like a template) |

`{linkedInUrl}`, `{profileUrl}`, `{email}` and `{companyTechnologies}` also fill, but rarely belong in a cold email.

`{localizedGreeting}` is the greeting word in the contact's language (Hola, Hallo, ...; `Hey` when the language is unknown), for lists that span languages: `{localizedGreeting} {firstName},`. The save and the code lint accept it, though the lint contract's 38-name list predates it. Use it only when the user wants greetings in each contact's language.

## Fallbacks

- A safe lead variable may carry a short plain fallback after `|`: `{firstName|there}`, `{company|your team}`. The fallback renders when the contact has no value. Write the exact name with no spaces inside the braces (`{ firstName | there }` renders as literal text), one fallback, never empty, and no `|`, `{` or `}` inside it.
- Sender variables take no fallback: the save rejects `{sender_first_name|...}`.
- A fallback is not spintax. The save reads `{a|b}` as a lead variable `a` with fallback `b`, so any `{option a|option b}` fails.

## Accepted by the lint, but never use

The lint accepts all 38 names, but the platform does not treat them all the same.

**Rejected by the sequence save** ("Unsupported lead variables"): a sequence that uses any of these fails to save.
- `{lastJobTitle}`, `{lastJobDescription}`, `{employmentType}`, `{employmentLocation}`, `{skills}`, `{education}`
- `{companyEmployeeCount}`, `{companySpecialities}`, `{companyCrunchbaseUrl}`
- the legacy aliases `{name}`, `{companyName}`, `{role}`, `{website}`, `{city}`, `{state}`, `{country}`

**Saved, but often empty:** the sequence editor does not offer these. They fill from the contact record at send, and most contacts lack the field, so the merge comes out blank and leaves a broken sentence. The copy lint flags them as rendering blank.
- `{fullName}`, `{location}`, `{headline}`, `{industry}`, `{summary}`
- `{companyLinkedInUrl}`, `{companyLocation}`, `{companyDescription}`, `{companyEmployeeCountRange}`

Put that kind of detail into an AI-variable prompt instead (knowledge-setup's `prompt-writer` playbook), which reads the enriched profile and company data and can skip a lead that lacks it.

| Alias | Use instead |
|-------|-------------|
| `{name}` | `{firstName}` |
| `{companyName}` | `{company}` |
| `{role}` | `{title}` |
| `{website}` | `{companyDomain}` |
| `{linkedinUrl}` | `{linkedInUrl}` (or leave it out) |
| `{city}`, `{state}`, `{country}` | leave out; put location context in an AI-variable prompt |

## Every lead variable

What each name holds, and its status at save and send.

| Variable | Holds | Status |
|----------|-------|--------|
| `{firstName}` | First name | Safe |
| `{lastName}` | Last name | Safe |
| `{fullName}` | Full name | Often empty |
| `{company}` | Company name | Safe |
| `{companyDomain}` | Company domain | Safe |
| `{title}` | Job title | Safe |
| `{location}` | Contact's location | Often empty |
| `{headline}` | LinkedIn headline | Often empty |
| `{industry}` | Company industry | Often empty |
| `{linkedInUrl}` | LinkedIn profile URL | Fills; rarely useful |
| `{profileUrl}` | Profile URL (same as `{linkedInUrl}`) | Fills; rarely useful |
| `{email}` | The contact's verified email address | Fills; rarely useful |
| `{summary}` | Profile summary or bio | Often empty |
| `{lastJobTitle}` | Previous job title | Save rejects |
| `{lastJobDescription}` | Previous job description | Save rejects |
| `{employmentType}` | Employment type | Save rejects |
| `{employmentLocation}` | Employment location | Save rejects |
| `{skills}` | Skills | Save rejects |
| `{education}` | Education | Save rejects |
| `{companyLinkedInUrl}` | Company LinkedIn URL | Often empty |
| `{companyEmployeeCount}` | Company employee count | Save rejects |
| `{companyEmployeeCountRange}` | Company size range | Often empty |
| `{companySpecialities}` | Company specialities | Save rejects |
| `{companyLocation}` | Company headquarters | Often empty |
| `{companyDescription}` | Company description | Often empty |
| `{companyCrunchbaseUrl}` | Company Crunchbase URL | Save rejects |
| `{companyTechnologies}` | Company technologies | Fills; rarely useful |

## Campaign custom variables

Contacts uploaded from a file can carry extra columns as campaign custom variables. `email_sequences(operation="sequence-variables-get", campaign_id=...)` returns what that campaign's save accepts: the editor's lead variables plus the campaign's custom variables; `lists(operation="custom-variables-list", campaign_id=...)` lists the custom ones. The save accepts a registered custom variable by its key, but the copy lint does not know it. Use one only when the user asks for it and the column is filled for every contact, and give it a fallback.

## Sender Variables

Sender variables resolve to the **sending mailbox**, not the contact. Inboxes rotate at send time, so these are filled per sender. Single braces, snake_case. Only `{sender_first_name}` and `{sender_last_name}` are allowed in new campaign copy.

| Variable | Syntax | Description |
|----------|--------|-------------|
| sender_first_name | `{sender_first_name}` | The sending mailbox's first name. Required in the signature block. |
| sender_last_name | `{sender_last_name}` | The sending mailbox's last name. Required in the signature block. |
| sender_signature | `{sender_signature}` | Deprecated. The lint accepts it, but email-review rejects it. Never use it. |

Use the explicit signature formula instead, never a hard-coded sender name:

```markdown
Best,
{sender_first_name} {sender_last_name} - Founder at [Acme](https://acme.com)
```

**Company name link (DEFAULT):** link the client company name to its root domain homepage, or a deep link when it fits the campaign better. The push turns it into a tracking link. It is the email's one link; in an email whose CTA already carries a link, or a step sent as a handwritten letter, write the company name plain.

## Common Mistakes

| Wrong | Correct | Why |
|-------|---------|-----|
| `{first_name}` | `{firstName}` | Lead variables use camelCase, not snake_case |
| `{company_name}` | `{company}` | Not a lead variable; fails the lint and the save |
| `{website_url}` | `{companyDomain}` | Use the actual variable name |
| `{job_title}` | `{title}` | Use the actual variable name |
| `{linkedin_url}` | `{linkedInUrl}` | camelCase |
| `{name}` | `{firstName}` | An alias the save rejects |
| `{industry}` in a sentence | an AI variable, or leave it out | Often empty: "In the  space" reads broken |
| Lead variable in double braces | `{firstName}` | Lead variables use single braces; double braces are only for AI variables |
| `[Company]`, `[First Name]` | `{company}`, `{firstName}` | Square-bracket stand-ins fail the lint as unresolved placeholders |
| Hand-written tracking token | a markdown link on plain words | The push inserts tracking tokens; write the real URL in the link |

## Compatibility Notes

- The platform maps lead variables to its send format at launch. Authors only write the camelCase syntax above.
- Anything in single braces that is neither on the lint list nor a registered custom variable (`{first_name}`, `{company_name}`) fails both the lint and the sequence save.
