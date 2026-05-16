import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Loader2, FileText, ClipboardCheck, Activity, Heart, Stethoscope, TrendingUp, ChevronRight, User, Calendar, Hash, Clock, Pen } from "lucide-react";
import { TreatmentChartDialog } from "@/components/ipd/TreatmentChartDialog";
import { AnesthesiaNotesDialog } from "@/components/dialogs/AnesthesiaNotesDialog";
import { OTNotesDialog } from "@/components/dialogs/OTNotesDialog";
import { PostOperativeProgressDialog } from "@/components/dialogs/PostOperativeProgressDialog";
import { AssessmentDialog } from "@/components/dialogs/AssessmentDialog";
import { HandwritingPad } from "@/components/ipd/HandwritingPad";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  admission: any;
  patientName: string;
}

export function ClinicalRecordSheetDialog({ open, onOpenChange, admission, patientName }: Props) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [anesthetist, setAnesthetist] = useState<any>(null);
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [otBooking, setOtBooking] = useState<any>(null);

  // Sub-dialog states
  const [showTreatmentChart, setShowTreatmentChart] = useState(false);
  const [showAnesthesia, setShowAnesthesia] = useState(false);
  const [showOTNotes, setShowOTNotes] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);

  // Handwriting state
  const [handwrittenNote, setHandwrittenNote] = useState("");

  useEffect(() => {
    if (!open || !admission) return;
    const stored = localStorage.getItem(`handwritten_${admission.id}`);
    if (stored) setHandwrittenNote(stored);
  }, [open, admission]);

  const handleHandwritingChange = (dataUrl: string) => {
    setHandwrittenNote(dataUrl);
    if (admission?.id) {
      if (dataUrl) localStorage.setItem(`handwritten_${admission.id}`, dataUrl);
      else localStorage.removeItem(`handwritten_${admission.id}`);
    }
  };

  useEffect(() => {
    if (!open || !admission) return;
    (async () => {
      setLoading(true);
      const [patRes, docRes, anesRes, otRes] = await Promise.all([
        supabase.from("patients").select("*, profiles(first_name, last_name, date_of_birth, phone)").eq("id", admission.patient_id).maybeSingle(),
        admission.doctor_id ? supabase.from("profiles").select("first_name, last_name").eq("id", admission.doctor_id).maybeSingle() : Promise.resolve({ data: null }),
        admission.anesthesiologist_id ? supabase.from("profiles").select("first_name, last_name").eq("id", admission.anesthesiologist_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("ot_schedules").select("*, operation:ot_operations(operation_name)").eq("patient_id", admission.patient_id).order("operation_date", { ascending: false }).limit(1).maybeSingle(),
      ]);

      let assessmentCount = 0;
      if (otRes.data?.id) {
        const assessRes = await supabase.from("assessment_entries").select("id", { count: "exact", head: true }).eq("ot_schedule_id", otRes.data.id);
        assessmentCount = assessRes.count || 0;
      }

      setPatient(patRes.data);
      setDoctor(docRes.data);
      setAnesthetist(anesRes.data);
      setOtBooking(otRes.data);
      setAssessmentCount(assessmentCount);
      setLoading(false);
    })();
  }, [open, admission]);

  const patientProfile = patient?.profiles as any;
  const dob = patientProfile?.date_of_birth || patient?.date_of_birth;
  const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000) : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] z-[9999]">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="w-6 h-6 text-blue-600" />
              Clinical Record Sheet
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <>
              {/* Patient Info Header */}
              <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/30 mb-4">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4 text-sm">
                    <div className="flex items-center gap-2 col-span-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold">{patientName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-gray-400" />
                      <span className="font-mono text-xs">{admission.admission_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {admission.admission_date ? format(new Date(admission.admission_date), "MMM d, yyyy") : "\u2014"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-gray-400" />
                      Age: {age || "\u2014"} | {patientProfile?.phone || "\u2014"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-gray-400" />
                      Dr. {doctor?.first_name} {doctor?.last_name || "\u2014"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-gray-400" />
                      Ward: {admission.wards?.name || "\u2014"} / Bed {admission.beds?.bed_number || "\u2014"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={admission.status === "discharged" ? "secondary" : "default"}>
                        {admission.status}
                      </Badge>
                      {otBooking && (
                        <Badge variant="outline" className="text-xs">
                          {otBooking.operation?.operation_name || "OT Booked"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="assessment" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
                  <TabsTrigger value="assessment" className="text-xs">Assessment</TabsTrigger>
                  <TabsTrigger value="treatment" className="text-xs">Treatment Chart</TabsTrigger>
                  <TabsTrigger value="vitals" className="text-xs">Vitals</TabsTrigger>
                  <TabsTrigger value="anesthesia" className="text-xs">Anesthesia</TabsTrigger>
                  <TabsTrigger value="otnotes" className="text-xs">OT Notes</TabsTrigger>
                  <TabsTrigger value="recovery" className="text-xs">Recovery</TabsTrigger>
                  <TabsTrigger value="handwritten" className="text-xs">Handwritten</TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[55vh] mt-4">
                  {/* Assessment Tab */}
                  <TabsContent value="assessment" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2">
                        <ClipboardCheck className="w-4 h-4 text-blue-600" />
                        Doctor Assessment Notes
                      </h3>
                      <Button size="sm" variant="outline" onClick={() => setShowAssessment(true)}>
                        <ChevronRight className="w-4 h-4 mr-1" /> View All ({assessmentCount})
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Medical assessments, progress notes, and clinical observations recorded by the doctor.
                    </p>
                    <div className="border rounded-lg p-6 text-center text-muted-foreground">
                      <ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">{assessmentCount > 0 ? `${assessmentCount} assessment entries recorded` : "No assessment entries yet"}</p>
                    </div>
                  </TabsContent>

                  {/* Treatment Chart Tab */}
                  <TabsContent value="treatment" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        Treatment Chart
                      </h3>
                      <Button size="sm" variant="outline" onClick={() => setShowTreatmentChart(true)}>
                        <ChevronRight className="w-4 h-4 mr-1" /> Open Treatment Chart
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Daily treatment orders, medications, and clinical instructions.
                    </p>
                    <div className="border rounded-lg p-6 text-center text-muted-foreground">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Click "Open Treatment Chart" to view or edit</p>
                    </div>
                  </TabsContent>

                  {/* Vitals Tab */}
                  <TabsContent value="vitals" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-600" />
                        Patient Vitals
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Vitals monitoring, intake/output, and IV fluid records.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="bg-blue-50/30">
                        <CardContent className="p-4 text-center">
                          <Heart className="w-6 h-6 mx-auto mb-1 text-red-500" />
                          <p className="text-xs text-muted-foreground">Vital Signs</p>
                          <p className="text-sm font-medium">Temperature, Pulse, BP, RR, SPO2</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-green-50/30">
                        <CardContent className="p-4 text-center">
                          <Activity className="w-6 h-6 mx-auto mb-1 text-green-500" />
                          <p className="text-xs text-muted-foreground">IV Fluids</p>
                          <p className="text-sm font-medium">Type, Volume, Rate</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-purple-50/30">
                        <CardContent className="p-4 text-center">
                          <TrendingUp className="w-6 h-6 mx-auto mb-1 text-purple-500" />
                          <p className="text-xs text-muted-foreground">Intake/Output</p>
                          <p className="text-sm font-medium">Fluid balance monitoring</p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Anesthesia Tab */}
                  <TabsContent value="anesthesia" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Activity className="w-4 h-4 text-cyan-600" />
                        Anesthesia Notes
                      </h3>
                      <Button size="sm" variant="outline" onClick={() => setShowAnesthesia(true)}>
                        <ChevronRight className="w-4 h-4 mr-1" /> Open Anesthesia Notes
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pre-op assessment, anesthesia type, intra-op monitoring, and post-op orders.
                    </p>
                    <div className="border rounded-lg p-6 text-center text-muted-foreground">
                      <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Click "Open Anesthesia Notes" to view or record</p>
                    </div>
                  </TabsContent>

                  {/* OT Notes Tab */}
                  <TabsContent value="otnotes" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        OT Notes
                      </h3>
                      {otBooking && (
                        <Button size="sm" variant="outline" onClick={() => setShowOTNotes(true)}>
                          <ChevronRight className="w-4 h-4 mr-1" /> Open OT Notes
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Surgical procedure notes, intra-operative findings, and post-op instructions.
                    </p>
                    {otBooking ? (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Surgery</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>{otBooking.operation?.operation_name}</TableCell>
                              <TableCell>{otBooking.operation_date ? format(new Date(otBooking.operation_date), "MMM d, yyyy") : "\u2014"}</TableCell>
                              <TableCell><Badge>{otBooking.status}</Badge></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="border rounded-lg p-6 text-center text-muted-foreground">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No OT booking found for this admission</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Recovery Tab */}
                  <TabsContent value="recovery" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        Recovery / Post-Operative Progress
                      </h3>
                      {otBooking && (
                        <Button size="sm" variant="outline" onClick={() => setShowProgress(true)}>
                          <ChevronRight className="w-4 h-4 mr-1" /> Open Recovery Notes
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Post-operative recovery tracking, progress notes, and discharge planning.
                    </p>
                    <div className="border rounded-lg p-6 text-center text-muted-foreground">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Post-operative progress notes and recovery status</p>
                    </div>
                  </TabsContent>

                  {/* Handwritten Notes Tab */}
                  <TabsContent value="handwritten" className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Pen className="w-5 h-5 text-purple-600" />
                      <h3 className="font-semibold">Handwritten Clinical Notes</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Write freehand clinical notes using your mouse, stylus, or touch screen. These notes are saved locally on this device.
                    </p>
                    <HandwritingPad
                      value={handwrittenNote}
                      onChange={handleHandwritingChange}
                      height={500}
                      label="Freehand Notes"
                    />
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Sub-dialogs */}
      <TreatmentChartDialog
        open={showTreatmentChart}
        onOpenChange={setShowTreatmentChart}
        admissionId={admission?.id}
        patientName={patientName}
        admissionNumber={admission?.admission_number}
      />
      <AnesthesiaNotesDialog
        open={showAnesthesia}
        onOpenChange={setShowAnesthesia}
        otSchedule={otBooking}
        admissionId={admission?.id}
      />
      {otBooking && (
        <>
          <OTNotesDialog
            open={showOTNotes}
            onOpenChange={setShowOTNotes}
            otSchedule={otBooking}
          />
          <PostOperativeProgressDialog
            open={showProgress}
            onOpenChange={setShowProgress}
            otSchedule={otBooking}
          />
          <AssessmentDialog
            open={showAssessment}
            onOpenChange={setShowAssessment}
            otSchedule={otBooking}
          />
        </>
      )}
    </>
  );
}
