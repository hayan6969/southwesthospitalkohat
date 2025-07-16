import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getPatientName } from "@/hooks/useDisplayHelpers";

interface Patient {
  id: string;
  patient_number?: string;
}

interface SearchablePatientSelectProps {
  patients: Patient[] | undefined;
  patientNames: Array<{ id: string; name: string }> | undefined;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
}

export function SearchablePatientSelect({
  patients,
  patientNames,
  value,
  onValueChange,
  placeholder = "Search patient by ID or name...",
  isLoading = false,
}: SearchablePatientSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedPatient = patients?.find((patient) => patient.id === value);
  const selectedPatientName = selectedPatient ? getPatientName(selectedPatient.id, patientNames || []) : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={isLoading}
        >
          {selectedPatient
            ? `${selectedPatient.patient_number || 'N/A'} - ${selectedPatientName}`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by patient ID or name..." />
          <CommandList>
            <CommandEmpty>No patient found.</CommandEmpty>
            <CommandGroup>
              {patients?.map((patient) => {
                const patientName = getPatientName(patient.id, patientNames || []);
                const displayText = `${patient.patient_number || 'N/A'} - ${patientName}`;
                const searchValue = `${patient.patient_number || ''} ${patientName} ${patient.id}`.toLowerCase();
                
                return (
                  <CommandItem
                    key={patient.id}
                    value={searchValue}
                    onSelect={() => {
                      onValueChange(patient.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === patient.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1">
                      <span className="font-medium">{patientName}</span>
                      <span className="text-sm text-muted-foreground">
                        Patient ID: {patient.patient_number || 'N/A'}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}