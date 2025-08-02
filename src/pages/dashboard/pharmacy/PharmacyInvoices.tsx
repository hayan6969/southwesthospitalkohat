import { useState, useEffect } from "react";
import AppLayout from "@/layouts/AppLayout";
import { useMedicines, usePharmacyInvoices, useCreatePharmacyInvoice } from "@/hooks/useDatabase";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ShoppingCart, Plus, Trash2, Receipt, Download, Calendar as CalendarIcon, Filter } from "lucide-react";
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
  const { data: invoices, isLoading } = usePharmacyInvoices();
  const createInvoice = useCreatePharmacyInvoice();
  const { toast } = useToast();
  const { logCreate, logDownload } = useAuditLogger();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [filterDate, setFilterDate] = useState<Date | undefined>();

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
    logDownload('Pharmacy Invoice PDF', `Downloaded PDF for invoice ${invoice.invoice_number}`);
  };

  // Filter invoices by date if selected
  const filteredInvoices = filterDate
    ? invoices?.filter(invoice => {
        const invoiceDate = new Date(invoice.created_at!);
        return invoiceDate.toDateString() === filterDate.toDateString();
      })
    : invoices;

  // Calculate totals for filtered invoices
  const totalAmount = filteredInvoices?.reduce((sum, invoice) => sum + (invoice.final_amount || 0), 0) || 0;
  const totalCount = filteredInvoices?.length || 0;

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
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatPkrAmount(totalAmount)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Filter Applied</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                {filterDate ? format(filterDate, 'MMM dd, yyyy') : 'All Dates'}
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
              {filterDate && (
                <Button 
                  variant="outline" 
                  onClick={() => setFilterDate(undefined)}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Clear Filter
                </Button>
              )}

              <Button onClick={() => setShowCreateForm(!showCreateForm)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Invoice
              </Button>
            </div>
          </CardHeader>
          <CardContent>
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
                {filteredInvoices?.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.customer_name || 'Walk-in Customer'}</TableCell>
                    <TableCell>{invoice.customer_phone || '-'}</TableCell>
                    <TableCell>{formatPkrAmount(invoice.final_amount)}</TableCell>
                    <TableCell>{format(new Date(invoice.created_at), 'MMM dd, yyyy HH:mm')}</TableCell>
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
                {(!filteredInvoices || filteredInvoices.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {filterDate ? 'No invoices found for the selected date' : 'No invoices created yet'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Create New Invoice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_name">Customer Name</Label>
                  <Input
                    id="customer_name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <Label htmlFor="customer_phone">Customer Phone</Label>
                  <Input
                    id="customer_phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-4">Add Items</h3>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label>Medicine</Label>
                    <Select value={selectedMedicineId} onValueChange={setSelectedMedicineId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select medicine" />
                      </SelectTrigger>
                      <SelectContent>
                        {medicines?.map((medicine) => (
                          <SelectItem key={medicine.id} value={medicine.id}>
                            {medicine.name} - {formatPkrAmount(medicine.selling_price)} (Stock: {medicine.stock_quantity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-20"
                    />
                  </div>
                  <Button onClick={addItem} disabled={!selectedMedicineId}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {items.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medicine</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.medicine_name}</TableCell>
                          <TableCell>{formatPkrAmount(item.unit_price / convertUsdToPkr(1))}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                              min="1"
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>{formatPkrAmount(item.total_price / convertUsdToPkr(1))}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex items-center gap-4">
                  <Label htmlFor="discount">Discount (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    className="w-20"
                  />
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Subtotal: {formatPkrAmount(subtotal / convertUsdToPkr(1))}</div>
                  {discount > 0 && (
                    <div className="text-sm text-gray-600">Discount: -{formatPkrAmount(discountAmount / convertUsdToPkr(1))}</div>
                  )}
                  <div className="text-lg font-bold">Total: {formatPkrAmount(total / convertUsdToPkr(1))}</div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateInvoice}
                  disabled={items.length === 0 || createInvoice.isPending}
                >
                  Create Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}