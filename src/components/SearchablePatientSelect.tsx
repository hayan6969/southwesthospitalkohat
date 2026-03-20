import { useState, useMemo, useCallback, useRef, useEffect } from "react";
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

interface Patient {
  id: string;
  patient_number?: string;
}

interface SearchablePatientSelectProps {
  patients: Patient[] | undefined;
  patientNames: Array<{ id: string; name: string; first_name?: string; last_name?: string }> | undefined;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search input by 150ms
  const handleSearchChange = useCallback((val: string) => {
    setSearchQuery(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(val), 150);
  }, []);

  useEffect(() => {
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, []);

  // Build a Map for O(1) name lookups instead of O(n) .find() calls
  const nameMap = useMemo(() => {
    const map = new Map<string, string>();
    patientNames?.forEach(p => {
      const name = p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim();
      map.set(p.id, name || 'Unknown Patient');
    });
    return map;
  }, [patientNames]);

  const getName = useCallback((id: string) => nameMap.get(id) || 'Unknown Patient', [nameMap]);

  const selectedPatient = patients?.find((p) => p.id === value);
  const selectedPatientName = selectedPatient ? getName(selectedPatient.id) : "";

  // Only filter when debounced query >= 2 chars, limit to 20 results
  const filteredPatients = useMemo(() => {
    if (debouncedQuery.length < 2) return [];
    const query = debouncedQuery.toLowerCase();
    const results: Patient[] = [];
    const list = patients || [];
    for (let i = 0; i < list.length && results.length < 20; i++) {
      const p = list[i];
      const name = getName(p.id).toLowerCase();
      const num = (p.patient_number || '').toLowerCase();
      if (name.includes(query) || num.includes(query)) {
        results.push(p);
      }
    }
    return results;
  }, [debouncedQuery, patients, getName]);

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
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search by patient ID or name..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[200px] overflow-y-auto">
            <CommandEmpty>{searchQuery.length < 2 ? "Type at least 2 characters to search..." : "No patient found."}</CommandEmpty>
            <CommandGroup>
              {filteredPatients.map((patient) => {
                const patientName = getPatientName(patient.id, patientNames || []);
                
                return (
                  <CommandItem
                    key={patient.id}
                    value={patient.id}
                    onSelect={() => {
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
                    <div className="flex flex-col flex-1">
                      <span className="font-medium">{patientName}</span>
                      <span className="text-sm text-muted-foreground">
                        ID: {patient.patient_number || 'N/A'}
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