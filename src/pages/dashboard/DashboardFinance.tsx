
import { StatsCard } from "@/components/StatsCard";
import { Calculator, TrendingUp, Users, Receipt, Banknote, Minus, Pill, TrendingDown, Building2, Stethoscope, FlaskConical, Syringe, AlertTriangle, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInvoices, useStats } from "@/hooks/useDatabase";
import { formatPkrAmount } from "@/utils/currency";
import { useHospitalSettings } from "@/hooks/useHospitalSettings";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

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

  // Get pharmacy account and expenses
  const { data: pharmacyAccount, isLoading: pharmacyAccountLoading } = useQuery({
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

  const { data: pharmacyExpenses, isLoading: pharmacyExpensesLoading } = useQuery({
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

  // Calculate hospital revenue from paid invoices
  const emergencyConsultationRevenue = invoices?.filter(inv => 
    inv.status === 'paid' && inv.description?.toLowerCase().includes('emergency')
  ).reduce((sum, invoice) => sum + (invoice.amount || 0), 0) || 0;

  // Regular consultation revenue (paid, non-emergency)
  const consultationRevenue = invoices?.filter(inv =>
    inv.status === 'paid' &&
    inv.description?.toLowerCase().includes('consultation') &&
    !inv.description?.toLowerCase().includes('emergency')
  ).reduce((sum, invoice) => sum + (invoice.amount || 0), 0) || 0;
  
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
  
  const labRevenue = invoices?.filter(invoice => 
    invoice.status === 'paid' && 
    invoice.description && 
    invoice.description.toLowerCase().includes('lab')
  ).reduce((sum, invoice) => sum + Number(invoice.amount), 0) || 0;
  
  const otHospitalRevenue = otSchedules?.reduce((sum, schedule) => {
    if (!schedule.total_cost || !schedule.doctor_expense) return sum;
    return sum + (Number(schedule.total_cost) - Number(schedule.doctor_expense));
  }, 0) || 0;

  const otDoctorRevenue = otSchedules?.reduce((sum, schedule) => {
    return sum + (Number(schedule.doctor_expense) || 0);
  }, 0) || 0;
  
  const doctorsRevenue = consultationRevenue + otDoctorRevenue;
  const hospitalRevenue = emergencyConsultationRevenue + labRevenue + otHospitalRevenue + pharmacyProfit;
  const totalRevenue = hospitalRevenue + doctorsRevenue + pharmacyRevenue;
  const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
  const totalProfit = hospitalRevenue - totalExpenses;

  // Per-doctor revenue breakdown
  const perDoctorRevenue = doctorProfiles?.map(doctor => {
    const profile = doctor.profiles as any;
    const doctorName = profile ? `Dr. ${profile.first_name} ${profile.last_name}` : 'Unknown';
    
    // Consultation revenue for this doctor
    const drConsultation = invoices?.filter(inv =>
      inv.status === 'paid' &&
      inv.doctor_id === doctor.id &&
      inv.description?.toLowerCase().includes('consultation') &&
      !inv.description?.toLowerCase().includes('emergency')
    ).reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;

    // OT revenue for this doctor
    const drOT = otSchedules?.filter(s => s.doctor_id === doctor.id)
      .reduce((sum, s) => sum + (Number(s.doctor_expense) || 0), 0) || 0;

    // Appointment count
    const appointmentCount = invoices?.filter(inv =>
      inv.status === 'paid' &&
      inv.doctor_id === doctor.id &&
      inv.description?.toLowerCase().includes('consultation') &&
      !inv.description?.toLowerCase().includes('emergency')
    ).length || 0;

    // OT count
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

  const pharmacyTotalExpenses = pharmacyExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

  // Calculate current month's revenue
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const currentMonthConsultationRevenue = invoices?.filter(invoice => {
    const invoiceDate = new Date(invoice.paid_at || invoice.created_at);
    return invoiceDate.getMonth() === currentMonth &&
           invoiceDate.getFullYear() === currentYear &&
           invoice.status === 'paid' &&
           invoice.description?.toLowerCase().includes('consultation') &&
           !invoice.description?.toLowerCase().includes('emergency');
  }).reduce((sum, invoice) => sum + (invoice.amount || 0), 0) || 0;

  const currentMonthEmergencyRevenue = invoices?.filter(invoice => {
    const invoiceDate = new Date(invoice.paid_at || invoice.created_at);
    return invoiceDate.getMonth() === currentMonth && 
           invoiceDate.getFullYear() === currentYear && 
           invoice.status === 'paid' &&
           invoice.description?.toLowerCase().includes('emergency');
  }).reduce((sum, invoice) => sum + (invoice.amount || 0), 0) || 0;
  
  const currentMonthPharmacyRevenue = pharmacyInvoices?.filter(invoice => {
    const invoiceDate = new Date(invoice.created_at);
    return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear;
  }).reduce((sum, invoice) => sum + (invoice.final_amount || 0), 0) || 0;
  
  const currentMonthPharmacyProfit = pharmacyInvoices?.filter(invoice => {
    const invoiceDate = new Date(invoice.created_at);
    return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear;
  }).reduce((totalProfit, invoice) => {
    const invoiceProfit = (invoice.pharmacy_invoice_items || []).reduce((itemsProfit: number, item: any) => {
      if (item.medicines && item.medicines.selling_price && item.medicines.purchase_price) {
        const profitPerUnit = item.medicines.selling_price - item.medicines.purchase_price;
        return itemsProfit + (profitPerUnit * item.quantity);
      }
      return itemsProfit;
    }, 0);
    return totalProfit + invoiceProfit;
  }, 0) || 0;
  
  const currentMonthLabRevenue = invoices?.filter(invoice => {
    const invoiceDate = new Date(invoice.created_at);
    return invoiceDate.getMonth() === currentMonth && 
           invoiceDate.getFullYear() === currentYear && 
           invoice.status === 'paid' &&
           invoice.description && 
           invoice.description.toLowerCase().includes('lab');
  }).reduce((sum, invoice) => sum + Number(invoice.amount), 0) || 0;
  
  const currentMonthOTHospitalRevenue = otSchedules?.filter(schedule => {
    const scheduleDate = new Date(schedule.created_at);
    return scheduleDate.getMonth() === currentMonth && scheduleDate.getFullYear() === currentYear;
  }).reduce((sum, schedule) => {
    if (!schedule.total_cost || !schedule.doctor_expense) return sum;
    return sum + (Number(schedule.total_cost) - Number(schedule.doctor_expense));
  }, 0) || 0;

  const currentMonthOTDoctorRevenue = otSchedules?.filter(schedule => {
    const scheduleDate = new Date(schedule.created_at);
    return scheduleDate.getMonth() === currentMonth && scheduleDate.getFullYear() === currentYear;
  }).reduce((sum, schedule) => sum + (Number(schedule.doctor_expense) || 0), 0) || 0;

  const monthlyDoctorsRevenue = currentMonthConsultationRevenue + currentMonthOTDoctorRevenue;
  const monthlyHospitalRevenue = currentMonthEmergencyRevenue + currentMonthLabRevenue + currentMonthOTHospitalRevenue + currentMonthPharmacyProfit;
  const monthlyRevenue = monthlyHospitalRevenue + monthlyDoctorsRevenue + currentMonthPharmacyRevenue;

  const maxDoctorRevenue = perDoctorRevenue.length > 0 ? perDoctorRevenue[0].totalRevenue : 1;

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Total Revenue"
          value={formatPkrAmount(totalRevenue)}
          icon={<Banknote className="w-5 h-5 text-green-600" />}
          loading={invoicesLoading || pharmacyLoading || labLoading || otLoading}
        />
        <StatsCard
          title="Total Expenses"
          value={formatPkrAmount(totalExpenses)}
          icon={<Minus className="w-5 h-5 text-red-600" />}
          loading={expensesLoading}
        />
        <StatsCard
          title="Net Profit"
          value={formatPkrAmount(totalProfit)}
          icon={totalProfit >= 0 ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
          loading={invoicesLoading || pharmacyLoading || labLoading || expensesLoading || otLoading}
        />
      </div>

      {/* Three Column Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Hospital Revenue Section */}
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Hospital Revenue</CardTitle>
                  <CardDescription className="text-xs">Services & facilities</CardDescription>
                </div>
              </div>
              <span className="text-xl font-bold text-blue-600">{formatPkrAmount(hospitalRevenue)}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-sm">Emergency</span>
                </div>
                <span className="text-sm font-semibold">{formatPkrAmount(emergencyConsultationRevenue)}</span>
              </div>
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-3.5 h-3.5 text-teal-500" />
                  <span className="text-sm">Lab Services</span>
                </div>
                <span className="text-sm font-semibold">{formatPkrAmount(labRevenue)}</span>
              </div>
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Syringe className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-sm">OT (Hospital)</span>
                </div>
                <span className="text-sm font-semibold">{formatPkrAmount(otHospitalRevenue)}</span>
              </div>
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Pill className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-sm">Pharmacy Profit</span>
                </div>
                <span className="text-sm font-semibold">{formatPkrAmount(pharmacyProfit)}</span>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-xs text-muted-foreground">After Expenses</p>
                <p className="text-sm font-medium">Expenses: {formatPkrAmount(totalExpenses)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Hospital Profit</p>
                <p className={`text-lg font-bold ${(hospitalRevenue - totalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPkrAmount(hospitalRevenue - totalExpenses)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Doctors Revenue Section */}
        <Card className="border-t-4 border-t-indigo-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50">
                  <Stethoscope className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Doctors Revenue</CardTitle>
                  <CardDescription className="text-xs">Consultation & OT fees</CardDescription>
                </div>
              </div>
              <span className="text-xl font-bold text-indigo-600">{formatPkrAmount(doctorsRevenue)}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {doctorsLoading || invoicesLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : perDoctorRevenue.length > 0 ? (
              <div className="space-y-2.5">
                {perDoctorRevenue.map((doctor) => (
                  <div key={doctor.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate max-w-[140px]">{doctor.name}</span>
                      <span className="text-sm font-bold text-indigo-600">{formatPkrAmount(doctor.totalRevenue)}</span>
                    </div>
                    <Progress value={(doctor.totalRevenue / maxDoctorRevenue) * 100} className="h-1.5" />
                    <div className="flex gap-2 flex-wrap">
                      {doctor.appointmentCount > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {doctor.appointmentCount} consultation{doctor.appointmentCount !== 1 ? 's' : ''} · {formatPkrAmount(doctor.consultationRevenue)}
                        </Badge>
                      )}
                      {doctor.otCount > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {doctor.otCount} OT · {formatPkrAmount(doctor.otRevenue)}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Stethoscope className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No doctor revenue recorded yet</p>
              </div>
            )}
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 rounded-lg bg-indigo-50/50">
                <p className="text-xs text-muted-foreground">Consultations</p>
                <p className="text-sm font-bold text-indigo-600">{formatPkrAmount(consultationRevenue)}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-indigo-50/50">
                <p className="text-xs text-muted-foreground">OT Fees</p>
                <p className="text-sm font-bold text-indigo-600">{formatPkrAmount(otDoctorRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pharmacy Section */}
        <Card className="border-t-4 border-t-purple-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-50">
                  <Pill className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Pharmacy</CardTitle>
                  <CardDescription className="text-xs">Sales, profit & account</CardDescription>
                </div>
              </div>
              <span className="text-xl font-bold text-purple-600">{formatPkrAmount(pharmacyRevenue)}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                <span className="text-sm">Total Sales</span>
                <span className="text-sm font-semibold">{formatPkrAmount(pharmacyRevenue)}</span>
              </div>
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-green-50/50">
                <span className="text-sm text-green-700">Gross Profit</span>
                <span className="text-sm font-semibold text-green-600">{formatPkrAmount(pharmacyProfit)}</span>
              </div>
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-red-50/50">
                <span className="text-sm text-red-700">Bills & Expenses</span>
                <span className="text-sm font-semibold text-red-600">-{formatPkrAmount(pharmacyTotalExpenses)}</span>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                <span className="text-sm">Starting Balance</span>
                <span className="text-sm font-medium">{formatPkrAmount(pharmacyAccount?.starting_balance || 0)}</span>
              </div>
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-blue-50/50">
                <span className="text-sm font-medium">Current Balance</span>
                <span className="text-sm font-bold text-blue-600">
                  {formatPkrAmount((pharmacyAccount?.starting_balance || 0) + pharmacyRevenue - pharmacyTotalExpenses)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-purple-50/50">
                <span className="text-sm font-medium">Available Profit</span>
                <span className="text-sm font-bold text-purple-600">
                  {formatPkrAmount(pharmacyProfit - pharmacyTotalExpenses)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Quick Actions & Monthly Summary */}
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
              <Button 
                className="h-16 flex flex-col items-center justify-center text-sm"
                onClick={() => navigate('/dashboard/finance/expenses')}
              >
                <Minus className="w-5 h-5 mb-1" />
                Add Expense
              </Button>
              <Button 
                className="h-16 flex flex-col items-center justify-center text-sm" 
                variant="outline"
                onClick={() => navigate('/dashboard/finance/doctor-payments')}
              >
                <Users className="w-5 h-5 mb-1" />
                Doctor Payments
              </Button>
              <Button 
                className="h-16 flex flex-col items-center justify-center text-sm" 
                variant="outline"
                onClick={() => navigate('/dashboard/finance/payroll')}
              >
                <Users className="w-5 h-5 mb-1" />
                Staff Payroll
              </Button>
              <Button 
                className="h-16 flex flex-col items-center justify-center text-sm" 
                variant="outline"
                onClick={() => navigate('/dashboard/finance/analytics')}
              >
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
                <p className="text-sm font-bold text-blue-600 mt-1">{formatPkrAmount(monthlyHospitalRevenue)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-indigo-50/50 border border-indigo-100">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Doctors</p>
                <p className="text-sm font-bold text-indigo-600 mt-1">{formatPkrAmount(monthlyDoctorsRevenue)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-purple-50/50 border border-purple-100">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Pharmacy</p>
                <p className="text-sm font-bold text-purple-600 mt-1">{formatPkrAmount(currentMonthPharmacyRevenue)}</p>
              </div>
            </div>
            <Separator className="my-3" />
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium">Total Monthly Revenue</span>
              <span className="text-lg font-bold text-foreground">{formatPkrAmount(monthlyRevenue)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
