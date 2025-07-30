import { useState, useEffect } from "react";
import AppLayout from "@/layouts/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePaginatedMedicines, useAllMedicines, useUpdateMedicine } from "@/hooks/useDatabase";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useMedicineCounts } from "@/hooks/useMedicineCounts";
import { usePharmacyPermissions } from "@/hooks/usePharmacyPermissions";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { useAuth } from "@/hooks/useAuth";
import { formatPkrAmount } from "@/utils/currency";
import { toast } from "sonner";
import { AlertTriangle, TrendingDown, TrendingUp, Package, Search, Edit, RefreshCw } from "lucide-react";
import { useQueryClient } from '@tanstack/react-query';

export default function PharmacyStock() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [editingStock, setEditingStock] = useState<{ id: string; quantity: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Debounce search query to avoid API calls on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to first page when search changes
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  const queryClient = useQueryClient();
  const { data: medicinesResult, isLoading } = usePaginatedMedicines(currentPage, pageSize, debouncedSearchQuery);
  const { data: allMedicinesResult } = useAllMedicines();
  const { data: medicineCounts, isLoading: countsLoading, refetch: refetchCounts } = useMedicineCounts();
  const updateMedicine = useUpdateMedicine();
  const { canEditStock, canViewStock } = usePharmacyPermissions();
  const { logUpdate } = useAuditLogger();
  const { profile } = useAuth();

  const medicines = medicinesResult?.data || [];
  const totalCount = medicinesResult?.count || 0;
  const totalPages = medicinesResult?.totalPages || 1;
  const allMedicines = allMedicinesResult?.data || [];

  // Debug: Log the actual medicine count
  console.log('📊 Medicine count in PharmacyStock:', medicines?.length);
  console.log('📊 Total medicines available:', allMedicinesResult?.count);
  console.log('📊 Direct medicine counts:', medicineCounts);

  // Force refresh medicine data on component mount
  useEffect(() => {
    const invalidateAndRefresh = async () => {
      await queryClient.invalidateQueries({ queryKey: ['medicines-paginated'] });
      await queryClient.invalidateQueries({ queryKey: ['medicines-all'] });
      await queryClient.invalidateQueries({ queryKey: ['medicine-counts'] });
      await queryClient.invalidateQueries({ queryKey: ['pharmacy-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['expiring-medicines'] });
      refetchCounts();
    };
    invalidateAndRefresh();
  }, [queryClient, refetchCounts]);

  if (!canViewStock) {
    return (
      <AppLayout>
        <div className="text-center py-8">
          <p className="text-red-600">You don't have permission to view this page.</p>
        </div>
      </AppLayout>
    );
  }

  // For stock categorization, use all medicines for accurate counts
  const lowStockMedicines = allMedicines?.filter(medicine => 
    medicine.stock_quantity <= (medicine.minimum_stock_level || 10)
  );

  const outOfStockMedicines = allMedicines?.filter(medicine => 
    medicine.stock_quantity === 0
  );

  const normalStockMedicines = allMedicines?.filter(medicine => 
    medicine.stock_quantity > (medicine.minimum_stock_level || 10)
  );

  const handleStockUpdate = async (medicineId: string, newQuantity: number) => {
    if (newQuantity < 0) {
      toast.error("Stock quantity cannot be negative");
      return;
    }

    try {
      const medicine = allMedicines?.find(m => m.id === medicineId);
      const oldQuantity = medicine?.stock_quantity || 0;
      
      await updateMedicine.mutateAsync({
        id: medicineId,
        stock_quantity: newQuantity
      });
      
      await logUpdate(
        "Medicine Stock", 
        `Updated stock for ${medicine?.name}: ${oldQuantity} → ${newQuantity}`, 
        profile?.id
      );
      
      setEditingStock(null);
      toast.success("Stock updated successfully");
    } catch (error) {
      toast.error("Failed to update stock");
      console.error("Stock update error:", error);
    }
  };

  const getStockStatus = (medicine: any) => {
    if (medicine.stock_quantity === 0) return "out-of-stock";
    if (medicine.stock_quantity <= (medicine.minimum_stock_level || 10)) return "low-stock";
    return "normal";
  };

  const getStockBadge = (medicine: any) => {
    const status = getStockStatus(medicine);
    
    switch (status) {
      case "out-of-stock":
        return <Badge variant="destructive">Out of Stock</Badge>;
      case "low-stock":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Low Stock</Badge>;
      default:
        return <Badge variant="secondary" className="bg-green-100 text-green-800">In Stock</Badge>;
    }
  };

  const StockTable = ({ medicines: medicinesList, title, totalCount }: { medicines: any[], title: string, totalCount?: number }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          {title} ({totalCount !== undefined ? totalCount : medicinesList.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {medicinesList.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No medicines found</p>
        ) : (
          <div className="space-y-4">
            {medicinesList.map((medicine) => (
              <div key={medicine.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{medicine.name}</h4>
                    <p className="text-sm text-gray-600">
                      {medicine.company_name && `${medicine.company_name} • `}
                      Selling Price: {formatPkrAmount(medicine.selling_price)}
                    </p>
                  </div>
                  {getStockBadge(medicine)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <div>
                    <Label className="text-sm font-medium">Current Stock</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {editingStock?.id === medicine.id && canEditStock ? (
                        <div className="flex gap-2 flex-1">
                          <Input
                            type="number"
                            min="0"
                            value={editingStock.quantity}
                            onChange={(e) => setEditingStock({
                              id: medicine.id,
                              quantity: Number(e.target.value)
                            })}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleStockUpdate(medicine.id, editingStock.quantity)}
                            disabled={updateMedicine.isPending}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingStock(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-medium">{medicine.stock_quantity} units</span>
                          {canEditStock && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingStock({
                                id: medicine.id,
                                quantity: medicine.stock_quantity
                              })}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {!canEditStock && (
                            <span className="text-gray-500 text-sm ml-2">(View Only)</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Minimum Level</Label>
                    <p className="font-medium mt-1">{medicine.minimum_stock_level || 10} units</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Stock Value</Label>
                    <p className="font-medium mt-1">
                      {formatPkrAmount(medicine.stock_quantity * medicine.selling_price)}
                    </p>
                  </div>
                </div>

                {medicine.stock_quantity <= (medicine.minimum_stock_level || 10) && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-800">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Stock is {medicine.stock_quantity === 0 ? 'out' : 'low'}! 
                        {medicine.stock_quantity > 0 && ` Only ${medicine.stock_quantity} units remaining.`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Stock Tracking</h1>
            <p className="text-gray-600 mt-1">Monitor and manage medicine inventory</p>
          </div>
          <div className="text-center py-8">Loading stock data...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Stock Tracking</h1>
            <p className="text-gray-600 mt-1">Monitor and manage medicine inventory</p>
          </div>
          <Button 
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['medicines-paginated'] });
              queryClient.invalidateQueries({ queryKey: ['medicines-all'] });
              queryClient.invalidateQueries({ queryKey: ['medicine-counts'] });
              refetchCounts();
              toast.success("Data refreshed");
            }}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        {/* Stock Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold">
                    {countsLoading ? "..." : (medicineCounts?.total || allMedicinesResult?.count || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">
                    {countsLoading ? "..." : (medicineCounts?.outOfStock || outOfStockMedicines?.length || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {countsLoading ? "..." : (medicineCounts?.lowStock || lowStockMedicines?.length || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Normal Stock</p>
                  <p className="text-2xl font-bold text-green-600">
                    {countsLoading ? "..." : (medicineCounts?.normalStock || normalStockMedicines?.length || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search medicines by name or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stock Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Stock</TabsTrigger>
            <TabsTrigger value="out-of-stock" className="text-red-600">
              Out of Stock ({countsLoading ? "..." : (medicineCounts?.outOfStock || outOfStockMedicines?.length || 0)})
            </TabsTrigger>
            <TabsTrigger value="low-stock" className="text-orange-600">
              Low Stock ({countsLoading ? "..." : (medicineCounts?.lowStock || lowStockMedicines?.length || 0)})
            </TabsTrigger>
            <TabsTrigger value="normal-stock" className="text-green-600">
              Normal Stock ({countsLoading ? "..." : (medicineCounts?.normalStock || normalStockMedicines?.length || 0)})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <StockTable 
              medicines={medicines || []} 
              title="All Medicines"
              totalCount={totalCount}
            />
            {/* Pagination for All tab */}
            {totalPages > 1 && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} medicines
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNumber;
                        if (totalPages <= 5) {
                          pageNumber = i + 1;
                        } else if (currentPage <= 3) {
                          pageNumber = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + i;
                        } else {
                          pageNumber = currentPage - 2 + i;
                        }
                        
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNumber)}
                              isActive={currentPage === pageNumber}
                              className="cursor-pointer"
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="out-of-stock">
            <StockTable 
              medicines={outOfStockMedicines || []} 
              title="Out of Stock Medicines"
              totalCount={medicineCounts?.outOfStock} 
            />
          </TabsContent>

          <TabsContent value="low-stock">
            <StockTable 
              medicines={lowStockMedicines || []} 
              title="Low Stock Medicines"
              totalCount={medicineCounts?.lowStock} 
            />
          </TabsContent>

          <TabsContent value="normal-stock">
            <StockTable 
              medicines={normalStockMedicines || []} 
              title="Normal Stock Medicines"
              totalCount={medicineCounts?.normalStock} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}