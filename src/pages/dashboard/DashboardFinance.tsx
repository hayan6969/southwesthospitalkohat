
import AppLayout from "@/layouts/AppLayout";
import { StatsCard } from "@/components/StatsCard";
import { Calculator, TrendingUp, Users, Receipt, DollarSign, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useInvoices, useStats } from "@/hooks/useDatabase";
import { formatPkrCurrency } from "@/utils/currency";

export default function DashboardFinance() {
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const { data: stats, isLoading: statsLoading } = useStats();

  const totalRevenue = invoices?.reduce((sum, invoice) => sum + (invoice.amount || 0), 0) || 0;
  const paidInvoices = invoices?.filter(inv => inv.status === 'paid') || [];
  const pendingInvoices = invoices?.filter(inv => inv.status === 'pending') || [];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-gray-600 mt-1">Hospital financial overview and management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Revenue"
            value={formatPkrCurrency(totalRevenue)}
            icon={<DollarSign className="w-5 h-5 text-green-600" />}
            loading={invoicesLoading}
          />
          <StatsCard
            title="Paid Invoices"
            value={paidInvoices.length}
            icon={<Receipt className="w-5 h-5 text-blue-600" />}
            loading={invoicesLoading}
          />
          <StatsCard
            title="Pending Payments"
            value={formatPkrCurrency(pendingInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0))}
            icon={<TrendingUp className="w-5 h-5 text-orange-600" />}
            loading={invoicesLoading}
          />
          <StatsCard
            title="Staff Payroll"
            value="₨ 250,000"
            icon={<Users className="w-5 h-5 text-purple-600" />}
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
                <Button className="h-20 flex flex-col items-center justify-center">
                  <Minus className="w-6 h-6 mb-2" />
                  Add Expense
                </Button>
                <Button className="h-20 flex flex-col items-center justify-center" variant="outline">
                  <Users className="w-6 h-6 mb-2" />
                  Payroll
                </Button>
                <Button className="h-20 flex flex-col items-center justify-center" variant="outline">
                  <TrendingUp className="w-6 h-6 mb-2" />
                  Analytics
                </Button>
                <Button className="h-20 flex flex-col items-center justify-center" variant="outline">
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
                  <span>Appointments</span>
                  <span className="font-medium">{formatPkrCurrency(totalRevenue * 0.7)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Lab Tests</span>
                  <span className="font-medium">{formatPkrCurrency(totalRevenue * 0.2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>OT Procedures</span>
                  <span className="font-medium">{formatPkrCurrency(totalRevenue * 0.1)}</span>
                </div>
                <div className="flex justify-between items-center text-green-600">
                  <span>Free Appointments</span>
                  <span className="font-medium">₨ 0 (No profit)</span>
                </div>
                <hr />
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total</span>
                  <span>{formatPkrCurrency(totalRevenue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
