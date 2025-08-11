import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { TrendingUp, User, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface PostOperativeProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otSchedule: {
    id: string;
    patient_id: string;
    doctor_id: string;
    operation_date: string;
    patient: {
      patient_number: string;
      profile: {
        first_name: string;
        last_name: string;
      };
    };
    operation: {
      operation_name: string;
    };
    doctor_name: string;
    status: string;
  } | null;
}

export function PostOperativeProgressDialog({ 
  open, 
  onOpenChange, 
  otSchedule 
}: PostOperativeProgressDialogProps) {
  const { profile } = useAuth();

  if (!otSchedule) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Post Operative Patient Progress Report (POPPR)
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Patient and Operation Info */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Patient:</span>
                <div className="text-gray-900">
                  {otSchedule.patient.profile.first_name} {otSchedule.patient.profile.last_name}
                </div>
                <div className="text-gray-600 text-xs">
                  ID: {otSchedule.patient.patient_number}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Operation:</span>
                <div className="text-gray-900">{otSchedule.operation.operation_name}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Date:</span>
                <div className="text-gray-900">
                  {format(new Date(otSchedule.operation_date), 'PPP')}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Surgeon:</span>
                <div className="text-gray-900">{otSchedule.doctor_name}</div>
              </div>
            </div>
          </div>

          {/* POPPR Content */}
          <div className="space-y-4">
            <div className="text-center py-12 text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">Post Operative Progress Report</h3>
              <p>Patient progress tracking functionality will be implemented here.</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}