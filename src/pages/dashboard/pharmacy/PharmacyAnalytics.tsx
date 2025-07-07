
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMedicines, usePharmacyInvoices } from "@/hooks/usePharmacy";
import { TrendingUp, Package, DollarSign, AlertTriangle } from "lucide-react";

export default function PharmacyAnalytics() {
  const { data: medicines, isLoading: medicinesLoading } = useMedicines();
  const { data: invoices, isLoading: invoicesLoading } = usePharmacyInvoices();

  const totalMedicines = medicines?.length || 0;
  const lowStockMedicines = medicines?.filter(med => med.stock_quantity <= (med.minimum_stock_level || 10)).length || 0;
  const totalRevenue = invoices?.reduce((sum, invoice) => sum + invoice.final_amount, 0) || 0;
  const todayRevenue = invoices?.filter(invoice => 
    new Date(invoice.created_at || '').toDateString() === new Date().toDateString()
  ).reduce((sum, invoice) => sum + invoice.final_amount, 0) || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Pharmacy Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Medicines</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMedicines}</div>
            <p className="text-xs text-muted-foreground">In stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStockMedicines}</div>
            <p className="text-xs text-muted-foreground">Need reorder</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${todayRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Today's sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
