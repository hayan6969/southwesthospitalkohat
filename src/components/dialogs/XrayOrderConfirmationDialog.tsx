import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, User, Stethoscope, FileText, DollarSign } from "lucide-react";
import { formatPkrAmount } from "@/utils/currency";

interface XrayTest {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
}

interface ConfirmationData {
  patient: {
    name: string;
    phone: string;
  };
  doctorName: string;
  selectedTests: XrayTest[];
  totalAmount: number;
  notes: string;
  xrayDate: string;
  discountApplied?: number;
  discountLabel?: string | null;
  discountedAmount?: number;
}

interface XrayOrderConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confirmationData: ConfirmationData;
  onConfirm: () => void;
  isProcessing: boolean;
}

export function XrayOrderConfirmationDialog({ 
  open, 
  onOpenChange, 
  confirmationData, 
  onConfirm, 
  isProcessing 
}: XrayOrderConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Confirm X-ray Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Information */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Patient Information
            </h3>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{confirmationData.patient.name}</span>
            </div>
            <div className="text-sm text-muted-foreground ml-6">
              Phone: {confirmationData.patient.phone}
            </div>
          </div>

          <Separator />

          {/* Doctor Information */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Doctor Information
            </h3>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{confirmationData.doctorName}</span>
            </div>
          </div>

          <Separator />

          {/* X-ray Date */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              X-ray Date
            </h3>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{confirmationData.xrayDate}</span>
            </div>
          </div>

          <Separator />

          {/* Selected Tests */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Selected X-ray Tests ({confirmationData.selectedTests.length})
            </h3>
            <div className="space-y-2">
              {confirmationData.selectedTests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{test.name}</div>
                    {test.description && (
                      <div className="text-sm text-muted-foreground">{test.description}</div>
                    )}
                    {test.category && (
                      <Badge variant="secondary" className="text-xs">
                        {test.category}
                      </Badge>
                    )}
                  </div>
                  <div className="font-semibold">
                    {formatPkrAmount(test.price)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Total Amount */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Total Amount
            </h3>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-lg font-bold text-primary">
                {formatPkrAmount(confirmationData.totalAmount)}
              </span>
            </div>
          </div>

          {/* Notes */}
          {confirmationData.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Additional Notes
                </h3>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm">{confirmationData.notes}</p>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Back to Edit
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isProcessing}
              className="min-w-[140px]"
            >
              {isProcessing ? "Processing..." : "Confirm & Create Order"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}