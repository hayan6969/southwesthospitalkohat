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
  const [wardId, setWardId] = useState<string>(admission?.ward_id ?? "");
  const [bedId, setBedId] = useState<string>(admission?.bed_id ?? "");
  const [doctorId, setDoctorId] = useState<string>(admission?.doctor_id ?? "");
  const [chiefComplaint, setChiefComplaint] = useState(admission?.chief_complaint ?? "");
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState(admission?.provisional_diagnosis ?? "");
  const [notes, setNotes] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setWardId(admission?.ward_id ?? "");
    setBedId(admission?.bed_id ?? "");
    setDoctorId(admission?.doctor_id ?? "");
    setChiefComplaint(admission?.chief_complaint ?? "");
    setProvisionalDiagnosis(admission?.provisional_diagnosis ?? "");

    // Parse deposit prefix from notes (set by ReferToIPDDialog)
    const rawNotes = admission?.notes ?? "";
    const depositMatch = rawNotes.match(/^__DEPOSIT__:(\d+)\n?(.*)$/s);
    if (depositMatch) {
      setAdvanceAmount(Number(depositMatch[1]));
      setNotes(depositMatch[2].trim());
    } else {
      setAdvanceAmount(0);
      setNotes(rawNotes);
    }
    (async () => {
      const [{ data: w }, { data: profiles }, { data: docRecords }] = await Promise.all([
        supabase.from("wards").select("id,name").eq("is_active", true).order("name"),
        supabase.from("profiles")
          .select("id, first_name, last_name")
          .eq("role", "doctor")
          .eq("is_active", true)
          .order("first_name"),
        supabase.from("doctors").select("id, specialization"),
      ]);
      setWards(w ?? []);
      const docMap = new Map((docRecords ?? []).map((d: any) => [d.id, d.specialization]));
      setDoctors((profiles ?? []).map((p: any) => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        specialization: docMap.get(p.id) || "",
      })));
    })();
  }, [open, admission]);

  useEffect(() => {
    if (!wardId) { setBeds([]); return; }
    supabase.from("beds").select("id,bed_number,status,daily_charge").eq("ward_id", wardId).eq("is_active", true).order("bed_number")
      .then(({ data }) => setBeds(data ?? []));
  }, [wardId]);

  const admit = async () => {
    if (!wardId || !bedId) { toast.error("Pick a ward and bed"); return; }
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("ipd_admissions").update({
        ward_id: wardId,
        bed_id: bedId,
        doctor_id: doctorId || null,
        chief_complaint: chiefComplaint || null,
        provisional_diagnosis: provisionalDiagnosis || null,
        notes: notes || null,
        status: "admitted",
        admission_date: new Date().toISOString(),
      }).eq("id", admission.id);
      if (error) throw error;

      // Create open invoice
      const { data: invNum } = await supabase.rpc("generate_ipd_invoice_number");
      const { data: invoiceData, error: invErr } = await supabase.from("ipd_invoices").insert({
        invoice_number: invNum as string,
        admission_id: admission.id,
        patient_id: admission.patient_id,
        paid_amount: advanceAmount > 0 ? advanceAmount : 0,
      }).select("id").single();
      if (invErr) throw invErr;

      // Record deposit as a charge line item for tracking
      if (advanceAmount > 0) {
        const { error: chgErr } = await supabase.from("ipd_charges").insert({
          admission_id: admission.id,
          invoice_id: invoiceData.id,
          charge_type: "deposit",
          description: "Advance payment at admission",
          quantity: 1,
          unit_price: advanceAmount,
          amount: advanceAmount,
          created_by: profile?.id,
        });
        if (chgErr) throw chgErr;
      }

      toast.success(advanceAmount > 0
        ? `Patient admitted with Rs ${advanceAmount.toLocaleString()} advance`
        : "Patient admitted");
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
    onAdmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto z-[9999]">
        <DialogHeader><DialogTitle>Admit Patient — {admission?.admission_number}</DialogTitle></DialogHeader>
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
            <Label>Attending Doctor</Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
              <SelectContent className="z-[10000]">
                {doctors.map((d: any) => {
                  const n = `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "Doctor";
                  return <SelectItem key={d.id} value={d.id}>Dr. {n}{d.specialization ? ` — ${d.specialization}` : ""}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Chief Complaint</Label>
            <Input value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Provisional Diagnosis</Label>
            <Input value={provisionalDiagnosis} onChange={(e) => setProvisionalDiagnosis(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="sm:col-span-2 border-t pt-3 mt-2">
            <h4 className="font-semibold text-sm mb-2">Advance Payment</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Advance / Deposit Amount (PKR)</Label>
                <Input
                  type="number"
                  min={0}
                  value={advanceAmount || ""}
                  onChange={(e) => setAdvanceAmount(Number(e.target.value) || 0)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This amount will be deducted from the final bill
                </p>
              </div>
              <div className="flex items-end pb-2">
                <div className="bg-green-50 border border-green-200 rounded-md p-3 w-full">
                  <p className="text-xs text-green-700 font-medium">Advance Collected</p>
                  <p className="text-lg font-bold text-green-700">
                    Rs {(advanceAmount || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="destructive" onClick={cancel} disabled={busy}>Cancel Admission</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={admit} disabled={busy}>
            {busy ? "Admitting..." : `Confirm Admission${advanceAmount > 0 ? ` & Collect Rs ${advanceAmount.toLocaleString()}` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
