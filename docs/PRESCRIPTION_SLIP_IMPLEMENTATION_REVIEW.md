# Prescription Slip — Implementation Review

**Date:** June 2026 (updated 24-Jun — bugs fixed; scope reduced to template-only)
**Reviewed against:** [PRESCRIPTION_SLIP_SYSTEM_PLAN.md](./PRESCRIPTION_SLIP_SYSTEM_PLAN.md) + the original spec.

> 🔒 **Scope decision (24-Jun, locked by user):** keep the existing **fee/invoice process exactly as-is** — the invoice is still created in the DB unchanged. The **only** change is the *printed* document: it renders the prescription-slip template instead of the invoice layout. **No new schema** — token numbering, `doctor_templates`, `prescription_slips`, the `book_appointment` RPC, and the Phase-1 migration are **dropped** (the migration was never applied and has been deleted). Sections below that describe those pieces are retained as *historical reference only* and are **not** being built.
**Files reviewed:**
- New: [src/utils/prescriptionSlipGenerator.ts](../src/utils/prescriptionSlipGenerator.ts)
- Modified: [src/components/dialogs/EnhancedAppointmentDialog.tsx](../src/components/dialogs/EnhancedAppointmentDialog.tsx)
- Modified: [src/components/staff/StaffCounter.tsx](../src/components/staff/StaffCounter.tsx)

---

## Verdict

**Solid MVP slip generator — but it is the *renderer* (Plan Phase 3), not the full "Dynamic Doctor Template" system.**

The code is clean, follows the existing [pathologyPdfGenerator.ts](../src/utils/pathologyPdfGenerator.ts) pattern, and achieves the **primary rule**: the patient-facing document is now a prescription slip while the invoice still lands in the DB for finance. TypeScript passes. Good first cut.

Measured against the full spec, this is a **hospital-branded slip**, not a **per-doctor dynamic template**. Roughly **1 of ~7 phases** complete.

---

## ✅ What's correct

- Invoice → slip swap done in both flows; invoice still created internally. [StaffCounter.tsx](../src/components/staff/StaffCounter.tsx) keeps `generateInvoicePDF` only for the emergency reprint path.
- Header/footer drawn **programmatically** — consistent with the "no attached references" decision (Plan §4.C).
- Fee block shows `PAID` as informational; QR present; popup-blocked → `doc.save` fallback.
- `hospital_settings` fields read (`hospital_name`, `hospital_address`, `contact_number`, `logo_url`) all exist in the schema. ✓
- Age computed correctly from `date_of_birth` in StaffCounter.

---

## ✅ Bugs resolved (24-Jun)

| Bug | Fix |
|---|---|
| **Date double-conversion** (HIGH) | Both call sites now pass raw ISO UTC string to the generator; `formatInPakistanTime` is called **once** inside the generator. Removed unused `formatInPakistanTime` import from StaffCounter. |
| **Fee-box overflow** (MEDIUM) | Removed `Invoice #` row from fee box entirely (invoice stays internal per Plan §14). Box reduced to 2 rows. Token number got its own dedicated row (drawn in brand color when present). |
| **`Invoice #` on slip** (LOW) | Dropped — the fee box no longer references the invoice. |

## 🧹 Cleanups applied

- Removed unused `patientId` field from `PrescriptionSlipData` interface and both call sites.
- Removed unused `offset` return value from `addField('Patient:')`.
- Added `URL.revokeObjectURL` 5s after popup fallback to prevent blob leak.
- `formattedFee` computed once and cached in the function.

---

## ❌ Spec gaps still missing (the bulk of the "Dynamic Doctor" system)

Expected if building phase-by-phase, but **not yet implemented**:

| Gap | Impact |
|---|---|
| **Token number** never generated or passed by either call site | The prominent `TOKEN NO` strip always falls back to "PRESCRIPTION SLIP". Core spec requirement. Needs Plan Phase 1 numbering (reuse `queue_positions` / `get_next_queue_position()`). |
| **Appointment number** not generated/shown | Spec field missing. |
| **Barcode (Code128)** not added | Only QR exists; Plan §11 flagged the missing lib. |
| **Per-doctor template** | Header comes from hospital-level `hospital_settings`, not `doctor_templates`. No Urdu header, no per-doctor signature/stamp, no toggles. The "no hardcoded doctor info / fully dynamic per doctor" requirement is **not met** — it's hospital-branded, not doctor-branded. |
| **QR payload** omits appointment# and token | Spec wanted both encoded. |
| **No `prescription_slips` record; no audit logging** of generate/print/reprint | Plan §10 / §5.6 pending. |

---

## Recommendation (within the locked scope)

The feature is **done** for the agreed scope: invoice/fee flow unchanged, printed document is now the prescription slip, all known renderer bugs fixed, no schema changes, no migration. Safe to ship.

**Optional polish (no schema, only if wanted)**
1. Pass `patientGender` (and `patientAge` from EnhancedAppointmentDialog) so the Age/Gender line is fully populated.
2. Tidy the slip generator's dormant `tokenNumber`/`bookingType` params — harmless, but unused now that token numbering is out of scope.

> Token/appointment numbering, barcode, `doctor_templates`, `prescription_slips`, and the `book_appointment` RPC are **out of scope** (see the scope banner at the top). The migration has been deleted.

---

## Status map (vs Plan §13 phases)

| Phase | Status |
|---|---|
| 0 — Decisions | Scope locked → template-only |
| 1 — Schema & numbering | 🚫 **dropped** — no schema change; migration deleted |
| 2 — Doctor template mgmt | 🚫 out of scope |
| 3 — Slip renderer | ✅ **done** — renderer built, bugs fixed (this is the whole feature in the reduced scope) |
| 4 — Reception booking pipeline | ✅ unchanged — existing invoice/fee flow kept; only the printed doc swapped |
| 5 — Dashboards & queue | 🚫 out of scope |
| 6 — Audit & sharing | 🚫 out of scope |
| 7 — Verify | ⬜ print one slip from each flow to confirm layout |
