import { useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useMedicines, useCreatePharmacyInvoice } from "@/hooks/useDatabase";
import { formatPkrCurrency } from "@/utils/currency";
import { toast } from "sonner";
import { ShoppingCart, Plus, Trash2 } from "lucide-react";

type CartItem = {
  medicineId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  stockAvailable: number;
};

export default function PharmacySell() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState(0);

  const { data: medicines, isLoading } = useMedicines();
  const createInvoice = useCreatePharmacyInvoice();

  const addToCart = () => {
    if (!selectedMedicineId || quantity <= 0) {
      toast.error("Please select a medicine and valid quantity");
      return;
    }

    const medicine = medicines?.find(m => m.id === selectedMedicineId);
    if (!medicine) {
      toast.error("Medicine not found");
      return;
    }

    if (quantity > medicine.stock_quantity) {
      toast.error(`Only ${medicine.stock_quantity} units available in stock`);
      return;
    }

    const existingItem = cart.find(item => item.medicineId === selectedMedicineId);
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > medicine.stock_quantity) {
        toast.error(`Only ${medicine.stock_quantity} units available in stock`);
        return;
      }
      
      setCart(cart.map(item => 
        item.medicineId === selectedMedicineId 
          ? { ...item, quantity: newQuantity, totalPrice: newQuantity * item.unitPrice }
          : item
      ));
    } else {
      const newItem: CartItem = {
        medicineId: selectedMedicineId,
        name: medicine.name,
        unitPrice: medicine.selling_price,
        quantity,
        totalPrice: quantity * medicine.selling_price,
        stockAvailable: medicine.stock_quantity
      };
      setCart([...cart, newItem]);
    }

    setSelectedMedicineId("");
    setQuantity(1);
    toast.success("Item added to cart");
  };

  const removeFromCart = (medicineId: string) => {
    setCart(cart.filter(item => item.medicineId !== medicineId));
    toast.success("Item removed from cart");
  };

  const updateQuantity = (medicineId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(medicineId);
      return;
    }

    const item = cart.find(item => item.medicineId === medicineId);
    if (item && newQuantity > item.stockAvailable) {
      toast.error(`Only ${item.stockAvailable} units available in stock`);
      return;
    }

    setCart(cart.map(item => 
      item.medicineId === medicineId 
        ? { ...item, quantity: newQuantity, totalPrice: newQuantity * item.unitPrice }
        : item
    ));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;

  const handleSale = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    try {
      const invoiceNumber = `INV-${Date.now()}`;
      
      const invoiceData = {
        invoice: {
          invoice_number: invoiceNumber,
          customer_name: customerName || "Walk-in Customer",
          customer_phone: customerPhone || null,
          total_amount: subtotal,
          discount_amount: discountAmount,
          final_amount: total,
        },
        items: cart.map(item => ({
          medicine_id: item.medicineId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice
        }))
      };

      await createInvoice.mutateAsync(invoiceData);
      
      // Clear the form
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setDiscount(0);
      
      toast.success("Sale completed successfully!");
    } catch (error) {
      toast.error("Failed to complete sale");
      console.error("Sale error:", error);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sell Medicine</h1>
          <p className="text-gray-600 mt-1">Process medicine sales and generate invoices</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add to Cart Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Medicine to Cart
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Medicine</Label>
                <Select value={selectedMedicineId} onValueChange={setSelectedMedicineId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose medicine..." />
                  </SelectTrigger>
                  <SelectContent>
                    {medicines?.filter(m => m.stock_quantity > 0).map((medicine) => (
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
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  placeholder="Enter quantity"
                />
              </div>

              <Button 
                onClick={addToCart} 
                className="w-full"
                disabled={!selectedMedicineId || quantity <= 0 || isLoading}
              >
                Add to Cart
              </Button>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Customer Name (Optional)</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <Label>Phone Number (Optional)</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <Label>Discount (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  placeholder="Enter discount percentage"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shopping Cart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Shopping Cart ({cart.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Cart is empty</p>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.medicineId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-600">
                        {formatPkrCurrency(item.unitPrice)} × {item.quantity} = {formatPkrCurrency(item.totalPrice)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max={item.stockAvailable}
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.medicineId, Number(e.target.value))}
                        className="w-20"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFromCart(item.medicineId)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatPkrCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({discount}%):</span>
                      <span>-{formatPkrCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatPkrCurrency(total)}</span>
                  </div>
                </div>

                <Button 
                  onClick={handleSale} 
                  className="w-full"
                  disabled={createInvoice.isPending}
                >
                  {createInvoice.isPending ? "Processing..." : "Complete Sale"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}