import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ClipboardCheck, User, Calendar, Plus, Printer, Edit, Trash2 } from "lucide-react";
import jsPDF from "jspdf";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AddAssessmentEntryDialog } from "./AddAssessmentEntryDialog";
import { formatDateTimeForDisplay, formatTimeForDisplay } from "@/utils/timezone";

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

  const canAddEntry = profile?.role === 'admin' || profile?.role === 'nursing';

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
    if (!otSchedule) return;

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text('Assessment Chart', 20, 20);
    
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
    doc.text('Assessment Entries', 20, yPosition);
    yPosition += 15;
    
    // Table headers with background and borders
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPosition - 5, 185, 10, 'F');
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    
    // Header text
    doc.text('Date', 20, yPosition);
    doc.text('Time', 50, yPosition);
    doc.text('Assessment', 80, yPosition);
    doc.text('Plan', 130, yPosition);
    doc.text('User', 170, yPosition);
    
    // Draw header borders
    doc.setDrawColor(180, 180, 180);
    doc.line(15, yPosition - 5, 200, yPosition - 5);
    doc.line(15, yPosition + 5, 200, yPosition + 5);
    doc.line(15, yPosition - 5, 15, yPosition + 5);
    doc.line(45, yPosition - 5, 45, yPosition + 5);
    doc.line(75, yPosition - 5, 75, yPosition + 5);
    doc.line(125, yPosition - 5, 125, yPosition + 5);
    doc.line(165, yPosition - 5, 165, yPosition + 5);
    doc.line(200, yPosition - 5, 200, yPosition + 5);
    
    yPosition += 15;
    
    // Reset font for content
    doc.setFont(undefined, 'normal');
    
    // Table rows
    entries.forEach((entry) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      const entryDate = format(new Date(entry.entry_date), 'MMM d, yyyy');
      const entryTime = formatTimeForDisplay(new Date(`${entry.entry_date}T${entry.entry_time}`));
      const assessment = entry.assessment || '-';
      const plan = entry.plan || '-';
      const user = entry.user_email;
      
      doc.text(entryDate, 20, yPosition);
      doc.text(entryTime, 50, yPosition);
      
      // Handle long text with line breaks
      const assessmentLines = doc.splitTextToSize(assessment, 40);
      const planLines = doc.splitTextToSize(plan, 30);
      const userLines = doc.splitTextToSize(user, 25);
      
      const maxLines = Math.max(assessmentLines.length, planLines.length, userLines.length);
      
      assessmentLines.forEach((line: string, index: number) => {
        doc.text(line, 80, yPosition + (index * 5));
      });
      
      planLines.forEach((line: string, index: number) => {
        doc.text(line, 130, yPosition + (index * 5));
      });
      
      userLines.forEach((line: string, index: number) => {
        doc.text(line, 170, yPosition + (index * 5));
      });
      
      yPosition += (maxLines * 5) + 5;
    });
    
    // Open PDF in new tab
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
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
                          <TableCell>{formatTimeForDisplay(new Date(`${entry.entry_date}T${entry.entry_time}`))}</TableCell>
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