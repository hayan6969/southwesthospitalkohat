
import AppLayout from "@/layouts/AppLayout";
import { usePharmacy } from "@/hooks/usePharmacy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Search, Plus, Edit, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function PharmacyMedicines() {
  const { data: medicines, isLoading } = usePharmacy();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMedicines = medicines?.filter(medicine =>
    medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medicine.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const lowStockMedicines = medicines?.filter(medicine => 
    medicine.stock_quantity <= (medicine.minimum_stock_level || 10)
  ) || [];

  const expiredMedicines = medicines?.filter(medicine => 
    new Date(medicine.expiry_date) < new Date()
  ) || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medicine Inventory</h1>
            <p className="text-gray-600 mt-1">Manage your pharmacy inventory</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Medicine
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Medicines</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{medicines?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{lowStockMedicines.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{expiredMedicines.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${medicines?.reduce((sum, med) => sum + (med.selling_price * med.stock_quantity), 0).toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Medicine Inventory</CardTitle>
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search medicines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Purchase Price</TableHead>
                    <TableHead>Selling Price</TableHead>
                    <TableHead>Expiry Date</TableHead>
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
                  ) : filteredMedicines.length > 0 ? (
                    filteredMedicines.map((medicine) => {
                      const isExpired = new Date(medicine.expiry_date) < new Date();
                      const isLowStock = medicine.stock_quantity <= (medicine.minimum_stock_level || 10);
                      
                      return (
                        <TableRow key={medicine.id} className={isExpired ? 'bg-red-50' : isLowStock ? 'bg-orange-50' : ''}>
                          <TableCell className="font-medium">{medicine.name}</TableCell>
                          <TableCell>{medicine.company_name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={isLowStock ? 'destructive' : 'outline'}>
                              {medicine.stock_quantity}
                            </Badge>
                          </TableCell>
                          <TableCell>${medicine.purchase_price.toFixed(2)}</TableCell>
                          <TableCell>${medicine.selling_price.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={isExpired ? 'destructive' : 'outline'}>
                              {format(new Date(medicine.expiry_date), 'MMM d, yyyy')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {isExpired ? (
                              <Badge variant="destructive">Expired</Badge>
                            ) : isLowStock ? (
                              <Badge variant="secondary">Low Stock</Badge>
                            ) : (
                              <Badge variant="default">Available</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline">
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                        {searchTerm ? 'No medicines found matching your search' : 'No medicines in inventory'}
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
