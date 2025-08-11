import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ClipboardCheck, User, Calendar, Plus, Printer, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AddAssessmentEntryDialog } from "./AddAssessmentEntryDialog";

interface AssessmentEntry {
  id: string;
  entry_date: string;
  entry_time: string;
  assessment: string;
  plan: string;
  user_email: string;
  created_at: string;
}

interface AssessmentDialogProps {
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

export function AssessmentDialog({ 
  open, 
  onOpenChange, 
  otSchedule 
}: AssessmentDialogProps) {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<AssessmentEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const canAddEntry = profile?.role === 'staff' || profile?.role === 'admin' || profile?.role === 'nursing' || profile?.role === 'ota';

  useEffect(() => {
    if (open && otSchedule) {
      fetchEntries();
    }
  }, [open, otSchedule]);

  const fetchEntries = async () => {
    if (!otSchedule) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assessment_entries')
        .select('*')
        .eq('ot_schedule_id', otSchedule.id)
        .order('entry_date', { ascending: false })
        .order('entry_time', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching assessment entries:', error);
      toast({
        title: "Error",
        description: "Failed to load assessment entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !otSchedule) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Assessment Chart - ${otSchedule.patient.profile.first_name} ${otSchedule.patient.profile.last_name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .patient-info { margin-bottom: 20px; background: #f5f5f5; padding: 15px; border-radius: 5px; }
            .patient-info div { margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .assessment-cell { max-width: 200px; word-wrap: break-word; }
            .plan-cell { max-width: 200px; word-wrap: break-word; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Assessment Chart</h1>
          </div>
          <div class="patient-info">
            <div><strong>Patient:</strong> ${otSchedule.patient.profile.first_name} ${otSchedule.patient.profile.last_name}</div>
            <div><strong>Patient ID:</strong> ${otSchedule.patient.patient_number}</div>
            <div><strong>Operation:</strong> ${otSchedule.operation.operation_name}</div>
            <div><strong>Operation Date:</strong> ${format(new Date(otSchedule.operation_date), 'PPP')}</div>
            <div><strong>Surgeon:</strong> ${otSchedule.doctor_name}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Assessment</th>
                <th>Plan</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              ${entries.map(entry => `
                <tr>
                  <td>${format(new Date(entry.entry_date), 'MMM dd, yyyy')}</td>
                  <td>${entry.entry_time}</td>
                  <td class="assessment-cell">${entry.assessment || '-'}</td>
                  <td class="plan-cell">${entry.plan || '-'}</td>
                  <td>${entry.user_email}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
            Generated on ${format(new Date(), 'PPP p')}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              }
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handleAddEntry = () => {
    setAddDialogOpen(true);
  };

  const handleEntryAdded = () => {
    fetchEntries();
    setAddDialogOpen(false);
    toast({
      title: "Success",
      description: "Assessment entry added successfully",
    });
  };

  if (!otSchedule) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[1000px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-orange-600" />
              Assessment Chart
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Patient and Operation Info */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Patient:</span>
                  <div className="text-foreground">
                    {otSchedule.patient.profile.first_name} {otSchedule.patient.profile.last_name}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    ID: {otSchedule.patient.patient_number}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Operation:</span>
                  <div className="text-foreground">{otSchedule.operation.operation_name}</div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Date:</span>
                  <div className="text-foreground">
                    {format(new Date(otSchedule.operation_date), 'PPP')}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Surgeon:</span>
                  <div className="text-foreground">{otSchedule.doctor_name}</div>
                </div>
              </div>
            </div>

            {/* Assessment Entries Table */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Assessment Entries</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    className="flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </Button>
                  {canAddEntry && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleAddEntry}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Entry
                    </Button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="text-muted-foreground">Loading entries...</div>
                </div>
              ) : entries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No assessment entries recorded yet.</p>
                  {canAddEntry && (
                    <p className="text-sm mt-2">Click "Add Entry" to create the first entry.</p>
                  )}
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Assessment</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>User</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {format(new Date(entry.entry_date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>{entry.entry_time}</TableCell>
                          <TableCell className="max-w-[200px]">
                            <div className="truncate" title={entry.assessment}>
                              {entry.assessment || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <div className="truncate" title={entry.plan}>
                              {entry.plan || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {entry.user_email}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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

      <AddAssessmentEntryDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        otScheduleId={otSchedule?.id || ''}
        onEntryAdded={handleEntryAdded}
      />
    </>
  );
}