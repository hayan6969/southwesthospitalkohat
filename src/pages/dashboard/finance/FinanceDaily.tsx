import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, RefreshCw, Building, AlertTriangle, TestTube, Activity, Pill, TrendingUp, TrendingDown, DollarSign, Receipt, FileText, Upload, Download, Clock, CheckCircle, Calculator } from "lucide-react";
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
export default function FinanceDaily() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showClosingDialog, setShowClosingDialog] = useState(false);
  const [showLastClosingDialog, setShowLastClosingDialog] = useState(false);
  const [showClosingBalanceDialog, setShowClosingBalanceDialog] = useState(false);
  const queryClient = useQueryClient();

  // Format date for queries
  const formatDateForQuery = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const targetDate = formatDateForQuery(selectedDate);

  // Fetch daily finance data
  // First get the last closing info for the query key
  const {
    data: lastClosingInfo
  } = useQuery({
    queryKey: ['last-closing-info'],
    queryFn: async () => {
      const {
        data
      } = await supabase.rpc('get_last_daily_closing');
      return data?.[0] || null;
    }
  });
  const {
    data: dailyData,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['daily-finance', targetDate, lastClosingInfo?.closing_time],
    queryFn: async () => {
      console.log('🔍 Daily Finance Query STARTED for date:', targetDate);
      console.log('🔍 Last closing info in query key:', lastClosingInfo);

      // First, get the last daily closing to determine the cutoff time
      const {
        data: lastClosingData
      } = await supabase.rpc('get_last_daily_closing');
      const lastClosing = lastClosingData?.[0];

      // Determine the time cutoff for filtering - use the same logic as detailed query
      let cutoffTime: string;
      if (lastClosing && lastClosing.closing_date !== targetDate) {
        // If there's a previous closing for a different date, use activities after that closing time
        cutoffTime = lastClosing.closing_time;
      } else if (lastClosing && lastClosing.closing_date === targetDate) {
        // If there's already a closing for the same date, use that closing time as cutoff
        cutoffTime = lastClosing.closing_time;
      } else {
        // If no previous closing, include activities from the beginning of the selected date in Pakistan time
        const selectedDatePakTime = toPakistanTime(new Date(`${targetDate}T00:00:00`));
        cutoffTime = selectedDatePakTime.toISOString();
      }

      // Current time for upper bound (only for today's date) in Pakistani timezone
      const currentPakTime = getCurrentPakistanTime();
      const selectedDatePakTime = toPakistanTime(new Date(`${targetDate}T00:00:00`));
      const isToday = currentPakTime.toDateString() === selectedDatePakTime.toDateString();
      const upperBound = isToday ? currentPakTime.toISOString() : toPakistanTime(new Date(`${targetDate}T23:59:59`)).toISOString();
      console.log('Filtering activities from:', cutoffTime, 'to:', upperBound);
      console.log('Last closing details:', lastClosing ? {
        id: lastClosing.id,
        closing_date: lastClosing.closing_date,
        closing_time: lastClosing.closing_time,
        formattedTime: formatInPakistanTime(new Date(lastClosing.closing_time), 'MMM d, yyyy h:mm a')
      } : 'No previous closing found');

      // Hospital invoices (consultations) - filter based on cutoff time (AFTER closing, not AT)
      const {
        data: hospitalInvoices
      } = await supabase.from('invoices').select('amount, created_at, description, emergency_patient_data, invoice_number').eq('status', 'paid').gt('created_at', cutoffTime) // Use gt (>) not gte (>=) to exclude boundary
      .lte('created_at', upperBound);
      console.log('Hospital invoices found:', hospitalInvoices?.length, hospitalInvoices);

      // Log each hospital invoice to verify time filtering
      if (hospitalInvoices && hospitalInvoices.length > 0) {
        console.log('Hospital invoice details:', hospitalInvoices.map(inv => ({
          amount: inv.amount,
          created_at: inv.created_at,
          formatted_time: formatInPakistanTime(new Date(inv.created_at), 'MMM d, yyyy h:mm a')
        })));
      }

      // Pharmacy invoices with items for profit calculation - filter based on cutoff time
      const {
        data: pharmacyInvoicesWithItems
      } = await supabase.from('pharmacy_invoices').select(`
          *,
          pharmacy_invoice_items(
            quantity,
            unit_price,
            total_price,
            medicine_id,
            medicines(purchase_price, selling_price)
          )
        `).gt('created_at', cutoffTime) // Use gt (>) not gte (>=) to exclude boundary
      .lte('created_at', upperBound);
      console.log('Pharmacy invoices found:', pharmacyInvoicesWithItems?.length, pharmacyInvoicesWithItems);

      // Log each pharmacy invoice to verify time filtering
      if (pharmacyInvoicesWithItems && pharmacyInvoicesWithItems.length > 0) {
        console.log('Pharmacy invoice details:', pharmacyInvoicesWithItems.map(inv => ({
          final_amount: inv.final_amount,
          created_at: inv.created_at,
          formatted_time: formatInPakistanTime(new Date(inv.created_at), 'MMM d, yyyy h:mm a')
        })));
      }

      // Lab invoices - filter based on cutoff time (use actual invoice amounts for revenue)
      const {
        data: labInvoices
      } = await supabase.from('invoices')
        .select('amount, created_at, description, invoice_number, status')
        .eq('status', 'paid')
        .like('invoice_number', 'LAB-%')
        .gt('created_at', cutoffTime) // Use gt (>) not gte (>=) to exclude boundary
        .lte('created_at', upperBound);
      console.log('Lab invoices found:', labInvoices?.length, labInvoices);

      // X-ray reports - filter based on cutoff time (include both completed and pending with prices)
      const {
        data: xrayReports
      } = await supabase.from('xray_reports').select('price, created_at, test_name, status').not('price', 'is', null).gt('created_at', cutoffTime) // Use gt (>) not gte (>=) to exclude boundary
      .lte('created_at', upperBound);
      console.log('X-ray reports found:', xrayReports?.length, xrayReports);

      // OT schedules - filter based on cutoff time and include both completed and scheduled
      const {
        data: otSchedules
      } = await supabase.from('ot_schedules').select('total_cost, doctor_expense, created_at, operation_date, status').in('status', ['completed', 'pending']).gt('created_at', cutoffTime) // Use gt (>) not gte (>=) to exclude boundary
      .lte('created_at', upperBound);
      console.log('OT schedules found:', otSchedules?.length, otSchedules);

      // Emergency consultations - filter based on cutoff time
      const {
        data: emergencyAppointments
      } = await supabase.from('appointments').select('consultation_fee_at_time, type, status, appointment_date').ilike('type', 'emergency').eq('status', 'completed').gte('appointment_date', cutoffTime).lte('appointment_date', upperBound);
      console.log('Emergency appointments found:', emergencyAppointments?.length, emergencyAppointments);

      // Daily expenses - filter based on cutoff time
      const {
        data: expenses
      } = await supabase.from('expenses').select('amount, expense_date, created_at').gt('created_at', cutoffTime) // Use gt (>) not gte (>=) to exclude boundary
      .lte('created_at', upperBound);
      console.log('Expenses found:', expenses?.length, expenses);

      // Refunds for the period - filter based on cutoff time
      const {
        data: refunds
      } = await supabase.from('refunds').select('amount, refund_type, description, created_at').gt('created_at', cutoffTime) // Use gt (>) not gte (>=) to exclude boundary
      .lte('created_at', upperBound);
      console.log('Refunds found:', refunds?.length, refunds);

      // Miscellaneous income - filter based on cutoff time
      const {
        data: miscIncome
      } = await supabase.from('miscellaneous_income').select('amount, description, created_at').gt('created_at', cutoffTime) // Use gt (>) not gte (>=) to exclude boundary
      .lte('created_at', upperBound);
      console.log('Miscellaneous income found:', miscIncome?.length, miscIncome);

      // Calculate totals
      // Hospital revenue includes paid consultation invoices + emergency + lab + x-ray + OT + miscellaneous
      const isEmergencyInvoice = (invoice: { description?: string | null; emergency_patient_data?: unknown }) =>
        invoice.description?.toLowerCase().includes('emergency') || Boolean(invoice.emergency_patient_data);

      const consultationRevenue = hospitalInvoices?.filter(inv =>
        (inv.invoice_number?.startsWith('INV-') ?? false) && !isEmergencyInvoice(inv)
      ).reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

      const emergencyAppointmentRevenue = emergencyAppointments?.reduce((sum, apt) => sum + (apt.consultation_fee_at_time || 0), 0) || 0;
      const emergencyInvoiceRevenue = hospitalInvoices?.filter(isEmergencyInvoice).reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;
      const emergencyRevenue = emergencyAppointmentRevenue + emergencyInvoiceRevenue;

      // Calculate pharmacy revenue and profit correctly
      let pharmacyRevenue = 0;
      let pharmacyProfit = 0;
      let pharmacyReturnsFromInvoices = 0;
      if (pharmacyInvoicesWithItems) {
        // Separate positive (sales) and negative (returns) amounts
        const positiveInvoices = pharmacyInvoicesWithItems.filter(inv => (inv.final_amount || 0) >= 0);
        const negativeInvoices = pharmacyInvoicesWithItems.filter(inv => (inv.final_amount || 0) < 0);

        // Returns from negative invoices (make positive for display)
        pharmacyReturnsFromInvoices = Math.abs(negativeInvoices.reduce((sum, inv) => sum + (inv.final_amount || 0), 0));

        // Calculate gross revenue from positive sales
        const grossPharmacyRevenue = positiveInvoices.reduce((sum, inv) => sum + (inv.final_amount || 0), 0);

        // Net revenue after subtracting full return amounts
        pharmacyRevenue = grossPharmacyRevenue - pharmacyReturnsFromInvoices;

        // Calculate gross profit only from positive sales based on actual unit price - purchase price
        const grossPharmacyProfit = positiveInvoices.reduce((totalProfit, invoice) => {
          const invoiceProfit = (invoice.pharmacy_invoice_items || []).reduce((itemsProfit, item) => {
            if (item.medicines && item.medicines.purchase_price) {
              // Use unit_price (actual charged price including discounts) not selling_price
              const profitPerUnit = item.unit_price - item.medicines.purchase_price;
              return itemsProfit + profitPerUnit * item.quantity;
            }
            return itemsProfit;
          }, 0);
          return totalProfit + invoiceProfit;
        }, 0);

        // Calculate profit portion of returns (only the profit lost, not the full return amount)
        const returnsProfit = negativeInvoices.reduce((totalProfit, invoice) => {
          const invoiceProfit = (invoice.pharmacy_invoice_items || []).reduce((itemsProfit, item) => {
            if (item.medicines && item.medicines.purchase_price) {
              // Use unit_price (actual charged price including discounts) not selling_price
              const profitPerUnit = item.unit_price - item.medicines.purchase_price;
              return itemsProfit + profitPerUnit * Math.abs(item.quantity); // Use absolute value for returns
            }
            return itemsProfit;
          }, 0);
          return totalProfit + invoiceProfit;
        }, 0);

        // Calculate NET pharmacy profit (gross profit minus only the profit portion of returns)
        pharmacyProfit = grossPharmacyProfit - returnsProfit;
      }
      const labRevenue = labInvoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
      const xrayRevenue = xrayReports?.reduce((sum, xray) => sum + (xray.price || 0), 0) || 0;
      const otHospitalRevenue = otSchedules?.reduce((sum, ot) => sum + ((ot.total_cost || 0) - (ot.doctor_expense || 0)), 0) || 0;
      const miscellaneousIncome = miscIncome?.reduce((sum, income) => sum + (income.amount || 0), 0) || 0;
      const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
      const totalRefunds = refunds?.reduce((sum, ref) => sum + ref.amount, 0) || 0;

      // Total hospital revenue = consultations + emergency + lab + xray + OT hospital portion + miscellaneous income
      const totalHospitalRevenue = consultationRevenue + emergencyRevenue + labRevenue + xrayRevenue + otHospitalRevenue + miscellaneousIncome;
      const totalHospitalProfit = totalHospitalRevenue - totalExpenses;

      // Categorize refunds
      const otRefunds = refunds?.filter(r => r.refund_type.includes('ot'))?.reduce((sum, r) => sum + r.amount, 0) || 0;
      const pharmacyRefunds = pharmacyReturnsFromInvoices + (refunds?.filter(r => r.refund_type === 'pharmacy_invoice')?.reduce((sum, r) => sum + r.amount, 0) || 0);
      const otherRefunds = refunds?.filter(r => !r.refund_type.includes('ot') && r.refund_type !== 'pharmacy_invoice')?.reduce((sum, r) => sum + r.amount, 0) || 0;
      console.log('Calculated values:', {
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
        cutoffTimeUsed: cutoffTime,
        upperBoundUsed: upperBound,
        lastClosingInfo: lastClosing ? formatInPakistanTime(new Date(lastClosing.closing_time), 'MMM d, yyyy h:mm a') : 'None'
      });
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
        refunds: refunds || [],
        lastClosing: lastClosing,
        cutoffTime: cutoffTime
      };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch detailed transactions for closing
  const {
    data: detailedData
  } = useQuery({
    queryKey: ['daily-detailed', targetDate],
    queryFn: async () => {
      const {
        data: lastClosingData
      } = await supabase.rpc('get_last_daily_closing');
      const lastClosing = lastClosingData?.[0];

      // Determine the time cutoff for filtering detailed data
      let cutoffTime: string;
      if (lastClosing && lastClosing.closing_date !== targetDate) {
        // If there's a previous closing for a different date, use activities after that closing time
        cutoffTime = lastClosing.closing_time;
      } else if (lastClosing && lastClosing.closing_date === targetDate) {
        // If there's already a closing for the same date, use that closing time as cutoff
        cutoffTime = lastClosing.closing_time;
      } else {
        // If no previous closing, include activities from the beginning of the selected date in Pakistan time
        const selectedDatePakTime = toPakistanTime(new Date(`${targetDate}T00:00:00`));
        cutoffTime = selectedDatePakTime.toISOString();
      }

      // Current time for upper bound (only for today's date) in Pakistani timezone
      const currentPakTime = getCurrentPakistanTime();
      const selectedDatePakTime = toPakistanTime(new Date(`${targetDate}T00:00:00`));
      const isToday = currentPakTime.toDateString() === selectedDatePakTime.toDateString();
      const upperBound = isToday ? currentPakTime.toISOString() : toPakistanTime(new Date(`${targetDate}T23:59:59`)).toISOString();

      // Fetch all detailed transaction data using proper time filtering
      const [hospitalInvoicesRes, pharmacyInvoicesRes, labInvoicesRes, xrayReportsRes, otSchedulesRes, emergencyAppointmentsRes, expensesRes, refundsRes, pharmacyExpensesRes, pharmacyAccountRes, totalStockRes, miscellaneousIncomeRes] = await Promise.all([supabase.from('invoices').select('*, patients(id, profiles(first_name, last_name))').eq('status', 'paid').gt('created_at', cutoffTime) // Use gt (>) not gte (>=) to exclude boundary
      .lte('created_at', upperBound), supabase.from('pharmacy_invoices').select(`
            *,
            pharmacy_invoice_items(
              quantity,
              unit_price,
              total_price,
              medicine_id,
              medicines(name, purchase_price, selling_price)
            )
          `).gt('created_at', cutoffTime) // Use gt (>) not gte (>=) to exclude boundary
      .lte('created_at', upperBound), supabase.from('lab_reports').select('*, patients(id, profiles(first_name, last_name))').not('price', 'is', null).gt('created_at', cutoffTime) // Use gt (>) not gte (>=) to exclude boundary
      .lte('created_at', upperBound), supabase.from('xray_reports').select('*').not('price', 'is', null).gt('created_at', cutoffTime) // Use gt (>) not gte (>=) to exclude boundary
      .lte('created_at', upperBound), supabase.from('ot_schedules').select('*, patients(id, profiles(first_name, last_name)), ot_operations(operation_name)').in('status', ['completed', 'pending']).gt('created_at', cutoffTime) // Use gt (>) not gte (>=) to exclude boundary
      .lte('created_at', upperBound), supabase.from('appointments').select('*, patients(id, profiles(first_name, last_name)), doctors(id, profiles(first_name, last_name))').ilike('type', 'emergency').eq('status', 'completed').gte('appointment_date', cutoffTime).lte('appointment_date', upperBound), supabase.from('expenses').select('*').gt('created_at', cutoffTime) // Use gt (>) not gte (>=) to exclude boundary
      .lte('created_at', upperBound), supabase.from('refunds').select('*').gt('created_at', cutoffTime) // Use gt (>) not gte (>=) to exclude boundary
      .lte('created_at', upperBound), supabase.from('pharmacy_expenses').select('*').gt('created_at', cutoffTime) // Use gt (>) not gte (>=) to exclude boundary
      .lte('created_at', upperBound), supabase.from('pharmacy_account').select('*').order('created_at', {
        ascending: false
      }).limit(1), supabase.from('medicines').select('stock_quantity, selling_price'), supabase.from('miscellaneous_income').select('*').gt('created_at', cutoffTime) // Use gt (>) not gte (>=) to exclude boundary
      .lte('created_at', upperBound)]);

      // Calculate total stock value
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
        pharmacyAccount: pharmacyAccountRes.data?.[0] || null,
        totalStockValue,
        lastClosing: lastClosing,
        cutoffTime: cutoffTime
      };
    },
    enabled: showClosingDialog
  });

  // Fetch last closing report
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

  // Create daily closing mutation
  const createClosingMutation = useMutation({
    mutationFn: async () => {
      // CRITICAL: Capture closing time FIRST, then recalculate all data with this exact timestamp
      const closingTimestamp = getCurrentPakistanTime().toISOString();
      
      console.log('🔒 DAILY CLOSING - Starting with exact timestamp:', closingTimestamp);
      
      // Get last closing to determine lower bound
      const { data: lastClosingData } = await supabase.rpc('get_last_daily_closing');
      const lastClosing = lastClosingData?.[0];
      
      // Determine cutoff time (lower bound) - use AFTER last closing time
      let cutoffTime: string;
      if (lastClosing) {
        cutoffTime = lastClosing.closing_time;
        console.log('📊 Using last closing time as lower bound:', cutoffTime);
      } else {
        const selectedDatePakTime = toPakistanTime(new Date(`${targetDate}T00:00:00`));
        cutoffTime = selectedDatePakTime.toISOString();
        console.log('📊 No previous closing, using start of day:', cutoffTime);
      }
      
      // Upper bound is the exact closing timestamp we just captured
      const upperBound = closingTimestamp;
      
      console.log('📊 Exact time range for closing:');
      console.log('   FROM (exclusive):', cutoffTime, '→', formatInPakistanTime(new Date(cutoffTime), 'MMM d, yyyy h:mm:ss a'));
      console.log('   TO (inclusive):', upperBound, '→', formatInPakistanTime(new Date(upperBound), 'MMM d, yyyy h:mm:ss a'));

      // Fetch ALL data with EXACT timestamp bounds
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
        miscellaneousIncomeRes
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
          .lte('created_at', upperBound)
      ]);

      // Log and check for errors in each query
      if (hospitalInvoicesRes.error) console.error('❌ Hospital invoices query error:', hospitalInvoicesRes.error);
      if (pharmacyInvoicesRes.error) console.error('❌ Pharmacy invoices query error:', pharmacyInvoicesRes.error);
      if (labInvoicesRes.error) console.error('❌ Lab invoices query error:', labInvoicesRes.error);
      if (xrayReportsRes.error) console.error('❌ X-ray reports query error:', xrayReportsRes.error);
      if (otSchedulesRes.error) console.error('❌ OT schedules query error:', otSchedulesRes.error);
      if (emergencyAppointmentsRes.error) console.error('❌ Emergency appointments query error:', emergencyAppointmentsRes.error);
      if (expensesRes.error) console.error('❌ Expenses query error:', expensesRes.error);
      if (refundsRes.error) console.error('❌ Refunds query error:', refundsRes.error);
      if (pharmacyExpensesRes.error) console.error('❌ Pharmacy expenses query error:', pharmacyExpensesRes.error);
      if (miscellaneousIncomeRes.error) console.error('❌ Miscellaneous income query error:', miscellaneousIncomeRes.error);

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

      // If pharmacy query failed or returned empty but we expect data, try a simpler query
      if (pharmacyInvoicesRes.error || pharmacyInvoices.length === 0) {
        console.log('⚠️ Pharmacy query may have failed, trying simpler query...');
        const { data: simplePharmacyData, error: simpleError } = await supabase
          .from('pharmacy_invoices')
          .select('id, invoice_number, customer_name, customer_phone, total_amount, discount_amount, final_amount, status, created_at')
          .gt('created_at', cutoffTime)
          .lte('created_at', upperBound);
        
        if (simpleError) {
          console.error('❌ Simple pharmacy query also failed:', simpleError);
        } else if (simplePharmacyData && simplePharmacyData.length > 0) {
          console.log('✅ Simple pharmacy query succeeded, fetching items separately...');
          // Fetch items for these invoices in batches
          const invoiceIds = simplePharmacyData.map(inv => inv.id);
          const { data: itemsData, error: itemsError } = await supabase
            .from('pharmacy_invoice_items')
            .select('invoice_id, quantity, unit_price, total_price, medicine_id, medicines(name, purchase_price, selling_price)')
            .in('invoice_id', invoiceIds);
          
          if (itemsError) {
            console.error('❌ Pharmacy items query failed:', itemsError);
          }
          
          // Combine invoices with items
          pharmacyInvoices = simplePharmacyData.map(inv => ({
            ...inv,
            pharmacy_invoice_items: (itemsData || []).filter(item => item.invoice_id === inv.id)
          }));
          console.log('✅ Rebuilt pharmacy data:', pharmacyInvoices.length, 'invoices with items');
        }
      }

      console.log('✅ Data fetched with exact timestamps:');
      console.log('   Hospital invoices:', hospitalInvoices.length);
      console.log('   Lab invoices:', labInvoices.length, '→ Rs.', labInvoices.reduce((s, inv) => s + (inv.amount || 0), 0));
      console.log('   Pharmacy invoices:', pharmacyInvoices.length);
      console.log('   X-ray reports:', xrayReports.length);
      console.log('   OT schedules:', otSchedules.length);

      // Calculate revenues with exact data
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

      // Pharmacy calculations
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

      // Other revenue calculations
      const labRevenue = labInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
      const xrayRevenue = xrayReports.reduce((sum, xray) => sum + (xray.price || 0), 0);
      const otHospitalRevenue = otSchedules.reduce((sum, ot) => 
        sum + ((ot.total_cost || 0) - (ot.doctor_expense || 0)), 0);
      const miscIncome = miscellaneousIncome.reduce((sum, income) => sum + (income.amount || 0), 0);
      const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const totalRefunds = refunds.reduce((sum, ref) => sum + ref.amount, 0);

      // Hospital revenue excludes consultation fees (those belong to doctor finances)
      const totalHospitalRevenue = emergencyRevenue + labRevenue + xrayRevenue + otHospitalRevenue + miscIncome;
      const totalStockValue = totalStock.reduce((sum, medicine) => 
        sum + (medicine.stock_quantity * medicine.purchase_price), 0);

      console.log('💰 Final calculations:');
      console.log('   Emergency Revenue:', emergencyRevenue);
      console.log('   Lab Revenue:', labRevenue, '← from', labInvoices.length, 'lab reports');
      console.log('   X-ray Revenue:', xrayRevenue);
      console.log('   OT Hospital Revenue:', otHospitalRevenue);
      console.log('   Misc Income:', miscIncome);
      console.log('   Total Hospital Revenue:', totalHospitalRevenue);
      console.log('   Pharmacy Revenue:', pharmacyRevenue);
      console.log('   Pharmacy Profit:', pharmacyProfit);
      console.log('   Total Expenses:', totalExpenses);
      console.log('   Total Refunds:', totalRefunds);

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
          labReports: labInvoices,
          xrayReports,
          otSchedules,
          emergencyAppointments,
          expenses,
          refunds,
          pharmacyExpenses,
          miscellaneousIncome,
          pharmacyAccount,
          totalStockValue,
          // Store exact timestamp bounds for audit trail
          cutoffTime,
          closingTimestamp
        }
      };

      console.log('💾 Creating daily closing record with EXACT timestamp:', closingData.closingTime);
      console.log('📊 Closing contains:');
      console.log('   Lab invoices:', labInvoices.length, '→ Total: Rs.', labRevenue);
      console.log('   First lab invoice:', labInvoices[0]?.invoice_number, '→', labInvoices[0]?.created_at);
      console.log('   Last lab invoice:', labInvoices[labInvoices.length - 1]?.invoice_number, '→', labInvoices[labInvoices.length - 1]?.created_at);
      
      // Create the daily closing record
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
        console.error('❌ Failed to create daily closing:', error);
        throw error;
      }
      
      console.log('✅ Daily closing created successfully with exact timestamp range');
      console.log('   Next closing will use time > ', closingData.closingTime);

      // Update hospital closing balance for the current closing date
      // IMPORTANT: previous balance must come from a date BEFORE this closing date
      const {
        data: previousDayBalanceRecord
      } = await supabase.from('hospital_closing_balance').select('closing_balance').lt('closing_date', closingData.closingDate).order('closing_date', {
        ascending: false
      }).order('updated_at', {
        ascending: false
      }).limit(1).maybeSingle();
      const previousBalance = Number(previousDayBalanceRecord?.closing_balance || 0);
      const newClosingBalance = previousBalance + closingData.netProfit;

      // Upsert by date (never overwrite an unrelated latest row)
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

      // Generate PDF after successful database insertion
      await generateDailyClosingPDF(closingData);
      return closingData;
    },
    onSuccess: () => {
      toast.success('Daily closing completed successfully! PDF report generated.');
      setShowClosingDialog(false);
      // Invalidate all related queries to refresh the UI
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

  // Mutation to recalculate all historical closings with correct lab revenue
  const recalculateClosingsMutation = useMutation({
    mutationFn: async () => {
      console.log('Starting recalculation of all historical closings...');

      // Fetch all daily closings
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

          // Extract unique invoice IDs from lab reports
          const labReports = transactionsData?.labReports || [];
          const uniqueInvoiceIds: string[] = [...new Set(labReports.map((lab: any) => lab.invoice_id).filter((id: any) => id != null))] as string[];
          if (uniqueInvoiceIds.length === 0) {
            console.log(`Closing ${closing.closing_date}: No lab invoices to recalculate`);
            continue;
          }

          // Fetch actual invoice amounts
          const {
            data: invoices,
            error: invoiceError
          } = await supabase.from('invoices').select('id, amount').in('id', uniqueInvoiceIds);
          if (invoiceError) {
            console.error(`Error fetching invoices for closing ${closing.closing_date}:`, invoiceError);
            continue;
          }

          // Calculate lab revenue from invoice amounts
          const labRevenue = invoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;

          // Calculate other revenues from transactions data
          const emergencyRevenue = (transactionsData?.emergencyAppointments || []).reduce((sum: number, apt: any) => sum + (apt.consultation_fee_at_time || 0), 0) + (transactionsData?.hospitalInvoices || []).filter((inv: any) => inv.description?.toLowerCase().includes('emergency') || inv.emergency_patient_data).reduce((sum: number, inv: any) => sum + Number(inv.amount || 0), 0);
          const xrayRevenue = (transactionsData?.xrayReports || []).reduce((sum: number, xray: any) => sum + (xray.price || 0), 0);
          const otHospitalRevenue = (transactionsData?.otSchedules || []).reduce((sum: number, ot: any) => sum + ((ot.total_cost || 0) - (ot.doctor_expense || 0)), 0);
          const miscellaneousIncome = (transactionsData?.miscellaneousIncome || []).reduce((sum: number, income: any) => sum + (income.amount || 0), 0);

          // Recalculate total hospital revenue
          const newHospitalRevenue = emergencyRevenue + labRevenue + xrayRevenue + otHospitalRevenue + miscellaneousIncome;

          // Only update if there's a difference
          if (Math.abs(newHospitalRevenue - closing.hospital_revenue) > 0.01) {
            const oldLabRevenue = labReports.reduce((sum: number, lab: any) => sum + (lab.price || 0), 0);
            console.log(`Closing ${closing.closing_date}: Lab revenue ${oldLabRevenue} → ${labRevenue}, Hospital revenue ${closing.hospital_revenue} → ${newHospitalRevenue}`);

            // Update the closing
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
      {/* Header with Date Filter */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Daily Finance Report</h1>
          <p className="text-muted-foreground">
            Daily revenue, expenses, and profits for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </p>
          {dailyData?.lastClosing && <p className="text-xs text-blue-600 mt-1">
              📊 Showing activities since last closing: {formatInPakistanTime(new Date(dailyData.lastClosing.closing_time), 'MMM d, yyyy h:mm a')} (Pakistan time)
            </p>}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowClosingBalanceDialog(true)} variant="outline" className="flex items-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-50">
            <Calculator className="h-4 w-4" />
            Closing Balance
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

      {/* Revenue Cards */}
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

      {/* Pharmacy Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Pharmacy Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard title="Pharmacy Revenue" value={formatPkrAmount(dailyData?.pharmacyRevenue || 0)} icon={<Pill className="w-5 h-5 text-blue-600" />} loading={isLoading} />
          <StatsCard title="Pharmacy Profit" value={formatPkrAmount(dailyData?.pharmacyProfit || 0)} icon={<TrendingUp className="w-5 h-5 text-green-600" />} loading={isLoading} />
          <StatsCard title="Pharmacy Returns" value={formatPkrAmount(dailyData?.pharmacyRefunds || 0)} icon={<TrendingDown className="w-5 h-5 text-red-600" />} loading={isLoading} />
        </div>
      </div>

      {/* Profit & Loss Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Daily Profit & Loss</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Hospital Profit" value={formatPkrAmount(dailyData?.totalHospitalProfit || 0)} icon={<DollarSign className="w-5 h-5 text-green-600" />} loading={isLoading} />
          <StatsCard title="Daily Expenses" value={formatPkrAmount(dailyData?.totalExpenses || 0)} icon={<Receipt className="w-5 h-5 text-orange-600" />} loading={isLoading} />
          <StatsCard title="OT Returns" value={formatPkrAmount(dailyData?.otRefunds || 0)} icon={<Activity className="w-5 h-5 text-red-600" />} loading={isLoading} />
          <StatsCard title="Total Refunds" value={formatPkrAmount(dailyData?.totalRefunds || 0)} icon={<TrendingDown className="w-5 h-5 text-red-600" />} loading={isLoading} />
        </div>
      </div>

      {/* Refunds Detail */}
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

      {/* Daily Closing Dialog */}
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
              {/* Header Info */}
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

              {/* Summary Section */}
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
                        {formatPkrAmount((dailyData?.totalHospitalRevenue || 0) + (dailyData?.pharmacyRevenue || 0))}
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

              {/* Pharmacy Section */}
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

              {/* Hospital Section */}
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

                {/* Detailed transactions */}
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

              {/* Expenses Section */}
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

              {/* Refunds Section */}
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

              {/* Confirmation */}
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

      {/* Last Closing Dialog */}
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

      {/* Hospital Closing Balance Dialog */}
      <HospitalClosingBalanceDialog open={showClosingBalanceDialog} onOpenChange={setShowClosingBalanceDialog} selectedDate={selectedDate} />
    </div>;
}