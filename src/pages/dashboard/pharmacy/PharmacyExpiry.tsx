
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMedicines } from "@/hooks/usePharmacy";
import { AlertTriangle, Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";

export default function PharmacyExpiry() {
  const { data: medicines, isLoading } = useMedicines();

  const getExpiryStatus = (expiryDate: string) => {
    const daysUntilExpiry = differenceInDays(new Date(expiryDate), new Date());
    
    if (daysUntilExpiry < 0) return { status: 'expired', color: 'destructive', days: Math.abs(daysUntilExpiry) };
    if (daysUntilExpiry <= 30) return { status: 'expiring', color: 'destructive', days: daysUntilExpiry };
    if (daysUntilExpiry <= 90) return { status: 'warning', color: 'secondary', days: daysUntilExpiry };
    return { status: 'good', color: 'default', days: daysUntilExpiry };
  };

  const expiredMedicines = medicines?.filter(med => {
    const status = getExpiryStatus(med.expiry_date);
    return status.status === 'expired';
  }).length || 0;

  const expiringMedicines = medicines?.filter(med => {
    const status = getExpiryStatus(med.expiry_date);
    return status.status === 'expiring';
  }).length || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Medicine Expiry Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired Medicines</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiredMedicines}</div>
            <p className="text-xs text-muted-foreground">Need immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{expiringMedicines}</div>
            <p className="text-xs text-muted-foreground">Within 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Medicines</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{medicines?.length || 0}</div>
            <p className="text-xs text-muted-foreground">In inventory</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Medicine Expiry Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine Name</TableHead>
                <TableHead>Batch Number</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Days Until Expiry</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : medicines && medicines.length > 0 ? (
                medicines
                  .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
                  .map((medicine) => {
                    const expiryInfo = getExpiryStatus(medicine.expiry_date);
                    return (
                      <TableRow key={medicine.id}>
                        <TableCell className="font-medium">{medicine.name}</TableCell>
                        <TableCell>{medicine.batch_number || 'N/A'}</TableCell>
                        <TableCell>{format(new Date(medicine.expiry_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          {expiryInfo.status === 'expired' 
                            ? `Expired ${expiryInfo.days} days ago`
                            : `${expiryInfo.days} days`
                          }
                        </TableCell>
                        <TableCell>{medicine.stock_quantity}</TableCell>
                        <TableCell>
                          <Badge variant={expiryInfo.color as any}>
                            {expiryInfo.status === 'expired' ? 'Expired' :
                             expiryInfo.status === 'expiring' ? 'Expiring Soon' :
                             expiryInfo.status === 'warning' ? 'Warning' : 'Good'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    No medicines found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
