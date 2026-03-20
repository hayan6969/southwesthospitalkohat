
import { StatsCard } from "@/components/StatsCard";
import { Calculator, TrendingUp, Users, Receipt, Banknote, Minus, Pill, TrendingDown, Building2, Stethoscope, FlaskConical, Syringe, AlertTriangle, Activity, FileSpreadsheet, Scan } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInvoices, useStats } from "@/hooks/useDatabase";
import { formatPkrAmount } from "@/utils/currency";
import { useHospitalSettings } from "@/hooks/useHospitalSettings";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { formatInPakistanTime } from "@/utils/timezone";
import { exportDailyClosingToCSV } from "@/utils/exportUtils";

export default function DashboardFinance() {
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const { data: stats, isLoading: statsLoading } = useStats();
  const { settings: hospitalSettings } = useHospitalSettings();
  const navigate = useNavigate();
  
  // Get pharmacy invoices with items for profit calculation
  const { data: pharmacyInvoices, isLoading: pharmacyLoading } = useQuery({
    queryKey: ['pharmacy-invoices-with-profit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pharmacy_invoices')
        .select(`
          *,
          pharmacy_invoice_items(
            quantity,
            unit_price,
            total_price,
            medicine_id,
            medicines(purchase_price, selling_price)
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Get lab reports for revenue
  const { data: labReports, isLoading: labLoading } = useQuery({
    queryKey: ['lab-reports-revenue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Get OT schedules for revenue calculation
  const { data: otSchedules, isLoading: otLoading } = useQuery({
    queryKey: ['ot-schedules-revenue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ot_schedules')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Get expenses
  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Get refunds
  const { data: refunds } = useQuery({
    queryKey: ['refunds-finance-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('refunds')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Get pharmacy account and expenses
  const { data: pharmacyAccount } = useQuery({
    queryKey: ['pharmacy-account'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pharmacy_account')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  const { data: pharmacyExpenses } = useQuery({
    queryKey: ['pharmacy-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pharmacy_expenses')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Get X-ray reports
  const { data: xrayReports } = useQuery({
    queryKey: ['xray-reports-revenue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('xray_reports')
        .select('*')
        .not('price', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Get miscellaneous income
  const { data: miscIncome } = useQuery({
    queryKey: ['misc-income-revenue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('miscellaneous_income')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Get per-doctor revenue data
  const { data: doctorProfiles, isLoading: doctorsLoading } = useQuery({
    queryKey: ['doctor-profiles-revenue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctors')
        .select('id, consultation_fee, profiles(first_name, last_name, email)')
        .order('id');
      if (error) throw error;
      return data;
    }
  });

  // Get staff profiles for operator tracking
  const { data: staffProfiles } = useQuery({
    queryKey: ['staff-profiles-operators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .in('role', ['staff', 'admin', 'finance']);
      if (error) throw error;
      return data;
    }
  });

  // Helper to get operator name
  const getOperatorName = (createdBy: string | null) => {
    if (!createdBy) return '—';
    const staff = staffProfiles?.find(s => s.id === createdBy);
    return staff ? `${staff.first_name} ${staff.last_name}` : '—';
  };

  // Deduplicate invoices helper (same patient, same amount, within 2 min)
  const deduplicateInvs = (invs: typeof invoices) => {
    if (!invs) return [];
    const kept: typeof invs = [];
    for (const inv of invs) {
      const amt = Number(inv.amount ?? 0);
      const ts = inv.created_at ? new Date(inv.created_at).getTime() : 0;
      const isDup = kept.some(
        (e) =>
          e.patient_id === inv.patient_id &&
          Number(e.amount ?? 0) === amt &&
          Math.abs((e.created_at ? new Date(e.created_at).getTime() : 0) - ts) <= 2 * 60 * 1000
      );
      if (!isDup) kept.push(inv);
    }
    return kept;
  };

  const paidInvoices = deduplicateInvs(invoices?.filter(inv => inv.status === 'paid'));

  // Emergency detection — consistent with PDF logic
  const isEmergencyInv = (inv: any) =>
    inv.description?.toLowerCase().includes('emergency') ||
    inv.emergency_patient_data ||
    inv.invoice_number?.startsWith('EMG-') ||
    inv.invoice_number?.startsWith('EMERGENCY-');

  // Hospital revenue from paid invoices — using invoice_number prefix (consistent with PDF)
  const emergencyConsultationRevenue = paidInvoices
    .filter(isEmergencyInv)
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);

  // Regular consultation revenue (OPD — INV- prefix, non-emergency)
  const consultationRevenue = paidInvoices
    .filter(inv => inv.invoice_number?.startsWith('INV-') && !isEmergencyInv(inv))
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  
  // Calculate pharmacy revenue and profit correctly
  let pharmacyRevenue = 0;
  let pharmacyProfit = 0;
  
  if (pharmacyInvoices) {
    pharmacyRevenue = pharmacyInvoices.reduce((sum, inv) => sum + (inv.final_amount || 0), 0);
    pharmacyProfit = pharmacyInvoices.reduce((totalProfit, invoice) => {
      const invoiceProfit = (invoice.pharmacy_invoice_items || []).reduce((itemsProfit, item) => {
        if (item.medicines && item.medicines.selling_price && item.medicines.purchase_price) {
          const profitPerUnit = item.medicines.selling_price - item.medicines.purchase_price;
          return itemsProfit + (profitPerUnit * item.quantity);
        }
        return itemsProfit;
      }, 0);
      return totalProfit + invoiceProfit;
    }, 0);
  }
  
  // Lab revenue — from LAB- prefixed invoices (consistent with PDF)
  const labRevenue = paidInvoices
    .filter(inv => inv.invoice_number?.startsWith('LAB-'))
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  const xrayRevenue = xrayReports?.reduce((sum, xray) => sum + (Number(xray.price) || 0), 0) || 0;
  
  const otHospitalRevenue = otSchedules?.reduce((sum, schedule) => {
    if (!schedule.total_cost || !schedule.doctor_expense) return sum;
    return sum + (Number(schedule.total_cost) - Number(schedule.doctor_expense));
  }, 0) || 0;

  const otDoctorRevenue = otSchedules?.reduce((sum, schedule) => {
    return sum + (Number(schedule.doctor_expense) || 0);
  }, 0) || 0;

  const miscellaneousIncome = miscIncome?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0;
  
  const doctorsRevenue = consultationRevenue + otDoctorRevenue;
  const hospitalRevenue = emergencyConsultationRevenue + labRevenue + xrayRevenue + otHospitalRevenue + miscellaneousIncome;
  const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
  const totalRefunds = refunds?.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0;
  // CORRECT FORMULA: Hospital Share + Pharmacy Profit - Expenses - Refunds
  const hospitalNetProfit = hospitalRevenue + pharmacyProfit - totalExpenses - totalRefunds;
  const totalRevenue = hospitalRevenue + doctorsRevenue + pharmacyRevenue;
  const pharmacyTotalExpenses = pharmacyExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

  // Per-doctor revenue breakdown
  const perDoctorRevenue = doctorProfiles?.map(doctor => {
    const profile = doctor.profiles as any;
    const doctorName = profile ? `Dr. ${profile.first_name} ${profile.last_name}` : 'Unknown';
    
    const drConsultation = invoices?.filter(inv =>
      inv.status === 'paid' &&
      inv.doctor_id === doctor.id &&
      inv.description?.toLowerCase().includes('consultation') &&
      !inv.description?.toLowerCase().includes('emergency')
    ).reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;

    const drOT = otSchedules?.filter(s => s.doctor_id === doctor.id)
      .reduce((sum, s) => sum + (Number(s.doctor_expense) || 0), 0) || 0;

    const appointmentCount = invoices?.filter(inv =>
      inv.status === 'paid' &&
      inv.doctor_id === doctor.id &&
      inv.description?.toLowerCase().includes('consultation') &&
      !inv.description?.toLowerCase().includes('emergency')
    ).length || 0;

    const otCount = otSchedules?.filter(s => s.doctor_id === doctor.id).length || 0;

    return {
      id: doctor.id,
      name: doctorName,
      consultationRevenue: drConsultation,
      otRevenue: drOT,
      totalRevenue: drConsultation + drOT,
      appointmentCount,
      otCount,
    };
  })?.filter(d => d.totalRevenue > 0 || d.appointmentCount > 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue) || [];

  // Per-staff revenue (counter invoices created_by)
  const perStaffRevenue = staffProfiles?.map(staff => {
    const staffInvoices = invoices?.filter(inv => 
      inv.status === 'paid' && (inv as any).created_by === staff.id
    ) || [];
    const totalGenerated = staffInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    return {
      id: staff.id,
      name: `${staff.first_name} ${staff.last_name}`,
      role: staff.role,
      invoiceCount: staffInvoices.length,
      totalGenerated,
    };
  })?.filter(s => s.totalGenerated > 0)
    .sort((a, b) => b.totalGenerated - a.totalGenerated) || [];

  // Calculate monthly revenue
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyHospitalRevenue = invoices?.filter(inv => {
    const d = new Date(inv.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear &&
      inv.status === 'paid' && inv.description?.toLowerCase().includes('emergency');
  }).reduce((s, i) => s + (i.amount || 0), 0) || 0;

  const monthlyDoctorsRevenue = invoices?.filter(inv => {
    const d = new Date(inv.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear &&
      inv.status === 'paid' && inv.description?.toLowerCase().includes('consultation') &&
      !inv.description?.toLowerCase().includes('emergency');
  }).reduce((s, i) => s + (i.amount || 0), 0) || 0;

  const monthlyPharmacyRevenue = pharmacyInvoices?.filter(inv => {
    const d = new Date(inv.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).reduce((s, i) => s + (i.final_amount || 0), 0) || 0;

  const monthlyRevenue = monthlyHospitalRevenue + monthlyDoctorsRevenue + monthlyPharmacyRevenue;
  const maxDoctorRevenue = perDoctorRevenue.length > 0 ? perDoctorRevenue[0].totalRevenue : 1;

  // Export full report
  const handleExportCSV = () => {
    exportDailyClosingToCSV({
      date: format(new Date(), 'yyyy-MM-dd'),
      hospitalRevenue,
      doctorRevenue: doctorsRevenue,
      consultationRevenue,
      otDoctorExpense: otDoctorRevenue,
      emergencyRevenue: emergencyConsultationRevenue,
      labRevenue,
      xrayRevenue,
      otHospitalRevenue,
      miscellaneousIncome,
      pharmacyRevenue,
      pharmacyProfit,
      totalExpenses,
      totalRefunds: 0,
      netProfit: hospitalNetProfit,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Financial Overview</h2>
          <p className="text-sm text-muted-foreground">
            {hospitalSettings?.hospital_name || 'Hospital'} — {format(new Date(), 'EEEE, dd MMMM yyyy')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Total Revenue</p>
            <p className="text-xl font-bold text-green-700 mt-1">{formatPkrAmount(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Total Expenses</p>
            <p className="text-xl font-bold text-red-700 mt-1">-{formatPkrAmount(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Hospital Net Profit</p>
            <p className={`text-xl font-bold mt-1 ${hospitalNetProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
              {formatPkrAmount(hospitalNetProfit)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Doctors Revenue</p>
            <p className="text-xl font-bold text-indigo-700 mt-1">{formatPkrAmount(doctorsRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* ========== HOSPITAL REVENUE SECTION ========== */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Building2 className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <CardTitle className="text-lg">Hospital Revenue & Profit</CardTitle>
                <CardDescription>Emergency, Lab, X-Ray, OT (Hospital Share), Miscellaneous — includes expenses & net profit</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50 text-base px-3 py-1">
              {formatPkrAmount(hospitalRevenue)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-blue-50/50">
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold text-right">Hos. Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Emergency Services
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatPkrAmount(emergencyConsultationRevenue)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-teal-500" />
                    Lab Services
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatPkrAmount(labRevenue)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="flex items-center gap-2">
                    <Scan className="w-4 h-4 text-cyan-500" />
                    X-Ray Services
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatPkrAmount(xrayRevenue)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="flex items-center gap-2">
                    <Syringe className="w-4 h-4 text-rose-500" />
                    OT (Hospital Portion)
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatPkrAmount(otHospitalRevenue)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-purple-500" />
                    Pharmacy Profit
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatPkrAmount(pharmacyProfit)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-500" />
                    Miscellaneous Income
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatPkrAmount(miscellaneousIncome)}</TableCell>
                </TableRow>
              </TableBody>
              <TableFooter>
                <TableRow className="bg-blue-50/80">
                  <TableCell className="font-bold">Total Hospital Revenue</TableCell>
                  <TableCell className="text-right font-bold text-blue-700">{formatPkrAmount(hospitalRevenue + pharmacyProfit)}</TableCell>
                </TableRow>
                <TableRow className="bg-red-50/50">
                  <TableCell className="font-semibold text-red-700">Less: Expenses</TableCell>
                  <TableCell className="text-right font-semibold text-red-700">-{formatPkrAmount(totalExpenses)}</TableCell>
                </TableRow>
                <TableRow className={hospitalNetProfit >= 0 ? 'bg-green-50/80' : 'bg-red-50/80'}>
                  <TableCell className="font-bold text-base">Hospital Net Profit</TableCell>
                  <TableCell className={`text-right font-bold text-base ${hospitalNetProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatPkrAmount(hospitalNetProfit)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ========== DOCTORS REVENUE SECTION ========== */}
      <Card className="border-l-4 border-l-indigo-500">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100">
                <Stethoscope className="w-5 h-5 text-indigo-700" />
              </div>
              <div>
                <CardTitle className="text-lg">Doctors Revenue</CardTitle>
                <CardDescription>Consultation fees (Doc. Share) + OT Doctor Fees — per doctor breakdown</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-indigo-700 border-indigo-300 bg-indigo-50 text-base px-3 py-1">
              {formatPkrAmount(doctorsRevenue)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {doctorsLoading || invoicesLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />)}
            </div>
          ) : perDoctorRevenue.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-indigo-50/50">
                    <TableHead className="font-semibold">Doctor Name</TableHead>
                    <TableHead className="font-semibold text-center">Consultations</TableHead>
                    <TableHead className="font-semibold text-center">OT</TableHead>
                    <TableHead className="font-semibold text-right">Consultation Fee</TableHead>
                    <TableHead className="font-semibold text-right">OT Fee</TableHead>
                    <TableHead className="font-semibold text-right">Doc. Share (Total)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perDoctorRevenue.map((doctor) => (
                    <TableRow key={doctor.id}>
                      <TableCell className="font-medium">{doctor.name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs">{doctor.appointmentCount}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">{doctor.otCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatPkrAmount(doctor.consultationRevenue)}</TableCell>
                      <TableCell className="text-right">{formatPkrAmount(doctor.otRevenue)}</TableCell>
                      <TableCell className="text-right font-bold text-indigo-700">{formatPkrAmount(doctor.totalRevenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-indigo-50/80">
                    <TableCell colSpan={3} className="font-bold">Total Doctors Revenue</TableCell>
                    <TableCell className="text-right font-bold">{formatPkrAmount(consultationRevenue)}</TableCell>
                    <TableCell className="text-right font-bold">{formatPkrAmount(otDoctorRevenue)}</TableCell>
                    <TableCell className="text-right font-bold text-indigo-700">{formatPkrAmount(doctorsRevenue)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Stethoscope className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No doctor revenue recorded yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========== STAFF COUNTER REVENUE SECTION ========== */}
      {perStaffRevenue.length > 0 && (
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <Users className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <CardTitle className="text-lg">Staff / Counter Revenue</CardTitle>
                  <CardDescription>Revenue generated by each operator at the counter</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-emerald-50/50">
                    <TableHead className="font-semibold">Operator</TableHead>
                    <TableHead className="font-semibold text-center">Role</TableHead>
                    <TableHead className="font-semibold text-center">Invoices</TableHead>
                    <TableHead className="font-semibold text-right">Revenue Generated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perStaffRevenue.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-medium">{staff.name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs capitalize">{staff.role}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{staff.invoiceCount}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-700">{formatPkrAmount(staff.totalGenerated)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-emerald-50/80">
                    <TableCell colSpan={2} className="font-bold">Total</TableCell>
                    <TableCell className="text-center font-bold">{perStaffRevenue.reduce((s, st) => s + st.invoiceCount, 0)}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-700">
                      {formatPkrAmount(perStaffRevenue.reduce((s, st) => s + st.totalGenerated, 0))}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========== PHARMACY SECTION ========== */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Pill className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <CardTitle className="text-lg">Pharmacy</CardTitle>
                <CardDescription>Sales revenue, profit & account summary</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50 text-base px-3 py-1">
              {formatPkrAmount(pharmacyRevenue)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-purple-50/50">
                  <TableHead className="font-semibold">Item</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Total Sales</TableCell>
                  <TableCell className="text-right font-medium">{formatPkrAmount(pharmacyRevenue)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-green-700">Gross Profit</TableCell>
                  <TableCell className="text-right font-medium text-green-700">{formatPkrAmount(pharmacyProfit)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-red-700">Bills & Expenses</TableCell>
                  <TableCell className="text-right font-medium text-red-700">-{formatPkrAmount(pharmacyTotalExpenses)}</TableCell>
                </TableRow>
              </TableBody>
              <TableFooter>
                <TableRow className="bg-purple-50/50">
                  <TableCell className="font-bold">Available Profit</TableCell>
                  <TableCell className="text-right font-bold text-purple-700">{formatPkrAmount(pharmacyProfit - pharmacyTotalExpenses)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center p-3 rounded-lg bg-muted/30 border">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Starting Balance</p>
              <p className="text-sm font-bold mt-1">{formatPkrAmount(pharmacyAccount?.starting_balance || 0)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-50/50 border border-blue-100">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Current Balance</p>
              <p className="text-sm font-bold text-blue-700 mt-1">
                {formatPkrAmount((pharmacyAccount?.starting_balance || 0) + pharmacyRevenue - pharmacyTotalExpenses)}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-purple-50/50 border border-purple-100">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Net Profit</p>
              <p className="text-sm font-bold text-purple-700 mt-1">{formatPkrAmount(pharmacyProfit - pharmacyTotalExpenses)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== BOTTOM ROW ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button className="h-14 flex flex-col items-center justify-center text-sm" onClick={() => navigate('/dashboard/finance/expenses')}>
                <Minus className="w-5 h-5 mb-1" />
                Add Expense
              </Button>
              <Button className="h-14 flex flex-col items-center justify-center text-sm" variant="outline" onClick={() => navigate('/dashboard/finance/doctor-payments')}>
                <Users className="w-5 h-5 mb-1" />
                Doctor Payments
              </Button>
              <Button className="h-14 flex flex-col items-center justify-center text-sm" variant="outline" onClick={() => navigate('/dashboard/finance/payroll')}>
                <Users className="w-5 h-5 mb-1" />
                Staff Payroll
              </Button>
              <Button className="h-14 flex flex-col items-center justify-center text-sm" variant="outline" onClick={() => navigate('/dashboard/finance/analytics')}>
                <TrendingUp className="w-5 h-5 mb-1" />
                Analytics
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-5 h-5" />
              Monthly Summary
            </CardTitle>
            <CardDescription className="text-xs">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Hospital</p>
                <p className="text-sm font-bold text-blue-700 mt-1">{formatPkrAmount(monthlyHospitalRevenue)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-indigo-50/50 border border-indigo-100">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Doctors</p>
                <p className="text-sm font-bold text-indigo-700 mt-1">{formatPkrAmount(monthlyDoctorsRevenue)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-purple-50/50 border border-purple-100">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Pharmacy</p>
                <p className="text-sm font-bold text-purple-700 mt-1">{formatPkrAmount(monthlyPharmacyRevenue)}</p>
              </div>
            </div>
            <Separator className="my-3" />
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium">Total Monthly Revenue</span>
              <span className="text-lg font-bold">{formatPkrAmount(monthlyRevenue)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
