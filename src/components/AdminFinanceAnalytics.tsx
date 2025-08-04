import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { StatsCard } from "@/components/StatsCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { Calendar, Download, Filter, TrendingUp, TrendingDown, Banknote, CreditCard, Activity, BarChart3, PieChart, DollarSign } from "lucide-react";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths } from "date-fns";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area } from "recharts";

interface FinanceData {
  hospitalInvoices: any[];
  pharmacyInvoices: any[];
  labReports: any[];
  otSchedules: any[];
  expenses: any[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function AdminFinanceAnalytics() {
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "year" | "custom">("month");
  const [startDate, setStartDate] = useState<Date | null>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | null>(endOfMonth(new Date()));
  const [selectedSource, setSelectedSource] = useState("all");

  // Auto-update date range based on selection
  useEffect(() => {
    const now = new Date();
    switch (dateRange) {
      case "today":
        setStartDate(startOfDay(now));
        setEndDate(endOfDay(now));
        break;
      case "week":
        setStartDate(subDays(now, 7));
        setEndDate(now);
        break;
      case "month":
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case "year":
        setStartDate(startOfYear(now));
        setEndDate(endOfYear(now));
        break;
    }
  }, [dateRange]);

  // Real-time finance data with filters
  const { data: financeData, isLoading, refetch } = useQuery({
    queryKey: ['admin-finance-analytics', startDate, endDate, selectedSource],
    queryFn: async (): Promise<FinanceData> => {
      const start = startDate?.toISOString();
      const end = endDate?.toISOString();

      const [
        { data: hospitalInvoices },
        { data: pharmacyInvoices },
        { data: labReports },
        { data: otSchedules },
        { data: expenses }
      ] = await Promise.all([
        supabase.from('invoices').select('*').gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false }),
        supabase.from('pharmacy_invoices').select('*').gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false }),
        supabase.from('lab_reports').select('*').gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false }),
        supabase.from('ot_schedules').select('*').gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false }),
        supabase.from('expenses').select('*').gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false })
      ]);

      return {
        hospitalInvoices: hospitalInvoices || [],
        pharmacyInvoices: pharmacyInvoices || [],
        labReports: labReports || [],
        otSchedules: otSchedules || [],
        expenses: expenses || []
      };
    },
    refetchInterval: 30000, // Real-time updates every 30 seconds
  });

  // Calculate analytics
  const analytics = financeData ? calculateAnalytics(financeData) : null;

  // Real-time subscription for updates
  useEffect(() => {
    const channel = supabase
      .channel('finance-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pharmacy_invoices' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_reports' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ot_schedules' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => refetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  if (isLoading || !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financial Analytics</h2>
          <p className="text-gray-600">Comprehensive financial insights and real-time updates</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          
          {dateRange === "custom" && (
            <>
              <DatePicker
                date={startDate}
                onDateChange={setStartDate}
                placeholder="Start Date"
              />
              <DatePicker
                date={endDate}
                onDateChange={setEndDate}
                placeholder="End Date"
              />
            </>
          )}
          
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hospital">Hospital</TabsTrigger>
          <TabsTrigger value="pharmacy">Pharmacy</TabsTrigger>
          <TabsTrigger value="lab">Lab</TabsTrigger>
          <TabsTrigger value="ot">OT</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Today's Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-green-600">{formatPkrAmount(analytics.todayRevenue)}</div>
                  <div className="text-sm text-gray-600">Total earnings today</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Monthly Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-blue-600">{formatPkrAmount(analytics.monthlyRevenue)}</div>
                  <div className="text-sm text-gray-600">This month's earnings</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Net Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-purple-600">{formatPkrAmount(analytics.netProfit)}</div>
                  <div className="text-sm text-gray-600">Revenue - Expenses</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-orange-600">{formatPkrAmount(analytics.totalExpenses)}</div>
                  <div className="text-sm text-gray-600">All expenses</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.dailyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatPkrAmount(Number(value))} />
                    <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="expenses" stackId="2" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue by Source */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Revenue by Source
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={analytics.revenueBySource}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.revenueBySource.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatPkrAmount(Number(value))} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Individual source tabs with detailed analytics */}
        <TabsContent value="hospital">
          <HospitalAnalytics data={financeData.hospitalInvoices} />
        </TabsContent>

        <TabsContent value="pharmacy">
          <PharmacyAnalytics data={financeData.pharmacyInvoices} />
        </TabsContent>

        <TabsContent value="lab">
          <LabAnalytics data={financeData.labReports} />
        </TabsContent>

        <TabsContent value="ot">
          <OTAnalytics data={financeData.otSchedules} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function calculateAnalytics(data: FinanceData) {
  const { hospitalInvoices, pharmacyInvoices, labReports, otSchedules, expenses } = data;
  const today = new Date();
  const startOfToday = startOfDay(today);
  const endOfToday = endOfDay(today);
  const startOfThisMonth = startOfMonth(today);
  const endOfThisMonth = endOfMonth(today);

  // IMPORTANT: Correct revenue flow separation
  // Doctor revenue: Regular appointment consultation fees + OT doctor expenses
  // Hospital revenue: EMERGENCY consultations + Lab tests + OT hospital portion (total - doctor expense) + pharmacy profit

  // Emergency consultations go to hospital
  const emergencyConsultationRevenue = hospitalInvoices.filter(inv => 
    inv.status === 'paid' && inv.description?.toLowerCase().includes('emergency')
  ).reduce((sum, inv) => sum + Number(inv.amount), 0);
  
  // Regular consultations go to doctors (not counted in hospital revenue)
  const doctorConsultationRevenue = hospitalInvoices.filter(inv => 
    inv.status === 'paid' && (!inv.description?.toLowerCase().includes('emergency'))
  ).reduce((sum, inv) => sum + Number(inv.amount), 0);
  
  // Calculate pharmacy revenue and profit
  const pharmacyRevenue = pharmacyInvoices.reduce((sum, inv) => sum + Number(inv.final_amount), 0);
  // For now, use estimated profit margin - ideally should fetch invoice items
  const pharmacyProfit = pharmacyRevenue * 0.25; // Estimated 25% profit margin
  
  // Lab revenue goes to hospital (both completed and pending with prices)
  const labRevenue = labReports.filter(report => report.price).reduce((sum, report) => sum + Number(report.price), 0);
  
  // OT revenue - hospital gets total cost minus doctor expense
  const otHospitalRevenue = otSchedules.filter(schedule => schedule.total_cost && schedule.doctor_expense)
    .reduce((sum, schedule) => sum + (Number(schedule.total_cost) - Number(schedule.doctor_expense)), 0);
  
  // OT doctor expenses go to doctors
  const otDoctorExpenses = otSchedules.filter(schedule => schedule.doctor_expense)
    .reduce((sum, schedule) => sum + Number(schedule.doctor_expense), 0);

  // Hospital revenue = EMERGENCY consultations + lab + OT hospital portion + pharmacy profit
  const hospitalRevenue = emergencyConsultationRevenue + labRevenue + otHospitalRevenue + pharmacyProfit;
  
  // Total revenue for display purposes
  const totalRevenue = hospitalRevenue + pharmacyRevenue + doctorConsultationRevenue + otDoctorExpenses;
  
  // Calculate TODAY's revenue
  const todayEmergencyRevenue = hospitalInvoices.filter(inv => 
    inv.status === 'paid' && 
    inv.description?.toLowerCase().includes('emergency') &&
    new Date(inv.created_at) >= startOfToday && new Date(inv.created_at) <= endOfToday
  ).reduce((sum, inv) => sum + Number(inv.amount), 0);
  
  const todayPharmacyRevenue = pharmacyInvoices.filter(inv =>
    new Date(inv.created_at) >= startOfToday && new Date(inv.created_at) <= endOfToday
  ).reduce((sum, inv) => sum + Number(inv.final_amount), 0);
  
  const todayLabRevenue = labReports.filter(report => 
    report.price &&
    new Date(report.created_at) >= startOfToday && new Date(report.created_at) <= endOfToday
  ).reduce((sum, report) => sum + Number(report.price), 0);
  
  const todayOTRevenue = otSchedules.filter(schedule => 
    schedule.total_cost && schedule.doctor_expense &&
    new Date(schedule.created_at) >= startOfToday && new Date(schedule.created_at) <= endOfToday
  ).reduce((sum, schedule) => sum + (Number(schedule.total_cost) - Number(schedule.doctor_expense)), 0);
  
  const todayTotalRevenue = todayEmergencyRevenue + todayPharmacyRevenue + todayLabRevenue + todayOTRevenue;
  
  // Calculate MONTHLY revenue
  const monthlyEmergencyRevenue = hospitalInvoices.filter(inv => 
    inv.status === 'paid' && 
    inv.description?.toLowerCase().includes('emergency') &&
    new Date(inv.created_at) >= startOfThisMonth && new Date(inv.created_at) <= endOfThisMonth
  ).reduce((sum, inv) => sum + Number(inv.amount), 0);
  
  const monthlyPharmacyRevenue = pharmacyInvoices.filter(inv =>
    new Date(inv.created_at) >= startOfThisMonth && new Date(inv.created_at) <= endOfThisMonth
  ).reduce((sum, inv) => sum + Number(inv.final_amount), 0);
  
  const monthlyLabRevenue = labReports.filter(report => 
    report.price &&
    new Date(report.created_at) >= startOfThisMonth && new Date(report.created_at) <= endOfThisMonth
  ).reduce((sum, report) => sum + Number(report.price), 0);
  
  const monthlyOTRevenue = otSchedules.filter(schedule => 
    schedule.total_cost && schedule.doctor_expense &&
    new Date(schedule.created_at) >= startOfThisMonth && new Date(schedule.created_at) <= endOfThisMonth
  ).reduce((sum, schedule) => sum + (Number(schedule.total_cost) - Number(schedule.doctor_expense)), 0);
  
  const monthlyTotalRevenue = monthlyEmergencyRevenue + monthlyPharmacyRevenue + monthlyLabRevenue + monthlyOTRevenue;
  
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const netProfit = hospitalRevenue - totalExpenses; // Hospital profit only
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Calculate daily trends
  const dailyTrends = calculateDailyTrends([...hospitalInvoices, ...pharmacyInvoices, ...labReports, ...otSchedules], expenses);

  // Revenue by source for pie chart
  const revenueBySource = [
    { name: 'Hospital', value: hospitalRevenue },
    { name: 'Pharmacy', value: pharmacyRevenue },
    { name: 'Lab', value: labRevenue },
    { name: 'OT', value: otHospitalRevenue }
  ].filter(item => item.value > 0);

  // Recent activities
  const recentActivities = [
    ...hospitalInvoices.slice(0, 5).map(inv => ({
      type: 'Hospital Revenue',
      amount: Number(inv.amount),
      description: `Invoice ${inv.invoice_number}`,
      date: inv.created_at || ''
    })),
    ...expenses.slice(0, 5).map(exp => ({
      type: 'Expense',
      amount: -Number(exp.amount),
      description: exp.description,
      date: exp.created_at || ''
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  return {
    totalRevenue,
    todayRevenue: todayTotalRevenue,
    monthlyRevenue: monthlyTotalRevenue,
    totalExpenses,
    netProfit,
    profitMargin,
    dailyAverage: totalRevenue / Math.max(1, dailyTrends.length),
    revenueChange: 12.5, // Calculate based on previous period
    expenseChange: 8.3,
    hospitalRevenue,
    pharmacyRevenue,
    labRevenue,
    otRevenue: otHospitalRevenue,
    hospitalInvoiceCount: hospitalInvoices.length,
    pharmacyInvoiceCount: pharmacyInvoices.length,
    labReportCount: labReports.length,
    otScheduleCount: otSchedules.length,
    hospitalAverage: hospitalInvoices.length > 0 ? hospitalRevenue / hospitalInvoices.length : 0,
    pharmacyAverage: pharmacyInvoices.length > 0 ? pharmacyRevenue / pharmacyInvoices.length : 0,
    labAverage: labReports.length > 0 ? labRevenue / labReports.length : 0,
    otAverage: otSchedules.length > 0 ? otHospitalRevenue / otSchedules.length : 0,
    dailyTrends,
    revenueBySource,
    recentActivities
  };
}

function calculateDailyTrends(revenueData: any[], expenseData: any[]) {
  const trendsMap = new Map();

  // Process revenue data
  revenueData.forEach(item => {
    if (!item.created_at) return;
    const date = format(new Date(item.created_at), 'MMM dd');
    if (!trendsMap.has(date)) {
      trendsMap.set(date, { date, revenue: 0, expenses: 0 });
    }
    
    let amount = 0;
    if ('amount' in item && item.status === 'paid') amount = Number(item.amount);
    else if ('final_amount' in item) amount = Number(item.final_amount);
    else if ('price' in item && item.price) amount = Number(item.price);
    else if ('total_cost' in item && item.total_cost && item.doctor_expense) {
      amount = Number(item.total_cost) - Number(item.doctor_expense);
    }
    
    trendsMap.get(date).revenue += amount;
  });

  // Process expense data
  expenseData.forEach(expense => {
    if (!expense.created_at) return;
    const date = format(new Date(expense.created_at), 'MMM dd');
    if (!trendsMap.has(date)) {
      trendsMap.set(date, { date, revenue: 0, expenses: 0 });
    }
    trendsMap.get(date).expenses += Number(expense.amount);
  });

  return Array.from(trendsMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Individual analytics components
function HospitalAnalytics({ data }: { data: any[] }) {
  // NOTE: This shows all invoice revenue. Emergency consultations go to hospital, regular consultations go to doctors
  // For accurate separation, hospital gets emergency + lab + OT (minus doctor expense) + pharmacy profit
  const totalRevenue = data.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + Number(inv.amount), 0);
  
  return (
    <div className="space-y-6">
      {/* Hospital Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Today's Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">{formatPkrAmount(totalRevenue)}</div>
              <div className="text-sm text-gray-600">Hospital earnings today</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">{formatPkrAmount(totalRevenue)}</div>
              <div className="text-sm text-gray-600">This month's earnings</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-purple-600">{data.length}</div>
              <div className="text-sm text-gray-600">All hospital invoices</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Hospital Invoice Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['paid', 'pending', 'overdue'].map(status => {
                const count = data.filter(inv => inv.status === status).length;
                const amount = data.filter(inv => inv.status === status).reduce((sum, inv) => sum + Number(inv.amount), 0);
                return (
                  <div key={status} className="flex justify-between items-center">
                    <span className="capitalize font-medium">{status}</span>
                    <div className="text-right">
                      <div className="font-semibold">{formatPkrAmount(amount)}</div>
                      <div className="text-sm text-gray-500">{count} invoices</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PharmacyAnalytics({ data }: { data: any[] }) {
  const totalSales = data.reduce((sum, inv) => sum + Number(inv.final_amount), 0);
  const totalDiscount = data.reduce((sum, inv) => sum + Number(inv.discount_amount || 0), 0);
  
  return (
    <div className="space-y-6">
      {/* Pharmacy Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Today's Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">{formatPkrAmount(totalSales)}</div>
              <div className="text-sm text-gray-600">Pharmacy earnings today</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Monthly Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">{formatPkrAmount(totalSales)}</div>
              <div className="text-sm text-gray-600">This month's sales</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-purple-600">{data.length}</div>
              <div className="text-sm text-gray-600">All pharmacy sales</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pharmacy Sales Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Total Sales</span>
                <span className="font-semibold">{formatPkrAmount(totalSales)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Discounts</span>
                <span className="font-semibold text-red-600">-{formatPkrAmount(totalDiscount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Average Sale</span>
                <span className="font-semibold">{formatPkrAmount(data.length > 0 ? totalSales / data.length : 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LabAnalytics({ data }: { data: any[] }) {
  const completedTests = data.filter(lab => lab.status === 'completed').length;
  const pendingTests = data.filter(lab => lab.status === 'pending').length;
  const totalRevenue = data.reduce((sum, lab) => sum + Number(lab.price || 0), 0);
  
  return (
    <div className="space-y-6">
      {/* Lab Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Today's Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">{formatPkrAmount(totalRevenue)}</div>
              <div className="text-sm text-gray-600">Lab earnings today</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">{formatPkrAmount(totalRevenue)}</div>
              <div className="text-sm text-gray-600">This month's earnings</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-purple-600">{data.length}</div>
              <div className="text-sm text-gray-600">All lab tests</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Lab Test Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Completed Tests</span>
                <span className="font-semibold text-green-600">{completedTests}</span>
              </div>
              <div className="flex justify-between">
                <span>Pending Tests</span>
                <span className="font-semibold text-yellow-600">{pendingTests}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Revenue</span>
                <span className="font-semibold">{formatPkrAmount(totalRevenue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OTAnalytics({ data }: { data: any[] }) {
  const completedOTs = data.filter(ot => ot.status === 'completed').length;
  const scheduledOTs = data.filter(ot => ot.status === 'scheduled').length;
  const totalRevenue = data.reduce((sum, ot) => sum + (Number(ot.total_cost || 0) - Number(ot.doctor_expense || 0)), 0);
  
  return (
    <div className="space-y-6">
      {/* OT Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Today's Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">{formatPkrAmount(totalRevenue)}</div>
              <div className="text-sm text-gray-600">OT earnings today</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">{formatPkrAmount(totalRevenue)}</div>
              <div className="text-sm text-gray-600">This month's earnings</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-purple-600">{data.length}</div>
              <div className="text-sm text-gray-600">All OT operations</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>OT Operations Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Completed Operations</span>
                <span className="font-semibold text-green-600">{completedOTs}</span>
              </div>
              <div className="flex justify-between">
                <span>Scheduled Operations</span>
                <span className="font-semibold text-blue-600">{scheduledOTs}</span>
              </div>
              <div className="flex justify-between">
                <span>Hospital Revenue</span>
                <span className="font-semibold">{formatPkrAmount(totalRevenue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}