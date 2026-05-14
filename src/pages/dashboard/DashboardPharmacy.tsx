
import { useEffect, useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import { StatsCard } from "@/components/StatsCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MySupplyRequests } from "@/components/inventory/MySupplyRequests";
import { IPDPharmacyQueue } from "@/components/ipd/IPDPharmacyQueue";

import { Button } from "@/components/ui/button";
import { usePharmacyStats, useExpiringMedicines, usePharmacyInvoices } from "@/hooks/useDatabase";
import { Pill, ShoppingCart, Banknote, AlertTriangle, TrendingUp, FileText, WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPkrAmount } from "@/utils/currency";
import { PharmacyInvoiceDetailsDialog } from "@/components/dialogs/PharmacyInvoiceDetailsDialog";
import { useHospitalSettings } from "@/hooks/useHospitalSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePharmacyPermissions } from "@/hooks/usePharmacyPermissions";

export default function DashboardPharmacy() {
  const { data: stats, isLoading: statsLoading } = usePharmacyStats();
  const { data: expiringMedicines, isLoading: expiringLoading } = useExpiringMedicines();
  const { data: invoices, isLoading: invoicesLoading } = usePharmacyInvoices();
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const { settings: hospitalSettings } = useHospitalSettings();
  const { toast } = useToast();
  const permissions = usePharmacyPermissions();

  const urgentExpiring = expiringMedicines?.filter(med => med.daysLeft <= 7) || [];

  // Cache medicine data when component loads
  useEffect(() => {
    const cacheMedicineData = async () => {
      try {
        console.log('🔄 Caching medicine data for offline use...');
        
        const { data: medicinesData, error } = await supabase
          .from('medicines')
          .select('*')
          .order('name');

        if (error) {
          console.error('Error fetching medicines for cache:', error);
        } else {
          localStorage.setItem('cached_medicines', JSON.stringify(medicinesData));
          console.log('✅ Medicine data cached successfully:', medicinesData.length, 'medicines');
        }
      } catch (error) {
        console.error('Error caching medicine data:', error);
      }
    };

    cacheMedicineData();
  }, []);

  const handleOfflineMode = () => {
    // Check if medicine data is cached
    const cachedMedicines = localStorage.getItem('cached_medicines');
    if (!cachedMedicines) {
      toast({
        title: "Data Not Ready",
        description: "Medicine data is still being cached. Please wait a moment and try again.",
        variant: "destructive"
      });
      return;
    }

    window.location.href = '/offline-mode-pharmacy';
  };

  const handleInvoiceClick = (invoice: any) => {
    setSelectedInvoice(invoice);
    setInvoiceDialogOpen(true);
  };

  return (
    <AppLayout sidebarRole="head_pharmacist">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              {hospitalSettings?.logo_url ? (
                <img 
                  src={hospitalSettings.logo_url} 
                  alt="Hospital Logo" 
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <span className="inline-block w-2 h-8 bg-blue-500 rounded-full" />
              )}
              <h1 className="text-3xl font-bold text-gray-900">{hospitalSettings?.hospital_name || "HIMS"} - Pharmacy</h1>
            </div>
            <p className="text-gray-600 mt-1">Manage medicines, inventory, and sales</p>
          </div>
          <Button 
            onClick={handleOfflineMode}
            variant="outline" 
            className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
          >
            <WifiOff className="w-4 h-4 mr-2" />
            Offline Mode
          </Button>
        </div>

        {urgentExpiring.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>{urgentExpiring.length}</strong> medicine(s) expire within 7 days! 
              Check the expiry section for details.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Medicines"
            value={stats?.totalMedicines || 0}
            icon={<Pill className="w-5 h-5 text-blue-600" />}
            loading={statsLoading}
          />
          <StatsCard
            title="Total Sales"
            value={stats?.totalInvoices || 0}
            icon={<ShoppingCart className="w-5 h-5 text-green-600" />}
            loading={statsLoading}
          />
          <StatsCard
            title="Total Revenue"
            value={formatPkrAmount(stats?.totalRevenue || 0)}
            icon={<Banknote className="w-5 h-5 text-purple-600" />}
            loading={statsLoading}
          />
          <StatsCard
            title="Low Stock Items"
            value={stats?.lowStockCount || 0}
            icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
            loading={statsLoading}
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="invoices">Recent Invoices</TabsTrigger>
            <TabsTrigger value="supplies">Supplies</TabsTrigger>
            <TabsTrigger value="ipd">IPD Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Medicines Expiring Soon
                </h2>
                <div className="space-y-3">
                  {expiringLoading ? (
                    <div className="animate-pulse space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-16 bg-gray-100 rounded"></div>
                      ))}
                    </div>
                  ) : expiringMedicines && expiringMedicines.length > 0 ? (
                    expiringMedicines.slice(0, 5).map((medicine) => (
                      <div key={medicine.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div>
                          <p className="font-medium text-gray-900">{medicine.name}</p>
                          <p className="text-sm text-gray-600">Stock: {medicine.stock_quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${
                            medicine.daysLeft <= 7 ? 'text-red-600' : 
                            medicine.daysLeft <= 30 ? 'text-orange-600' : 'text-yellow-600'
                          }`}>
                            {medicine.daysLeft} days left
                          </p>
                          <p className="text-xs text-gray-500">
                            Expires: {new Date(medicine.expiry_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No medicines expiring soon</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Quick Actions
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {permissions.canManageMedicines && (
                    <a
                      href="/dashboard/pharmacy/medicines"
                      className="p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors text-center"
                    >
                      <Pill className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="font-medium text-blue-900">Manage Medicines</p>
                    </a>
                  )}
                  {permissions.canSellMedicine && (
                    <a
                      href="/dashboard/pharmacy/sell"
                      className="p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors text-center"
                    >
                      <ShoppingCart className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="font-medium text-green-900">Sell Medicine</p>
                    </a>
                  )}
                  {permissions.canViewExpiry && (
                    <a
                      href="/dashboard/pharmacy/expiry"
                      className="p-4 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors text-center"
                    >
                      <AlertTriangle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                      <p className="font-medium text-orange-900">Expiry Tracker</p>
                    </a>
                  )}
                  {permissions.canViewAnalytics && (
                    <a
                      href="/dashboard/pharmacy/analytics"
                      className="p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors text-center"
                    >
                      <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <p className="font-medium text-purple-900">Analytics</p>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Recent Pharmacy Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invoicesLoading ? (
                  <div className="text-center py-8">Loading invoices...</div>
                ) : invoices && invoices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.slice(0, 10).map((invoice) => (
                        <TableRow 
                          key={invoice.id} 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleInvoiceClick(invoice)}
                        >
                          <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell>{invoice.customer_name || "Walk-in Customer"}</TableCell>
                          <TableCell>{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{formatPkrAmount(invoice.final_amount)}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {invoice.status || "Completed"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No invoices found</p>
                    <p className="text-sm">Start selling medicines to see invoices here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="supplies" className="space-y-6">
            <MySupplyRequests />
          </TabsContent>
          <TabsContent value="ipd" className="space-y-6">
            <IPDPharmacyQueue />
          </TabsContent>
        </Tabs>

        <PharmacyInvoiceDetailsDialog
          invoice={selectedInvoice}
          open={invoiceDialogOpen}
          onOpenChange={setInvoiceDialogOpen}
        />
      </div>
    </AppLayout>
  );
}
