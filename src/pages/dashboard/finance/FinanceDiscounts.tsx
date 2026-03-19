import { useState } from "react";
import { PreviousBillDiscountDialog } from "@/components/dialogs/PreviousBillDiscountDialog";
import { Button } from "@/components/ui/button";
import { ReceiptText } from "lucide-react";

export default function FinanceDiscounts() {
  const [prevBillDialogOpen, setPrevBillDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Discounts & Adjustments</h2>
          <p className="text-muted-foreground text-sm">Apply discounts on previously paid bills</p>
        </div>
        <Button onClick={() => setPrevBillDialogOpen(true)} className="gap-2">
          <ReceiptText className="w-4 h-4" />
          Discount on Previous Bill
        </Button>
      </div>

      <PreviousBillDiscountDialog open={prevBillDialogOpen} onOpenChange={setPrevBillDialogOpen} />
    </div>
  );
}
