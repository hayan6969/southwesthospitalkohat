import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BedDashboard } from "@/components/ipd/BedDashboard";
import { WardManager } from "@/components/ipd/WardManager";
import { BedManager } from "@/components/ipd/BedManager";
import { PendingAdmissions } from "@/components/ipd/PendingAdmissions";
import { ActiveAdmissions } from "@/components/ipd/ActiveAdmissions";
import { IPDPharmacyOrders } from "@/components/ipd/IPDPharmacyOrders";
import { StaffIPDRegister } from "@/components/staff/StaffIPDRegister";
import { BedDouble, Building2, LayoutGrid, ClipboardList, UserCheck, Pill, UserPlus } from "lucide-react";
import { useState } from "react";

export function IPDAdminPanel() {
  const [tab, setTab] = useState("overview");
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg sm:text-xl font-bold">IPD — Indoor Patient Department</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">Beds, admissions, ward management, and pharmacy history.</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-auto">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm"><LayoutGrid className="w-4 h-4" />Bed Dashboard</TabsTrigger>
            <TabsTrigger value="pending" className="gap-1.5 text-xs sm:text-sm"><ClipboardList className="w-4 h-4" />Pending</TabsTrigger>
            <TabsTrigger value="admitted" className="gap-1.5 text-xs sm:text-sm"><UserCheck className="w-4 h-4" />Admitted</TabsTrigger>
            <TabsTrigger value="wards" className="gap-1.5 text-xs sm:text-sm"><Building2 className="w-4 h-4" />Wards</TabsTrigger>
            <TabsTrigger value="beds" className="gap-1.5 text-xs sm:text-sm"><BedDouble className="w-4 h-4" />Beds</TabsTrigger>
            <TabsTrigger value="pharmacy" className="gap-1.5 text-xs sm:text-sm"><Pill className="w-4 h-4" />Pharmacy History</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="overview" className="mt-4"><BedDashboard /></TabsContent>
        <TabsContent value="pending" className="mt-4"><PendingAdmissions /></TabsContent>
        <TabsContent value="admitted" className="mt-4"><ActiveAdmissions /></TabsContent>
        <TabsContent value="wards" className="mt-4"><WardManager /></TabsContent>
        <TabsContent value="beds" className="mt-4"><BedManager /></TabsContent>
        <TabsContent value="pharmacy" className="mt-4"><IPDPharmacyOrders /></TabsContent>
      </Tabs>
    </div>
  );
}
