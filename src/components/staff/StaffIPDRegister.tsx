import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SearchablePatientSelect } from "@/components/SearchablePatientSelect";
import { ReferToIPDDialog } from "@/components/ipd/ReferToIPDDialog";
import { PendingAdmissions } from "@/components/ipd/PendingAdmissions";
import { Button } from "@/components/ui/button";
import { BedDouble } from "lucide-react";

export function StaffIPDRegister() {
  const [patientId, setPatientId] = useState("");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BedDouble className="w-5 h-5" /> Register Patient for IPD Admission
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Patient</Label>
            <SearchablePatientSelect value={patientId} onValueChange={setPatientId} />
          </div>
          {patientId && (
            <ReferToIPDDialog
              patientId={patientId}
              onReferred={() => setPatientId("")}
              trigger={
                <Button className="gap-2">
                  <BedDouble className="w-4 h-4" /> Create IPD Admission Request
                </Button>
              }
            />
          )}
          <p className="text-xs text-muted-foreground">
            This creates a pending admission. IPD staff will assign a ward and bed from the IPD dashboard.
          </p>
        </CardContent>
      </Card>

      <PendingAdmissions />
    </div>
  );
}
