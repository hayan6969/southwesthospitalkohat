
import { useState, useMemo, useEffect } from "react";
import { useCreatePatientWithProfile } from "@/hooks/useDatabase";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Users } from "lucide-react";
import { ALL_PROVINCES, getCitiesForProvince } from "@/utils/pakistanCities";

type GuardianInfo = {
  guardian_id: string;
  first_name: string;
  last_name: string;
  patient_number: string;
  phone: string;
  family_member_count: number;
};

const RELATIONS = ["Spouse", "Son", "Daughter", "Father", "Mother", "Brother", "Sister", "Other"];

const GUARDIAN_RELATIONS = ["Son of", "Daughter of", "Wife of", "Mother of", "Father of", "Husband of"];

export function PatientDialog() {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [age, setAge] = useState("");
  const [guardianRelation, setGuardianRelation] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [relation, setRelation] = useState("");
  const [guardian, setGuardian] = useState<GuardianInfo | null>(null);
  const [checkingPhone, setCheckingPhone] = useState(false);

  const createPatientWithProfile = useCreatePatientWithProfile();
  const { logAction } = useAuditLogger();


  const availableCities = useMemo(() => {
    const cities = getCitiesForProvince(province);
    if (!citySearch.trim()) return cities;
    return cities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));
  }, [province, citySearch]);

  // Debounced phone lookup — if the phone belongs to an existing patient, switch to family-member mode
  useEffect(() => {
    const trimmed = phone.trim();
    if (trimmed.length < 7) {
      setGuardian(null);
      return;
    }
    let cancelled = false;
    setCheckingPhone(true);
    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc("lookup_guardian_by_phone", { p_phone: trimmed });
        if (cancelled) return;
        if (error) {
          console.warn("guardian lookup failed", error);
          setGuardian(null);
        } else {
          setGuardian((data as GuardianInfo | null) ?? null);
        }
      } finally {
        if (!cancelled) setCheckingPhone(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [phone]);

  const isFamilyMode = !!guardian;

  const handleProvinceChange = (value: string) => {
    setProvince(value);
    setCity("");
    setCitySearch("");
  };

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setPhone("");
    setCnic("");
    setAge("");
    setGuardianRelation("");
    setGuardianName("");
    setProvince("");
    setCity("");
    setCitySearch("");
    setRelation("");
    setGuardian(null);
  };

  const extraPatientFields = () => ({
    age: age.trim() ? Number(age) : null,
    guardian_relation: guardianRelation || null,
    guardian_name: guardianName.trim() || null,
  });

  const saveExtraFields = async (patientId?: string) => {
    if (!patientId) return;
    const fields = extraPatientFields();
    if (fields.age === null && !fields.guardian_relation && !fields.guardian_name) return;
    const { error } = await supabase.from("patients").update(fields as any).eq("id", patientId);
    if (error) console.warn("Failed to save age/guardian details", error);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      toast.error("Please fill in first name, last name and phone");
      return;
    }

    // FAMILY-MEMBER PATH
    if (isFamilyMode && guardian) {
      if (!relation) {
        toast.error("Please select the relation (Son, Daughter, Spouse, etc.)");
        return;
      }
      try {
        const { data, error } = await supabase.rpc("create_family_member", {
          p_guardian_phone: phone.trim(),
          p_first_name: firstName.trim(),
          p_last_name: lastName.trim(),
          p_relation: relation,
          p_cnic: cnic.trim() || null,
          p_date_of_birth: null,
          p_province: province || null,
          p_city: city || null,
        });
        if (error) throw error;

        const result = data as { patient_number?: string; user_id?: string } | null;
        await saveExtraFields(result?.user_id);
        await logAction(

          "Registered family member",
          `${firstName} ${lastName} (${relation}) under ${guardian.first_name} ${guardian.last_name} (${guardian.patient_number}) · phone ${phone}`
        );
        toast.success(
          `Family member added!\nPatient ID: ${result?.patient_number ?? "assigned"}\nLinked to: ${guardian.first_name} ${guardian.last_name} (${guardian.patient_number})`,
          { duration: 6000 }
        );
        setOpen(false);
        resetForm();
      } catch (err: any) {
        console.error("family member creation failed", err);
        const msg = err?.message || "Unknown error";
        if (msg.includes("GUARDIAN_NOT_FOUND")) {
          toast.error("The phone owner could not be found. Please refresh and try again.");
        } else {
          toast.error(`Failed to add family member: ${msg}`);
        }
      }
      return;
    }

    // NEW-GUARDIAN PATH (existing behaviour)
    if (!cnic.trim()) {
      toast.error("CNIC is required for a new patient");
      return;
    }

    try {
      const result = await createPatientWithProfile.mutateAsync({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        cnic: cnic.trim(),
        province: province || undefined,
        city: city || undefined,
      });

      await saveExtraFields((result as any)?.patient?.id ?? (result as any)?.user?.id);

      await logAction(

        "Registered new patient",
        `Patient: ${firstName} ${lastName} (Phone: ${phone}, CNIC: ${cnic})`
      );

      const successMessage = result.patientNumber
        ? `Patient registered successfully!\nPatient ID: ${result.patientNumber}\nPhone: ${phone}\nThey can now login with their phone number and CNIC.`
        : `Patient registered successfully!\nPhone: ${phone}\nThey can now login with their phone number and CNIC.`;

      toast.success(successMessage, { duration: 6000 });
      setOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error creating patient:", error);
      if (error.message === "DUPLICATE_PHONE") {
        toast.error(
          `This phone number (${phone}) is already registered. If this belongs to a family member, wait a moment — the "Add Family Member" option should appear automatically.`,
          { duration: 6000 }
        );
      } else if (error.message?.includes("USER_CREATION_FAILED")) {
        toast.error(`Failed to create user account: ${error.message.replace("USER_CREATION_FAILED: ", "")}`);
      } else {
        toast.error(`Registration error: ${error.message || "Unknown error"}. Please try again.`);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Register Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto z-[9999]">
        <DialogHeader>
          <DialogTitle>{isFamilyMode ? "Add Family Member" : "Register New Patient"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="03001234567"
              required
            />
            {checkingPhone && (
              <p className="text-xs text-muted-foreground">Checking phone…</p>
            )}
            {isFamilyMode && guardian && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <div className="text-amber-900">
                  <div className="font-semibold">
                    This phone is registered to {guardian.first_name} {guardian.last_name} ({guardian.patient_number})
                  </div>
                  <div className="text-xs mt-1">
                    Existing family members under this phone: <strong>{guardian.family_member_count}</strong>.
                    New entries will be added as a linked family member — no new login is created; the phone owner
                    can switch to this member after login.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" required />
            </div>
          </div>

          {isFamilyMode && (
            <div className="space-y-2">
              <Label>Relation *</Label>
              <Select value={relation} onValueChange={setRelation}>
                <SelectTrigger><SelectValue placeholder="Select relation to phone owner" /></SelectTrigger>
                <SelectContent portal={false} className="z-[10000]">
                  {RELATIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cnic">
              CNIC {isFamilyMode ? "(optional)" : "* (Used as Password)"}
            </Label>
            <Input
              id="cnic"
              value={cnic}
              onChange={(e) => setCnic(e.target.value)}
              placeholder="12345-6789012-3"
              required={!isFamilyMode}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Province</Label>
              <Select value={province} onValueChange={handleProvinceChange}>
                <SelectTrigger><SelectValue placeholder="Select province" /></SelectTrigger>
                <SelectContent portal={false} className="z-[10000]">
                  {ALL_PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Select value={city} onValueChange={setCity} disabled={!province}>
                <SelectTrigger>
                  <SelectValue placeholder={province ? "Select city" : "Select province first"} />
                </SelectTrigger>
                <SelectContent portal={false} className="z-[10000] max-h-[200px]">
                  <div className="px-2 pb-2 sticky top-0 bg-popover">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search city..."
                        value={citySearch}
                        onChange={(e) => setCitySearch(e.target.value)}
                        className="h-8 pl-7 text-sm"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  {availableCities.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-2">No cities found</div>
                  ) : (
                    availableCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-lg space-y-1">
            {isFamilyMode ? (
              <>
                <p>• Family members share the phone owner's login.</p>
                <p>• Each member gets their own Patient ID and own invoices, reports and appointments.</p>
                <p>• After login the phone owner can switch between linked members.</p>
              </>
            ) : (
              <>
                <p>• <strong>Phone number:</strong> Used as username for login (one per family).</p>
                <p>• <strong>CNIC:</strong> Used as password for login.</p>
                <p>• To add a wife/child/parent under the same phone, just enter the same phone number — this form will switch to <em>Add Family Member</em> automatically.</p>
              </>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createPatientWithProfile.isPending}>
              {createPatientWithProfile.isPending
                ? "Saving..."
                : isFamilyMode ? "Add Family Member" : "Register Patient"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
