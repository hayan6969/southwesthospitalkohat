import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, RefreshCw, Building, AlertTriangle, TestTube, Activity, Pill, TrendingUp, TrendingDown, DollarSign, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { StatsCard } from "@/components/StatsCard";

export default function FinanceDaily() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

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
      // Hospital invoices (consultations)
      const { data: hospitalInvoices } = await supabase
        .from('invoices')
        .select('amount')
        .eq('status', 'paid')
        .gte('created_at', `${targetDate}T00:00:00`)
        .lt('created_at', `${targetDate}T23:59:59`);

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

      // Lab reports
      const { data: labReports } = await supabase
        .from('lab_reports')
        .select('price')
        .eq('status', 'completed')
        .gte('created_at', `${targetDate}T00:00:00`)
        .lt('created_at', `${targetDate}T23:59:59`);

      // OT schedules
      const { data: otSchedules } = await supabase
        .from('ot_schedules')
        .select('total_cost')
        .eq('status', 'completed')
        .eq('operation_date', targetDate);

      // Emergency consultations (appointments with emergency type)
      const { data: emergencyAppointments } = await supabase
        .from('appointments')
        .select('consultation_fee_at_time')
        .eq('type', 'emergency')
        .eq('status', 'completed')
        .gte('appointment_date', `${targetDate}T00:00:00`)
        .lt('appointment_date', `${targetDate}T23:59:59`);

      // Daily expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('expense_date', targetDate);

      // Refunds for the day
      const { data: refunds } = await supabase
        .from('refunds')
        .select('amount, refund_type, description')
        .gte('created_at', `${targetDate}T00:00:00`)
        .lt('created_at', `${targetDate}T23:59:59`);

      // Calculate totals
      const hospitalRevenue = hospitalInvoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
      
      // Calculate pharmacy revenue and profit correctly
      let pharmacyRevenue = 0;
      let pharmacyProfit = 0;
      
      if (pharmacyInvoicesWithItems) {
        pharmacyRevenue = pharmacyInvoicesWithItems.reduce((sum, inv) => sum + (inv.final_amount || 0), 0);
        
        // Calculate actual profit based on selling price - purchase price
        pharmacyProfit = pharmacyInvoicesWithItems.reduce((totalProfit, invoice) => {
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
      const otRevenue = otSchedules?.reduce((sum, ot) => sum + (ot.total_cost || 0), 0) || 0;
      const emergencyRevenue = emergencyAppointments?.reduce((sum, apt) => sum + (apt.consultation_fee_at_time || 0), 0) || 0;
      const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
      const totalRefunds = refunds?.reduce((sum, ref) => sum + ref.amount, 0) || 0;

      // Total hospital revenue and profit
      const totalHospitalRevenue = hospitalRevenue + labRevenue + otRevenue + emergencyRevenue;
      const totalHospitalProfit = totalHospitalRevenue - totalExpenses;

      // Categorize refunds
      const otRefunds = refunds?.filter(r => r.refund_type === 'ot_schedule')?.reduce((sum, r) => sum + r.amount, 0) || 0;
      const pharmacyRefunds = refunds?.filter(r => r.refund_type === 'pharmacy_invoice')?.reduce((sum, r) => sum + r.amount, 0) || 0;
      const otherRefunds = refunds?.filter(r => !['ot_schedule', 'pharmacy_invoice'].includes(r.refund_type))?.reduce((sum, r) => sum + r.amount, 0) || 0;

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

  const handleRefresh = () => {
    refetch();
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
    </div>
  );
}