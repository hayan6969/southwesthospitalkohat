import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pill, Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";

interface PrescriptionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: any;
}

export function PrescriptionDetailDialog({ 
  open, 
  onOpenChange, 
  prescription 
}: PrescriptionDetailDialogProps) {
  if (!prescription) return null;

  const doctorName = prescription.doctor_profile?.first_name && prescription.doctor_profile?.last_name
    ? `Dr. ${prescription.doctor_profile.first_name} ${prescription.doctor_profile.last_name}`
    : 'Unknown Doctor';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5" />
            Prescription Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Prescribed by</p>
                <p className="text-sm text-muted-foreground">{doctorName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Date</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(prescription.created_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
            {prescription.appointment_id && (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Appointment</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {prescription.appointment_id.slice(0, 8)}...
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Prescription Content */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Prescription</h3>
            <div className="p-4 border rounded-lg bg-white">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {prescription.prescription_text}
              </pre>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}