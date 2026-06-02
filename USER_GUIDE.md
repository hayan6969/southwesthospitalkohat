# Southwest Hospital Kohat — HIMS User Guide

> Hospital Information Management System — URL, Button & Process Flow Reference

---

## Table of Contents

1. [Getting Started — Login & Roles](#1-getting-started--login--roles)
2. [Complete URL Route Map](#2-complete-url-route-map)
3. [Sidebar Navigation by Role (Exact URLs)](#3-sidebar-navigation-by-role-exact-urls)
4. [Admin Dashboard Nav (Header Quick-Switch)](#4-admin-dashboard-nav-header-quick-switch)
5. [Global Button & Dialog Map](#5-global-button--dialog-map)
6. [System Overview — Module Connection Flow](#6-system-overview--module-connection-flow)
7. [Patient Dashboard](#7-patient-dashboard)
8. [Staff / Reception Dashboard](#8-staff--reception-dashboard)
9. [Doctor Dashboard](#9-doctor-dashboard)
10. [Pharmacy Dashboard](#10-pharmacy-dashboard)
11. [Lab Dashboard](#11-lab-dashboard)
12. [OTA / OT Assistant Dashboard](#12-ota--ot-assistant-dashboard)
13. [IPD Dashboard](#13-ipd-dashboard)
14. [Store / Inventory Dashboard](#14-store--inventory-dashboard)
15. [Finance Dashboard](#15-finance-dashboard)
16. [Admin Dashboard](#16-admin-dashboard)
17. [Complete Business Flow — A Patient's Journey](#17-complete-business-flow--a-patients-journey)
18. [Process Flow Diagrams](#18-process-flow-diagrams)

---

## 1. Getting Started — Login & Roles

### Accessing the System
Open the hospital URL in any modern browser (Chrome, Edge, Firefox).

### Login Page
- **URL:** `/auth`
- **Staff login:** Email + Password
- **Patient login:** Phone Number + CNIC (or register new account)

### Public Pages (No Login Required)
| Page | URL | Purpose |
|------|-----|---------|
| Login | `/auth` | Authentication |
| Offline Mode | `/offline-mode` | Offline fallback |
| Pharmacy Offline | `/offline-mode-pharmacy` | Pharmacy offline POS |
| Verify Report | `/verify-report/:reportNumber` | Verify a lab report by number |
| 404 | `*` | Not found page |

### User Roles & Dashboards
| Role | Landing URL | Dashboard |
|------|-------------|-----------|
| Admin | `/dashboard/admin` | Admin Dashboard |
| Doctor | `/dashboard/doctor` | Doctor Dashboard |
| Staff (Reception) | `/dashboard/staff` | Staff Dashboard |
| Patient | `/dashboard/patient` | Patient Portal |
| Head Pharmacist | `/dashboard/pharmacy` | Pharmacy Dashboard |
| Assistant Pharmacist | `/dashboard/pharmacy` | Pharmacy Dashboard |
| Salesman Pharmacist | `/dashboard/pharmacy` | Pharmacy Dashboard |
| Lab Technician | `/dashboard/lab` | Lab Dashboard |
| OT Assistant (OTA) | `/dashboard/ota` | OTA Dashboard |
| Nursing | `/dashboard/ota` | OTA Dashboard (redirect) |
| IPD Staff | `/dashboard/ipd` | IPD Dashboard |
| Store Manager | `/dashboard/store` | Store Dashboard |
| Inventory Manager | `/dashboard/store` | Store Dashboard (redirect) |
| Finance | `/dashboard/finance` | Finance Dashboard |

### Role Redirects (Legacy → Consolidated)
| Old URL | Redirects To |
|---------|-------------|
| `/dashboard/head_pharmacist` | `/dashboard/pharmacy` |
| `/dashboard/assistant_pharmacist` | `/dashboard/pharmacy` |
| `/dashboard/salesman_pharmacist` | `/dashboard/pharmacy` |
| `/dashboard/nursing` | `/dashboard/ota` |
| `/dashboard/inventory_manager` | `/dashboard/store` |

---

## 2. Complete URL Route Map

### Patient Routes
| URL | Component |
|-----|-----------|
| `/dashboard/patient` | DashboardPatient (Overview tab) |
| `/dashboard/patient/appointments` | PatientAppointments |
| `/dashboard/patient/records` | PatientRecords |
| `/dashboard/patient/invoices` | PatientInvoices |
| `/dashboard/patient/labs` | PatientLabs |
| `/dashboard/patient/ipd` | PatientIPD |

### Doctor Routes
| URL | Component |
|-----|-----------|
| `/dashboard/doctor` | DashboardDoctor (Overview tab) |
| `/dashboard/doctor/schedule` | DoctorSchedule |
| `/dashboard/doctor/patients` | DoctorPatients |
| `/dashboard/doctor/notes` | DoctorNotes |

### Staff Routes
| URL | Component |
|-----|-----------|
| `/dashboard/staff` | DashboardStaff (Counter tab) |
| `/dashboard/staff/patients` | StaffPatients |
| `/dashboard/staff/appointments` | StaffAppointments |
| `/dashboard/staff/invoices` | StaffInvoices |
| `/dashboard/staff/labs` | StaffLabs |

### Admin Routes
| URL | Component |
|-----|-----------|
| `/dashboard/admin` | DashboardAdmin (Overview tab) |
| `/dashboard/admin/departments` | AdminDepartments |
| `/dashboard/admin/staff` | AdminStaff |
| `/dashboard/admin/doctors` | AdminDoctors |
| `/dashboard/admin/audit-logs` | AdminAuditLogs |
| `/dashboard/admin/settings` | AdminSettings |
| `/dashboard/admin/regions` | AdminRegions |
| `/dashboard/admin/ipd` | AdminIPD |

### Pharmacy Routes
| URL | Component |
|-----|-----------|
| `/dashboard/pharmacy` | DashboardPharmacy (Overview tab) |
| `/dashboard/pharmacy/medicines` | PharmacyMedicines |
| `/dashboard/pharmacy/sell` | PharmacySell |
| `/dashboard/pharmacy/invoices` | PharmacyInvoices |
| `/dashboard/pharmacy/returns` | PharmacyReturns |
| `/dashboard/pharmacy/stock` | PharmacyStock |
| `/dashboard/pharmacy/expiry` | PharmacyExpiry |
| `/dashboard/pharmacy/analytics` | PharmacyAnalytics |
| `/dashboard/pharmacy/lab-reports` | PharmacyLabReports |
| `/dashboard/pharmacy/stickers` | PharmacyStickers |

### Finance Routes (Nested under FinanceLayout)
| URL | Component |
|-----|-----------|
| `/dashboard/finance` | DashboardFinance |
| `/dashboard/finance/daily` | FinanceDaily |
| `/dashboard/finance/income` | FinanceIncome |
| `/dashboard/finance/analytics` | FinanceAnalytics |
| `/dashboard/finance/expenses` | FinanceExpenses |
| `/dashboard/finance/payroll` | FinancePayroll |
| `/dashboard/finance/doctor-payments` | FinanceDoctorPayments |
| `/dashboard/finance/staff-payments` | FinanceStaffPayments |
| `/dashboard/finance/pharmacy` | FinancePharmacy |
| `/dashboard/finance/refunds` | FinanceRefunds |
| `/dashboard/finance/invoices` | FinanceInvoices |
| `/dashboard/finance/discounts` | FinanceDiscounts |
| `/dashboard/finance/ipd` | FinanceIPD |
| `/dashboard/finance/ipd-doctor-payments` | FinanceIPDDoctorPayments |

### Other Dashboards (Tab-based, single URL)
| URL | Dashboard | Tabs |
|-----|-----------|------|
| `/dashboard/ota` | DashboardOTA | ot-operations, lab-reports, supplies |
| `/dashboard/ipd` | DashboardIpd | (internal IPDAdminPanel) |
| `/dashboard/store` | DashboardStore | requests, general, lab, provide, distribution |
| `/dashboard/lab` | DashboardLab | pathology, pathology-history, manage-tests, inventory, ipd, supplies |

---

## 3. Sidebar Navigation by Role (Exact URLs)

### Patient Sidebar
| Label | URL |
|-------|-----|
| Dashboard | `/dashboard/patient` |
| Book Appointments | `/dashboard/patient/book` (opens booking tab) |
| My Appointments | `/dashboard/patient/appointments` |
| Medical Records | `/dashboard/patient/records` |
| Lab Reports | `/dashboard/patient/labs` |
| Upload Documents | `/dashboard/patient/documents` |
| Analytics | `/dashboard/patient/analytics` |

### Doctor Sidebar
| Label | URL |
|-------|-----|
| Dashboard | `/dashboard/doctor` |
| Appointments | `/dashboard/doctor/appointments` (opens schedule tab) |
| Patient History | `/dashboard/doctor/patients` |
| Diagnoses & Prescriptions | `/dashboard/doctor/diagnoses` (opens diagnoses tab) |
| Patient Notes | `/dashboard/doctor/notes` |
| Lab Reports | `/dashboard/doctor/labs` (opens lab tab) |
| Analytics | `/dashboard/doctor/analytics` |

### Staff Sidebar
| Label | URL |
|-------|-----|
| Dashboard | `/dashboard/staff` |
| Counter | `/dashboard/staff/counter` |
| Lab | `/dashboard/staff/lab` |
| OT | `/dashboard/staff/ot` |

### OTA Sidebar
| Label | URL |
|-------|-----|
| Dashboard | `/dashboard/ota` |
| OT Operations | `/dashboard/ota/operations` |

### Admin Sidebar
| Label | URL |
|-------|-----|
| Dashboard | `/dashboard/admin` |
| Departments | `/dashboard/admin/departments` |
| Account Management | `/dashboard/admin/accounts` (opens accounts tab) |
| Lab | `/dashboard/admin?tab=lab` (switch to lab tab) |
| IPD | `/dashboard/ipd` |
| System Settings | `/dashboard/admin/settings` |

### Pharmacy Sidebar
| Label | URL |
|-------|-----|
| Dashboard | `/dashboard/pharmacy` |
| IPD Orders | `/dashboard/pharmacy?tab=ipd` (switch to IPD orders tab) |
| Medicines | `/dashboard/pharmacy/medicines` |
| Sell Medicine | `/dashboard/pharmacy/sell` |
| Invoices | `/dashboard/pharmacy/invoices` |
| Returns | `/dashboard/pharmacy/returns` |
| Stock Tracking | `/dashboard/pharmacy/stock` |
| Expiry Tracker | `/dashboard/pharmacy/expiry` |
| Lab Reports | `/dashboard/pharmacy/lab-reports` |
| Sticker Printer | `/dashboard/pharmacy/stickers` |
| Analytics | `/dashboard/pharmacy/analytics` |

### Finance Sidebar
| Label | URL |
|-------|-----|
| Dashboard | `/dashboard/finance` |
| Income & Transactions | `/dashboard/finance/income` |
| Analytics | `/dashboard/finance/analytics` |
| Expenses | `/dashboard/finance/expenses` |
| Payroll | `/dashboard/finance/payroll` |

### Store / Inventory Manager Sidebar
| Label | URL |
|-------|-----|
| Dashboard | `/dashboard/store` |
| Applications | `/dashboard/store?tab=requests` |
| General Stock | `/dashboard/store?tab=general` |
| Lab Stock | `/dashboard/store?tab=lab` |
| Store / Provide | `/dashboard/store?tab=provide` |
| Distribution | `/dashboard/store?tab=distribution` |

### Lab Sidebar
| Label | URL |
|-------|-----|
| Dashboard | `/dashboard/lab` |
| Lab | `/dashboard/lab?tab=pathology` |
| Lab History | `/dashboard/lab?tab=pathology-history` |
| Manage Tests | `/dashboard/lab?tab=manage-tests` |
| Lab Item Supply | `/dashboard/lab?tab=inventory` |
| Request Supplies | `/dashboard/lab?tab=supplies` |

### IPD Sidebar
| Label | URL |
|-------|-----|
| Dashboard | `/dashboard/ipd` |

---

## 4. Admin Dashboard Nav (Header Quick-Switch)

Shown to admin users in the header of every page:

| Button Label | Navigates To |
|-------------|-------------|
| **Admin** | `/dashboard/admin` |
| **Departments** | `/dashboard/admin/departments` |
| **IPD** | `/dashboard/admin/ipd` |
| **Finance** | `/dashboard/finance` |
| **Pharmacy** | `/dashboard/pharmacy` |
| **Staff** | `/dashboard/staff` |
| **OT** | `/dashboard/ota` |
| **Manager** | `/dashboard/store` |
| **Store** | `/dashboard/store?tab=provide` |

---

## 5. Global Button & Dialog Map

### Core Action Buttons (Multiple Dashboards)

| Button Label | Dashboard(s) | What It Does |
|-------------|-------------|-------------|
| **+ New Appointment** | Staff Counter | Opens `EnhancedAppointmentDialog` → books appointment + optionally generates invoice |
| **Register New Patient** | Staff Counter | Opens `PatientDialog` → creates patient record |
| **Create Invoice** | Staff Counter | Opens `InvoiceDialog` → manual invoice creation |
| **Emergency Consultation** | Staff Counter | Opens `EmergencyConsultationDialog` → emergency billing (EMG-prefixed) |
| **Mark as Free** | Staff Counter, Doctor Schedule | Opens `CheckFreeDialog` or AlertDialog → sets fee to 0 |
| **Generate Invoice** | Staff Counter (row action) | Creates invoice PDF for appointment |
| **Reprint Invoice** | Staff Counter (row action) | Regenerates PDF for existing invoice |
| **Schedule OT** | Staff OT | Opens `OTScheduleDialog` → schedule operation |
| **Invoice** | Staff OT (row action) | Generates OT invoice PDF |
| **View PDF** | Staff Invoices (row action) | Opens/downloads invoice PDF (type-dependent) |
| **Stop Appointments** | Doctor Dashboard header | Toggles appointment acceptance off |
| **Set Availability** | Doctor Dashboard header | Opens `DoctorAvailabilityManager` |
| **Complete** | Doctor Schedule (row action) | Marks appointment as completed |
| **Cancel** | Doctor Schedule (row action) | Cancels appointment + related invoices |
| **Mark Free** | Doctor Schedule (row action) | Sets consultation fee to PKR 0 |
| **Prescription** | Doctor Schedule (row action) | Opens `PrescriptionDialog` → write prescription |
| **Offline Mode** | Pharmacy Dashboard header | Redirects to `/offline-mode-pharmacy` |
| **Export CSV** | Finance Dashboard | Downloads daily closing CSV |
| **+ Account** | Admin → Accounts tab | Opens `AccountManagementDialog` → create user |
| **Edit** | Admin → Accounts tab (row) | Opens `EditUserDialog` → edit user |
| **Block / Unblock** | Admin → Accounts tab (row) | Toggles user active/inactive |
| **Delete** | Admin → Accounts tab (row) | Permanently deletes user (with confirmation) |
| **View Details** | Admin → Logs tab (row) | Opens `AuditLogDetailDialog` |

### OT Operation Workflow Buttons (OTA Dashboard)

| Button | Dialog | Step |
|--------|--------|------|
| **Pre-Op** | `PreOperationOrdersDialog` | 1 — Pre-operative orders |
| **OT Notes** | `OTNotesDialog` | 2 — Surgery documentation (nurses: read-only) |
| **Treatment** | `TreatmentChartDialog` | 3 — Post-op treatment chart |
| **Assessment** | `AssessmentDialog` | 4 — Nursing assessment |
| **POPPR** | `PostOperativeProgressDialog` | 5 — Post-operative progress report |
| **Discharge Slip** | `DischargeSlipDialog` | Final — Print discharge (only when completed) |

### Finance Layout Tab Navigation

| Tab Label | URL |
|-----------|-----|
| Dashboard | `/dashboard/finance` |
| Daily | `/dashboard/finance/daily` |
| Income | `/dashboard/finance/income` |
| Analytics | `/dashboard/finance/analytics` |
| Expenses | `/dashboard/finance/expenses` |
| Payroll | `/dashboard/finance/payroll` |
| Dr. Payments | `/dashboard/finance/doctor-payments` |
| Staff Shifts | `/dashboard/finance/staff-payments` |
| Pharmacy | `/dashboard/finance/pharmacy` |
| Refunds | `/dashboard/finance/refunds` |
| Invoices | `/dashboard/finance/invoices` |
| Discounts | `/dashboard/finance/discounts` |
| IPD Finance | `/dashboard/finance/ipd` |
| IPD Dr Payments | `/dashboard/finance/ipd-doctor-payments` |

---

## 6. System Overview — Module Connection Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PATIENT JOURNEY                              │
│                                                                     │
│  Registration ──► Appointment ──► Consultation ──► Follow-up        │
│  (Staff)          (Staff/Patient)    (Doctor)       (Any)           │
└───────┬─────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────────┐
│  DOCTOR DECISIONS                                                    │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │Refer to  │  │Refer to  │  │Prescribe │  │Admit to  │             │
│  │Lab       │  │OT/Surgery│  │Medicines │  │IPD       │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       │              │              │              │                 │
│       ▼              ▼              ▼              ▼                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │Lab Tech  │  │OTA       │  │Pharmacist│  │IPD Staff │             │
│  │creates   │  │schedules │  │dispenses │  │assigns   │             │
│  │report    │  │surgery   │  │medicines │  │bed       │             │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘             │
└──────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────────┐
│  ALL INVOICES & TRANSACTIONS ──► FINANCE DASHBOARD                   │
│  ALL SUPPLY REQUESTS ──► STORE / INVENTORY DASHBOARD                 │
│  ALL SYSTEM ACTIVITY ──► ADMIN AUDIT LOGS                            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 7. Patient Dashboard

- **URL:** `/dashboard/patient`
- **Layout:** PatientLayout (no sidebar, simple header)
- **Who uses it:** Patients

### Tabs (Horizontal bar — no URL change)

| Tab | Tab Value | Content |
|-----|-----------|---------|
| Overview | `overview` | Stats cards, hospital timing, upcoming appointments, recent invoices |
| Book Appointment | `book-appointment` | `AppointmentBooking` component — select doctor, date, time |
| My Appointments | `my-appointments` | `MyAppointments` component — view appointments |
| Records | `records` | Medical records + upload documents |
| Lab Reports | `labs` | View/download lab report PDFs |
| Invoices | `invoices` | View/download all invoices |
| OT | `ot` | OT history + download discharge slips |
| IPD | `ipd` | IPD treatment records |
| Supplies | `supplies` | Request medical supplies |
| Settings | `settings` | Update profile, password |

### Buttons & Actions

| Button/Link | Action |
|-------------|--------|
| **Book Appointment** (in booking form) | Creates appointment → visible to staff/doctor |
| **Download** (on invoice row) | Downloads invoice PDF |
| **View Report** (on lab row) | Opens lab report PDF |
| **Download Discharge Slip** | Downloads OT/IPD discharge slip PDF |
| **Upload Document** | File upload → saved to medical records |

### Flow
```
Login (/auth) ──► /dashboard/patient (Overview)
    ├── Book Appointment ──► Form submit ──► Appointment created
    ├── My Appointments ──► View status (Upcoming/Completed/Cancelled)
    ├── Records ──► View doctor's notes + Upload documents
    ├── Lab Reports ──► Download PDF reports
    ├── Invoices ──► Download PDF invoices
    └── Settings ──► Update profile
```

---

## 8. Staff / Reception Dashboard

- **URL:** `/dashboard/staff`
- **Layout:** AppLayout with Staff sidebar
- **Who uses it:** Receptionists, front desk staff

### Tabs (Horizontal bar — no URL change)

| Tab | Content Component | Purpose |
|-----|-------------------|---------|
| Counter | `StaffCounter` + `StaffRevenueBreakdown` | Billing hub |
| Lab | `StaffPathologyBilling` / `PathologyReportHistory` | Lab billing & reports |
| X-Ray | `StaffXray` | X-ray billing |
| OT | `StaffOT` | OT schedule & billing |
| Invoices | `StaffInvoices` | View/manage all invoices |
| IPD | `StaffIPDRegister` | IPD admission registration |
| Shift Closing | `StaffShiftClosing` | End-of-day cash close |
| Supplies | `MySupplyRequests` | Request supplies |

### Counter Tab — Full Button Map

| Button | Dialog/Action | What Happens |
|--------|--------------|-------------|
| **+ New Appointment** | `EnhancedAppointmentDialog` | Search patient → select doctor → date/time → optional invoice generation |
| **Register Patient** | `PatientDialog` | Create new patient record (name, phone, CNIC, address) |
| **Create Invoice** | `InvoiceDialog` | Manual invoice (type: consultation/lab/xray/OT) |
| **Emergency** | `EmergencyConsultationDialog` | Emergency billing → `EMG-XXX` invoice → hospital revenue |
| **Check Free** | `CheckFreeDialog` | Enter invoice number → mark as free consultation |
| **Generate Invoice** (row action) | Creates + downloads invoice PDF | Appointment payment processing |
| **Reprint Invoice** (row action) | Regenerates PDF | Re-print existing appointment invoice |
| Click doctor card | `DoctorScheduleDialog` | View doctor's full schedule |

### Sidebar Links
| Sidebar Item | URL | What Opens |
|-------------|-----|-----------|
| Dashboard | `/dashboard/staff` | Counter tab |
| Counter | `/dashboard/staff/counter` | Counter tab (same as dashboard) |
| Lab | `/dashboard/staff/lab` | Lab (Pathology Billing) tab |
| OT | `/dashboard/staff/ot` | OT tab |

### Key Process: Patient Visit
```
Patient arrives
    │
    ▼
[Register Patient] button ──► PatientDialog ──► Create record
    │
    ▼
[+ New Appointment] button ──► EnhancedAppointmentDialog
    ├── Select patient
    ├── Select doctor + date/time
    └── Optionally generate invoice → PDF
    │
    ▼
Patient directed to doctor
    │
    ▼
After consultation (if follow-up needed):
[Create Invoice] ──► InvoiceDialog ──► Lab/Xray/OT bill
    OR
[Generate Invoice] (row action) ──► Appointment invoice
```

### Key Process: IPD Registration
```
[IPD tab] ──► StaffIPDRegister
    │
    ▼
Select patient → [Create IPD Admission Request] button
    │
    ▼
ReferToIPDDialog ──► Creates "pending" admission
    │
    ▼
IPD staff assigns bed via IPD Dashboard
```

### Key Process: Shift Closing
```
[Shift Closing tab] ──► StaffShiftClosing
    │
    ▼
View today's total collections
    │
    ▼
Enter closing balance
    │
    ▼
Closing report saved → visible in Finance Dashboard
```

---

## 9. Doctor Dashboard

- **URL:** `/dashboard/doctor`
- **Layout:** AppLayout with Doctor sidebar
- **Who uses it:** Doctors, Admin

### Header Buttons

| Button | Action |
|--------|--------|
| **Stop Appointments** | `StopAppointmentsButton` — toggles accepting new appointments off |
| **Set Availability** | `DoctorAvailabilityManager` — manage available days/times |

### Tabs (Horizontal bar — no URL change)

| Tab | Content | Purpose |
|-----|---------|---------|
| Overview | Stats cards + Today's Schedule table + Recent Records table | Home view |
| Appointments | `DoctorSchedule` | Full appointment management |
| Patients | `DoctorPatients` | Browse patient history |
| Diagnoses | Medical Records table (inline) | Write diagnoses & prescriptions |
| OT | `DoctorOT` | View OT operations for your patients |
| IPD | `DoctorIPD` | View admitted IPD patients |
| Notes | `DoctorNotes` | Write/detailed medical notes |
| Settings | `DoctorProfileSettings` | Profile, avatar, consultation rate |
| Analytics | `DoctorAnalytics` | Stats, earnings, patient trends |
| Supplies | `MySupplyRequests` | Request supplies |
| Availability | `DoctorAvailabilityManager` | Manage availability |

### Sidebar Links
| Sidebar Item | URL | What Opens |
|-------------|-----|-----------|
| Dashboard | `/dashboard/doctor` | Overview tab |
| Appointments | `/dashboard/doctor/appointments` | Appointments (Schedule) tab |
| Patient History | `/dashboard/doctor/patients` | Patients tab |
| Diagnoses & Prescriptions | `/dashboard/doctor/diagnoses` | Diagnoses tab |
| Patient Notes | `/dashboard/doctor/notes` | Notes tab |
| Lab Reports | `/dashboard/doctor/labs` | Diagnoses tab (lab section) |
| Analytics | `/dashboard/doctor/analytics` | Analytics tab |

### Doctor Schedule — Button Map

`DoctorSchedule` is the core appointment action page:

| Button (per row) | Action |
|-----------------|--------|
| **Complete** | `handleStatusUpdate(id, 'completed')` — marks done, sets payment timer |
| **Cancel** | `handleCancelAppointment(id)` — cancels + related invoices |
| **Mark Free** | AlertDialog confirmation → sets fee to PKR 0, marks "Completed (Free)" |
| **Prescription** | Opens `PrescriptionDialog` — write diagnosis + prescribe medicines |

| Clickable Element | Dialog |
|-------------------|--------|
| Patient name | `PatientDetailDialog` — full patient details |

### Key Process: Patient Consultation
```
Doctor logs in ──► /dashboard/doctor (Overview)
    │
    ▼
See today's appointments in Overview or Appointments tab
    │
    ▼
Click patient row ──► PatientDetailDialog (view history)
    │
    ▼
Options per appointment:
    ├── [Mark Free] ──► Fee = 0 (e.g., follow-up)
    ├── [Complete] ──► Appointment done
    ├── [Cancel] ──► Cancel appointment
    └── [Prescription] ──► PrescriptionDialog
            │
            ▼
    PrescriptionDialog allows:
        ├── Write diagnosis text
        ├── Prescribe medicines (name, dose, duration, notes)
        ├── Refer to lab (select tests) → Lab Dashboard
        ├── Refer to X-ray
        ├── Refer to OT (schedule surgery)
        └── Admit to IPD (bed assignment request)
    │
    ▼
All decisions saved to patient record
    │
    ▼
[Notes tab] ──► Write detailed medical notes
```

---

## 10. Pharmacy Dashboard

- **URL:** `/dashboard/pharmacy`
- **Layout:** AppLayout with Pharmacy sidebar
- **Who uses it:** Head Pharmacist, Assistant Pharmacist, Salesman Pharmacist

### Header Button

| Button | Action |
|--------|--------|
| **Offline Mode** | Full redirect to `/offline-mode-pharmacy` |

### Dashboard Tabs (In-page, no URL change)

| Tab | Content |
|-----|---------|
| Overview | Expiring medicines cards + Quick Actions grid |
| Recent Invoices | Recent pharmacy invoice table |
| Supplies | `MySupplyRequests` |
| IPD Orders | `IPDPharmacyQueue` |

### Quick Actions Grid
| Link | URL |
|------|-----|
| Manage Medicines | `/dashboard/pharmacy/medicines` |
| Sell Medicine | `/dashboard/pharmacy/sell` |
| Expiry Tracker | `/dashboard/pharmacy/expiry` |
| Analytics | `/dashboard/pharmacy/analytics` |

### Sub-Pages (Full Page Routes)

| URL | Page | Buttons/Actions |
|-----|------|-----------------|
| `/dashboard/pharmacy/medicines` | PharmacyMedicines | Add Medicine, Edit, Delete, Search |
| `/dashboard/pharmacy/sell` | PharmacySell | POS: search medicine → add to cart → generate invoice |
| `/dashboard/pharmacy/invoices` | PharmacyInvoices | Search by patient/date, View PDF |
| `/dashboard/pharmacy/returns` | PharmacyReturns | Process return, refund |
| `/dashboard/pharmacy/stock` | PharmacyStock | Adjust stock, view low-stock |
| `/dashboard/pharmacy/expiry` | PharmacyExpiry | View near-expiry items |
| `/dashboard/pharmacy/analytics` | PharmacyAnalytics | Sales charts, top medicines |
| `/dashboard/pharmacy/lab-reports` | PharmacyLabReports | View lab reports |
| `/dashboard/pharmacy/stickers` | PharmacyStickers | Print medicine labels |

### Key Process: Dispensing Medicines
```
Patient brings prescription
    │
    ▼
[Sell Medicine] ──► /dashboard/pharmacy/sell
    │
    ├── Search patient (name/phone)
    ├── Search & add medicines to cart
    ├── System calculates total, updates stock
    └── [Generate Invoice] ──► PDF printed
    │
    ▼
If out of stock:
    ├── Check [Stock Tracking] ──► /dashboard/pharmacy/stock
    └── Request from [Supplies tab] ──► Store Dashboard
```

### Key Process: IPD Pharmacy Orders
```
[IPD Orders tab] ──► IPDPharmacyQueue
    │
    ▼
View pending medicine requests from IPD
    │
    ▼
Prepare medicines → [Mark as Delivered]
    │
    ▼
IPD staff receives → administers to patient
```

---

## 11. Lab Dashboard

- **URL:** `/dashboard/lab`
- **Layout:** AppLayout with Lab sidebar
- **Who uses it:** Lab Technicians

### Tabs (In-page, no URL change)

| Tab | Content | Purpose |
|-----|---------|---------|
| New Lab Report | `PathologyReportWizard` | Create new pathology report |
| Report History | `PathologyReportHistory` | View all completed reports |
| Manage Tests | `PathologyTestTypeManager` | Add/edit test types, normal ranges, prices |
| Lab Item Supply | `LabItemSupply` | Manage lab consumables inventory |
| IPD Orders | `IPDLabQueue` | Process lab orders from IPD |
| Request Supplies | `MySupplyRequests` | Request lab items from store |

### Key Process: Lab Report Creation
```
Lab order arrives from:
    ├── Doctor's prescription (via Diagnoses tab)
    └── Staff billing (via Counter → Lab invoice)
    │
    ▼
[New Lab Report tab] ──► PathologyReportWizard
    │
    ├── Select patient (search)
    ├── Select tests from available list
    ├── Enter results with normal ranges
    └── [Generate Report] ──► PDF with unique report number
    │
    ▼
Report visible to:
    ├── Doctor (in dashboard)
    ├── Patient (in My Lab Reports)
    ├── Pharmacy (in Lab Reports tab)
    └── Public verification at /verify-report/:reportNumber
```

### Key Process: IPD Lab Orders
```
[IPD Orders tab] ──► IPDLabQueue
    │
    ▼
View pending lab requests from IPD
    │
    ▼
Process test → enter results
    │
    ▼
Results sent back to IPD Dashboard
```

---

## 12. OTA / OT Assistant Dashboard

- **URL:** `/dashboard/ota`
- **Layout:** AppLayout with OTA sidebar
- **Who uses it:** OT Assistants, Nursing Staff

### Tabs (In-page, no URL change)

| Tab | Content | Purpose |
|-----|---------|---------|
| OT Operations | Summary cards + OT rooms + schedule table | Full OT management |
| Lab Reports | `StaffLabReports` | View lab reports for OT patients |
| Supplies | `MySupplyRequests` | Request OT supplies |

### OT Operations — 5-Step Clinical Workflow

Each OT schedule row has 6 action buttons:

| Step | Button | Dialog | Who Can Use |
|------|--------|--------|-------------|
| 1 | **Pre-Op** | `PreOperationOrdersDialog` | OTA / Nursing |
| 2 | **OT Notes** | `OTNotesDialog` | OTA (Nursing: read-only) |
| 3 | **Treatment** | `TreatmentChartDialog` | OTA / Doctor |
| 4 | **Assessment** | `AssessmentDialog` | Nursing / OTA |
| 5 | **POPPR** | `PostOperativeProgressDialog` | OTA |
| Final | **Discharge Slip** | `DischargeSlipDialog` | OTA (completed only) |

### Flow: Full OT Patient Journey
```
Doctor refers patient for OT (via PrescriptionDialog)
    │
    ▼
OTA Dashboard ──► OT Operations tab
    │
    ├── Schedule OT (room + time slot + surgeon)
    │
    ▼
Before surgery:
    └── [Pre-Op] button ──► PreOperationOrdersDialog
            ├── Pre-op instructions
            ├── Medications
            └── Preparations
    │
    ▼
During/after surgery:
    └── [OT Notes] button ──► OTNotesDialog
            ├── Procedure details
            ├── Findings
            └── Surgeon notes
    │
    ▼
Post-op:
    └── [Treatment] button ──► TreatmentChartDialog
            ├── Post-op treatment plan
            ├── Medications
            └── Care instructions
    │
    ▼
Recovery monitoring:
    └── [Assessment] button ──► AssessmentDialog
            ├── Vitals
            └── Recovery status
    │
    ▼
Ready for discharge:
    └── [POPPR] button ──► PostOperativeProgressDialog
    └── [Discharge Slip] button ──► DischargeSlipDialog
            └── PDF generated → available to patient/doctor
```

---

## 13. IPD Dashboard

- **URL:** `/dashboard/ipd`
- **Layout:** AppLayout with IPD sidebar
- **Who uses it:** IPD Staff

### Internal Functions (via `IPDAdminPanel`)

| Section | Description |
|---------|-------------|
| Bed Dashboard | View all beds — occupied (red), vacant (green), reserved (yellow) |
| Ward Manager | Add/manage wards, assign beds |
| Active Admissions | Currently admitted patients |
| Pending Admissions | Patients waiting for bed |
| Discharged Patients | Historical discharge records |

### Dialogs & Buttons

| Button/Dialog | Purpose |
|--------------|---------|
| **Admit Patient** | Assign bed, collect advance |
| **Discharge** | Generate discharge summary, calculate bill |
| **Collect Advance** | Record advance payment |
| **Clinical Record Sheet** | Document daily vitals/progress |
| **Treatment Chart** | Record medications/procedures |
| **IPD Lab Order** | Request lab test → appears in Lab Dashboard |
| **IPD Pharmacy Order** | Request medicine → appears in Pharmacy Dashboard |
| **Discharge Bill** | Final bill calculation + payment processing |
| **Discharge Summary** | Generate discharge document |

### Flow: Admission → Stay → Discharge
```
Admission:
    Doctor recommends ──► StaffIPDRegister ──► "pending"
        │
        ▼
    IPD Dashboard ──► Pending Admissions
        │
        ├── Select patient
        ├── Assign bed (Bed Dashboard / Ward Manager)
        ├── Collect advance payment (optional)
        └── Patient moves to Active Admissions

During Stay:
    Active Admissions ──► Patient record
        ├── Clinical Record Sheet (daily vitals)
        ├── Treatment Chart (meds, procedures)
        ├── Lab Orders ──► Lab Dashboard
        ├── Pharmacy Orders ──► Pharmacy Dashboard
        └── IPD Notes (handwritten/typed)

Discharge:
    Doctor approves
        ├── Generate Discharge Summary
        ├── Calculate final bill:
        │   ├── Bed charges
        │   ├── Doctor fees
        │   ├── Medicines
        │   ├── Lab tests
        │   └── Procedures
        ├── Process payment
        └── Patient discharged → history preserved
```

---

## 14. Store / Inventory Dashboard

- **URL:** `/dashboard/store`
- **Layout:** AppLayout with Store sidebar
- **Who uses it:** Store Manager, Inventory Manager

### Tabs (In-page via `?tab=` parameter)

| Tab Value | Label | Shown For | Content |
|-----------|-------|-----------|---------|
| `requests` | Applications | inventory_manager, admin | Supply request list |
| `general` | General Stock | All | General inventory management |
| `lab` | Lab Stock | All | Lab-specific inventory |
| `provide` | Store/Provide | All | Approve & dispatch supplies |
| `distribution` | Distribution | inventory_manager, admin | Distribution reports |

### Low Stock Alerts

| Alert | Shown To | Action |
|-------|----------|--------|
| Items below minimum stock | manager, store | Alert banner at top |

### Key Process: Supply Request Fulfillment
```
Department requests supplies:
    ├── Pharmacy [Request Supplies]
    ├── Lab [Request Supplies]
    ├── OTA [Supplies tab]
    ├── Staff [Supplies tab]
    └── IPD [Supplies tab]
    │
    ▼
[Applications tab] ──► View all pending requests
    │
    ▼
Review request → [Approve] or [Reject]
    │
    ▼
[General Stock] or [Lab Stock] tab ──► Dispatch items
    │
    ▼
[Distribution tab] ──► Record of dispatched items
```

---

## 15. Finance Dashboard

- **URL:** `/dashboard/finance`
- **Layout:** FinanceLayout (tab navigation, no sidebar)
- **Who uses it:** Finance Staff

### Finance Tab Navigation (12 Tabs)

| Tab | URL | Content |
|-----|-----|---------|
| Dashboard | `/dashboard/finance` | Revenue overview, profit, department breakdown, quick actions |
| Daily | `/dashboard/finance/daily` | Daily closing/opening balance |
| Income | `/dashboard/finance/income` | All income transactions |
| Analytics | `/dashboard/finance/analytics` | Charts: revenue trends, expenses, profit |
| Expenses | `/dashboard/finance/expenses` | Record/manage expenses |
| Payroll | `/dashboard/finance/payroll` | Staff salary/payroll |
| Dr. Payments | `/dashboard/finance/doctor-payments` | Doctor consultation payments |
| Staff Shifts | `/dashboard/finance/staff-payments` | Staff shift payments |
| Pharmacy | `/dashboard/finance/pharmacy` | Pharmacy finance |
| Refunds | `/dashboard/finance/refunds` | Refund management |
| Invoices | `/dashboard/finance/invoices` | All invoices |
| Discounts | `/dashboard/finance/discounts` | Discount tracking |

### Additional Links (from Dashboard Tab)

| Button | Navigates To |
|--------|-------------|
| **Export CSV** | Downloads daily closing CSV |
| **IPD Finance Detail** | `/dashboard/finance/ipd` |
| **IPD Doctor Payments** | `/dashboard/finance/ipd-doctor-payments` |
| **Add Expense** | `/dashboard/finance/expenses` |
| **Doctor Payments** | `/dashboard/finance/doctor-payments` |
| **IPD Finance** | `/dashboard/finance/ipd` |
| **Staff Payroll** | `/dashboard/finance/payroll` |
| **Analytics** | `/dashboard/finance/analytics` |

### Key Process: Daily Closing
```
[Daily tab] ──► /dashboard/finance/daily
    │
    ├── View opening balance (from previous closing)
    ├── View all today's transactions
    ├── Enter closing balance
    └── [Save Closing] ──► Report saved for audit
```

### Key Process: Doctor Payments
```
[Dr. Payments tab] ──► /dashboard/finance/doctor-payments
    │
    ├── View each doctor's consultation earnings
    ├── Calculate hospital share
    ├── [Process Payment] ──► Mark as paid
    └── View payment history
```

---

## 16. Admin Dashboard

- **URL:** `/dashboard/admin`
- **Layout:** AppLayout with Admin sidebar + AdminDashboardNav header
- **Who uses it:** System Administrator / Hospital Owner

### Tabs (In-page, no URL change)

| Tab | Content |
|-----|---------|
| Overview | Stats cards (Doctors, Patients, Appointments, Revenue) + AppointmentChart + PopularDoctors + RegionWiseReport + System Activity Log |
| Analytics | Financial analytics + Revenue by Source + Recent Financial Activities + User Role Distribution |
| Accounts | User management table (CRUD) with search/filter/pagination |
| Regions | `RegionsTabContent` — geographic region management |
| Pharmacy | `PharmacyOverview` — sales, low stock, top medicines |
| Lab | `PathologyTestTypeManager` — manage lab tests |
| X-Ray | `AdminXrays` — X-ray records management |
| OT | `AdminOT` — OT operations overview |
| IPD | `IPDAdminPanel` — full IPD management |
| Emergency | `EmergencyExpensesManager` |
| Logs | System audit log viewer |
| Settings | Hospital branding, timings, financial settings, payroll config, shift management |
| Supplies | `MySupplyRequests` |

### Accounts Tab — Button Map

| Button | Action |
|--------|--------|
| **+ Account** | Opens `AccountManagementDialog` → create user (select role) |
| **Edit** (row) | Opens `EditUserDialog` → edit user details/role |
| **Block** (row) | Toggles user status → inactive |
| **Unblock** (row) | Toggles user status → active |
| **Delete** (row) | Confirmation dialog → permanently delete |
| **Previous / Next** | Pagination |

### Logs Tab — Button Map

| Button | Action |
|--------|--------|
| **Clear Filters** | Reset all filter fields |
| **View Details** (row) | Opens `AuditLogDetailDialog` → full log entry |

### Settings Tab — Button Map

| Section | Button | Action |
|---------|--------|--------|
| Hospital Branding | **Save** | Update hospital name + logo |
| Hospital Timings | **Save** | Update working hours |
| Financial Settings | **Save** | Update emergency consultation fee |
| Payroll Settings | **Save** | Update payment date |
| Hospital Info | **Save** | Update name/contact/address |
| Shift Management | **Add Shift** | Create new shift |
| Shift Management | **Edit** (pencil) | Edit shift details |
| Shift Management | **Delete** (trash) | Delete shift |

### Sub-Pages (URL routes)

| URL | Page | Actions |
|-----|------|---------|
| `/dashboard/admin/departments` | AdminDepartments | Add/Edit/Delete departments |
| `/dashboard/admin/staff` | AdminStaff | Add/Edit/Deactivate staff |
| `/dashboard/admin/doctors` | AdminDoctors | Add/Edit doctor profiles + rates |
| `/dashboard/admin/audit-logs` | AdminAuditLogs | Detailed logs with filters |
| `/dashboard/admin/settings` | AdminSettings | Hospital configuration |
| `/dashboard/admin/regions` | AdminRegions | Add/Edit/Delete regions |
| `/dashboard/admin/ipd` | AdminIPD | IPD admin panel |

---

## 17. Complete Business Flow — A Patient's Journey

### Walk-in Patient (OPD) — Full URL & Button Trace

```
1. PATIENT ARRIVES AT RECEPTION
   └── Staff is at: /dashboard/staff
   └── Staff clicks: [Register Patient] ──► PatientDialog
   └── Staff clicks: [+ New Appointment] ──► EnhancedAppointmentDialog
       ├── Selects patient, doctor, date/time
       └── Optionally: [Generate Invoice] ──► PDF printed
   └── Patient directed to doctor's room

2. PATIENT SEES DOCTOR
   └── Doctor is at: /dashboard/doctor
   └── Doctor sees patient in Appointments tab
   └── Doctor clicks: [Prescription] ──► PrescriptionDialog
       ├── Writes diagnosis
       ├── Prescribes medicines (sent to Pharmacy)
       ├── Refers to lab (selects tests → sent to Lab)
       ├── Refers to X-ray
       ├── Refers to OT (schedules surgery → sent to OTA)
       └── Admits to IPD (bed request → sent to IPD)
   └── OR Doctor clicks: [Complete] / [Mark Free] / [Cancel]

3A. PHARMACY (if prescribed)
   └── Pharmacist is at: /dashboard/pharmacy
   └── Pharmacist clicks sidebar: [Sell Medicine] ──► /dashboard/pharmacy/sell
       ├── Searches patient
       ├── Adds prescribed medicines
       └── [Generate Invoice] ──► PDF printed, stock updated

3B. LAB (if referred)
   └── Lab Tech is at: /dashboard/lab
   └── Lab Tech clicks: [New Lab Report] tab
       ├── Selects patient
       ├── Enters test results
       └── [Generate Report] ──► PDF with report number

3C. OT / SURGERY (if referred)
   └── OTA is at: /dashboard/ota
   └── OTA clicks: [OT Operations] tab
       ├── Schedules OT (room, time, surgeon)
       └── Completes 5-step workflow:
           [Pre-Op] → [OT Notes] → [Treatment] → [Assessment] → [POPPR]
       └── [Discharge Slip] ──► PDF

3D. IPD ADMISSION (if admitted)
   └── Staff clicks: [IPD tab] ──► [Create IPD Admission Request]
   └── IPD staff is at: /dashboard/ipd
       ├── Assigns bed
       ├── Collects advance
       └── Patient in Active Admissions
   └── During stay:
       ├── Clinical records, treatment charts
       ├── Lab orders → /dashboard/lab (IPD Orders tab)
       └── Pharmacy orders → /dashboard/pharmacy (IPD Orders tab)
   └── Discharge:
       ├── Generate discharge summary
       ├── Calculate bill
       └── Process payment

4. FINANCE END-OF-DAY
   └── Finance is at: /dashboard/finance
   └── [Daily tab] ──► /dashboard/finance/daily
       └── Enter closing balance → report saved
```

### End-of-Day Process
```
1. Staff: [Shift Closing tab] ──► StaffShiftClosing
   └── Close cash register, submit report

2. Pharmacy: Review daily sales in Analytics

3. Finance: [Daily tab] ──► /dashboard/finance/daily
   └── Process daily closing

4. Admin: [Overview tab] ──► /dashboard/admin
   └── Review system-wide stats
```

---

## 18. Process Flow Diagrams

### Consultation → Invoice Flow
```
Appointment Row (Staff Counter)
    │
    ├── [Generate Invoice] click
    │       │
    │       ▼
    │   Create invoice (DB: status='paid')
    │       │
    │       ▼
    │   Generate PDF (type: consultation)
    │       │
    │       ▼
    │   Appointment.payment_status = 'paid'
    │
    └── [Reprint Invoice] click
            │
            ▼
        Regenerate PDF from existing invoice
```

### Emergency Consultation Flow
```
[Emergency Consultation] button (Staff Counter)
    │
    ▼
EmergencyConsultationDialog opens
    │
    ├── Enter: patient name, contact, optional expenses
    └── [Submit]
            │
            ▼
        Creates invoice (prefix: EMG-XXX)
            │
            ▼
        Revenue goes to hospital (not doctor)
            │
            ▼
        PDF generated
```

### Free Consultation Flow
```
Option A: Doctor Schedule
    [Mark Free] button (per appointment row)
        │
        ▼
    AlertDialog confirmation
        │
        ▼
    Appointment.cleared_at = timestamp
        │
        ▼
    Display: "Completed (Free)"

Option B: Staff Counter
    [Check Free] button
        │
        ▼
    CheckFreeDialog → enter invoice number
        │
        ▼
    Mark as free/cleared
```

### OT Operation Flow (5-Step Clinical Workflow)
```
OT Schedule Row (OTA Dashboard)
    │
    ├── Step 1: [Pre-Op] ──► PreOperationOrdersDialog ──► Save
    │
    ├── Step 2: [OT Notes] ──► OTNotesDialog ──► Save (Nurses: read-only)
    │
    ├── Step 3: [Treatment] ──► TreatmentChartDialog ──► Save
    │
    ├── Step 4: [Assessment] ──► AssessmentDialog ──► Save
    │
    ├── Step 5: [POPPR] ──► PostOperativeProgressDialog ──► Save
    │
    └── Final: [Discharge Slip] ──► DischargeSlipDialog ──► PDF
```

### IPD Admission Flow
```
Step 1: Staff creates request
    StaffIPDRegister → [Create IPD Admission Request]
        │
        ▼
    Creates "pending" admission in DB

Step 2: IPD staff assigns bed
    IPD Dashboard → Pending Admissions
        │
        ├── Select patient
        ├── Assign ward/bed
        ├── Collect advance payment (optional)
        └── Status → "active"

Step 3: During stay
    Active Admissions → patient record
        ├── Clinical Record Sheet (daily)
        ├── Treatment Chart
        ├── Lab Orders → IPDLabQueue (Lab Dashboard)
        └── Pharmacy Orders → IPDPharmacyQueue (Pharmacy Dashboard)

Step 4: Discharge
    [Discharge] button
        ├── Generate Discharge Summary
        ├── Calculate bill (bed + doctor + medicines + lab + procedures)
        ├── Process payment
        └── Status → "discharged"
```

### Supply Request Flow
```
Any Department
    [Supplies tab] ──► MySupplyRequests
        │
        ├── [Request Supply] button
        │       │
        │       ▼
        │   Select item + quantity → Submit
        │       │
        │       ▼
        │   Status: "pending"
        │
        ▼

Store Dashboard (/dashboard/store)
    [Applications tab] ──► View pending requests
        │
        ├── [Approve] → Item deducted from stock
        │       │
        │       ▼
        │   Status: "approved" → dispatched
        │
        └── [Reject] → Status: "rejected"

Reports
    [Distribution tab] ──► View all dispatched items
```

---

## Quick Reference: Who Does What & Where

| Action | Role | Page/URL | Button |
|--------|------|----------|--------|
| Register patient | Staff | `/dashboard/staff` → Counter | [Register Patient] |
| Book appointment | Staff / Patient | `/dashboard/staff` → Counter / `/dashboard/patient` → Book Appointment | [+ New Appointment] / Book form |
| Create consultation bill | Staff | `/dashboard/staff` → Counter | [Generate Invoice] |
| Write diagnosis | Doctor | `/dashboard/doctor` → Diagnoses tab | [Prescription] → PrescriptionDialog |
| Prescribe medicines | Doctor | `/dashboard/doctor` → Diagnoses tab | [Prescription] → add medicines |
| Refer to lab | Doctor | `/dashboard/doctor` → Diagnoses tab | [Prescription] → select lab tests |
| Refer to OT | Doctor | `/dashboard/doctor` → Diagnoses tab | [Prescription] → refer to OT |
| Admit to IPD | Doctor / Staff | `/dashboard/doctor` → Diagnoses / `/dashboard/staff` → IPD tab | [Prescription] or [Create IPD Admission Request] |
| Sell medicines | Pharmacist | `/dashboard/pharmacy/sell` | [Generate Invoice] |
| Create lab report | Lab Tech | `/dashboard/lab` → New Lab Report | [Generate Report] |
| Schedule OT | OTA | `/dashboard/ota` → OT Operations | OT scheduling form |
| Complete OT steps | OTA / Nursing | `/dashboard/ota` → OT Operations | [Pre-Op] [OT Notes] [Treatment] [Assessment] [POPPR] |
| Admit IPD patient | IPD Staff | `/dashboard/ipd` | [Admit] → assign bed |
| Discharge IPD patient | IPD Staff | `/dashboard/ipd` | [Discharge] → bill → discharge |
| Request supplies | Any department | → Supplies tab | [Request Supply] |
| Approve supplies | Store Manager | `/dashboard/store` → Applications | [Approve] |
| Process daily closing | Finance | `/dashboard/finance/daily` | [Save Closing] |
| Process doctor payments | Finance | `/dashboard/finance/doctor-payments` | [Process Payment] |
| Manage accounts | Admin | `/dashboard/admin` → Accounts tab | [+ Account] [Edit] [Block] [Delete] |
| Configure hospital | Admin | `/dashboard/admin/settings` | [Save] per section |
| View audit logs | Admin | `/dashboard/admin` → Logs tab | [View Details] |
