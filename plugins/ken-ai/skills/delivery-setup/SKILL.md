---
name: delivery-setup
description: Set up a workspace's sending - read its inboxes, domains and capacity, pick a path (claim warmed inboxes, order or connect domains, connect Google or Microsoft mailboxes, import SMTP inboxes, or a sending provider), set the link host and connect LinkedIn accounts, routing each step to the infra skills.
---

# Delivery setup

This is the front door for sending setup: "set up my sending", "I need inboxes", "connect my Google mailboxes", "add my LinkedIn". You read what the workspace has, pick a path with the user, and run each step here or in the skill that owns it. Four skills hold the deep steps; load the one a step names:

| Step | Skill |
|---|---|
| How many domains and inboxes for a daily volume | `infra-planning` |
| Search and buy new domains | `domain-selection` |
| Bring domains the user already owns | `connect-domains` |
| Daily limits, display names, signatures, forwarding, warmup on existing inboxes | `inbox-configuration` |

Every call takes `client_id`, the workspace id. Send it when the user can see more than one workspace.

## The rules

- **Paid steps need a yes with the price the tool gives.** New domains, warmed inboxes and Kenso mailboxes cost credits (or a Stripe checkout on some workspaces). Quote the price from the tool: the domain search result, the credit estimate or the claim's own description. Never quote a price from memory, and never call a paid step free.
- **A connect link is for the owner to open.** A mailbox or LinkedIn connect link goes to the person who owns that mailbox or account, and the connect finishes in Kenso under the member who started it. Never open it for them or pass it to someone else.
- **Secrets pass through once.** Take a mailbox password or a provider key only to make the call that needs it. Never repeat it, store it in a note or put it in a summary.
- **Setup is not sending.** Nothing here launches a campaign. Launches, and limit or pause changes on a client's campaign or inboxes, need a person's yes, and on a client's workspace that yes names the client.

## Step 0 - Read what the workspace has

1. `inboxes(operation="list")` - each inbox's email, status, daily limit and warmup state.
2. `domains(operation="list")` - the sending domains and their status.
3. `linkedin(operation="list")` - the LinkedIn accounts.
4. `billing(operation="credits-get")` - credits, for the paid paths.

New domains and warmed inboxes need a paid plan. On a Free workspace, say so and point to https://app.ken.so/settings/billing.

If an operation this skill names is not listed for you, or answers 404, that part is not on for this workspace or this caller. Say which part in one sentence, point to https://app.ken.so/delivery?tab=inboxes, and carry on with the rest. Do not retry it.

Tell the user what they have in one short block: active inboxes and domains, inboxes still warming, the daily capacity (the daily limits of active inboxes added up), LinkedIn accounts, and credits.

## Step 1 - Pick the path

Ask what they have and what they want, then pick:

| The user has or wants | Path |
|---|---|
| Nothing yet, and wants inboxes that are ready soon | Claim warmed inboxes (Step 2) |
| New domains of their own | `infra-planning` to size it, then `domain-selection` to buy |
| Domains they already own | `connect-domains` |
| Google Workspace or Microsoft 365 mailboxes | Connect by sign-in (Step 3) |
| Mailboxes at another host, with SMTP and IMAP details | Import them (Step 4) |
| An account with a sending provider | Connect the provider (Step 5) |

When they name a daily volume ("2,000 a day"), load `infra-planning` first to size it.

## Step 2 - Claim warmed inboxes

Kenso keeps pre-warmed domains ready to claim. These operations are for workspace members, and need the workspace's `agent_send` flag (404 while it is off).

1. `domain_setup(operation="inbox-stock-get")` returns `claimableDomains` and a count per mailbox type (`gmail`, `outlook`).
2. Propose one claim per domain: the mailbox type and 1 to 5 mailboxes, each with a username, first name and last name. Give the price stated in the claim operation's own description (its full docs in `describe_tools`) and the total for the mailboxes, and wait for the yes.
3. `domain_setup(operation="inbox-stock-create-claim", mailbox_type="gmail", mailboxes=[{"username": "maya", "first_name": "Maya", "last_name": "Chen"}], idempotency_key="acme-claim-2026-10-27-1")`. Reuse the same `idempotency_key` to retry the same claim; a new key is a new claim. A claim takes up to a few minutes, and its mailboxes read `warmup` until Kenso activates them.
4. Refusals: 402 with `UPGRADE_REQUIRED` (Free plan), 402 with `INSUFFICIENT_CREDITS` (add credits at https://app.ken.so/settings/billing, then claim again), 402 at the new-payer limit and 400 for daily capacity (do not retry: tell the user what the message says).

## Step 3 - Connect Google or Microsoft mailboxes

`domain_setup(operation="inboxes-create-connect-session", provider="google", purpose="campaign")` (or `provider="microsoft"`) returns `authorizationUrl` and `expiresAt`.

- The mailbox owner opens `authorizationUrl` before `expiresAt` and signs in. The connect finishes in Kenso, where the member who started the session must be signed in, in this workspace.
- When the company blocks new apps, a Google Workspace or Entra admin trusts the app first through `adminUrl` (or `adminConsentUrl` on Microsoft).
- `purpose="primary"` connects a member's own work mailbox for 1:1 outreach. It is never used by campaigns or warmup.
- Repeat per mailbox, then check `inboxes(operation="list")`.

## Step 4 - Import SMTP and IMAP mailboxes

`domain_setup(operation="inbox-imports-create", rows=[{"email": "maya@acme-mail.com", "password": "<password>", "smtp_host": "smtp.example.com", "smtp_port": 587, "imap_host": "imap.example.com", "imap_port": 993}])`

- Up to 500 rows. It needs the workspace's `inbox_csv_import` flag (404 while it is off).
- It returns a job. Follow it with `jobs(operation="get", job_id="<job id>", job_type="inbox_import")`. `rowErrors` names the field of each row that was not sent.
- First name, last name and daily limit are not applied by the import. Set them afterwards with `inbox-configuration`.
- For a known mailbox host, `sending_providers(operation="providers-list")` lists presets with their SMTP and IMAP hosts and ports, when it is listed for you.

## Step 5 - Connect a sending provider

These operations are for workspace members, and need the workspace's `sending_providers` flag.

1. `sending_providers(operation="providers-list")` lists the providers Kenso supports, with `termsForbidOutreach`, `defaultDailyCap`, `sendsFromProviderInboxes` and a docs link.
2. When `termsForbidOutreach` is true, tell the user that provider's terms forbid cold outreach on their own account, and suggest another path.
3. Connect it with `sending_providers(operation="create", provider="<slug>")` and the provider key the user pastes (the tool's key field). Then `sending_providers(operation="verify", connection_id=12)`.
4. Add each sending address with `sending_providers(operation="create-identity", connection_id=12, email="maya@acme.com", display_name="Maya Chen")`. When `sendsFromProviderInboxes` is true, the address must already exist in the provider account.
5. `sending_providers(operation="list")` shows the workspace's connections and their state.

## Step 6 - Domain orders already open

When the user bought domains before, check where the orders are: `domain_orders(operation="domain-orders-list", active_only=True)` and `domain_orders(operation="get", order_id=301)`. An order waiting on payment continues with `domain_orders(operation="resume-checkout", order_id=301)`; send the user the checkout link it returns. Cancel an order only when the user asks. New searches and orders go through `domain-selection`. These operations are for workspace members.

## Step 7 - The link host

The link host (for example `go.acme.com`) serves Studio pages and the open pixel from the workspace's own domain. It exists only when the workspace has Studio or account sending on (404 otherwise: skip this step).

1. `domains(operation="hosting-hostname-get")` returns the hostname, its status and the DNS record to add.
2. To set one: `domains(operation="hosting-hostname-set", subdomain="go")`. Workspace admins only.
3. The user adds the DNS record it returns at their DNS host. Then `domains(operation="hosting-hostname-verify")` until the status is ready.

Tracking links on each sending domain are set in `domain-selection`.

## Step 8 - LinkedIn accounts

1. `linkedin(operation="create-connect-session")` returns a link for the account owner to open and sign in. To reconnect an account that dropped, pass its `linkedin_account_id`.
2. `linkedin(operation="list")` shows the accounts and their state afterwards. In the app: https://app.ken.so/delivery?tab=linkedinAccounts.
3. To put accounts on a campaign: read `campaigns(operation="list-linkedin-accounts", campaign_id=42)`, show the change, and after a yes `campaigns(operation="replace-linkedin-accounts", campaign_id=42, linkedin_account_ids=[5, 6])`. It replaces the whole list, so send every account the campaign keeps.

## Step 9 - Check and hand over

- Each new inbox: `inboxes(operation="get-warmup", inbox_id=301)`. New inboxes warm before they send at volume: plan on two to three weeks before full volume.
- Each new domain, once its DNS is in: `domains(operation="verify-dns", domain_id=12)`, then `domains(operation="get-health", domain_id=12)`.
- Report: what is connected, what is warming and until when, what the user still has to do (DNS records, sign-ins, admin consent, payments), and the daily capacity now and once warm.
- Next: `inbox-configuration` for names, signatures, forwarding and limits; `deliverability-guard` once mail is flowing.

## What this skill cannot do yet

- Check SPF, DKIM and DMARC on their own. Domain health shows DNS state, but there is no dedicated record check.
- Run inbox placement tests for every caller. That read is for workspace members only.
- Claim warmed inboxes, connect sending providers or track domain orders for callers outside the workspace's members, or while their flags are off.

## No Kenso account yet

These steps run on the Kenso MCP server, which signs in with a Kenso account. If the user has none, send them to https://app.ken.so/get-started to create one, then sign in when the agent asks.
