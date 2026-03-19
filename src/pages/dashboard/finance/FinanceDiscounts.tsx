import { useState } from "react";
import { PreviousBillDiscountDialog } from "@/components/dialogs/PreviousBillDiscountDialog";

export default function FinanceDiscounts() {
  const [prevBillDialogOpen, setPrevBillDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Discounts & Adjustments</h2>
          <p className="text-muted-foreground text-sm">Apply discounts on previously paid bills</p>
        </div>
      </div>

      <PreviousBillDiscountDialog open={prevBillDialogOpen} onOpenChange={setPrevBillDialogOpen} />
    </div>
  );
}
