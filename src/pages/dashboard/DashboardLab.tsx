
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaffLab } from "@/components/staff/StaffLab";
import { StaffLabReports } from "@/components/staff/StaffLabReports";
import { MySupplyRequests } from "@/components/inventory/MySupplyRequests";
import { LabItemSupply } from "@/components/inventory/LabItemSupply";
import { TestTube, FileText, ShoppingCart, FlaskConical } from "lucide-react";
import AppLayout from "@/layouts/AppLayout";

export default function DashboardLab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "lab";
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
          <TabsTrigger value="lab" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <TestTube className="w-3.5 h-3.5" />
            <span>Lab Orders</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileText className="w-3.5 h-3.5" />
            <span>Lab Reports</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Lab Inventory</span>
          </TabsTrigger>
          <TabsTrigger value="supplies" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Request Supplies</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lab">
          <StaffLab />
        </TabsContent>

        <TabsContent value="reports">
          <StaffLabReports />
        </TabsContent>

        <TabsContent value="inventory">
          <LabInventoryManager />
        </TabsContent>

        <TabsContent value="supplies">
          <MySupplyRequests />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
