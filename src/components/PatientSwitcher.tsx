import { Users, Check } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActivePatient } from "@/contexts/PatientContext";

export function PatientSwitcher() {
  const { members, activePatient, activePatientId, setActivePatientId } = useActivePatient();

  if (!members.length || members.length === 1) {
    // Only guardian — no switcher UI needed
    return null;
  }

  const label = activePatient
    ? `${activePatient.first_name ?? ""} ${activePatient.last_name ?? ""}`.trim() || "Select"
    : "Select";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2 text-xs sm:text-sm">
          <Users className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Viewing:</span>
          <span className="font-medium truncate max-w-[120px] sm:max-w-none">{label}</span>
          {activePatient?.relation && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {activePatient.relation}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 z-[9999]">
        <DropdownMenuLabel>Family Members</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {members.map((m) => {
          const isActive = m.id === activePatientId;
          const name = `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "Unnamed";
          return (
            <DropdownMenuItem
              key={m.id}
              onClick={() => setActivePatientId(m.id)}
              className="flex items-start gap-2 cursor-pointer"
            >
              <div className="mt-0.5 w-4">
                {isActive && <Check className="w-4 h-4 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>{m.patient_number ?? "—"}</span>
                  <span>·</span>
                  <span>{m.is_guardian ? "Self (Guardian)" : m.relation ?? "Family"}</span>
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
