import { useState, useEffect } from "react";
import AppLayout from "@/layouts/AppLayout";
import { useMedicines, useCreatePharmacyInvoice, usePaginatedPharmacyInvoices } from "@/hooks/useDatabase";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ShoppingCart, Plus, Trash2, Receipt, Download, Calendar as CalendarIcon, Filter, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generatePharmacyInvoicePDF } from "@/utils/pharmacyPdfGenerator";
import { formatPkrAmount, convertUsdToPkr } from "@/utils/currency";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type InvoiceItem = {
  medicine_id: string;
  medicine_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export default function PharmacyInvoices() {
  const { data: medicines } = useMedicines();
  const createInvoice = useCreatePharmacyInvoice();
  const { toast } = useToast();
  const { logCreate, logDownload } = useAuditLogger();
  const { user } = useAuth();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<'all' | 'sell' | 'return'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Use paginated pharmacy invoices hook for better performance (with date filter)
  const { data: paginatedResult, isLoading } = usePaginatedPharmacyInvoices(currentPage, itemsPerPage, searchTerm, filterDate, typeFilter);
  const invoices = paginatedResult?.data || [];
  const totalCount = paginatedResult?.count || 0;
  const totalPages = paginatedResult?.totalPages || 1;

  const addItem = () => {
    if (!selectedMedicineId) return;
    
    const medicine = medicines?.find(m => m.id === selectedMedicineId);
    if (!medicine) return;

    // Check if there's enough stock
    if (medicine.stock_quantity < quantity) {
      toast({ 
        title: "Insufficient Stock", 
        description: `Only ${medicine.stock_quantity} units available for ${medicine.name}`,
        variant: "destructive" 
      });
      return;
    }

    const existingItemIndex = items.findIndex(item => item.medicine_id === selectedMedicineId);
    
    if (existingItemIndex >= 0) {
      const updatedItems = [...items];
      const newQuantity = updatedItems[existingItemIndex].quantity + quantity;
      
      // Check total quantity against stock
      if (newQuantity > medicine.stock_quantity) {
        toast({ 
          title: "Insufficient Stock", 
          description: `Only ${medicine.stock_quantity} units available for ${medicine.name}`,
          variant: "destructive" 
        });
        return;
      }
      
      updatedItems[existingItemIndex].quantity = newQuantity;
      updatedItems[existingItemIndex].total_price = newQuantity * convertUsdToPkr(medicine.selling_price);
      setItems(updatedItems);
    } else {
      const newItem: InvoiceItem = {
        medicine_id: selectedMedicineId,
        medicine_name: medicine.name,
        quantity,
        unit_price: convertUsdToPkr(medicine.selling_price),
        total_price: quantity * convertUsdToPkr(medicine.selling_price)
      };
      setItems([...items, newItem]);
    }
    
    setSelectedMedicineId("");
    setQuantity(1);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) return;
    
    const item = items[index];
    const medicine = medicines?.find(m => m.id === item.medicine_id);
    
    if (medicine && newQuantity > medicine.stock_quantity) {
      toast({ 
        title: "Insufficient Stock", 
        description: `Only ${medicine.stock_quantity} units available for ${medicine.name}`,
        variant: "destructive" 
      });
      return;
    }
    
    const updatedItems = [...items];
    updatedItems[index].quantity = newQuantity;
    updatedItems[index].total_price = newQuantity * updatedItems[index].unit_price;
    setItems(updatedItems);
  };

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;

  const handleCreateInvoice = async () => {
    if (items.length === 0) {
      toast({ title: "Error", description: "Please add at least one item", variant: "destructive" });
      return;
    }

    try {
      const invoiceNumber = `INV-${Date.now()}`;
      
      await createInvoice.mutateAsync({
        invoice: {
          invoice_number: invoiceNumber,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          total_amount: subtotal,
          discount_amount: discountAmount,
          final_amount: total
        },
        items: items.map(item => ({
          medicine_id: item.medicine_id,
          quantity: item.quantity,
          unit_price: item.unit_price / convertUsdToPkr(1), // Convert back to USD for storage
          total_price: item.total_price / convertUsdToPkr(1) // Convert back to USD for storage
        }))
      });

      logCreate('Pharmacy Invoice', `Invoice ${invoiceNumber} created for ${customerName || 'Walk-in Customer'} - Total: ${formatPkrAmount(total / convertUsdToPkr(1))}`);
      toast({ title: "Invoice created successfully" });
      
      // Reset form
      setCustomerName("");
      setCustomerPhone("");
      setDiscount(0);
      setItems([]);
      setShowCreateForm(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to create invoice", variant: "destructive" });
    }
  };

  const handleDownloadPDF = async (invoice: any) => {
    // Fetch invoice items for this invoice
    const { data: items } = await supabase
      .from('pharmacy_invoice_items')
      .select(`
        *,
        medicines:medicine_id (
          name,
          selling_price
        )
      `)
      .eq('invoice_id', invoice.id);

    const invoiceData = {
      invoice_number: invoice.invoice_number,
      customer_name: invoice.customer_name,
      customer_phone: invoice.customer_phone,
      total_amount: invoice.total_amount,
      discount_amount: invoice.discount_amount || 0,
      final_amount: invoice.final_amount,
      created_at: invoice.created_at,
      items: items?.map(item => ({
        medicine_name: item.medicines?.name || 'Unknown Medicine',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      })) || []
    };

    await generatePharmacyInvoicePDF(invoiceData);
    logDownload('Pharmacy Invoice PDF', `Downloaded PDF for invoice ${invoice.invoice_number}`, user?.id);
  };

  // Date filtering is now done server-side in the hook, no need for client-side filtering
  const filteredInvoices = invoices;

  // Calculate totals for current page
  const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + (invoice.final_amount || 0), 0);
  const currentCount = filteredInvoices.length;

  // Reset current page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDate]);

  return (
    <AppLayout sidebarRole="head_pharmacist">
      <div className="space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCount}</div>
                <div className="text-xs text-gray-500">
                  {searchTerm && `(filtered by "${searchTerm}")`}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Page Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatPkrAmount(totalAmount)}</div>
                <div className="text-xs text-gray-500">
                  Current page total
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Current Page</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentPage} of {totalPages}</div>
                <div className="text-xs text-gray-500">
                  {currentCount} invoices shown
                </div>
              </CardContent>
            </Card>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pharmacy Invoices</h1>
            <p className="text-gray-600 mt-1">Create and manage sales invoices</p>
          </div>
        </div>

        {/* Pharmacy Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Pharmacy Invoices
            </CardTitle>
            <div className="flex items-center gap-4">
              {/* Search by Invoice Number */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by invoice number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              
              {/* Date Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-48 justify-start text-left font-normal",
                      !filterDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterDate ? format(filterDate, "PPP") : <span>Filter by date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filterDate}
                    onSelect={setFilterDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              {/* Clear Filter */}
              {(filterDate || searchTerm) && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFilterDate(undefined);
                    setSearchTerm("");
                  }}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Results count */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} invoices
                {searchTerm && ` (filtered by "${searchTerm}")`}
              </span>
              {totalPages > 1 && (
                <span>Page {currentPage} of {totalPages}</span>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.customer_name || 'Walk-in Customer'}</TableCell>
                    <TableCell>{invoice.customer_phone || '-'}</TableCell>
                    <TableCell>{formatPkrAmount(invoice.final_amount)}</TableCell>
                    <TableCell>{format(new Date(invoice.created_at), 'MMM dd, yyyy hh:mm a')}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDownloadPDF(invoice)}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        View Invoice
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {searchTerm ? `No invoices found matching "${searchTerm}"` :
                       filterDate ? 'No invoices found for the selected date' : 
                       'No invoices created yet'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2">
                <div className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    {totalPages > 5 && <span className="px-2">...</span>}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}