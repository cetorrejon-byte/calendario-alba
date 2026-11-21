# Security Specification — Alba’s Beauty Salón Advent Calendar 2026

## 1. Data Invariants
1. **Strictly One Winner Per Door**: A `claims/{claimCode}` document cannot be created unless `doors/{dayId}` atomically transitions in the same transaction from `status == 'available'` to `status == 'claimed'` with matching `claimCode` and `prizeTitle`, and `doors/{dayId}` cannot transition to `'claimed'` without `claims/{claimCode}` existing in `getAfter()`.
2. **Server-Authoritative Time Gate**: When `campaign/config.testUnlockAll == false` and `campaign/config.simulationIso == null`, a public claim on `doors/{dayId}` is rejected unless Firestore's trusted server `request.time` (shifted +1h to CET for December in `Europe/Madrid`) falls inside that day's `[openHour:openMinute, closeHour:closeMinute]` window.
3. **Terminal State Locking**: Once `claims/{claimCode}.redemptionStatus == 'redeemed'`, no client (not even Admin) can revert it to `'pending'` or update it again.
4. **No Public Enumeration of Claims**: Public visitors can only `get` a single `claims/{claimCode}` using their exact unguessable `ALBA26-DXX-XXXXXX` code; `list` on `/claims` is strictly restricted to verified admins.
5. **Verified Admin RBAC**: Admin access requires `request.auth != null && request.auth.token.email_verified == true` and either the bootstrapped admin email (`cetorrejon@gmail.com`) or an explicit `/admins/{email}` document.

## 2. "Dirty Dozen" Adversarial Payloads (Expected: `PERMISSION_DENIED`)
1. **Unauthenticated Config Tampering**: Visitor sends `update` on `/campaign/config` setting `testUnlockAll: true`.
2. **Duplicate Claim After Door Claimed**: Second concurrent visitor creates `/claims/ALBA26-D01-SECOND` while `/doors/01` is already `claimed`.
3. **Orphan Door Lock (DoS)**: Visitor updates `/doors/01` to `status: 'claimed'` without creating the matching `/claims/{claimCode}` doc.
4. **Orphan Claim Injection**: Visitor creates `/claims/ALBA26-D01-FAKE99` without updating `/doors/01` in the same transaction.
5. **Prize Spoofing Inside Claim**: Visitor creates `/claims/ALBA26-D01-HACK12` with `prizeTitle: '1000 EUR Gratis'` instead of `doors/01.prizeTitle`.
6. **Early Door Opening (Clock Spoof)**: Visitor claims `/doors/24` on Dec 1 when `testUnlockAll == false` and `simulationIso == null`.
7. **Shadow Field Injection**: Payload adds `isAdmin: true` or `extraField: 1` on `/doors/01` or `/claims/{claimCode}` (`hasOnly` blocks it).
8. **Code Enumeration / Scraping**: Unauthenticated visitor runs `list` query on `/claims` to harvest all winning codes.
9. **Reverting Redeemed Prize**: Request updates `/claims/{claimCode}` from `redemptionStatus: 'redeemed'` back to `'pending'`.
10. **Email Spoofing Admin Bypass**: Authenticated user with matching `email` but `email_verified: false` attempts `/campaign/config` update.
11. **ID Poisoning / Resource Exhaustion**: Attacker sends a 2KB document ID to `/doors/{dayId}` or `/audit_logs/{logId}` (`isValidDoorId` / `isValidId` blocks it).
12. **Audit Log Tampering**: Request attempts `update` or `delete` on `/audit_logs/{logId}`.
