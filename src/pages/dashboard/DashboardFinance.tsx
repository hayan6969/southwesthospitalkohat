
import { StatsCard } from "@/components/StatsCard";
import { Calculator, TrendingUp, Users, Receipt, DollarSign, Minus, Pill, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useInvoices, useStats } from "@/hooks/useDatabase";
import { formatPkrAmount } from "@/utils/currency";
import { useHospitalSettings } from "@/hooks/useHospitalSettings";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export default function DashboardFinance() {
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const { data: stats, isLoading: statsLoading } = useStats();
  const { settings: hospitalSettings } = useHospitalSettings();
  const navigate = useNavigate();

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

  // Get expenses
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

  // Calculate revenues and profit
  const hospitalRevenue = invoices?.reduce((sum, invoice) => sum + (invoice.amount || 0), 0) || 0;
  const pharmacyRevenue = pharmacyInvoices?.reduce((sum, invoice) => sum + (invoice.final_amount || 0), 0) || 0;
  const labRevenue = labReports?.reduce((sum, lab) => sum + (lab.price || 0), 0) || 0;
  const totalRevenue = hospitalRevenue + pharmacyRevenue + labRevenue;
  const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
  const totalProfit = totalRevenue - totalExpenses;
  
  const paidInvoices = invoices?.filter(inv => inv.status === 'paid') || [];
  const pendingInvoices = invoices?.filter(inv => inv.status === 'pending') || [];

  return (
    <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatsCard
            title="Total Revenue"
            value={formatPkrAmount(totalRevenue)}
            icon={<DollarSign className="w-5 h-5 text-green-600" />}
            loading={invoicesLoading || pharmacyLoading || labLoading}
          />
          <StatsCard
            title="Total Expenses"
            value={formatPkrAmount(totalExpenses)}
            icon={<Minus className="w-5 h-5 text-red-600" />}
            loading={expensesLoading}
          />
          <StatsCard
            title="Total Profit"
            value={formatPkrAmount(totalProfit)}
            icon={totalProfit >= 0 ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
            loading={invoicesLoading || pharmacyLoading || labLoading || expensesLoading}
          />
          <StatsCard
            title="Hospital Revenue"
            value={formatPkrAmount(hospitalRevenue)}
            icon={<Receipt className="w-5 h-5 text-blue-600" />}
            loading={invoicesLoading}
          />
          <StatsCard
            title="Pending Payments"
            value={formatPkrAmount(pendingInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0))}
            icon={<TrendingUp className="w-5 h-5 text-orange-600" />}
            loading={invoicesLoading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  className="h-20 flex flex-col items-center justify-center"
                  onClick={() => navigate('/dashboard/finance/expenses')}
                >
                  <Minus className="w-6 h-6 mb-2" />
                  Add Expense
                </Button>
                <Button 
                  className="h-20 flex flex-col items-center justify-center" 
                  variant="outline"
                  onClick={() => navigate('/dashboard/finance/payroll')}
                >
                  <Users className="w-6 h-6 mb-2" />
                  Payroll
                </Button>
                <Button 
                  className="h-20 flex flex-col items-center justify-center" 
                  variant="outline"
                  onClick={() => navigate('/dashboard/finance/analytics')}
                >
                  <TrendingUp className="w-6 h-6 mb-2" />
                  Analytics
                </Button>
                <Button 
                  className="h-20 flex flex-col items-center justify-center" 
                  variant="outline"
                  onClick={() => navigate('/dashboard/finance/income')}
                >
                  <Receipt className="w-6 h-6 mb-2" />
                  Reports
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Hospital Services</span>
                  <span className="font-medium">{formatPkrAmount(hospitalRevenue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Pharmacy Sales</span>
                  <span className="font-medium">{formatPkrAmount(pharmacyRevenue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Lab Tests</span>
                  <span className="font-medium">{formatPkrAmount(labRevenue)}</span>
                </div>
                <hr />
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total Revenue</span>
                  <span className="text-green-600">{formatPkrAmount(totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total Expenses</span>
                  <span className="text-red-600">-{formatPkrAmount(totalExpenses)}</span>
                </div>
                <hr className="border-2" />
                <div className="flex justify-between items-center font-bold text-xl">
                  <span>Net Profit</span>
                  <span className={totalProfit >= 0 ? "text-green-600" : "text-red-600"}>
                    {formatPkrAmount(totalProfit)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}

