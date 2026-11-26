# VATRA ID lifecycle — deployment gate (not enabled)

This change provides the VATRA ID dashboard, profile editing and account lifecycle UI, but **does not enable destructive operations**. The production database has not been changed. The frontend release gate is intentionally false.

## Server contract (not deployed)

Authenticated Edge Function `account-lifecycle`, using the bearer session to derive the account identity, never a supplied member ID. No privileged key in the browser.

- `status`: returns `{ok:true,ready:true,state:"active"}`, or `{ok:true,ready:true,state:"pending",restore_until:"<server ISO timestamp>"}`. The server must return pending/expired/purging states even when normal profile access is denied.
- `request_deletion`: requires fresh server-side password verification, current valid session, explicit confirmation, and allowed recovery_days 0/7/30/90/180. Zero returns purging only after the irreversible job is durably accepted. Nonzero returns pending and its authoritative UTC deadline.
- `restore`: requires fresh password verification and a valid current session. Under a row lock it may transition pending -> active only if the server clock is strictly before restore_until. It must reject expired or purging requests and never clear moderation restrictions.
- No success response may be fabricated by the browser. On error, state remains unconfirmed.

## Release blockers and tests

1. Design a private lifecycle table/state machine, atomic request/restore/claim transitions, grants, RLS and audit of existing account_states moderation rules. All social routes, API reads/writes, Storage access, Realtime, cached data and sessions must respect deactivation. Restore screen must be reachable only by the authenticated owner with a pending state.
2. Inventory every direct and indirect FK and non-FK owner/member reference. Production inspection found post_comments.author_vatra_id references accounts.vatra_id without ON DELETE CASCADE. Several other relations use IDs outside direct FKs. Do not rely on a single Auth delete or indiscriminate cascading. Review ownership of communities, shared content and third-party data.
3. Use a trusted, retryable server worker with an atomic claim and no restoration once claimed. Remove actual Storage objects through Storage API (including originals, thumbnails, attachments, private and public buckets, scheduled uploads, and any service-owned paths established by validated ownership). Do not merely delete storage.objects metadata. Hard-delete Auth user only after verified dependent cleanup. Verify live sessions/access tokens cannot continue reading or writing. Retain minimal non-PII job state only as long as needed for retries; backups and legally required retention must be documented, not promised away.
4. Configure a server-side scheduled job independent of client visits; test expiry and restart/retry, duplicate execution, concurrent restore/purge, cross-account requests, old JWT, anonymous access, private/public visibility and all object buckets on disposable test accounts. Do not enable the release flag before these tests pass.
5. Test real password verification including MFA if enabled; preserve existing email-change confirmations. No two-factor controls are represented as operational until login enforcement is verified.

No user account or production content should be deleted while testing this branch.
