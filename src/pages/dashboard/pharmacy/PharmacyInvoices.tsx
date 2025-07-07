
import AppLayout from "@/layouts/AppLayout";
import { usePharmacyInvoices } from "@/hooks/usePharmacy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, DollarSign, TrendingUp, Plus, Eye, Printer } from "lucide-react";
import { format } from "date-fns";

export default function PharmacyInvoices() {
  const { data: invoices, isLoading } = usePharmacyInvoices();

  const totalRevenue = invoices?.reduce((sum, inv) => sum + inv.final_amount, 0) || 0;
  const todayInvoices = invoices?.filter(inv => 
    inv.created_at && inv.created_at.startsWith(new Date().toISOString().split('T')[0])
  ) || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pharmacy Sales</h1>
            <p className="text-gray-600 mt-1">Manage pharmacy sales and invoices</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Sale
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₨{totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invoices?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayInvoices.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₨{todayInvoices.reduce((sum, inv) => sum + inv.final_amount, 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sales History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Final Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : invoices && invoices.length > 0 ? (
                    invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{invoice.customer_name || 'Walk-in Customer'}</p>
                            {invoice.customer_phone && (
                              <p className="text-sm text-gray-500">{invoice.customer_phone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {invoice.created_at && format(new Date(invoice.created_at), 'MMM d, yyyy h:mm a')}
                        </TableCell>
                        <TableCell>₨{invoice.total_amount.toFixed(2)}</TableCell>
                        <TableCell>₨{(invoice.discount_amount || 0).toFixed(2)}</TableCell>
                        <TableCell className="font-medium">
                          ₨{invoice.final_amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">
                            {invoice.status || 'Completed'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button size="sm" variant="outline">
                              <Printer className="w-3 h-3 mr-1" />
                              Print
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                        No sales records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
