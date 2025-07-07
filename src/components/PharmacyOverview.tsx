
import { usePharmacyStats, usePharmacyInvoices } from "@/hooks/useDatabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill, ShoppingCart, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPkrCurrency } from "@/utils/currency";

export function PharmacyOverview() {
  const { data: stats, isLoading: statsLoading } = usePharmacyStats();
  const { data: allInvoices, isLoading: invoicesLoading } = usePharmacyInvoices();

  // Get recent invoices (last 5)
  const recentInvoices = allInvoices?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pharmacy Overview</h3>
        <Button variant="outline" size="sm">
          <Calendar className="w-4 h-4 mr-2" />
          View Full Analytics
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Medicines</CardTitle>
            <Pill className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-6 bg-gray-100 rounded animate-pulse"></div>
            ) : (
              <div className="text-2xl font-bold">{stats?.totalMedicines || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-6 bg-gray-100 rounded animate-pulse"></div>
            ) : (
              <div className="text-2xl font-bold">{stats?.totalInvoices || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-6 bg-gray-100 rounded animate-pulse"></div>
            ) : (
              <div className="text-2xl font-bold">{formatPkrCurrency(stats?.totalRevenue || 0)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-6 bg-gray-100 rounded animate-pulse"></div>
            ) : (
              <div className="text-2xl font-bold text-red-600">{stats?.lowStockCount || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Pharmacy Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          ) : recentInvoices && recentInvoices.length > 0 ? (
            <div className="space-y-3">
              {recentInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">#{invoice.invoice_number}</p>
                    <p className="text-sm text-gray-600">
                      {invoice.customer_name || 'Walk-in Customer'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatPkrCurrency(invoice.final_amount)}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No recent sales</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
