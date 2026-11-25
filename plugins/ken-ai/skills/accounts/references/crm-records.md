# A record linked to a CRM

Where the workspace has the CRM mirror on, `accounts(operation="get", account_id=101)`, `people(operation="get", person_id=41)` and `opportunities(operation="get", opportunity_id=77)` (and the account list and search) carry two more blocks. Both are left out while the mirror is off and when the record links to no CRM record:

- `crm`: the CRM record it links to, with `provider`, `connectionId`, `objectType`, `externalId`, `externalUrl`, `lastSyncedAt`, and `crmDeletedAt` once the CRM deleted or merged it away.
- `crmOwner`: the owner when it is a CRM user with no seat in the workspace. Show it as "Anna Berg (HubSpot)". A member owner always wins, so it is absent when `ownerMemberId` is set.

Use the `connectionId` from `crm` for these calls (they answer 404 `not_found` while the mirror is off):

- Where the record stands: `crm_mirror(operation="records-sync-status", connection_id=3, entity_type="account", entity_id=101)`. Linked or not, when it last synced, whether a write waits, the CRM's last refusal with `reason` and `fix`, and for a record the CRM deleted, `keptBecause`.
- Its field history: `crm_mirror(operation="field-changes-list", connection_id=3, entity_type="account", entity_id=101, ken_field="custom.seats")`. Each change has before and after, `side` (`crm` or `ken`), `reason` (`sync`, `first_link`, `conflict_lost`, `revert`, `put_back` or `machine_fill`), who and when, and `revertible`.
- Put an old value back: `crm_mirror(operation="field-changes-revert", connection_id=3, change_id=9)` puts a revertible change's old value back as your edit, and the edit then syncs to the CRM. Run it only on a yes that names the record, the field and the value.
- Compare with the CRM: `crm_mirror(operation="records-compare", connection_id=3, entity_type="account", entity_id=101)` reads the CRM record now and lists each mapped field's value in the workspace, its CRM value and its last synced value, and which way the next sync would write. It writes nothing, and it counts against the CRM's rate limit.
- Sync now: `crm_mirror(operation="records-sync", connection_id=3, entity_type="account", entity_id=101)` queues the record's write to the CRM and a re-read of it. It is a CRM write: run it only on a yes that names the record ("sync Acme to HubSpot now"). `outbound` `writes_off` means the connection is still import-only and nothing reaches the CRM.

A custom field whose `fields(operation="list")` entry has `isReadOnly: true` mirrors a field the CRM computes or locks. An update that sends it is refused with `read_only` on `customFields.<key>`: leave it out, and change it in the CRM. Editing the field map and creating a field in the CRM stay in the app, for admins.
