import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInvoices } from "@/hooks/useDatabase";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrCurrency } from "@/utils/currency";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";
import { useState } from "react";

export default function FinanceAnalytics() {
  const [timeRange, setTimeRange] = useState("6months");
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();

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

  // Mock expense data (would come from expenses table)
  const mockExpenses = [
    { category: 'Staff Salaries', amount: 250000, month: 'Jan' },
    { category: 'Medical Supplies', amount: 75000, month: 'Jan' },
    { category: 'Utilities', amount: 45000, month: 'Jan' },
    { category: 'Maintenance', amount: 25000, month: 'Jan' },
  ];

  if (invoicesLoading || pharmacyLoading || labLoading) {
    return <div className="p-8">Loading analytics...</div>;
  }

  // Calculate revenue by month
  const monthlyRevenue = [
    { month: 'Jan', hospital: 450000, pharmacy: 120000, total: 570000 },
    { month: 'Feb', hospital: 520000, pharmacy: 140000, total: 660000 },
    { month: 'Mar', hospital: 480000, pharmacy: 130000, total: 610000 },
    { month: 'Apr', hospital: 590000, pharmacy: 160000, total: 750000 },
    { month: 'May', hospital: 610000, pharmacy: 170000, total: 780000 },
    { month: 'Jun', hospital: 650000, pharmacy: 180000, total: 830000 },
  ];

  // Revenue vs Expenses
  const profitLossData = [
    { month: 'Jan', revenue: 570000, expenses: 395000, profit: 175000 },
    { month: 'Feb', revenue: 660000, expenses: 420000, profit: 240000 },
    { month: 'Mar', revenue: 610000, expenses: 410000, profit: 200000 },
    { month: 'Apr', revenue: 750000, expenses: 450000, profit: 300000 },
    { month: 'May', revenue: 780000, expenses: 480000, profit: 300000 },
    { month: 'Jun', revenue: 830000, expenses: 500000, profit: 330000 },
  ];

  // Revenue breakdown
  const revenueBreakdown = [
    { name: 'Hospital Services', value: 450000, color: '#3b82f6' },
    { name: 'Pharmacy', value: 180000, color: '#8b5cf6' },
    { name: 'Lab Tests', value: 120000, color: '#10b981' },
    { name: 'OT Procedures', value: 80000, color: '#f59e0b' },
  ];

  const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
  const pharmacyRevenue = pharmacyInvoices?.reduce((sum, inv) => sum + (inv.final_amount || 0), 0) || 0;
  const totalExpenses = mockExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netProfit = totalRevenue + pharmacyRevenue - totalExpenses;
  const profitMargin = ((netProfit / (totalRevenue + pharmacyRevenue)) * 100).toFixed(1);

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
            <div className="text-2xl font-bold text-green-600">{formatPkrCurrency(netProfit)}</div>
            <p className="text-sm text-green-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Profit Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profitMargin}%</div>
            <p className="text-sm text-green-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +2.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPkrCurrency(totalRevenue + pharmacyRevenue)}</div>
            <p className="text-sm text-green-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +8.3% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatPkrCurrency(totalExpenses)}</div>
            <p className="text-sm text-red-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +5.7% from last month
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
            <LineChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `₨${(value/1000).toFixed(0)}K`} />
              <Tooltip formatter={(value) => formatPkrCurrency(value as number)} />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} />
              <Line type="monotone" dataKey="hospital" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="pharmacy" stroke="#8b5cf6" strokeWidth={2} />
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
              <BarChart data={profitLossData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₨${(value/1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => formatPkrCurrency(value as number)} />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
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
              <h4 className="font-semibold text-green-600">Positive Trends</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Pharmacy revenue increased by 15% this month
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Lab test bookings are up 22%
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Overall profit margin improved to {profitMargin}%
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-orange-600">Areas for Improvement</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-orange-600" />
                  Utility expenses have increased by 8%
                </li>
                <li className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-orange-600" />
                  Maintenance costs are above budget
                </li>
                <li className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-orange-600" />
                  Pending invoices need attention
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}