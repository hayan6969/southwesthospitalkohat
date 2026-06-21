import AppLayout from "@/layouts/AppLayout";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MySupplyRequests } from "@/components/inventory/MySupplyRequests";
import { LabItemSupply } from "@/components/inventory/LabItemSupply";
import { PathologyReportWizard } from "@/components/lab/PathologyReportWizard";
import { PathologyReportHistory } from "@/components/lab/PathologyReportHistory";
import { PathologyTestTypeManager } from "@/components/lab/PathologyTestTypeManager";
import { LabReportsTracking } from "@/components/lab/LabReportsTracking";
import { IPDLabQueue } from "@/components/ipd/IPDLabQueue";
import { ShoppingCart, FlaskConical, Microscope, History, Settings2, BedDouble, BarChart3 } from "lucide-react";

export default function AdminLabs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "pathology";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <AppLayout hideSidebar>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Lab Management</h1>
          <p className="text-sm text-muted-foreground">Pathology reports, test management, and lab supplies.</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="pathology" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Microscope className="w-3.5 h-3.5" />
              <span>New Lab Report</span>
            </TabsTrigger>
            <TabsTrigger value="pathology-history" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <History className="w-3.5 h-3.5" />
              <span>Report History</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Reports &amp; Tracking</span>
            </TabsTrigger>
            <TabsTrigger value="manage-tests" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Settings2 className="w-3.5 h-3.5" />
              <span>Manage Tests</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Lab Item Supply</span>
            </TabsTrigger>
            <TabsTrigger value="ipd" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <BedDouble className="w-3.5 h-3.5" />
              <span>IPD Orders</span>
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
          <TabsContent value="reports">
            <LabReportsTracking />
          </TabsContent>
          <TabsContent value="manage-tests">
            <PathologyTestTypeManager priceEditable />
          </TabsContent>
          <TabsContent value="inventory">
            <LabItemSupply />
          </TabsContent>
          <TabsContent value="ipd">
            <IPDLabQueue />
          </TabsContent>
          <TabsContent value="supplies">
            <MySupplyRequests />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
