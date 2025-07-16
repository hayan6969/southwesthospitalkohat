import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, Banknote, Activity } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { useFinancialAnalytics } from "@/hooks/useFinancialAnalytics";

// Helper function to format large numbers with abbreviations
const formatLargeNumber = (amount: number) => {
  if (amount >= 1000000000) {
    return `Rs. ${(amount / 1000000000).toFixed(1)}B`;
  } else if (amount >= 1000000) {
    return `Rs. ${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `Rs. ${(amount / 1000).toFixed(0)}K`;
  } else {
    return formatPkrAmount(amount);
  }
};

export default function FinanceAnalytics() {
  const [timeRange, setTimeRange] = useState("6months");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  // Use the updated financial analytics hook with real-time data
  const { data: financialData, isLoading, refetch } = useFinancialAnalytics();

  // Set up real-time subscriptions for all financial tables
  useEffect(() => {
    const channels = [
      supabase.channel('invoices-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        console.log('Invoices changed, refetching...');
        refetch();
      }),
      supabase.channel('pharmacy-invoices-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'pharmacy_invoices' }, () => {
        console.log('Pharmacy invoices changed, refetching...');
        refetch();
      }),
      supabase.channel('lab-reports-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'lab_reports' }, () => {
        console.log('Lab reports changed, refetching...');
        refetch();
      }),
      supabase.channel('ot-schedules-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'ot_schedules' }, () => {
        console.log('OT schedules changed, refetching...');
        refetch();
      }),
      supabase.channel('expenses-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        console.log('Expenses changed, refetching...');
        refetch();
      }),
      supabase.channel('refunds-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'refunds' }, () => {
        console.log('Refunds changed, refetching...');
        refetch();
      })
    ];

    channels.forEach(channel => channel.subscribe());

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [refetch]);

  // Use financial data from the hook, or fallback to empty values if loading
  const totalRevenue = financialData?.totalRevenue || 0;
  const totalExpenses = financialData?.totalExpenses || 0;
  const netProfit = financialData?.netProfit || 0;
  const profitMargin = financialData?.profitMargin || 0;
  const revenueBySource = financialData?.revenueBySource || { hospital: 0, pharmacy: 0, lab: 0, ot: 0 };
  const monthlyRevenue = financialData?.monthlyRevenue || 0;
  const monthlyExpenses = financialData?.monthlyExpenses || 0;
  const recentActivities = financialData?.recentActivity || [];

  // Debug logging
  console.log('Finance Dashboard Data:', {
    totalRevenue,
    totalExpenses,
    netProfit,
    financialData
  });

  // Calculate monthly data from the hook data
  const monthlyData = useMemo(() => {
    // Since monthlyRevenue and monthlyExpenses are now numbers, create simple chart data
    const currentMonth = format(new Date(), 'MMM yyyy');
    return [{
      month: currentMonth,
      total: monthlyRevenue,
      expenses: monthlyExpenses,
      profit: monthlyRevenue - monthlyExpenses,
      hospital: revenueBySource.hospital,
      pharmacy: revenueBySource.pharmacy,
      lab: revenueBySource.lab,
      ot: revenueBySource.ot
    }];
  }, [monthlyRevenue, monthlyExpenses, revenueBySource]);

  // Revenue breakdown
  const revenueBreakdown = [
    { name: 'Hospital Services', value: revenueBySource.hospital, color: '#3b82f6' },
    { name: 'Pharmacy Sales', value: revenueBySource.pharmacy, color: '#10b981' },
    { name: 'Lab Services', value: revenueBySource.lab, color: '#f59e0b' },
    { name: 'OT Services (Hospital)', value: revenueBySource.ot, color: '#8b5cf6' },
  ].filter(item => item.value > 0);

  // Calculate percentage changes (simplified for current data structure)
  const currentMonth = monthlyData.length > 0 ? monthlyData[0] : null;
  
  const revenueChange = 0; // Placeholder since we don't have historical data
  const expenseChange = 0; // Placeholder since we don't have historical data  
  const profitChange = 0; // Placeholder since we don't have historical data

  // Show loading state
  if (isLoading) {
    return <div className="p-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Analytics Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Financial Analytics</h2>
        <div className="flex gap-4">
          <Button onClick={() => refetch()} variant="outline">
            Refresh Data
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-48 justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Filter by date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          {selectedDate && (
            <Button 
              variant="outline" 
              onClick={() => setSelectedDate(undefined)}
              className="px-3"
            >
              Clear Filter
            </Button>
          )}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics - Two Rows */}
      <div className="space-y-4">
        {/* First Row - Net Profit and Profit Margin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Banknote className="w-4 h-4" />
                Net Profit
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`text-lg xl:text-xl font-bold break-words ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatLargeNumber(netProfit)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatPkrAmount(netProfit)}
              </div>
              <p className={`text-xs flex items-center gap-1 mt-2 ${profitChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {profitChange >= 0 ? '+' : ''}{isFinite(profitChange) ? profitChange.toFixed(1) : '0.0'}% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Profit Margin</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-lg xl:text-xl font-bold break-words">{isFinite(profitMargin) ? profitMargin.toFixed(1) : '0.0'}%</div>
              <p className={`text-xs flex items-center gap-1 mt-2 ${profitChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {profitChange >= 0 ? '+' : ''}{isFinite(profitChange) && isFinite(profitMargin) && profitMargin > 0 ? (profitChange * 0.1).toFixed(1) : '0.0'}% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Second Row - Total Revenue and Total Expenses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-lg xl:text-xl font-bold break-words text-green-600">
                {formatLargeNumber(totalRevenue)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatPkrAmount(totalRevenue)}
              </div>
              <p className={`text-xs flex items-center gap-1 mt-2 ${revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {revenueChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {revenueChange >= 0 ? '+' : ''}{isFinite(revenueChange) ? revenueChange.toFixed(1) : '0.0'}% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-lg xl:text-xl font-bold break-words text-red-600">
                {formatLargeNumber(totalExpenses)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatPkrAmount(totalExpenses)}
              </div>
              <p className={`text-xs flex items-center gap-1 mt-2 ${expenseChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {expenseChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {expenseChange >= 0 ? '+' : ''}{isFinite(expenseChange) ? expenseChange.toFixed(1) : '0.0'}% from last month
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => value >= 1000000 ? `₨${(value/1000000).toFixed(0)}M` : `₨${(value/1000).toFixed(0)}K`} />
              <Tooltip formatter={(value) => formatPkrAmount(value as number)} />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} name="Total Revenue" />
              <Line type="monotone" dataKey="hospital" stroke="#10b981" strokeWidth={2} name="Hospital" />
              <Line type="monotone" dataKey="pharmacy" stroke="#8b5cf6" strokeWidth={2} name="Pharmacy" />
              <Line type="monotone" dataKey="lab" stroke="#f59e0b" strokeWidth={2} name="Lab" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit vs Loss Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Profit & Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
               <YAxis tickFormatter={(value) => value >= 1000000 ? `₨${(value/1000000).toFixed(0)}M` : `₨${(value/1000).toFixed(0)}K`} />
               <Tooltip formatter={(value) => formatPkrAmount(value as number)} />
               <Bar dataKey="total" fill="#10b981" name="Revenue" />
               <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
               <Bar dataKey="profit" fill="#3b82f6" name="Profit" />
             </BarChart>
           </ResponsiveContainer>
         </CardContent>
       </Card>

       {/* Revenue Breakdown Pie Chart */}
       <Card>
         <CardHeader>
           <CardTitle>Revenue Breakdown</CardTitle>
         </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {revenueBreakdown.length > 0 ? (
                <PieChart>
                  <Pie
                    data={revenueBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {revenueBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatPkrAmount(value as number)} />
                </PieChart>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No revenue data available
                </div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-green-600">Key Metrics</h4>
               <ul className="space-y-2 text-sm">
                 <li className="flex items-center gap-2">
                   <Banknote className="w-4 h-4 text-green-600" />
                   <span className="break-all">Total Revenue: {formatLargeNumber(totalRevenue)}</span>
                 </li>
                 <li className="flex items-center gap-2">
                   <Banknote className="w-4 h-4 text-red-600" />
                   <span className="break-all">Total Expenses: {formatLargeNumber(totalExpenses)}</span>
                 </li>
                 <li className="flex items-center gap-2">
                   <TrendingUp className="w-4 h-4 text-blue-600" />
                   Profit Margin: {isFinite(profitMargin) ? profitMargin.toFixed(1) : '0.0'}%
                 </li>
               </ul>
             </div>
             <div className="space-y-4">
               <h4 className="font-semibold text-blue-600">Revenue Sources</h4>
               <ul className="space-y-2 text-sm">
                 <li className="flex items-center gap-2">
                   <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                   <span className="break-all">Hospital Services: {formatLargeNumber(revenueBySource.hospital)}</span>
                 </li>
                 <li className="flex items-center gap-2">
                   <div className="w-3 h-3 bg-purple-500 rounded-full flex-shrink-0"></div>
                   <span className="break-all">Pharmacy: {formatLargeNumber(revenueBySource.pharmacy)}</span>
                 </li>
                 <li className="flex items-center gap-2">
                   <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                   <span className="break-all">Lab Tests: {formatLargeNumber(revenueBySource.lab)}</span>
                 </li>
               </ul>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Financial Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'Refund' ? 'bg-orange-500' :
                      activity.amount > 0 ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium">{activity.type}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${
                      activity.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {activity.amount > 0 ? '+' : ''}{formatPkrAmount(activity.amount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(activity.date), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent activities</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}