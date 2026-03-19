import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPkrAmount } from "@/utils/currency";

interface LabTest {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
}

interface ConfirmationData {
  patientName: string;
  patientId?: string;
  patientPhone?: string;
  doctorName: string;
  selectedTests: LabTest[];
  totalAmount: number;
  notes?: string;
  isNewPatient: boolean;
  discountApplied?: number;
  discountLabel?: string | null;
  discountedAmount?: number;
}

interface LabOrderConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confirmationData: ConfirmationData | null;
  onConfirm: () => void;
  isProcessing: boolean;
}

export function LabOrderConfirmationDialog({
  open,
  onOpenChange,
  confirmationData,
  onConfirm,
  isProcessing
}: LabOrderConfirmationDialogProps) {
  if (!confirmationData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Lab Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Patient Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Name:</span>
                  <span>{confirmationData.patientName}</span>
                </div>
                {confirmationData.patientId && (
                  <div className="flex justify-between">
                    <span className="font-medium">Patient ID:</span>
                    <span>{confirmationData.patientId}</span>
                  </div>
                )}
                {confirmationData.patientPhone && (
                  <div className="flex justify-between">
                    <span className="font-medium">Phone:</span>
                    <span>{confirmationData.patientPhone}</span>
                  </div>
                )}
                {confirmationData.isNewPatient && (
                  <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                    This is a new patient registration
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Doctor Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ordering Doctor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between">
                <span className="font-medium">Doctor:</span>
                <span>{confirmationData.doctorName}</span>
              </div>
            </CardContent>
          </Card>

          {/* Lab Tests */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lab Tests ({confirmationData.selectedTests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {confirmationData.selectedTests.map((test) => (
                  <div key={test.id} className="flex justify-between items-start p-2 border rounded">
                    <div className="flex-1">
                      <div className="font-medium">{test.name}</div>
                      {test.description && (
                        <div className="text-sm text-gray-600">{test.description}</div>
                      )}
                      {test.category && (
                        <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded mt-1 inline-block">
                          {test.category}
                        </div>
                      )}
                    </div>
                    <div className="font-semibold text-green-600">
                      {formatPkrAmount(test.price)}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total Amount:</span>
                  <span className="text-green-600">{formatPkrAmount(confirmationData.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {confirmationData.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{confirmationData.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
              Back to Edit
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                `Confirm & Create Order (${formatPkrAmount(confirmationData.totalAmount)})`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}