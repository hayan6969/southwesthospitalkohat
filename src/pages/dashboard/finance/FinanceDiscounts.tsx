import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format, formatDistanceToNow } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatPkrAmount } from "@/utils/currency";
import { toast } from "sonner";
import { Plus, Percent, Trash2, Search, Tag, Clock, CheckCircle2, ReceiptText } from "lucide-react";
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

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
          <ReceiptText className="w-12 h-12 text-muted-foreground" />
          <div className="text-center space-y-1">
            <h3 className="text-lg font-semibold">Discount on Previous Bill</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Apply a retroactive discount on an already-paid invoice. The patient will receive a cash refund from the billing counter.
            </p>
          </div>
          <Button size="lg" onClick={() => setPrevBillDialogOpen(true)}>
            <ReceiptText className="w-4 h-4 mr-2" />
            Apply Discount on Previous Bill
          </Button>
        </CardContent>
      </Card>

      <PreviousBillDiscountDialog open={prevBillDialogOpen} onOpenChange={setPrevBillDialogOpen} />
    </div>
  );
}
