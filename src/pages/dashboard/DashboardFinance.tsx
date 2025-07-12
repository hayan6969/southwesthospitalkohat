
import FinanceLayout from "@/layouts/FinanceLayout";
import { StatsCard } from "@/components/StatsCard";
import { Calculator, TrendingUp, Users, Receipt, DollarSign, Minus, Pill } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useInvoices, useStats } from "@/hooks/useDatabase";
import { formatPkrCurrency } from "@/utils/currency";
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

  // Calculate total revenue including pharmacy
  const hospitalRevenue = invoices?.reduce((sum, invoice) => sum + (invoice.amount || 0), 0) || 0;
  const pharmacyRevenue = pharmacyInvoices?.reduce((sum, invoice) => sum + (invoice.final_amount || 0), 0) || 0;
  const totalRevenue = hospitalRevenue + pharmacyRevenue;
  
  const paidInvoices = invoices?.filter(inv => inv.status === 'paid') || [];
  const pendingInvoices = invoices?.filter(inv => inv.status === 'pending') || [];

  return (
    <FinanceLayout>
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Revenue"
            value={formatPkrCurrency(totalRevenue)}
            icon={<DollarSign className="w-5 h-5 text-green-600" />}
            loading={invoicesLoading || pharmacyLoading}
          />
          <StatsCard
            title="Hospital Revenue"
            value={formatPkrCurrency(hospitalRevenue)}
            icon={<Receipt className="w-5 h-5 text-blue-600" />}
            loading={invoicesLoading}
          />
          <StatsCard
            title="Pharmacy Revenue"
            value={formatPkrCurrency(pharmacyRevenue)}
            icon={<Pill className="w-5 h-5 text-purple-600" />}
            loading={pharmacyLoading}
          />
          <StatsCard
            title="Pending Payments"
            value={formatPkrCurrency(pendingInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0))}
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
              <CardTitle>Income Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Hospital Services</span>
                  <span className="font-medium">{formatPkrCurrency(hospitalRevenue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Pharmacy Sales</span>
                  <span className="font-medium">{formatPkrCurrency(pharmacyRevenue)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span className="ml-4">• Lab Tests</span>
                  <span>{formatPkrCurrency(hospitalRevenue * 0.3)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span className="ml-4">• Appointments</span>
                  <span>{formatPkrCurrency(hospitalRevenue * 0.5)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span className="ml-4">• Other Services</span>
                  <span>{formatPkrCurrency(hospitalRevenue * 0.2)}</span>
                </div>
                <hr />
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total Revenue</span>
                  <span>{formatPkrCurrency(totalRevenue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </FinanceLayout>
  );
}

