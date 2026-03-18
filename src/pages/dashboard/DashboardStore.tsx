
import AppLayout from "@/layouts/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryItemsManager } from "@/components/inventory/InventoryItemsManager";
import { LabInventoryManager } from "@/components/inventory/LabInventoryManager";
import { InventoryRequestsManager } from "@/components/inventory/InventoryRequestsManager";
import { StoreRequestsView } from "@/components/inventory/StoreRequestsView";
import { LowStockAlerts } from "@/components/inventory/LowStockAlerts";
import { ManagerDistributionReport } from "@/components/inventory/ManagerDistributionReport";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "react-router-dom";

const DashboardStore = () => {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isManager = profile?.role === 'inventory_manager' || profile?.role === 'admin';
  const isManagerOrStore = isManager || profile?.role === 'store';
  const tabParam = searchParams.get("tab");
  const activeTab = tabParam || (isManager ? "requests" : "provide");

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <AppLayout sidebarRole={profile?.role === 'inventory_manager' ? 'inventory_manager' : 'store'}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isManager ? "Inventory & Store Manager" : "Store Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            {isManager 
              ? "Manage inventory, approve requests, and track distribution" 
              : "Manage inventory and provide approved supplies"}
          </p>
        </div>

        {isManagerOrStore && <LowStockAlerts />}

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className={`grid w-full ${isManager ? 'grid-cols-5' : 'grid-cols-3'}`}>
            {isManager && <TabsTrigger value="requests">Applications</TabsTrigger>}
            <TabsTrigger value="general">General Stock</TabsTrigger>
            <TabsTrigger value="lab">Lab Stock</TabsTrigger>
            <TabsTrigger value="provide">
              {isManager ? "Store / Provide" : "Approved Requests"}
            </TabsTrigger>
            {isManager && <TabsTrigger value="distribution">Distribution</TabsTrigger>}
          </TabsList>
          {isManager && (
            <TabsContent value="requests">
              <InventoryRequestsManager />
            </TabsContent>
          )}
          <TabsContent value="general">
            <InventoryItemsManager />
          </TabsContent>
          <TabsContent value="lab">
            <LabInventoryManager />
          </TabsContent>
          <TabsContent value="provide">
            <StoreRequestsView />
          </TabsContent>
          {isManager && (
            <TabsContent value="distribution">
              <ManagerDistributionReport />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default DashboardStore;
