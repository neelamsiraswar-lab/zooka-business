# Security Specification & Threat Model

## Data Invariants
1. **User Identity & Role Integrity**: A user can only access and modify data belonging to their workspace or permitted by their RBAC role (`admin`, `accountant`, `auditor`, `billing_operator`).
2. **Voucher Immutability & Auditability**: Invoice numbers, timestamps, and payment transactions cannot be tampered with or modified without proper role permissions.
3. **Auditor Read-Only Invariant**: Auditors have strictly read-only inspection access; write/update/delete operations must be rejected.
4. **ID Poisoning Protection**: Path variables and identifiers must be bounded and match valid alphanumeric patterns.

## The Dirty Dozen Attack Payloads
1. **Unauthenticated Read on User Profiles**: `{ "target": "/users/1", "auth": null }` -> Expect `PERMISSION_DENIED`.
2. **Privilege Escalation**: Non-admin attempting to set `role: "admin"` directly -> Expect `PERMISSION_DENIED`.
3. **Auditor Write Bypass**: Auditor role user sending POST/PUT on `/invoices` -> Expect `PERMISSION_DENIED`.
4. **ID Poisoning**: Document ID with 2KB payload -> Expect `PERMISSION_DENIED`.
5. **Cross-Tenant Data Tampering**: User A modifying User B's invoices -> Expect `PERMISSION_DENIED`.
6. **Negative Inventory Stock Injection**: Malicious negative price or quantity -> Expect `PERMISSION_DENIED`.
7. **Orphaned Invoice Line Item**: Creating line items without valid invoice header -> Expect `PERMISSION_DENIED`.
8. **Ghost Field Injection**: Adding arbitrary administrative flags `isAdmin: true` -> Expect `PERMISSION_DENIED`.
9. **Blanket Query Scraping**: Unauthorized collection listing without authentication -> Expect `PERMISSION_DENIED`.
10. **Cheque State Tampering**: Bypassing clearance lifecycle state transitions -> Expect `PERMISSION_DENIED`.
11. **Bank Statement Data Corruption**: Modifying reconciled transactions without authorization -> Expect `PERMISSION_DENIED`.
12. **Master Ledger Clearing Exploitation**: Non-admin invoking full purge -> Expect `PERMISSION_DENIED`.
