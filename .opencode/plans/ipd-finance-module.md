# IPD Finance Module Implementation Plan

## 1. Overview

This plan adds comprehensive IPD (In-Patient Department) financial tracking to the hospital management system, enabling revenue routing by stakeholder (doctor, anesthesiologist, hospital, pharmacy, lab) and dedicated IPD finance pages.

### Database State (Already Applied)
- `ipd_charges` has columns: `assigned_to`, `doctor_id`, `anesthesiologist_id`
- `ipd_invoices` has columns: `anesthesia_charges_total`, `ota_charges_total`, `ot_charges_total`
- `ipd_admissions` has column: `ota_id`
- `ipd_doctor_payments` table exists

### Revenue Routing Rules
| Charge Type | Revenue Destination |
|---|---|
| Doctor fees | Doctor revenue |
| Anesthesia | Anesthesiologist revenue |
| OTA / OT | Hospital revenue |
| IPD medicines | Pharmacy revenue |
| IPD lab tests | Lab revenue |

### Files to Modify
1. `src/components/ipd/DischargeBillDialog.tsx`
2. `src/components/ipd/InitialPaymentDialog.tsx`
3. `src/pages/dashboard/FinanceRoutes.tsx`
4. `src/pages/dashboard/DashboardFinance.tsx`
5. `src/pages/dashboard/finance/FinanceDaily.tsx`

### Files to Create
1. `src/pages/dashboard/finance/FinanceIPD.tsx`
2. `src/pages/dashboard/finance/FinanceIPDDoctorPayments.tsx`

---

## 2. File Modifications

### 2.1 DischargeBillDialog.tsx

**Changes:**
- Persist `doctor_id`, `anesthesiologist_id`, `assigned_to` on `ipd_charges` rows
- Update invoice payload to include `anesthesia_charges_total`, `ota_charges_total`, `ot_charges_total`
- Add revenue category to line items for tracking

**Code Changes:**

```typescript
// Around line 186-202: Update chargeRows mapping to include new fields
const chargeRows = [
  ...items,
  ...manualCharges,
].map(i => ({
  admission_id: admission.id,
  invoice_id: invoiceId,
  charge_type: i.category.toLowerCase(),
  description: i.description,
  quantity: i.qty,
  unit_price: i.unit,
  amount: i.amount,
  // NEW: Assign revenue routing fields
  doctor_id: i.category === "Doctor" ? admission.doctor_id : null,
  anesthesiologist_id: i.category === "Anesthesia" ? (admission.anesthesiologist_id ?? null) : null,
  assigned_to: getAssignedTo(i.category),
}));

// Helper function to determine assigned_to based on category
const getAssignedTo = (category: string): string => {
  switch (category.toLowerCase()) {
    case "doctor": return "doctor";
    case "anesthesia": return "anesthesiologist";
    case "ota": case "ot": return "hospital";
    case "medicine": return "pharmacy";
    case "lab": return "lab";
    default: return "hospital";
  }
};
```

```typescript
// Around line 152-166: Update invoice payload
const payload = {
  admission_id: admission.id,
  patient_id: admission.patient_id,
  bed_charges_total: totals.bed,
  doctor_charges_total: totals.doc,
  anesthesia_charges_total: totals.anes,    // NEW
  ota_charges_total: totals.ota,             // NEW
  ot_charges_total: totals.ot,               // NEW
  medicine_charges_total: totals.med,
  lab_charges_total: totals.lab,
  nursing_charges_total: 0,
  other_charges_total: 0,                    // Changed: no longer bundles anes+ota+ot
  discount: Number(discount) || 0,
  total_amount: totals.total,
  paid_amount: totalDeposit,
  status: totalDeposit >= totals.total ? "paid" : "pending",
  finalized_at: new Date().toISOString(),
};
```

### 2.2 InitialPaymentDialog.tsx

**Changes:**
- Persist `doctor_id`, `anesthesiologist_id`, `assigned_to` on upfront charge rows
- Update invoice payload to include new totals columns

**Code Changes:**

```typescript
// Around line 90-103: Update charge insert
if (chargeRows.length > 0) {
  const { error } = await supabase.from("ipd_charges").insert(
    chargeRows.map(c => ({
      admission_id: admission.id,
      invoice_id: invoiceId,
      charge_type: c.charge_type,
      description: c.description,
      quantity: 1,
      unit_price: c.amount,
      amount: c.amount,
      created_by: profile?.id,
      // NEW: Revenue routing fields
      doctor_id: c.charge_type === "doctor" ? admission.doctor_id : null,
      anesthesiologist_id: c.charge_type === "anesthesia" ? (admission.anesthesiologist_id ?? null) : null,
      assigned_to: c.charge_type === "doctor" ? "doctor" 
                : c.charge_type === "anesthesia" ? "anesthesiologist" 
                : c.charge_type === "ota" ? "hospital" 
                : "hospital",
    }))
  );
  if (error) throw error;
}
```

```typescript
// Around line 106-113: Update invoice update
const { error: invErr } = await supabase.from("ipd_invoices").update({
  paid_amount: newPaid,
  doctor_charges_total: doctorFee,
  anesthesia_charges_total: anesthesiaFee,   // NEW
  ota_charges_total: otaFee,                 // NEW
  ot_charges_total: otCharges,               // NEW
  other_charges_total: 0,                    // Changed
}).eq("id", invoiceId);
```

### 2.3 FinanceRoutes.tsx

**Changes:**
- Add routes for IPD finance pages

```typescript
// Add imports at top
import FinanceIPD from "./finance/FinanceIPD";
import FinanceIPDDoctorPayments from "./finance/FinanceIPDDoctorPayments";

// Add routes inside <Routes>
<Route path="ipd" element={<FinanceIPD />} />
<Route path="ipd-doctor-payments" element={<FinanceIPDDoctorPayments />} />
```

**Full updated file:**
```typescript
import { Routes, Route } from "react-router-dom";
import FinanceLayout from "@/layouts/FinanceLayout";
import DashboardFinance from "./DashboardFinance";
import FinanceIncome from "./finance/FinanceIncome";
import FinanceExpenses from "./finance/FinanceExpenses";
import FinanceAnalytics from "./finance/FinanceAnalytics";
import FinancePayroll from "./finance/FinancePayroll";
import FinanceDoctorPayments from "./finance/FinanceDoctorPayments";
import FinancePharmacy from "./finance/FinancePharmacy";
import FinanceRefunds from "./finance/FinanceRefunds";
import FinanceDaily from "./finance/FinanceDaily";
import FinanceInvoices from "./finance/FinanceInvoices";
import FinanceDiscounts from "./finance/FinanceDiscounts";
import FinanceStaffPayments from "./finance/FinanceStaffPayments";
import FinanceIPD from "./finance/FinanceIPD";
import FinanceIPDDoctorPayments from "./finance/FinanceIPDDoctorPayments";

export default function FinanceRoutes() {
  return (
    <FinanceLayout>
      <Routes>
        <Route index element={<DashboardFinance />} />
        <Route path="daily" element={<FinanceDaily />} />
        <Route path="income" element={<FinanceIncome />} />
        <Route path="expenses" element={<FinanceExpenses />} />
        <Route path="analytics" element={<FinanceAnalytics />} />
        <Route path="payroll" element={<FinancePayroll />} />
        <Route path="doctor-payments" element={<FinanceDoctorPayments />} />
        <Route path="staff-payments" element={<FinanceStaffPayments />} />
        <Route path="pharmacy" element={<FinancePharmacy />} />
        <Route path="refunds" element={<FinanceRefunds />} />
        <Route path="invoices" element={<FinanceInvoices />} />
        <Route path="discounts" element={<FinanceDiscounts />} />
        <Route path="ipd" element={<FinanceIPD />} />
        <Route path="ipd-doctor-payments" element={<FinanceIPDDoctorPayments />} />
      </Routes>
    </FinanceLayout>
  );
}
```

### 2.4 DashboardFinance.tsx

**Changes:**
- Add IPD revenue section with breakdown by category (doctor, anesthesia, OTA/OT, medicines, lab)
- Add IPD revenue to total revenue calculation
- Add quick action button for IPD finance

**Code additions:**

```typescript
// Add new query for IPD finalized invoices (around line 140, after miscIncome query)
const { data: ipdInvoices, isLoading: ipdLoading } = useQuery({
  queryKey: ['ipd-invoices-revenue'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('ipd_invoices')
      .select('*')
      .not('finalized_at', 'is', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }
});

// Add IPD revenue calculations (around line 260, after totalRevenue calculation)
const ipdDoctorRevenue = ipdInvoices?.reduce((sum, inv) => sum + (Number(inv.doctor_charges_total) || 0), 0) || 0;
const ipdAnesthesiaRevenue = ipdInvoices?.reduce((sum, inv) => sum + (Number(inv.anesthesia_charges_total) || 0), 0) || 0;
const ipdOtaRevenue = ipdInvoices?.reduce((sum, inv) => sum + (Number(inv.ota_charges_total) || 0), 0) || 0;
const ipdOtRevenue = ipdInvoices?.reduce((sum, inv) => sum + (Number(inv.ot_charges_total) || 0), 0) || 0;
const ipdBedRevenue = ipdInvoices?.reduce((sum, inv) => sum + (Number(inv.bed_charges_total) || 0), 0) || 0;
const ipdMedicineRevenue = ipdInvoices?.reduce((sum, inv) => sum + (Number(inv.medicine_charges_total) || 0), 0) || 0;
const ipdLabRevenue = ipdInvoices?.reduce((sum, inv) => sum + (Number(inv.lab_charges_total) || 0), 0) || 0;
const ipdTotalRevenue = ipdInvoices?.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0) || 0;
const ipdTotalPaid = ipdInvoices?.reduce((sum, inv) => sum + (Number(inv.paid_amount) || 0), 0) || 0;

// Update totalRevenue to include IPD
const totalRevenue = hospitalRevenue + doctorsRevenue + pharmacyRevenue + ipdTotalRevenue;

// IPD per-doctor breakdown
const ipdPerDoctorRevenue = doctorProfiles?.map(doctor => {
  const profile = doctor.profiles as any;
  const doctorName = profile ? `Dr. ${profile.first_name} ${profile.last_name}` : 'Unknown';
  
  const doctorIpdInvoices = ipdInvoices?.filter(inv => inv.doctor_id === doctor.id) || [];
  const ipdDoctorFees = doctorIpdInvoices.reduce((sum, inv) => sum + (Number(inv.doctor_charges_total) || 0), 0);
  const ipdAnesthesiaFees = doctorIpdInvoices.reduce((sum, inv) => sum + (Number(inv.anesthesia_charges_total) || 0), 0);
  
  return {
    id: doctor.id,
    name: doctorName,
    ipdDoctorFees,
    ipdAnesthesiaFees,
    ipdTotal: ipdDoctorFees + ipdAnesthesiaFees,
    admissionCount: doctorIpdInvoices.length,
  };
})?.filter(d => d.ipdTotal > 0)
  .sort((a, b) => b.ipdTotal - a.ipdTotal) || [];
```

**UI additions — add IPD Revenue section after Pharmacy section:**

```tsx
{/* ========== IPD REVENUE SECTION ========== */}
<Card className="border-l-4 border-l-amber-500">
  <CardHeader className="pb-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-100">
          <BedDouble className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <CardTitle className="text-lg">IPD Revenue</CardTitle>
          <CardDescription>Bed charges, doctor fees, anesthesia, OTA/OT, medicines, lab — routed by stakeholder</CardDescription>
        </div>
      </div>
      <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-base px-3 py-1">
        {formatPkrAmount(ipdTotalRevenue)}
      </Badge>
    </div>
  </CardHeader>
  <CardContent>
    {ipdLoading ? (
      <div className="space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />)}
      </div>
    ) : (
      <div className="space-y-4">
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-amber-50/50">
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold text-right">Amount</TableHead>
                <TableHead className="font-semibold text-right">Revenue To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="flex items-center gap-2"><BedDouble className="w-4 h-4 text-blue-500" />Bed / Stay Charges</TableCell>
                <TableCell className="text-right font-medium">{formatPkrAmount(ipdBedRevenue)}</TableCell>
                <TableCell className="text-right"><Badge variant="secondary">Hospital</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="flex items-center gap-2"><Stethoscope className="w-4 h-4 text-indigo-500" />Doctor Fees</TableCell>
                <TableCell className="text-right font-medium">{formatPkrAmount(ipdDoctorRevenue)}</TableCell>
                <TableCell className="text-right"><Badge variant="outline" className="text-indigo-700">Doctor</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="flex items-center gap-2"><Syringe className="w-4 h-4 text-cyan-500" />Anesthesia</TableCell>
                <TableCell className="text-right font-medium">{formatPkrAmount(ipdAnesthesiaRevenue)}</TableCell>
                <TableCell className="text-right"><Badge variant="outline" className="text-cyan-700">Anesthesiologist</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="flex items-center gap-2"><Activity className="w-4 h-4 text-rose-500" />OTA / OT Charges</TableCell>
                <TableCell className="text-right font-medium">{formatPkrAmount(ipdOtaRevenue + ipdOtRevenue)}</TableCell>
                <TableCell className="text-right"><Badge variant="secondary">Hospital</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="flex items-center gap-2"><Pill className="w-4 h-4 text-purple-500" />Medicines</TableCell>
                <TableCell className="text-right font-medium">{formatPkrAmount(ipdMedicineRevenue)}</TableCell>
                <TableCell className="text-right"><Badge variant="outline" className="text-purple-700">Pharmacy</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="flex items-center gap-2"><FlaskConical className="w-4 h-4 text-teal-500" />Lab Tests</TableCell>
                <TableCell className="text-right font-medium">{formatPkrAmount(ipdLabRevenue)}</TableCell>
                <TableCell className="text-right"><Badge variant="outline" className="text-teal-700">Lab</Badge></TableCell>
              </TableRow>
            </TableBody>
            <TableFooter>
              <TableRow className="bg-amber-50/80">
                <TableCell className="font-bold">Total IPD Revenue</TableCell>
                <TableCell className="text-right font-bold text-amber-700">{formatPkrAmount(ipdTotalRevenue)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
              <TableRow className="bg-green-50/50">
                <TableCell className="font-semibold text-green-700">Total Collected</TableCell>
                <TableCell className="text-right font-semibold text-green-700">{formatPkrAmount(ipdTotalPaid)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
              <TableRow className={ipdTotalRevenue - ipdTotalPaid > 0 ? 'bg-red-50/50' : 'bg-green-50/50'}>
                <TableCell className="font-semibold">Outstanding Balance</TableCell>
                <TableCell className={`text-right font-bold ${ipdTotalRevenue - ipdTotalPaid > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {formatPkrAmount(ipdTotalRevenue - ipdTotalPaid)}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {/* Per-doctor IPD breakdown */}
        {ipdPerDoctorRevenue.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2">Per-Doctor IPD Revenue</h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-amber-50/30">
                    <TableHead>Doctor</TableHead>
                    <TableHead className="text-center">Admissions</TableHead>
                    <TableHead className="text-right">Doctor Fees</TableHead>
                    <TableHead className="text-right">Anesthesia</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ipdPerDoctorRevenue.map(doc => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell className="text-center"><Badge variant="secondary">{doc.admissionCount}</Badge></TableCell>
                      <TableCell className="text-right">{formatPkrAmount(doc.ipdDoctorFees)}</TableCell>
                      <TableCell className="text-right">{formatPkrAmount(doc.ipdAnesthesiaFees)}</TableCell>
                      <TableCell className="text-right font-bold text-amber-700">{formatPkrAmount(doc.ipdTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/finance/ipd')}>
            <Receipt className="w-4 h-4 mr-1" /> IPD Finance Detail
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/finance/ipd-doctor-payments')}>
            <Banknote className="w-4 h-4 mr-1" /> IPD Doctor Payments
          </Button>
        </div>
      </div>
    )}
  </CardContent>
</Card>
```

**Add BedDouble import at top:**
```typescript
import { ..., BedDouble, ... } from "lucide-react";
```

### 2.5 FinanceDaily.tsx

**Changes:**
- Add IPD revenue to daily closing calculations
- Include IPD invoices in revenue breakdown

**Code additions:**

```typescript
// In the dailyData queryFn (around line 68), add IPD invoices fetch
const [
  hospitalInvoicesRes, pharmacyInvoicesRes, labInvoicesRes, xrayReportsRes,
  otSchedulesRes, emergencyRes, expensesRes, refundsRes, miscIncomeRes,
  ipdInvoicesRes  // NEW
] = await Promise.all([
  // ... existing queries ...
  supabase.from('ipd_invoices')
    .select('*')
    .not('finalized_at', 'is', null)
    .gt('created_at', cutoffTime)
    .lte('created_at', upperBound),  // NEW
]);

// Add IPD calculations (after miscellaneousIncome calculation, around line 157)
const ipdInvoices = ipdInvoicesRes.data || [];
const ipdDoctorRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.doctor_charges_total) || 0), 0);
const ipdAnesthesiaRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.anesthesia_charges_total) || 0), 0);
const ipdOtaRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.ota_charges_total) || 0), 0);
const ipdOtRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.ot_charges_total) || 0), 0);
const ipdBedRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.bed_charges_total) || 0), 0);
const ipdMedicineRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.medicine_charges_total) || 0), 0);
const ipdLabRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.lab_charges_total) || 0), 0);
const ipdTotalRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
const ipdTotalPaid = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.paid_amount) || 0), 0);

// Update return object
return {
  // ... existing fields ...
  ipdDoctorRevenue,
  ipdAnesthesiaRevenue,
  ipdOtaRevenue,
  ipdOtRevenue,
  ipdBedRevenue,
  ipdMedicineRevenue,
  ipdLabRevenue,
  ipdTotalRevenue,
  ipdTotalPaid,
  ipdInvoices,
};
```

**Add IPD stats cards in the UI (after Pharmacy Cards section):**

```tsx
{/* IPD Cards */}
<div>
  <h2 className="text-xl font-semibold mb-4">IPD Revenue</h2>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatsCard title="IPD Total" value={formatPkrAmount(dailyData?.ipdTotalRevenue || 0)} icon={<BedDouble className="w-5 h-5 text-amber-600" />} loading={isLoading} />
    <StatsCard title="IPD Doctor Fees" value={formatPkrAmount(dailyData?.ipdDoctorRevenue || 0)} icon={<Stethoscope className="w-5 h-5 text-indigo-600" />} loading={isLoading} />
    <StatsCard title="IPD Bed Charges" value={formatPkrAmount(dailyData?.ipdBedRevenue || 0)} icon={<BedDouble className="w-5 h-5 text-blue-600" />} loading={isLoading} />
    <StatsCard title="IPD Collected" value={formatPkrAmount(dailyData?.ipdTotalPaid || 0)} icon={<Banknote className="w-5 h-5 text-green-600" />} loading={isLoading} />
  </div>
</div>
```

**Add imports:**
```typescript
import { ..., BedDouble } from "lucide-react";
```

---

## 3. New Files

### 3.1 FinanceIPD.tsx

**Path:** `src/pages/dashboard/finance/FinanceIPD.tsx`

```typescript
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { formatInPakistanTime } from "@/utils/timezone";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BedDouble, Stethoscope, Syringe, Activity, Pill, FlaskConical, Calendar, RefreshCw, Download, Receipt, Banknote } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { exportDailyClosingToCSV } from "@/utils/exportUtils";

export default function FinanceIPD() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const formatDateForQuery = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch finalized IPD invoices
  const { data: ipdInvoices, isLoading, refetch } = useQuery({
    queryKey: ['ipd-finance-invoices', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('ipd_invoices')
        .select(`
          *,
          ipd_admissions(
            admission_number,
            admission_date,
            discharge_date,
            status,
            doctor_id,
            wards(name),
            beds(bed_number)
          )
        `)
        .not('finalized_at', 'is', null)
        .order('created_at', { ascending: false });

      if (dateRange?.from) {
        query = query.gte('created_at', formatDateForQuery(dateRange.from));
      }
      if (dateRange?.to) {
        query = query.lte('created_at', formatDateForQuery(dateRange.to) + 'T23:59:59');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch doctors for name lookup
  const { data: doctors } = useQuery({
    queryKey: ['doctors-ipd-finance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctors')
        .select('id, profiles(first_name, last_name)');
      if (error) throw error;
      return data;
    },
  });

  const getDoctorName = (doctorId: string | null) => {
    if (!doctorId) return '—';
    const doc = doctors?.find(d => d.id === doctorId);
    const profile = doc?.profiles as any;
    return profile ? `Dr. ${profile.first_name} ${profile.last_name}` : '—';
  };

  // Calculate totals
  const totals = ipdInvoices?.reduce((acc, inv) => ({
    bed: acc.bed + (Number(inv.bed_charges_total) || 0),
    doctor: acc.doctor + (Number(inv.doctor_charges_total) || 0),
    anesthesia: acc.anesthesia + (Number(inv.anesthesia_charges_total) || 0),
    ota: acc.ota + (Number(inv.ota_charges_total) || 0),
    ot: acc.ot + (Number(inv.ot_charges_total) || 0),
    medicine: acc.medicine + (Number(inv.medicine_charges_total) || 0),
    lab: acc.lab + (Number(inv.lab_charges_total) || 0),
    total: acc.total + (Number(inv.total_amount) || 0),
    paid: acc.paid + (Number(inv.paid_amount) || 0),
  }), { bed: 0, doctor: 0, anesthesia: 0, ota: 0, ot: 0, medicine: 0, lab: 0, total: 0, paid: 0 }) || { bed: 0, doctor: 0, anesthesia: 0, ota: 0, ot: 0, medicine: 0, lab: 0, total: 0, paid: 0 };

  // Revenue by stakeholder
  const hospitalRevenue = totals.bed + totals.ota + totals.ot;
  const doctorRevenue = totals.doctor;
  const anesthesiologistRevenue = totals.anesthesia;
  const pharmacyRevenue = totals.medicine;
  const labRevenue = totals.lab;

  const handleExportCSV = () => {
    if (!ipdInvoices?.length) {
      toast.error("No data to export");
      return;
    }
    const rows = ipdInvoices.map(inv => ({
      invoice_number: inv.invoice_number,
      admission_number: (inv.ipd_admissions as any)?.admission_number,
      patient: '',
      admission_date: inv.ipd_admissions?.admission_date,
      discharge_date: inv.ipd_admissions?.discharge_date,
      doctor: getDoctorName(inv.ipd_admissions?.doctor_id),
      bed_charges: Number(inv.bed_charges_total) || 0,
      doctor_fees: Number(inv.doctor_charges_total) || 0,
      anesthesia: Number(inv.anesthesia_charges_total) || 0,
      ota: Number(inv.ota_charges_total) || 0,
      ot: Number(inv.ot_charges_total) || 0,
      medicines: Number(inv.medicine_charges_total) || 0,
      lab: Number(inv.lab_charges_total) || 0,
      total: Number(inv.total_amount) || 0,
      paid: Number(inv.paid_amount) || 0,
      balance: (Number(inv.total_amount) || 0) - (Number(inv.paid_amount) || 0),
      finalized_at: inv.finalized_at,
    }));
    
    const csvContent = [
      ['Invoice', 'Admission', 'Admission Date', 'Discharge Date', 'Doctor', 'Bed', 'Doctor Fees', 'Anesthesia', 'OTA', 'OT', 'Medicines', 'Lab', 'Total', 'Paid', 'Balance', 'Finalized'].join(','),
      ...rows.map(r => [
        r.invoice_number, r.admission_number, r.admission_date, r.discharge_date,
        r.doctor, r.bed_charges, r.doctor_fees, r.anesthesia, r.ota, r.ot,
        r.medicines, r.lab, r.total, r.paid, r.balance, r.finalized_at
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ipd-finance-${formatDateForQuery(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("IPD finance data exported");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">IPD Finance</h2>
          <p className="text-sm text-muted-foreground">In-Patient Department revenue breakdown by stakeholder</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!ipdInvoices?.length}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4 items-end">
            <div>
              <Label>From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !dateRange?.from && "text-muted-foreground")}>
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange?.from ? format(dateRange.from, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent mode="single" selected={dateRange?.from} onSelect={(d) => setDateRange(prev => ({ ...prev, from: d }))} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !dateRange?.to && "text-muted-foreground")}>
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange?.to ? format(dateRange.to, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent mode="single" selected={dateRange?.to} onSelect={(d) => setDateRange(prev => ({ ...prev, to: d }))} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Total IPD</p>
            <p className="text-lg font-bold text-amber-700 mt-1">{formatPkrAmount(totals.total)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Bed Charges</p>
            <p className="text-lg font-bold text-blue-700 mt-1">{formatPkrAmount(totals.bed)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Doctor Fees</p>
            <p className="text-lg font-bold text-indigo-700 mt-1">{formatPkrAmount(totals.doctor)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-50 to-teal-50 border-cyan-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Anesthesia</p>
            <p className="text-lg font-bold text-cyan-700 mt-1">{formatPkrAmount(totals.anesthesia)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-fuchsia-50 border-purple-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Medicines</p>
            <p className="text-lg font-bold text-purple-700 mt-1">{formatPkrAmount(totals.medicine)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Lab Tests</p>
            <p className="text-lg font-bold text-teal-700 mt-1">{formatPkrAmount(totals.lab)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Stakeholder */}
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Revenue by Stakeholder</CardTitle>
          <CardDescription>How IPD revenue is distributed</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-amber-50/50">
                <TableHead>Stakeholder</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="flex items-center gap-2"><BedDouble className="w-4 h-4 text-blue-500" />Hospital (Bed + OTA + OT)</TableCell>
                <TableCell className="text-right font-medium">{formatPkrAmount(hospitalRevenue)}</TableCell>
                <TableCell className="text-right">{totals.total > 0 ? ((hospitalRevenue / totals.total) * 100).toFixed(1) : 0}%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="flex items-center gap-2"><Stethoscope className="w-4 h-4 text-indigo-500" />Doctor Fees</TableCell>
                <TableCell className="text-right font-medium">{formatPkrAmount(doctorRevenue)}</TableCell>
                <TableCell className="text-right">{totals.total > 0 ? ((doctorRevenue / totals.total) * 100).toFixed(1) : 0}%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="flex items-center gap-2"><Syringe className="w-4 h-4 text-cyan-500" />Anesthesiologist</TableCell>
                <TableCell className="text-right font-medium">{formatPkrAmount(anesthesiologistRevenue)}</TableCell>
                <TableCell className="text-right">{totals.total > 0 ? ((anesthesiologistRevenue / totals.total) * 100).toFixed(1) : 0}%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="flex items-center gap-2"><Pill className="w-4 h-4 text-purple-500" />Pharmacy (IPD Medicines)</TableCell>
                <TableCell className="text-right font-medium">{formatPkrAmount(pharmacyRevenue)}</TableCell>
                <TableCell className="text-right">{totals.total > 0 ? ((pharmacyRevenue / totals.total) * 100).toFixed(1) : 0}%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="flex items-center gap-2"><FlaskConical className="w-4 h-4 text-teal-500" />Lab (IPD Tests)</TableCell>
                <TableCell className="text-right font-medium">{formatPkrAmount(labRevenue)}</TableCell>
                <TableCell className="text-right">{totals.total > 0 ? ((labRevenue / totals.total) * 100).toFixed(1) : 0}%</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter>
              <TableRow className="bg-amber-50/80">
                <TableCell className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold text-amber-700">{formatPkrAmount(totals.total)}</TableCell>
                <TableCell className="text-right font-bold">100%</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {/* Invoice List */}
      <Card>
        <CardHeader>
          <CardTitle>IPD Invoices</CardTitle>
          <CardDescription>{ipdInvoices?.length || 0} finalized invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />)}</div>
          ) : !ipdInvoices?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No finalized IPD invoices found</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Admission #</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead className="text-right">Bed</TableHead>
                    <TableHead className="text-right">Doctor</TableHead>
                    <TableHead className="text-right">Anesthesia</TableHead>
                    <TableHead className="text-right">OTA/OT</TableHead>
                    <TableHead className="text-right">Medicine</TableHead>
                    <TableHead className="text-right">Lab</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ipdInvoices.map(inv => {
                    const adm = inv.ipd_admissions as any;
                    const balance = (Number(inv.total_amount) || 0) - (Number(inv.paid_amount) || 0);
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                        <TableCell className="text-xs">{adm?.admission_number}</TableCell>
                        <TableCell className="text-xs">{getDoctorName(adm?.doctor_id)}</TableCell>
                        <TableCell className="text-right text-xs">{formatPkrAmount(Number(inv.bed_charges_total) || 0)}</TableCell>
                        <TableCell className="text-right text-xs">{formatPkrAmount(Number(inv.doctor_charges_total) || 0)}</TableCell>
                        <TableCell className="text-right text-xs">{formatPkrAmount(Number(inv.anesthesia_charges_total) || 0)}</TableCell>
                        <TableCell className="text-right text-xs">{formatPkrAmount((Number(inv.ota_charges_total) || 0) + (Number(inv.ot_charges_total) || 0))}</TableCell>
                        <TableCell className="text-right text-xs">{formatPkrAmount(Number(inv.medicine_charges_total) || 0)}</TableCell>
                        <TableCell className="text-right text-xs">{formatPkrAmount(Number(inv.lab_charges_total) || 0)}</TableCell>
                        <TableCell className="text-right font-medium text-xs">{formatPkrAmount(Number(inv.total_amount) || 0)}</TableCell>
                        <TableCell className="text-right text-xs text-green-600">{formatPkrAmount(Number(inv.paid_amount) || 0)}</TableCell>
                        <TableCell className={`text-right font-medium text-xs ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatPkrAmount(balance)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={3} className="font-bold">Totals ({ipdInvoices.length} invoices)</TableCell>
                    <TableCell className="text-right font-medium">{formatPkrAmount(totals.bed)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPkrAmount(totals.doctor)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPkrAmount(totals.anesthesia)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPkrAmount(totals.ota + totals.ot)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPkrAmount(totals.medicine)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPkrAmount(totals.lab)}</TableCell>
                    <TableCell className="text-right font-bold">{formatPkrAmount(totals.total)}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">{formatPkrAmount(totals.paid)}</TableCell>
                    <TableCell className={`text-right font-bold ${totals.total - totals.paid > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatPkrAmount(totals.total - totals.paid)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3.2 FinanceIPDDoctorPayments.tsx

**Path:** `src/pages/dashboard/finance/FinanceIPDDoctorPayments.tsx`

```typescript
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { formatInPakistanTime } from "@/utils/timezone";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Stethoscope, Banknote, Calendar, RefreshCw, Download, CheckCircle, Loader2, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function FinanceIPDDoctorPayments() {
  const queryClient = useQueryClient();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNotes, setPaymentNotes] = useState("");

  // Fetch IPD invoices with doctor info
  const { data: ipdInvoices, isLoading } = useQuery({
    queryKey: ['ipd-doctor-payment-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ipd_invoices')
        .select(`
          *,
          ipd_admissions(
            admission_number,
            admission_date,
            discharge_date,
            status,
            doctor_id
          )
        `)
        .not('finalized_at', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch doctors
  const { data: doctors } = useQuery({
    queryKey: ['doctors-ipd-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctors')
        .select('id, profiles(first_name, last_name, email)');
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing doctor payments
  const { data: doctorPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['ipd-doctor-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ipd_doctor_payments')
        .select('*')
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getDoctorName = (doctorId: string | null) => {
    if (!doctorId) return '—';
    const doc = doctors?.find(d => d.id === doctorId);
    const profile = doc?.profiles as any;
    return profile ? `Dr. ${profile.first_name} ${profile.last_name}` : '—';
  };

  // Calculate per-doctor earnings from IPD
  const perDoctorEarnings = doctors?.map(doctor => {
    const profile = doctor.profiles as any;
    const doctorName = profile ? `Dr. ${profile.first_name} ${profile.last_name}` : 'Unknown';
    
    const doctorInvoices = ipdInvoices?.filter(inv => inv.ipd_admissions?.doctor_id === doctor.id) || [];
    const doctorFees = doctorInvoices.reduce((sum, inv) => sum + (Number(inv.doctor_charges_total) || 0), 0);
    const anesthesiaFees = doctorInvoices.reduce((sum, inv) => sum + (Number(inv.anesthesia_charges_total) || 0), 0);
    const totalEarned = doctorFees + anesthesiaFees;
    
    const payments = doctorPayments?.filter(p => p.doctor_id === doctor.id) || [];
    const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
    return {
      id: doctor.id,
      name: doctorName,
      email: profile?.email,
      doctorFees,
      anesthesiaFees,
      totalEarned,
      totalPaid,
      balance: totalEarned - totalPaid,
      invoiceCount: doctorInvoices.length,
      paymentCount: payments.length,
    };
  })?.filter(d => d.totalEarned > 0 || d.totalPaid > 0)
    .sort((a, b) => b.balance - a.balance) || [];

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async ({ doctorId, amount, notes }: { doctorId: string; amount: number; notes: string }) => {
      const { data, error } = await supabase
        .from('ipd_doctor_payments')
        .insert({
          doctor_id: doctorId,
          amount,
          payment_date: new Date().toISOString(),
          notes,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      queryClient.invalidateQueries({ queryKey: ['ipd-doctor-payments'] });
      queryClient.invalidateQueries({ queryKey: ['ipd-doctor-payment-invoices'] });
      setShowPaymentDialog(false);
      setPaymentAmount(0);
      setPaymentNotes("");
      setSelectedDoctor(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });

  const handleExportCSV = () => {
    if (!perDoctorEarnings.length) {
      toast.error("No data to export");
      return;
    }
    const csvContent = [
      ['Doctor', 'Doctor Fees', 'Anesthesia Fees', 'Total Earned', 'Total Paid', 'Balance', 'Invoices', 'Payments'].join(','),
      ...perDoctorEarnings.map(d => [
        d.name, d.doctorFees, d.anesthesiaFees, d.totalEarned, d.totalPaid, d.balance, d.invoiceCount, d.paymentCount
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ipd-doctor-payments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Doctor payments exported");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">IPD Doctor Payments</h2>
          <p className="text-sm text-muted-foreground">Track and manage doctor payments from IPD admissions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!perDoctorEarnings.length}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Per-Doctor Earnings */}
      <Card>
        <CardHeader>
          <CardTitle>Doctor Earnings & Payment Status</CardTitle>
          <CardDescription>IPD doctor fees and anesthesia fees vs payments made</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || paymentsLoading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />)}</div>
          ) : !perDoctorEarnings.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Stethoscope className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No doctor earnings recorded yet</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-indigo-50/50">
                    <TableHead>Doctor</TableHead>
                    <TableHead className="text-right">Doctor Fees</TableHead>
                    <TableHead className="text-right">Anesthesia</TableHead>
                    <TableHead className="text-right">Total Earned</TableHead>
                    <TableHead className="text-right">Total Paid</TableHead>
                    <TableHead className="text-right">Balance Due</TableHead>
                    <TableHead className="text-center">Admissions</TableHead>
                    <TableHead className="text-center">Payments</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perDoctorEarnings.map(doc => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell className="text-right">{formatPkrAmount(doc.doctorFees)}</TableCell>
                      <TableCell className="text-right">{formatPkrAmount(doc.anesthesiaFees)}</TableCell>
                      <TableCell className="text-right font-medium">{formatPkrAmount(doc.totalEarned)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatPkrAmount(doc.totalPaid)}</TableCell>
                      <TableCell className={`text-right font-bold ${doc.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatPkrAmount(doc.balance)}
                      </TableCell>
                      <TableCell className="text-center"><Badge variant="secondary">{doc.invoiceCount}</Badge></TableCell>
                      <TableCell className="text-center"><Badge variant="outline">{doc.paymentCount}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDoctor(doc);
                            setPaymentAmount(Math.max(0, doc.balance));
                            setShowPaymentDialog(true);
                          }}
                          disabled={doc.balance <= 0}
                        >
                          <Plus className="w-4 h-4 mr-1" /> Pay
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-indigo-50/80">
                    <TableCell className="font-bold">Total</TableCell>
                    <TableCell className="text-right font-bold">{formatPkrAmount(perDoctorEarnings.reduce((s, d) => s + d.doctorFees, 0))}</TableCell>
                    <TableCell className="text-right font-bold">{formatPkrAmount(perDoctorEarnings.reduce((s, d) => s + d.anesthesiaFees, 0))}</TableCell>
                    <TableCell className="text-right font-bold">{formatPkrAmount(perDoctorEarnings.reduce((s, d) => s + d.totalEarned, 0))}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">{formatPkrAmount(perDoctorEarnings.reduce((s, d) => s + d.totalPaid, 0))}</TableCell>
                    <TableCell className={`text-right font-bold ${perDoctorEarnings.reduce((s, d) => s + d.balance, 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatPkrAmount(perDoctorEarnings.reduce((s, d) => s + d.balance, 0))}
                    </TableCell>
                    <TableCell className="text-center font-bold">{perDoctorEarnings.reduce((s, d) => s + d.invoiceCount, 0)}</TableCell>
                    <TableCell className="text-center font-bold">{perDoctorEarnings.reduce((s, d) => s + d.paymentCount, 0)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      {doctorPayments && doctorPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Recent payments made to doctors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctorPayments.map(payment => (
                    <TableRow key={payment.id}>
                      <TableCell className="text-xs">{formatInPakistanTime(new Date(payment.payment_date), 'MMM d, yyyy h:mm a')}</TableCell>
                      <TableCell className="font-medium">{getDoctorName(payment.doctor_id)}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">{formatPkrAmount(Number(payment.amount) || 0)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{payment.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5" />
              Record Payment — {selectedDoctor?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted rounded-md p-3 text-sm space-y-1">
              <div className="flex justify-between"><span>Total Earned</span><span className="font-medium">{formatPkrAmount(selectedDoctor?.totalEarned || 0)}</span></div>
              <div className="flex justify-between"><span>Already Paid</span><span className="text-green-600">{formatPkrAmount(selectedDoctor?.totalPaid || 0)}</span></div>
              <div className="flex justify-between font-bold border-t pt-1"><span>Balance Due</span><span className="text-red-600">{formatPkrAmount(selectedDoctor?.balance || 0)}</span></div>
            </div>
            <div>
              <Label>Payment Amount</Label>
              <Input type="number" value={paymentAmount || ""} onChange={e => setPaymentAmount(Number(e.target.value) || 0)} placeholder="0" />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} placeholder="e.g., Monthly settlement" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} disabled={createPaymentMutation.isPending}>Cancel</Button>
            <Button
              onClick={() => {
                if (!selectedDoctor || paymentAmount <= 0) {
                  toast.error("Enter a valid payment amount");
                  return;
                }
                createPaymentMutation.mutate({
                  doctorId: selectedDoctor.id,
                  amount: paymentAmount,
                  notes: paymentNotes,
                });
              }}
              disabled={createPaymentMutation.isPending || paymentAmount <= 0}
            >
              {createPaymentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <CheckCircle className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

## 4. Testing Checklist

### Unit / Component Tests
- [ ] `DischargeBillDialog` correctly persists `doctor_id`, `anesthesiologist_id`, `assigned_to` on `ipd_charges`
- [ ] `DischargeBillDialog` invoice payload includes `anesthesia_charges_total`, `ota_charges_total`, `ot_charges_total`
- [ ] `InitialPaymentDialog` correctly persists revenue routing fields on upfront charges
- [ ] `InitialPaymentDialog` invoice update includes new total columns
- [ ] `FinanceRoutes` renders `/dashboard/finance/ipd` and `/dashboard/finance/ipd-doctor-payments`
- [ ] `DashboardFinance` displays IPD revenue section with correct totals
- [ ] `FinanceDaily` includes IPD revenue in daily closing calculations
- [ ] `FinanceIPD` loads and displays finalized IPD invoices
- [ ] `FinanceIPD` date range filter works correctly
- [ ] `FinanceIPD` CSV export generates valid CSV
- [ ] `FinanceIPDDoctorPayments` calculates per-doctor earnings correctly
- [ ] `FinanceIPDDoctorPayments` payment dialog records payment to `ipd_doctor_payments`
- [ ] `FinanceIPDDoctorPayments` payment history displays correctly

### Integration Tests
- [ ] Creating an IPD admission → collecting initial payment → finalizing discharge creates consistent invoice + charges
- [ ] Revenue routing: doctor fees appear in doctor revenue, anesthesia in anesthesiologist revenue, OTA/OT in hospital revenue
- [ ] IPD medicines route to pharmacy revenue, IPD lab tests route to lab revenue
- [ ] Daily closing includes IPD revenue in totals
- [ ] Finance dashboard IPD section matches FinanceIPD detail page totals

### Manual Testing
- [ ] Navigate to `/dashboard/finance` → IPD Revenue section visible with breakdown
- [ ] Click "IPD Finance Detail" → navigates to `/dashboard/finance/ipd`
- [ ] Click "IPD Doctor Payments" → navigates to `/dashboard/finance/ipd-doctor-payments`
- [ ] Date filter on FinanceIPD filters invoices correctly
- [ ] CSV export from FinanceIPD opens download with correct data
- [ ] Record payment to doctor → balance updates → payment appears in history
- [ ] Discharge bill with upfront charges shows "already collected" line items
- [ ] Discharge bill without upfront charges allows entry of all charges
- [ ] Revenue percentages in FinanceIPD stakeholder table sum to ~100%

### Edge Cases
- [ ] IPD admission with no doctor fees (only bed charges)
- [ ] IPD admission with anesthesia but no OTA
- [ ] IPD admission with zero medicine/lab charges
- [ ] Multiple payments to same doctor
- [ ] Payment amount exceeding balance
- [ ] No finalized IPD invoices (empty state displays correctly)
- [ ] Date range with no invoices in range

### RLS / Permissions
- [ ] Finance role can view IPD invoices and charges
- [ ] Finance role can create doctor payments
- [ ] IPD staff can view but not modify finalized invoices
- [ ] Doctor can only see their own IPD admissions/revenue

---

## 5. Implementation Order

1. **Modify `DischargeBillDialog.tsx`** — Add revenue routing fields to charge persistence
2. **Modify `InitialPaymentDialog.tsx`** — Add revenue routing fields to upfront charge persistence
3. **Modify `FinanceRoutes.tsx`** — Add new route entries
4. **Create `FinanceIPD.tsx`** — IPD finance detail page
5. **Create `FinanceIPDDoctorPayments.tsx`** — IPD doctor payment tracking
6. **Modify `DashboardFinance.tsx`** — Add IPD revenue section
7. **Modify `FinanceDaily.tsx`** — Add IPD to daily closing
8. **Run lint/typecheck** — `npm run lint && npm run typecheck` (or project equivalent)
9. **Manual testing** — Follow checklist above
