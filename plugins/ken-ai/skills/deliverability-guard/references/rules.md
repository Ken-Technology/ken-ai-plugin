# Deliverability rules

These six rules are the one source for what you say about open tracking, click tracking, email format, SMTP inboxes and mailbox types. Every skill points here. Quote a rule as written and never change a number in it.

1. **No open pixel.** Campaign emails never carry an open-tracking pixel. Opens are not tracked and are never reported.
2. **One click-tracking host per sending domain.** Every sending domain has its own click-tracking host, `link.<sending domain>`, set up automatically. Links in an email are minted on the sending domain's own host, never on another domain's.
3. **Format follows the recipient's mail provider.** Inside one campaign, leads split into provider tracks: Google, Microsoft, Everyone else. A recipient on Google (Google Workspace or gmail.com) gets plain text: no HTML in the first email, and plain-text follow-ups until the HTML follow-up test reads. A recipient on Microsoft (Microsoft 365 or outlook.com) gets the email as written, HTML included.
4. **Writing the first email for Google recipients.** The link is a visible URL on its own line. One link only, short, on the sender's own domain. Put the proof in the text, not only behind the link. No bold, HTML signature, logo, image, video, handwritten letter or Studio email in step 1: each forces the step back to HTML.
5. **SMTP inboxes.** $50 per domain per month, up to 20 inboxes per domain (10 recommended), each sending 5 to 10 emails a day. A new inbox starts at 5 a day.
6. **Mailbox types a client can buy:** Google, Outlook and SMTP. The setup planner's default mix is 50% Google, 25% Outlook, 25% SMTP.

## What the product does today

Some of these rules are still being built into the product. Until a skill says a part is live, follow the rule with what exists:

- Rule 1: campaign emails send no open pixel when the campaign's `trackOpens` is off, which is the default. Never turn it on.
- Rule 2: a sending domain whose nameservers the platform runs gets its `link.` host on its own; for any other domain the support team sets it up. Until a domain has its own host, its links go out on another host of the workspace.
- Rule 3: provider tracks are not in the product yet. A campaign has one format for all its leads, and its Send as plain text switch sets it.
  The `create-campaign` skill's `campaign-configuration` reference says how to follow rule 3 with that switch.
- Rules 5 and 6: SMTP inboxes cannot be ordered yet. Order Google and Outlook inboxes, and hold any SMTP inbox the workspace already has to rule 5's daily numbers.

## A request that breaks a rule

- Asked to turn on open tracking: decline, and give rule 1 as written.
- Asked which company sends the mail behind an inbox: say the product names mailbox types, not the companies behind them, and give rule 6 as written. An inbox on a sending-provider account the workspace connected itself is the exception: it keeps the name the workspace gave it.
