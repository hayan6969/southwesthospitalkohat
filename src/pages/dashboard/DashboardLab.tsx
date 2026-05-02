
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MySupplyRequests } from "@/components/inventory/MySupplyRequests";
import { LabItemSupply } from "@/components/inventory/LabItemSupply";
import { PathologyReportWizard } from "@/components/lab/PathologyReportWizard";
import { PathologyReportHistory } from "@/components/lab/PathologyReportHistory";
import { PathologyTestTypeManager } from "@/components/lab/PathologyTestTypeManager";
import { ShoppingCart, FlaskConical, Microscope, History, Settings2 } from "lucide-react";
import AppLayout from "@/layouts/AppLayout";

export default function DashboardLab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "pathology";
  const { profile } = useAuth();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AppLayout sidebarRole="lab">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="pathology" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Microscope className="w-3.5 h-3.5" />
            <span>New Pathology</span>
          </TabsTrigger>
          <TabsTrigger value="pathology-history" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <History className="w-3.5 h-3.5" />
            <span>Report History</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Lab Item Supply</span>
          </TabsTrigger>
          <TabsTrigger value="supplies" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Request Supplies</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pathology">
          <PathologyReportWizard />
        </TabsContent>

        <TabsContent value="pathology-history">
          <PathologyReportHistory />
        </TabsContent>

        <TabsContent value="inventory">
          <LabItemSupply />
        </TabsContent>

        <TabsContent value="supplies">
          <MySupplyRequests />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
