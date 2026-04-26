import { useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableMedicineSelect } from "@/components/SearchableMedicineSelect";
import { Separator } from "@/components/ui/separator";
import { useSearchableMedicines, useCreatePharmacyInvoice } from "@/hooks/useDatabase";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { useAuth } from "@/hooks/useAuth";
import { formatPkrAmount } from "@/utils/currency";
import { generatePharmacyInvoicePDF } from "@/utils/pharmacyPdfGenerator";
import { getCurrentPakistanTime } from "@/utils/timezone";
import { toast } from "sonner";
import { ShoppingCart, Plus, Trash2 } from "lucide-react";

type CartItem = {
  medicineId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  stockAvailable: number;
  expiryDate?: string | null;
};

const formatExpiry = (date?: string | null) => {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
};

const isExpiringSoon = (date?: string | null) => {
  if (!date) return false;
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 90;
};

export default function PharmacySell() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: medicines, isLoading } = useSearchableMedicines(searchTerm);
  const createInvoice = useCreatePharmacyInvoice();
  const { logCreate } = useAuditLogger();
  const { profile } = useAuth();

  const addToCart = () => {
    if (!selectedMedicineId || quantity <= 0) {
      toast.error("Please select a medicine and valid quantity");
      return;
    }

    const selected = medicines?.find(m => m.id === selectedMedicineId);
    if (!selected) {
      toast.error("Medicine not found");
      return;
    }

    // FIFO: gather all batches with the same name, oldest first (medicines are
    // already ordered by created_at asc from the hook).
    const batches = (medicines || [])
      .filter(m => m.name === selected.name)
      .sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (ta !== tb) return ta - tb;
        const ea = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity;
        const eb = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity;
        return ea - eb;
      });

    // Compute remaining capacity per batch after what's already in the cart
    const cartByBatch = new Map<string, number>();
    cart.forEach(c => cartByBatch.set(c.medicineId, (cartByBatch.get(c.medicineId) || 0) + c.quantity));

    const totalAvailable = batches.reduce(
      (sum, b) => sum + Math.max(0, b.stock_quantity - (cartByBatch.get(b.id) || 0)),
      0
    );
    if (quantity > totalAvailable) {
      toast.error(`Only ${totalAvailable} units available across all batches`);
      return;
    }

    let remaining = quantity;
    const newCart = [...cart];

    for (const batch of batches) {
      if (remaining <= 0) break;
      const alreadyInCart = cartByBatch.get(batch.id) || 0;
      const free = batch.stock_quantity - alreadyInCart;
      if (free <= 0) continue;
      const take = Math.min(free, remaining);

      const existingIdx = newCart.findIndex(item => item.medicineId === batch.id);
      if (existingIdx >= 0) {
        const ex = newCart[existingIdx];
        const newQty = ex.quantity + take;
        newCart[existingIdx] = { ...ex, quantity: newQty, totalPrice: newQty * ex.unitPrice };
      } else {
        newCart.push({
          medicineId: batch.id,
          name: batch.name,
          unitPrice: batch.selling_price,
          quantity: take,
          totalPrice: take * batch.selling_price,
          stockAvailable: batch.stock_quantity,
          expiryDate: batch.expiry_date,
        });
      }
      remaining -= take;
    }

    setCart(newCart);
    setSelectedMedicineId("");
    setQuantity(1);
    toast.success(
      batches.length > 1
        ? "Added to cart (oldest batch first)"
        : "Item added to cart"
    );
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

    if (isSubmitting) return;
    setIsSubmitting(true);

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

      const result = await createInvoice.mutateAsync(invoiceData);
      
      // Generate and open PDF invoice
      const pdfData = {
        invoice_number: invoiceNumber,
        customer_name: customerName || "Walk-in Customer",
        customer_phone: customerPhone || undefined,
        total_amount: subtotal,
        discount_amount: discountAmount,
        final_amount: total,
        created_at: getCurrentPakistanTime().toISOString(),
        items: cart.map(item => ({
          medicine_name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice
        }))
      };
      
      await generatePharmacyInvoicePDF(pdfData);
      
      // Log the audit event
      const itemsList = cart.map(item => `${item.name} (${item.quantity})`).join(', ');
      await logCreate(
        "Pharmacy Sale", 
        `Sale completed - Invoice: ${invoiceNumber}, Customer: ${customerName || "Walk-in Customer"}, Items: ${itemsList}, Total: ${formatPkrAmount(total)}`, 
        profile?.id
      );
      
      // Clear the form
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setDiscount(0);
      
      toast.success("Sale completed successfully! Invoice opened in new tab.");
    } catch (error) {
      toast.error("Failed to complete sale");
      console.error("Sale error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout sidebarRole="head_pharmacist">
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
                <SearchableMedicineSelect
                  medicines={medicines}
                  value={selectedMedicineId}
                  onValueChange={setSelectedMedicineId}
                  placeholder="Search and select medicine..."
                  isLoading={isLoading}
                  onSearchChange={setSearchTerm}
                />
                {selectedMedicineId && (() => {
                  const m = medicines?.find(x => x.id === selectedMedicineId);
                  if (!m) return null;
                  return (
                    <p className={`text-xs mt-1 ${isExpiringSoon(m.expiry_date) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      Expiry: {formatExpiry(m.expiry_date)} · Stock: {m.stock_quantity}
                    </p>
                  );
                })()}
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
                        {formatPkrAmount(item.unitPrice)} × {item.quantity} = {formatPkrAmount(item.totalPrice)}
                      </p>
                      <p className={`text-xs mt-0.5 ${isExpiringSoon(item.expiryDate) ? "text-destructive font-medium" : "text-gray-500"}`}>
                        Expiry: {formatExpiry(item.expiryDate)}
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
                    <span>{formatPkrAmount(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({discount}%):</span>
                      <span>-{formatPkrAmount(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatPkrAmount(total)}</span>
                  </div>
                </div>

                <Button 
                  onClick={handleSale} 
                  className="w-full"
                  disabled={isSubmitting || createInvoice.isPending}
                >
                  {(isSubmitting || createInvoice.isPending) ? "Processing..." : "Complete Sale"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}