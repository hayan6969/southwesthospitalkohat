import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { FileText, User, Calendar, Plus, Printer, Pencil, Trash2 } from "lucide-react";
import jsPDF from "jspdf";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddTreatmentEntryDialog } from "./AddTreatmentEntryDialog";
import { formatDateTimeForDisplay } from "@/utils/timezone";

interface TreatmentEntry {
  id: string;
  entry_date: string;
  medicine?: string;
  investigation?: string;
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
  const [editingEntry, setEditingEntry] = useState<TreatmentEntry | null>(null);

  const canEdit = ['staff', 'nursing', 'ota', 'doctor', 'admin'].includes(profile?.role as string);

  const handleDelete = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      const { error } = await supabase
        .from('treatment_chart_entries')
        .delete()
        .eq('id', entryId);
      if (error) throw error;
      toast({ title: "Deleted", description: "Treatment entry deleted successfully" });
      fetchTreatmentEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({ title: "Error", description: "Failed to delete entry", variant: "destructive" });
    }
  };

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
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });

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

  const handlePrint = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text('Treatment Chart', 20, 20);
    
    // Patient Info
    doc.setFontSize(12);
    doc.text(`Patient: ${otSchedule.patient.profile.first_name} ${otSchedule.patient.profile.last_name}`, 20, 40);
    doc.text(`Patient ID: ${otSchedule.patient.patient_number}`, 20, 50);
    doc.text(`Operation: ${otSchedule.operation.operation_name}`, 20, 60);
    doc.text(`Date: ${format(new Date(otSchedule.operation_date), 'PPP')}`, 20, 70);
    doc.text(`Surgeon: ${otSchedule.doctor_name}`, 20, 80);
    
    // Table Header
    let yPosition = 100;
    doc.setFontSize(14);
    doc.text('Treatment Entries', 20, yPosition);
    yPosition += 15;
    
    // Table headers with background and borders
    doc.setFillColor(240, 240, 240); // Light gray background
    doc.rect(15, yPosition - 5, 185, 10, 'F'); // Background rectangle
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0); // Black text
    
    // Header text
    doc.text('Date & Time', 20, yPosition);
    doc.text('Medicine', 60, yPosition);
    doc.text('Investigation', 110, yPosition);
    doc.text('User', 160, yPosition);
    
    // Draw header borders
    doc.setDrawColor(180, 180, 180);
    doc.line(15, yPosition - 5, 200, yPosition - 5); // Top border
    doc.line(15, yPosition + 5, 200, yPosition + 5); // Bottom border
    doc.line(15, yPosition - 5, 15, yPosition + 5); // Left border
    doc.line(55, yPosition - 5, 55, yPosition + 5); // Column separator 1
    doc.line(105, yPosition - 5, 105, yPosition + 5); // Column separator 2
    doc.line(155, yPosition - 5, 155, yPosition + 5); // Column separator 3
    doc.line(200, yPosition - 5, 200, yPosition + 5); // Right border
    
    yPosition += 15;
    
    // Reset font for content
    doc.setFont(undefined, 'normal');
    
    // Table rows
    treatmentEntries.forEach((entry) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      const entryDateTime = formatDateTimeForDisplay(entry.created_at);
      const medicine = entry.medicine || '-';
      const investigation = entry.investigation || '-';
      const user = entry.user_email;
      
      const dateTimeLines = doc.splitTextToSize(entryDateTime, 35);
      const medicineLines = doc.splitTextToSize(medicine, 45);
      const investigationLines = doc.splitTextToSize(investigation, 45);
      const userLines = doc.splitTextToSize(user, 40);
      
      const maxLines = Math.max(dateTimeLines.length, medicineLines.length, investigationLines.length, userLines.length);
      
      dateTimeLines.forEach((line: string, index: number) => {
        doc.text(line, 20, yPosition + (index * 5));
      });
      
      medicineLines.forEach((line: string, index: number) => {
        doc.text(line, 60, yPosition + (index * 5));
      });
      
      investigationLines.forEach((line: string, index: number) => {
        doc.text(line, 110, yPosition + (index * 5));
      });
      
      userLines.forEach((line: string, index: number) => {
        doc.text(line, 160, yPosition + (index * 5));
      });
      
      yPosition += (maxLines * 5) + 5;
    });
    
    // Open PDF in new tab
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
  };

  if (!otSchedule) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[1200px] max-h-[85vh] w-[95vw]">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                Treatment Chart
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handlePrint}
                  variant="outline"
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
                {canEdit && (
                  <Button 
                    onClick={() => { setEditingEntry(null); setShowAddDialog(true); }}
                    className="flex items-center gap-2"
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </Button>
                )}
              </div>
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
                <div className="border rounded-lg overflow-hidden w-full max-h-[400px] overflow-y-auto">
                  <Table className="w-full table-fixed">
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-40">Date & Time</TableHead>
                        <TableHead className="w-60">Medicine</TableHead>
                        <TableHead className="w-60">Investigation</TableHead>
                         <TableHead className="w-40">User</TableHead>
                         {canEdit && <TableHead className="w-24">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {treatmentEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="w-40 align-top">
                            <div className="font-medium text-sm">
                              {formatDateTimeForDisplay(entry.created_at)}
                            </div>
                          </TableCell>
                          <TableCell className="w-60 align-top">
                            <div className="text-sm break-words whitespace-normal leading-relaxed overflow-hidden">
                              {entry.medicine || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="w-60 align-top">
                            <div className="text-sm break-words whitespace-normal leading-relaxed overflow-hidden">
                              {entry.investigation || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="w-40 align-top">
                            <div className="text-sm text-gray-600 break-words whitespace-normal overflow-hidden">
                              {entry.user_email}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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