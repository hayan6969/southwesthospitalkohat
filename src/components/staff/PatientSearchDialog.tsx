import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, User, Phone, Hash, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Patient {
  id: string;
  phone: string;
  first_name: string;
  last_name: string;
  patient_number: string;
  date_of_birth: string;
  cnic: string;
}

export function PatientSearchDialog() {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const searchPatient = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Error",
        description: "Please enter a patient number, phone number, or name",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const term = searchTerm.trim();
      let foundProfile: any = null;
      let foundPatient: any = null;

      // 1) Search by patient_number
      const { data: byNumber } = await supabase
        .from("patients")
        .select("id, patient_number, date_of_birth, cnic")
        .ilike("patient_number", `%${term}%`)
        .limit(1)
        .maybeSingle();

      if (byNumber) {
        foundPatient = byNumber;
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, email, phone")
          .eq("id", byNumber.id)
          .maybeSingle();
        foundProfile = profile;
      }

      // 2) If not found, search by phone via email pattern
      if (!foundPatient) {
        const { data: byPhone } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, phone")
          .eq("role", "patient")
          .eq("email", `${term}@patient.local`)
          .maybeSingle();

        if (byPhone) {
          foundProfile = byPhone;
          const { data: patData } = await supabase
            .from("patients")
            .select("id, patient_number, date_of_birth, cnic")
            .eq("id", byPhone.id)
            .maybeSingle();
          foundPatient = patData;
        }
      }

      // 3) If not found, search by phone field in profiles
      if (!foundPatient) {
        const { data: byProfilePhone } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, phone")
          .eq("role", "patient")
          .ilike("phone", `%${term}%`)
          .limit(1)
          .maybeSingle();

        if (byProfilePhone) {
          foundProfile = byProfilePhone;
          const { data: patData } = await supabase
            .from("patients")
            .select("id, patient_number, date_of_birth, cnic")
            .eq("id", byProfilePhone.id)
            .maybeSingle();
          foundPatient = patData;
        }
      }

      // 4) If not found, search by name
      if (!foundPatient) {
        const { data: byName } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, phone")
          .eq("role", "patient")
          .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
          .limit(1)
          .maybeSingle();

        if (byName) {
          foundProfile = byName;
          const { data: patData } = await supabase
            .from("patients")
            .select("id, patient_number, date_of_birth, cnic")
            .eq("id", byName.id)
            .maybeSingle();
          foundPatient = patData;
        }
      }

      if (!foundPatient || !foundProfile) {
        toast({
          title: "Not Found",
          description: "No patient found. Try patient number (P-XXXXX), phone, or name.",
          variant: "destructive",
        });
        setPatient(null);
        return;
      }

      // Extract phone from email pattern if no phone field
      let phone = foundProfile.phone || '';
      if (!phone && foundProfile.email) {
        const match = foundProfile.email.match(/^(\d+)@patient\.local$/);
        if (match) phone = match[1];
      }

      const patientData: Patient = {
        id: foundPatient.id,
        phone,
        first_name: foundProfile.first_name,
        last_name: foundProfile.last_name,
        patient_number: foundPatient.patient_number || "",
        date_of_birth: foundPatient.date_of_birth || "",
        cnic: foundPatient.cnic || "",
      };

      setPatient(patientData);
      toast({
        title: "Patient Found",
        description: `Found: ${patientData.first_name} ${patientData.last_name}`,
      });
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Error",
        description: "Failed to search for patient",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      searchPatient();
    }
  };

  const resetSearch = () => {
    setSearchTerm("");
    setPatient(null);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        resetSearch();
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Search className="w-4 h-4" />
          Search Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Search Patient</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Patient number, phone, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={searchPatient} 
              disabled={isSearching}
              className="flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Search by patient number (P-XXXXX), phone number, or name
          </p>

          {patient && (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <User className="w-4 h-4" />
                Patient Information
              </div>
              
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Hash className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium">Patient ID:</span>
                  <span className="font-mono bg-primary/10 px-2 py-1 rounded text-primary">
                    {patient.patient_number}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium">Name:</span>
                  <span>{patient.first_name} {patient.last_name}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium">Phone:</span>
                  <span>{patient.phone || 'Not provided'}</span>
                </div>
                
                {patient.date_of_birth && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="font-medium">Date of Birth:</span>
                    <span>{new Date(patient.date_of_birth).toLocaleDateString()}</span>
                  </div>
                )}
                
                {patient.cnic && (
                  <div className="flex items-center gap-2">
                    <Hash className="w-3 h-3 text-muted-foreground" />
                    <span className="font-medium">CNIC:</span>
                    <span>{patient.cnic}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
