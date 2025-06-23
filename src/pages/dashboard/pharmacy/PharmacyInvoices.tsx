
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
import { ShoppingCart, Plus, Trash2, Receipt, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generatePharmacyInvoicePDF } from "@/utils/pharmacyPdfGenerator";
import { formatPkrCurrency, convertUsdToPkr } from "@/utils/currency";

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

      logCreate('Pharmacy Invoice', `Invoice ${invoiceNumber} created for ${customerName || 'Walk-in Customer'} - Total: ${formatPkrCurrency(total / convertUsdToPkr(1))}`);
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

  const handleDownloadPDF = (invoice: any) => {
    generatePharmacyInvoicePDF(invoice);
    logDownload('Pharmacy Invoice PDF', `Downloaded PDF for invoice ${invoice.invoice_number}`);
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pharmacy Invoices</h1>
            <p className="text-gray-600 mt-1">Create and manage sales invoices</p>
          </div>
          
          <Button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </Button>
        </div>

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
                            {medicine.name} - {formatPkrCurrency(medicine.selling_price)} (Stock: {medicine.stock_quantity})
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
                          <TableCell>{formatPkrCurrency(item.unit_price / convertUsdToPkr(1))}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                              min="1"
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>{formatPkrCurrency(item.total_price / convertUsdToPkr(1))}</TableCell>
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
                  <div className="text-sm text-gray-600">Subtotal: {formatPkrCurrency(subtotal / convertUsdToPkr(1))}</div>
                  {discount > 0 && (
                    <div className="text-sm text-gray-600">Discount: -{formatPkrCurrency(discountAmount / convertUsdToPkr(1))}</div>
                  )}
                  <div className="text-lg font-bold">Total: {formatPkrCurrency(total / convertUsdToPkr(1))}</div>
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

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Recent Invoices
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : invoices && invoices.length > 0 ? (
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                      <TableCell>
                        <div>
                          <div>{invoice.customer_name || 'Walk-in Customer'}</div>
                          {invoice.customer_phone && (
                            <div className="text-sm text-gray-500">{invoice.customer_phone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {invoice.pharmacy_invoice_items?.length || 0} items
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatPkrCurrency(invoice.final_amount)}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          {invoice.status || 'Completed'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPDF(invoice)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                        >
                          <Download className="w-4 h-4" />
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-12">
                      No invoices found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
