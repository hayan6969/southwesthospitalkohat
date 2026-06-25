# BMC HIMS — Dynamic Doctor Prescription Slip System

**Status:** ⚠️ **Scope reduced to template-only (24-Jun).** The shipped change keeps the existing fee/invoice process untouched and only swaps the *printed* document to the prescription slip. The full per-doctor template system below (new schema, token/appointment numbering, `doctor_templates`, `prescription_slips`, `book_appointment` RPC) is **NOT being built** — kept as future reference only. See [PRESCRIPTION_SLIP_IMPLEMENTATION_REVIEW.md](./PRESCRIPTION_SLIP_IMPLEMENTATION_REVIEW.md).
**Author:** generated from a full read of the existing codebase (June 2026)
**Scope:** Reception → Book Appointment → Token → Fee → Save → Load Doctor Template → Generate Prescription Slip → Print, with a fully dynamic per‑doctor template and no hardcoded doctor data.

> ⚠️ **Read this first.** This is a *brownfield* feature. A lot of the spec already exists in some form, and several spec assumptions **do not match the current database schema.** This document maps spec → reality, lists the real gaps, and gives a phased build plan grounded in the actual tables/files. Where the spec conflicts with the schema, the conflict is called out explicitly under **Decisions required**.

---

## 1. Current state — what already exists (reuse, don't rebuild)

Stack: **Vite + React 18 + TypeScript + shadcn/ui (Radix) + Tailwind + Supabase (Postgres) + TanStack Query + react-hook-form + zod.**

Already installed and directly relevant:

| Capability | Library | Notes |
|---|---|---|
| PDF generation | `jspdf@3.0.1` | All existing documents are built **programmatically** with jsPDF (no html2canvas). |
| QR codes | `qrcode@1.5.4` + `@types/qrcode` | Already used in [pathologyPdfGenerator.ts](../src/utils/pathologyPdfGenerator.ts). |
| Barcode (Code128) | **MISSING** | No barcode library installed — must add one (see §11). |
| Excel export | `xlsx@0.18.5` | Used for reports. |
| Dates / TZ | `date-fns`, `date-fns-tz`, `src/utils/timezone.ts` (`getCurrentPakistanTime`, `formatInPakistanTime`) | Use these for all dates — the app runs on Pakistan time. |

Existing components/utilities that overlap the spec:

| Spec area | Already exists | File |
|---|---|---|
| Appointment booking (patient self-book) | ✅ | [AppointmentBooking.tsx](../src/components/AppointmentBooking.tsx) |
| Appointment dialog (staff) | ✅ | [AppointmentDialog.tsx](../src/components/dialogs/AppointmentDialog.tsx), [AppointmentDetailDialog.tsx](../src/components/dialogs/AppointmentDetailDialog.tsx) |
| Doctor create/edit | ✅ (partial) | [DoctorDialog.tsx](../src/components/dialogs/DoctorDialog.tsx), [DoctorProfileSettings.tsx](../src/components/DoctorProfileSettings.tsx) |
| Doctor scheduling / availability | ✅ | [DoctorScheduleDialog.tsx](../src/components/dialogs/DoctorScheduleDialog.tsx), [DoctorAvailabilityManager.tsx](../src/components/DoctorAvailabilityManager.tsx), `useDoctorAvailability` |
| Doctor consultation fee (finance) | ✅ | [finance/DoctorFeeManager.tsx](../src/components/finance/DoctorFeeManager.tsx) |
| Prescription (plain text) | ✅ | [PrescriptionDialog.tsx](../src/components/dialogs/PrescriptionDialog.tsx) → [prescriptionPdfGenerator.ts](../src/utils/prescriptionPdfGenerator.ts) |
| Invoices (internal finance) | ✅ | [InvoiceDialog.tsx](../src/components/dialogs/InvoiceDialog.tsx), [finance/FinanceInvoices.tsx](../src/pages/dashboard/finance/FinanceInvoices.tsx), [staff/StaffInvoices.tsx](../src/pages/dashboard/staff/StaffInvoices.tsx) |
| Branded slip PDF (pixel-styled) | ✅ pattern | [pathologyPdfGenerator.ts](../src/utils/pathologyPdfGenerator.ts), [dischargeSlipPdfGenerator.ts](../src/utils/dischargeSlipPdfGenerator.ts) — the model to copy. |
| Audit logging | ✅ (partial) | [AuditLog.tsx](../src/components/AuditLog.tsx), `audit_logs` table |
| Print/thermal | ✅ | [thermalReceipt.ts](../src/utils/thermalReceipt.ts), [pharmacy/StickerPrinter.tsx](../src/components/pharmacy/StickerPrinter.tsx) |

**Conclusion:** This is mostly an **extension + integration** job, not a greenfield build. The biggest *net-new* pieces are: per-doctor template storage + assets, the branded slip renderer, and MR/token/appointment numbering.

---

## 2. Current database schema (the real tables)

From [src/integrations/supabase/types.ts](../src/integrations/supabase/types.ts):

**`patients`** — id (`= profiles.id`, 1:1, FK `NOT NULL` with `ON DELETE CASCADE`), `patient_number` (nullable, **generated** as `P-NNNNN` by existing trigger), cnic, address, city, province, date_of_birth, blood_type, allergies, emergency_contact_name/phone.
→ **No `full_name`, no `father_name`, no `gender`, no `phone` columns.** Name & phone live on `profiles`; age is derived from `date_of_birth`. `id` has **no DEFAULT** — it must be supplied on INSERT (or via trigger `gen_random_uuid()` as fallback).
→ **Existing infrastructure:** `generate_patient_number()` SQL function already exists, but produces `P-00001` format (not `MR250624001`). Exposed as `Tables<"patients">["Row"]` in types.

**`profiles`** — id, email, first_name, last_name, phone, role, department_id, shift, is_active.

**`doctors`** — id (`= profiles.id`, 1:1), specialization, consultation_fee, experience_years, license_number, avatar_url, hospital_share_percentage, fee_set_by_finance, fee_updated_at/by.
→ **No signature_url, stamp_url, pmdc_number (license_number ≈ PMDC), department, follow_up_fee, emergency_fee, online_fee, and no template fields.**

**`appointments`** — appointment_date, doctor_id, patient_id, type, status (enum `appointment_status`), notes, booking_type, consultation_fee_at_time, payment_status, payment_due_time, invoice_generated_at, cleared_at.
→ **No `token_number`, no `appointment_number`, no `department_id`, no `consultation_type`.**
→ **Existing `appointment_status` enum values:** `scheduled | completed | cancelled | rescheduled`. **No queue-state values** (`waiting`, `called`, `in_consultation`, `missed`) — must extend for queue.

**`queue_positions`** — appointment_id, doctor_id, appointment_date, queue_position (integer, per‑doctor‑per‑day), status (`waiting | in_progress | completed | skipped`).
→ This table already provides per‑doctor daily queue numbering. The existing `get_next_queue_position(doctor_uuid, date)` SQL function (line 3790 in types) returns `MAX(queue_position)+1`. **The plan's "token" is essentially a renamed/repurposed queue_position** — no need to build from scratch.

**`prescriptions`** — appointment_id, patient_id, doctor_id, `prescription_text` (single free-text), created_at/updated_at.
→ **No structured clinical fields, no token, no `pdf_url`.**

**`invoices`** — amount, invoice_number (string; prefixes seen: `PATH-INV-`), patient_id, doctor_id, status, paid_at, created_by, description, `emergency_patient_data` (Json — used when there is no real patient row).

**`audit_logs`** — action, details, ip_address, user_id, created_at. → **No machine_name; no structured time beyond created_at.**

**Does NOT exist at all:** `doctor_templates`, `prescription_slips`.
**Partially exists:** `generate_patient_number()` produces `P-NNNNN` (not `MRyymmddNNN`); `get_next_queue_position()` can serve as base for token numbering. **No appointment_number generator, no `MRyymmddNNN`-format generator.**

---

## 3. Gap analysis (spec → reality)

| Spec requirement | Reality | Action |
|---|---|---|
| `patients` has name/father_name/age/gender | Patients are 1:1 with `profiles`; no such columns | **Decision required (§4.A).** Add walk-in columns or decouple. |
| MR number `MR250624001` | `patient_number` exists, **generated** as `P-NNNNN` by existing trigger (not `MRyymmddNNN`) | Change `generate_patient_number()` to produce `MRyymmddNNN` format, or add a separate MR field (§6). |
| Appointment number `APT-2026-00124` | none | Add column + SQL generator (§6). |
| Token `TK-001`, daily reset | `queue_positions` table exists with per-doctor daily queue + `get_next_queue_position()` function | Reuse/rename queue_position as token; add `token_number` column to appointments (§6). |
| Per-doctor template (header/footer/logo/urdu/signature/stamp/toggles) | none | New `doctor_templates` table + storage bucket (§5, §7). |
| Slip = branded template, pixel-perfect | only plain-text prescription PDF | New renderer (§8). |
| Consultation fee collected + saved as transaction | `appointments.consultation_fee_at_time` + `payment_status` + `invoices` exist | Wire fee step into existing invoice flow (§9). |
| Barcode (Code128) of MR | no lib | Add `bwip-js` or `jsbarcode` (§11). |
| QR with patient/appt/token/doctor | `qrcode` installed | Reuse existing pattern (§8). |
| `prescription_slips` (pdf_url, generated_by) | none | New table (§5). |
| Audit: appt created, fee received, slip generated/printed/reprinted, machine name | `audit_logs` partial | Extend (§10). |
| Doctor dialog: photo/signature/stamp, follow-up/emergency/online fee, slot duration, max/day | partial | Extend doctor model + dialog (§7). |
| Invoices internal only; slip is patient-facing | matches current intent | Keep — **do not auto-print invoices** (§9). |

---

## 4. Decisions required before coding

These are genuine forks where the spec and the existing system disagree. Resolve before Phase 1.

### A. How are walk-in patients modeled? (biggest decision)
Today every patient is an auth user (`patients.id = profiles.id` with FK `NOT NULL` + `ON DELETE CASCADE`). `patients.id` has **no DEFAULT** — the trigger `set_patient_defaults()` calls `COALESCE(NEW.id, gen_random_uuid())` as a fallback, but the FK constraint still requires a matching `profiles` row. Reception registering a walk-in with just name/father/CNIC/age/gender does **not** fit.

Options:
1. **Recommended — make `patients` standalone for walk-ins.** Add columns `full_name`, `father_name`, `gender`, `phone` to `patients`, drop the `patients.id → profiles.id` FK constraint, add a **nullable `profile_id`** column for existing linked patients, and auto-generate `patients.id` via `gen_random_uuid()`. Online self-booking keeps using profiles. One model, minimal disruption.
2. Decouple `patients` from `profiles` entirely (bigger migration; touches every patient query).
3. Reuse the existing `invoices.emergency_patient_data` JSON pattern for walk-ins (no schema change, but patients aren't first-class — bad for MR numbers, dashboards, history).

→ **Default assumption for the rest of this plan: Option 1.**

### B. Reception booking surface
[AppointmentBooking.tsx](../src/components/AppointmentBooking.tsx) is **patient-facing self-booking** (uses `profile.id` as patient). The spec's reception form (register patient + collect fee + token + print) is a **different screen**. Build a **new** `ReceptionBooking` flow rather than overloading the existing one. Reuse the staff [AppointmentDialog.tsx](../src/components/dialogs/AppointmentDialog.tsx) where possible.

### C. Template rendering technique (pixel-perfect) — **fully programmatic, no attached references**
**User decision (locked): no reference images will be attached.** No per-doctor header/footer/logo/signature/stamp uploads. The entire letterhead is **redrawn in code** with jsPDF and filled from the doctor's data fields (`urdu_header_text`, `english_header_text`, name, degrees, specialization, PMDC, address, phones, footer text). The look is reproduced once in the renderer; only the *data* changes per doctor.

Implications to handle:
- **Urdu/Nastaliq text** is the one hard part — jsPDF's built-in fonts can't render Urdu. Bundle an Urdu TTF **once in the repo** (e.g. *Noto Nastaliq Urdu*) and register it via `jsPDF.addFont`/`addFileToVFS`. This is a one-time in-repo asset, **not** something the user attaches.
- The **hospital logo** (SWHC heart mark) is reproduced either as a small vector/shape drawn in code or as a single base64 asset **bundled once in the repo** — again not a per-doctor upload.
- **Signature/stamp:** since nothing is attached, these default to **off** (the doctor signs by hand after printing). The `show_signature`/`show_stamp` toggles remain but are optional and unused unless a doctor later opts to store one.

→ **Default assumption (updated): 100% programmatic letterhead from text fields + a bundled Urdu font + a bundled logo. Zero uploaded references.**

### D. Keep `prescriptions` or replace?
Keep `prescriptions` for the clinical text, and add a separate **`prescription_slips`** table that records each generated slip (pdf_url, token snapshot, generated_by, printed/reprinted counts). The slip is the *document*; the prescription is the *clinical content*. Optionally extend `prescriptions` with structured fields (Pelvic U/S, Uterus, Adnexa, POD, diagnosis…) if doctors will type them digitally; otherwise leave the RX area blank for handwriting (the template supports manual writing after printing).

### E. Asset storage — **not required**
Because no reference images are attached (Decision C), **no storage bucket is needed** for header/footer/logo. The letterhead is code-drawn; the Urdu font and hospital logo are bundled in the repo (e.g. under `src/assets/`). A bucket is only needed *later* if a doctor ever opts to store a signature/stamp image — defer until then.

---

## 5. Database changes (migrations)

Follow the existing migration conventions in `supabase/migrations/` (timestamped files, `SECURITY DEFINER` RPCs like `create_user_account`). One migration per logical change.

### 5.1 Extend `patients` (walk-ins — Decision A.1)
```sql
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS full_name   text,
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS gender      text,
  ADD COLUMN IF NOT EXISTS phone       text;
-- Make profile link optional for walk-ins:
ALTER TABLE public.patients ALTER COLUMN id DROP DEFAULT;            -- verify current default first
-- (If id currently FKs profiles NOT NULL, add a nullable profile_id instead and keep id as own PK.)
```
> Verify the real `patients.id`/FK setup in the latest migration before writing this — do **not** assume.

### 5.2 MR number generation (`patient_number`)
Replace the existing `generate_patient_number()` function (currently produces `P-NNNNN`) with a new version producing `MRyymmddNNN` (daily counter). Also update the `set_patient_defaults()` trigger to use the new format. Use a per-day counter table or `to_char(now(),'YYMMDD')` + a sequence keyed by date. (See §6 for format.)

### 5.3 Extend `doctors`
```sql
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS pmdc_number     text,   -- or reuse license_number
  ADD COLUMN IF NOT EXISTS department_id   uuid REFERENCES public.departments(id),
  ADD COLUMN IF NOT EXISTS signature_url   text,
  ADD COLUMN IF NOT EXISTS stamp_url       text,
  ADD COLUMN IF NOT EXISTS photo_url       text,   -- or reuse avatar_url
  ADD COLUMN IF NOT EXISTS follow_up_fee   numeric,
  ADD COLUMN IF NOT EXISTS emergency_fee   numeric,
  ADD COLUMN IF NOT EXISTS online_fee      numeric,
  ADD COLUMN IF NOT EXISTS slot_duration_minutes int,
  ADD COLUMN IF NOT EXISTS max_patients_per_day  int;
```

### 5.4 New table `doctor_templates`
```sql
CREATE TABLE public.doctor_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  template_name text NOT NULL DEFAULT 'Default',
  header_image text, footer_image text, hospital_logo text, doctor_logo text,
  doctor_signature text, doctor_stamp text,
  urdu_header_text text, english_header_text text, doctor_description text,
  clinic_address text, clinic_phone text, website text, email text,
  footer_text text DEFAULT 'NOT VALID FOR COURT',
  show_token boolean DEFAULT true,
  show_fee boolean DEFAULT true,
  show_qr boolean DEFAULT true,
  show_barcode boolean DEFAULT true,
  show_appointment_number boolean DEFAULT true,
  show_follow_up_date boolean DEFAULT true,
  show_signature boolean DEFAULT true,
  show_stamp boolean DEFAULT true,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- one active template per doctor:
CREATE UNIQUE INDEX doctor_templates_one_active
  ON public.doctor_templates(doctor_id) WHERE active;
```
Add RLS mirroring other tables (admin/owner write; doctor reads own; reception reads for rendering).

> **Note (Decision C):** the `header_image`/`footer_image`/`hospital_logo`/`doctor_logo`/`doctor_signature`/`doctor_stamp` columns are kept for forward-compatibility but are **unused** in the no-reference build. The renderer reads only the **text** fields (`urdu_header_text`, `english_header_text`, `doctor_description`, `clinic_address`, `clinic_phone`, `website`, `email`, `footer_text`) plus the `doctors` columns. You can omit the image columns from the initial migration if you prefer a leaner table.

### 5.5 Extend `appointments`
```sql
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS token_number       text,
  ADD COLUMN IF NOT EXISTS appointment_number text,
  ADD COLUMN IF NOT EXISTS department_id      uuid REFERENCES public.departments(id),
  ADD COLUMN IF NOT EXISTS consultation_type  text;  -- new|follow-up|emergency|online
```
`queue_status` → reuse the existing `appointment_status` enum if its values cover {waiting, called, in_consultation, completed, cancelled, missed}; otherwise extend the enum (§ Queue states). **Check the enum's current values first.**

### 5.6 New table `prescription_slips`
```sql
CREATE TABLE public.prescription_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id),
  template_id uuid REFERENCES public.doctor_templates(id),
  token_number text, appointment_number text, mr_number text,  -- snapshots
  pdf_url text,
  print_count int DEFAULT 0,
  generated_at timestamptz DEFAULT now(),
  generated_by uuid REFERENCES public.profiles(id)
);
```

### 5.7 Numbering helper functions / triggers
- `generate_mr_number()` → `MRyymmddNNN`
- `generate_appointment_number()` → `APT-YYYY-NNNNN`
- `generate_token_number(doctor_id, date)` → `TK-NNN` (per doctor per day, daily reset)

Implement as `SECURITY DEFINER` functions invoked by the booking RPC (see §9), **not** loose client logic — concurrency-safe via a counters table or `pg_advisory_xact_lock`.

### 5.8 Audit log extension
Add `machine_name text` to `audit_logs` (or fold machine/time into a JSON `details`). Keep `ip_address` (already present).

---

## 6. Numbering schemes

| Number | Format | Example | Reset | Where |
|---|---|---|---|---|
| MR (patient_number) | `MR` + `yymmdd` + 3-digit daily seq | `MR250624001` | daily | trigger on `patients` (replace existing `P-NNNNN` generator) |
| Appointment | `APT-YYYY-NNNNN` (5-digit yearly seq) | `APT-2026-00124` | yearly | booking RPC |
| Token | `TK-` + 3-digit, **per doctor per day** | `TK-015` | daily, per doctor | booking RPC; reuse `get_next_queue_position()` from `queue_positions` table, formatting result as `TK-NNN` |

**Existing infrastructure to leverage:**
- `get_next_queue_position(doctor_uuid, date)` already returns `MAX(queue_position)+1` per-doctor-per-day. The token is simply a formatted version of this value (`TK-` + `LPAD(queue_position, 3, '0')`).
- `queue_positions` table already tracks per-doctor daily order with statuses `waiting | in_progress | completed | skipped`.
- The existing `generate_patient_number()` produces `P-00001` using `MAX(CAST(SUBSTRING(...))) + 1` — **this has concurrency issues** (race condition). Replace with a `counters` table or `pg_advisory_xact_lock`.

Concurrency: generate inside the **single booking transaction** (§9) using a `counters` table (`scope text, period text, value int`) updated with `INSERT … ON CONFLICT … DO UPDATE … RETURNING`, or advisory locks. Never compute by `MAX(...)+1` on the client or in naive SQL (race conditions → duplicate numbers). The existing `generate_patient_number()` using `MAX+1` is **not safe** under concurrent load — the new implementation must be concurrency-safe.

---

## 7. Doctor account + template management UI

Extend [DoctorDialog.tsx](../src/components/dialogs/DoctorDialog.tsx) / [DoctorProfileSettings.tsx](../src/components/DoctorProfileSettings.tsx).

### 7.1 Doctor fields — full inventory

These are all the fields a doctor record can hold. Fields marked **profiles** live in the `profiles` table; fields marked **doctors** live in the `doctors` table.

| Tab | Field | Table | Source | Purpose |
|---|---|---|---|---|
| **Basic** | First Name, Last Name | `profiles` | [`DoctorDialog.tsx:16-17`](../src/components/dialogs/DoctorDialog.tsx) | Existing |
| | Email | `profiles` | `DoctorDialog.tsx:18` | Existing |
| | Phone | `profiles` | `DoctorDialog.tsx:19` | Existing |
| | Specialization | `doctors` | `DoctorDialog.tsx:20` | Existing |
| | License Number (PMDC) | `doctors` (currently `license_number`; migrate to `pmdc_number`) | `DoctorDialog.tsx:21` | Existing, may rename |
| | Experience (Years) | `doctors` | `DoctorDialog.tsx:22` | Existing |
| | Department | `profiles.department_id` | `DoctorDialog.tsx:23` | Existing |
| | **CNIC** | `patients` (for doctors who are also patients) | **Missing — add to dialog** | New field |
| | **Joining Date** | **Missing — add to `doctors`** | **Migration §5.3** | New field |
| | **Status (Active/Inactive)** | `profiles.is_active` | Already exists | Extend dialog to show/edit |
| **Consultation Settings** | Consultation Fee | `doctors.consultation_fee` | [`DoctorFeeManager.tsx`](../src/components/finance/DoctorFeeManager.tsx) | Existing |
| | Follow-up Fee | `doctors.follow_up_fee` | **Migration §5.3** | New field |
| | Emergency Fee | `doctors.emergency_fee` | **Migration §5.3** | New field |
| | Online Fee | `doctors.online_fee` | **Migration §5.3** | New field |
| **Scheduling** | Slot Duration (minutes) | `doctors.slot_duration_minutes` | **Migration §5.3** | New field |
| | Max Patients / Day | `doctors.max_patients_per_day` | **Migration §5.3** | New field |
| | Availability schedule | `doctor_availability` | [`DoctorScheduleDialog.tsx`](../src/components/dialogs/DoctorScheduleDialog.tsx), [`DoctorAvailabilityManager.tsx`](../src/components/DoctorAvailabilityManager.tsx) | Reuse existing |
| **Prescription Template** | Urdu Header Text | `doctor_templates.urdu_header_text` | **Migration §5.4** | New tab |
| | English Header Text | `doctor_templates.english_header_text` | | |
| | Doctor Description | `doctor_templates.doctor_description` | | |
| | Clinic Address | `doctor_templates.clinic_address` | | |
| | Clinic Phone | `doctor_templates.clinic_phone` | | |
| | Website | `doctor_templates.website` | | |
| | Email | `doctor_templates.email` | | |
| | Footer Text | `doctor_templates.footer_text` | | |
| | 8 toggles (token, fee, QR, barcode, appt#, follow-up, signature, stamp) | `doctor_templates.show_*` | | |
| | **Live preview** | rendered by `prescriptionSlipGenerator.ts` (§8) | | Renderer reused |

### 7.2 Where to add in the UI

The **DoctorDialog** is the create form. The **DoctorProfileSettings** is the edit/profile page. The breakdown:

**DoctorDialog.tsx** (create) — add these fields to the existing form:
- `pmdc_number` (rename or co-exist with `license_number`)
- `follow_up_fee`, `emergency_fee`, `online_fee` (grouped under a "Consultation Fees" section)
- `slot_duration_minutes`, `max_patients_per_day` (grouped under "Scheduling")
- The Prescription Template tab is **not needed at creation time** — it can be set up later in DoctorProfileSettings

**DoctorProfileSettings.tsx** (edit) — already has more space. Add:
- Three **tabs** or **sections**: Basic Info | Fees & Scheduling | Prescription Template
- The **Prescription Template** tab has all `doctor_templates` text fields + 8 toggles + a **live preview** that calls the production renderer from (§8)

### 7.3 Prescription Template tab layout

```
┌──────────────────────────────────────────────────────────┐
│  Prescription Template  (tab)                            │
│                                                          │
│  Urdu Header Text:  [________________________]           │
│  English Header Text:[________________________]          │
│  Doctor Description: [________________________]          │
│                                                          │
│  Clinic Address:     [________________________]          │
│  Clinic Phone:       [________________________]          │
│  Website:            [________________________]          │
│  Email:              [________________________]          │
│  Footer Text:        [NOT VALID FOR COURT______]         │
│                                                          │
│  Show: ☑ Token  ☑ Fee  ☑ QR  ☑ Barcode                 │
│        ☑ Appt#  ☑ Follow-up  ☑ Signature  ☑ Stamp       │
│                                                          │
│  [🗎 Save Template]  [👁 Preview Slip]                    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Live Preview (renders below using production    │    │
│  │  prescriptionSlipGenerator with sample data)     │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### 7.4 Runtime behavior

No doctor data may be hardcoded anywhere — the renderer reads exclusively from `doctors` + `doctor_templates` for the selected appointment's doctor. The preview uses the **same** `prescriptionSlipGenerator` as production, so "what you configure is what prints."

---

## 8. Prescription slip renderer (the core deliverable)

New util `src/utils/prescriptionSlipGenerator.ts` (sibling of [pathologyPdfGenerator.ts](../src/utils/pathologyPdfGenerator.ts), same jsPDF + `qrcode` patterns). A4 portrait, mm units.

**Inputs:** `{ template, doctor, patient, appointment, fee }` — all dynamic, fetched by `doctor_id`.

**Render order (letterhead drawn in code — no image references):**
1. **Letterhead, programmatic:** draw the hospital title (`SOUTH WEST HEALTH COMPLEX KOHAT` in red), the bundled SWHC logo, the doctor's name + degrees + specialization + credentials (left block), and the **Urdu header** (right block, using the bundled Nastaliq font) — all from `doctor` + `doctor_templates` text fields. Reproduce the exact layout/colors of the uploaded template in the renderer once; data is per-doctor.
2. **Token block** (if `show_token`): centered-top, large bold — `TOKEN NO` / `TK-015`.
3. **Patient info block:** Name, MR#, Appointment#, Token#, Age (from DOB), Gender, Date (Pakistan TZ), Doctor, Department, Consultation Type.
4. **Barcode** (Code128 of MR#) below patient details — via added lib (§11), rendered to dataURL → `addImage`.
5. **Clinical Record / RX area:** preserve template layout (Pelvic U/S, Uterus, Adnexa, POD labels) — left blank for handwriting **or** filled from structured prescription fields if digital entry is used.
6. **Fee block** (if `show_fee`): bottom-left, above footer — `Consultation Fee / Paid / Method / Status PAID / Cashier / Time`. **Informational only — not an invoice.**
7. **QR** (if `show_qr`): bottom-right, encodes `{patientName, mr, appointmentNumber, token, doctorName, date}`.
8. **Signature/stamp:** off by default (nothing attached) — doctor signs by hand after printing. Only drawn if a doctor later opts to store an image.
9. **Footer, programmatic:** draw the address line (`Address: Opposite Millinium Guest House, Pindi Raod Kohat  Mob: 0336-1974146`) and `footer_text` (`NOT VALID FOR COURT`) in code, from `doctor_templates` fields.

**Output:** open print preview in a new tab (mirror [prescriptionPdfGenerator.ts](../src/utils/prescriptionPdfGenerator.ts) blob+`window.open` flow). Optionally upload the blob to storage → `prescription_slips.pdf_url`.

> Keep a single renderer used by both the live template preview and production so "what you configure is what prints."

---

## 9. The BOOK APPOINTMENT pipeline

Reception clicks **BOOK APPOINTMENT** → one server transaction, then client renders the slip. **Do not auto-generate/print an invoice as the patient document.**

Recommended: a single `SECURITY DEFINER` RPC `book_appointment(...)` that does, atomically:
1. Upsert patient → generate **MR number** (trigger).
2. Insert appointment → generate **appointment_number** + **token_number**.
3. Set `consultation_fee_at_time`, `payment_status='paid'`, `consultation_type`.
4. Create the **internal invoice** row (reuse existing invoice flow / `invoice_number` convention — the current consultation-fee path in [InvoiceDialog.tsx](../src/components/dialogs/InvoiceDialog.tsx) generates `INV-{last 6 digits of Date.now()}`; consider a dedicated `CONS-INV-` prefix to distinguish consultation invoices) and set `invoice_generated_at`.
5. Write `audit_logs` (appointment created + fee received).
6. Return `{ patient, appointment, mr_number, appointment_number, token_number, fee }`.

Client then:
7. Loads the doctor's active `doctor_templates` row.
8. Calls `prescriptionSlipGenerator` → **opens print preview**.
9. Inserts `prescription_slips` (+ audit "slip generated").

Doing 1–5 in one RPC avoids partial-booking races and duplicate tokens. The fee stays in the existing finance system; the **slip** is the only thing shown/printed to the patient.

---

## 10. Dashboards, queue, audit

**Queue states:** waiting → called → in_consultation → completed / cancelled / missed. 

**Existing infrastructure:** `queue_positions` table already has a `status` column (`waiting | in_progress | completed | skipped`) — this can be used as the queue state machine without touching `appointment_status`.

**`appointment_status` enum** currently has values `scheduled | completed | cancelled | rescheduled`. For appointment-level state, keep the existing enum; for queue-level state, reuse `queue_positions.status` or extend `appointments` with a separate `queue_status` column (recommended — avoids migrating the enum and breaking existing enum values).

**Reception dashboard:** today's revenue, patients, appointments, current token, waiting/completed queues, pending payments, emergency queue. Reuse existing stats hooks (`useRealStatsData`, `useFinancialAnalytics`).

**Doctor dashboard:** today's appointments, current/waiting/completed/missed tokens, emergency patients; buttons Call Next / Recall / Skip / Mark Complete / Print Slip / Reprint Slip (Reprint increments `prescription_slips.print_count` + audit).

**Audit events to log** (via `audit_logs`): appointment created, fee received, slip generated, slip printed, slip reprinted, PDF downloaded — each with user_id, created_at, ip_address, machine_name.

---

## 11. New dependencies & bundled assets

- **Barcode:** add `bwip-js` (recommended, Code128, renders to canvas/dataURL) **or** `jsbarcode` + `canvas`. Needed for the MR barcode in §8.
- **Urdu font (bundled, not a dependency):** add an Urdu Nastaliq TTF (e.g. *Noto Nastaliq Urdu*, OFL-licensed) under `src/assets/fonts/` and register it with `jsPDF.addFileToVFS` + `addFont`. Required to draw the Urdu header in code (Decision C). **Note: `src/assets/` directory does not currently exist** — create it.
- **Hospital logo (bundled):** the SWHC heart mark as a one-time base64/SVG asset under `src/assets/`, drawn by the renderer. Not a per-doctor upload. **Note: no SWHC logo currently exists in the repo** — must be created.
- Everything else (`jspdf`, `qrcode`) is already installed.

---

## 12. Print / share options

Print Slip, Download PDF, Reprint Slip, Save to Patient Record (`prescription_slips`), Preview PDF — all client-side from the generated blob. WhatsApp/Email share = stretch goals (need a backend/edge function or `mailto:`/`wa.me` deep links with an uploaded `pdf_url`).

---

## 13. Phased delivery checklist

**Phase 0 — Decisions (§4).** Lock A (patient model). **C resolved → programmatic, no references. E resolved → no storage bucket.** *No code.*

**Phase 1 — Schema & numbering.**
- [ ] Migration: extend `patients` (walk-in cols) + MR trigger.
- [ ] Migration: extend `doctors` (assets, fees, pmdc, dept, scheduling).
- [ ] Migration: `doctor_templates` table + RLS + unique active index.
- [ ] Migration: extend `appointments` (token/appt#/dept/type).
- [ ] Migration: `prescription_slips` table + RLS.
- [ ] Migration: numbering functions (MR/appt/token) + `counters` table.
- [ ] Migration: `audit_logs.machine_name`.
- [ ] ~~Storage bucket~~ — **not needed** (no attached references, Decision C).
- [ ] Regenerate `src/integrations/supabase/types.ts`.

**Phase 2 — Doctor template management.**
- [ ] Text-only Prescription Template tab in doctor dialog (credentials + Urdu/English header + address/phones + footer + toggles). **No uploads.**
- [ ] Live slip preview using the production renderer.

**Phase 3 — Slip renderer.**
- [ ] Add barcode lib; bundle Urdu Nastaliq font + hospital logo in `src/assets/`.
- [ ] `prescriptionSlipGenerator.ts` — **programmatic letterhead** (code-drawn header/footer, Urdu via bundled font), all dynamic fields, QR, barcode, fee block, toggles.
- [ ] Pixel-match against the uploaded template.

**Phase 4 — Reception booking pipeline.**
- [ ] `book_appointment` RPC (atomic: patient+MR, appt+appt#+token, fee, internal invoice, audit).
- [ ] Reception booking form (register patient, doctor, type, fee, payment method).
- [ ] On submit → RPC → load template → render slip → print preview → save `prescription_slips`.

**Phase 5 — Dashboards & queue.**
- [ ] Reception dashboard widgets.
- [ ] Doctor dashboard + queue controls + Print/Reprint.

**Phase 6 — Audit & sharing.**
- [ ] Wire all audit events.
- [ ] Download/Reprint/Save-to-record; (stretch) WhatsApp/Email.

**Phase 7 — Verify.**
- [ ] End-to-end: book → token → fee → slip prints, identical to template, fully dynamic per doctor, **no invoice shown to patient**, invoice present internally in finance.
- [ ] Concurrency test: two simultaneous bookings → no duplicate tokens.

---

## 14. Hard rules (from the spec)

1. The patient-facing printed document is the **Prescription Slip** — never the invoice.
2. Invoices remain **internal** (finance/accounting/audit) and are **not auto-printed**.
3. **Zero hardcoded doctor data** — header/footer/logo/signature/stamp/credentials all come from `doctors` + `doctor_templates` for the appointment's doctor.
4. The slip must be **visually identical** to the uploaded template; only dynamic data is injected.
5. Token is **prominent, centered-top, large/bold**, daily-reset per doctor.

---

## 15. Open questions for the user

1. **Patient model (Decision A):** OK to add walk-in columns to `patients` and make the profile link optional? (Recommended.)
2. Is `license_number` the PMDC number, or add a separate `pmdc_number`? (Currently `license_number` is the only credential field.)
3. What is the exact `invoice_number` prefix used for **consultation** fees today (so the booking RPC reuses it)? **Answer from codebase:** `INV-{last 6 digits of Date.now()}` in [InvoiceDialog.tsx line 31](../src/components/dialogs/InvoiceDialog.tsx). Pathology uses `PATH-INV-`. Consider a dedicated `CONS-INV-` prefix for consultation invoices to distinguish them.
4. Will doctors type structured clinical fields digitally, or is the RX/clinical area always handwritten after printing?

> **Resolved (Decision C):** ~~template fidelity via image files~~ and ~~storage bucket~~ — **no references will be attached; the letterhead is drawn 100% in code** from text fields + a bundled Urdu font + bundled logo.
