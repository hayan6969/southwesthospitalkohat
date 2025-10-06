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
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  // Use the updated financial analytics hook with month parameter
  const { data: financialData, isLoading, refetch } = useFinancialAnalytics(selectedMonth);

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

  // Extract data from the hook
  const pharmacySales = financialData?.pharmacySales || 0;
  const pharmacyProfit = financialData?.pharmacyProfit || 0;
  const hospitalRevenue = financialData?.hospitalRevenue || 0;
  const hospitalProfitWithoutPharmacy = financialData?.hospitalProfitWithoutPharmacy || 0;
  const hospitalProfitWithPharmacy = financialData?.hospitalProfitWithPharmacy || 0;
  const operationsRevenue = financialData?.operationsRevenue || 0;
  const labRevenue = financialData?.labRevenue || 0;
  const xrayRevenue = financialData?.xrayRevenue || 0;
  const emergencyRevenue = financialData?.emergencyRevenue || 0;
  const totalExpenses = financialData?.totalExpenses || 0;
  const pharmacyBillsPaidCount = financialData?.pharmacyBillsPaidCount || 0;
  const pharmacyBillsPaidAmount = financialData?.pharmacyBillsPaidAmount || 0;
  const pharmacyReturns = financialData?.pharmacyReturns || 0;
  const totalInvoicesCount = financialData?.totalInvoicesCount || 0;
  const totalInvoicesAmount = financialData?.totalInvoicesAmount || 0;
  const totalRefunds = financialData?.totalRefunds || 0;
  const doctorPaymentsPaidCount = financialData?.doctorPaymentsPaidCount || 0;
  const doctorPaymentsPaidAmount = financialData?.doctorPaymentsPaidAmount || 0;
  const recentActivities = financialData?.recentActivity || [];

  const selectedMonthStr = format(selectedMonth, 'MMMM yyyy');

  // Revenue breakdown for pie chart
  const revenueBreakdown = [
    { name: 'Emergency', value: emergencyRevenue, color: '#ef4444' },
    { name: 'Lab Services', value: labRevenue, color: '#f59e0b' },
    { name: 'X-ray Services', value: xrayRevenue, color: '#8b5cf6' },
    { name: 'Operations', value: operationsRevenue, color: '#3b82f6' },
    { name: 'Pharmacy Sales', value: pharmacySales, color: '#10b981' },
  ].filter(item => item.value > 0);

  // Show loading state
  if (isLoading) {
    return <div className="p-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Analytics Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Financial Analytics - {selectedMonthStr}</h2>
        <div className="flex gap-4">
          <Button onClick={() => refetch()} variant="outline">
            Refresh Data
          </Button>
          <Button 
            variant="outline"
            onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
          >
            Previous Month
          </Button>
          <Button 
            variant="outline"
            onClick={() => setSelectedMonth(new Date())}
          >
            Current Month
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              const nextMonth = new Date(selectedMonth);
              nextMonth.setMonth(nextMonth.getMonth() + 1);
              if (nextMonth <= new Date()) {
                setSelectedMonth(nextMonth);
              }
            }}
            disabled={selectedMonth.getMonth() === new Date().getMonth() && selectedMonth.getFullYear() === new Date().getFullYear()}
          >
            Next Month
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pharmacy Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatPkrAmount(pharmacySales)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total sales this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pharmacy Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatPkrAmount(pharmacyProfit)}</div>
            <p className="text-xs text-muted-foreground mt-1">After discounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hospital Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatPkrAmount(hospitalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Without pharmacy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hospital Profit (No Pharmacy)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${hospitalProfitWithoutPharmacy >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPkrAmount(hospitalProfitWithoutPharmacy)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Revenue - Expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hospital Profit (With Pharmacy)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${hospitalProfitWithPharmacy >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPkrAmount(hospitalProfitWithPharmacy)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Including pharmacy profit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatPkrAmount(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">All expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Operations Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{formatPkrAmount(operationsRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Hospital share only</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lab Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatPkrAmount(labRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">All lab tests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">X-ray Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-600">{formatPkrAmount(xrayRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">All X-ray tests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Emergency Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{formatPkrAmount(emergencyRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Emergency consultations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pharmacy Bills Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{pharmacyBillsPaidCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatPkrAmount(pharmacyBillsPaidAmount)} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pharmacy Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatPkrAmount(pharmacyReturns)}</div>
            <p className="text-xs text-muted-foreground mt-1">Returns from sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pharmacy Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-600">{pharmacyBillsPaidCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatPkrAmount(pharmacyBillsPaidAmount)} collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Refunds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatPkrAmount(totalRefunds)}</div>
            <p className="text-xs text-muted-foreground mt-1">Refunds issued</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Doctor Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">{doctorPaymentsPaidCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatPkrAmount(doctorPaymentsPaidAmount)} paid</p>
          </CardContent>
        </Card>
      </div>

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