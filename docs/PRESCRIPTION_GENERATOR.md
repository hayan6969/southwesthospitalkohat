# Prescription Generator

## Overview

The system has **two distinct prescription PDF generators** serving different purposes:

| Generator | File | Purpose | Page Size |
|---|---|---|---|
| **Clinical Prescription** | `src/utils/prescriptionPdfGenerator.ts` | Doctor's written prescription for the patient's medical record | A4 |
| **Prescription Slip** | `src/utils/prescriptionSlipGenerator.ts` | Reception counter slip with token, fee, and doctor letterhead | A5 |

---

## 1. Clinical Prescription (`prescriptionPdfGenerator.ts`)

### Interface

```typescript
interface PrescriptionData {
  prescriptionText: string;
  patientName: string;
  patientId: string;
  appointmentDate: string;
  doctorName: string;
}
```

### Output

- A4 portrait PDF
- Content starts at 1/3 page height (leaves space for hospital letterhead when printed on pre-stamped paper)
- Shows: patient name, patient ID, appointment date, "PRESCRIPTION" title, then the prescription text wrapped to page width
- Opens in a new browser tab
- Filename: `prescription_{patientName}_{appointmentDate}.pdf`

### Flow

```
DoctorSchedule.tsx / DashboardDoctor.tsx
  └─> PrescriptionDialog (Write Prescription)
       └─> handleSaveAndPrint()
            ├─> Saves/updates prescription_text in `prescriptions` table
            └─> Calls generatePrescriptionPDF()
                 └─> Opens PDF in new tab
```

**Key file:** `src/components/dialogs/PrescriptionDialog.tsx`

### Database Table: `prescriptions`

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | Auto-generated |
| `appointment_id` | UUID NOT NULL | Links to appointment |
| `patient_id` | UUID NOT NULL | Links to patient |
| `doctor_id` | UUID NOT NULL | Links to doctor |
| `prescription_text` | TEXT NOT NULL | Free-text prescription content |
| `created_at` | TIMESTAMPTZ | Default now() |
| `updated_at` | TIMESTAMPTZ | Default now() |

---

## 2. Prescription Slip (`prescriptionSlipGenerator.ts`)

### Interface

```typescript
interface PrescriptionSlipData {
  patientName: string;
  patientNumber: string;
  patientAge?: string | number | null;
  doctorName: string;
  doctorId?: string | null;
  doctorSpecialization?: string | null;
  licenseNumber?: string | null;
  appointmentDate: string;
  appointmentType?: string;
  consultationFee: number;
  bookingType?: string;
  tokenNumber?: string | null;
  template?: DoctorPrescriptionTemplate | null;  // JSONB from doctors table
}
```

### Doctor Template (`doctors.prescription_template` JSONB)

```jsonc
{
  "title_prefix": "Prof. Dr.",
  "degrees": "MBBS, FCPS, CHPE, CHR",
  "credentials": ["Credential line 1", "Credential line 2"],
  "urdu_name": "پروفیسر ڈاکٹر مسرت جبین",
  "urdu_lines": ["اردو لائن 1", "اردو لائن 2"],
  "pa_phone": "0336-1974146",
  "footer_text": "NOT VALID FOR COURT",
  "show_token": true,      // Show/hide token number
  "show_fee": true,         // Show/hide consultation fee
  "show_qr": true           // Show/hide QR code
}
```

### Output

- A5 portrait PDF (148 × 210 mm)
- Top section: Hospital logo + name + contact info (from `hospital_settings`)
- Doctor letterhead: name with prefix, degrees, credentials, Urdu name + lines (rendered via canvas for Arabic shaping support), PA phone
- Patient details: name, number, age
- Appointment: date/time (formatted in Pakistan timezone), doctor specialization, license number
- Token number (if template.show_token)
- Consultation fee formatted as PKR (if template.show_fee)
- QR code (if template.show_qr)
- Footer: template.footer_text
- Opens in new browser tab
- Filename: `prescription_{patientName}.pdf`

### Urdu Rendering

Urdu text is rendered on an off-screen HTML canvas (browser handles Arabic glyph shaping), then stamped onto the PDF as a PNG image. This avoids jsPDF's poor RTL text support.

### Flows

**Flow A — Staff Counter (invoice + slip):**
```
StaffCounter.tsx
  └─> handleGenerateInvoice(appointment)
       ├─> Fetches doctor: consultation_fee, license_number, prescription_template
       ├─> Fetches patient profile + age calculation
       ├─> Creates/updates invoice
       ├─> Fetches queue_position → tokenNumber ("TK-XXX")
       └─> Calls generatePrescriptionSlipPDF()
```

**Flow B — Appointment Booking (slip only):**
```
EnhancedAppointmentDialog.tsx
  └─> handleSubmit()
       ├─> Creates appointment + invoice
       ├─> Fetches queue_position → tokenNumber
       ├─> Fetches doctor's template + license + specialization
       └─> Calls generatePrescriptionSlipPDF()
```

---

## 3. Viewing Saved Prescriptions

```
PatientDetailDialog
  └─> usePatientPrescriptions(patientId)      [src/hooks/useDoctorData.ts:389]
       └─> Queries `prescriptions` table, joins doctor names,
            filters by role (doctor sees own, admin sees all)
  └─> PrescriptionDetailDialog
       └─> Displays doctor name, date, full prescription_text
```

---

## 4. Printing Architecture

```
┌──────────────────────────────────────────────────┐
│                   COMPONENTS                      │
├──────────────────────────────────────────────────┤
│  PrescriptionDialog         StaffCounter          │
│  (Doctor writes RX)   (Counter invoice + slip)    │
│  EnhancedAppointmentDialog                        │
│  (Booking slip)                                   │
├──────────┬───────────────────────┬────────────────┤
│          │                       │                │
│          ▼                       ▼                │
│  ┌──────────────┐    ┌──────────────────┐         │
│  │prescription- │    │prescriptionSlip- │         │
│  │PdfGenerator  │    │Generator         │         │
│  │ (A4)         │    │ (A5)             │         │
│  └──────────────┘    └──────────────────┘         │
│          │                       │                │
│          ▼                       ▼                │
│    jsPDF → Blob → window.open()                   │
└──────────────────────────────────────────────────┘
```

---

## 5. Key Dependencies

| Library | Used For |
|---|---|
| `jspdf` | PDF generation (both generators) |
| `qrcode` | QR code rendering on prescription slip |
| `date-fns` / `date-fns-tz` | Date formatting in Pakistan timezone |
| Supabase JS client | Fetching doctor template, patient data, queue position |

---

## 6. Relevant Migration Files

| File | Purpose |
|---|---|
| `20260312140120_*.sql` | Original `prescriptions` table |
| `20250730134329_*.sql` | `prescriptions` table with RLS policies |
| `20260624130000_doctor_prescription_template.sql` | Adds `prescription_template` JSONB column to `doctors` |
| `20260624200000_prescription_system.sql` | Extended schema: patients, visits, medicines |

---

## 7. Environment / Configuration

- All PDF generators fetch `hospital_settings` for logo, name, and contact info
- Doctor templates are configured per-doctor via `DoctorProfileSettings.tsx:647`
- Token numbering uses `queue_positions` table (per-doctor, daily reset)
- Consultation fee is set per-doctor in `doctors.consultation_fee`
