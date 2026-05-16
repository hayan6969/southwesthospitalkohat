import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  admission: any;
  onAdmitted?: (admission: any) => void;
}

export function AdmitPatientDialog({ open, onOpenChange, admission, onAdmitted }: Props) {
  const { profile } = useAuth();
  const [wards, setWards] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [hospitalSettings, setHospitalSettings] = useState<any>(null);
  const [patientInfo, setPatientInfo] = useState<any>(null);
  const [wardId, setWardId] = useState<string>(admission?.ward_id ?? "");
  const [bedId, setBedId] = useState<string>(admission?.bed_id ?? "");
  const [doctorId, setDoctorId] = useState<string>(admission?.doctor_id ?? "");
  const [anesthesiologistId, setAnesthesiologistId] = useState<string>(admission?.anesthesiologist_id ?? "");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [dob, setDob] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setWardId(admission?.ward_id ?? "");
    setBedId(admission?.bed_id ?? "");
    setDoctorId(admission?.doctor_id ?? "");
    setAnesthesiologistId(admission?.anesthesiologist_id ?? "");
    setChiefComplaint("");
    setProvisionalDiagnosis("");
    setNotes("");

    (async () => {
      const [{ data: hs }, { data: w }, { data: profiles }, { data: docRecords }, { data: patProf }, { data: pat }] = await Promise.all([
        supabase.from("hospital_settings").select("hospital_name,logo_url").maybeSingle(),
        supabase.from("wards").select("id,name").eq("is_active", true).order("name"),
        supabase.from("profiles")
          .select("id, first_name, last_name")
          .eq("role", "doctor")
          .eq("is_active", true)
          .order("first_name"),
        supabase.from("doctors").select("id, specialization"),
        supabase.from("profiles").select("first_name,last_name,phone").eq("id", admission?.patient_id).maybeSingle(),
        supabase.from("patients").select("patient_number,cnic,date_of_birth,blood_type,city,province,address,emergency_contact_name,emergency_contact_phone").eq("id", admission?.patient_id).maybeSingle(),
      ]);
      setHospitalSettings(hs);
      setWards(w ?? []);
      const docMap = new Map((docRecords ?? []).map((d: any) => [d.id, d.specialization]));
      setDoctors((profiles ?? []).map((p: any) => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        specialization: docMap.get(p.id) || "",
      })));
      setPatientInfo({ profile: patProf, patient: pat });
      // Pre-fill patient demographic fields if already entered
      if (pat?.date_of_birth) setDob(pat.date_of_birth);
      if (pat?.city) setCity(pat.city);
      if (pat?.province) setProvince(pat.province);
      if (pat?.address) setAddress(pat.address);
    })();
  }, [open, admission]);

  useEffect(() => {
    if (!wardId) { setBeds([]); return; }
    supabase.from("beds").select("id,bed_number,status,daily_charge").eq("ward_id", wardId).eq("is_active", true).order("bed_number")
      .then(({ data }) => setBeds(data ?? []));
  }, [wardId]);

  const admit = async () => {
    if (!wardId || !bedId) { toast.error("Pick a ward and bed"); return; }
    if (!doctorId) { toast.error("Select a surgeon"); return; }
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("ipd_admissions").update({
        ward_id: wardId,
        bed_id: bedId,
        doctor_id: doctorId || null,
        anesthesiologist_id: anesthesiologistId || null,
        chief_complaint: chiefComplaint || null,
        provisional_diagnosis: provisionalDiagnosis || null,
        notes: notes || null,
        status: "admitted",
        admission_date: new Date().toISOString(),
      }).eq("id", admission.id);
      if (error) throw error;

      // Update patient demographics if provided
      const patientUpdate: any = {};
      if (dob) patientUpdate.date_of_birth = dob;
      if (city) patientUpdate.city = city;
      if (province) patientUpdate.province = province;
      if (address) patientUpdate.address = address;
      if (Object.keys(patientUpdate).length > 0) {
        await supabase.from("patients").update(patientUpdate).eq("id", admission.patient_id);
      }

      // Create or use existing invoice (from referral payment)
      const { data: existingInvoice } = await supabase
        .from("ipd_invoices")
        .select("id")
        .eq("admission_id", admission.id)
        .maybeSingle();

      if (!existingInvoice) {
        const { data: invNum } = await supabase.rpc("generate_ipd_invoice_number");
        const { error: invErr } = await supabase.from("ipd_invoices").insert({
          invoice_number: invNum as string,
          admission_id: admission.id,
          patient_id: admission.patient_id,
        }).select("id").single();
        if (invErr) throw invErr;
      }

      toast.success("Patient admitted");
      onOpenChange(false);
      onAdmitted?.(admission);
    } catch (e: any) {
      toast.error(e.message || "Failed to admit");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!confirm("Cancel this pending admission?")) return;
    const { error } = await supabase.from("ipd_admissions").update({ status: "cancelled" }).eq("id", admission.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Admission cancelled");
    onOpenChange(false);
    onAdmitted?.(admission);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto z-[9999]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            {hospitalSettings?.logo_url && (
              <img src={hospitalSettings.logo_url} alt="Logo" className="w-10 h-10 object-contain rounded" />
            )}
            <div>
              <DialogTitle>Admit Patient — {admission?.admission_number}</DialogTitle>
              {hospitalSettings?.hospital_name && (
                <p className="text-xs text-muted-foreground">{hospitalSettings.hospital_name}</p>
              )}
            </div>
          </div>
        </DialogHeader>
        {patientInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-2 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Patient Name</span>
                <p className="font-semibold">{patientInfo.profile?.first_name} {patientInfo.profile?.last_name}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Patient #</span>
                <p className="font-medium">{patientInfo.patient?.patient_number || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Phone</span>
                <p className="font-medium">{patientInfo.profile?.phone || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">CNIC</span>
                <p className="font-medium">{patientInfo.patient?.cnic || "—"}</p>
              </div>
            </div>
            {(admission?.chief_complaint || admission?.provisional_diagnosis) && (
              <div className="border-t border-blue-200 pt-1.5 text-xs text-muted-foreground">
                <span className="font-medium">Referral info:</span>{admission?.chief_complaint ? ` ${admission.chief_complaint}` : ""}{admission?.provisional_diagnosis ? ` | ${admission.provisional_diagnosis}` : ""}
              </div>
            )}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Ward</Label>
            <Select value={wardId} onValueChange={setWardId}>
              <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
              <SelectContent className="z-[10000]">
                {wards.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Bed</Label>
            <Select value={bedId} onValueChange={setBedId} disabled={!wardId}>
              <SelectTrigger><SelectValue placeholder="Select bed" /></SelectTrigger>
              <SelectContent className="z-[10000]">
                {beds.filter(b => b.status === "available" || b.id === admission?.bed_id).map((b) => (
                  <SelectItem key={b.id} value={b.id}>Bed {b.bed_number} — Rs {Number(b.daily_charge).toLocaleString()}/day</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Surgeon <span className="text-red-500">*</span></Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger><SelectValue placeholder="Select surgeon" /></SelectTrigger>
              <SelectContent className="z-[10000]">
                {doctors.map((d: any) => {
                  const n = `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "Doctor";
                  return <SelectItem key={d.id} value={d.id}>Dr. {n}{d.specialization ? ` — ${d.specialization}` : ""}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Anesthesiologist</Label>
            <Select value={anesthesiologistId} onValueChange={setAnesthesiologistId}>
              <SelectTrigger><SelectValue placeholder="Select anesthesiologist (optional)" /></SelectTrigger>
              <SelectContent className="z-[10000]">
                {doctors.map((d: any) => {
                  const n = `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "Doctor";
                  return <SelectItem key={d.id} value={d.id}>Dr. {n}{d.specialization ? ` — ${d.specialization}` : ""}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 border-t pt-3 mt-2">
            <h4 className="font-semibold text-sm mb-2">Patient Demographics</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label>Date of Birth</Label>
                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>
              <div>
                <Label>City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Enter city" />
              </div>
              <div>
                <Label>Province</Label>
                <Input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="Enter province" />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter address" />
              </div>
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label>Chief Complaint</Label>
            <Input value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} placeholder="e.g. Severe abdominal pain" />
          </div>
          <div className="sm:col-span-2">
            <Label>Provisional Diagnosis</Label>
            <Input value={provisionalDiagnosis} onChange={(e) => setProvisionalDiagnosis(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="destructive" onClick={cancel} disabled={busy}>Cancel Admission</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={admit} disabled={busy}>
            {busy ? "Admitting..." : "Confirm Admission"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
