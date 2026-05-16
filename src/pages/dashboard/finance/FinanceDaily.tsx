import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, RefreshCw, Building, AlertTriangle, TestTube, Activity, Pill, TrendingUp, TrendingDown, DollarSign, Receipt, FileText, Upload, Download, Clock, CheckCircle, Calculator, Banknote, Stethoscope, BedDouble } from "lucide-react";
import { DetailedDailyReport } from "@/components/DetailedDailyReport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { generateDailyClosingPDF } from "@/utils/pdfGenerator";
import { StatsCard } from "@/components/StatsCard";
import { toast } from "sonner";
import { HospitalClosingBalanceDialog } from "@/components/dialogs/HospitalClosingBalanceDialog";
import { PreviousClosingsDialog } from "@/components/dialogs/PreviousClosingsDialog";
import { getCurrentPakistanTime, toPakistanTime, formatInPakistanTime } from "@/utils/timezone";
import { exportDailyClosingToCSV } from "@/utils/exportUtils";
export default function FinanceDaily() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showClosingDialog, setShowClosingDialog] = useState(false);
  const [showLastClosingDialog, setShowLastClosingDialog] = useState(false);
  const [showClosingBalanceDialog, setShowClosingBalanceDialog] = useState(false);
  const queryClient = useQueryClient();

  const formatDateForQuery = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const targetDate = formatDateForQuery(selectedDate);

  const {
    data: dailyData,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['daily-finance', targetDate],
    queryFn: async () => {
      const { data: lastClosingData } = await supabase.rpc('get_last_daily_closing');
      const lastClosing = lastClosingData?.[0];

      let cutoffTime: string;
      if (lastClosing && lastClosing.closing_date !== targetDate) {
        cutoffTime = lastClosing.closing_time;
      } else if (lastClosing && lastClosing.closing_date === targetDate) {
        cutoffTime = lastClosing.closing_time;
      } else {
        const selectedDatePakTime = toPakistanTime(new Date(`${targetDate}T00:00:00`));
        cutoffTime = selectedDatePakTime.toISOString();
      }

      const currentPakTime = getCurrentPakistanTime();
      const selectedDatePakTime = toPakistanTime(new Date(`${targetDate}T00:00:00`));
      const isToday = currentPakTime.toDateString() === selectedDatePakTime.toDateString();
      const upperBound = isToday ? currentPakTime.toISOString() : toPakistanTime(new Date(`${targetDate}T23:59:59`)).toISOString();

      const [
        hospitalInvoicesRes, pharmacyInvoicesRes, labInvoicesRes, xrayReportsRes,
        otSchedulesRes, emergencyRes, expensesRes, refundsRes, miscIncomeRes,
        ipdRes
      ] = await Promise.all([
        supabase.from('invoices').select('amount, created_at, description, emergency_patient_data, invoice_number').eq('status', 'paid').gt('created_at', cutoffTime).lte('created_at', upperBound),
        supabase.from('pharmacy_invoices').select(`*, pharmacy_invoice_items(quantity, unit_price, total_price, medicine_id, medicines(purchase_price, selling_price))`).gt('created_at', cutoffTime).lte('created_at', upperBound),
        supabase.from('invoices').select('amount, created_at, description, invoice_number, status').eq('status', 'paid').like('invoice_number', 'LAB-%').gt('created_at', cutoffTime).lte('created_at', upperBound),
        supabase.from('xray_reports').select('price, created_at, test_name, status').not('price', 'is', null).gt('created_at', cutoffTime).lte('created_at', upperBound),
        supabase.from('ot_schedules').select('total_cost, doctor_expense, created_at, operation_date, status').in('status', ['completed', 'pending']).gt('created_at', cutoffTime).lte('created_at', upperBound),
        supabase.from('appointments').select('consultation_fee_at_time, type, status, appointment_date').ilike('type', 'emergency').eq('status', 'completed').gte('appointment_date', cutoffTime).lte('appointment_date', upperBound),
        supabase.from('expenses').select('amount, expense_date, created_at').gt('created_at', cutoffTime).lte('created_at', upperBound),
        supabase.from('refunds').select('amount, refund_type, description, created_at').gt('created_at', cutoffTime).lte('created_at', upperBound),
        supabase.from('miscellaneous_income').select('amount, description, created_at').gt('created_at', cutoffTime).lte('created_at', upperBound),
        supabase.from('ipd_invoices').select('*').not('finalized_at', 'is', null).gt('created_at', cutoffTime).lte('created_at', upperBound),
      ]);

      const hospitalInvoices = hospitalInvoicesRes.data;
      const pharmacyInvoicesWithItems = pharmacyInvoicesRes.data;
      const labInvoices = labInvoicesRes.data;
      const xrayReports = xrayReportsRes.data;
      const otSchedules = otSchedulesRes.data;
      const emergencyAppointments = emergencyRes.data;
      const expenses = expensesRes.data;
      const refunds = refundsRes.data;
      const miscIncome = miscIncomeRes.data;
      const ipdInvoices = ipdRes.data || [];

      const isEmergencyInvoice = (invoice: { description?: string | null; emergency_patient_data?: unknown }) =>
        invoice.description?.toLowerCase().includes('emergency') || Boolean(invoice.emergency_patient_data);

      const consultationRevenue = hospitalInvoices?.filter(inv =>
        (inv.invoice_number?.startsWith('INV-') ?? false) && !isEmergencyInvoice(inv)
      ).reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

      const emergencyAppointmentRevenue = emergencyAppointments?.reduce((sum, apt) => sum + (apt.consultation_fee_at_time || 0), 0) || 0;
      const emergencyInvoiceRevenue = hospitalInvoices?.filter(isEmergencyInvoice).reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;
      const emergencyRevenue = emergencyAppointmentRevenue + emergencyInvoiceRevenue;

      let pharmacyRevenue = 0;
      let pharmacyProfit = 0;
      let pharmacyReturnsFromInvoices = 0;
      if (pharmacyInvoicesWithItems) {
        const positiveInvoices = pharmacyInvoicesWithItems.filter(inv => (inv.final_amount || 0) >= 0);
        const negativeInvoices = pharmacyInvoicesWithItems.filter(inv => (inv.final_amount || 0) < 0);

        pharmacyReturnsFromInvoices = Math.abs(negativeInvoices.reduce((sum, inv) => sum + (inv.final_amount || 0), 0));

        const grossPharmacyRevenue = positiveInvoices.reduce((sum, inv) => sum + (inv.final_amount || 0), 0);

        pharmacyRevenue = grossPharmacyRevenue - pharmacyReturnsFromInvoices;

        const grossPharmacyProfit = positiveInvoices.reduce((totalProfit, invoice) => {
          const invoiceProfit = (invoice.pharmacy_invoice_items || []).reduce((itemsProfit, item) => {
            if (item.medicines && item.medicines.purchase_price) {
              const profitPerUnit = item.unit_price - item.medicines.purchase_price;
              return itemsProfit + profitPerUnit * item.quantity;
            }
            return itemsProfit;
          }, 0);
          return totalProfit + invoiceProfit;
        }, 0);

        const returnsProfit = negativeInvoices.reduce((totalProfit, invoice) => {
          const invoiceProfit = (invoice.pharmacy_invoice_items || []).reduce((itemsProfit, item) => {
            if (item.medicines && item.medicines.purchase_price) {
              const profitPerUnit = item.unit_price - item.medicines.purchase_price;
              return itemsProfit + profitPerUnit * Math.abs(item.quantity);
            }
            return itemsProfit;
          }, 0);
          return totalProfit + invoiceProfit;
        }, 0);

        pharmacyProfit = grossPharmacyProfit - returnsProfit;
      }
      const labRevenue = labInvoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
      const xrayRevenue = xrayReports?.reduce((sum, xray) => sum + (xray.price || 0), 0) || 0;
      const otHospitalRevenue = otSchedules?.reduce((sum, ot) => sum + ((ot.total_cost || 0) - (ot.doctor_expense || 0)), 0) || 0;
      const otDoctorExpense = otSchedules?.reduce((sum, ot) => sum + (ot.doctor_expense || 0), 0) || 0;
      const miscellaneousIncome = miscIncome?.reduce((sum, income) => sum + (income.amount || 0), 0) || 0;
      const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
      const totalRefunds = refunds?.reduce((sum, ref) => sum + ref.amount, 0) || 0;

      const doctorRevenue = consultationRevenue + otDoctorExpense;

      const totalHospitalRevenue = emergencyRevenue + labRevenue + xrayRevenue + otHospitalRevenue + miscellaneousIncome;
      const totalHospitalProfit = totalHospitalRevenue - totalExpenses - totalRefunds;

      // IPD calculations
      const ipdDoctorRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.doctor_charges_total) || 0), 0);
      const ipdAnesthesiaRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.anesthesia_charges_total) || 0), 0);
      const ipdOtaRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.ota_charges_total) || 0), 0);
      const ipdOtRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.ot_charges_total) || 0), 0);
      const ipdBedRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.bed_charges_total) || 0), 0);
      const ipdMedicineRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.medicine_charges_total) || 0), 0);
      const ipdLabRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.lab_charges_total) || 0), 0);
      const ipdTotalRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
      const ipdTotalPaid = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.paid_amount) || 0), 0);

      const otRefunds = refunds?.filter(r => r.refund_type.includes('ot'))?.reduce((sum, r) => sum + r.amount, 0) || 0;
      const pharmacyRefunds = pharmacyReturnsFromInvoices + (refunds?.filter(r => r.refund_type === 'pharmacy_invoice')?.reduce((sum, r) => sum + r.amount, 0) || 0);
      const otherRefunds = refunds?.filter(r => !r.refund_type.includes('ot') && r.refund_type !== 'pharmacy_invoice')?.reduce((sum, r) => sum + r.amount, 0) || 0;

      return {
        emergencyRevenue,
        pharmacyRevenue,
        pharmacyProfit,
        labRevenue,
        xrayRevenue,
        otHospitalRevenue,
        miscellaneousIncome,
        totalHospitalRevenue,
        totalHospitalProfit,
        totalExpenses,
        totalRefunds,
        otRefunds,
        pharmacyRefunds,
        otherRefunds,
        doctorRevenue,
        consultationRevenue,
        otDoctorExpense,
        refunds: refunds || [],
        lastClosing: lastClosing,
        cutoffTime: cutoffTime,
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
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const {
    data: detailedData
  } = useQuery({
    queryKey: ['daily-detailed', targetDate, dailyData?.cutoffTime],
    queryFn: async () => {
      let effectiveCutoff = dailyData?.cutoffTime;
      let lastClosing = dailyData?.lastClosing;
      
      if (!effectiveCutoff) {
        const { data: lastClosingData } = await supabase.rpc('get_last_daily_closing');
        lastClosing = lastClosingData?.[0];
        if (lastClosing) {
          effectiveCutoff = lastClosing.closing_time;
        } else {
          effectiveCutoff = toPakistanTime(new Date(`${targetDate}T00:00:00`)).toISOString();
        }
      }

      const cutoffTime = effectiveCutoff;

      const currentPakTime = getCurrentPakistanTime();
      const selectedDatePakTime = toPakistanTime(new Date(`${targetDate}T00:00:00`));
      const isToday = currentPakTime.toDateString() === selectedDatePakTime.toDateString();
      const upperBound = isToday ? currentPakTime.toISOString() : toPakistanTime(new Date(`${targetDate}T23:59:59`)).toISOString();

      const [hospitalInvoicesRes, pharmacyInvoicesRes, labInvoicesRes, xrayReportsRes, otSchedulesRes, emergencyAppointmentsRes, expensesRes, refundsRes, pharmacyExpensesRes, pharmacyAccountRes, totalStockRes, miscellaneousIncomeRes, staffShiftClosingsRes] = await Promise.all([supabase.from('invoices').select('*, patients(id, profiles(first_name, last_name))').eq('status', 'paid').gt('created_at', cutoffTime).lte('created_at', upperBound), supabase.from('pharmacy_invoices').select(`
            *,
            pharmacy_invoice_items(
              quantity,
              unit_price,
              total_price,
              medicine_id,
              medicines(name, purchase_price, selling_price)
            )
          `).gt('created_at', cutoffTime).lte('created_at', upperBound), supabase.from('lab_reports').select('*, patients(id, profiles(first_name, last_name))').not('price', 'is', null).gt('created_at', cutoffTime).lte('created_at', upperBound), supabase.from('xray_reports').select('*, patients(id, profiles(first_name, last_name))').not('price', 'is', null).gt('created_at', cutoffTime).lte('created_at', upperBound), supabase.from('ot_schedules').select('*, patients(id, profiles(first_name, last_name)), ot_operations(operation_name)').in('status', ['completed', 'pending']).gt('created_at', cutoffTime).lte('created_at', upperBound), supabase.from('appointments').select('*, patients(id, profiles(first_name, last_name)), doctors(id, profiles(first_name, last_name))').ilike('type', 'emergency').eq('status', 'completed').gte('appointment_date', cutoffTime).lte('appointment_date', upperBound), supabase.from('expenses').select('*').gt('created_at', cutoffTime).lte('created_at', upperBound), supabase.from('refunds').select('*').gt('created_at', cutoffTime).lte('created_at', upperBound), supabase.from('pharmacy_expenses').select('*').gt('created_at', cutoffTime).lte('created_at', upperBound), supabase.from('pharmacy_account').select('*').order('created_at', {
        ascending: false
      }).limit(1), supabase.from('medicines').select('stock_quantity, selling_price'), supabase.from('miscellaneous_income').select('*').gt('created_at', cutoffTime).lte('created_at', upperBound),
      supabase.from('staff_shift_closings').select('*').gt('created_at', cutoffTime).lte('created_at', upperBound).order('created_at', { ascending: true })
      ]);

      const totalStockValue = (totalStockRes.data || []).reduce((total: number, medicine: any) => {
        return total + medicine.stock_quantity * medicine.selling_price;
      }, 0);
      return {
        hospitalInvoices: hospitalInvoicesRes.data || [],
        pharmacyInvoices: pharmacyInvoicesRes.data || [],
        labReports: labInvoicesRes.data || [],
        xrayReports: xrayReportsRes.data || [],
        otSchedules: otSchedulesRes.data || [],
        emergencyAppointments: emergencyAppointmentsRes.data || [],
        expenses: expensesRes.data || [],
        refunds: refundsRes.data || [],
        pharmacyExpenses: pharmacyExpensesRes.data || [],
        miscellaneousIncome: miscellaneousIncomeRes.data || [],
        staffShiftClosings: staffShiftClosingsRes.data || [],
        pharmacyAccount: pharmacyAccountRes.data?.[0] || null,
        totalStockValue,
        lastClosing: lastClosing,
        cutoffTime: cutoffTime
      };
    },
    enabled: true
  });

  const { data: staffProfiles } = useQuery({
    queryKey: ['staff-profiles-daily'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .in('role', ['staff', 'admin', 'finance']);
      if (error) throw error;
      return data;
    }
  });

  const {
    data: lastClosingData
  } = useQuery({
    queryKey: ['last-daily-closing'],
    queryFn: async () => {
      const {
        data
      } = await supabase.rpc('get_last_daily_closing');
      return data?.[0] || null;
    },
    enabled: showLastClosingDialog
  });

  const createClosingMutation = useMutation({
    mutationFn: async () => {
      const closingTimestamp = getCurrentPakistanTime().toISOString();
      
      console.log('\u{1F510} DAILY CLOSING - Starting with exact timestamp:', closingTimestamp);
      
      const { data: lastClosingData } = await supabase.rpc('get_last_daily_closing');
      const lastClosing = lastClosingData?.[0];
      
      let cutoffTime: string;
      if (lastClosing) {
        cutoffTime = lastClosing.closing_time;
        console.log('\u{1F4CA} Using last closing time as lower bound:', cutoffTime);
      } else {
        const selectedDatePakTime = toPakistanTime(new Date(`${targetDate}T00:00:00`));
        cutoffTime = selectedDatePakTime.toISOString();
        console.log('\u{1F4CA} No previous closing, using start of day:', cutoffTime);
      }
      
      const upperBound = closingTimestamp;

      const [
        hospitalInvoicesRes,
        pharmacyInvoicesRes,
        labInvoicesRes,
        xrayReportsRes,
        otSchedulesRes,
        emergencyAppointmentsRes,
        expensesRes,
        refundsRes,
        pharmacyExpensesRes,
        pharmacyAccountRes,
        totalStockRes,
        miscellaneousIncomeRes,
        ipdRes
      ] = await Promise.all([
        supabase.from('invoices')
          .select('*, patients(id, profiles(first_name, last_name))')
          .eq('status', 'paid')
          .gt('created_at', cutoffTime)
          .lte('created_at', upperBound),
        
        supabase.from('pharmacy_invoices')
          .select(`
            *,
            pharmacy_invoice_items(
              quantity,
              unit_price,
              total_price,
              medicine_id,
              medicines(name, purchase_price, selling_price)
            )
          `)
          .gt('created_at', cutoffTime)
          .lte('created_at', upperBound),
        
        supabase.from('invoices')
          .select('*, patients(id, profiles(first_name, last_name))')
          .eq('status', 'paid')
          .like('invoice_number', 'LAB-%')
          .gt('created_at', cutoffTime)
          .lte('created_at', upperBound),
        
        supabase.from('xray_reports')
          .select('*, patients(profiles(first_name, last_name))')
          .not('price', 'is', null)
          .gt('created_at', cutoffTime)
          .lte('created_at', upperBound),
        
        supabase.from('ot_schedules')
          .select('*, patients(profiles(first_name, last_name))')
          .in('status', ['completed', 'pending'])
          .gt('created_at', cutoffTime)
          .lte('created_at', upperBound),
        
        supabase.from('appointments')
          .select('*, patients(profiles(first_name, last_name))')
          .ilike('type', 'emergency')
          .eq('status', 'completed')
          .gt('appointment_date', cutoffTime)
          .lte('appointment_date', upperBound),
        
        supabase.from('expenses')
          .select('*')
          .gt('created_at', cutoffTime)
          .lte('created_at', upperBound),
        
        supabase.from('refunds')
          .select('*')
          .gt('created_at', cutoffTime)
          .lte('created_at', upperBound),
        
        supabase.from('pharmacy_expenses')
          .select('*')
          .gt('expense_date', cutoffTime)
          .lte('expense_date', upperBound),
        
        supabase.from('pharmacy_account')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1),
        
        supabase.from('medicines')
          .select('stock_quantity, purchase_price'),
        
        supabase.from('miscellaneous_income')
          .select('*')
          .gt('created_at', cutoffTime)
          .lte('created_at', upperBound),

        supabase.from('ipd_invoices')
          .select('*')
          .not('finalized_at', 'is', null)
          .gt('created_at', cutoffTime)
          .lte('created_at', upperBound),
      ]);

      if (hospitalInvoicesRes.error) console.error('\u274C Hospital invoices query error:', hospitalInvoicesRes.error);
      if (pharmacyInvoicesRes.error) console.error('\u274C Pharmacy invoices query error:', pharmacyInvoicesRes.error);
      if (labInvoicesRes.error) console.error('\u274C Lab invoices query error:', labInvoicesRes.error);
      if (xrayReportsRes.error) console.error('\u274C X-ray reports query error:', xrayReportsRes.error);
      if (otSchedulesRes.error) console.error('\u274C OT schedules query error:', otSchedulesRes.error);
      if (emergencyAppointmentsRes.error) console.error('\u274C Emergency appointments query error:', emergencyAppointmentsRes.error);
      if (expensesRes.error) console.error('\u274C Expenses query error:', expensesRes.error);
      if (refundsRes.error) console.error('\u274C Refunds query error:', refundsRes.error);
      if (pharmacyExpensesRes.error) console.error('\u274C Pharmacy expenses query error:', pharmacyExpensesRes.error);
      if (miscellaneousIncomeRes.error) console.error('\u274C Miscellaneous income query error:', miscellaneousIncomeRes.error);

      const hospitalInvoices = hospitalInvoicesRes.data || [];
      let pharmacyInvoices = pharmacyInvoicesRes.data || [];
      const labInvoices = labInvoicesRes.data || [];
      const xrayReports = xrayReportsRes.data || [];
      const otSchedules = otSchedulesRes.data || [];
      const emergencyAppointments = emergencyAppointmentsRes.data || [];
      const expenses = expensesRes.data || [];
      const refunds = refundsRes.data || [];
      const pharmacyExpenses = pharmacyExpensesRes.data || [];
      const pharmacyAccount = pharmacyAccountRes.data?.[0] || null;
      const totalStock = totalStockRes.data || [];
      const miscellaneousIncome = miscellaneousIncomeRes.data || [];
      const ipdInvoices = ipdRes.data || [];

      const isEmergencyInvoice = (invoice: { description?: string | null; emergency_patient_data?: unknown }) =>
        invoice.description?.toLowerCase().includes('emergency') || Boolean(invoice.emergency_patient_data);

      const consultationRevenue = hospitalInvoices
        .filter(inv => (inv.invoice_number?.startsWith('INV-') ?? false) && !isEmergencyInvoice(inv))
        .reduce((sum, inv) => sum + Number(inv.amount), 0);

      const emergencyAppointmentRevenue = emergencyAppointments.reduce((sum, apt) => 
        sum + (apt.consultation_fee_at_time || 0), 0);
      const emergencyInvoiceRevenue = hospitalInvoices
        .filter(isEmergencyInvoice)
        .reduce((sum, inv) => sum + Number(inv.amount), 0);
      const emergencyRevenue = emergencyAppointmentRevenue + emergencyInvoiceRevenue;

      let pharmacyRevenue = 0;
      let pharmacyProfit = 0;
      let pharmacyReturnsFromInvoices = 0;
      
      const positiveInvoices = pharmacyInvoices.filter(inv => (inv.final_amount || 0) >= 0);
      const negativeInvoices = pharmacyInvoices.filter(inv => (inv.final_amount || 0) < 0);
      
      pharmacyReturnsFromInvoices = Math.abs(negativeInvoices.reduce((sum, inv) => sum + (inv.final_amount || 0), 0));
      const grossPharmacyRevenue = positiveInvoices.reduce((sum, inv) => sum + (inv.final_amount || 0), 0);
      pharmacyRevenue = grossPharmacyRevenue - pharmacyReturnsFromInvoices;
      
      const grossPharmacyProfit = positiveInvoices.reduce((totalProfit, invoice) => {
        const invoiceProfit = (invoice.pharmacy_invoice_items || []).reduce((itemsProfit, item) => {
          if (item.medicines && item.medicines.purchase_price) {
            const profitPerUnit = item.unit_price - item.medicines.purchase_price;
            return itemsProfit + (profitPerUnit * item.quantity);
          }
          return itemsProfit;
        }, 0);
        return totalProfit + invoiceProfit;
      }, 0);
      
      const returnsProfit = negativeInvoices.reduce((totalProfit, invoice) => {
        const invoiceProfit = (invoice.pharmacy_invoice_items || []).reduce((itemsProfit, item) => {
          if (item.medicines && item.medicines.purchase_price) {
            const profitPerUnit = item.unit_price - item.medicines.purchase_price;
            return itemsProfit + (profitPerUnit * Math.abs(item.quantity));
          }
          return itemsProfit;
        }, 0);
        return totalProfit + invoiceProfit;
      }, 0);
      
      pharmacyProfit = grossPharmacyProfit - returnsProfit;

      const labRevenue = labInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
      const xrayRevenue = xrayReports.reduce((sum, xray) => sum + (xray.price || 0), 0);
      const otHospitalRevenue = otSchedules.reduce((sum, ot) => 
        sum + ((ot.total_cost || 0) - (ot.doctor_expense || 0)), 0);
      const miscIncome = miscellaneousIncome.reduce((sum, income) => sum + (income.amount || 0), 0);
      const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const totalRefunds = refunds.reduce((sum, ref) => sum + ref.amount, 0);

      // IPD calculations
      const ipdDoctorRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.doctor_charges_total) || 0), 0);
      const ipdAnesthesiaRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.anesthesia_charges_total) || 0), 0);
      const ipdOtaRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.ota_charges_total) || 0), 0);
      const ipdOtRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.ot_charges_total) || 0), 0);
      const ipdBedRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.bed_charges_total) || 0), 0);
      const ipdMedicineRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.medicine_charges_total) || 0), 0);
      const ipdLabRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.lab_charges_total) || 0), 0);
      const ipdTotalRevenue = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
      const ipdTotalPaid = ipdInvoices.reduce((sum, inv) => sum + (Number(inv.paid_amount) || 0), 0);

      const totalHospitalRevenue = emergencyRevenue + labRevenue + xrayRevenue + otHospitalRevenue + miscIncome;
      const totalStockValue = totalStock.reduce((sum, medicine) => 
        sum + (medicine.stock_quantity * medicine.purchase_price), 0);

      const closingData = {
        closingDate: targetDate,
        closingTime: closingTimestamp,
        dayName: formatInPakistanTime(new Date(closingTimestamp), 'EEEE'),
        hospitalRevenue: totalHospitalRevenue,
        pharmacyRevenue: pharmacyRevenue,
        pharmacyProfit: pharmacyProfit,
        totalExpenses: totalExpenses,
        totalRefunds: totalRefunds,
        netProfit: totalHospitalRevenue - totalExpenses - totalRefunds,
        transactionsData: {
          hospitalInvoices,
          pharmacyInvoices,
          labReports: labInvoices.map(inv => ({ ...inv, price: inv.amount })),
          xrayReports,
          otSchedules,
          emergencyAppointments,
          expenses,
          refunds,
          pharmacyExpenses,
          miscellaneousIncome,
          pharmacyAccount,
          totalStockValue,
          ipdInvoices,
          cutoffTime,
          closingTimestamp
        }
      };

      const { error } = await supabase.rpc('create_daily_closing', {
        p_closing_date: closingData.closingDate,
        p_closing_time: closingData.closingTime,
        p_day_name: closingData.dayName,
        p_hospital_revenue: closingData.hospitalRevenue,
        p_pharmacy_revenue: closingData.pharmacyRevenue,
        p_pharmacy_profit: closingData.pharmacyProfit,
        p_total_expenses: closingData.totalExpenses,
        p_total_refunds: closingData.totalRefunds,
        p_net_profit: closingData.netProfit,
        p_transactions_data: closingData.transactionsData
      });
      
      if (error) {
        console.error('\u274C Failed to create daily closing:', error);
        throw error;
      }

      const {
        data: previousDayBalanceRecord
      } = await supabase.from('hospital_closing_balance').select('closing_balance').lt('closing_date', closingData.closingDate).order('closing_date', {
        ascending: false
      }).order('updated_at', {
        ascending: false
      }).limit(1).maybeSingle();
      const previousBalance = Number(previousDayBalanceRecord?.closing_balance || 0);
      const newClosingBalance = previousBalance + closingData.netProfit;

      const {
        data: existingDateBalance,
        error: existingDateBalanceError
      } = await supabase.from('hospital_closing_balance').select('id').eq('closing_date', closingData.closingDate).order('updated_at', {
        ascending: false
      }).limit(1).maybeSingle();

      if (existingDateBalanceError) {
        console.error('Error checking existing closing balance:', existingDateBalanceError);
      }

      if (existingDateBalance) {
        const {
          error: balanceError
        } = await supabase.from('hospital_closing_balance').update({
          closing_balance: newClosingBalance,
          notes: `Auto-updated from daily closing. Previous day balance: ${formatPkrAmount(previousBalance)}, Net Profit: ${formatPkrAmount(closingData.netProfit)}`,
          updated_at: new Date().toISOString()
        }).eq('id', existingDateBalance.id);
        if (balanceError) console.error('Error updating closing balance:', balanceError);
      } else {
        const {
          error: balanceError
        } = await supabase.from('hospital_closing_balance').insert({
          closing_date: closingData.closingDate,
          closing_balance: newClosingBalance,
          notes: `Initial closing balance from daily closing. Previous day balance: ${formatPkrAmount(previousBalance)}, Net Profit: ${formatPkrAmount(closingData.netProfit)}`
        });
        if (balanceError) console.error('Error creating closing balance:', balanceError);
      }

      await generateDailyClosingPDF(closingData);
      return closingData;
    },
    onSuccess: () => {
      toast.success('Daily closing completed successfully! PDF report generated.');
      setShowClosingDialog(false);
      queryClient.invalidateQueries({ queryKey: ['last-daily-closing'] });
      queryClient.invalidateQueries({ queryKey: ['last-closing-info'] });
      queryClient.invalidateQueries({ queryKey: ['daily-finance'] });
      queryClient.invalidateQueries({ queryKey: ['daily-detailed'] });
      queryClient.invalidateQueries({ queryKey: ['daily-closings'] });
    },
    onError: error => {
      toast.error('Failed to create daily closing: ' + error.message);
    }
  });
  const handleRefresh = () => {
    refetch();
  };
  const handleDailyClosing = () => {
    setShowClosingDialog(true);
  };
  const confirmClosing = () => {
    createClosingMutation.mutate();
  };

  const recalculateClosingsMutation = useMutation({
    mutationFn: async () => {
      console.log('Starting recalculation of all historical closings...');

      const {
        data: closings,
        error: fetchError
      } = await supabase.from('daily_closings').select('*').order('closing_date', {
        ascending: true
      });
      if (fetchError) throw fetchError;
      if (!closings || closings.length === 0) {
        throw new Error('No closings found to recalculate');
      }
      console.log(`Found ${closings.length} closings to recalculate`);
      let updatedCount = 0;
      for (const closing of closings) {
        try {
          const transactionsData = closing.transactions_data as any;

          const labReports = transactionsData?.labReports || [];
          const uniqueInvoiceIds: string[] = [...new Set(labReports.map((lab: any) => lab.invoice_id).filter((id: any) => id != null))] as string[];
          if (uniqueInvoiceIds.length === 0) {
            console.log(`Closing ${closing.closing_date}: No lab invoices to recalculate`);
            continue;
          }

          const {
            data: invoices,
            error: invoiceError
          } = await supabase.from('invoices').select('id, amount').in('id', uniqueInvoiceIds);
          if (invoiceError) {
            console.error(`Error fetching invoices for closing ${closing.closing_date}:`, invoiceError);
            continue;
          }

          const labRevenue = invoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;

          const emergencyRevenue = (transactionsData?.emergencyAppointments || []).reduce((sum: number, apt: any) => sum + (apt.consultation_fee_at_time || 0), 0) + (transactionsData?.hospitalInvoices || []).filter((inv: any) => inv.description?.toLowerCase().includes('emergency') || inv.emergency_patient_data).reduce((sum: number, inv: any) => sum + Number(inv.amount || 0), 0);
          const xrayRevenue = (transactionsData?.xrayReports || []).reduce((sum: number, xray: any) => sum + (xray.price || 0), 0);
          const otHospitalRevenue = (transactionsData?.otSchedules || []).reduce((sum: number, ot: any) => sum + ((ot.total_cost || 0) - (ot.doctor_expense || 0)), 0);
          const miscellaneousIncome = (transactionsData?.miscellaneousIncome || []).reduce((sum: number, income: any) => sum + (income.amount || 0), 0);

          const newHospitalRevenue = emergencyRevenue + labRevenue + xrayRevenue + otHospitalRevenue + miscellaneousIncome;

          if (Math.abs(newHospitalRevenue - closing.hospital_revenue) > 0.01) {
            const oldLabRevenue = labReports.reduce((sum: number, lab: any) => sum + (lab.price || 0), 0);
            console.log(`Closing ${closing.closing_date}: Lab revenue ${oldLabRevenue} \u2192 ${labRevenue}, Hospital revenue ${closing.hospital_revenue} \u2192 ${newHospitalRevenue}`);

            const {
              error: updateError
            } = await supabase.from('daily_closings').update({
              hospital_revenue: newHospitalRevenue,
              net_profit: newHospitalRevenue - closing.total_expenses - closing.total_refunds
            }).eq('id', closing.id);
            if (updateError) {
              console.error(`Error updating closing ${closing.closing_date}:`, updateError);
            } else {
              updatedCount++;
            }
          } else {
            console.log(`Closing ${closing.closing_date}: No change needed (already correct)`);
          }
        } catch (error) {
          console.error(`Error processing closing ${closing.closing_date}:`, error);
        }
      }
      return {
        total: closings.length,
        updated: updatedCount
      };
    },
    onSuccess: result => {
      toast.success(`Successfully recalculated ${result.updated} out of ${result.total} closings with correct lab revenue`);
      queryClient.invalidateQueries({
        queryKey: ['daily-closings']
      });
      queryClient.invalidateQueries({
        queryKey: ['daily-data']
      });
    },
    onError: (error: any) => {
      console.error('Recalculation error:', error);
      toast.error(`Failed to recalculate closings: ${error.message}`);
    }
  });
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Daily Finance Report</h1>
          <p className="text-muted-foreground">
            Daily revenue, expenses, and profits for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </p>
          {dailyData?.lastClosing && <p className="text-xs text-blue-600 mt-1">
              {'\u{1F4CA}'} Showing activities since last closing: {formatInPakistanTime(new Date(dailyData.lastClosing.closing_time), 'MMM d, yyyy h:mm a')} (Pakistan time)
            </p>}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowClosingBalanceDialog(true)} variant="outline" className="flex items-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-50">
            <Calculator className="h-4 w-4" />
            Closing Balance
          </Button>
          
          <Button 
            onClick={() => {
              if (dailyData) {
                exportDailyClosingToCSV({
                  date: format(selectedDate, 'yyyy-MM-dd'),
                  hospitalRevenue: dailyData.totalHospitalRevenue || 0,
                  doctorRevenue: dailyData.doctorRevenue || 0,
                  consultationRevenue: dailyData.consultationRevenue || 0,
                  otDoctorExpense: dailyData.otDoctorExpense || 0,
                  emergencyRevenue: dailyData.emergencyRevenue || 0,
                  labRevenue: dailyData.labRevenue || 0,
                  xrayRevenue: dailyData.xrayRevenue || 0,
                  otHospitalRevenue: dailyData.otHospitalRevenue || 0,
                  miscellaneousIncome: dailyData.miscellaneousIncome || 0,
                  pharmacyRevenue: dailyData.pharmacyRevenue || 0,
                  pharmacyProfit: dailyData.pharmacyProfit || 0,
                  totalExpenses: dailyData.totalExpenses || 0,
                  totalRefunds: dailyData.totalRefunds || 0,
                  netProfit: dailyData.totalHospitalProfit || 0,
                  ipdDoctorRevenue: dailyData.ipdDoctorRevenue || 0,
                  ipdAnesthesiaRevenue: dailyData.ipdAnesthesiaRevenue || 0,
                  ipdOtaRevenue: dailyData.ipdOtaRevenue || 0,
                  ipdOtRevenue: dailyData.ipdOtRevenue || 0,
                  ipdBedRevenue: dailyData.ipdBedRevenue || 0,
                  ipdMedicineRevenue: dailyData.ipdMedicineRevenue || 0,
                  ipdLabRevenue: dailyData.ipdLabRevenue || 0,
                  ipdTotalRevenue: dailyData.ipdTotalRevenue || 0,
                  ipdTotalPaid: dailyData.ipdTotalPaid || 0,
                });
              }
            }}
            variant="outline" 
            className="flex items-center gap-2"
            disabled={!dailyData}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>

          <Button onClick={handleDailyClosing} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
            <FileText className="h-4 w-4" />
            Daily Closing
          </Button>
          <PreviousClosingsDialog />
          <Button onClick={handleRefresh} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Daily Revenue</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <StatsCard title="Hospital Revenue" value={formatPkrAmount(dailyData?.totalHospitalRevenue || 0)} icon={<Building className="w-5 h-5 text-blue-600" />} loading={isLoading} />
          <StatsCard title="Emergency Revenue" value={formatPkrAmount(dailyData?.emergencyRevenue || 0)} icon={<AlertTriangle className="w-5 h-5 text-red-600" />} loading={isLoading} />
          <StatsCard title="Lab Revenue" value={formatPkrAmount(dailyData?.labRevenue || 0)} icon={<TestTube className="w-5 h-5 text-green-600" />} loading={isLoading} />
          <StatsCard title="X-ray Revenue" value={formatPkrAmount(dailyData?.xrayRevenue || 0)} icon={<Activity className="w-5 h-5 text-pink-600" />} loading={isLoading} />
          <StatsCard title="OT Revenue" value={formatPkrAmount(dailyData?.otHospitalRevenue || 0)} icon={<Activity className="w-5 h-5 text-purple-600" />} loading={isLoading} />
          <StatsCard title="Miscellaneous Income" value={formatPkrAmount(dailyData?.miscellaneousIncome || 0)} icon={<DollarSign className="w-5 h-5 text-yellow-600" />} loading={isLoading} />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Doctor Revenue</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard title="Consultation Fees" value={formatPkrAmount(dailyData?.consultationRevenue || 0)} icon={<Banknote className="w-5 h-5 text-indigo-600" />} loading={isLoading} />
          <StatsCard title="OT Doctor Fees" value={formatPkrAmount(dailyData?.otDoctorExpense || 0)} icon={<Activity className="w-5 h-5 text-indigo-600" />} loading={isLoading} />
          <StatsCard title="Total Doctor Revenue" value={formatPkrAmount(dailyData?.doctorRevenue || 0)} icon={<DollarSign className="w-5 h-5 text-indigo-600" />} loading={isLoading} />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">IPD Revenue</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="IPD Total" value={formatPkrAmount(dailyData?.ipdTotalRevenue || 0)} icon={<BedDouble className="w-5 h-5 text-amber-600" />} loading={isLoading} />
          <StatsCard title="IPD Doctor Fees" value={formatPkrAmount(dailyData?.ipdDoctorRevenue || 0)} icon={<Stethoscope className="w-5 h-5 text-indigo-600" />} loading={isLoading} />
          <StatsCard title="IPD Bed Charges" value={formatPkrAmount(dailyData?.ipdBedRevenue || 0)} icon={<BedDouble className="w-5 h-5 text-blue-600" />} loading={isLoading} />
          <StatsCard title="IPD Collected" value={formatPkrAmount(dailyData?.ipdTotalPaid || 0)} icon={<Banknote className="w-5 h-5 text-green-600" />} loading={isLoading} />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Pharmacy Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard title="Pharmacy Revenue" value={formatPkrAmount(dailyData?.pharmacyRevenue || 0)} icon={<Pill className="w-5 h-5 text-blue-600" />} loading={isLoading} />
          <StatsCard title="Pharmacy Profit" value={formatPkrAmount(dailyData?.pharmacyProfit || 0)} icon={<TrendingUp className="w-5 h-5 text-green-600" />} loading={isLoading} />
          <StatsCard title="Pharmacy Returns" value={formatPkrAmount(dailyData?.pharmacyRefunds || 0)} icon={<TrendingDown className="w-5 h-5 text-red-600" />} loading={isLoading} />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Daily Profit & Loss</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Hospital Profit" value={formatPkrAmount(dailyData?.totalHospitalProfit || 0)} icon={<DollarSign className="w-5 h-5 text-green-600" />} loading={isLoading} />
          <StatsCard title="Daily Expenses" value={formatPkrAmount(dailyData?.totalExpenses || 0)} icon={<Receipt className="w-5 h-5 text-orange-600" />} loading={isLoading} />
          <StatsCard title="OT Returns" value={formatPkrAmount(dailyData?.otRefunds || 0)} icon={<Activity className="w-5 h-5 text-red-600" />} loading={isLoading} />
          <StatsCard title="Total Refunds" value={formatPkrAmount(dailyData?.totalRefunds || 0)} icon={<TrendingDown className="w-5 h-5 text-red-600" />} loading={isLoading} />
        </div>
      </div>

      {dailyData?.refunds && dailyData.refunds.length > 0 && <Card>
          <CardHeader>
            <CardTitle>Daily Refunds & Returns Detail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dailyData.refunds.map((refund, index) => <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{refund.refund_type.replace('_', ' ').toUpperCase()}</p>
                    <p className="text-sm text-muted-foreground">{refund.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">{formatPkrAmount(refund.amount)}</p>
                  </div>
                </div>)}
            </div>
          </CardContent>
        </Card>}

      <Dialog open={showClosingDialog} onOpenChange={setShowClosingDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <FileText className="h-6 w-6" />
              Daily Financial Closing Report
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6 p-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold">Daily Financial Closing</h2>
                <div className="flex justify-center gap-4 mt-2 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(new Date(), 'HH:mm:ss')}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Financial Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Total Revenue</div>
                      <div className="text-xl font-bold text-green-600">
                        {formatPkrAmount((dailyData?.totalHospitalRevenue || 0) + (dailyData?.pharmacyRevenue || 0) + (dailyData?.ipdTotalRevenue || 0))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Total Profit</div>
                      <div className="text-xl font-bold text-blue-600">
                        {formatPkrAmount((dailyData?.totalHospitalRevenue || 0) + (dailyData?.pharmacyProfit || 0))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Total Expenses</div>
                      <div className="text-xl font-bold text-red-600">
                        {formatPkrAmount(dailyData?.totalExpenses || 0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Net Profit</div>
                      <div className="text-xl font-bold text-purple-600">
                        {formatPkrAmount((dailyData?.totalHospitalRevenue || 0) + (dailyData?.pharmacyProfit || 0) - (dailyData?.totalExpenses || 0) - (dailyData?.totalRefunds || 0))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Pill className="h-5 w-5 text-blue-600" />
                  Pharmacy Department
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Revenue</div>
                      <div className="text-lg font-bold">{formatPkrAmount(dailyData?.pharmacyRevenue || 0)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Profit</div>
                      <div className="text-lg font-bold text-green-600">{formatPkrAmount(dailyData?.pharmacyProfit || 0)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Returns</div>
                      <div className="text-lg font-bold text-red-600">{formatPkrAmount(dailyData?.pharmacyRefunds || 0)}</div>
                    </CardContent>
                  </Card>
                </div>
                
                {detailedData?.pharmacyInvoices && detailedData.pharmacyInvoices.length > 0 && <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Pharmacy Transactions ({detailedData.pharmacyInvoices.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {detailedData.pharmacyInvoices.map((invoice, idx) => <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                              <span className="font-medium">{invoice.invoice_number}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                {invoice.customer_name || 'Walk-in Customer'}
                              </span>
                            </div>
                            <Badge variant={invoice.final_amount >= 0 ? "default" : "destructive"}>
                              {formatPkrAmount(invoice.final_amount)}
                            </Badge>
                          </div>)}
                      </div>
                    </CardContent>
                  </Card>}
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Building className="h-5 w-5 text-green-600" />
                  Hospital Department
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Emergency</div>
                      <div className="text-lg font-bold">{formatPkrAmount(dailyData?.emergencyRevenue || 0)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Lab Revenue</div>
                      <div className="text-lg font-bold">{formatPkrAmount(dailyData?.labRevenue || 0)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">X-ray Revenue</div>
                      <div className="text-lg font-bold">{formatPkrAmount(dailyData?.xrayRevenue || 0)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">OT Revenue</div>
                      <div className="text-lg font-bold">{formatPkrAmount(dailyData?.otHospitalRevenue || 0)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Total Revenue</div>
                      <div className="text-lg font-bold text-green-600">{formatPkrAmount(dailyData?.totalHospitalRevenue || 0)}</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {detailedData?.emergencyAppointments && detailedData.emergencyAppointments.length > 0 && <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Emergency Consultations ({detailedData.emergencyAppointments.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {detailedData.emergencyAppointments.map((apt, idx) => <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm">{(apt.patients?.profiles as any)?.first_name} {(apt.patients?.profiles as any)?.last_name}</span>
                              <Badge>{formatPkrAmount(apt.consultation_fee_at_time || 0)}</Badge>
                            </div>)}
                        </div>
                      </CardContent>
                    </Card>}

                  {detailedData?.labReports && detailedData.labReports.length > 0 && <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Lab Reports ({detailedData.labReports.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {detailedData.labReports.map((lab: any, idx: number) => <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm">{lab.test_name}</span>
                              <Badge>{formatPkrAmount(lab.price || 0)}</Badge>
                            </div>)}
                        </div>
                      </CardContent>
                    </Card>}

                  {detailedData?.xrayReports && detailedData.xrayReports.length > 0 && <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">X-ray Reports ({detailedData.xrayReports.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {detailedData.xrayReports.map((xray, idx) => <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm">{xray.test_name}</span>
                              <Badge>{formatPkrAmount(xray.price || 0)}</Badge>
                            </div>)}
                        </div>
                      </CardContent>
                    </Card>}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-indigo-600" />
                  Doctor Revenue
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Consultation Fees</div>
                      <div className="text-lg font-bold">{formatPkrAmount(dailyData?.consultationRevenue || 0)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">OT Doctor Fees</div>
                      <div className="text-lg font-bold">{formatPkrAmount(dailyData?.otDoctorExpense || 0)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Total Doctor Revenue</div>
                      <div className="text-lg font-bold text-indigo-600">{formatPkrAmount(dailyData?.doctorRevenue || 0)}</div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {detailedData?.expenses && detailedData.expenses.length > 0 && <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-orange-600" />
                    Daily Expenses ({detailedData.expenses.length})
                  </h3>
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {detailedData.expenses.map((expense, idx) => <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                              <span className="font-medium">{expense.category}</span>
                              <span className="text-sm text-muted-foreground block">{expense.description}</span>
                            </div>
                            <Badge variant="destructive">{formatPkrAmount(expense.amount)}</Badge>
                          </div>)}
                      </div>
                    </CardContent>
                  </Card>
                </div>}

              {detailedData?.refunds && detailedData.refunds.length > 0 && <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                    Refunds & Returns ({detailedData.refunds.length})
                  </h3>
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {detailedData.refunds.map((refund, idx) => <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                              <span className="font-medium">{refund.refund_type}</span>
                              <span className="text-sm text-muted-foreground block">{refund.description}</span>
                            </div>
                            <Badge variant="destructive">{formatPkrAmount(refund.amount)}</Badge>
                          </div>)}
                      </div>
                    </CardContent>
                  </Card>
                </div>}

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowClosingDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={confirmClosing} disabled={createClosingMutation.isPending} className="bg-green-600 hover:bg-green-700">
                  {createClosingMutation.isPending ? <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </div> : <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Confirm Daily Closing
                    </div>}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showLastClosingDialog} onOpenChange={setShowLastClosingDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Last Daily Closing Report
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh]">
            {lastClosingData ? <div className="space-y-4 p-4">
                <div className="text-center border-b pb-4">
                  <h3 className="text-xl font-bold">
                    {formatInPakistanTime(new Date(lastClosingData.closing_date), 'EEEE, MMMM d, yyyy')}
                  </h3>
                  <p className="text-muted-foreground">
                    Closed at: {formatInPakistanTime(new Date(lastClosingData.closing_time), 'h:mm:ss a')} (Pakistan time)
                  </p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Hospital Revenue</div>
                      <div className="text-lg font-bold">{formatPkrAmount(lastClosingData.hospital_revenue || 0)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Pharmacy Revenue</div>
                      <div className="text-lg font-bold">{formatPkrAmount(lastClosingData.pharmacy_revenue || 0)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Total Expenses</div>
                      <div className="text-lg font-bold text-red-600">{formatPkrAmount(lastClosingData.total_expenses || 0)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Net Profit</div>
                      <div className="text-lg font-bold text-green-600">{formatPkrAmount(lastClosingData.net_profit || 0)}</div>
                    </CardContent>
                  </Card>
                </div>
              </div> : <div className="text-center py-8">
                <p className="text-muted-foreground">No previous closing reports found.</p>
              </div>}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <HospitalClosingBalanceDialog open={showClosingBalanceDialog} onOpenChange={setShowClosingBalanceDialog} selectedDate={selectedDate} />
    </div>;
}
