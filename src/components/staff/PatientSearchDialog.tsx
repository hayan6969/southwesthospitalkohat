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
  const [searchPhone, setSearchPhone] = useState("");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const searchPatient = async () => {
    if (!searchPhone.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      // Search by email pattern since patients are stored as {phone}@patient.local
      const patientEmail = `${searchPhone}@patient.local`;
      
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          first_name,
          last_name,
          patients!inner(patient_number, date_of_birth, cnic)
        `)
        .eq("email", patientEmail)
        .eq("role", "patient")
        .maybeSingle();

      if (error) {
        console.error("Search error:", error);
        toast({
          title: "Error",
          description: "Failed to search for patient",
          variant: "destructive",
        });
        return;
      }

      if (!data) {
        toast({
          title: "Not Found",
          description: "No patient found with this phone number",
          variant: "destructive",
        });
        setPatient(null);
        return;
      }

      const patientData = {
        id: data.id,
        phone: searchPhone, // Use the searched phone number
        first_name: data.first_name,
        last_name: data.last_name,
        patient_number: data.patients.patient_number || "",
        date_of_birth: data.patients.date_of_birth || "",
        cnic: data.patients.cnic || "",
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
    setSearchPhone("");
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
          Search Patient by Phone
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Search Patient by Phone Number</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter phone number..."
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
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
                  <span>{patient.phone}</span>
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