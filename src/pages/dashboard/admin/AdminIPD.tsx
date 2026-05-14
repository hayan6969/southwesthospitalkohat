import AppLayout from "@/layouts/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BedDashboard } from "@/components/ipd/BedDashboard";
import { WardManager } from "@/components/ipd/WardManager";
import { BedManager } from "@/components/ipd/BedManager";
import { PendingAdmissions } from "@/components/ipd/PendingAdmissions";
import { ActiveAdmissions } from "@/components/ipd/ActiveAdmissions";
import { BedDouble, Building2, LayoutGrid, ClipboardList, UserCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";

export default function AdminIPD() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "overview";

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">IPD — Indoor Patient Department</h1>
          <p className="text-sm text-muted-foreground">Beds, admissions, and ward management.</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })}>
          <TabsList className="overflow-x-auto">
            <TabsTrigger value="overview" className="gap-1.5"><LayoutGrid className="w-4 h-4" />Bed Dashboard</TabsTrigger>
            <TabsTrigger value="pending" className="gap-1.5"><ClipboardList className="w-4 h-4" />Pending</TabsTrigger>
            <TabsTrigger value="admitted" className="gap-1.5"><UserCheck className="w-4 h-4" />Admitted</TabsTrigger>
            <TabsTrigger value="wards" className="gap-1.5"><Building2 className="w-4 h-4" />Wards</TabsTrigger>
            <TabsTrigger value="beds" className="gap-1.5"><BedDouble className="w-4 h-4" />Beds</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-4"><BedDashboard /></TabsContent>
          <TabsContent value="pending" className="mt-4"><PendingAdmissions /></TabsContent>
          <TabsContent value="admitted" className="mt-4"><ActiveAdmissions /></TabsContent>
          <TabsContent value="wards" className="mt-4"><WardManager /></TabsContent>
          <TabsContent value="beds" className="mt-4"><BedManager /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
