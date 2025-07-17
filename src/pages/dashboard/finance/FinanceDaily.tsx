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
import { getCurrentPakistanTime } from "@/utils/timezone";

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
  const { data: dailyData, isLoading, refetch } = useQuery({
    queryKey: ['daily-finance', targetDate],
    queryFn: async () => {
      console.log('Daily Finance Query for date:', targetDate);
      
      // Hospital invoices (consultations)
      const { data: hospitalInvoices } = await supabase
        .from('invoices')
        .select('amount')
        .eq('status', 'paid')
        .gte('created_at', `${targetDate}T00:00:00`)
        .lt('created_at', `${targetDate}T23:59:59`);

      console.log('Hospital invoices found:', hospitalInvoices?.length, hospitalInvoices);

      // Pharmacy invoices with items for profit calculation
      const { data: pharmacyInvoicesWithItems } = await supabase
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
        .gte('created_at', `${targetDate}T00:00:00`)
        .lt('created_at', `${targetDate}T23:59:59`);

      console.log('Pharmacy invoices found:', pharmacyInvoicesWithItems?.length, pharmacyInvoicesWithItems);

      // Lab reports
      const { data: labReports } = await supabase
        .from('lab_reports')
        .select('price')
        .eq('status', 'completed')
        .gte('created_at', `${targetDate}T00:00:00`)
        .lt('created_at', `${targetDate}T23:59:59`);

      console.log('Lab reports found:', labReports?.length, labReports);

      // OT schedules
      const { data: otSchedules } = await supabase
        .from('ot_schedules')
        .select('total_cost, doctor_expense')
        .eq('status', 'completed')
        .eq('operation_date', targetDate);

      console.log('OT schedules found:', otSchedules?.length, otSchedules);

      // Emergency consultations - check both 'emergency' and 'Emergency' and include completed status
      const { data: emergencyAppointments } = await supabase
        .from('appointments')
        .select('consultation_fee_at_time, type, status, appointment_date')
        .ilike('type', 'emergency')
        .eq('status', 'completed')
        .gte('appointment_date', `${targetDate}T00:00:00`)
        .lt('appointment_date', `${targetDate}T23:59:59`);

      console.log('Emergency appointments found:', emergencyAppointments?.length, emergencyAppointments);

      // Let's also check all appointments for that date to see if any exist
      const { data: allAppointments } = await supabase
        .from('appointments')
        .select('consultation_fee_at_time, type, status, appointment_date')
        .gte('appointment_date', `${targetDate}T00:00:00`)
        .lt('appointment_date', `${targetDate}T23:59:59`);

      console.log('All appointments for date:', allAppointments?.length, allAppointments);

      // Daily expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('expense_date', targetDate);

      console.log('Expenses found:', expenses?.length, expenses);

      // Refunds for the day
      const { data: refunds } = await supabase
        .from('refunds')
        .select('amount, refund_type, description, created_at')
        .gte('created_at', `${targetDate}T00:00:00`)
        .lt('created_at', `${targetDate}T23:59:59`);

      console.log('Refunds found:', refunds?.length, refunds);

      // Let's also check all refunds to see if any exist
      const { data: allRefunds } = await supabase
        .from('refunds')
        .select('amount, refund_type, description, created_at');

      console.log('All refunds in system:', allRefunds?.length, allRefunds);

      // Calculate totals
      // Note: Regular consultation invoices are not included in hospital revenue
      const hospitalRevenue = 0; // Consultations are paid directly to doctors, not hospital revenue
      
      // Calculate pharmacy revenue and profit correctly
      let pharmacyRevenue = 0;
      let pharmacyProfit = 0;
      let pharmacyReturnsFromInvoices = 0;
      
      if (pharmacyInvoicesWithItems) {
        // Separate positive (sales) and negative (returns) amounts
        const positiveInvoices = pharmacyInvoicesWithItems.filter(inv => (inv.final_amount || 0) >= 0);
        const negativeInvoices = pharmacyInvoicesWithItems.filter(inv => (inv.final_amount || 0) < 0);
        
        // Revenue only from positive sales
        pharmacyRevenue = positiveInvoices.reduce((sum, inv) => sum + (inv.final_amount || 0), 0);
        
        // Returns from negative invoices (make positive for display)
        pharmacyReturnsFromInvoices = Math.abs(negativeInvoices.reduce((sum, inv) => sum + (inv.final_amount || 0), 0));
        
        // Calculate actual profit only from positive sales based on selling price - purchase price
        pharmacyProfit = positiveInvoices.reduce((totalProfit, invoice) => {
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
      
      const labRevenue = labReports?.reduce((sum, lab) => sum + (lab.price || 0), 0) || 0;
      const otRevenue = otSchedules?.reduce((sum, ot) => sum + ((ot.total_cost || 0) - (ot.doctor_expense || 0)), 0) || 0;
      const emergencyRevenue = emergencyAppointments?.reduce((sum, apt) => sum + (apt.consultation_fee_at_time || 0), 0) || 0;
      const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
      const totalRefunds = refunds?.reduce((sum, ref) => sum + ref.amount, 0) || 0;

      // Total hospital revenue and profit
      const totalHospitalRevenue = hospitalRevenue + labRevenue + otRevenue + emergencyRevenue;
      const totalHospitalProfit = totalHospitalRevenue - totalExpenses;

      // Categorize refunds
      const otRefunds = refunds?.filter(r => r.refund_type.includes('ot'))?.reduce((sum, r) => sum + r.amount, 0) || 0;
      const pharmacyRefunds = pharmacyReturnsFromInvoices + (refunds?.filter(r => r.refund_type === 'pharmacy_invoice')?.reduce((sum, r) => sum + r.amount, 0) || 0);
      const otherRefunds = refunds?.filter(r => !r.refund_type.includes('ot') && r.refund_type !== 'pharmacy_invoice')?.reduce((sum, r) => sum + r.amount, 0) || 0;

      console.log('Calculated values:', {
        hospitalRevenue,
        pharmacyRevenue,
        pharmacyProfit,
        labRevenue,
        otRevenue,
        emergencyRevenue,
        totalHospitalRevenue,
        totalHospitalProfit,
        totalExpenses,
        totalRefunds,
        otRefunds,
        pharmacyRefunds,
        otherRefunds
      });

      return {
        hospitalRevenue,
        pharmacyRevenue,
        pharmacyProfit,
        labRevenue,
        otRevenue,
        emergencyRevenue,
        totalHospitalRevenue,
        totalHospitalProfit,
        totalExpenses,
        totalRefunds,
        otRefunds,
        pharmacyRefunds,
        otherRefunds,
        refunds: refunds || []
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch detailed transactions for closing
  const { data: detailedData } = useQuery({
    queryKey: ['daily-detailed', targetDate],
    queryFn: async () => {
      // Fetch all detailed transaction data
      const [
        hospitalInvoicesRes,
        pharmacyInvoicesRes,
        labReportsRes,
        otSchedulesRes,
        emergencyAppointmentsRes,
        expensesRes,
        refundsRes,
        pharmacyExpensesRes,
        pharmacyAccountRes,
        totalStockRes
      ] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, patients(id, profiles(first_name, last_name))')
          .eq('status', 'paid')
          .gte('created_at', `${targetDate}T00:00:00`)
          .lt('created_at', `${targetDate}T23:59:59`),
        
        supabase
          .from('pharmacy_invoices')
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
          .gte('created_at', `${targetDate}T00:00:00`)
          .lt('created_at', `${targetDate}T23:59:59`),
        
        supabase
          .from('lab_reports')
          .select('*, patients(id, profiles(first_name, last_name))')
          .eq('status', 'completed')
          .gte('created_at', `${targetDate}T00:00:00`)
          .lt('created_at', `${targetDate}T23:59:59`),
        
        supabase
          .from('ot_schedules')
          .select('*, patients(id, profiles(first_name, last_name)), ot_operations(operation_name)')
          .eq('status', 'completed')
          .eq('operation_date', targetDate),
        
        supabase
          .from('appointments')
          .select('*, patients(id, profiles(first_name, last_name)), doctors(id, profiles(first_name, last_name))')
          .ilike('type', 'emergency')
          .eq('status', 'completed')
          .gte('appointment_date', `${targetDate}T00:00:00`)
          .lt('appointment_date', `${targetDate}T23:59:59`),
        
        supabase
          .from('expenses')
          .select('*')
          .eq('expense_date', targetDate),
        
        supabase
          .from('refunds')
          .select('*')
          .gte('created_at', `${targetDate}T00:00:00`)
          .lt('created_at', `${targetDate}T23:59:59`),
        
        supabase
          .from('pharmacy_expenses')
          .select('*')
          .eq('expense_date', targetDate),
        
        supabase
          .from('pharmacy_account')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1),
        
        supabase
          .from('medicines')
          .select('stock_quantity, selling_price')
      ]);

      // Calculate total stock value
      const totalStockValue = (totalStockRes.data || []).reduce((total: number, medicine: any) => {
        return total + (medicine.stock_quantity * medicine.selling_price);
      }, 0);

      return {
        hospitalInvoices: hospitalInvoicesRes.data || [],
        pharmacyInvoices: pharmacyInvoicesRes.data || [],
        labReports: labReportsRes.data || [],
        otSchedules: otSchedulesRes.data || [],
        emergencyAppointments: emergencyAppointmentsRes.data || [],
        expenses: expensesRes.data || [],
        refunds: refundsRes.data || [],
        pharmacyExpenses: pharmacyExpensesRes.data || [],
        pharmacyAccount: pharmacyAccountRes.data?.[0] || null,
        totalStockValue
      };
    },
    enabled: showClosingDialog
  });

  // Fetch last closing report
  const { data: lastClosingData } = useQuery({
    queryKey: ['last-daily-closing'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_last_daily_closing');
      return data?.[0] || null;
    },
    enabled: showLastClosingDialog
  });

  // Create daily closing mutation
  const createClosingMutation = useMutation({
    mutationFn: async () => {
      if (!detailedData || !dailyData) throw new Error('No data available');

      const pakistanNow = getCurrentPakistanTime();
      const closingData = {
        closingDate: targetDate,
        closingTime: pakistanNow.toISOString(),
        dayName: format(selectedDate, 'EEEE'),
        hospitalRevenue: dailyData.totalHospitalRevenue,
        pharmacyRevenue: dailyData.pharmacyRevenue,
        pharmacyProfit: dailyData.pharmacyProfit,
        totalExpenses: dailyData.totalExpenses,
        totalRefunds: dailyData.totalRefunds,
        netProfit: (dailyData.totalHospitalRevenue + dailyData.pharmacyProfit) - dailyData.totalExpenses - dailyData.totalRefunds,
        transactionsData: {
          hospitalInvoices: detailedData.hospitalInvoices,
          pharmacyInvoices: detailedData.pharmacyInvoices,
          labReports: detailedData.labReports,
          otSchedules: detailedData.otSchedules,
          emergencyAppointments: detailedData.emergencyAppointments,
          expenses: detailedData.expenses,
          refunds: detailedData.refunds,
          pharmacyExpenses: detailedData.pharmacyExpenses,
          pharmacyAccount: detailedData.pharmacyAccount,
          totalStockValue: detailedData.totalStockValue
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

      if (error) throw error;
      
      // Generate PDF after successful database insertion
      await generateDailyClosingPDF(closingData);
      
      return closingData;
    },
    onSuccess: () => {
      toast.success('Daily closing completed successfully! PDF report generated.');
      setShowClosingDialog(false);
      queryClient.invalidateQueries({ queryKey: ['last-daily-closing'] });
    },
    onError: (error) => {
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

  return (
    <div className="space-y-6">
      {/* Header with Date Filter */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Daily Finance Report</h1>
          <p className="text-muted-foreground">
            Daily revenue, expenses, and profits for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowClosingBalanceDialog(true)}
            variant="outline"
            className="flex items-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            <Calculator className="h-4 w-4" />
            Closing Balance
          </Button>
          <Button
            onClick={() => setShowLastClosingDialog(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Last Closing
          </Button>
          <Button
            onClick={handleDailyClosing}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <FileText className="h-4 w-4" />
            Daily Closing
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Button onClick={handleRefresh} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Revenue Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Daily Revenue</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Hospital Revenue"
            value={formatPkrAmount(dailyData?.totalHospitalRevenue || 0)}
            icon={<Building className="w-5 h-5 text-blue-600" />}
            loading={isLoading}
          />
          <StatsCard
            title="Emergency Revenue"
            value={formatPkrAmount(dailyData?.emergencyRevenue || 0)}
            icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
            loading={isLoading}
          />
          <StatsCard
            title="Lab Revenue"
            value={formatPkrAmount(dailyData?.labRevenue || 0)}
            icon={<TestTube className="w-5 h-5 text-green-600" />}
            loading={isLoading}
          />
          <StatsCard
            title="OT Revenue"
            value={formatPkrAmount(dailyData?.otRevenue || 0)}
            icon={<Activity className="w-5 h-5 text-purple-600" />}
            loading={isLoading}
          />
        </div>
      </div>

      {/* Pharmacy Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Pharmacy Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard
            title="Pharmacy Revenue"
            value={formatPkrAmount(dailyData?.pharmacyRevenue || 0)}
            icon={<Pill className="w-5 h-5 text-blue-600" />}
            loading={isLoading}
          />
          <StatsCard
            title="Pharmacy Profit"
            value={formatPkrAmount(dailyData?.pharmacyProfit || 0)}
            icon={<TrendingUp className="w-5 h-5 text-green-600" />}
            loading={isLoading}
          />
          <StatsCard
            title="Pharmacy Returns"
            value={formatPkrAmount(dailyData?.pharmacyRefunds || 0)}
            icon={<TrendingDown className="w-5 h-5 text-red-600" />}
            loading={isLoading}
          />
        </div>
      </div>

      {/* Profit & Loss Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Daily Profit & Loss</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Hospital Profit"
            value={formatPkrAmount(dailyData?.totalHospitalProfit || 0)}
            icon={<DollarSign className="w-5 h-5 text-green-600" />}
            loading={isLoading}
          />
          <StatsCard
            title="Daily Expenses"
            value={formatPkrAmount(dailyData?.totalExpenses || 0)}
            icon={<Receipt className="w-5 h-5 text-orange-600" />}
            loading={isLoading}
          />
          <StatsCard
            title="OT Returns"
            value={formatPkrAmount(dailyData?.otRefunds || 0)}
            icon={<Activity className="w-5 h-5 text-red-600" />}
            loading={isLoading}
          />
          <StatsCard
            title="Total Refunds"
            value={formatPkrAmount(dailyData?.totalRefunds || 0)}
            icon={<TrendingDown className="w-5 h-5 text-red-600" />}
            loading={isLoading}
          />
        </div>
      </div>

      {/* Refunds Detail */}
      {dailyData?.refunds && dailyData.refunds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Refunds & Returns Detail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dailyData.refunds.map((refund, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{refund.refund_type.replace('_', ' ').toUpperCase()}</p>
                    <p className="text-sm text-muted-foreground">{refund.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">{formatPkrAmount(refund.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                        {formatPkrAmount(((dailyData?.totalHospitalRevenue || 0) + (dailyData?.pharmacyProfit || 0)) - (dailyData?.totalExpenses || 0) - (dailyData?.totalRefunds || 0))}
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
                
                {detailedData?.pharmacyInvoices && detailedData.pharmacyInvoices.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Pharmacy Transactions ({detailedData.pharmacyInvoices.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {detailedData.pharmacyInvoices.map((invoice, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                              <span className="font-medium">{invoice.invoice_number}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                {invoice.customer_name || 'Walk-in Customer'}
                              </span>
                            </div>
                            <Badge variant={invoice.final_amount >= 0 ? "default" : "destructive"}>
                              {formatPkrAmount(invoice.final_amount)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Hospital Section */}
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Building className="h-5 w-5 text-green-600" />
                  Hospital Department
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                      <div className="text-sm text-muted-foreground">OT Revenue</div>
                      <div className="text-lg font-bold">{formatPkrAmount(dailyData?.otRevenue || 0)}</div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {detailedData?.emergencyAppointments && detailedData.emergencyAppointments.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Emergency Consultations ({detailedData.emergencyAppointments.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {detailedData.emergencyAppointments.map((apt, idx) => (
                            <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm">{apt.patients?.profiles?.first_name} {apt.patients?.profiles?.last_name}</span>
                              <Badge>{formatPkrAmount(apt.consultation_fee_at_time || 0)}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {detailedData?.labReports && detailedData.labReports.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Lab Reports ({detailedData.labReports.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {detailedData.labReports.map((lab, idx) => (
                            <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm">{lab.test_name}</span>
                              <Badge>{formatPkrAmount(lab.price || 0)}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Expenses Section */}
              {detailedData?.expenses && detailedData.expenses.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-orange-600" />
                    Daily Expenses ({detailedData.expenses.length})
                  </h3>
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {detailedData.expenses.map((expense, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                              <span className="font-medium">{expense.category}</span>
                              <span className="text-sm text-muted-foreground block">{expense.description}</span>
                            </div>
                            <Badge variant="destructive">{formatPkrAmount(expense.amount)}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Refunds Section */}
              {detailedData?.refunds && detailedData.refunds.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                    Refunds & Returns ({detailedData.refunds.length})
                  </h3>
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {detailedData.refunds.map((refund, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                              <span className="font-medium">{refund.refund_type}</span>
                              <span className="text-sm text-muted-foreground block">{refund.description}</span>
                            </div>
                            <Badge variant="destructive">{formatPkrAmount(refund.amount)}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Confirmation */}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowClosingDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={confirmClosing} 
                  disabled={createClosingMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createClosingMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Confirm Daily Closing
                    </div>
                  )}
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
            {lastClosingData ? (
              <div className="space-y-4 p-4">
                <div className="text-center border-b pb-4">
                  <h3 className="text-xl font-bold">
                    {format(new Date(lastClosingData.closing_date), 'EEEE, MMMM d, yyyy')}
                  </h3>
                  <p className="text-muted-foreground">
                    Closed at: {format(new Date(lastClosingData.closing_time), 'HH:mm:ss')}
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
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No previous closing reports found.</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Hospital Closing Balance Dialog */}
      <HospitalClosingBalanceDialog
        open={showClosingBalanceDialog}
        onOpenChange={setShowClosingBalanceDialog}
        selectedDate={selectedDate}
      />
    </div>
  );
}