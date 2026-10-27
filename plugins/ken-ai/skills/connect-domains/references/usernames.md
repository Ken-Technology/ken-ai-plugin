# Mailbox usernames

Local-part only. Lowercase. Unique per domain. All mailboxes on one domain share one platform.

## Charset

`^[a-z0-9]+([._-][a-z0-9]+)*$`, 1-64 chars. No leading, trailing, or repeated separators. No `@` or spaces. Import local-parts may include `+`.

Sanitize: trim, lowercase, strip anything outside `[a-z0-9]` from each name part, then join.

## Order

Build from the sender's real first and last name, plus a nickname only if they actually use it:

1. `first.last`
2. `nickname.last`
3. `first` or `nickname`
4. `firstlast`
5. `f.last`
6. `first.l`
7. `first.last2` on collision
8. Another real person (cofounder, AE) before recycling the same founder again

No invented typos (`jhon`, `jonh`, dropped letters). No role names (`info`, `sales`, `support`, `hello`).

## Profile photos

Optional `profile_picture_url` for Google and Outlook mailboxes: a public HTTPS PNG, JPEG, or WebP. Worth setting when one person has several usernames on a domain. Omit it for Azure.
