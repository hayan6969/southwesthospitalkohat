import { useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableMedicineSelect } from "@/components/SearchableMedicineSelect";
import { Separator } from "@/components/ui/separator";
import { useSearchableMedicines } from "@/hooks/useDatabase";
import { formatPkrAmount } from "@/utils/currency";
import { toast } from "sonner";
import { RotateCcw, Plus, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ReturnItem = {
  medicineId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
};

export default function PharmacyReturns() {
  const [returnCart, setReturnCart] = useState<ReturnItem[]>([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: medicines, isLoading } = useSearchableMedicines(searchTerm);

  const addToReturnCart = () => {
    if (!selectedMedicineId || !quantity || quantity <= 0) {
      toast.error("Please select a medicine and valid quantity");
      return;
    }

    const medicine = medicines?.find(m => m.id === selectedMedicineId);
    if (!medicine) {
      toast.error("Medicine not found");
      return;
    }

    // Check if medicine already exists in cart
    const existingItemIndex = returnCart.findIndex(item => item.medicineId === selectedMedicineId);
    
    if (existingItemIndex > -1) {
      // Update existing item
      const updatedCart = [...returnCart];
      updatedCart[existingItemIndex].quantity += Number(quantity);
      updatedCart[existingItemIndex].totalPrice = updatedCart[existingItemIndex].quantity * medicine.selling_price;
      setReturnCart(updatedCart);
    } else {
      const newItem: ReturnItem = {
        medicineId: selectedMedicineId,
        name: medicine.name,
        unitPrice: medicine.selling_price,
        quantity: Number(quantity),
        totalPrice: Number(quantity) * medicine.selling_price,
      };
      setReturnCart([...returnCart, newItem]);
    }

    setSelectedMedicineId("");
    setQuantity("");
    toast.success(`${medicine.name} added to return cart`);
  };

  const removeFromCart = (medicineId: string) => {
    setReturnCart(returnCart.filter(item => item.medicineId !== medicineId));
    toast.success("Item removed from return cart");
  };

  const updateQuantity = (medicineId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(medicineId);
      return;
    }

    setReturnCart(returnCart.map(item => {
      if (item.medicineId === medicineId) {
        return {
          ...item,
          quantity: newQuantity,
          totalPrice: newQuantity * item.unitPrice
        };
      }
      return item;
    }));
  };

  const totalReturnAmount = returnCart.reduce((sum, item) => sum + item.totalPrice, 0);

  const confirmReturn = async () => {
    if (returnCart.length === 0) {
      toast.error("No items in return cart");
      return;
    }

    setIsProcessing(true);

    try {
      // Generate a unique invoice number for the return
      const returnInvoiceNumber = `RTN-${Date.now()}`;

      // Create a return invoice (negative amounts to represent returns)
      const { data: returnInvoice, error: invoiceError } = await supabase
        .from('pharmacy_invoices')
        .insert({
          invoice_number: returnInvoiceNumber,
          customer_name: 'RETURN',
          customer_phone: null,
          total_amount: -totalReturnAmount, // Negative for return
          discount_amount: 0,
          final_amount: -totalReturnAmount, // Negative for return
          status: 'completed'
        })
        .select()
        .single();

      if (invoiceError) {
        throw new Error(`Failed to create return invoice: ${invoiceError.message}`);
      }

      // Create return invoice items (negative quantities to represent returns)
      for (const item of returnCart) {
        const { error: itemError } = await supabase
          .from('pharmacy_invoice_items')
          .insert({
            invoice_id: returnInvoice.id,
            medicine_id: item.medicineId,
            quantity: -item.quantity, // Negative for return
            unit_price: item.unitPrice,
            total_price: -item.totalPrice // Negative for return
          });

        if (itemError) {
          throw new Error(`Failed to create return item for ${item.name}: ${itemError.message}`);
        }
      }

      // Update medicine stock for each returned item
      for (const item of returnCart) {
        // First get the current stock
        const { data: currentMedicine, error: fetchError } = await supabase
          .from('medicines')
          .select('stock_quantity')
          .eq('id', item.medicineId)
          .single();

        if (fetchError) {
          throw new Error(`Failed to fetch current stock for ${item.name}: ${fetchError.message}`);
        }

        // Update with new stock quantity
        const { error: stockError } = await supabase
          .from('medicines')
          .update({
            stock_quantity: currentMedicine.stock_quantity + item.quantity
          })
          .eq('id', item.medicineId);

        if (stockError) {
          throw new Error(`Failed to update stock for ${item.name}: ${stockError.message}`);
        }
      }

      toast.success(`Return processed successfully! Return invoice ${returnInvoiceNumber} created.`);
      setReturnCart([]);
    } catch (error) {
      console.error("Error processing return:", error);
      toast.error(error instanceof Error ? error.message : "Failed to process return");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <RotateCcw className="w-8 h-8 text-orange-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medicine Returns</h1>
            <p className="text-gray-600">Process medicine returns and update inventory</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add to Return Cart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Medicine to Return Cart
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
                  allowOutOfStock={true}
                  onSearchChange={setSearchTerm}
                />
              </div>

              <div>
                <Label htmlFor="quantity">Quantity to Return</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value === "" ? "" : parseInt(e.target.value))}
                  placeholder="Enter quantity"
                />
              </div>

              <Button 
                onClick={addToReturnCart} 
                className="w-full"
                disabled={!selectedMedicineId || !quantity || Number(quantity) <= 0}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add to Return Cart
              </Button>
            </CardContent>
          </Card>

          {/* Return Cart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                Return Cart ({returnCart.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {returnCart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No items in return cart</p>
              ) : (
                <div className="space-y-4">
                  {returnCart.map((item) => (
                    <div key={item.medicineId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          {formatPkrAmount(item.unitPrice)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.medicineId, parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                        <span className="font-medium min-w-[80px] text-right">
                          {formatPkrAmount(item.totalPrice)}
                        </span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeFromCart(item.medicineId)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Separator />

                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Return Amount:</span>
                    <span className="text-orange-600">{formatPkrAmount(totalReturnAmount)}</span>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        className="w-full mt-4 bg-orange-600 hover:bg-orange-700"
                        disabled={returnCart.length === 0 || isProcessing}
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        {isProcessing ? "Processing..." : "Confirm Return"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Medicine Return</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to process this return? This will:
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Increase stock for returned medicines</li>
                            <li>Record an expense of {formatPkrAmount(totalReturnAmount)}</li>
                            <li>This action cannot be undone</li>
                          </ul>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmReturn} className="bg-orange-600 hover:bg-orange-700">
                          Confirm Return
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}