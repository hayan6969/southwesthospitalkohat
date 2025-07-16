import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { WifiOff, RefreshCw, Upload, CheckCircle, Wifi, Download, Plus, Minus, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPkrAmount } from "@/utils/currency";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from 'jspdf';

type Medicine = {
  id: string;
  name: string;
  selling_price: number;
  stock_quantity: number;
  company_name: string;
  batch_number: string;
  expiry_date: string;
};

type SaleItem = {
  medicine_id: string;
  medicine_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type OfflineSale = {
  id: string;
  customer_name?: string;
  customer_phone?: string;
  items: SaleItem[];
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  created_at: string;
  invoice_number: string;
};

export default function OfflineModePharmacy() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [offlineSales, setOfflineSales] = useState<OfflineSale[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  // Sale form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState('');
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState('0');

  const { toast } = useToast();

  useEffect(() => {
    loadCachedData();
    
    // If online, fetch fresh data and cache it
    if (isOnline) {
      fetchAndCacheData();
    }

    const handleOnlineStatusChange = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        fetchAndCacheData();
      }
    };

    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);

    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
    };
  }, []);

  const loadCachedData = () => {
    try {
      const cachedMedicines = localStorage.getItem('cached_medicines');
      const cachedOfflineSales = localStorage.getItem('offline_pharmacy_sales');

      if (cachedMedicines) {
        const parsedMedicines = JSON.parse(cachedMedicines);
        setMedicines(parsedMedicines);
        console.log('✅ Loaded cached medicines:', parsedMedicines.length);
      }

      if (cachedOfflineSales) {
        const parsedSales = JSON.parse(cachedOfflineSales);
        setOfflineSales(parsedSales);
        setPendingCount(parsedSales.length);
        console.log('✅ Loaded cached offline sales:', parsedSales.length);
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  };

  const fetchAndCacheData = async () => {
    try {
      console.log('🔄 Fetching fresh pharmacy data...');

      // Fetch medicines
      const { data: medicinesData, error: medicinesError } = await supabase
        .from('medicines')
        .select('*')
        .order('name');

      if (medicinesError) {
        console.error('Error fetching medicines:', medicinesError);
      } else {
        setMedicines(medicinesData);
        localStorage.setItem('cached_medicines', JSON.stringify(medicinesData));
        console.log('✅ Medicines cached:', medicinesData.length);
      }

      console.log('🎉 All pharmacy data fetched and cached successfully');
      
    } catch (error) {
      console.error('Error fetching pharmacy data:', error);
    }
  };

  const generateInvoiceNumber = () => {
    return `PHARM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const addMedicineToSale = () => {
    if (!selectedMedicine) {
      toast({
        title: "No Medicine Selected",
        description: "Please select a medicine to add to the sale.",
        variant: "destructive"
      });
      return;
    }

    const medicine = medicines.find(m => m.id === selectedMedicine);
    if (!medicine) return;

    // Check if medicine already in cart
    const existingItemIndex = saleItems.findIndex(item => item.medicine_id === selectedMedicine);
    
    if (existingItemIndex >= 0) {
      // Increase quantity
      const updatedItems = [...saleItems];
      const currentQuantity = updatedItems[existingItemIndex].quantity;
      
      if (currentQuantity >= medicine.stock_quantity) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${medicine.stock_quantity} units available.`,
          variant: "destructive"
        });
        return;
      }

      updatedItems[existingItemIndex].quantity += 1;
      updatedItems[existingItemIndex].total_price = updatedItems[existingItemIndex].quantity * medicine.selling_price;
      setSaleItems(updatedItems);
    } else {
      // Add new item
      if (medicine.stock_quantity < 1) {
        toast({
          title: "Out of Stock",
          description: "This medicine is out of stock.",
          variant: "destructive"
        });
        return;
      }

      const newItem: SaleItem = {
        medicine_id: medicine.id,
        medicine_name: medicine.name,
        quantity: 1,
        unit_price: medicine.selling_price,
        total_price: medicine.selling_price
      };
      setSaleItems([...saleItems, newItem]);
    }

    setSelectedMedicine('');
  };

  const updateItemQuantity = (medicineId: string, change: number) => {
    const medicine = medicines.find(m => m.id === medicineId);
    if (!medicine) return;

    const updatedItems = saleItems.map(item => {
      if (item.medicine_id === medicineId) {
        const newQuantity = Math.max(0, Math.min(medicine.stock_quantity, item.quantity + change));
        return {
          ...item,
          quantity: newQuantity,
          total_price: newQuantity * item.unit_price
        };
      }
      return item;
    }).filter(item => item.quantity > 0);

    setSaleItems(updatedItems);
  };

  const removeItem = (medicineId: string) => {
    setSaleItems(saleItems.filter(item => item.medicine_id !== medicineId));
  };

  const calculateTotals = () => {
    const total = saleItems.reduce((sum, item) => sum + item.total_price, 0);
    const discount = parseFloat(discountAmount) || 0;
    const final = Math.max(0, total - discount);
    return { total, discount, final };
  };

  const saveOfflineSale = (sale: OfflineSale) => {
    const existingSales = JSON.parse(localStorage.getItem('offline_pharmacy_sales') || '[]');
    const updatedSales = [...existingSales, sale];
    localStorage.setItem('offline_pharmacy_sales', JSON.stringify(updatedSales));
    setOfflineSales(updatedSales);
    setPendingCount(updatedSales.length);
  };

  const generatePDF = (sale: OfflineSale) => {
    try {
      console.log('📄 Generating pharmacy invoice PDF...');
      
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text('PHARMACY INVOICE', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Invoice: ${sale.invoice_number}`, 20, 35);
      doc.text(`Date: ${new Date(sale.created_at).toLocaleDateString()}`, 20, 45);
      
      if (sale.customer_name) {
        doc.text(`Customer: ${sale.customer_name}`, 20, 55);
      }
      if (sale.customer_phone) {
        doc.text(`Phone: ${sale.customer_phone}`, 20, 65);
      }
      
      // Items
      let yPos = 85;
      doc.text('ITEMS:', 20, yPos);
      yPos += 10;
      
      doc.text('Medicine', 20, yPos);
      doc.text('Qty', 100, yPos);
      doc.text('Price', 130, yPos);
      doc.text('Total', 160, yPos);
      yPos += 5;
      
      // Line
      doc.line(20, yPos, 190, yPos);
      yPos += 10;
      
      sale.items.forEach((item) => {
        doc.text(item.medicine_name, 20, yPos);
        doc.text(item.quantity.toString(), 100, yPos);
        doc.text(`Rs. ${item.unit_price}`, 130, yPos);
        doc.text(`Rs. ${item.total_price}`, 160, yPos);
        yPos += 10;
      });
      
      // Totals
      yPos += 10;
      doc.line(20, yPos, 190, yPos);
      yPos += 10;
      
      doc.text(`Subtotal: Rs. ${sale.total_amount}`, 130, yPos);
      yPos += 10;
      doc.text(`Discount: Rs. ${sale.discount_amount}`, 130, yPos);
      yPos += 10;
      doc.setFontSize(14);
      doc.text(`TOTAL: Rs. ${sale.final_amount}`, 130, yPos);
      
      // Try to generate PDF blob
      const pdfBlob = doc.output('blob');
      console.log('💾 PDF blob created, size:', pdfBlob.size, 'bytes');
      
      // Create URL and try to open in new tab
      const pdfUrl = URL.createObjectURL(pdfBlob);
      console.log('🔗 PDF URL created:', pdfUrl);
      
      const newWindow = window.open(pdfUrl, '_blank');
      
      if (newWindow) {
        console.log('✅ PDF opened in new tab successfully');
        newWindow.focus();
        
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
          console.log('🧹 PDF URL cleaned up');
        }, 5000);
        
        toast({
          title: "PDF Generated",
          description: "Invoice PDF opened in new tab",
          variant: "default"
        });
      } else {
        console.log('⚠️ Popup blocked, trying alternative method');
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `pharmacy-invoice-${sale.invoice_number}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(pdfUrl);
        
        toast({
          title: "PDF Downloaded",
          description: "Invoice PDF has been downloaded to your device",
          variant: "default"
        });
      }
      
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      toast({
        title: "PDF Generation Failed", 
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const completeSale = () => {
    if (saleItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add medicines to the cart before completing the sale.",
        variant: "destructive"
      });
      return;
    }

    const { total, discount, final } = calculateTotals();
    const invoiceNumber = generateInvoiceNumber();

    const sale: OfflineSale = {
      id: `offline_sale_${Date.now()}`,
      customer_name: customerName || undefined,
      customer_phone: customerPhone || undefined,
      items: saleItems,
      total_amount: total,
      discount_amount: discount,
      final_amount: final,
      created_at: new Date().toISOString(),
      invoice_number: invoiceNumber
    };

    saveOfflineSale(sale);
    generatePDF(sale);

    toast({
      title: "Sale Completed",
      description: `Sale completed successfully. Total: ${formatPkrAmount(final)}`,
      variant: "default"
    });

    // Reset form
    setCustomerName('');
    setCustomerPhone('');
    setSaleItems([]);
    setDiscountAmount('0');
  };

  const handleUploadData = async () => {
    if (!isOnline) {
      toast({
        title: "No Internet Connection",
        description: "Please connect to the internet to upload data.",
        variant: "destructive"
      });
      return;
    }

    try {
      const sales = JSON.parse(localStorage.getItem('offline_pharmacy_sales') || '[]');

      if (sales.length === 0) {
        toast({
          title: "No Data to Upload",
          description: "No offline sales found to upload.",
          variant: "default"
        });
        return;
      }

      toast({
        title: "Upload Started",
        description: `Uploading ${sales.length} sales to the server...`,
        variant: "default"
      });

      let successCount = 0;

      for (const sale of sales) {
        // Create pharmacy invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('pharmacy_invoices')
          .insert({
            invoice_number: sale.invoice_number,
            customer_name: sale.customer_name,
            customer_phone: sale.customer_phone,
            total_amount: sale.total_amount,
            discount_amount: sale.discount_amount,
            final_amount: sale.final_amount,
            status: 'completed'
          })
          .select()
          .single();

        if (invoiceError) {
          console.error('Error creating invoice:', invoiceError);
          continue;
        }

        // Create invoice items
        for (const item of sale.items) {
          const { error: itemError } = await supabase
            .from('pharmacy_invoice_items')
            .insert({
              invoice_id: invoice.id,
              medicine_id: item.medicine_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price
            });

          if (itemError) {
            console.error('Error creating invoice item:', itemError);
          }

          // Update medicine stock by first getting current stock and then updating
          const { data: currentMedicine } = await supabase
            .from('medicines')
            .select('stock_quantity')
            .eq('id', item.medicine_id)
            .single();

          if (currentMedicine) {
            const newStock = Math.max(0, currentMedicine.stock_quantity - item.quantity);
            const { error: stockError } = await supabase
              .from('medicines')
              .update({ stock_quantity: newStock })
              .eq('id', item.medicine_id);

            if (stockError) {
              console.error('Error updating stock:', stockError);
            }
          }

        }

        successCount++;
      }

      // Clear offline data
      localStorage.removeItem('offline_pharmacy_sales');
      setOfflineSales([]);
      setPendingCount(0);

      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${successCount} sales to the server.`,
        variant: "default"
      });

      // Refresh medicine data to get updated stock levels
      fetchAndCacheData();

    } catch (error) {
      console.error('Error uploading sales:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload sales data. Please try again.",
        variant: "destructive"
      });
    }
  };

  const checkOnlineStatus = () => {
    if (isOnline) {
      window.location.href = '/dashboard/pharmacy';
    } else {
      toast({
        title: "Still Offline",
        description: "Please check your internet connection.",
        variant: "destructive"
      });
    }
  };

  const { total, discount, final } = calculateTotals();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-orange-800 flex items-center gap-2">
                <WifiOff className="w-5 h-5" />
                Pharmacy Offline Mode
              </CardTitle>
              <CardDescription className="text-orange-600">
                Limited functionality - Sales will sync when online
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                {pendingCount} sales pending sync
              </Badge>
              {isOnline && pendingCount > 0 && (
                <Button 
                  onClick={handleUploadData}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Sales Data
                </Button>
              )}
              <Button 
                onClick={checkOnlineStatus}
                variant="outline" 
                className="text-orange-600 border-orange-300 hover:bg-orange-100"
              >
                {isOnline ? <Wifi className="w-4 h-4 mr-2" /> : <WifiOff className="w-4 h-4 mr-2" />}
                {isOnline ? 'Go Online' : 'Check Connection'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Sales Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create Sale</CardTitle>
          <CardDescription>Add medicines to cart and complete sale</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer-name">Customer Name (Optional)</Label>
              <Input
                id="customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <Label htmlFor="customer-phone">Customer Phone (Optional)</Label>
              <Input
                id="customer-phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
          </div>

          {/* Add Medicine */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="medicine">Select Medicine</Label>
              <Select value={selectedMedicine} onValueChange={setSelectedMedicine}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a medicine" />
                </SelectTrigger>
                <SelectContent>
                  {medicines.map((medicine) => (
                    <SelectItem key={medicine.id} value={medicine.id} disabled={medicine.stock_quantity === 0}>
                      {medicine.name} - {formatPkrAmount(medicine.selling_price)} ({medicine.stock_quantity} in stock)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={addMedicineToSale}>
                <Plus className="w-4 h-4 mr-2" />
                Add to Cart
              </Button>
            </div>
          </div>

          {/* Cart Items */}
          {saleItems.length > 0 && (
            <div className="space-y-2">
              <Label>Cart Items</Label>
              <div className="border rounded-lg">
                {saleItems.map((item) => (
                  <div key={item.medicine_id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                    <div className="flex-1">
                      <div className="font-medium">{item.medicine_name}</div>
                      <div className="text-sm text-gray-600">{formatPkrAmount(item.unit_price)} each</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => updateItemQuantity(item.medicine_id, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => updateItemQuantity(item.medicine_id, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <div className="w-20 text-right font-medium">
                        {formatPkrAmount(item.total_price)}
                      </div>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => removeItem(item.medicine_id)}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discount and Totals */}
          {saleItems.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discount">Discount Amount (Rs.)</Label>
                  <Input
                    id="discount"
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                    max={total.toString()}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatPkrAmount(total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-{formatPkrAmount(discount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatPkrAmount(final)}</span>
                  </div>
                </div>
              </div>

              <Button onClick={completeSale} className="w-full" size="lg">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Complete Sale
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sales */}
      {offlineSales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Offline Sales</CardTitle>
            <CardDescription>Sales created in offline mode</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {offlineSales.slice(-5).reverse().map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">Sale</Badge>
                    <div>
                      <div className="font-medium">
                        {sale.customer_name || 'Walk-in Customer'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {sale.items.length} items • {formatPkrAmount(sale.final_amount)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => generatePDF(sale)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Invoice
                    </Button>
                    <Badge variant="secondary">
                      {new Date(sale.created_at).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}