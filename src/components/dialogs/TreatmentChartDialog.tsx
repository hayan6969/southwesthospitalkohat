import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { FileText, User, Calendar, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddTreatmentEntryDialog } from "./AddTreatmentEntryDialog";

interface TreatmentEntry {
  id: string;
  entry_date: string;
  medicine: string;
  investigation: string;
  user_email: string;
  created_at: string;
}

interface TreatmentChartDialogProps {
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

export function TreatmentChartDialog({ 
  open, 
  onOpenChange, 
  otSchedule 
}: TreatmentChartDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [treatmentEntries, setTreatmentEntries] = useState<TreatmentEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    if (open && otSchedule) {
      fetchTreatmentEntries();
    }
  }, [open, otSchedule]);

  const fetchTreatmentEntries = async () => {
    if (!otSchedule) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('treatment_chart_entries')
        .select('*')
        .eq('ot_schedule_id', otSchedule.id)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      setTreatmentEntries(data || []);
    } catch (error) {
      console.error('Error fetching treatment entries:', error);
      toast({
        title: "Error",
        description: "Failed to load treatment chart entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!otSchedule) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[1200px] max-h-[85vh] overflow-y-auto w-[95vw]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                Treatment Chart
              </DialogTitle>
              <Button 
                onClick={() => setShowAddDialog(true)}
                className="flex items-center gap-2"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>
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

            {/* Treatment Chart Table */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Treatment Entries</h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading treatment entries...</p>
                </div>
              ) : treatmentEntries.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[150px]">Date</TableHead>
                          <TableHead className="w-[300px]">Medicine</TableHead>
                          <TableHead className="w-[300px]">Investigation</TableHead>
                          <TableHead className="w-[200px]">User</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {treatmentEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="w-[150px]">
                              <div className="font-medium whitespace-nowrap">
                                {format(new Date(entry.entry_date), 'MMM d, yyyy')}
                              </div>
                            </TableCell>
                            <TableCell className="w-[300px]">
                              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                                {entry.medicine || '-'}
                              </div>
                            </TableCell>
                            <TableCell className="w-[300px]">
                              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                                {entry.investigation || '-'}
                              </div>
                            </TableCell>
                            <TableCell className="w-[200px]">
                              <div className="text-sm text-gray-600 break-words">
                                {entry.user_email}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No Treatment Entries</h3>
                  <p>Click the "Add" button to create the first treatment entry.</p>
                </div>
              )}
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

      {/* Add Treatment Entry Dialog */}
      <AddTreatmentEntryDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        otScheduleId={otSchedule?.id || ""}
        onSave={fetchTreatmentEntries}
      />
    </>
  );
}