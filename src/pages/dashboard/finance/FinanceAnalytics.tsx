import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { CalendarIcon, TrendingUp, Clock, CalendarRange } from "lucide-react";
import { AnalyticsReportDialog } from "@/components/dialogs/AnalyticsReportDialog";
import { useState, useEffect } from "react";
import { format, subMonths } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useFinancialAnalytics, FilterMode } from "@/hooks/useFinancialAnalytics";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FinanceAnalytics() {
  const [filterMode, setFilterMode] = useState<FilterMode>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const filterParams = {
    mode: filterMode,
    selectedMonth,
    startDate,
    endDate,
  };

  const { data: financialData, isLoading, refetch } = useFinancialAnalytics(selectedMonth, filterParams);

  // Use a single realtime channel for all finance-related tables
  useEffect(() => {
    const channel = supabase
      .channel('finance-analytics-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pharmacy_invoices' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  const pharmacySales = financialData?.pharmacySales || 0;
  const pharmacyProfit = financialData?.pharmacyProfit || 0;
  const hospitalRevenue = financialData?.hospitalRevenue || 0;
  const doctorsRevenue = financialData?.doctorsRevenue || 0;
  const totalRevenue = hospitalRevenue + doctorsRevenue;
  const hospitalProfitWithoutPharmacy = financialData?.hospitalProfitWithoutPharmacy || 0;
  const hospitalProfitWithPharmacy = financialData?.hospitalProfitWithPharmacy || 0;
  const operationsRevenue = financialData?.operationsRevenue || 0;
  const labRevenue = financialData?.labRevenue || 0;
  const xrayRevenue = financialData?.xrayRevenue || 0;
  const emergencyRevenue = financialData?.emergencyRevenue || 0;
  const totalExpenses = financialData?.totalExpenses || 0;
  const pharmacyInvoicesCount = financialData?.pharmacyInvoicesCount || 0;
  const pharmacyInvoicesAmount = financialData?.pharmacyInvoicesAmount || 0;
  const pharmacyExpensesCount = financialData?.pharmacyExpensesCount || 0;
  const pharmacyExpensesAmount = financialData?.pharmacyExpensesAmount || 0;
  const pharmacyReturns = financialData?.pharmacyReturns || 0;
  const totalRefunds = financialData?.totalRefunds || 0;
  const doctorPaymentsPaidCount = financialData?.doctorPaymentsPaidCount || 0;
  const doctorPaymentsPaidAmount = financialData?.doctorPaymentsPaidAmount || 0;
  const recentActivities = financialData?.recentActivity || [];

  const getTitle = () => {
    if (filterMode === 'all-time') return 'All Time';
    if (filterMode === 'custom' && startDate && endDate) return `${format(startDate, 'dd MMM yyyy')} - ${format(endDate, 'dd MMM yyyy')}`;
    return format(selectedMonth, 'MMMM yyyy');
  };

  if (isLoading) {
    return <div className="p-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <h2 className="text-2xl font-bold">Financial Analytics - {getTitle()}</h2>
          <Button onClick={() => refetch()} variant="outline" size="sm">Refresh</Button>
        </div>

        {/* Filter Mode Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)} className="w-auto">
            <TabsList>
              <TabsTrigger value="all-time" className="gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                All Time
              </TabsTrigger>
              <TabsTrigger value="monthly" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Monthly
              </TabsTrigger>
              <TabsTrigger value="custom" className="gap-1.5">
                <CalendarRange className="h-3.5 w-3.5" />
                Custom Range
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Monthly navigation */}
          {filterMode === 'monthly' && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
                ← Prev
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedMonth(new Date())}>
                Current
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => {
                  const next = new Date(selectedMonth);
                  next.setMonth(next.getMonth() + 1);
                  if (next <= new Date()) setSelectedMonth(next);
                }}
                disabled={selectedMonth.getMonth() === new Date().getMonth() && selectedMonth.getFullYear() === new Date().getFullYear()}
              >
                Next →
              </Button>
            </div>
          )}

          {/* Custom date range pickers */}
          {filterMode === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    {startDate ? format(startDate, "dd MMM yyyy") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} disabled={(date) => date > new Date()} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground text-sm">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    {endDate ? format(endDate, "dd MMM yyyy") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={(date) => date > new Date() || (startDate ? date < startDate : false)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard title="Total Revenue" value={formatPkrAmount(totalRevenue)} color="text-blue-700" sub="Hospital Share + Doctors Revenue" />
        <MetricCard title="Doctors Revenue" value={formatPkrAmount(doctorsRevenue)} color="text-indigo-600" sub="OPD consultations + OT doctor fees" />
        <MetricCard title="Hospital Share" value={formatPkrAmount(hospitalRevenue)} color="text-purple-600" sub="Lab + X-ray + OT + Emergency + Misc" />
        <MetricCard title="Hospital Profit (No Pharmacy)" value={formatPkrAmount(hospitalProfitWithoutPharmacy)} color={hospitalProfitWithoutPharmacy >= 0 ? 'text-green-600' : 'text-red-600'} sub="Hos. Share - Expenses" />
        <MetricCard title="Hospital Profit (With Pharmacy)" value={formatPkrAmount(hospitalProfitWithPharmacy)} color={hospitalProfitWithPharmacy >= 0 ? 'text-green-600' : 'text-red-600'} sub="Including pharmacy profit" />
        <MetricCard title="Total Expenses" value={formatPkrAmount(totalExpenses)} color="text-red-600" sub="All expenses" />
        <MetricCard title="Lab Revenue" value={formatPkrAmount(labRevenue)} color="text-amber-600" sub="All lab tests" />
        <MetricCard title="X-ray Revenue" value={formatPkrAmount(xrayRevenue)} color="text-violet-600" sub="All X-ray tests" />
        <MetricCard title="Operations Revenue" value={formatPkrAmount(operationsRevenue)} color="text-cyan-600" sub="Hospital share only" />
        <MetricCard title="Emergency Revenue" value={formatPkrAmount(emergencyRevenue)} color="text-rose-600" sub="Emergency consultations" />
        <MetricCard title="Pharmacy Sales" value={formatPkrAmount(pharmacySales)} color="text-blue-600" sub="Total sales" />
        <MetricCard title="Pharmacy Profit" value={formatPkrAmount(pharmacyProfit)} color="text-green-600" sub="After discounts" />
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pharmacy Invoices</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{pharmacyInvoicesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatPkrAmount(pharmacyInvoicesAmount)} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pharmacy Bills Paid</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pharmacyExpensesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatPkrAmount(pharmacyExpensesAmount)} total</p>
          </CardContent>
        </Card>
        <MetricCard title="Pharmacy Returns" value={formatPkrAmount(pharmacyReturns)} color="text-red-600" sub="Returns from sales" />
        <MetricCard title="Total Refunds" value={formatPkrAmount(totalRefunds)} color="text-orange-600" sub="Refunds issued" />
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Doctor Payments</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">{doctorPaymentsPaidCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatPkrAmount(doctorPaymentsPaidAmount)} paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader><CardTitle>Recent Financial Activities</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${activity.type === 'Refund' ? 'bg-orange-500' : activity.amount > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="font-medium">{activity.type}</p>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${activity.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {activity.amount > 0 ? '+' : ''}{formatPkrAmount(activity.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">{format(new Date(activity.date), 'MMM dd, HH:mm')}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No recent activities</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, color, sub }: { title: string; value: string; color: string; sub: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}
