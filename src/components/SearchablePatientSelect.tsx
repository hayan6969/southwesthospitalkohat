import { useState, useEffect } from "react";
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
import { useSearchPatientsWithNames } from "@/hooks/useDisplayHelpers";

interface SearchablePatientSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
}

export function SearchablePatientSelect({
  value,
  onValueChange,
  placeholder = "Search patient by ID or name...",
  isLoading = false,
}: SearchablePatientSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const { data: filteredPatients = [], isLoading: isSearching } = useSearchPatientsWithNames(searchQuery);

  useEffect(() => {
    if (!value) {
      setSelectedPatient(null);
      setSearchQuery("");
    }
  }, [value]);

  const selectedPatientName = selectedPatient?.profile
    ? `${selectedPatient.profile.first_name || ""} ${selectedPatient.profile.last_name || ""}`.trim()
    : "Unknown Patient";

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
            ? `${selectedPatient.patient_number || "N/A"} - ${selectedPatientName}`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by patient ID or name..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[200px] overflow-y-auto">
            <CommandEmpty>
              {searchQuery.trim().length < 2
                ? "Type at least 2 characters to search..."
                : isSearching
                  ? "Searching patients..."
                  : "No patient found."}
            </CommandEmpty>
            <CommandGroup>
              {filteredPatients.map((patient: any) => {
                const patientName = patient.profile
                  ? `${patient.profile.first_name || ""} ${patient.profile.last_name || ""}`.trim()
                  : "Unknown Patient";

                return (
                  <CommandItem
                    key={patient.id}
                    value={patient.id}
                    onSelect={() => {
                      setSelectedPatient(patient);
                      onValueChange(patient.id);
                      setOpen(false);
                      setSearchQuery("");
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === patient.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium truncate">{patientName}</span>
                      <span className="text-sm text-muted-foreground truncate">
                        ID: {patient.patient_number || "N/A"}
                        {patient.profile?.phone ? ` • ${patient.profile.phone}` : ""}
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
