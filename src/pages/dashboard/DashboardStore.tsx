
import AppLayout from "@/layouts/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryItemsManager } from "@/components/inventory/InventoryItemsManager";
import { LabInventoryManager } from "@/components/inventory/LabInventoryManager";
import { InventoryRequestsManager } from "@/components/inventory/InventoryRequestsManager";
import { StoreRequestsView } from "@/components/inventory/StoreRequestsView";
import { LowStockAlerts } from "@/components/inventory/LowStockAlerts";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "react-router-dom";

const DashboardStore = () => {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const isManagerOrStore = profile?.role === 'inventory_manager' || profile?.role === 'admin' || profile?.role === 'store';
  const isManager = profile?.role === 'inventory_manager' || profile?.role === 'admin';
  const tabParam = searchParams.get("tab");
  const defaultTab = tabParam === "provide" ? "provide" : (isManager ? "requests" : "provide");

  return (
    <AppLayout sidebarRole="store">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isManager ? "Inventory & Store Manager" : "Store Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            {isManager 
              ? "Manage inventory, approve requests, and provide supplies" 
              : "Manage inventory and provide approved supplies"}
          </p>
        </div>

        {isManagerOrStore && <LowStockAlerts />}

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className={`grid w-full ${isManager ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {isManager && <TabsTrigger value="requests">Supply Requests</TabsTrigger>}
            <TabsTrigger value="general">General Inventory</TabsTrigger>
            <TabsTrigger value="lab">Lab Inventory</TabsTrigger>
            <TabsTrigger value="provide">
              {isManager ? "Store / Provide" : "Approved Requests"}
            </TabsTrigger>
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
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default DashboardStore;
