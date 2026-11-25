# API recipes: Apollo, Instantly, Smartlead, Attio, Close

Part of the `workflows` skill. Each recipe is a connection and an `http.request@1` step, for a workspace with the `workflows_power` feature. `power-features.md` has the rules for connections, `query`, `neverError` and `pagination`.

## The pattern

1. Create the connection once per workspace with `workflow_tools(operation="workflow-connections-create", ...)`. Each recipe gives the call.
2. The answer has `setupUrl`. Give it to the person so they paste the tool's key there themselves. Never ask for a key in the chat, and never pass one to a tool: no tool here takes a key. For an app in the integration catalog, do not create a key connection here: the person makes it on Kenso's New connection screen, which takes the key as the app shows it and builds the value the app reads (`connection.key` from `workflow_tools(operation="workflow-integrations-list")` says how). The `setupUrl` page keeps what is pasted as is, which an app such as Close cannot read.
3. Check it with `workflow_tools(operation="workflow-connections-test", ...)` on a path the tool answers with a plain GET.
4. Write the step with `connection` and a path. Try that one step with `workflow_tools(operation="workflow-step-tests-create", ...)`: it is simulated, and `wouldSend` shows the call with the secret hidden.
5. Test the whole workflow, then publish. Publishing a step with a connection needs the Integrations permission.

Each tool changes its API on its own calendar. When a call answers 404 or 422, read the tool's API reference and correct the path or the body: the pattern stays the same.

Ids that differ per workspace (a campaign in the other tool, a list) belong in a workspace variable, read as `{{vars.NAME}}`.

To send a record to another tool only once, look it up in a table first and remember it after:

```json
{ "id": "already_sent", "type": "table.find@1", "with": { "table": "synced_leads", "where": [{ "column": "email", "op": "eq", "value": "{{lead.email}}" }], "limit": 1 } }
```

```json
{ "id": "mark_sent", "type": "table.upsert@1", "with": { "table": "synced_leads", "row": { "email": "{{lead.email}}", "tool": "instantly" } } }
```

Put `"when": "{{already_sent.found}} == false"` on the step that sends.

## Apollo

Apollo reads its key from the `X-Api-Key` header:

`workflow_tools(operation="workflow-connections-create", client_id=..., name="apollo", type="header", auth_name="X-Api-Key", secret_name="APOLLO_KEY", base_url="https://api.apollo.io")`

Enrich a person by email. The email goes in the query, not in a body:

```json
{ "id": "apollo_match", "type": "http.request@1", "with": { "connection": "apollo", "url": "/api/v1/people/match", "method": "POST", "query": { "email": "{{person.email}}" }, "neverError": true } }
```

Read the match from `{{apollo_match.json.person}}`, and guard the next step with `{{apollo_match.ok}}`. Create a contact:

```json
{ "id": "apollo_contact", "type": "http.request@1", "with": { "connection": "apollo", "url": "/api/v1/contacts", "method": "POST", "body": { "first_name": "{{person.firstName}}", "last_name": "{{person.lastName}}", "email": "{{person.email}}", "organization_name": "{{account.name}}" } } }
```

## Instantly

Instantly's API v2 takes a bearer key:

`workflow_tools(operation="workflow-connections-create", client_id=..., name="instantly", type="bearer", secret_name="INSTANTLY_KEY", base_url="https://api.instantly.ai")`

Add a lead to one of its campaigns (`campaign` is Instantly's campaign id, a UUID):

```json
{ "id": "to_instantly", "type": "http.request@1", "with": { "connection": "instantly", "url": "/api/v2/leads", "method": "POST", "body": { "campaign": "{{vars.INSTANTLY_CAMPAIGN}}", "email": "{{lead.email}}", "first_name": "{{lead.firstName}}", "last_name": "{{lead.lastName}}", "company_name": "{{lead.companyName}}" } } }
```

List its campaigns, every page. The answer holds the list in `items` and the next cursor in `next_starting_after`:

```json
{ "id": "instantly_campaigns", "type": "http.request@1", "with": { "connection": "instantly", "url": "/api/v2/campaigns", "method": "GET", "query": { "limit": "100" }, "pagination": { "mode": "cursor", "itemsPath": "items", "cursorPath": "next_starting_after", "cursorParam": "starting_after", "maxPages": 5 } } }
```

## Smartlead

Smartlead reads its key from the query parameter `api_key`:

`workflow_tools(operation="workflow-connections-create", client_id=..., name="smartlead", type="query", auth_name="api_key", secret_name="SMARTLEAD_KEY", base_url="https://server.smartlead.ai")`

Add leads to a campaign. The campaign id is part of the path, and `lead_list` takes up to 400 leads a call:

```json
{ "id": "to_smartlead", "type": "http.request@1", "with": { "connection": "smartlead", "url": "/api/v1/campaigns/{{vars.SMARTLEAD_CAMPAIGN}}/leads", "method": "POST", "body": { "lead_list": [{ "email": "{{lead.email}}", "first_name": "{{lead.firstName}}", "last_name": "{{lead.lastName}}", "company_name": "{{lead.companyName}}" }] } } }
```

## Attio

Attio takes a bearer key:

`workflow_tools(operation="workflow-connections-create", client_id=..., name="attio", type="bearer", secret_name="ATTIO_KEY", base_url="https://api.attio.com")`

Create the person, or update them when the email is already there. The `matching_attribute` says which attribute decides that:

```json
{ "id": "to_attio", "type": "http.request@1", "with": { "connection": "attio", "url": "/v2/objects/people/records", "method": "PUT", "query": { "matching_attribute": "email_addresses" }, "body": { "data": { "values": { "email_addresses": ["{{person.email}}"] } } } } }
```

## Close

Close signs a call with HTTP Basic, the key as the user name and an empty password. A `basic` connection would hold the key in the open as the user name, so it is a `header` connection on `Authorization` that keeps the whole value in the secret. Kenso builds that value from the plain key (Close's `connection.key` format is `basic_user`), so the person never encodes anything: send them through Close's `connection.setupByType.header` steps, which end with pasting the key on Kenso's New connection screen. Never ask them to encode the key or paste it in the chat.

Create a lead with one contact (the path ends with a slash):

```json
{ "id": "to_close", "type": "http.request@1", "with": { "connection": "close", "url": "/api/v1/lead/", "method": "POST", "body": { "name": "{{lead.companyName}}", "contacts": [{ "name": "{{lead.fullName}}", "emails": [{ "email": "{{lead.email}}", "type": "office" }] }] } } }
```

List leads, every page. Close pages with `_skip` and `_limit` and holds the list in `data`:

```json
{ "id": "close_leads", "type": "http.request@1", "with": { "connection": "close", "url": "/api/v1/lead/", "method": "GET", "pagination": { "mode": "offset", "offsetParam": "_skip", "limitParam": "_limit", "pageSize": 100, "itemsPath": "data", "maxPages": 5 } } }
```
