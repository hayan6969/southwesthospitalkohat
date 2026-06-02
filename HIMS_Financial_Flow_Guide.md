# Southwest Hospital Kohat — HIMS Financial Flow Guide

> **Purpose:** This document explains the complete flow of money in the Hospital Information Management System — where revenue comes from, how it is calculated, where it goes, and how daily closing works.

---

## Table of Contents

1. [Revenue Overview](#1-revenue-overview)
2. [Where Revenue Comes From](#2-where-revenue-comes-from)
3. [How Revenue Is Calculated](#3-how-revenue-is-calculated)
4. [Money Flow Diagram](#4-money-flow-diagram)
5. [Department-Wise Revenue Breakdown](#5-department-wise-revenue-breakdown)
6. [Pharmacy Revenue Flow](#6-pharmacy-revenue-flow)
7. [Doctor Payments & Hospital Share](#7-doctor-payments--hospital-share)
8. [IPD Revenue Flow](#8-ipd-revenue-flow)
9. [Emergency Revenue](#9-emergency-revenue)
10. [Discounts & Free Consultations](#10-discounts--free-consultations)
11. [Refunds & Returns](#11-refunds--returns)
12. [Daily Closing Process](#12-daily-closing-process)
13. [Monthly Revenue Reconciliation](#13-monthly-revenue-reconciliation)
14. [Finance Dashboard Tabs Explained](#14-finance-dashboard-tabs-explained)
15. [Quick Reference — Revenue at a Glance](#15-quick-reference--revenue-at-a-glance)

---

## 1. Revenue Overview

The hospital's total revenue comes from **multiple departments**, each generating income through different services. All income flows into the **Finance Dashboard** where it is tracked, reconciled, and reported.

### Key Concepts

| Term | Meaning |
|------|---------|
| **Revenue** | Total money received from all sources |
| **Income** | Actual cash/bank amount collected |
| **Hospital Share** | Portion of revenue that belongs to the hospital after doctor payments |
| **Doctor Payment** | Portion of consultation fees paid to doctors |
| **Daily Closing** | End-of-day cash reconciliation |
| **Opening Balance** | Cash in hand at the start of the day |
| **Closing Balance** | Cash in hand at the end of the day |

---

## 2. Where Revenue Comes From

### 2.1 Revenue Sources

```
┌─────────────────────────────────────────────────────────────┐
│                    TOTAL HOSPITAL REVENUE                    │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  OPD         │  PHARMACY    │  IPD         │  OTHERS        │
│  Consultation│  Medicine    │  Ward        │  Lab / X-Ray   │
│  Fees        │  Sales       │  Charges     │  OT / Surgery  │
│              │              │              │  Emergency     │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

### 2.2 Detailed Revenue Sources

| Source | Who Collects It | Where It Appears |
|--------|-----------------|------------------|
| **Consultation Fees** | Reception (Counter) | Finance > Income |
| **Medicine Sales** | Pharmacy | Finance > Pharmacy |
| **Lab Test Fees** | Lab / Reception | Finance > Income |
| **X-Ray Fees** | Reception | Finance > Income |
| **OT / Surgery Fees** | OTA / Reception | Finance > Income |
| **IPD Bed Charges** | IPD Staff | Finance > IPD Finance |
| **IPD Doctor Fees** | IPD Staff | Finance > IPD Dr Payments |
| **IPD Medicine Charges** | Pharmacy (IPD Orders) | Finance > IPD Finance |
| **Emergency Fees** | Reception (Emergency) | Finance > Income |
| **Procedure Charges** | Relevant Department | Finance > Income |

---

## 3. How Revenue Is Calculated

### 3.1 Consultation Fee Calculation

```
Consultation Fee (set by Admin in Settings)
       │
       ▼
┌──────────────────────────────────┐
│  Patient Pays Full Fee at Counter │
├──────────────────────────────────┤
│  Fee Split:                      │
│  ┌────────────────────────────┐  │
│  │ Hospital Share = Fee × %   │  │
│  │ Doctor Share   = Fee × %   │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

**Example:**
- Admin sets consultation fee: **Rs. 500**
- Hospital share: **60%** = Rs. 300
- Doctor share: **40%** = Rs. 200
- Revenue recorded: Rs. 500 (total)
- Hospital income: Rs. 300
- Doctor payable: Rs. 200

### 3.2 Pharmacy Revenue Calculation

```
Medicine Sale Price × Quantity Sold
       │
       ▼
┌──────────────────────────────────┐
│  Total Pharmacy Revenue           │
│  = Sum of all medicine invoices   │
│                                    │
│  Note: Pharmacy revenue is 100%   │
│  hospital income (no doctor cut)  │
└──────────────────────────────────┘
```

**Example:**
- Paracetamol: Rs. 50 × 2 = Rs. 100
- Amoxicillin: Rs. 120 × 1 = Rs. 120
- **Total Pharmacy Invoice: Rs. 220**
- **All Rs. 220 goes to hospital**

### 3.3 Lab Revenue Calculation

```
Lab Test Fee (per test)
       │
       ▼
┌──────────────────────────────────┐
│  Total Lab Revenue                │
│  = Sum of all lab test fees       │
│                                    │
│  Note: Lab revenue is 100%        │
│  hospital income                  │
└──────────────────────────────────┘
```

### 3.4 IPD Revenue Calculation

```
┌──────────────────────────────────────────────┐
│              IPD TOTAL BILL                   │
├──────────────────────────────────────────────┤
│  Bed Charges      = Days × Rate per night    │
│  Doctor Fees      = Visits × Consultation    │
│  Medicine Charges = Pharmacy IPD orders      │
│  Lab Tests        = Tests × Fee per test     │
│  Procedures       = Procedure fees           │
│  OT Charges       = Surgery fees (if any)    │
├──────────────────────────────────────────────┤
│  TOTAL IPD BILL = Sum of all above            │
└──────────────────────────────────────────────┘
```

**Example IPD Bill:**

| Item | Calculation | Amount |
|------|-------------|--------|
| Bed Charges | 3 days × Rs. 1,000 | Rs. 3,000 |
| Doctor Fees | 2 visits × Rs. 500 | Rs. 1,000 |
| Medicines | Pharmacy order | Rs. 2,500 |
| Lab Tests | CBC + X-Ray | Rs. 1,200 |
| IV Procedure | 1 × Rs. 300 | Rs. 300 |
| **TOTAL** | | **Rs. 8,000** |

---

## 4. Money Flow Diagram

### 4.1 Complete Money Flow

```
                    ┌─────────────────┐
                    │   PATIENT pays  │
                    │   at Counter    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  Cash    │  │  Online  │  │  Advance │
        │  in Hand │  │ Payment  │  │  (IPD)   │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                 ┌──────────────────────┐
                 │   Finance Dashboard  │
                 │   (All Revenue)      │
                 └──────────┬───────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Hospital │  │ Doctor   │  │ Expenses │
        │ Income   │  │ Payments │  │ & Payroll│
        └──────────┘  └──────────┘  └──────────┘
```

### 4.2 Step-by-Step Money Flow

```
Step 1: Patient arrives → Reception registers & collects fee
         │
         ▼
Step 2: Invoice created → Amount recorded in Finance > Income
         │
         ▼
Step 3: Daily totals calculated → Finance > Daily tab
         │
         ▼
Step 4: Shift closing → Reception enters cash in hand
         │
         ▼
Step 5: Finance verifies → Opening + Income - Expenses = Closing
         │
         ▼
Step 6: Doctor payments processed → Finance > Dr. Payments
         │
         ▼
Step 7: Monthly reconciliation → Admin reviews reports
```

---

## 5. Department-Wise Revenue Breakdown

### 5.1 Reception / Counter Revenue

| Service | Revenue Goes To | Notes |
|---------|-----------------|-------|
| Consultation Fee | Split: Hospital + Doctor | % set by Admin |
| Lab Test Fee | 100% Hospital | No doctor cut |
| X-Ray Fee | 100% Hospital | No doctor cut |
| OT Fee | 100% Hospital | Surgery fee separate |
| Procedure Fee | 100% Hospital | Minor procedures |

### 5.2 Pharmacy Revenue

| Item | Revenue Goes To | Notes |
|------|-----------------|-------|
| Medicine Sale (OPD) | 100% Hospital | Direct sale to patient |
| Medicine Sale (IPD) | 100% Hospital | Billed in final IPD bill |
| Medicine Return | Deducted from revenue | Stock returns to inventory |

### 5.3 IPD Revenue

| Item | Revenue Goes To | Notes |
|------|-----------------|-------|
| Bed Charges | 100% Hospital | Per night rate |
| Doctor Visits | Split: Hospital + Doctor | Same as OPD split |
| IPD Medicines | 100% Hospital | From pharmacy |
| IPD Lab Tests | 100% Hospital | From lab |
| OT Surgery | 100% Hospital | Surgery charges |

### 5.4 Emergency Revenue

| Item | Revenue Goes To | Notes |
|------|-----------------|-------|
| Emergency Consultation | 100% Hospital | Not linked to any doctor |
| Emergency Procedures | 100% Hospital | Urgent care charges |
| Emergency Medicines | 100% Hospital | From pharmacy |

**Note:** Emergency revenue prefix is **EMG-XXX** and goes entirely to the hospital.

---

## 6. Pharmacy Revenue Flow

### 6.1 Pharmacy Revenue Cycle

```
┌─────────────────────────────────────────────────────────────┐
│                    PHARMACY REVENUE FLOW                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Doctor prescribes medicine                               │
│         │                                                    │
│         ▼                                                    │
│  2. Patient goes to Pharmacy                                 │
│         │                                                    │
│         ▼                                                    │
│  3. Pharmacist searches patient & adds medicines to cart     │
│         │                                                    │
│         ▼                                                    │
│  4. System calculates total                                  │
│         │                                                    │
│         ▼                                                    │
│  5. [Generate Invoice] → PDF created                         │
│         │                                                    │
│         ▼                                                    │
│  6. Patient pays → Cash recorded                             │
│         │                                                    │
│         ▼                                                    │
│  7. Revenue appears in:                                      │
│     • Finance > Pharmacy tab                                 │
│     • Finance > Income tab                                   │
│     • Finance > Dashboard (overview)                         │
│         │                                                    │
│         ▼                                                    │
│  8. Stock automatically reduced                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Pharmacy Revenue Example

**Scenario:** Patient comes with prescription for 3 medicines.

| Medicine | Unit Price | Quantity | Total |
|----------|------------|----------|-------|
| Paracetamol 500mg | Rs. 50 | 10 | Rs. 500 |
| Amoxicillin 250mg | Rs. 120 | 5 | Rs. 600 |
| Omeprazole 20mg | Rs. 80 | 7 | Rs. 560 |
| **Total Invoice** | | | **Rs. 1,660** |

**Where this revenue appears:**

| Finance Tab | Amount Shown |
|-------------|--------------|
| Dashboard | +Rs. 1,660 in Pharmacy revenue |
| Pharmacy | +Rs. 1,660 in pharmacy sales |
| Income | +Rs. 1,660 in total income |
| Invoices | New invoice record with Rs. 1,660 |

### 6.3 Pharmacy Revenue — Offline Mode

```
Internet Down → Pharmacist clicks [Offline Mode]
         │
         ▼
Sales processed locally → Data stored on device
         │
         ▼
Internet Restored → Auto-sync to system
         │
         ▼
Revenue appears in Finance tabs (with offline tag)
```

### 6.4 Pharmacy Returns Impact on Revenue

```
Original Invoice: Rs. 1,660
         │
         ▼
Patient returns 1 Amoxicillin (Rs. 120)
         │
         ▼
Return processed → Finance > Refunds tab shows -Rs. 120
         │
         ▼
Net Pharmacy Revenue = Rs. 1,660 - Rs. 120 = Rs. 1,540
```

---

## 7. Doctor Payments & Hospital Share

### 7.1 How Doctor Payments Work

```
Consultation Fee Collected (e.g., Rs. 500)
         │
         ▼
┌────────────────────────────────┐
│  Split Calculation             │
│  (Percentages set by Admin)    │
├────────────────────────────────┤
│  Hospital Share: 60% = Rs. 300 │
│  Doctor Share:   40% = Rs. 200 │
└────────────────────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
Hospital   Doctor's
Income     Payable
Account    Balance
```

### 7.2 Doctor Payment Processing

```
Step 1: Finance opens [Dr. Payments] tab
         │
         ▼
Step 2: System shows each doctor's earnings:
         │
         ├─ Dr. Ahmed: 20 patients × Rs. 200 = Rs. 4,000
         ├─ Dr. Sara:  15 patients × Rs. 200 = Rs. 3,000
         └─ Dr. Khan:  10 patients × Rs. 200 = Rs. 2,000
         │
         ▼
Step 3: Finance reviews and clicks [Process Payment]
         │
         ▼
Step 4: Payment marked as paid → Doctor's balance resets
```

### 7.3 Doctor Payment Example

**Period: 1st to 15th of the month**

| Doctor | Patients | Fee per Patient | Doctor Share (40%) | Hospital Share (60%) |
|--------|----------|-----------------|-------------------|---------------------|
| Dr. Ahmed | 45 | Rs. 500 | Rs. 9,000 | Rs. 13,500 |
| Dr. Sara | 38 | Rs. 500 | Rs. 7,600 | Rs. 11,400 |
| Dr. Khan | 22 | Rs. 500 | Rs. 4,400 | Rs. 6,600 |
| **TOTAL** | **105** | | **Rs. 21,000** | **Rs. 31,500** |

**Total Revenue from Consultations: Rs. 52,500**
- Paid to Doctors: Rs. 21,000
- Hospital Income: Rs. 31,500

---

## 8. IPD Revenue Flow

### 8.1 IPD Billing Flow

```
Patient Admitted → Advance Payment Collected (Optional)
         │
         ▼
During Stay:
  ├─ Bed charges accumulate daily
  ├─ Doctor visits add consultation fees
  ├─ Pharmacy orders add medicine charges
  ├─ Lab orders add test fees
  └─ Procedures add procedure charges
         │
         ▼
Patient Discharged → [Discharge] clicked
         │
         ▼
System calculates FINAL BILL:
  ┌─────────────────────────────────┐
  │  Total Charges                  │
  │  - Advance Payment              │
  │  - Discounts (if any)           │
  │  = Amount Due                   │
  └─────────────────────────────────┘
         │
         ▼
Payment collected → [Generate Discharge Summary]
         │
         ▼
Revenue distributed:
  ├─ Bed charges → Hospital
  ├─ Doctor fees → Split (Hospital + Doctor)
  ├─ Medicines → Hospital
  ├─ Lab tests → Hospital
  └─ Procedures → Hospital
```

### 8.2 IPD Revenue Example

**Patient: Muhammad Ali | MR# 12345 | Stay: 4 days**

| Charge Type | Details | Amount |
|-------------|---------|--------|
| Bed Charges | 4 nights × Rs. 1,000 | Rs. 4,000 |
| Doctor Visits | 4 visits × Rs. 500 | Rs. 2,000 |
| Medicines | Pharmacy IPD orders | Rs. 3,500 |
| Lab Tests | CBC, LFT, X-Ray | Rs. 2,200 |
| IV Procedures | 3 × Rs. 300 | Rs. 900 |
| **GROSS TOTAL** | | **Rs. 12,600** |
| Advance Paid | At admission | -Rs. 5,000 |
| Discount | 10% charity | -Rs. 760 |
| **NET DUE** | | **Rs. 6,840** |

**Revenue Distribution:**

| Recipient | Amount |
|-----------|--------|
| Hospital (Bed) | Rs. 4,000 |
| Hospital (Doctor share 60%) | Rs. 1,200 |
| Doctor (40% of visits) | Rs. 800 |
| Hospital (Medicines) | Rs. 3,500 |
| Hospital (Lab) | Rs. 2,200 |
| Hospital (Procedures) | Rs. 900 |
| **Total Hospital** | **Rs. 11,800** |
| **Total Doctor** | **Rs. 800** |

---

## 9. Emergency Revenue

### 9.1 Emergency Revenue Flow

```
Walk-in Emergency Patient
         │
         ▼
Reception clicks [Emergency]
         │
         ▼
Fills: Name, Contact, Expenses
         │
         ▼
Invoice created with prefix EMG-XXX
         │
         ▼
100% Revenue → Hospital (NO doctor split)
         │
         ▼
Appears in Finance > Income tab
```

### 9.2 Why Emergency Revenue is 100% Hospital

- Emergency patients are **not linked to any specific doctor**
- Revenue goes directly to **hospital account**
- Used for **walk-in urgent cases** where doctor assignment happens later
- Finance can track emergency revenue separately using **EMG- prefix**

### 9.3 Emergency Revenue Example

| EMG Invoice | Patient | Amount | Revenue To |
|-------------|---------|--------|------------|
| EMG-001 | Walk-in patient | Rs. 800 | Hospital |
| EMG-002 | Accident case | Rs. 2,500 | Hospital |
| EMG-003 | Fever + IV | Rs. 1,200 | Hospital |
| **Total Emergency** | | **Rs. 4,500** | **100% Hospital** |

---

## 10. Discounts & Free Consultations

### 10.1 Free Consultations

```
Reception clicks [Check Free] on Counter
         │
         ▼
Enter Invoice Number
         │
         ▼
Invoice marked as FREE → Amount = Rs. 0
         │
         ▼
Revenue impact:
  ├─ No income recorded
  ├─ Doctor receives NO payment
  └─ Shown as "Completed (Free)" in reports
```

### 10.2 Discounts

```
Invoice Amount: Rs. 1,000
         │
         ▼
Discount Applied (e.g., 20%)
         │
         ▼
Patient Pays: Rs. 800
         │
         ▼
Revenue recorded: Rs. 800
Discount recorded: Rs. 200 (Finance > Discounts tab)
```

### 10.3 Impact on Revenue

| Scenario | Original | Discount | Net Revenue | Doctor Paid On |
|----------|----------|----------|-------------|----------------|
| Full Fee | Rs. 500 | 0% | Rs. 500 | Rs. 200 (40%) |
| 20% Discount | Rs. 500 | Rs. 100 | Rs. 400 | Rs. 160 (40%) |
| Free | Rs. 500 | Rs. 500 | Rs. 0 | Rs. 0 |

---

## 11. Refunds & Returns

### 11.1 Pharmacy Refunds

```
Original Invoice: Rs. 1,660
         │
         ▼
Patient returns medicines worth Rs. 350
         │
         ▼
Pharmacist processes return → [Returns] tab
         │
         ▼
Finance impact:
  ├─ Finance > Refunds: -Rs. 350
  ├─ Finance > Pharmacy: Revenue reduced by Rs. 350
  └─ Stock: Items returned to inventory
```

### 11.2 Consultation Refunds (Cancellations)

```
Appointment Cancelled by Doctor → [Cancel] clicked
         │
         ▼
Related invoice cancelled
         │
         ▼
Finance impact:
  ├─ Finance > Refunds: Shows cancelled amount
  ├─ Finance > Income: Revenue reduced
  └─ Doctor: No payment for this patient
```

---

## 12. Daily Closing Process

### 12.1 Daily Closing Flow

```
End of Shift → Reception clicks [Shift Closing] tab
         │
         ▼
System shows:
  ├─ Total cash collected today
  ├─ Total invoices generated
  ├─ Total free consultations
  └─ Expected cash in hand
         │
         ▼
Reception counts actual cash → Enters amount
         │
         ▼
Click [Save Closing]
         │
         ▼
Finance verifies:
  ┌─────────────────────────────────────┐
  │  Opening Balance                    │
  │  + Cash Collected Today             │
  │  - Cash Paid Out (expenses)         │
  │  = Expected Closing Balance         │
  │                                     │
  │  Actual Closing (entered by staff)  │
  │  Variance = Expected - Actual       │
  └─────────────────────────────────────┘
```

### 12.2 Daily Closing Example

**Date: 15 May 2026**

| Item | Amount |
|------|--------|
| Opening Balance (morning) | Rs. 5,000 |
| **Income Today:** | |
| └─ Consultations (30 × Rs. 500) | Rs. 15,000 |
| └─ Pharmacy Sales | Rs. 8,500 |
| └─ Lab Tests | Rs. 3,200 |
| └─ Emergency | Rs. 1,800 |
| └─ IPD Advance | Rs. 5,000 |
| **Total Income** | **Rs. 33,500** |
| **Expenses Today:** | |
| └─ Supplies purchased | Rs. 2,000 |
| └─ Maintenance | Rs. 500 |
| **Total Expenses** | **Rs. 2,500** |
| **Expected Closing** | **Rs. 36,000** |
| Actual Closing (counted) | Rs. 35,800 |
| **Variance** | **-Rs. 200** |

### 12.3 Where Daily Closing Appears

| Finance Tab | What You See |
|-------------|--------------|
| Daily | Opening/Closing balance for the day |
| Income | All transactions that contributed |
| Expenses | All expenses deducted |
| Dashboard | Summary in overview |

---

## 13. Monthly Revenue Reconciliation

### 13.1 Monthly Summary Flow

```
End of Month → Finance reviews all tabs
         │
         ▼
┌─────────────────────────────────────────────┐
│           MONTHLY REVENUE SUMMARY            │
├─────────────────────────────────────────────┤
│  Total Revenue (all sources)                 │
│  - Doctor Payments                           │
│  - Expenses                                  │
│  - Refunds                                   │
│  = Net Hospital Income                       │
└─────────────────────────────────────────────┘
         │
         ▼
Admin reviews → Logs tab for audit
         │
         ▼
Report generated → Available for management
```

### 13.2 Monthly Revenue Example

**Month: May 2026**

| Revenue Source | Amount |
|----------------|--------|
| OPD Consultations | Rs. 450,000 |
| Pharmacy Sales | Rs. 280,000 |
| Lab Tests | Rs. 95,000 |
| IPD Revenue | Rs. 320,000 |
| OT / Surgery | Rs. 150,000 |
| Emergency | Rs. 45,000 |
| **GROSS REVENUE** | **Rs. 1,340,000** |

| Deductions | Amount |
|------------|--------|
| Doctor Payments (40% of consultations) | Rs. 180,000 |
| Staff Salaries (Payroll) | Rs. 250,000 |
| Supplies & Expenses | Rs. 120,000 |
| Refunds & Returns | Rs. 15,000 |
| **TOTAL DEDUCTIONS** | **Rs. 565,000** |

| **NET HOSPITAL INCOME** | **Rs. 775,000** |
|-------------------------|-----------------|

---

## 14. Finance Dashboard Tabs Explained

### 14.1 Complete Tab Reference

| Tab | Purpose | Key Metrics |
|-----|---------|-------------|
| **Dashboard** | Overview of all revenue | Total revenue, profit, department breakdown |
| **Daily** | Day-by-day closing | Opening balance, closing balance, variance |
| **Income** | All money received | Every transaction with date and source |
| **Analytics** | Revenue trends | Charts showing revenue over time |
| **Expenses** | Record daily expenses | Expense categories and totals |
| **Payroll** | Staff salary payments | Salary disbursement records |
| **Dr. Payments** | Doctor consultation payments | Doctor-wise earnings and payment status |
| **Staff Shifts** | Shift-based payment records | Shift-wise collection totals |
| **Pharmacy** | Pharmacy sales and revenue | Medicine sales, returns, net revenue |
| **Refunds** | All refund transactions | Cancelled invoices and medicine returns |
| **Invoices** | Every invoice in system | Searchable invoice list |
| **Discounts** | Discounts applied | Discount amounts and reasons |
| **IPD Finance** | IPD patient billing totals | IPD revenue breakdown |
| **IPD Dr Payments** | Doctor payments for IPD | IPD doctor fee calculations |

### 14.2 How Tabs Connect

```
Dashboard (Overview)
    │
    ├── Daily → Income → Invoices
    │              └── Discounts
    │              └── Refunds
    │
    ├── Pharmacy → Invoices
    │           └── Refunds
    │
    ├── Dr. Payments → Income (consultations only)
    │
    ├── IPD Finance → IPD Dr Payments
    │              └── Invoices
    │
    ├── Expenses → Payroll
    │           └── Staff Shifts
    │
    └── Analytics (pulls data from all tabs)
```

---

## 15. Quick Reference — Revenue at a Glance

### 15.1 Revenue Source Summary

| Source | % to Hospital | % to Doctor | Collected By |
|--------|---------------|-------------|--------------|
| OPD Consultation | 60% | 40% | Reception |
| Pharmacy Sales | 100% | 0% | Pharmacy |
| Lab Tests | 100% | 0% | Reception / Lab |
| X-Ray | 100% | 0% | Reception |
| IPD Bed Charges | 100% | 0% | IPD Staff |
| IPD Doctor Visits | 60% | 40% | IPD Staff |
| IPD Medicines | 100% | 0% | Pharmacy |
| OT / Surgery | 100% | 0% | OTA / Reception |
| Emergency | 100% | 0% | Reception |
| Procedures | 100% | 0% | Relevant Dept |

### 15.2 Revenue Flow Checklist

```
□ Patient pays at Counter / Pharmacy / IPD
□ Invoice generated → Recorded in Finance > Invoices
□ Revenue appears in Finance > Income
□ Daily closing → Cash reconciled
□ Doctor payments → Processed from Dr. Payments tab
□ Expenses → Recorded in Expenses tab
□ Monthly summary → Net income calculated
□ Admin review → Logs tab for audit
```

### 15.3 Key Formulas

| Calculation | Formula |
|-------------|---------|
| **Hospital Share** | `Consultation Fee × Hospital %` |
| **Doctor Share** | `Consultation Fee × Doctor %` |
| **Net Daily Income** | `Opening + Collections - Expenses` |
| **Variance** | `Expected Closing - Actual Closing` |
| **IPD Total Bill** | `Bed + Doctor + Medicines + Lab + Procedures + OT` |
| **Net Hospital Income** | `Gross Revenue - Doctor Payments - Expenses - Refunds` |
| **Pharmacy Net Revenue** | `Total Sales - Returns` |

---

## Appendix: Common Scenarios

### Scenario 1: Normal OPD Visit

```
Patient arrives → Reception registers → Pays Rs. 500
  │
  ├─ Finance > Income: +Rs. 500
  ├─ Finance > Dashboard: +Rs. 500
  ├─ Doctor earns: Rs. 200 (40%)
  └─ Hospital earns: Rs. 300 (60%)
```

### Scenario 2: OPD + Pharmacy

```
Patient pays Rs. 500 consultation + Rs. 1,200 medicines
  │
  ├─ Consultation Rs. 500:
  │   ├─ Doctor: Rs. 200
  │   └─ Hospital: Rs. 300
  │
  ├─ Pharmacy Rs. 1,200:
  │   └─ Hospital: Rs. 1,200 (100%)
  │
  └─ Total: Rs. 1,700
      ├─ Doctor: Rs. 200
      └─ Hospital: Rs. 1,500
```

### Scenario 3: IPD Admission to Discharge

```
Admission: Advance Rs. 5,000 collected
  │
During Stay (4 days):
  ├─ Bed: Rs. 4,000 → Hospital
  ├─ Doctor visits: Rs. 2,000 → Split (Rs. 1,200 / Rs. 800)
  ├─ Medicines: Rs. 3,500 → Hospital
  └─ Lab: Rs. 2,200 → Hospital
  │
Discharge: Total Rs. 12,600 - Advance Rs. 5,000 = Due Rs. 7,600
  │
Final Payment: Rs. 7,600 collected
  │
Revenue Distribution:
  ├─ Hospital: Rs. 11,800
  └─ Doctor: Rs. 800
```

### Scenario 4: Emergency Walk-in

```
Emergency patient → Reception clicks [Emergency]
  │
Invoice EMG-001: Rs. 1,500
  │
  └─ 100% to Hospital (Rs. 1,500)
     └─ No doctor split
```

### Scenario 5: Free Consultation (Follow-up)

```
Follow-up patient → Reception clicks [Check Free]
  │
Invoice marked FREE → Rs. 0
  │
  ├─ No revenue recorded
  ├─ Doctor earns Rs. 0
  └─ Shown as "Completed (Free)"
```

---

*Document: Southwest Hospital Kohat — HIMS Financial Flow Guide*
*For technical support, contact your System Administrator*
