import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, Save, FileText, Printer, Plus, Trash2, Lock, Clock, Heart, Activity, Droplets } from "lucide-react";
import { generateAnesthesiaNotesPDF } from "@/utils/anesthesiaNotesPdfGenerator";
import { cn } from "@/lib/utils";

interface IntraOpRow {
  id: string;
  time: string;
  hr: string;
  spo2: string;
  bp: string;
}

interface AnesthesiaNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otSchedule: {
    id: string;
    patient_id: string;
    doctor_id: string;
    operation_date: string;
    patient: {
      patient_number: string;
      date_of_birth?: string;
      gender?: string;
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
  admissionId?: string | null;
  onSave?: () => void;
}

const POST_OP_OPTIONS = [
  "Monitor Vitals",
  "Intake/Output Record",
  "Keep NPO for 6 hours",
  "Pain Management",
  "Oxygen Support",
  "Antibiotics Continue",
] as const;

const RECOVERY_STATUSES = [
  "Stable",
  "Critical",
  "Shifted to ICU",
  "Shifted to Ward",
  "Under Observation",
] as const;

const ANESTHESIA_TYPES = [
  "Spinal",
  "General Anesthesia",
  "Local",
  "Sedation",
] as const;

export function AnesthesiaNotesDialog({ open, onOpenChange, otSchedule, admissionId, onSave }: AnesthesiaNotesDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notesId, setNotesId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("draft");

  // Patient info
  const [patientName, setPatientName] = useState("");
  const [mrNumber, setMrNumber] = useState("");
  const [admissionNo, setAdmissionNo] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [consultantDoctor, setConsultantDoctor] = useState("");
  const [admissionPatientId, setAdmissionPatientId] = useState<string | null>(null);

  // Form fields
  const [surgicalProcedure, setSurgicalProcedure] = useState("");
  const [briefHistory, setBriefHistory] = useState("");
  const [preopHr, setPreopHr] = useState("");
  const [preopBp, setPreopBp] = useState("");
  const [preopSpo2, setPreopSpo2] = useState("");
  const [preopMedication, setPreopMedication] = useState("");
  const [anesthesiaType, setAnesthesiaType] = useState("");
  const [anesthesiaDrugs, setAnesthesiaDrugs] = useState("");
  const [intraopRows, setIntraopRows] = useState<IntraOpRow[]>([]);
  const [inputOutputNotes, setInputOutputNotes] = useState("");
  const [recoveryStatus, setRecoveryStatus] = useState("");
  const [postopOrders, setPostopOrders] = useState<string[]>([]);
  const [postopNotes, setPostopNotes] = useState("");

  const isDoctorOrAnesthetist = profile?.role === "admin" || profile?.role === "doctor" || profile?.role === "anesthetist";
  const isNurse = profile?.role === "nursing";
  const isReadOnly = !isDoctorOrAnesthetist || status === "finalized" || false;

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const addIntraOpRow = () => {
    const now = new Date();
    const timeStr = format(now, "HH:mm");
    setIntraopRows(prev => [...prev, { id: generateId(), time: timeStr, hr: "", spo2: "", bp: "" }]);
  };

  const removeIntraOpRow = (id: string) => {
    setIntraopRows(prev => prev.filter(r => r.id !== id));
  };

  const updateIntraOpRow = (id: string, field: keyof IntraOpRow, value: string) => {
    setIntraopRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const togglePostOpOrder = (order: string) => {
    setPostopOrders(prev =>
      prev.includes(order) ? prev.filter(o => o !== order) : [...prev, order]
    );
  };

  const fetchExistingNotes = useCallback(async () => {
    if (!otSchedule && !admissionId) return;
    setLoading(true);
    try {
      let query = supabase.from("anesthesia_notes").select("*");
      if (otSchedule) query = query.eq("ot_booking_id", otSchedule.id);
      else if (admissionId) query = query.eq("admission_id", admissionId).order("created_at", { ascending: false }).limit(1);
      const { data: rows, error } = await query;
      const data = Array.isArray(rows) ? rows[0] : rows;

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setNotesId(data.id);
        setStatus(data.status || "draft");
        setSurgicalProcedure(data.surgical_procedure || "");
        setBriefHistory(data.brief_history || "");
        setPreopHr(data.preop_hr?.toString() || "");
        setPreopBp(data.preop_bp || "");
        setPreopSpo2(data.preop_spo2?.toString() || "");
        setPreopMedication(data.preop_medication || "");
        setAnesthesiaType(data.anesthesia_type || "");
        setAnesthesiaDrugs(data.anesthesia_drugs || "");
        setIntraopRows((data.intraop_assessment as any) || []);
        setInputOutputNotes(data.input_output_notes || "");
        setRecoveryStatus(data.recovery_status || "");
        const orders = data.postop_orders as any;
        if (orders?.items) setPostopOrders(orders.items);
        if (orders?.notes) setPostopNotes(orders.notes);
      }

      // Auto-fill patient info from otSchedule when available
      if (otSchedule) {
        const fullName = `${otSchedule.patient.profile.first_name} ${otSchedule.patient.profile.last_name}`;
        setPatientName(fullName);
        setMrNumber(otSchedule.patient.patient_number);
        setConsultantDoctor(otSchedule.doctor_name);
        setSurgicalProcedure(prev => prev || otSchedule.operation.operation_name);
        setGender(prev => prev || otSchedule.patient.gender || "");

        if (otSchedule.patient.date_of_birth) {
          const dob = new Date(otSchedule.patient.date_of_birth);
          const today = new Date();
          let calcAge = today.getFullYear() - dob.getFullYear();
          const m = today.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) calcAge--;
          setAge(prev => prev || calcAge.toString());
        }
      }

      // Fetch admission info if admissionId (and auto-fill patient when no otSchedule)
      if (admissionId) {
        const { data: adm } = await supabase
          .from("ipd_admissions")
          .select("admission_number, patient_id, doctor_id")
          .eq("id", admissionId)
          .maybeSingle();
        if (adm) {
          setAdmissionNo(adm.admission_number);
          if (adm.patient_id) setAdmissionPatientId(adm.patient_id);
          if (!otSchedule && adm.patient_id) {
            const { data: pt } = await supabase
              .from("patients")
              .select("patient_number, date_of_birth, gender, profile:profiles!patients_id_fkey(first_name, last_name)")
              .eq("id", adm.patient_id)
              .maybeSingle();
            if (pt) {
              const prof: any = (pt as any).profile;
              if (prof) setPatientName(`${prof.first_name ?? ""} ${prof.last_name ?? ""}`.trim());
              setMrNumber((pt as any).patient_number || "");
              setGender(prev => prev || (pt as any).gender || "");
              if ((pt as any).date_of_birth) {
                const dob = new Date((pt as any).date_of_birth);
                const today = new Date();
                let calcAge = today.getFullYear() - dob.getFullYear();
                const m = today.getMonth() - dob.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) calcAge--;
                setAge(prev => prev || calcAge.toString());
              }
            }
          }
          if (!otSchedule && adm.doctor_id) {
            const { data: doc } = await supabase
              .from("profiles")
              .select("first_name, last_name")
              .eq("id", adm.doctor_id)
              .maybeSingle();
            if (doc) setConsultantDoctor(`Dr. ${doc.first_name ?? ""} ${doc.last_name ?? ""}`.trim());
          }
        }
      }

    } catch (e: any) {
      console.error("Failed to load anesthesia notes:", e);
      if (e?.code === "PGRST301" || e?.message?.includes("does not exist")) {
        toast({ title: "Database table missing", description: "The anesthesia_notes table needs to be created. Run the migration SQL on Lovable.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [otSchedule, admissionId]);

  useEffect(() => {
    if (open && (otSchedule || admissionId)) fetchExistingNotes();
    else if (!open) {
      setNotesId(null);
      setStatus("draft");
      setSurgicalProcedure("");
      setBriefHistory("");
      setPreopHr("");
      setPreopBp("");
      setPreopSpo2("");
      setPreopMedication("");
      setAnesthesiaType("");
      setAnesthesiaDrugs("");
      setIntraopRows([]);
      setInputOutputNotes("");
      setRecoveryStatus("");
      setPostopOrders([]);
      setPostopNotes("");
    }
  }, [open, otSchedule, fetchExistingNotes]);

  const collectData = () => ({
    patient_id: otSchedule?.patient_id,
    admission_id: admissionId || null,
    ot_booking_id: otSchedule?.id,
    surgical_procedure: surgicalProcedure,
    brief_history: briefHistory,
    preop_hr: preopHr ? Number(preopHr) : null,
    preop_bp: preopBp,
    preop_spo2: preopSpo2 ? Number(preopSpo2) : null,
    preop_medication: preopMedication,
    anesthesia_type: anesthesiaType,
    anesthesia_drugs: anesthesiaDrugs,
    intraop_assessment: intraopRows,
    input_output_notes: inputOutputNotes,
    recovery_status: recoveryStatus,
    postop_orders: { items: postopOrders, notes: postopNotes },
    created_by: profile?.id,
  });

  const handleSave = async (finalize: boolean = false) => {
    if (!otSchedule || !isDoctorOrAnesthetist) return;
    setSaving(true);
    try {
      const payload: any = { ...collectData(), status: finalize ? "finalized" : "draft" };
      let error;

      if (notesId) {
        const res = await supabase.from("anesthesia_notes").update(payload).eq("id", notesId);
        error = res.error;
      } else {
        const res = await supabase.from("anesthesia_notes").insert(payload).select("id").single();
        error = res.error;
        if (res.data) setNotesId(res.data.id);
      }

      if (error) throw error;
      setStatus(finalize ? "finalized" : "draft");
      toast({
        title: finalize ? "Anesthesia Notes Finalized" : "Anesthesia Notes Saved",
        description: finalize ? "Notes have been finalized and locked." : "Draft saved successfully.",
      });
      if (onSave) onSave();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (!otSchedule) return;
    generateAnesthesiaNotesPDF({
      patientName,
      mrNumber,
      admissionNumber: admissionNo,
      age,
      gender,
      date: format(new Date(), "MMM d, yyyy"),
      consultantDoctor,
      surgicalProcedure,
      briefHistory,
      preopHr,
      preopBp,
      preopSpo2,
      preopMedication,
      anesthesiaType,
      anesthesiaDrugs,
      intraopRows,
      inputOutputNotes,
      recoveryStatus,
      postopOrders,
      postopNotes,
      hospitalName: "Hospital",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto z-[9999]">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Activity className="w-6 h-6 text-cyan-600" />
              Anesthesia Notes
            </DialogTitle>
            <div className="flex items-center gap-2">
              {status === "finalized" && (
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  <Lock className="w-3 h-3 mr-1" /> Finalized
                </Badge>
              )}
              {status === "draft" && notesId && (
                <Badge variant="outline" className="text-amber-600 border-amber-200">
                  Draft
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : !isDoctorOrAnesthetist && !isNurse ? (
          <div className="text-center py-12 text-muted-foreground">You do not have access to anesthesia notes.</div>
        ) : (
          <div className="space-y-6">
            {/* Patient Info Header */}
            <Card className="border-l-4 border-l-cyan-500 bg-gradient-to-r from-cyan-50/30">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Patient:</span> <span className="font-semibold">{patientName}</span></div>
                  <div><span className="text-muted-foreground">MR #:</span> <span className="font-mono">{mrNumber}</span></div>
                  <div><span className="text-muted-foreground">Admission:</span> <span className="font-mono">{admissionNo || "\u2014"}</span></div>
                  <div><span className="text-muted-foreground">Date:</span> {format(new Date(), "MMM d, yyyy")}</div>
                  <div><span className="text-muted-foreground">Age:</span> {age || "\u2014"}</div>
                  <div><span className="text-muted-foreground">Gender:</span> {gender || "\u2014"}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Consultant:</span> {consultantDoctor}</div>
                </div>
              </CardContent>
            </Card>

            {/* 1. Surgical Procedure */}
            <Card>
              <CardContent className="pt-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-600" />1. Surgical Procedure
                </Label>
                <Textarea
                  value={surgicalProcedure}
                  onChange={e => setSurgicalProcedure(e.target.value)}
                  placeholder="Describe the surgical procedure..."
                  className="mt-2"
                  readOnly={isReadOnly}
                />
              </CardContent>
            </Card>

            {/* 2. Brief History */}
            <Card>
              <CardContent className="pt-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Heart className="w-4 h-4 text-cyan-600" />2. Brief Medical & Surgical History
                </Label>
                <Textarea
                  value={briefHistory}
                  onChange={e => setBriefHistory(e.target.value)}
                  placeholder="Previous surgeries, medical conditions, allergies, risk factors..."
                  className="mt-2"
                  readOnly={isReadOnly}
                />
              </CardContent>
            </Card>

            {/* 3. Pre-Op Vitals */}
            <Card>
              <CardContent className="pt-4">
                <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-cyan-600" />3. Pre-Op Vitals
                </Label>
                <div className="grid grid-cols-3 gap-4 max-w-lg">
                  <div>
                    <Label>HR (bpm)</Label>
                    <Input type="number" value={preopHr} onChange={e => setPreopHr(e.target.value)} placeholder="e.g. 80" readOnly={isReadOnly} />
                  </div>
                  <div>
                    <Label>BP (mmHg)</Label>
                    <Input value={preopBp} onChange={e => setPreopBp(e.target.value)} placeholder="e.g. 120/80" readOnly={isReadOnly} />
                  </div>
                  <div>
                    <Label>SPO2 (%)</Label>
                    <Input type="number" value={preopSpo2} onChange={e => setPreopSpo2(e.target.value)} placeholder="e.g. 99" readOnly={isReadOnly} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 4. Pre-Op Medication */}
            <Card>
              <CardContent className="pt-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-cyan-600" />4. Pre-Op Medication
                </Label>
                <Textarea
                  value={preopMedication}
                  onChange={e => setPreopMedication(e.target.value)}
                  placeholder="Medicines given before surgery..."
                  className="mt-2"
                  readOnly={isReadOnly}
                />
              </CardContent>
            </Card>

            {/* 5. Mode of Anesthesia */}
            <Card>
              <CardContent className="pt-4">
                <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-cyan-600" />5. Mode of Anesthesia
                </Label>
                <Select value={anesthesiaType} onValueChange={setAnesthesiaType} disabled={isReadOnly}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select anesthesia type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ANESTHESIA_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* 6. Drugs Used */}
            <Card>
              <CardContent className="pt-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-cyan-600" />6. Drugs Used in Induction of Anesthesia
                </Label>
                <Textarea
                  value={anesthesiaDrugs}
                  onChange={e => setAnesthesiaDrugs(e.target.value)}
                  placeholder="List drugs and dosages used..."
                  className="mt-2"
                  readOnly={isReadOnly}
                />
              </CardContent>
            </Card>

            {/* 7. Intra-Op Assessment Table */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-600" />7. Intra-Op Assessment
                  </Label>
                  {!isReadOnly && (
                    <Button size="sm" variant="outline" onClick={addIntraOpRow}>
                      <Plus className="w-4 h-4 mr-1" /> Add Row
                    </Button>
                  )}
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-cyan-50/50">
                        <TableHead className="w-28">Time</TableHead>
                        <TableHead>HR</TableHead>
                        <TableHead>SPO2</TableHead>
                        <TableHead>BP</TableHead>
                        {!isReadOnly && <TableHead className="w-16"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {intraopRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                            No intra-op assessments recorded. Click "Add Row" to begin.
                          </TableCell>
                        </TableRow>
                      ) : intraopRows.map(row => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <Input
                              type="time"
                              value={row.time}
                              onChange={e => updateIntraOpRow(row.id, "time", e.target.value)}
                              className="h-8 text-xs"
                              readOnly={isReadOnly}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={row.hr}
                              onChange={e => updateIntraOpRow(row.id, "hr", e.target.value)}
                              placeholder="HR"
                              className="h-8"
                              readOnly={isReadOnly}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={row.spo2}
                              onChange={e => updateIntraOpRow(row.id, "spo2", e.target.value)}
                              placeholder="SPO2"
                              className="h-8"
                              readOnly={isReadOnly}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={row.bp}
                              onChange={e => updateIntraOpRow(row.id, "bp", e.target.value)}
                              placeholder="BP"
                              className="h-8"
                              readOnly={isReadOnly}
                            />
                          </TableCell>
                          {!isReadOnly && (
                            <TableCell>
                              <Button size="icon" variant="ghost" onClick={() => removeIntraOpRow(row.id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* 8. Input/Output */}
            <Card>
              <CardContent className="pt-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-cyan-600" />8. Input / Output During Surgery
                </Label>
                <Textarea
                  value={inputOutputNotes}
                  onChange={e => setInputOutputNotes(e.target.value)}
                  placeholder="Document input and output during surgery..."
                  className="mt-2"
                  readOnly={isReadOnly}
                />
              </CardContent>
            </Card>

            {/* 9. Recovery Status */}
            <Card>
              <CardContent className="pt-4">
                <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                  <Heart className="w-4 h-4 text-cyan-600" />9. Recovery Status
                </Label>
                <Select value={recoveryStatus} onValueChange={setRecoveryStatus} disabled={isReadOnly}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select recovery status" />
                  </SelectTrigger>
                  <SelectContent>
                    {RECOVERY_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* 10. Post-Op Orders */}
            <Card>
              <CardContent className="pt-4">
                <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-cyan-600" />10. Post-Op Orders
                </Label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {POST_OP_OPTIONS.map(option => (
                    <label key={option} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={postopOrders.includes(option)}
                        onCheckedChange={() => togglePostOpOrder(option)}
                        disabled={isReadOnly}
                      />
                      {option}
                    </label>
                  ))}
                </div>
                <Textarea
                  value={postopNotes}
                  onChange={e => setPostopNotes(e.target.value)}
                  placeholder="Additional post-op notes..."
                  readOnly={isReadOnly}
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {isDoctorOrAnesthetist && (
              <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-background pb-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2">
                  <Printer className="w-4 h-4" /> Print
                </Button>
                {status !== "finalized" && (
                  <>
                    <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving} className="flex items-center gap-2">
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      <Save className="w-4 h-4" /> Save Draft
                    </Button>
                    <Button onClick={() => handleSave(true)} disabled={saving} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700">
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      <FileText className="w-4 h-4" /> Finalize
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
