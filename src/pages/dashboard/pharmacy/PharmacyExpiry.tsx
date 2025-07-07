
import AppLayout from "@/layouts/AppLayout";
import { usePharmacy } from "@/hooks/usePharmacy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, Package, Trash2 } from "lucide-react";
import { format, isAfter, isBefore, addMonths } from "date-fns";

export default function PharmacyExpiry() {
  const { data: medicines, isLoading } = usePharmacy();

  const now = new Date();
  const oneMonthFromNow = addMonths(now, 1);

  const expiredMedicines = medicines?.filter(medicine => 
    isBefore(new Date(medicine.expiry_date), now)
  ) || [];

  const expiringMedicines = medicines?.filter(medicine => {
    const expiryDate = new Date(medicine.expiry_date);
    return isAfter(expiryDate, now) && isBefore(expiryDate, oneMonthFromNow);
  }) || [];

  const validMedicines = medicines?.filter(medicine => 
    isAfter(new Date(medicine.expiry_date), oneMonthFromNow)
  ) || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Medicine Expiry Management</h1>
          <p className="text-gray-600 mt-1">Monitor and manage medicine expiry dates</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{expiredMedicines.length}</div>
              <p className="text-xs text-muted-foreground">Immediate action required</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <Calendar className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{expiringMedicines.length}</div>
              <p className="text-xs text-muted-foreground">Within 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valid Stock</CardTitle>
              <Package className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{validMedicines.length}</div>
              <p className="text-xs text-muted-foreground">Good condition</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Medicines</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{medicines?.length || 0}</div>
              <p className="text-xs text-muted-foreground">All inventory</p>
            </CardContent>
          </Card>
        </div>

        {expiredMedicines.length > 0 && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Expired Medicines - Immediate Action Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Value Lost</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiredMedicines.map((medicine) => (
                      <TableRow key={medicine.id} className="bg-red-50">
                        <TableCell className="font-medium">{medicine.name}</TableCell>
                        <TableCell>{medicine.company_name || '-'}</TableCell>
                        <TableCell>{medicine.batch_number || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {format(new Date(medicine.expiry_date), 'MMM d, yyyy')}
                          </Badge>
                        </TableCell>
                        <TableCell>{medicine.stock_quantity}</TableCell>
                        <TableCell>
                          ${(medicine.purchase_price * medicine.stock_quantity).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="w-3 h-3 mr-1" />
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {expiringMedicines.length > 0 && (
          <Card className="border-orange-200">
            <CardHeader>
              <CardTitle className="text-orange-700 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Medicines Expiring Within 30 Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Days Left</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringMedicines.map((medicine) => {
                      const daysLeft = Math.ceil(
                        (new Date(medicine.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                      );
                      
                      return (
                        <TableRow key={medicine.id} className="bg-orange-50">
                          <TableCell className="font-medium">{medicine.name}</TableCell>
                          <TableCell>{medicine.company_name || '-'}</TableCell>
                          <TableCell>{medicine.batch_number || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {format(new Date(medicine.expiry_date), 'MMM d, yyyy')}
                            </Badge>
                          </TableCell>
                          <TableCell>{medicine.stock_quantity}</TableCell>
                          <TableCell>
                            <Badge variant={daysLeft <= 7 ? 'destructive' : 'secondary'}>
                              {daysLeft} days
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline">
                              Mark for Sale
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
