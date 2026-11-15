# Deliverability rules

These six rules and amendment A1 are the one source for what you say about open tracking, click tracking, email format, SMTP inboxes and mailbox types. Every skill points here. Quote a rule as written and never change a number in it. Where A1 differs from a rule, A1 wins.

1. **No open pixel.** Campaign emails never carry an open-tracking pixel. Opens are not tracked and are never reported.
2. **One click-tracking host per sending domain.** Every sending domain has its own click-tracking host, `link.<sending domain>`, set up automatically. Links in an email are minted on the sending domain's own host, never on another domain's.
3. **Format follows the recipient's mail provider.** Inside one campaign, leads split into provider tracks: Google, Microsoft, Everyone else. A recipient on Google (Google Workspace or gmail.com) gets plain text: no HTML in the first email, and plain-text follow-ups until the HTML follow-up test reads. A recipient on Microsoft (Microsoft 365 or outlook.com) gets the email as written, HTML included.
4. **Writing the first email for Google recipients.** The link is a visible URL on its own line. One link only, short, on the sender's own domain. Put the proof in the text, not only behind the link. No bold, HTML signature, logo, image, video, handwritten letter or Studio email in step 1: each forces the step back to HTML.
5. **SMTP inboxes.** $50 per domain per month, up to 20 inboxes per domain (10 recommended), each sending 5 to 10 emails a day. A new inbox starts at 5 a day.
6. **Mailbox types a client can buy:** Google, Outlook and SMTP. The setup planner's default mix is 50% Google, 25% Outlook, 25% SMTP.

## Amendment A1 (14 Nov 2026)

A1. **A plain text email never carries a click-tracking link.** (Amends rules 2, 3 and 4.)
   - An email that goes out as plain text shows each link as its real address, without `https://`, starting at the host as written: `www.linkedin.com/in/cristian-frunze/`.
   - A linked word alone on its line becomes the address. A linked word inside a sentence keeps the words and adds the address in brackets: `apply here (www.example.com/apply)`.
   - An email sent as plain text counts no clicks. An email that keeps its HTML still counts clicks on its sending domain's own click host (rule 2).
   - The unsubscribe link is unchanged.
   - When you write a sequence for a campaign that sends as plain text, type the address as text in that form. Rule 4 still holds (a visible address on its own line, one link only, short), but the address is the real destination, not a click host.

## What the product does today

Some of these rules are built but not switched on yet. Describe only what is on, and follow each rule with what exists:

- Rule 1: open tracking is locked off. Nothing tracks opens, and a request to turn it on (`track_opens=True`) is refused with 400 `validation_failed`, detail code `open_tracking_unavailable`.
- Rule 2: minting each link on its own sending domain's `link.` host is built but not switched on yet. Until it is, an HTML email's links go out on a click-tracking host the workspace already has, which can be another of its sending domains' hosts.
- A1: live since 15 Nov 2026. An email that goes out as plain text alone carries no click-tracking link and counts no clicks: each link shows its real address without `https://`. That covers a campaign with Send as plain text on, and its test send, placement test and segment preview. An HTML email, the plain-text half of an HTML email and the unsubscribe line are unchanged. With Send as plain text on, a step that keeps its HTML (a drawn handwritten letter, a video, a Studio email, any image, or a sender signature with a logo) still carries click links and counts clicks.
- Rule 3: provider tracks are built but switched off until they are turned on for the workspace. Until then a campaign has one format for all its leads, and its Send as plain text switch sets it. When provider tracks is on for the workspace, the Google track goes out as plain text.
  The `create-campaign` skill's `campaign-configuration` reference says how to follow rule 3 with that switch.
- Rules 5 and 6: SMTP inboxes a client can buy are built but not switched on yet. Order Google and Outlook inboxes, and hold any SMTP inbox the workspace already has to rule 5's daily numbers.

## A request that breaks a rule

- Asked to turn on open tracking: decline, and give rule 1 as written.
- Asked to put a click-tracking link in a plain text email, or to count its clicks: decline, and give A1's first line as written: "A plain text email never carries a click-tracking link."
- Asked which company sends the mail behind an inbox: say the product names mailbox types, not the companies behind them, and give rule 6 as written. An inbox on a sending-provider account the workspace connected itself is the exception: it keeps the name the workspace gave it.

Staff only: the internal sending rules are in the `deliverability-internal` skill, which does not load for a workspace.
