import { useState, useEffect } from "react";
import AppLayout from "@/layouts/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePaginatedMedicines, useAllMedicines, useUpdateMedicine } from "@/hooks/useDatabase";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useMedicineCounts } from "@/hooks/useMedicineCounts";
import { usePharmacyPermissions } from "@/hooks/usePharmacyPermissions";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { useAuth } from "@/hooks/useAuth";
import { formatPkrAmount } from "@/utils/currency";
import { toast } from "sonner";
import { AlertTriangle, TrendingDown, TrendingUp, Package, Search, Edit, RefreshCw, Check, X } from "lucide-react";
import { useQueryClient } from '@tanstack/react-query';

export default function PharmacyStock() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [editingStock, setEditingStock] = useState<{ id: string; quantity: number } | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [outOfStockPage, setOutOfStockPage] = useState(1);
  const [lowStockPage, setLowStockPage] = useState(1);
  const [normalStockPage, setNormalStockPage] = useState(1);
  const pageSize = 10;
  
  // Debounce search term to avoid API calls on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when search changes
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  const queryClient = useQueryClient();
  const { data: medicinesResult, isLoading } = usePaginatedMedicines(currentPage, pageSize, debouncedSearchTerm);
  const { data: allMedicinesResult } = useAllMedicines();
  const { data: medicineCounts, isLoading: countsLoading } = useMedicineCounts();
  const updateMedicine = useUpdateMedicine();
  const { canEditStock, canViewStock } = usePharmacyPermissions();
  const { logUpdate } = useAuditLogger();
  const { profile } = useAuth();

  const medicines = medicinesResult?.data || [];
  const totalCount = medicinesResult?.count || 0;
  const totalPages = medicinesResult?.totalPages || 1;
  const allMedicines = allMedicinesResult?.data || [];

  if (!canViewStock) {
    return (
      <AppLayout sidebarRole="head_pharmacist">
        <div className="text-center py-8">
          <p className="text-red-600">You don't have permission to view this page.</p>
        </div>
      </AppLayout>
    );
  }

  // For stock categorization, use all medicines for accurate counts
  const lowStockMedicines = allMedicines?.filter(medicine => 
    medicine.stock_quantity <= (medicine.minimum_stock_level || 10) && medicine.stock_quantity > 0
  );

  const outOfStockMedicines = allMedicines?.filter(medicine => 
    medicine.stock_quantity === 0
  );

  const normalStockMedicines = allMedicines?.filter(medicine => 
    medicine.stock_quantity > (medicine.minimum_stock_level || 10)
  );

  // Pagination logic for filtered lists
  const getPaginatedData = (data: any[], page: number) => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return {
      data: data.slice(startIndex, endIndex),
      totalPages: Math.ceil(data.length / pageSize),
      totalCount: data.length
    };
  };

  const paginatedOutOfStock = getPaginatedData(outOfStockMedicines || [], outOfStockPage);
  const paginatedLowStock = getPaginatedData(lowStockMedicines || [], lowStockPage);
  const paginatedNormalStock = getPaginatedData(normalStockMedicines || [], normalStockPage);

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

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['medicines-paginated'] });
    queryClient.invalidateQueries({ queryKey: ['medicines-all'] });
    queryClient.invalidateQueries({ queryKey: ['medicine-counts'] });
    toast.success("Data refreshed");
  };

  const renderMedicineTable = (medicinesList: any[], paginationData?: { totalPages: number; totalCount: number; currentPage: number; setPage: (page: number) => void }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Min Level</TableHead>
              <TableHead>Stock Value</TableHead>
              <TableHead>Status</TableHead>
              {canEditStock && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: canEditStock ? 8 : 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : medicinesList && medicinesList.length > 0 ? (
              medicinesList.map((medicine) => (
                <TableRow key={medicine.id}>
                  <TableCell className="font-medium">{medicine.name}</TableCell>
                  <TableCell>{medicine.company_name || "N/A"}</TableCell>
                  <TableCell>{formatPkrAmount(medicine.selling_price)}</TableCell>
                  <TableCell>
                    {editingStock?.id === medicine.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editingStock.quantity}
                          onChange={(e) => setEditingStock({
                            ...editingStock,
                            quantity: parseInt(e.target.value) || 0
                          })}
                          className="w-20"
                          min="0"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleStockUpdate(medicine.id, editingStock.quantity)}
                          disabled={updateMedicine.isPending}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingStock(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className={
                        medicine.stock_quantity === 0 ? "text-red-600 font-semibold" :
                        medicine.stock_quantity <= (medicine.minimum_stock_level || 10) ? "text-orange-600 font-semibold" :
                        "text-green-600"
                      }>
                        {medicine.stock_quantity}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{medicine.minimum_stock_level || 10}</TableCell>
                  <TableCell>{formatPkrAmount(medicine.stock_quantity * medicine.selling_price)}</TableCell>
                  <TableCell>{getStockBadge(medicine)}</TableCell>
                  {canEditStock && (
                    <TableCell>
                      {editingStock?.id !== medicine.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingStock({ id: medicine.id, quantity: medicine.stock_quantity })}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={canEditStock ? 8 : 7} className="text-center py-8 text-gray-500">
                  No medicines found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      {paginationData && paginationData.totalPages > 1 && (
        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing {((paginationData.currentPage - 1) * pageSize) + 1} to {Math.min(paginationData.currentPage * pageSize, paginationData.totalCount)} of {paginationData.totalCount} medicines
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => paginationData.setPage(Math.max(1, paginationData.currentPage - 1))}
                    className={paginationData.currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, paginationData.totalPages) }, (_, i) => {
                  let pageNumber;
                  if (paginationData.totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (paginationData.currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (paginationData.currentPage >= paginationData.totalPages - 2) {
                    pageNumber = paginationData.totalPages - 4 + i;
                  } else {
                    pageNumber = paginationData.currentPage - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        onClick={() => paginationData.setPage(pageNumber)}
                        isActive={paginationData.currentPage === pageNumber}
                        className="cursor-pointer"
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => paginationData.setPage(Math.min(paginationData.totalPages, paginationData.currentPage + 1))}
                    className={paginationData.currentPage === paginationData.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <AppLayout sidebarRole="head_pharmacist">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Stock Tracking</h1>
            <p className="text-gray-600 mt-1">Monitor and manage medicine inventory levels</p>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
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
                  <p className="text-sm font-medium text-gray-600">Total Stock</p>
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
                    {countsLoading ? "..." : (medicineCounts?.outOfStock || 0)}
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
                    {countsLoading ? "..." : (medicineCounts?.lowStock || 0)}
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
                    {countsLoading ? "..." : (medicineCounts?.normalStock || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {(medicineCounts?.outOfStock > 0 || medicineCounts?.lowStock > 0) && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-orange-800">Stock Alerts</h3>
            </div>
            <p className="text-orange-700 mt-1">
              {medicineCounts?.outOfStock > 0 && `${medicineCounts.outOfStock} medicines are out of stock. `}
              {medicineCounts?.lowStock > 0 && `${medicineCounts.lowStock} medicines are running low.`}
            </p>
          </div>
        )}

        {/* Search and Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Medicine Stock
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search medicines..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>

          <div className="p-6">
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList>
                <TabsTrigger value="all">All Medicines</TabsTrigger>
                <TabsTrigger value="out-of-stock">Out of Stock</TabsTrigger>
                <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
                <TabsTrigger value="normal-stock">Normal Stock</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                {renderMedicineTable(medicines, {
                  totalPages,
                  totalCount,
                  currentPage,
                  setPage: setCurrentPage
                })}
              </TabsContent>

              <TabsContent value="out-of-stock">
                {renderMedicineTable(paginatedOutOfStock.data, {
                  totalPages: paginatedOutOfStock.totalPages,
                  totalCount: paginatedOutOfStock.totalCount,
                  currentPage: outOfStockPage,
                  setPage: setOutOfStockPage
                })}
              </TabsContent>

              <TabsContent value="low-stock">
                {renderMedicineTable(paginatedLowStock.data, {
                  totalPages: paginatedLowStock.totalPages,
                  totalCount: paginatedLowStock.totalCount,
                  currentPage: lowStockPage,
                  setPage: setLowStockPage
                })}
              </TabsContent>

              <TabsContent value="normal-stock">
                {renderMedicineTable(paginatedNormalStock.data, {
                  totalPages: paginatedNormalStock.totalPages,
                  totalCount: paginatedNormalStock.totalCount,
                  currentPage: normalStockPage,
                  setPage: setNormalStockPage
                })}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}