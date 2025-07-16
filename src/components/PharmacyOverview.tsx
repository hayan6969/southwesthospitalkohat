
import { usePharmacyStats, usePharmacyInvoices } from "@/hooks/useDatabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill, ShoppingCart, Banknote, TrendingUp, Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPkrAmount } from "@/utils/currency";
import { generatePharmacyInvoicePDF } from "@/utils/pharmacyPdfGenerator";
import { useToast } from "@/hooks/use-toast";

export function PharmacyOverview() {
  const { data: stats, isLoading: statsLoading } = usePharmacyStats();
  const { data: allInvoices, isLoading: invoicesLoading } = usePharmacyInvoices();
  const { toast } = useToast();

  // Get recent invoices (last 5)
  const recentInvoices = allInvoices?.slice(0, 5) || [];

  const handleDownloadPDF = async (invoice: any) => {
    try {
      if (!invoice.pharmacy_invoice_items || invoice.pharmacy_invoice_items.length === 0) {
        toast({
          title: "Error",
          description: "No invoice items found for this invoice.",
          variant: "destructive"
        });
        return;
      }

      // Format data for PDF generation
      const invoiceData = {
        invoice_number: invoice.invoice_number,
        customer_name: invoice.customer_name,
        customer_phone: invoice.customer_phone,
        total_amount: invoice.total_amount,
        discount_amount: invoice.discount_amount,
        final_amount: invoice.final_amount,
        created_at: invoice.created_at,
        items: invoice.pharmacy_invoice_items.map((item: any) => ({
          medicine_name: item.medicine?.name || 'Unknown Medicine',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }))
      };

      await generatePharmacyInvoicePDF(invoiceData);
      
      toast({
        title: "Success",
        description: "Invoice PDF downloaded successfully!"
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

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
            <Banknote className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-6 bg-gray-100 rounded animate-pulse"></div>
            ) : (
              <div className="text-2xl font-bold">{formatPkrAmount(stats?.totalRevenue || 0)}</div>
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
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold">{formatPkrAmount(invoice.final_amount)}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadPDF(invoice)}
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
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
