import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Banknote } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  admission: any;
  currentDeposit: number;
  onCollected: () => void;
}

export function CollectAdvanceDialog({ open, onOpenChange, admission, currentDeposit, onCollected }: Props) {
  const { profile } = useAuth();
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const collect = async () => {
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    if (saving) return;
    setSaving(true);
    try {
      const { data: invoice } = await supabase
        .from("ipd_invoices")
        .select("id, paid_amount")
        .eq("admission_id", admission.id)
        .maybeSingle();
      if (!invoice) { toast.error("No invoice found for this admission"); return; }

      const newPaid = (Number(invoice.paid_amount) || 0) + amount;

      const { error: invErr } = await supabase
        .from("ipd_invoices")
        .update({ paid_amount: newPaid })
        .eq("id", invoice.id);
      if (invErr) throw invErr;

      const { error: chgErr } = await supabase.from("ipd_charges").insert({
        admission_id: admission.id,
        invoice_id: invoice.id,
        charge_type: "deposit",
        description: notes ? `Advance payment — ${notes}` : "Advance payment during stay",
        quantity: 1,
        unit_price: amount,
        amount: amount,
        created_by: profile?.id,
      });
      if (chgErr) throw chgErr;

      toast.success(`Rs ${amount.toLocaleString()} advance collected`);
      setAmount(0);
      setNotes("");
      onCollected();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to collect advance");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md z-[9999]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5" />
            Collect Advance Payment
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted rounded-md p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span>Patient:</span>
              <span className="font-medium">{admission?.admission_number}</span>
            </div>
            <div className="flex justify-between">
              <span>Current Deposit:</span>
              <span className="font-bold text-green-600">Rs {(currentDeposit || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>New Total After Deposit:</span>
              <span className="font-bold">Rs {((currentDeposit || 0) + amount).toLocaleString()}</span>
            </div>
          </div>

          <div>
            <Label>Advance Amount (PKR)</Label>
            <Input
              type="number"
              min={1}
              value={amount || ""}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
              placeholder="Enter amount"
              autoFocus
            />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. partial payment by family"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={collect} disabled={saving || !amount || amount <= 0}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Collect Rs {(amount || 0).toLocaleString()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
