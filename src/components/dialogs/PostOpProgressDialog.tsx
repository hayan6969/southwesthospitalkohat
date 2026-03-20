import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { FileText, Plus, Printer, Pencil, Trash2 } from "lucide-react";
import jsPDF from "jspdf";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddPostOpProgressDialog } from "./AddPostOpProgressDialog";

interface PostOpProgressEntry {
  id: string;
  entry_date: string;
  blood_pressure?: string;
  pulses?: string;
  temperature?: string;
  input_data?: string;
  output_data?: string;
  remarks?: string;
  user_email: string;
}

interface PostOpProgressDialogProps {
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

export function PostOpProgressDialog({ 
  open, 
  onOpenChange, 
  otSchedule 
}: PostOpProgressDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [progressEntries, setProgressEntries] = useState<PostOpProgressEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    if (open && otSchedule) {
      fetchProgressEntries();
    }
  }, [open, otSchedule]);

  const fetchProgressEntries = async () => {
    if (!otSchedule) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('postop_progress_entries')
        .select('*')
        .eq('ot_schedule_id', otSchedule.id)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      setProgressEntries(data || []);
    } catch (error) {
      console.error('Error fetching progress entries:', error);
      toast({
        title: "Error",
        description: "Failed to load post-operative progress entries",
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
    doc.text('Post-Operative Progress Chart', 20, 20);
    
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
    doc.text('Progress Entries', 20, yPosition);
    yPosition += 15;
    
    // Table headers with background and borders
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPosition - 5, 185, 10, 'F');
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    
    // Header text
    doc.text('Date', 20, yPosition);
    doc.text('B.P', 50, yPosition);
    doc.text('Pulses', 75, yPosition);
    doc.text('Temp', 100, yPosition);
    doc.text('Input', 125, yPosition);
    doc.text('Output', 150, yPosition);
    doc.text('Remarks', 175, yPosition);
    
    // Draw header borders
    doc.setDrawColor(180, 180, 180);
    doc.line(15, yPosition - 5, 200, yPosition - 5);
    doc.line(15, yPosition + 5, 200, yPosition + 5);
    doc.line(15, yPosition - 5, 15, yPosition + 5);
    doc.line(45, yPosition - 5, 45, yPosition + 5);
    doc.line(70, yPosition - 5, 70, yPosition + 5);
    doc.line(95, yPosition - 5, 95, yPosition + 5);
    doc.line(120, yPosition - 5, 120, yPosition + 5);
    doc.line(145, yPosition - 5, 145, yPosition + 5);
    doc.line(170, yPosition - 5, 170, yPosition + 5);
    doc.line(200, yPosition - 5, 200, yPosition + 5);
    
    yPosition += 15;
    
    // Reset font for content
    doc.setFont(undefined, 'normal');
    
    // Table rows
    progressEntries.forEach((entry) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      const entryDate = format(new Date(entry.entry_date), 'MMM d, yyyy');
      const bloodPressure = entry.blood_pressure || '-';
      const pulses = entry.pulses || '-';
      const temperature = entry.temperature || '-';
      const input = entry.input_data || '-';
      const output = entry.output_data || '-';
      const remarks = entry.remarks || '-';
      
      doc.text(entryDate, 20, yPosition);
      doc.text(bloodPressure, 50, yPosition);
      doc.text(pulses, 75, yPosition);
      doc.text(temperature, 100, yPosition);
      doc.text(input, 125, yPosition);
      doc.text(output, 150, yPosition);
      
      // Handle long text for remarks
      const remarksLines = doc.splitTextToSize(remarks, 25);
      remarksLines.forEach((line: string, index: number) => {
        doc.text(line, 175, yPosition + (index * 5));
      });
      
      yPosition += Math.max(remarksLines.length * 5, 10);
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
                <FileText className="w-5 h-5 text-blue-600" />
                Post-Operative Progress Chart
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
                {((profile?.role as string) === 'nursing' || profile?.role === 'staff') && (
                  <Button 
                    onClick={() => setShowAddDialog(true)}
                    className="flex items-center gap-2"
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Entry
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Patient and Operation Info */}
            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
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

            {/* Progress Chart Table */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Progress Entries</h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading progress entries...</p>
                </div>
              ) : progressEntries.length > 0 ? (
                <div className="border rounded-lg overflow-hidden w-full max-h-[400px] overflow-y-auto">
                  <Table className="w-full table-fixed">
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-24">Date</TableHead>
                        <TableHead className="w-20">B.P</TableHead>
                        <TableHead className="w-20">Pulses</TableHead>
                        <TableHead className="w-24">Temperature</TableHead>
                        <TableHead className="w-24">Input</TableHead>
                        <TableHead className="w-24">Output</TableHead>
                        <TableHead className="w-32">Remarks</TableHead>
                        <TableHead className="w-32">User</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {progressEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="w-24 align-top">
                            <div className="font-medium text-sm">
                              {format(new Date(entry.entry_date), 'MMM d, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell className="w-20 align-top">
                            <div className="text-sm break-words whitespace-normal leading-relaxed overflow-hidden">
                              {entry.blood_pressure || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="w-20 align-top">
                            <div className="text-sm break-words whitespace-normal leading-relaxed overflow-hidden">
                              {entry.pulses || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="w-24 align-top">
                            <div className="text-sm break-words whitespace-normal leading-relaxed overflow-hidden">
                              {entry.temperature || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="w-24 align-top">
                            <div className="text-sm break-words whitespace-normal leading-relaxed overflow-hidden">
                              {entry.input_data || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="w-24 align-top">
                            <div className="text-sm break-words whitespace-normal leading-relaxed overflow-hidden">
                              {entry.output_data || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="w-32 align-top">
                            <div className="text-sm break-words whitespace-normal leading-relaxed overflow-hidden">
                              {entry.remarks || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="w-32 align-top">
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
                  <h3 className="text-lg font-medium mb-2">No Progress Entries</h3>
                  <p>Click the "Add Entry" button to create the first progress entry.</p>
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

      {/* Add Progress Entry Dialog */}
      <AddPostOpProgressDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        otScheduleId={otSchedule?.id || ""}
        onSave={fetchProgressEntries}
      />
    </>
  );
}