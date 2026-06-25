# Prescription Slip — Improvements (Round 2)

**Date:** 24-Jun-2026
**Builds on:** [PRESCRIPTION_SLIP_IMPLEMENTATION_REVIEW.md](./PRESCRIPTION_SLIP_IMPLEMENTATION_REVIEW.md)
**Goal:** make the printed slip resemble the official SWHC reference letterhead, add a daily token, show the doctor's fee bottom-left, and make the doctor's letterhead details editable.

This is **additive and minimal** — the invoice/fee process stays exactly as-is. Only **one** nullable DB column is added.

---

## The 4 asks (verbatim → plan)

| # | Ask | Plan |
|---|---|---|
| 1 | "add token like first patient of day gets 1st token number and so on" | **Reuse the existing `queue_positions` system — no new schema.** §1 |
| 2 | "template of dr should be added" | Per-doctor letterhead stored in **one `doctors.prescription_template` JSONB column**; slip renders it like the reference. §2 |
| 3 | "fee of the dr show at the left bottom" | Move the fee block to **bottom-left, above the footer**. §3 |
| 4 | "dr details editable from dr dash setting + account creation dialog when dr role selected" | Add a template editor to [DoctorProfileSettings.tsx](../src/components/DoctorProfileSettings.tsx) and a conditional doctor section to [UserAccountDialog.tsx](../src/components/UserAccountDialog.tsx). §4 |

---

## 1. Daily token — reuse what already exists (zero new schema)

The DB already does exactly what's asked. From [supabase/migrations/20250709160411-...sql](../supabase/migrations/20250709160411-74b19f67-d7fa-4d37-a6b1-a4461a3dd3ca.sql):

- **`queue_positions`** table: `(appointment_id, doctor_id, appointment_date, queue_position, status)`.
- **`get_next_queue_position(doctor, date)`** → `COALESCE(MAX(queue_position),0)+1` (per doctor, per day).
- **`auto_assign_queue_position()`** trigger `trigger_auto_assign_queue_position` runs **AFTER INSERT ON appointments** and inserts the next `queue_position`.

➡️ **Every appointment already has a daily sequential token** = `queue_positions.queue_position`. First patient of the day = `1`, next = `2`, … resets each day **per doctor**.

### What to do
Only **read it and pass it to the slip** (the generator already accepts `tokenNumber` and renders the `TOKEN NO` strip + row):

- **StaffCounter flow** ([StaffCounter.tsx](../src/components/staff/StaffCounter.tsx)) — the appointment already exists, so before calling the generator:
  ```ts
  const { data: qp } = await supabase
    .from('queue_positions')
    .select('queue_position')
    .eq('appointment_id', appointment.id)
    .maybeSingle();
  // pass tokenNumber: qp ? `TOKEN NO. ${qp.queue_position}` : null
  ```
- **EnhancedAppointmentDialog flow** ([EnhancedAppointmentDialog.tsx](../src/components/dialogs/EnhancedAppointmentDialog.tsx)) — the trigger inserts the queue row *after* the appointment insert, so query `queue_positions` by the **new appointment id** returned from `createAppointmentWithInvoice`, then pass it the same way.

### Decision (one)
`queue_positions` resets **per doctor** per day (Dr A: 1,2,3… ; Dr B: 1,2,3…). That's the standard token model and what's implemented.
- ✅ **Default — per doctor** (no change).
- If a **single clinic-wide** daily counter is wanted instead, that *would* need a small new counter; flag it and we'll add it. (Recommend keeping per-doctor.)

### Token format
Plain integer from `queue_position`. Display as `TOKEN NO. 5` (or `TK-005` if you prefer zero-padding). No reset logic to write — the date partition handles it.

---

## 2. Per-doctor template (letterhead like the reference)

The reference is **doctor-specific**: red doctor name, degrees, specialization, several credential lines (English **and** Urdu), SWHC logo center, "Phone No of PA to Clinic", footer. The hospital-level bits (hospital name, logo, footer address) already come from `hospital_settings`. Only the **doctor's** letterhead text is new.

### Data model — one JSONB column (minimal, safe, additive)
```sql
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS prescription_template jsonb;
```
Shape (all optional; renderer falls back to sensible defaults / `hospital_settings`):
```jsonc
{
  "title_prefix": "Prof. Dr.",              // before the name
  "degrees": "MBBS, FCPS, CHPE, CHR",
  "credentials": [                            // English credential lines (the list)
    "Principal KMU-IMS Kohat",
    "CEO DHQ & W&C/LM Teaching Hospital Kohat",
    "Pattern in Chief Society of OBS/Gynae (SOGP) Kohat Chapter",
    "Former Chairperson Society of OBS/Gynae (SOGP) Kohat Chapter",
    "Former Head of Gynae Department Liaqat Memorial Hospital Kohat",
    "Former Dean, Faculty of Allied Health Sciences KMU Peshawar, Pakistan"
  ],
  "urdu_name": "پروفیسر ڈاکٹر مسرت جبین",
  "urdu_lines": [ "…", "…" ],                 // Urdu degrees/specialization/credentials
  "pa_phone": "0336-1974146",                 // "Phone No of PA to Clinic"
  "footer_text": "NOT VALID FOR COURT",       // override; defaults to this
  "show_token": true, "show_fee": true, "show_qr": true
}
```
> `specialization`, `consultation_fee`, `license_number` already live on `doctors` — reuse them; don't duplicate. `license_number` doubles as PMDC (or add `pmdc_number` later if needed).

### Slip generator changes ([prescriptionSlipGenerator.ts](../src/utils/prescriptionSlipGenerator.ts))
- Accept the doctor's `prescription_template` + `consultation_fee` + `license_number` in `PrescriptionSlipData` (fetch by `doctor_id`, or pass through from the call sites).
- **Rewrite `drawHeader`** to reproduce the reference layout instead of the plain navy band:
  - Left block: `title_prefix + doctorName` (large), `degrees`, `specialization`, then each `credentials[]` line (small).
  - Center: SWHC logo (`hospital_settings.logo_url`, already loaded) + `Phone No of PA to Clinic: {pa_phone}`.
  - Right block: `urdu_name` + `urdu_lines[]` — **right-aligned**, rendered with a bundled **Urdu Nastaliq font**.
  - Hospital title (`hospital_settings.hospital_name`) across the very top.
- Everything stays **dynamic per doctor** — no hardcoded names. A doctor with an empty template still renders cleanly (name/degrees blank, hospital header intact).

### One bundled asset (not a per-doctor upload)
Urdu can't render in jsPDF's built-in fonts. Add **Noto Nastaliq Urdu** (OFL) once under `src/assets/fonts/` and register via `addFileToVFS` + `addFont`. This is a repo asset, consistent with the "no attached references" rule — the doctor still just **types** Urdu text in settings.

---

## 3. Fee bottom-left

Currently the fee box sits mid-page. Move it to **bottom-left, above the footer** (matches the reference area and the original spec's "consultation fee display: bottom left, above NOT VALID FOR COURT").

In [prescriptionSlipGenerator.ts](../src/utils/prescriptionSlipGenerator.ts):
- Remove the mid-page fee box.
- After the clinical/RX area, draw at a fixed bottom-left anchor (e.g. `y = pageHeight - 30`, `x = marginX`):
  ```
  Consultation Fee: Rs. 1500
  Status: PAID
  ```
- Keep the QR bottom-**right** (already there) and the signature line — they won't collide with bottom-left fee.
- Gate on `template.show_fee !== false`.

---

## 4. Editable doctor details

### 4a. Doctor dashboard → Settings
[DoctorProfileSettings.tsx](../src/components/DoctorProfileSettings.tsx) already loads/saves the `doctors` row (`handleSave` upserts specialization, consultation_fee, license_number, …). Add a new **"Prescription Slip Template"** `<Card>` with inputs for `title_prefix`, `degrees`, a multi-line `credentials` textarea (one line each), `urdu_name`, `urdu_lines` textarea, `pa_phone`, and the toggles. On save, include `prescription_template` (assembled object) in the existing `doctors` upsert. No new save path needed.

### 4b. Account creation dialog (when role = doctor)
[UserAccountDialog.tsx](../src/components/UserAccountDialog.tsx) has the role `Select`. When `formData.role === 'doctor'`, conditionally render a **"Doctor Details"** section (specialization, license/PMDC, consultation fee, degrees, and optionally the template fields). On submit:
1. Create the account as today (`createUserAccount` → `create_user_account` RPC returns the new user id).
2. If role is doctor, **upsert the `doctors` row** for that id with `specialization, consultation_fee, license_number, prescription_template`.

> Check `create_user_account`'s return: it `RETURNS uuid`. Make sure the `createUserAccount` hook surfaces that id so step 2 can target it. If a trigger already creates a `doctors` row on `role='doctor'`, step 2 becomes an UPDATE; otherwise INSERT/upsert.

---

## 5. Migration (the only DB change)

```sql
-- 20260624130000_doctor_prescription_template.sql
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS prescription_template jsonb;
```
That's it. **No** changes to numbering, invoices, queue, RLS, or triggers — token reuse needs nothing, and the JSONB column inherits the existing `doctors` RLS.
*(Optional later: `pmdc_number text` if `license_number` shouldn't double as PMDC.)*

---

## 6. Files to touch

| File | Change |
|---|---|
| `supabase/migrations/20260624130000_doctor_prescription_template.sql` | **new** — add `doctors.prescription_template jsonb` |
| [prescriptionSlipGenerator.ts](../src/utils/prescriptionSlipGenerator.ts) | rewrite `drawHeader` to the reference layout (incl. Urdu font); move fee box bottom-left; accept template/fee/license |
| `src/assets/fonts/NotoNastaliqUrdu*.ttf` + a small font-register helper | **new** — bundled Urdu font |
| [StaffCounter.tsx](../src/components/staff/StaffCounter.tsx) | fetch `queue_positions.queue_position` → pass `tokenNumber`; pass doctor template/fee |
| [EnhancedAppointmentDialog.tsx](../src/components/dialogs/EnhancedAppointmentDialog.tsx) | after booking, fetch token for the new appointment → pass `tokenNumber`; pass doctor template/fee |
| [DoctorProfileSettings.tsx](../src/components/DoctorProfileSettings.tsx) | add "Prescription Slip Template" card; save `prescription_template` |
| [UserAccountDialog.tsx](../src/components/UserAccountDialog.tsx) | conditional "Doctor Details" section when role=doctor; upsert `doctors` after create |
| `src/integrations/supabase/types.ts` | regenerate after migration |

---

## 7. Open decisions

1. **Token scope** — per-doctor daily (default, already implemented) vs single clinic-wide daily counter? (Recommend per-doctor.)
2. **Token format** — `TOKEN NO. 5` vs `TK-005`?
3. **PMDC** — reuse `license_number`, or add `pmdc_number`?
4. **Template depth** — full reference reproduction (English + Urdu credential lines, exact red/blue styling) vs a simpler branded header? Full reproduction needs the bundled Urdu font and more layout work.

---

## 8. Build checklist

- [ ] Migration: `doctors.prescription_template jsonb`; regenerate types.
- [ ] Bundle Noto Nastaliq Urdu font + register helper.
- [ ] Generator: reference-style `drawHeader` (dynamic per-doctor, Urdu).
- [ ] Generator: fee block → bottom-left, gated on `show_fee`.
- [ ] StaffCounter + EnhancedAppointmentDialog: fetch token from `queue_positions`, pass token + template + fee.
- [ ] DoctorProfileSettings: template editor card → saves `prescription_template`.
- [ ] UserAccountDialog: conditional doctor section + `doctors` upsert on create.
- [ ] Verify: book a patient → slip shows correct daily token, that doctor's letterhead, fee bottom-left; second patient same day shows token +1.
