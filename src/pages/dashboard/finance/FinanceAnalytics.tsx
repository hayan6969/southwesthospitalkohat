import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrCurrency } from "@/utils/currency";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";
import { useState, useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export default function FinanceAnalytics() {
  const [timeRange, setTimeRange] = useState("6months");

  // Get invoices for hospital revenue
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Get pharmacy invoices
  const { data: pharmacyInvoices, isLoading: pharmacyLoading } = useQuery({
    queryKey: ['pharmacy-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pharmacy_invoices')
        .select('*')
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

  // Get real expenses data
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

  if (invoicesLoading || pharmacyLoading || labLoading || expensesLoading) {
    return <div className="p-8">Loading analytics...</div>;
  }

  // Calculate real metrics
  const totalRevenue = (invoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0);
  const pharmacyRevenue = (pharmacyInvoices?.reduce((sum, inv) => sum + (inv.final_amount || 0), 0) || 0);
  const labRevenue = (labReports?.reduce((sum, lab) => sum + (lab.price || 0), 0) || 0);
  const totalExpenses = (expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0);
  const combinedRevenue = totalRevenue + pharmacyRevenue + labRevenue;
  const netProfit = combinedRevenue - totalExpenses;
  const profitMargin = combinedRevenue > 0 ? ((netProfit / combinedRevenue) * 100) : 0;

  // Calculate monthly data from real database records
  const monthlyData = useMemo(() => {
    const months = [];
    const now = new Date();
    
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthInvoices = invoices?.filter(inv => {
        const invDate = new Date(inv.created_at!);
        return invDate >= monthStart && invDate <= monthEnd;
      }) || [];
      
      const monthPharmacyInvoices = pharmacyInvoices?.filter(inv => {
        const invDate = new Date(inv.created_at!);
        return invDate >= monthStart && invDate <= monthEnd;
      }) || [];
      
      const monthLabReports = labReports?.filter(lab => {
        const labDate = new Date(lab.created_at!);
        return labDate >= monthStart && labDate <= monthEnd;
      }) || [];
      
      const monthExpenses = expenses?.filter(exp => {
        const expDate = new Date(exp.created_at);
        return expDate >= monthStart && expDate <= monthEnd;
      }) || [];
      
      const hospitalRevenue = monthInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
      const pharmacy = monthPharmacyInvoices.reduce((sum, inv) => sum + (inv.final_amount || 0), 0);
      const lab = monthLabReports.reduce((sum, lab) => sum + (lab.price || 0), 0);
      const monthlyExpenses = monthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const totalRev = hospitalRevenue + pharmacy + lab;
      
      months.push({
        month: format(monthDate, 'MMM'),
        hospital: hospitalRevenue,
        pharmacy,
        lab,
        total: totalRev,
        expenses: monthlyExpenses,
        profit: totalRev - monthlyExpenses
      });
    }
    
    return months;
  }, [invoices, pharmacyInvoices, labReports, expenses]);

  // Revenue breakdown
  const revenueBreakdown = [
    { name: 'Hospital Services', value: totalRevenue, color: '#3b82f6' },
    { name: 'Pharmacy', value: pharmacyRevenue, color: '#8b5cf6' },
    { name: 'Lab Tests', value: labRevenue, color: '#10b981' },
  ].filter(item => item.value > 0);

  // Calculate percentage changes (using current vs previous month)
  const currentMonth = monthlyData[monthlyData.length - 1];
  const previousMonth = monthlyData[monthlyData.length - 2];
  
  const revenueChange = previousMonth?.total > 0 
    ? (((currentMonth?.total || 0) - (previousMonth?.total || 0)) / (previousMonth?.total || 1)) * 100
    : 0;
    
  const expenseChange = previousMonth?.expenses > 0
    ? (((currentMonth?.expenses || 0) - (previousMonth?.expenses || 0)) / (previousMonth?.expenses || 1)) * 100
    : 0;
    
  const profitChange = previousMonth?.profit !== undefined
    ? (((currentMonth?.profit || 0) - (previousMonth?.profit || 0)) / Math.abs(previousMonth?.profit || 1)) * 100
    : 0;


  return (
    <div className="space-y-6">
      {/* Analytics Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Financial Analytics</h2>
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPkrCurrency(netProfit)}
            </div>
            <p className={`text-sm flex items-center gap-1 ${profitChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profitChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {profitChange >= 0 ? '+' : ''}{profitChange.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Profit Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profitMargin.toFixed(1)}%</div>
            <p className={`text-sm flex items-center gap-1 ${profitChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profitChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {profitChange >= 0 ? '+' : ''}{(profitMargin > 0 ? profitChange * 0.1 : 0).toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPkrCurrency(combinedRevenue)}</div>
            <p className={`text-sm flex items-center gap-1 ${revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {revenueChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {revenueChange >= 0 ? '+' : ''}{revenueChange.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatPkrCurrency(totalExpenses)}</div>
            <p className={`text-sm flex items-center gap-1 ${expenseChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {expenseChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {expenseChange >= 0 ? '+' : ''}{expenseChange.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>
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
              <YAxis tickFormatter={(value) => `₨${(value/1000).toFixed(0)}K`} />
              <Tooltip formatter={(value) => formatPkrCurrency(value as number)} />
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
                <YAxis tickFormatter={(value) => `₨${(value/1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => formatPkrCurrency(value as number)} />
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
                  <Tooltip formatter={(value) => formatPkrCurrency(value as number)} />
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
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Total Revenue: {formatPkrCurrency(combinedRevenue)}
                </li>
                <li className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-red-600" />
                  Total Expenses: {formatPkrCurrency(totalExpenses)}
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Profit Margin: {profitMargin.toFixed(1)}%
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-blue-600">Revenue Sources</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  Hospital Services: {formatPkrCurrency(totalRevenue)}
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  Pharmacy: {formatPkrCurrency(pharmacyRevenue)}
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  Lab Tests: {formatPkrCurrency(labRevenue)}
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}